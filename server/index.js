import { createServer } from 'node:http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 8787;
const MAX_PLAYERS = 4;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 confusion
const ROOM_IDLE_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/** @type {Map<string, RoomState>} */
const rooms = new Map();

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function newPlayer(id, nickname, avatarIndex) {
  return {
    id,
    nickname: String(nickname || 'Player').slice(0, 16) || 'Player',
    avatarIndex,
    ready: false,
    connected: true,
    progress: null, // { carProgress, score, combo, accuracy }
    finished: false,
    result: null, // { score, maxCombo, accuracy, grade, wonByFinish }
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    songId: room.songId,
    difficulty: room.difficulty,
    startAtMs: room.startAtMs,
    winnerId: room.winnerId,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatarIndex: p.avatarIndex,
      ready: p.ready,
      connected: p.connected,
      progress: p.progress,
      finished: p.finished,
      result: p.result,
    })),
  };
}

function broadcastRoom(io, room) {
  room.touchedAt = Date.now();
  io.to(room.code).emit('room-update', publicRoom(room));
}

function connectedPlayers(room) {
  return [...room.players.values()].filter((p) => p.connected);
}

function cleanupRoom(io, room) {
  if (connectedPlayers(room).length === 0) {
    clearTimeout(room.finishTimeout);
    rooms.delete(room.code);
    return false;
  }
  if (!room.players.get(room.hostId)?.connected) {
    room.hostId = connectedPlayers(room)[0].id;
  }
  return true;
}

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('KeyStrike battle server is running.');
});

const io = new Server(httpServer, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  let currentRoomCode = null;

  socket.on('create-room', ({ nickname } = {}, ack) => {
    const code = makeCode();
    const room = {
      code,
      hostId: socket.id,
      phase: 'lobby',
      songId: null,
      difficulty: 'normal',
      startAtMs: null,
      winnerId: null,
      players: new Map(),
      finishTimeout: null,
      touchedAt: Date.now(),
    };
    room.players.set(socket.id, newPlayer(socket.id, nickname, 0));
    rooms.set(code, room);
    socket.join(code);
    currentRoomCode = code;
    ack?.({ ok: true, code, room: publicRoom(room) });
  });

  socket.on('join-room', ({ code, nickname } = {}, ack) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room) return ack?.({ ok: false, error: 'Room not found' });
    if (room.phase !== 'lobby') return ack?.({ ok: false, error: 'Battle already in progress' });
    if (connectedPlayers(room).length >= MAX_PLAYERS) return ack?.({ ok: false, error: 'Room is full' });

    room.players.set(socket.id, newPlayer(socket.id, nickname, room.players.size % 10));
    socket.join(room.code);
    currentRoomCode = room.code;
    ack?.({ ok: true, code: room.code, room: publicRoom(room) });
    broadcastRoom(io, room);
  });

  socket.on('select-song', ({ songId, difficulty } = {}) => {
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby') return;
    if (typeof songId === 'string') room.songId = songId;
    if (difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard') room.difficulty = difficulty;
    broadcastRoom(io, room);
  });

  socket.on('toggle-ready', () => {
    const room = rooms.get(currentRoomCode);
    const player = room?.players.get(socket.id);
    if (!room || room.phase !== 'lobby' || !player) return;
    player.ready = !player.ready;
    broadcastRoom(io, room);
  });

  socket.on('start-battle', () => {
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby' || !room.songId) return;
    room.phase = 'countdown';
    room.startAtMs = Date.now() + 3000;
    room.winnerId = null;
    for (const p of room.players.values()) {
      p.finished = false;
      p.result = null;
      p.progress = null;
    }
    broadcastRoom(io, room);
    setTimeout(() => {
      if (rooms.get(currentRoomCode) === room && room.phase === 'countdown') {
        room.phase = 'battle';
        broadcastRoom(io, room);
      }
    }, 3000);
  });

  // Sent every ~300ms during battle: { carProgress: 0-1, score, combo, accuracy }
  socket.on('progress', (progress) => {
    const room = rooms.get(currentRoomCode);
    const player = room?.players.get(socket.id);
    if (!room || room.phase !== 'battle' || !player) return;
    player.progress = progress;
    broadcastRoom(io, room);
  });

  // A player reaching the finish line (carProgress >= 1) OR their song ending
  // sends this. The FIRST one in wins the race outright for the whole room —
  // "first past the post," not "wait for everyone."
  socket.on('finished', (result) => {
    const room = rooms.get(currentRoomCode);
    const player = room?.players.get(socket.id);
    if (!room || room.phase !== 'battle' || !player) return;

    player.finished = true;
    player.result = result;
    room.phase = 'results';
    room.winnerId = socket.id;
    broadcastRoom(io, room);
  });

  socket.on('leave-room', () => {
    const room = rooms.get(currentRoomCode);
    if (room) {
      room.players.delete(socket.id);
      socket.leave(room.code);
      if (cleanupRoom(io, room)) broadcastRoom(io, room);
    }
    currentRoomCode = null;
  });

  socket.on('disconnect', () => {
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (player) player.connected = false;
    if (cleanupRoom(io, room)) broadcastRoom(io, room);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.touchedAt > ROOM_IDLE_MS) {
      clearTimeout(room.finishTimeout);
      rooms.delete(code);
    }
  }
}, SWEEP_INTERVAL_MS);

httpServer.listen(PORT, () => {
  console.log(`KeyStrike battle server listening on :${PORT}`);
});
