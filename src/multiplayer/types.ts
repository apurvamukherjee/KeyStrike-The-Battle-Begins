import type { Difficulty } from '../types/song';

export type RoomPhase = 'lobby' | 'countdown' | 'battle' | 'results';

export interface PlayerProgress {
  /** 0-1, how far this player's car has traveled toward the finish line */
  carProgress: number;
  score: number;
  combo: number;
  accuracy: number;
}

export interface PlayerResult {
  score: number;
  maxCombo: number;
  accuracy: number;
  grade: string;
  /** true if this player crossed the finish line first (won the race), false if their song simply ended */
  wonByFinish: boolean;
}

export interface RoomPlayer {
  id: string;
  nickname: string;
  avatarIndex: number;
  ready: boolean;
  connected: boolean;
  progress: PlayerProgress | null;
  finished: boolean;
  result: PlayerResult | null;
}

export interface RoomState {
  code: string;
  hostId: string;
  phase: RoomPhase;
  songId: string | null;
  difficulty: Difficulty;
  startAtMs: number | null;
  winnerId: string | null;
  players: RoomPlayer[];
}

export interface JoinAck {
  ok: boolean;
  code?: string;
  room?: RoomState;
  error?: string;
}
