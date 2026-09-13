import { createJsonStore } from './jsonStore';

export interface StreakRecord {
  current: number;
  best: number;
}

const EMPTY: StreakRecord = { current: 0, best: 0 };

type StreakStore = Record<string, StreakRecord>;

const store = createJsonStore<StreakStore>('keystrike:battle:winStreak:v1', () => ({}));

/** Local, per-device, per-nickname win streak — there are no accounts, so this is best-effort, not a ladder. */
export function getWinStreak(nickname: string): StreakRecord {
  return store.read()[nickname] ?? EMPTY;
}

/** Call once per race conclusion. Returns the updated record. */
export function recordBattleOutcome(nickname: string, won: boolean): StreakRecord {
  const all = store.read();
  const prev = all[nickname] ?? EMPTY;
  const next: StreakRecord = won
    ? { current: prev.current + 1, best: Math.max(prev.best, prev.current + 1) }
    : { current: 0, best: prev.best };
  all[nickname] = next;
  store.write(all);
  return next;
}
