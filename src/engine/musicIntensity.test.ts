import { describe, expect, it, vi } from 'vitest';
import { applyIntensity, intensityForMultiplier } from './musicIntensity';
import type { ReactiveGainNodes } from './audioEngine';

function fakeGainNode(initial: number): GainNode {
  const gain = {
    value: initial,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
  return { gain } as unknown as GainNode;
}

describe('intensityForMultiplier', () => {
  it('is 0 below the floor (no combo bonus yet)', () => {
    expect(intensityForMultiplier(1)).toBe(0);
  });

  it('is 1 at the max 4x multiplier', () => {
    expect(intensityForMultiplier(4)).toBe(1);
  });

  it('ramps linearly between the floor and the max', () => {
    expect(intensityForMultiplier(2.75)).toBeCloseTo(0.5);
  });
});

describe('applyIntensity', () => {
  it('ramps each reactive layer toward level * maxGain', () => {
    const node = fakeGainNode(0);
    const layers: ReactiveGainNodes = { intensityPad: { node, maxGain: 0.2 } };
    const ctx = { currentTime: 10 } as AudioContext;

    applyIntensity(ctx, layers, 4);

    expect(node.gain.cancelScheduledValues).toHaveBeenCalledWith(10);
    expect(node.gain.setValueAtTime).toHaveBeenCalledWith(0, 10);
    expect(node.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.2, 10.5);
  });

  it('skips absent layers without throwing', () => {
    const ctx = { currentTime: 0 } as AudioContext;
    expect(() => applyIntensity(ctx, {}, 3)).not.toThrow();
  });
});
