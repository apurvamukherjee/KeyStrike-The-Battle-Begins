import { comboMultiplier } from './chartEngine';

const START_MS_PER_CHAR = 380;
const FLOOR_MS_PER_CHAR = 110;
const DECAY_PER_WORD = 0.94;
const MIN_WORD_BUDGET_MS = 900;
const SCORE_BASE = 40;
const SCORE_PER_LETTER = 8;

/** Per-character pace at a given words-cleared count — shrinks (gets harder) with every word, floored so it never becomes unplayable. */
export function msPerCharFor(wordsCleared: number, speedOffset = 0): number {
  const decayed = START_MS_PER_CHAR * DECAY_PER_WORD ** wordsCleared;
  return Math.max(FLOOR_MS_PER_CHAR, decayed - speedOffset);
}

/** The active word's total time budget — long enough that even short words on Easy feel fair. */
export function timeBudgetMsFor(word: string, wordsCleared: number, speedOffset = 0): number {
  return Math.max(MIN_WORD_BUDGET_MS, word.length * msPerCharFor(wordsCleared, speedOffset));
}

export type EndlessKeyResult = { type: 'ignored' } | { type: 'progress' } | { type: 'wordComplete' };

/**
 * Survival mode: one word at a time from a mixed pool, no fixed chart or
 * backing track — the caller drives a real-time countdown against
 * `timeBudgetMs` and calls `timeExpired()` when it hits zero, which ends the
 * run on the spot (a single miss, same "beat the clock" stakes as the rest
 * of the game, just without a song underneath it).
 */
export class EndlessRunner {
  readonly pool: readonly string[];
  private pick: () => number;
  currentWord: string;
  typed = 0;
  score = 0;
  combo = 0;
  maxCombo = 0;
  wordsCleared = 0;
  /** Shifts msPerChar down (faster) at every difficulty tier above Easy — set once at construction. */
  readonly speedOffset: number;
  ended = false;

  constructor(pool: readonly string[], speedOffset = 0, pick: () => number = Math.random) {
    if (pool.length === 0) throw new Error('EndlessRunner needs a non-empty word pool');
    this.pool = pool;
    this.speedOffset = speedOffset;
    this.pick = pick;
    this.currentWord = this.pickWord();
  }

  private pickWord(): string {
    return this.pool[Math.floor(this.pick() * this.pool.length)] ?? this.pool[0];
  }

  get timeBudgetMs(): number {
    return timeBudgetMsFor(this.currentWord, this.wordsCleared, this.speedOffset);
  }

  handleKey(letter: string): EndlessKeyResult {
    if (this.ended) return { type: 'ignored' };
    const expected = this.currentWord[this.typed];
    if (!expected || letter.toUpperCase() !== expected) return { type: 'ignored' };

    this.typed++;
    if (this.typed < this.currentWord.length) return { type: 'progress' };

    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += (SCORE_BASE + this.currentWord.length * SCORE_PER_LETTER) * comboMultiplier(this.combo);
    this.wordsCleared++;
    this.currentWord = this.pickWord();
    this.typed = 0;
    return { type: 'wordComplete' };
  }

  /** Call once the active word's time budget hits zero — ends the run. */
  timeExpired(): void {
    this.ended = true;
    this.combo = 0;
  }
}
