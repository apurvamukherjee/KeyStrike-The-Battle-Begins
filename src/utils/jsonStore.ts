import type { Difficulty } from '../types/song';

interface JsonStoreOptions {
  /** Spreads a parsed partial value over a fresh default, for schemas that grew fields over time. */
  merge?: boolean;
  storage?: Storage;
}

/**
 * `makeDefault` is a factory (not a static value) so every call gets its own
 * object — spreading a shared default's nested fields (e.g. `perKey: {}`)
 * would otherwise alias that nested object across every caller that fell
 * back to it.
 */
export function createJsonStore<T extends object>(key: string, makeDefault: () => T, options: JsonStoreOptions = {}) {
  const storage = options.storage ?? localStorage;

  function read(): T {
    try {
      const raw = storage.getItem(key);
      if (!raw) return makeDefault();
      const parsed = JSON.parse(raw) as T;
      return options.merge ? { ...makeDefault(), ...parsed } : parsed;
    } catch {
      return makeDefault();
    }
  }

  function write(value: T): void {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode / quota exceeded — value just won't persist this session */
    }
  }

  function clear(): void {
    try {
      storage.removeItem(key);
    } catch {
      /* private mode / quota exceeded */
    }
  }

  return { read, write, clear };
}

export function songDifficultyKey(songId: string, difficulty: Difficulty): string {
  return `${songId}:${difficulty}`;
}
