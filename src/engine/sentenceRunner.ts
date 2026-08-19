export type SentenceKeyResult =
  | { type: 'ignored' } // already complete, nothing left to type
  | { type: 'wrong' } // incorrect character — counts against accuracy, breaks combo
  | { type: 'progress' } // correct character, sentence not yet finished
  | { type: 'complete' }; // correct character, sentence just finished

/**
 * Tracks free-form typing progress through one continuous block of text — no
 * per-character deadline, unlike WordRunner, since the fog-reveal itself is
 * the challenge rather than a clock. A wrong keystroke doesn't advance
 * `typed` (same "type the correct key to proceed" feel as WordRunner) but,
 * unlike WordRunner's silent ignore, it DOES count toward accuracy and DOES
 * reset combo — a meaningful accuracy% needs that, which a fully-silent
 * ignore can't produce.
 */
export class SentenceRunner {
  readonly text: string;
  typed = 0;
  errors = 0;
  combo = 0;
  maxCombo = 0;
  score = 0;

  constructor(text: string) {
    this.text = text;
  }

  get length(): number {
    return this.text.length;
  }

  get isComplete(): boolean {
    return this.typed >= this.text.length;
  }

  /** correct / (correct + wrong), 100% before anything has been typed. */
  get accuracy(): number {
    const total = this.typed + this.errors;
    if (total === 0) return 100;
    return (this.typed / total) * 100;
  }

  handleKey(char: string): SentenceKeyResult {
    if (this.isComplete) return { type: 'ignored' };

    const expected = this.text[this.typed];
    if (char !== expected) {
      this.errors++;
      this.combo = 0;
      return { type: 'wrong' };
    }

    this.typed++;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += 1;
    return this.isComplete ? { type: 'complete' } : { type: 'progress' };
  }

  /** Adds bonus points outside normal per-character scoring — e.g. a Beat Challenge on-beat bonus. */
  addBonus(points: number): void {
    this.score += points;
  }
}

/** Standard WPM formula: correct characters / 5, over elapsed minutes. */
export function wpmFrom(correctChars: number, elapsedSec: number): number {
  if (elapsedSec <= 0) return 0;
  return correctChars / 5 / (elapsedSec / 60);
}
