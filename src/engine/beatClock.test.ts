import { describe, expect, it } from 'vitest';
import { beatAnimationDelay, beatPhase, distanceToBeat } from './beatClock';

describe('beatPhase', () => {
  it('is 0 exactly on a beat', () => {
    expect(beatPhase(0, 120)).toBeCloseTo(0, 6);
    expect(beatPhase(1, 120)).toBeCloseTo(0, 6); // 120bpm -> 0.5s/beat, so 1s is 2 beats in
  });

  it('is 0.5 exactly halfway between beats', () => {
    expect(beatPhase(0.25, 120)).toBeCloseTo(0.5, 6); // 120bpm -> 0.5s/beat, so 0.25s is half a beat in
  });

  it('wraps correctly for negative songTime', () => {
    const secPerBeat = 60 / 120;
    expect(beatPhase(-0.1, 120)).toBeCloseTo(1 - 0.1 / secPerBeat, 6);
  });
});

describe('distanceToBeat', () => {
  it('is 0 exactly on a beat', () => {
    expect(distanceToBeat(0, 100)).toBeCloseTo(0, 6);
  });

  it('is at its max exactly halfway between beats', () => {
    const secPerBeat = 60 / 100;
    expect(distanceToBeat(secPerBeat / 2, 100)).toBeCloseTo(secPerBeat / 2, 6);
  });

  it('is small and positive just before or after a beat', () => {
    const secPerBeat = 60 / 100;
    expect(distanceToBeat(secPerBeat - 0.01, 100)).toBeCloseTo(0.01, 6);
    expect(distanceToBeat(secPerBeat + 0.01, 100)).toBeCloseTo(0.01, 6);
  });
});

describe('beatAnimationDelay', () => {
  it('is 0 when now is exactly on the beat grid origin', () => {
    expect(beatAnimationDelay(5, 5, 120)).toBeCloseTo(0, 6);
  });

  it('is negative and proportional to elapsed phase once the song has started', () => {
    const secPerBeat = 60 / 120;
    const startAt = 10;
    const now = startAt + secPerBeat * 0.25;
    expect(beatAnimationDelay(now, startAt, 120)).toBeCloseTo(-secPerBeat * 0.25, 6);
  });

  it('stays on the same beat grid during the pre-start countdown', () => {
    const secPerBeat = 60 / 120;
    const startAt = 10;
    const now = startAt - secPerBeat * 0.25; // 0.25 beats before the song starts
    // Equivalent phase to being 0.75 beats past the previous grid line.
    expect(beatAnimationDelay(now, startAt, 120)).toBeCloseTo(-secPerBeat * 0.75, 6);
  });
});
