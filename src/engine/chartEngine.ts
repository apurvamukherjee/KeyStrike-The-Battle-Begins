import type { WordNote } from '../types/song';
import type { Judgement, JudgementCounts } from '../types/game';

/** Seconds after a word's deadline that still counts as a (lesser) hit rather than a miss. */
export const GOOD_GRACE = 0.5;
const LENGTH_BONUS_PER_LETTER = 5;

export type KeyResult =
  | { type: 'ignored' }
  | { type: 'progress' }
  | { type: 'wordComplete'; judgement: Judgement };

interface WordNoteState {
  note: WordNote;
  /** letters correctly typed so far */
  typed: number;
  judgement: Judgement | null;
}

/**
 * Tracks one word at a time — the player types its letters in order, and it's
 * judged the moment the last letter lands, against its deadline:
 * finishing at or before the deadline is a Perfect (you beat the clock),
 * finishing within GOOD_GRACE after is a Good, and running out the grace
 * period unfinished is a Miss. Wrong letters are simply ignored, same
 * forgiveness as an ordinary typing test.
 */
export class WordRunner {
  readonly words: WordNoteState[];
  activeIndex = 0;
  score = 0;
  combo = 0;
  maxCombo = 0;
  counts: JudgementCounts = { perfect: 0, good: 0, miss: 0 };

  constructor(chart: WordNote[]) {
    this.words = chart.map((note) => ({
      note: { ...note, word: note.word.toUpperCase() },
      typed: 0,
      judgement: null,
    }));
  }

  get totalWords() {
    return this.words.length;
  }

  get judgedCount() {
    return this.counts.perfect + this.counts.good + this.counts.miss;
  }

  get isComplete(): boolean {
    return this.activeIndex >= this.words.length;
  }

  get activeWord(): WordNoteState | null {
    return this.activeIndex < this.words.length ? this.words[this.activeIndex] : null;
  }

  /** Weighted against words judged so far, so it reads live instead of bottoming out at song start. */
  get accuracy(): number {
    if (this.judgedCount === 0) return 100;
    const weighted = this.counts.perfect + this.counts.good * 0.5;
    return (weighted / this.judgedCount) * 100;
  }

  multiplier(): number {
    return Math.min(4, 1 + Math.floor(this.combo / 15) * 0.5);
  }

  /** Call on every single-letter keydown. */
  handleKey(letter: string, songTime: number): KeyResult {
    const state = this.activeWord;
    if (!state) return { type: 'ignored' };

    const expected = state.note.word[state.typed];
    if (!expected || letter.toUpperCase() !== expected) return { type: 'ignored' };

    state.typed++;
    if (state.typed < state.note.word.length) return { type: 'progress' };

    const judgement = this.resolve(state, songTime);
    return { type: 'wordComplete', judgement };
  }

  private resolve(state: WordNoteState, completionTime: number): Judgement {
    const judgement: Judgement = completionTime <= state.note.time ? 'perfect' : 'good';
    state.judgement = judgement;
    this.counts[judgement]++;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const base = (judgement === 'perfect' ? 100 : 50) + state.note.word.length * LENGTH_BONUS_PER_LETTER;
    this.score += base * this.multiplier();
    this.activeIndex++;
    return judgement;
  }

  /** Call every frame with the current song time. Returns true if the active word just became a Miss. */
  sweepMisses(songTime: number): boolean {
    const state = this.activeWord;
    if (!state) return false;
    if (songTime - state.note.time > GOOD_GRACE) {
      state.judgement = 'miss';
      this.counts.miss++;
      this.combo = 0;
      this.activeIndex++;
      return true;
    }
    return false;
  }
}

export function gradeForAccuracy(accuracy: number): string {
  if (accuracy >= 97) return 'S';
  if (accuracy >= 90) return 'A';
  if (accuracy >= 80) return 'B';
  if (accuracy >= 65) return 'C';
  if (accuracy >= 45) return 'D';
  return 'F';
}
