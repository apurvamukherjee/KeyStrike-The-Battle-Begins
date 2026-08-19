const STREAK_KEY = 'keystrike:battle:winStreak:v1';

export interface StreakRecord {
  current: number;
  best: number;
}

const EMPTY: StreakRecord = { current: 0, best: 0 };

type StreakStore = Record<string, StreakRecord>;

function readAll(): StreakStore {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw) as StreakStore) : {};
  } catch {
    return {};
  }
}

function writeAll(all: StreakStore) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota exceeded — streak just won't persist this session */
  }
}

/** Local, per-device, per-nickname win streak — there are no accounts, so this is best-effort, not a ladder. */
export function getWinStreak(nickname: string): StreakRecord {
  return readAll()[nickname] ?? EMPTY;
}

/** Call once per race conclusion. Returns the updated record. */
export function recordBattleOutcome(nickname: string, won: boolean): StreakRecord {
  const all = readAll();
  const prev = all[nickname] ?? EMPTY;
  const next: StreakRecord = won
    ? { current: prev.current + 1, best: Math.max(prev.best, prev.current + 1) }
    : { current: 0, best: prev.best };
  all[nickname] = next;
  writeAll(all);
  return next;
}
