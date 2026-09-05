import type { Difficulty } from './song';
import type { RoomClient } from '../multiplayer/RoomClient';
import type { RoomState } from '../multiplayer/types';

export type Judgement = 'perfect' | 'good' | 'miss';

export interface JudgementCounts {
  perfect: number;
  good: number;
  miss: number;
}

export interface RunResult {
  songId: string;
  difficulty: Difficulty;
  beatChallenge: boolean;
  score: number;
  maxCombo: number;
  accuracy: number;
  counts: JudgementCounts;
  grade: string;
  isNewBest: boolean;
  /** Present only when this run raced a saved ghost — whether the live run out-scored it. */
  raceGhost?: { won: boolean };
}

export interface GhostFrame {
  /** rawSongTime / durationSec when this word was judged — invariant to Game Speed, since duration scales the same way. */
  songFraction: number;
  /** Cumulative race-car progress (0-1) immediately after this word. */
  carProgress: number;
}

/** A recording of a solo run's race-car progress over time, raced against on a later attempt at the same song+difficulty. */
export interface GhostReplay {
  songId: string;
  difficulty: Difficulty;
  frames: GhostFrame[];
  score: number;
  recordedAt: number;
}

export interface SentenceRunResult {
  difficulty: Difficulty;
  beatChallenge: boolean;
  charactersTyped: number;
  errors: number;
  accuracy: number;
  wpm: number;
  maxCombo: number;
  score: number;
  grade: string;
}

export type ScreenState =
  | { name: 'loader' }
  | { name: 'home' }
  | { name: 'songSelect' }
  | { name: 'settings'; from: 'home' }
  | { name: 'stats' }
  | { name: 'playing'; songId: string; difficulty: Difficulty; beatChallenge: boolean }
  | { name: 'practice'; songId: string; difficulty: Difficulty }
  | { name: 'results'; result: RunResult }
  | { name: 'sentence'; retry?: { difficulty: Difficulty; beatChallenge: boolean } }
  | { name: 'sentenceResults'; result: SentenceRunResult }
  | { name: 'lobby' }
  | { name: 'room'; client: RoomClient; room: RoomState }
  | { name: 'battle'; client: RoomClient; room: RoomState }
  | { name: 'battleResults'; client: RoomClient; room: RoomState }
  | { name: 'duelSelect' }
  | {
      name: 'duel';
      songId: string;
      difficulty: Difficulty;
      enemyId: string;
      attempt: number;
      /** Round wins so far this best-of-3 match against this enemy — {you:0,enemy:0} for a fresh fight from the ladder. */
      matchScore: { you: number; enemy: number };
    };
