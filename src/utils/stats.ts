import type { JudgementCounts, SentenceRunResult } from '../types/game';
import { createJsonStore } from './jsonStore';

/** Lifetime per-letter typing data, keyed by uppercase A-Z, aggregated across every solo run for the Stats screen's typing heatmap. */
export interface KeyStat {
  /** Every time this letter was pressed, correct-for-position or not. */
  presses: number;
  /** Presses of this letter when it was NOT the expected next letter. */
  mistakes: number;
  /** Sum of milliseconds since the previous accepted keystroke, for each correct press of this letter. */
  correctLatencyMs: number;
  /** Denominator for correctLatencyMs — correct presses with a prior keystroke to measure from. */
  correctCount: number;
}

export interface LifetimeStats {
  totalPlays: number;
  totalWordsTyped: number;
  totalPerfect: number;
  totalGood: number;
  totalMiss: number;
  bestComboEver: number;
  totalScoreEver: number;
  longestWordCleared: string;
  totalSentenceRuns: number;
  totalCharactersTyped: number;
  bestWpmEver: number;
  perKey: Record<string, KeyStat>;
}

const store = createJsonStore<LifetimeStats>(
  'keystrike:stats:v1',
  () => ({
    totalPlays: 0,
    totalWordsTyped: 0,
    totalPerfect: 0,
    totalGood: 0,
    totalMiss: 0,
    bestComboEver: 0,
    totalScoreEver: 0,
    longestWordCleared: '',
    totalSentenceRuns: 0,
    totalCharactersTyped: 0,
    bestWpmEver: 0,
    perKey: {},
  }),
  { merge: true },
);

export function getStats(): LifetimeStats {
  return store.read();
}

interface RunSummary {
  maxCombo: number;
  score: number;
  counts: JudgementCounts;
}

/** Call once when a run (solo or practice) finishes. `longestWordCleared` should be '' if nothing was completed. */
export function recordRun(run: RunSummary, longestWordCleared: string) {
  const stats = store.read();
  stats.totalPlays += 1;
  stats.totalWordsTyped += run.counts.perfect + run.counts.good;
  stats.totalPerfect += run.counts.perfect;
  stats.totalGood += run.counts.good;
  stats.totalMiss += run.counts.miss;
  stats.bestComboEver = Math.max(stats.bestComboEver, run.maxCombo);
  stats.totalScoreEver += run.score;
  if (longestWordCleared.length > stats.longestWordCleared.length) {
    stats.longestWordCleared = longestWordCleared;
  }
  store.write(stats);
}

/** Call once when a run finishes, merging that run's per-key data into the lifetime totals. */
export function recordKeyStats(delta: Record<string, KeyStat>): void {
  const stats = store.read();
  for (const [letter, d] of Object.entries(delta)) {
    const entry = stats.perKey[letter] ?? (stats.perKey[letter] = { presses: 0, mistakes: 0, correctLatencyMs: 0, correctCount: 0 });
    entry.presses += d.presses;
    entry.mistakes += d.mistakes;
    entry.correctLatencyMs += d.correctLatencyMs;
    entry.correctCount += d.correctCount;
  }
  store.write(stats);
}

/** Call once when a Sentence Mode run finishes. */
export function recordSentenceRun(run: SentenceRunResult) {
  const stats = store.read();
  stats.totalSentenceRuns += 1;
  stats.totalCharactersTyped += run.charactersTyped;
  stats.bestComboEver = Math.max(stats.bestComboEver, run.maxCombo);
  stats.totalScoreEver += run.score;
  stats.bestWpmEver = Math.max(stats.bestWpmEver, Math.round(run.wpm));
  store.write(stats);
}
