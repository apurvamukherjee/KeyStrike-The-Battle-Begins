import { describe, it, expect, beforeEach } from 'vitest';
import { createJsonStore, createBestByDifficulty } from './jsonStore';

// The suite is otherwise DOM-free (no jsdom dependency), so stand up just the
// bit of Web Storage these tests exercise.
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

describe('createJsonStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to the default when nothing is stored', () => {
    const store = createJsonStore('k', () => ({ a: 1 }));
    expect(store.read()).toEqual({ a: 1 });
  });

  it('round-trips a written value', () => {
    const store = createJsonStore('k', () => ({ a: 1 }));
    store.write({ a: 42 });
    expect(store.read()).toEqual({ a: 42 });
  });

  // A hand-edited `null` used to be returned as-is, so the first property
  // access on it threw instead of degrading to the default.
  it('rejects a stored JSON null', () => {
    localStorage.setItem('k', 'null');
    const store = createJsonStore('k', () => ({ a: 1 }));
    expect(store.read()).toEqual({ a: 1 });
  });

  it('rejects stored non-objects', () => {
    const store = createJsonStore('k', () => ({ a: 1 }));
    for (const raw of ['3', '"str"', '[]', 'true']) {
      localStorage.setItem('k', raw);
      expect(store.read()).toEqual({ a: 1 });
    }
  });

  it('falls back to the default on malformed JSON', () => {
    localStorage.setItem('k', '{not json');
    const store = createJsonStore('k', () => ({ a: 1 }));
    expect(store.read()).toEqual({ a: 1 });
  });

  it('merge fills in fields missing from an older stored schema', () => {
    localStorage.setItem('k', JSON.stringify({ a: 9 }));
    const store = createJsonStore('k', () => ({ a: 1, b: 2 }), { merge: true });
    expect(store.read()).toEqual({ a: 9, b: 2 });
  });

  it('gives each read its own nested default object', () => {
    const store = createJsonStore<{ perKey: Record<string, number> }>('k', () => ({ perKey: {} }));
    const first = store.read();
    first.perKey.A = 1;
    expect(store.read().perKey).toEqual({});
  });

  it('clear removes the stored value', () => {
    const store = createJsonStore('k', () => ({ a: 1 }));
    store.write({ a: 42 });
    store.clear();
    expect(store.read()).toEqual({ a: 1 });
  });
});

describe('createBestByDifficulty', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns undefined before any run', () => {
    const store = createBestByDifficulty<{ score: number }>('best');
    expect(store.get('easy')).toBeUndefined();
  });

  it('records the first run as a best', () => {
    const store = createBestByDifficulty<{ score: number }>('best');
    expect(store.recordIfBest('easy', { score: 10 })).toBe(true);
    expect(store.get('easy')).toEqual({ score: 10 });
  });

  it('keeps the higher score and reports whether it was beaten', () => {
    const store = createBestByDifficulty<{ score: number }>('best');
    store.recordIfBest('easy', { score: 10 });
    expect(store.recordIfBest('easy', { score: 5 })).toBe(false);
    expect(store.get('easy')).toEqual({ score: 10 });
    expect(store.recordIfBest('easy', { score: 20 })).toBe(true);
    expect(store.get('easy')).toEqual({ score: 20 });
  });

  it('a tie is not a new best', () => {
    const store = createBestByDifficulty<{ score: number }>('best');
    store.recordIfBest('easy', { score: 10 });
    expect(store.recordIfBest('easy', { score: 10 })).toBe(false);
  });

  it('tracks each difficulty independently', () => {
    const store = createBestByDifficulty<{ score: number }>('best');
    store.recordIfBest('easy', { score: 10 });
    store.recordIfBest('hard', { score: 3 });
    expect(store.get('easy')).toEqual({ score: 10 });
    expect(store.get('hard')).toEqual({ score: 3 });
    expect(store.get('normal')).toBeUndefined();
  });
});
