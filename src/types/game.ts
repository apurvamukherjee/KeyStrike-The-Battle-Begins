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
  | { name: 'battleResults'; client: RoomClient; room: RoomState };
