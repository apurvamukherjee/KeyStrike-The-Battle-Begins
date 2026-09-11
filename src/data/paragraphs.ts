import type { Difficulty } from '../types/song';

/**
 * Paragraph bank for Paragraph Mode, grouped by the same Easy/Normal/Hard
 * tiers as Sentence Mode — but unlike Sentence Mode's fog-of-war reveal,
 * the whole paragraph stays visible, so the challenge is sustained flow
 * across sentence boundaries rather than a shrinking window.
 */
export const PARAGRAPHS: Record<Difficulty, readonly string[]> = {
  easy: [
    'The city wakes up slow. Neon signs flicker off one by one. A single car hums down the empty street.',
    'Rain taps the window all night long. The street lights blur into soft gold circles. Morning comes quiet and clean.',
    'Keep both hands ready and your eyes up. The road ahead curves hard to the left. Trust your hands to find the way.',
  ],
  normal: [
    'The circuit hums beneath the skyline, a low current running under everything else. Every rider out tonight is chasing the same silence — the one that only shows up once the noise finally drops away.',
    'Somewhere past the last checkpoint, the static clears just long enough to catch a signal. It only lasts a few seconds, but a few seconds is all a fast pair of hands has ever needed.',
    'The engine cools in the dark garage, ticking softly as the heat leaves it. Tomorrow it runs again, faster than tonight, because tonight taught it exactly where it was slow.',
  ],
  hard: [
    "By the time the feedback loop stabilizes, the operator has already made three decisions she won't remember making — the kind of fluency that only shows up after the fear of failing has been typed straight through, over and over, until it stopped meaning anything.",
    'The recursion doesn\'t announce itself; it just keeps calling, quietly, until the stack remembers it has a limit after all. Nobody notices the exact frame where it finally gives — only the silence that follows, and the restart that comes right after.',
    "Entropy doesn't rush. It just never stops, which turns out to be worse — a slow, patient erosion of every edge that used to be sharp, until the whole system settles into something warm, stable, and quietly, permanently wrong.",
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

/** Picks one random paragraph from a tier. */
export function pickParagraph(difficulty: Difficulty): string {
  const bank = PARAGRAPHS[difficulty];
  return shuffled(bank)[0];
}
