import { io, type Socket } from 'socket.io-client';
import type { Difficulty } from '../types/song';
import type {
  JoinAck,
  PlayerProgress,
  PlayerResult,
  PowerUpType,
  PowerUpUsedEvent,
  RaceMode,
  RoomState,
  Team,
  WordStruckEvent,
} from './types';

const SERVER_URL = (import.meta.env.VITE_BATTLE_SERVER_URL as string | undefined) || 'http://localhost:8787';

/** Thin typed wrapper around the socket.io connection to the battle server. */
export class RoomClient {
  private socket: Socket;
  private onRoomUpdate: (room: RoomState) => void;
  private onPowerUpUsed: ((event: PowerUpUsedEvent) => void) | null = null;
  private onWordStruck: ((event: WordStruckEvent) => void) | null = null;

  constructor(onRoomUpdate: (room: RoomState) => void) {
    this.onRoomUpdate = onRoomUpdate;
    this.socket = io(SERVER_URL, { transports: ['websocket'] });
    this.socket.on('room-update', (room: RoomState) => this.onRoomUpdate(room));
    this.socket.on('power-up-used', (event: PowerUpUsedEvent) => this.onPowerUpUsed?.(event));
    this.socket.on('word-struck', (event: WordStruckEvent) => this.onWordStruck?.(event));
  }

  /** Screens hand the client off to one another as the player moves lobby -> room -> battle. */
  setOnRoomUpdate(handler: (room: RoomState) => void) {
    this.onRoomUpdate = handler;
  }

  /** A word Battle stage sets this while mounted, to react to a power-up used anywhere in the room (including its own). */
  setOnPowerUpUsed(handler: ((event: PowerUpUsedEvent) => void) | null) {
    this.onPowerUpUsed = handler;
  }

  /** Duel Mode sets this while mounted, to trigger the opponent's swing animation whenever they land a clean word. */
  setOnWordStruck(handler: ((event: WordStruckEvent) => void) | null) {
    this.onWordStruck = handler;
  }

  get id(): string {
    return this.socket.id ?? '';
  }

  onConnectError(handler: (err: Error) => void) {
    this.socket.on('connect_error', handler);
  }

  createRoom(nickname: string, clientId: string): Promise<JoinAck> {
    return new Promise((resolve) => this.socket.emit('create-room', { nickname, clientId }, resolve));
  }

  joinRoom(code: string, nickname: string, clientId: string): Promise<JoinAck> {
    return new Promise((resolve) => this.socket.emit('join-room', { code, nickname, clientId }, resolve));
  }

  rejoinRoom(code: string, clientId: string): Promise<JoinAck> {
    return new Promise((resolve) => this.socket.emit('rejoin-room', { code, clientId }, resolve));
  }

  selectSong(songId: string, difficulty: Difficulty) {
    this.socket.emit('select-song', { songId, difficulty });
  }

  selectMode(mode: RaceMode) {
    this.socket.emit('select-mode', { mode });
  }

  selectDifficulty(difficulty: Difficulty) {
    this.socket.emit('select-difficulty', { difficulty });
  }

  toggleReady() {
    this.socket.emit('toggle-ready');
  }

  toggleTeamMode() {
    this.socket.emit('toggle-team-mode');
  }

  /** Duel Mode only: 3-4 player free-for-all, mutually exclusive with Team Duel. */
  toggleDuelFFA() {
    this.socket.emit('toggle-duel-ffa');
  }

  toggleSuddenDeath() {
    this.socket.emit('toggle-sudden-death');
  }

  selectTeam(team: Team | null) {
    this.socket.emit('select-team', { team });
  }

  startBattle(sentenceText?: string) {
    this.socket.emit('start-battle', { sentenceText });
  }

  /** Duel Mode only: starts the next round of an in-progress best-of-N match, preserving the running duelWins tally. */
  nextRound(songId: string) {
    this.socket.emit('next-round', { songId });
  }

  sendProgress(progress: PlayerProgress) {
    this.socket.emit('progress', progress);
  }

  sendFinished(result: PlayerResult) {
    this.socket.emit('finished', result);
  }

  sendEliminated() {
    this.socket.emit('eliminated');
  }

  /** `targetId` is null for a self-buff (Nitro), or the racer being hit for an attack (Fog). */
  usePowerUp(type: PowerUpType, targetId: string | null) {
    this.socket.emit('use-power-up', { type, targetId });
  }

  /** Duel Mode: fire-and-forget notice that a clean word just landed, purely so the opponent's screen can animate the strike. `targetId` is FFA-only, identifying who got hit. */
  sendWordStruck(targetId?: string) {
    this.socket.emit('word-struck', { targetId });
  }

  /** FFA Duel only: server-authoritative damage — deducts `amount` from `targetId`'s hp (see autoTarget in DuelBattleStage.tsx). */
  sendDuelStrike(targetId: string, amount: number) {
    this.socket.emit('duel-strike', { targetId, amount });
  }

  leaveRoom() {
    this.socket.emit('leave-room');
  }

  destroy() {
    this.socket.removeAllListeners();
    this.socket.disconnect();
  }
}
