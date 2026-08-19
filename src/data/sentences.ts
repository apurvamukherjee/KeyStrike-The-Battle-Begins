import type { Difficulty } from '../types/song';

/**
 * Sentence bank for Sentence Mode, grouped by the same Easy/Normal/Hard
 * tiers as the song word banks — deliberately drawing on the same
 * neon/circuit/racing vocabulary as `data/songs/*.ts` so the mode feels like
 * part of the same world rather than a bolted-on typing test.
 */
export const SENTENCES: Record<Difficulty, readonly string[]> = {
  easy: [
    'The neon lights hum through the night.',
    'Push the pedal and feel the rush.',
    'Cold static hides a warm glow.',
    'Every beat drives the pulse forward.',
    'Fast hands win the midnight race.',
    'Keep your eyes on the open road.',
    'The engine roars, then falls silent.',
    'Sparks fly when metal meets speed.',
  ],
  normal: [
    'Somewhere past the flickering skyline, the circuit hums with a quiet, electric hunger.',
    'Every keystroke echoes like a heartbeat racing against the neon-soaked dark.',
    'The static between signals hides a rhythm only fast hands can decode.',
    'Chrome reflections blur into streaks as the throttle drops and the world tilts sideways.',
    'A single perfect word can carry more weight than an entire flawless verse.',
    'Under the amber glow of dying streetlights, the last transmission finally breaks through.',
    'Momentum builds in silence before the drop, and then everything moves at once.',
    'The horizon bends toward gold while the engine cools from another long night.',
  ],
  hard: [
    "Somewhere between the overclocked circuits and the static-drenched skyline, a single misplaced keystroke could unravel everything you've built.",
    "The recursion doesn't stop when you want it to; it stops when the stack finally, quietly, runs out of room to fall.",
    "By the time the singularity collapses inward, you won't remember which threshold you crossed, or when, or why it mattered.",
    'Threading the needle between combo and collapse, she typed faster than the feedback loop could punish her for slowing down.',
    "Every anomaly whispers the same warning: entropy always wins, it just hasn't finished winning yet, not here, not tonight.",
    "The blackout swallowed three city blocks before anyone noticed the cascade had already reached the harbor's old analog relay.",
    "He didn't trust the paradox, but he trusted his hands, and his hands hadn't missed a beat since the meltdown began.",
    'Twilight folds over the harbor like a rumor nobody quite believes, golden and quiet and already halfway gone.',
  ],
};

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Picks `count` sentences from a tier without repeats (cycling the shuffled bank if `count` exceeds its size). */
export function pickSentences(difficulty: Difficulty, count: number): string[] {
  const bank = SENTENCES[difficulty];
  const picked: string[] = [];
  while (picked.length < count) {
    picked.push(...shuffled(bank));
  }
  return picked.slice(0, count);
}
