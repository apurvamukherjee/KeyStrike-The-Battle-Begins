import { describe, expect, it } from 'vitest';
import { EndlessRunner, msPerCharFor, timeBudgetMsFor } from './endlessRunner';

const pool = ['CAT', 'DOG', 'BIRD'];

function typeWord(runner: EndlessRunner, word: string) {
  let result;
  for (const letter of word) {
    result = runner.handleKey(letter);
  }
  return result;
}

describe('EndlessRunner', () => {
  it('always picks the first pool word with a pick() of 0', () => {
    const runner = new EndlessRunner(pool, 0, () => 0);
    expect(runner.currentWord).toBe('CAT');
  });

  it('ignores a wrong letter without advancing progress', () => {
    const runner = new EndlessRunner(pool, 0, () => 0);
    expect(runner.handleKey('X').type).toBe('ignored');
    expect(runner.typed).toBe(0);
  });

  it('is case-insensitive', () => {
    const runner = new EndlessRunner(pool, 0, () => 0);
    expect(runner.handleKey('c').type).toBe('progress');
    expect(runner.typed).toBe(1);
  });

  it('completes a word, scores it, and advances to a new word', () => {
    const runner = new EndlessRunner(pool, 0, () => 0);
    const result = typeWord(runner, 'CAT');
    expect(result).toEqual({ type: 'wordComplete' });
    expect(runner.wordsCleared).toBe(1);
    expect(runner.combo).toBe(1);
    expect(runner.score).toBeGreaterThan(0);
    expect(runner.typed).toBe(0);
  });

  it('does not advance on a partially-typed word', () => {
    const runner = new EndlessRunner(pool, 0, () => 0);
    runner.handleKey('C');
    runner.handleKey('A');
    expect(runner.currentWord).toBe('CAT');
    expect(runner.wordsCleared).toBe(0);
  });

  it('ends the run and resets combo on timeExpired, then ignores further keys', () => {
    const runner = new EndlessRunner(pool, 0, () => 0);
    typeWord(runner, 'CAT'); // combo of 1
    runner.timeExpired();
    expect(runner.ended).toBe(true);
    expect(runner.combo).toBe(0);
    expect(runner.handleKey('C').type).toBe('ignored');
  });

  it('keeps maxCombo after a run ends', () => {
    const runner = new EndlessRunner(pool, 0, () => 0);
    typeWord(runner, 'CAT');
    runner.timeExpired();
    expect(runner.maxCombo).toBe(1);
  });
});

describe('msPerCharFor', () => {
  it('decreases (speeds up) as more words are cleared', () => {
    expect(msPerCharFor(10)).toBeLessThan(msPerCharFor(0));
  });

  it('never drops below the floor no matter how many words are cleared', () => {
    expect(msPerCharFor(1000)).toBeGreaterThanOrEqual(110);
  });

  it('a positive speedOffset makes the pace faster (fewer ms/char)', () => {
    expect(msPerCharFor(0, 50)).toBeLessThan(msPerCharFor(0, 0));
  });
});

describe('timeBudgetMsFor', () => {
  it('never drops below the minimum word budget even for a 1-letter word deep into a run', () => {
    expect(timeBudgetMsFor('A', 1000)).toBeGreaterThanOrEqual(900);
  });

  it('gives longer words a larger budget at the same wordsCleared', () => {
    expect(timeBudgetMsFor('ELEPHANT', 0)).toBeGreaterThan(timeBudgetMsFor('CAT', 0));
  });
});
