import type { Difficulty } from '../types/song';
import { createJsonStore } from './jsonStore';

export interface ParagraphBestRecord {
  wpm: number;
  accuracy: number;
  score: number;
}

type ParagraphBestScores = Partial<Record<Difficulty, ParagraphBestRecord>>;

const store = createJsonStore<ParagraphBestScores>('keystrike:paragraphBest:v1', () => ({}));

export function getParagraphBest(difficulty: Difficulty): ParagraphBestRecord | undefined {
  return store.read()[difficulty];
}

/** Stores the record if it beats the existing best score for this difficulty. Returns whether it was a new best. */
export function recordParagraphScoreIfBest(difficulty: Difficulty, record: ParagraphBestRecord): boolean {
  const all = store.read();
  const prev = all[difficulty];
  if (!prev || record.score > prev.score) {
    all[difficulty] = record;
    store.write(all);
    return true;
  }
  return false;
}
