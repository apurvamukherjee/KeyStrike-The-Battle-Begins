import { io, type Socket } from 'socket.io-client';
import type { Difficulty } from '../types/song';
import type { JoinAck, PlayerProgress, PlayerResult, RoomState } from './types';

const SERVER_URL = (import.meta.env.VITE_BATTLE_SERVER_URL as string | undefined) || 'http://localhost:8787';

/** Thin typed wrapper around the socket.io connection to the battle server. */
export class RoomClient {
  private socket: Socket;
  private onRoomUpdate: (room: RoomState) => void;

  constructor(onRoomUpdate: (room: RoomState) => void) {
    this.onRoomUpdate = onRoomUpdate;
    this.socket = io(SERVER_URL, { transports: ['websocket'] });
    this.socket.on('room-update', (room: RoomState) => this.onRoomUpdate(room));
  }

  /** Screens hand the client off to one another as the player moves lobby -> room -> battle. */
  setOnRoomUpdate(handler: (room: RoomState) => void) {
    this.onRoomUpdate = handler;
  }

  get id(): string {
    return this.socket.id ?? '';
  }

  onConnectError(handler: (err: Error) => void) {
    this.socket.on('connect_error', handler);
  }

  createRoom(nickname: string): Promise<JoinAck> {
    return new Promise((resolve) => this.socket.emit('create-room', { nickname }, resolve));
  }

  joinRoom(code: string, nickname: string): Promise<JoinAck> {
    return new Promise((resolve) => this.socket.emit('join-room', { code, nickname }, resolve));
  }

  selectSong(songId: string, difficulty: Difficulty) {
    this.socket.emit('select-song', { songId, difficulty });
  }

  toggleReady() {
    this.socket.emit('toggle-ready');
  }

  startBattle() {
    this.socket.emit('start-battle');
  }

  sendProgress(progress: PlayerProgress) {
    this.socket.emit('progress', progress);
  }

  sendFinished(result: PlayerResult) {
    this.socket.emit('finished', result);
  }

  leaveRoom() {
    this.socket.emit('leave-room');
  }

  destroy() {
    this.socket.removeAllListeners();
    this.socket.disconnect();
  }
}
