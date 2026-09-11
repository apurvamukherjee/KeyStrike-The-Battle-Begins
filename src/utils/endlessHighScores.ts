import type { Difficulty } from '../types/song';

const STORAGE_KEY = 'keystrike:endlessBest:v1';

export interface EndlessBestRecord {
  score: number;
  wordsCleared: number;
  maxCombo: number;
}

type EndlessBestScores = Partial<Record<Difficulty, EndlessBestRecord>>;

function readAll(): EndlessBestScores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EndlessBestScores) : {};
  } catch {
    return {};
  }
}

function writeAll(all: EndlessBestScores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota exceeded — best score just won't persist this session */
  }
}

export function getEndlessBest(difficulty: Difficulty): EndlessBestRecord | undefined {
  return readAll()[difficulty];
}

/** Stores the record if it beats the existing best score for this starting difficulty. Returns whether it was a new best. */
export function recordEndlessScoreIfBest(difficulty: Difficulty, record: EndlessBestRecord): boolean {
  const all = readAll();
  const prev = all[difficulty];
  if (!prev || record.score > prev.score) {
    all[difficulty] = record;
    writeAll(all);
    return true;
  }
  return false;
}
