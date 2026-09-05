import { describe, expect, it } from 'vitest';
import { computeKeyHeat } from './keyHeat';
import type { KeyStat } from './stats';

function stat(overrides: Partial<KeyStat>): KeyStat {
  return { presses: 0, mistakes: 0, correctLatencyMs: 0, correctCount: 0, ...overrides };
}

describe('computeKeyHeat — accuracy mode', () => {
  it('reports no data for a letter never pressed', () => {
    const heat = computeKeyHeat({}, 'accuracy');
    expect(heat.A.intensity).toBeUndefined();
  });

  it('computes mistake rate as intensity', () => {
    const heat = computeKeyHeat({ F: stat({ presses: 4, mistakes: 1 }) }, 'accuracy');
    expect(heat.F.intensity).toBeCloseTo(0.25);
  });

  it('is 0 intensity for a letter with presses but no mistakes', () => {
    const heat = computeKeyHeat({ J: stat({ presses: 10, mistakes: 0 }) }, 'accuracy');
    expect(heat.J.intensity).toBe(0);
  });
});

describe('computeKeyHeat — speed mode', () => {
  it('reports no data for a letter with no correct-latency samples', () => {
    const heat = computeKeyHeat({ Q: stat({ presses: 3, mistakes: 3 }) }, 'speed');
    expect(heat.Q.intensity).toBeUndefined();
  });

  it('normalizes the slowest key to 1 and the fastest to 0', () => {
    const perKey = {
      A: stat({ correctCount: 2, correctLatencyMs: 200 }), // avg 100ms
      Z: stat({ correctCount: 2, correctLatencyMs: 600 }), // avg 300ms
    };
    const heat = computeKeyHeat(perKey, 'speed');
    expect(heat.A.intensity).toBe(0);
    expect(heat.Z.intensity).toBe(1);
  });

  it('does not divide by zero when every measured key has identical latency', () => {
    const perKey = {
      A: stat({ correctCount: 1, correctLatencyMs: 150 }),
      B: stat({ correctCount: 1, correctLatencyMs: 150 }),
    };
    const heat = computeKeyHeat(perKey, 'speed');
    expect(heat.A.intensity).toBe(0);
    expect(heat.B.intensity).toBe(0);
  });
});
