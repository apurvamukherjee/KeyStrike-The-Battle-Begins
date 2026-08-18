import type { Difficulty } from './song';

export type Judgement = 'perfect' | 'good' | 'miss';

export interface JudgementCounts {
  perfect: number;
  good: number;
  miss: number;
}

export interface RunResult {
  songId: string;
  difficulty: Difficulty;
  score: number;
  maxCombo: number;
  accuracy: number;
  counts: JudgementCounts;
  grade: string;
  isNewBest: boolean;
}

export type ScreenState =
  | { name: 'loader' }
  | { name: 'home' }
  | { name: 'songSelect' }
  | { name: 'settings'; from: 'home' }
  | { name: 'stats' }
  | { name: 'playing'; songId: string; difficulty: Difficulty }
  | { name: 'practice'; songId: string }
  | { name: 'results'; result: RunResult };
