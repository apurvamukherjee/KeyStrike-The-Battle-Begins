import type { Judgement } from '../types/game';

/** A Miss still nudges the car forward, just slower than any positive combo multiplier ever goes. */
const MISS_ADVANCE_FRACTION = 0.15;

/**
 * One race-car progress step, shared by Battle mode and solo ghost racing:
 * a word judged Perfect/Good advances by 1/totalWords scaled by the combo
 * multiplier at the moment it was judged; a Miss advances by a smaller
 * fixed fraction instead. Clamped so progress never exceeds 1.
 */
export function advanceCarProgress(
  prevProgress: number,
  totalWords: number,
  judgement: Judgement,
  multiplier: number,
): number {
  const speed = judgement === 'miss' ? MISS_ADVANCE_FRACTION : multiplier;
  return Math.min(1, prevProgress + (1 / Math.max(1, totalWords)) * speed);
}
