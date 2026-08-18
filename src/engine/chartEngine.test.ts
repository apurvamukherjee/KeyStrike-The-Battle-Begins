import { describe, expect, it } from 'vitest';
import { WordRunner, gradeForAccuracy, GOOD_GRACE } from './chartEngine';
import type { WordNote } from '../types/song';

const chart: WordNote[] = [
  { time: 2, word: 'CAT' },
  { time: 4, word: 'DOG' },
  { time: 6, word: 'BIRD' },
];

function typeWord(runner: WordRunner, word: string, at: number) {
  let result;
  for (const letter of word) {
    result = runner.handleKey(letter, at);
  }
  return result;
}

describe('WordRunner', () => {
  it('ignores a wrong letter without advancing progress', () => {
    const runner = new WordRunner(chart);
    expect(runner.handleKey('X', 0).type).toBe('ignored');
    expect(runner.words[0].typed).toBe(0);
  });

  it('is case-insensitive', () => {
    const runner = new WordRunner(chart);
    expect(runner.handleKey('c', 0).type).toBe('progress');
    expect(runner.words[0].typed).toBe(1);
  });

  it('judges a word finished at or before its deadline as perfect', () => {
    const runner = new WordRunner(chart);
    const result = typeWord(runner, 'CAT', 1.5);
    expect(result).toEqual({ type: 'wordComplete', judgement: 'perfect' });
    expect(runner.counts.perfect).toBe(1);
    expect(runner.combo).toBe(1);
    expect(runner.activeIndex).toBe(1);
  });

  it('judges a word finished just after its deadline (within grace) as good', () => {
    const runner = new WordRunner(chart);
    const result = typeWord(runner, 'CAT', 2.2);
    expect(result).toEqual({ type: 'wordComplete', judgement: 'good' });
    expect(runner.counts.good).toBe(1);
  });

  it('advances to the next word once the current one completes', () => {
    const runner = new WordRunner(chart);
    typeWord(runner, 'CAT', 1);
    expect(runner.activeWord?.note.word).toBe('DOG');
  });

  it('does not advance on a partially-typed word', () => {
    const runner = new WordRunner(chart);
    runner.handleKey('C', 0);
    runner.handleKey('A', 0);
    expect(runner.activeWord?.note.word).toBe('CAT');
    expect(runner.activeIndex).toBe(0);
  });

  it('sweeps the active word to a miss once its grace period elapses, and resets combo', () => {
    const runner = new WordRunner(chart);
    typeWord(runner, 'CAT', 1); // build a combo of 1 first
    expect(runner.sweepMisses(4 + GOOD_GRACE + 0.01)).toBe(true);
    expect(runner.counts.miss).toBe(1);
    expect(runner.combo).toBe(0);
    expect(runner.activeWord?.note.word).toBe('BIRD');
  });

  it('sweepMisses is a no-op before the grace period has elapsed', () => {
    const runner = new WordRunner(chart);
    expect(runner.sweepMisses(1)).toBe(false);
    expect(runner.activeIndex).toBe(0);
  });

  it('awards more score for a longer word at the same judgement', () => {
    const short = new WordRunner([{ time: 2, word: 'CAT' }]);
    const long = new WordRunner([{ time: 2, word: 'ELEPHANT' }]);
    typeWord(short, 'CAT', 1);
    typeWord(long, 'ELEPHANT', 1);
    expect(long.score).toBeGreaterThan(short.score);
  });

  it('reports 100% accuracy and isComplete for an empty chart', () => {
    const runner = new WordRunner([]);
    expect(runner.accuracy).toBe(100);
    expect(runner.isComplete).toBe(true);
  });

  it('is complete once every word has been judged', () => {
    const runner = new WordRunner(chart);
    typeWord(runner, 'CAT', 1);
    typeWord(runner, 'DOG', 3);
    typeWord(runner, 'BIRD', 5);
    expect(runner.isComplete).toBe(true);
  });
});

describe('gradeForAccuracy', () => {
  it('grades a flawless run as S', () => {
    expect(gradeForAccuracy(100)).toBe('S');
  });

  it('grades a poor run as F', () => {
    expect(gradeForAccuracy(10)).toBe('F');
  });
});
