import type { GhostReplay } from '../types/game';
import type { Difficulty } from '../types/song';

const STORAGE_KEY = 'keystrike:ghosts:v1';

type GhostStore = Record<string, GhostReplay>;

function keyFor(songId: string, difficulty: Difficulty): string {
  return `${songId}:${difficulty}`;
}

function readAll(): GhostStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GhostStore) : {};
  } catch {
    return {};
  }
}

function writeAll(all: GhostStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota exceeded — ghost just won't persist this session */
  }
}

export function getGhostReplay(songId: string, difficulty: Difficulty): GhostReplay | undefined {
  return readAll()[keyFor(songId, difficulty)];
}

/** Overwrites the stored ghost for this song+difficulty — call only when the run that produced it was a new best. */
export function saveGhostReplay(songId: string, difficulty: Difficulty, replay: GhostReplay): void {
  const all = readAll();
  all[keyFor(songId, difficulty)] = replay;
  writeAll(all);
}
