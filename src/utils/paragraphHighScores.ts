import type { Difficulty } from '../types/song';

const STORAGE_KEY = 'keystrike:paragraphBest:v1';

export interface ParagraphBestRecord {
  wpm: number;
  accuracy: number;
  score: number;
}

type ParagraphBestScores = Partial<Record<Difficulty, ParagraphBestRecord>>;

function readAll(): ParagraphBestScores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ParagraphBestScores) : {};
  } catch {
    return {};
  }
}

function writeAll(all: ParagraphBestScores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota exceeded — best score just won't persist this session */
  }
}

export function getParagraphBest(difficulty: Difficulty): ParagraphBestRecord | undefined {
  return readAll()[difficulty];
}

/** Stores the record if it beats the existing best score for this difficulty. Returns whether it was a new best. */
export function recordParagraphScoreIfBest(difficulty: Difficulty, record: ParagraphBestRecord): boolean {
  const all = readAll();
  const prev = all[difficulty];
  if (!prev || record.score > prev.score) {
    all[difficulty] = record;
    writeAll(all);
    return true;
  }
  return false;
}
