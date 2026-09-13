import type { Difficulty } from '../types/song';
import { createJsonStore, songDifficultyKey } from './jsonStore';

export interface BestRecord {
  score: number;
  accuracy: number;
  grade: string;
}

type BestScores = Record<string, BestRecord>;

const store = createJsonStore<BestScores>('keystrike:bestScores:v2', () => ({}));

export function getBestScore(songId: string, difficulty: Difficulty): BestRecord | undefined {
  return store.read()[songDifficultyKey(songId, difficulty)];
}

/** Stores the record if it beats the existing best for this song+difficulty. Returns whether it was a new best. */
export function recordScoreIfBest(songId: string, difficulty: Difficulty, record: BestRecord): boolean {
  const all = store.read();
  const key = songDifficultyKey(songId, difficulty);
  const prev = all[key];
  if (!prev || record.score > prev.score) {
    all[key] = record;
    store.write(all);
    return true;
  }
  return false;
}
