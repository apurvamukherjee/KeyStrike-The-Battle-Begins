import type { Difficulty } from '../types/song';
import { createBestByDifficulty } from './jsonStore';

export interface EndlessBestRecord {
  score: number;
  wordsCleared: number;
  maxCombo: number;
}

const store = createBestByDifficulty<EndlessBestRecord>('keystrike:endlessBest:v1');

export function getEndlessBest(difficulty: Difficulty): EndlessBestRecord | undefined {
  return store.get(difficulty);
}

/** Stores the record if it beats the existing best score for this starting difficulty. Returns whether it was a new best. */
export function recordEndlessScoreIfBest(difficulty: Difficulty, record: EndlessBestRecord): boolean {
  return store.recordIfBest(difficulty, record);
}
