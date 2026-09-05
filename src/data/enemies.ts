import type { CpuProfile } from '../engine/cpuOpponent';

export interface Enemy {
  id: string;
  name: string;
  tier: 'samurai' | 'yokai';
  /** 1-based ladder position — also the unlock order (rank N needs rank N-1 defeated). */
  rank: number;
  /** Picks a Swordsman color recipe (src/components/Swordsman) for visual variety. */
  swordsmanIndex: number;
  profile: CpuProfile;
  flavor: string;
}

// A short ladder: three ranked samurai first, then two yokai as the harder
// tier above them — wordsPerMinute and accuracy both climb with rank so each
// fight is a clear step up, not just a reskin of the last one.
export const ENEMIES: Enemy[] = [
  {
    id: 'wandering-ronin',
    name: 'Wandering Ronin',
    tier: 'samurai',
    rank: 1,
    swordsmanIndex: 2,
    profile: { wordsPerMinute: 18, accuracy: 0.65 },
    flavor: 'A drifting blade for hire — more bark than bite.',
  },
  {
    id: 'dojo-sentinel',
    name: 'Dojo Sentinel',
    tier: 'samurai',
    rank: 2,
    swordsmanIndex: 4,
    profile: { wordsPerMinute: 26, accuracy: 0.76 },
    flavor: 'Trained since childhood to guard this ground.',
  },
  {
    id: 'crimson-captain',
    name: 'Crimson Captain',
    tier: 'samurai',
    rank: 3,
    swordsmanIndex: 0,
    profile: { wordsPerMinute: 33, accuracy: 0.84 },
    flavor: 'Commands a garrison. Expects to win.',
  },
  {
    id: 'shadow-yokai',
    name: 'Shadow Yokai',
    tier: 'yokai',
    rank: 4,
    swordsmanIndex: 3,
    profile: { wordsPerMinute: 40, accuracy: 0.89 },
    flavor: 'A spirit given form only long enough to duel.',
  },
  {
    id: 'oni-warlord',
    name: 'Oni Warlord',
    tier: 'yokai',
    rank: 5,
    swordsmanIndex: 6,
    profile: { wordsPerMinute: 47, accuracy: 0.93 },
    flavor: 'Horned, merciless, and very fast.',
  },
];

export function getEnemyById(id: string): Enemy | undefined {
  return ENEMIES.find((e) => e.id === id);
}
