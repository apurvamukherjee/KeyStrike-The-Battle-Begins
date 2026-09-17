import type { Difficulty } from '../types/song';
import { createBestByDifficulty } from './jsonStore';

export interface ParagraphBestRecord {
  wpm: number;
  accuracy: number;
  score: number;
}

const store = createBestByDifficulty<ParagraphBestRecord>('keystrike:paragraphBest:v1');

export function getParagraphBest(difficulty: Difficulty): ParagraphBestRecord | undefined {
  return store.get(difficulty);
}

/** Stores the record if it beats the existing best score for this difficulty. Returns whether it was a new best. */
export function recordParagraphScoreIfBest(difficulty: Difficulty, record: ParagraphBestRecord): boolean {
  return store.recordIfBest(difficulty, record);
}
