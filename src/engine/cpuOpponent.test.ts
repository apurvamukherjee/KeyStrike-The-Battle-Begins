import { describe, expect, it } from 'vitest';
import { initCpuState, stepCpu, type CpuProfile } from './cpuOpponent';

const profile: CpuProfile = { wordsPerMinute: 30, accuracy: 0.75 }; // one word every 2s on average

function alwaysRng(value: number) {
  return () => value;
}

describe('initCpuState', () => {
  it('schedules the first word attempt in the future, not immediately', () => {
    const state = initCpuState(profile, 10, alwaysRng(0.5));
    expect(state.nextWordAt).toBeGreaterThan(10);
    expect(state.combo).toBe(0);
    expect(state.progress).toBe(0);
  });
});

describe('stepCpu', () => {
  it('does nothing before the scheduled word time', () => {
    const state = initCpuState(profile, 0, alwaysRng(0.5));
    const result = stepCpu(state, profile, 0, 20, alwaysRng(0.5));
    expect(result.judgement).toBeNull();
    expect(result.state).toBe(state); // same reference — no-op
  });

  it('resolves a perfect word once its time arrives, when rng favors accuracy', () => {
    const state = initCpuState(profile, 0, alwaysRng(0.5));
    const result = stepCpu(state, profile, state.nextWordAt, 20, alwaysRng(0)); // rng() < accuracy always true
    expect(result.judgement).toBe('perfect');
    expect(result.state.combo).toBe(1);
    expect(result.state.progress).toBeGreaterThan(0);
  });

  it('resolves a miss and resets combo when rng exceeds accuracy', () => {
    const state = { combo: 5, progress: 0.3, nextWordAt: 10 };
    const result = stepCpu(state, profile, 10, 20, alwaysRng(0.99)); // rng() < accuracy always false
    expect(result.judgement).toBe('miss');
    expect(result.state.combo).toBe(0);
  });

  it('schedules the next attempt strictly after the current one resolves', () => {
    const state = initCpuState(profile, 0, alwaysRng(0.5));
    const result = stepCpu(state, profile, state.nextWordAt, 20, alwaysRng(0));
    expect(result.state.nextWordAt).toBeGreaterThan(state.nextWordAt);
  });

  it('caps progress at 1 even after many consecutive perfects', () => {
    let state = initCpuState(profile, 0, alwaysRng(0.5));
    let now = state.nextWordAt;
    for (let i = 0; i < 500; i++) {
      const result = stepCpu(state, profile, now, 5, alwaysRng(0));
      state = result.state;
      now = state.nextWordAt;
    }
    expect(state.progress).toBe(1);
  });
});
