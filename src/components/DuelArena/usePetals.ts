import { useMemo } from 'react';

const PETAL_COUNT = 14;

export interface Petal {
  left: number;
  drift: number;
  duration: number;
  delay: number;
  opacity: number;
}

/**
 * The drifting cherry-blossom petals both duel arenas render over the shared
 * night-dojo backdrop. Generated once per mount — a re-roll on every render
 * would make the petals visibly jump.
 */
export function usePetals(): Petal[] {
  return useMemo(
    () =>
      Array.from({ length: PETAL_COUNT }, () => ({
        left: Math.random() * 100,
        drift: Math.random() * 80 - 40,
        duration: 7 + Math.random() * 6,
        delay: Math.random() * -12,
        opacity: 0.4 + Math.random() * 0.5,
      })),
    [],
  );
}
