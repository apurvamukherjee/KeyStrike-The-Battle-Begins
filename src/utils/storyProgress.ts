import { getStoryLevel, TOTAL_STORY_LEVELS } from '../data/storyLevels';

const STORAGE_KEY = 'keystrike:storyProgress:v1';

interface StoryProgress {
  highestLevelCleared: number;
  /** Character/sword ids granted by a story level's `unlocks` — separate from the Duel-ladder-based unlock system in utils/loadoutProgress. */
  rewardsClaimed: string[];
}

const DEFAULT_PROGRESS: StoryProgress = { highestLevelCleared: 0, rewardsClaimed: [] };

function readProgress(): StoryProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PROGRESS, ...(JSON.parse(raw) as Partial<StoryProgress>) } : DEFAULT_PROGRESS;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function writeProgress(progress: StoryProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* private mode / quota exceeded — progress just won't persist this session */
  }
}

export function getHighestStoryLevelCleared(): number {
  return readProgress().highestLevelCleared;
}

/** Level 1 is always open; every other level needs the previous one cleared. */
export function isStoryLevelUnlocked(level: number): boolean {
  if (level <= 1) return true;
  return getHighestStoryLevelCleared() >= level - 1;
}

export function hasStoryReward(id: string): boolean {
  return readProgress().rewardsClaimed.includes(id);
}

/** Records a level clear and grants its reward (if any and not already claimed) — a no-op re-clear of an already-beaten level still no-ops safely. */
export function recordStoryLevelClear(level: number): void {
  const progress = readProgress();
  progress.highestLevelCleared = Math.max(progress.highestLevelCleared, Math.min(level, TOTAL_STORY_LEVELS));

  const unlocks = getStoryLevel(level)?.unlocks;
  const rewardId = unlocks?.characterId ?? unlocks?.swordId;
  if (rewardId && !progress.rewardsClaimed.includes(rewardId)) {
    progress.rewardsClaimed.push(rewardId);
  }
  writeProgress(progress);
}
