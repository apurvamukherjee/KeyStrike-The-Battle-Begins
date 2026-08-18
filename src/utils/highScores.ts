import type { Difficulty } from '../types/song';

const STORAGE_KEY = 'keystrike:bestScores:v2';

export interface BestRecord {
  score: number;
  accuracy: number;
  grade: string;
}

type BestScores = Record<string, BestRecord>;

function keyFor(songId: string, difficulty: Difficulty): string {
  return `${songId}:${difficulty}`;
}

function readAll(): BestScores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BestScores) : {};
  } catch {
    return {};
  }
}

function writeAll(all: BestScores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota exceeded — best score just won't persist this session */
  }
}

export function getBestScore(songId: string, difficulty: Difficulty): BestRecord | undefined {
  return readAll()[keyFor(songId, difficulty)];
}

/** Stores the record if it beats the existing best for this song+difficulty. Returns whether it was a new best. */
export function recordScoreIfBest(songId: string, difficulty: Difficulty, record: BestRecord): boolean {
  const all = readAll();
  const key = keyFor(songId, difficulty);
  const prev = all[key];
  if (!prev || record.score > prev.score) {
    all[key] = record;
    writeAll(all);
    return true;
  }
  return false;
}
