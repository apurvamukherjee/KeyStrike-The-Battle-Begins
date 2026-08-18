import { useEffect, useState } from 'react';
import { songs } from '../../data/songs';
import { RoomClient } from '../../multiplayer/RoomClient';
import type { RoomState } from '../../multiplayer/types';
import { DIFFICULTIES, type Difficulty } from '../../types/song';
import Avatar from '../../components/Avatar/Avatar';
import './RoomScreen.css';

interface RoomScreenProps {
  client: RoomClient;
  initialRoom: RoomState;
  onEnterBattle: (room: RoomState) => void;
  onLeave: () => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

export default function RoomScreen({ client, initialRoom, onEnterBattle, onLeave }: RoomScreenProps) {
  const [room, setRoom] = useState(initialRoom);

  useEffect(() => {
    client.setOnRoomUpdate((next) => {
      setRoom(next);
      if (next.phase === 'countdown' || next.phase === 'battle') onEnterBattle(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const isHost = client.id === room.hostId;
  const me = room.players.find((p) => p.id === client.id);
  const song = songs.find((s) => s.id === room.songId);

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">Room {room.code}</h1>
      <p className="tagline">Share this code — up to 4 players.</p>

      <div className="panel room__panel">
        <ul className="room__players">
          {room.players.map((p) => (
            <li key={p.id} className={`room__player${!p.connected ? ' room__player--disconnected' : ''}`}>
              <Avatar index={p.avatarIndex} size={32} />
              <span className="room__player-name">
                {p.nickname}
                {p.id === room.hostId ? ' (host)' : ''}
              </span>
              <span className={`room__player-ready${p.ready ? ' room__player-ready--yes' : ''}`}>
                {p.id === room.hostId ? '' : p.ready ? 'Ready' : 'Not ready'}
              </span>
            </li>
          ))}
        </ul>

        {isHost ? (
          <div className="room__song-picker">
            <label className="room__field">
              <span className="room__field-label">Song</span>
              <select
                className="room__select"
                value={room.songId ?? ''}
                onChange={(e) => client.selectSong(e.target.value, room.difficulty)}
              >
                <option value="" disabled>
                  Choose a song…
                </option>
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="difficulty-picker" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={room.difficulty === d}
                  className={`difficulty-picker__option${room.difficulty === d ? ' difficulty-picker__option--active' : ''}`}
                  onClick={() => client.selectSong(room.songId ?? songs[0].id, d)}
                >
                  {DIFFICULTY_LABEL[d]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="room__song-readout">
            {song ? `${song.title} · ${DIFFICULTY_LABEL[room.difficulty]}` : 'Waiting for the host to pick a song…'}
          </p>
        )}
      </div>

      <div className="cap-row">
        {isHost ? (
          <button type="button" className="cap cap--primary" disabled={!room.songId} onClick={() => client.startBattle()}>
            Start Race
          </button>
        ) : (
          <button type="button" className="cap cap--primary" onClick={() => client.toggleReady()}>
            {me?.ready ? 'Not Ready' : 'Ready'}
          </button>
        )}
        <button
          type="button"
          className="cap"
          onClick={() => {
            client.leaveRoom();
            client.destroy();
            onLeave();
          }}
        >
          Leave
        </button>
      </div>
    </div>
  );
}
