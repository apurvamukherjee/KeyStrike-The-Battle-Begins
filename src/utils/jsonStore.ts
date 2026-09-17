import type { Difficulty } from '../types/song';

export type StorageKind = 'local' | 'session';

interface JsonStoreOptions {
  /** Spreads a parsed partial value over a fresh default, for schemas that grew fields over time. */
  merge?: boolean;
  storage?: StorageKind;
}

/**
 * Resolved per call rather than once at module scope: in sandboxed iframes and
 * some privacy modes, merely *touching* `localStorage`/`sessionStorage` throws
 * SecurityError. Doing it here keeps that throw inside each operation's
 * try/catch, so a storage-disabled browser degrades to "nothing persists"
 * instead of taking down module initialization (and with it, app startup).
 */
function getStorage(kind: StorageKind): Storage {
  return kind === 'session' ? sessionStorage : localStorage;
}

/**
 * `makeDefault` is a factory (not a static value) so every call gets its own
 * object — spreading a shared default's nested fields (e.g. `perKey: {}`)
 * would otherwise alias that nested object across every caller that fell
 * back to it.
 */
export function createJsonStore<T extends object>(key: string, makeDefault: () => T, options: JsonStoreOptions = {}) {
  const kind = options.storage ?? 'local';

  function read(): T {
    try {
      const raw = getStorage(kind).getItem(key);
      if (!raw) return makeDefault();
      const parsed: unknown = JSON.parse(raw);
      // Stored JSON is attacker/hand-editable: `null`, `[]`, `"str"` and `3` all
      // parse fine but would be returned as a T the callers then dereference.
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return makeDefault();
      return options.merge ? { ...makeDefault(), ...(parsed as T) } : (parsed as T);
    } catch {
      return makeDefault();
    }
  }

  function write(value: T): void {
    try {
      getStorage(kind).setItem(key, JSON.stringify(value));
    } catch {
      /* private mode / quota exceeded / storage disabled — value just won't persist this session */
    }
  }

  function clear(): void {
    try {
      getStorage(kind).removeItem(key);
    } catch {
      /* private mode / quota exceeded / storage disabled */
    }
  }

  return { read, write, clear };
}

export function songDifficultyKey(songId: string, difficulty: Difficulty): string {
  return `${songId}:${difficulty}`;
}

/**
 * A per-difficulty "best run" store for the solo modes that keep exactly one
 * record per difficulty tier, ranked on `score`. Returns a getter and a
 * setter that only writes (and reports true) when the run beats the stored
 * best — the shape Endless and Paragraph mode both want.
 */
export function createBestByDifficulty<T extends { score: number }>(key: string) {
  const store = createJsonStore<Partial<Record<Difficulty, T>>>(key, () => ({}));

  return {
    get(difficulty: Difficulty): T | undefined {
      return store.read()[difficulty];
    },
    recordIfBest(difficulty: Difficulty, record: T): boolean {
      const all = store.read();
      const prev = all[difficulty];
      if (prev && record.score <= prev.score) return false;
      all[difficulty] = record;
      store.write(all);
      return true;
    },
  };
}
