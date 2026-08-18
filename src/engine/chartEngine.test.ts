import { describe, expect, it } from 'vitest';
import { ChartRunner, gradeForAccuracy, GOOD_WINDOW, PERFECT_WINDOW } from './chartEngine';
import type { ChartNote } from '../types/song';

const chart: ChartNote[] = [
  { time: 1, lane: 0 },
  { time: 2, lane: 1 },
  { time: 3, lane: 2 },
];

describe('ChartRunner', () => {
  it('scores a hit within the perfect window as perfect', () => {
    const runner = new ChartRunner(chart);
    const judgement = runner.attemptHit(0, 1 + PERFECT_WINDOW / 2);
    expect(judgement).toBe('perfect');
    expect(runner.counts.perfect).toBe(1);
    expect(runner.combo).toBe(1);
  });

  it('scores a hit outside perfect but within the good window as good', () => {
    const runner = new ChartRunner(chart);
    const judgement = runner.attemptHit(0, 1 + (PERFECT_WINDOW + GOOD_WINDOW) / 2);
    expect(judgement).toBe('good');
    expect(runner.counts.good).toBe(1);
  });

  it('returns null when nothing is hittable in that lane', () => {
    const runner = new ChartRunner(chart);
    expect(runner.attemptHit(3, 1)).toBeNull();
  });

  it('turns unhit notes into misses once they scroll past the good window', () => {
    const runner = new ChartRunner(chart);
    runner.sweepMisses(1 + GOOD_WINDOW + 0.01);
    expect(runner.counts.miss).toBe(1);
    expect(runner.combo).toBe(0);
  });

  it('never double-judges the same note', () => {
    const runner = new ChartRunner(chart);
    runner.attemptHit(0, 1);
    expect(runner.attemptHit(0, 1.001)).toBeNull();
  });

  it('resets combo on a miss', () => {
    const runner = new ChartRunner(chart);
    runner.attemptHit(0, 1);
    runner.sweepMisses(2 + GOOD_WINDOW + 0.01);
    expect(runner.combo).toBe(0);
  });

  it('reports 100% accuracy for an empty chart rather than dividing by zero', () => {
    const runner = new ChartRunner([]);
    expect(runner.accuracy).toBe(100);
    expect(runner.isComplete).toBe(true);
  });
});

describe('ChartRunner hold notes', () => {
  const holdChart: ChartNote[] = [{ time: 1, lane: 0, holdSec: 2 }];

  it('judges the head like a tap and keeps the combo while held through', () => {
    const runner = new ChartRunner(holdChart);
    expect(runner.attemptHit(0, 1)).toBe('perfect');
    expect(runner.combo).toBe(1);

    runner.sweepMisses(2); // mid-hold
    expect(runner.combo).toBe(1); // untouched — still holding, not yet resolved

    runner.releaseLane(0, 3); // released right at the natural end
    expect(runner.combo).toBe(1); // held through — no penalty
  });

  it('breaks the combo when the lane is released well before the hold ends', () => {
    const runner = new ChartRunner(holdChart);
    runner.attemptHit(0, 1);
    runner.releaseLane(0, 1.5); // let go after 0.5s of a 2s hold
    expect(runner.combo).toBe(0);
  });

  it('does not penalize a release within tolerance of the natural end', () => {
    const runner = new ChartRunner(holdChart);
    runner.attemptHit(0, 1);
    runner.releaseLane(0, 2.98); // hold ends at time 3, within the 0.05s tolerance
    expect(runner.combo).toBe(1);
  });

  it('releaseLane is a no-op when the lane has no active hold', () => {
    const runner = new ChartRunner(holdChart);
    expect(() => runner.releaseLane(2, 5)).not.toThrow();
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
