import type { GhostReplay } from '../types/game';
import type { Difficulty } from '../types/song';
import { createJsonStore, songDifficultyKey } from './jsonStore';

type GhostStore = Record<string, GhostReplay>;

const store = createJsonStore<GhostStore>('keystrike:ghosts:v1', () => ({}));

export function getGhostReplay(songId: string, difficulty: Difficulty): GhostReplay | undefined {
  return store.read()[songDifficultyKey(songId, difficulty)];
}

/** Overwrites the stored ghost for this song+difficulty — call only when the run that produced it was a new best. */
export function saveGhostReplay(songId: string, difficulty: Difficulty, replay: GhostReplay): void {
  const all = store.read();
  all[songDifficultyKey(songId, difficulty)] = replay;
  store.write(all);
}
