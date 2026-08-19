/**
 * Pure beat-grid helpers shared by the visual beat-pulse and the Beat
 * Challenge scoring bonus, so there's exactly one notion of "where the beat
 * is" rather than two independently-drifting ones.
 */

/** Fractional position within the current beat, always in [0, 1) — safe for negative songTime too. */
export function beatPhase(songTime: number, bpm: number): number {
  const secPerBeat = 60 / bpm;
  const t = songTime / secPerBeat;
  return t - Math.floor(t);
}

/** Seconds to the nearest beat boundary (before or after), always >= 0. */
export function distanceToBeat(songTime: number, bpm: number): number {
  const secPerBeat = 60 / bpm;
  const phase = beatPhase(songTime, bpm);
  return Math.min(phase, 1 - phase) * secPerBeat;
}

/**
 * A CSS `animation-delay` (seconds, typically negative) so a `secPerBeat`
 * long `animation-duration` keyframe loop, if started fresh right now, reads
 * as already in sync with a song whose beat grid is anchored at `startAt`
 * (a Web Audio `ctx.currentTime`-domain timestamp; `nowCtxTime` should be
 * `ctx.currentTime` sampled at the same moment the style is applied). The
 * beat grid is treated as infinite in both directions, so this works the
 * same whether the song has already started or is still counting in.
 */
export function beatAnimationDelay(nowCtxTime: number, startAt: number, bpm: number): number {
  const secPerBeat = 60 / bpm;
  const phase = beatPhase(nowCtxTime - startAt, bpm);
  return -phase * secPerBeat;
}
