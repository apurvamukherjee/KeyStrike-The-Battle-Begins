import { getStoryLevel, TOTAL_STORY_LEVELS } from '../data/storyLevels';
import { createJsonStore } from './jsonStore';

interface StoryProgress {
  highestLevelCleared: number;
  /** Character/sword ids granted by a story level's `unlocks` — separate from the Duel-ladder-based unlock system in utils/loadoutProgress. */
  rewardsClaimed: string[];
}

const store = createJsonStore<StoryProgress>(
  'keystrike:storyProgress:v1',
  () => ({ highestLevelCleared: 0, rewardsClaimed: [] }),
  { merge: true },
);

export function getHighestStoryLevelCleared(): number {
  return store.read().highestLevelCleared;
}

/** Level 1 is always open; every other level needs the previous one cleared. */
export function isStoryLevelUnlocked(level: number): boolean {
  if (level <= 1) return true;
  return getHighestStoryLevelCleared() >= level - 1;
}

export function hasStoryReward(id: string): boolean {
  return store.read().rewardsClaimed.includes(id);
}

/** Records a level clear and grants its reward (if any and not already claimed) — a no-op re-clear of an already-beaten level still no-ops safely. */
export function recordStoryLevelClear(level: number): void {
  const progress = store.read();
  progress.highestLevelCleared = Math.max(progress.highestLevelCleared, Math.min(level, TOTAL_STORY_LEVELS));

  const unlocks = getStoryLevel(level)?.unlocks;
  const rewardId = unlocks?.characterId ?? unlocks?.swordId;
  if (rewardId && !progress.rewardsClaimed.includes(rewardId)) {
    progress.rewardsClaimed.push(rewardId);
  }
  store.write(progress);
}
