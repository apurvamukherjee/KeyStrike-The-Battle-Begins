import type { JudgementCounts, SentenceRunResult } from '../types/game';

const STATS_KEY = 'keystrike:stats:v1';

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
}

const DEFAULT_STATS: LifetimeStats = {
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
};

function readStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...DEFAULT_STATS, ...(JSON.parse(raw) as Partial<LifetimeStats>) } : { ...DEFAULT_STATS };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function writeStats(stats: LifetimeStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* private mode / quota exceeded — stats just won't persist this session */
  }
}

export function getStats(): LifetimeStats {
  return readStats();
}

interface RunSummary {
  maxCombo: number;
  score: number;
  counts: JudgementCounts;
}

/** Call once when a run (solo or practice) finishes. `longestWordCleared` should be '' if nothing was completed. */
export function recordRun(run: RunSummary, longestWordCleared: string) {
  const stats = readStats();
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
  writeStats(stats);
}

/** Call once when a Sentence Mode run finishes. */
export function recordSentenceRun(run: SentenceRunResult) {
  const stats = readStats();
  stats.totalSentenceRuns += 1;
  stats.totalCharactersTyped += run.charactersTyped;
  stats.bestComboEver = Math.max(stats.bestComboEver, run.maxCombo);
  stats.totalScoreEver += run.score;
  stats.bestWpmEver = Math.max(stats.bestWpmEver, Math.round(run.wpm));
  writeStats(stats);
}
