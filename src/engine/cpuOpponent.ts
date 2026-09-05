import { comboMultiplier } from './chartEngine';
import { advanceCarProgress } from './raceProgress';
import type { Judgement } from '../types/game';

export interface CpuProfile {
  /** Average pace the CPU attempts words at. Actual gaps are jittered around this so it doesn't feel metronomic. */
  wordsPerMinute: number;
  /** 0-1 chance any given word attempt lands clean rather than missing. */
  accuracy: number;
}

export interface CpuState {
  combo: number;
  progress: number;
  /** Song-time seconds at which the CPU's next word attempt resolves. */
  nextWordAt: number;
}

/** A CPU word attempt is simplified to perfect-or-miss — there's no "Good" tier, since nothing downstream (the duel HP bar, the swing animation) distinguishes it from Perfect. */
export type CpuJudgement = Extract<Judgement, 'perfect' | 'miss'>;

function wordInterval(profile: CpuProfile, rng: () => number): number {
  const base = 60 / Math.max(1, profile.wordsPerMinute);
  // +/-30% jitter around the average pace so the CPU's rhythm doesn't feel robotic.
  return base * (0.7 + rng() * 0.6);
}

export function initCpuState(profile: CpuProfile, now: number, rng: () => number = Math.random): CpuState {
  return { combo: 0, progress: 0, nextWordAt: now + wordInterval(profile, rng) };
}

/**
 * Call every frame with the current song time. Fires at most one word attempt
 * per call (frame rate is always far higher than any plausible wordsPerMinute,
 * so this never falls behind). Returns the same `state` reference and a null
 * judgement when no attempt has resolved yet — safe to assign back to a ref
 * or React state unconditionally either way.
 */
export function stepCpu(
  state: CpuState,
  profile: CpuProfile,
  now: number,
  totalWords: number,
  rng: () => number = Math.random
): { state: CpuState; judgement: CpuJudgement | null } {
  if (now < state.nextWordAt) return { state, judgement: null };

  const judgement: CpuJudgement = rng() < profile.accuracy ? 'perfect' : 'miss';
  const combo = judgement === 'miss' ? 0 : state.combo + 1;
  const progress = advanceCarProgress(state.progress, totalWords, judgement, comboMultiplier(combo));

  return {
    state: { combo, progress, nextWordAt: now + wordInterval(profile, rng) },
    judgement,
  };
}
