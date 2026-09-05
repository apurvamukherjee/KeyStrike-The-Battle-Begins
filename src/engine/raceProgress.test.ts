import { describe, expect, it } from 'vitest';
import { advanceCarProgress } from './raceProgress';

describe('advanceCarProgress', () => {
  it('advances by 1/totalWords at 1x multiplier', () => {
    expect(advanceCarProgress(0, 4, 'perfect', 1)).toBeCloseTo(0.25);
  });

  it('scales the step by the combo multiplier', () => {
    expect(advanceCarProgress(0, 4, 'good', 2)).toBeCloseTo(0.5);
  });

  it('advances a miss by the fixed fraction, ignoring the passed multiplier', () => {
    expect(advanceCarProgress(0, 4, 'miss', 4)).toBeCloseTo(0.0375);
  });

  it('clamps at 1 even if the step overshoots', () => {
    expect(advanceCarProgress(0.9, 4, 'perfect', 4)).toBe(1);
  });

  it('treats a zero word count as one word, not a division by zero', () => {
    expect(advanceCarProgress(0, 0, 'perfect', 1)).toBe(1);
  });
});
