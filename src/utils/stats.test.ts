import { describe, it, expect, beforeEach } from 'vitest';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

globalThis.localStorage = new MemoryStorage();

const { getStats, recordKeyStats } = await import('./stats');

const STATS_KEY = 'keystrike:stats:v1';

describe('stats malformed-storage recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // A persisted `perKey: null` survives the store's shallow merge, so every
  // perKey[letter] index used to throw and lose the whole run's stats.
  it('recovers from a persisted perKey: null', () => {
    localStorage.setItem(STATS_KEY, JSON.stringify({ totalPlays: 3, perKey: null }));
    expect(getStats().perKey).toEqual({});
    expect(() => recordKeyStats({ A: { presses: 2, mistakes: 1, correctLatencyMs: 50, correctCount: 1 } })).not.toThrow();
    expect(getStats().perKey.A.presses).toBe(2);
  });

  it('keeps the other persisted fields while repairing perKey', () => {
    localStorage.setItem(STATS_KEY, JSON.stringify({ totalPlays: 3, perKey: null }));
    expect(getStats().totalPlays).toBe(3);
  });

  it('recovers when perKey is a non-object', () => {
    for (const bad of ['"str"', '7', '[]']) {
      localStorage.setItem(STATS_KEY, `{"perKey":${bad}}`);
      expect(getStats().perKey).toEqual({});
    }
  });

  it('accumulates per-key totals across runs', () => {
    recordKeyStats({ A: { presses: 1, mistakes: 0, correctLatencyMs: 10, correctCount: 1 } });
    recordKeyStats({ A: { presses: 2, mistakes: 1, correctLatencyMs: 20, correctCount: 2 } });
    expect(getStats().perKey.A).toEqual({ presses: 3, mistakes: 1, correctLatencyMs: 30, correctCount: 3 });
  });
});
