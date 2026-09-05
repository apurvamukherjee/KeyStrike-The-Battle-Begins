import type { ReactiveGainNodes } from './audioEngine';

const RAMP_SEC = 0.5;
/** Multiplier tiers below this don't light up any reactive layer — a small combo shouldn't already sound maxed out. */
const INTENSITY_FLOOR_MULTIPLIER = 1.5;
const MAX_MULTIPLIER = 4;

/** Maps WordRunner's combo multiplier (1-4, see engine/chartEngine.ts) to a 0-1 reactive-layer intensity. */
export function intensityForMultiplier(multiplier: number): number {
  return Math.min(1, Math.max(0, (multiplier - INTENSITY_FLOOR_MULTIPLIER) / (MAX_MULTIPLIER - INTENSITY_FLOOR_MULTIPLIER)));
}

/**
 * Smoothly ramps every reactive backing-track layer toward the intensity implied
 * by the current combo multiplier. Cancels any in-flight ramp first so back-to-back
 * combo changes retarget cleanly instead of queuing up stale ramps.
 */
export function applyIntensity(ctx: AudioContext, layers: ReactiveGainNodes, multiplier: number): void {
  const level = intensityForMultiplier(multiplier);
  const now = ctx.currentTime;

  for (const layer of Object.values(layers)) {
    if (!layer) continue;
    const { gain } = layer.node;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(level * layer.maxGain, now + RAMP_SEC);
  }
}
