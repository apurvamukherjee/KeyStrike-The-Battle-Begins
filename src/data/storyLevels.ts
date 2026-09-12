import type { CpuProfile } from '../engine/cpuOpponent';
import { ENEMIES } from './enemies';

export interface StoryLevel {
  level: number;
  kind: 'grunt' | 'miniboss' | 'boss';
  name: string;
  swordsmanIndex: number;
  profile: CpuProfile;
  flavor: string;
  /** Character/sword id granted the first time this level is cleared — only set on a handful of milestone levels. */
  unlocks?: { characterId?: string; swordId?: string };
}

export const TOTAL_STORY_LEVELS = 50;

const GRUNT_NAMES = [
  'Ashigaru Recruit',
  'Blade Apprentice',
  'Border Ronin',
  'Dojo Trainee',
  'Steel Initiate',
  'Wandering Duelist',
  'Garrison Guard',
  'Masterless Blade',
];

/** Smooth difficulty ramp for ordinary levels — slow at first, steeper by the back half, so the campaign doesn't wall new players on level 3. */
function curveWpm(level: number): number {
  const t = (level - 1) / (TOTAL_STORY_LEVELS - 1);
  return Math.round(10 + t ** 1.3 * 68);
}

function curveAccuracy(level: number): number {
  const t = (level - 1) / (TOTAL_STORY_LEVELS - 1);
  return Math.min(0.98, 0.5 + t ** 1.1 * 0.48);
}

/**
 * Every 5th level is a named milestone. Levels 5-45 reuse the Duel ladder's
 * own enemies (in ladder order) — their hand-tuned profiles land as natural
 * stat spikes over the smooth grunt curve without any extra tuning, and nothing
 * already shipped goes to waste. Level 50 is a new, campaign-exclusive final
 * boss with its own prestige unlock.
 */
const MILESTONES: Record<number, Omit<StoryLevel, 'level'>> = {
  5: { kind: 'miniboss', name: ENEMIES[0].name, swordsmanIndex: ENEMIES[0].swordsmanIndex, profile: ENEMIES[0].profile, flavor: ENEMIES[0].flavor },
  10: { kind: 'boss', name: ENEMIES[1].name, swordsmanIndex: ENEMIES[1].swordsmanIndex, profile: ENEMIES[1].profile, flavor: ENEMIES[1].flavor },
  15: { kind: 'miniboss', name: ENEMIES[2].name, swordsmanIndex: ENEMIES[2].swordsmanIndex, profile: ENEMIES[2].profile, flavor: ENEMIES[2].flavor },
  20: { kind: 'boss', name: ENEMIES[3].name, swordsmanIndex: ENEMIES[3].swordsmanIndex, profile: ENEMIES[3].profile, flavor: ENEMIES[3].flavor },
  25: {
    kind: 'miniboss',
    name: ENEMIES[4].name,
    swordsmanIndex: ENEMIES[4].swordsmanIndex,
    profile: ENEMIES[4].profile,
    flavor: ENEMIES[4].flavor,
    unlocks: { swordId: 'sun-forged-edge' },
  },
  30: { kind: 'boss', name: ENEMIES[5].name, swordsmanIndex: ENEMIES[5].swordsmanIndex, profile: ENEMIES[5].profile, flavor: ENEMIES[5].flavor },
  35: { kind: 'miniboss', name: ENEMIES[6].name, swordsmanIndex: ENEMIES[6].swordsmanIndex, profile: ENEMIES[6].profile, flavor: ENEMIES[6].flavor },
  40: { kind: 'boss', name: ENEMIES[7].name, swordsmanIndex: ENEMIES[7].swordsmanIndex, profile: ENEMIES[7].profile, flavor: ENEMIES[7].flavor },
  45: { kind: 'miniboss', name: ENEMIES[8].name, swordsmanIndex: ENEMIES[8].swordsmanIndex, profile: ENEMIES[8].profile, flavor: ENEMIES[8].flavor },
  50: {
    kind: 'boss',
    name: 'Sword Saint',
    swordsmanIndex: 8,
    profile: { wordsPerMinute: 72, accuracy: 0.98 },
    flavor: 'Every duel on this ladder was practice for this one.',
    unlocks: { characterId: 'sword-saint' },
  },
};

function buildLevel(level: number): StoryLevel {
  const milestone = MILESTONES[level];
  if (milestone) return { level, ...milestone };
  return {
    level,
    kind: 'grunt',
    name: GRUNT_NAMES[(level - 1) % GRUNT_NAMES.length],
    swordsmanIndex: (level - 1) % 8,
    profile: { wordsPerMinute: curveWpm(level), accuracy: curveAccuracy(level) },
    flavor: 'Another blade on the road to the top.',
  };
}

export const STORY_LEVELS: StoryLevel[] = Array.from({ length: TOTAL_STORY_LEVELS }, (_, i) => buildLevel(i + 1));

export function getStoryLevel(level: number): StoryLevel | undefined {
  return STORY_LEVELS.find((l) => l.level === level);
}
