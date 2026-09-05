import type { KeyStat } from './stats';

export type HeatMode = 'accuracy' | 'speed';

export interface KeyHeat {
  /** 0 (best) to 1 (worst) — undefined means no data yet for this letter. */
  intensity?: number;
  label: string;
}

const LETTERS = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');

/**
 * Derives a per-letter heat value from lifetime per-key stats: 'accuracy' colors
 * by mistake rate (mistakes / presses), 'speed' colors by average latency since
 * the previous correct keystroke, normalized against the player's own fastest and
 * slowest keys (raw ms isn't comparable across songs of very different tempo).
 */
export function computeKeyHeat(perKey: Record<string, KeyStat>, mode: HeatMode): Record<string, KeyHeat> {
  if (mode === 'accuracy') return computeAccuracyHeat(perKey);
  return computeSpeedHeat(perKey);
}

function computeAccuracyHeat(perKey: Record<string, KeyStat>): Record<string, KeyHeat> {
  const result: Record<string, KeyHeat> = {};
  for (const letter of LETTERS) {
    const stat = perKey[letter];
    if (!stat || stat.presses === 0) {
      result[letter] = { label: `${letter}: no data yet` };
      continue;
    }
    const errorRate = stat.mistakes / stat.presses;
    result[letter] = { intensity: errorRate, label: `${letter}: ${Math.round(errorRate * 100)}% mistyped` };
  }
  return result;
}

function computeSpeedHeat(perKey: Record<string, KeyStat>): Record<string, KeyHeat> {
  const avgLatency: Record<string, number> = {};
  for (const letter of LETTERS) {
    const stat = perKey[letter];
    if (stat && stat.correctCount > 0) avgLatency[letter] = stat.correctLatencyMs / stat.correctCount;
  }

  const values = Object.values(avgLatency);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const span = max - min;

  const result: Record<string, KeyHeat> = {};
  for (const letter of LETTERS) {
    const avg = avgLatency[letter];
    if (avg === undefined) {
      result[letter] = { label: `${letter}: no data yet` };
      continue;
    }
    const intensity = span > 0 ? (avg - min) / span : 0;
    result[letter] = { intensity, label: `${letter}: ${Math.round(avg)}ms avg` };
  }
  return result;
}
