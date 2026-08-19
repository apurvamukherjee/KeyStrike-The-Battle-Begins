import { describe, expect, it } from 'vitest';
import { SentenceRunner, wpmFrom } from './sentenceRunner';

describe('SentenceRunner', () => {
  it('advances on a correct character', () => {
    const runner = new SentenceRunner('CAT');
    expect(runner.handleKey('C')).toEqual({ type: 'progress' });
    expect(runner.typed).toBe(1);
  });

  it('does not advance on a wrong character, and counts it against accuracy', () => {
    const runner = new SentenceRunner('CAT');
    expect(runner.handleKey('X')).toEqual({ type: 'wrong' });
    expect(runner.typed).toBe(0);
    expect(runner.errors).toBe(1);
  });

  it('breaks combo on a wrong character', () => {
    const runner = new SentenceRunner('CAT');
    runner.handleKey('C');
    runner.handleKey('A');
    expect(runner.combo).toBe(2);
    runner.handleKey('X');
    expect(runner.combo).toBe(0);
  });

  it('is case-sensitive, unlike WordRunner', () => {
    const runner = new SentenceRunner('Cat');
    expect(runner.handleKey('c')).toEqual({ type: 'wrong' });
    expect(runner.handleKey('C')).toEqual({ type: 'progress' });
  });

  it('treats spaces and punctuation as real characters to type', () => {
    const runner = new SentenceRunner('HI, YOU');
    for (const ch of 'HI, YOU'.slice(0, -1)) runner.handleKey(ch);
    expect(runner.handleKey('U')).toEqual({ type: 'complete' });
    expect(runner.isComplete).toBe(true);
  });

  it('reports 100% accuracy with nothing typed yet', () => {
    const runner = new SentenceRunner('CAT');
    expect(runner.accuracy).toBe(100);
  });

  it('computes accuracy from correct vs. total keystrokes', () => {
    const runner = new SentenceRunner('CAT');
    runner.handleKey('C'); // correct
    runner.handleKey('X'); // wrong
    runner.handleKey('A'); // correct
    expect(runner.accuracy).toBeCloseTo((2 / 3) * 100, 5);
  });

  it('ignores further keys once complete', () => {
    const runner = new SentenceRunner('HI');
    runner.handleKey('H');
    runner.handleKey('I');
    expect(runner.isComplete).toBe(true);
    expect(runner.handleKey('I')).toEqual({ type: 'ignored' });
  });

  it('addBonus adds to score without affecting combo or accuracy', () => {
    const runner = new SentenceRunner('HI');
    runner.handleKey('H');
    const comboBefore = runner.combo;
    const scoreBefore = runner.score;
    runner.addBonus(15);
    expect(runner.score).toBe(scoreBefore + 15);
    expect(runner.combo).toBe(comboBefore);
  });
});

describe('wpmFrom', () => {
  it('computes standard WPM (chars / 5 per minute)', () => {
    // 25 correct characters in 30 seconds = 5 "words" in 0.5 minutes = 10 WPM
    expect(wpmFrom(25, 30)).toBeCloseTo(10, 5);
  });

  it('is 0 for zero or negative elapsed time', () => {
    expect(wpmFrom(25, 0)).toBe(0);
    expect(wpmFrom(25, -1)).toBe(0);
  });
});
