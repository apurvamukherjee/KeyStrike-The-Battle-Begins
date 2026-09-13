import type { Difficulty } from '../types/song';
import { createJsonStore } from './jsonStore';

export interface EndlessBestRecord {
  score: number;
  wordsCleared: number;
  maxCombo: number;
}

type EndlessBestScores = Partial<Record<Difficulty, EndlessBestRecord>>;

const store = createJsonStore<EndlessBestScores>('keystrike:endlessBest:v1', () => ({}));

export function getEndlessBest(difficulty: Difficulty): EndlessBestRecord | undefined {
  return store.read()[difficulty];
}

/** Stores the record if it beats the existing best score for this starting difficulty. Returns whether it was a new best. */
export function recordEndlessScoreIfBest(difficulty: Difficulty, record: EndlessBestRecord): boolean {
  const all = store.read();
  const prev = all[difficulty];
  if (!prev || record.score > prev.score) {
    all[difficulty] = record;
    store.write(all);
    return true;
  }
  return false;
}
