import { CHARACTERS } from '../data/characters';
import { SWORDS } from '../data/swords';
import { getDefeatedEnemyIds } from './duelProgress';
import { hasStoryReward } from './storyProgress';

/**
 * "Fighting level" — the number of distinct Duel ladder enemies beaten.
 * Story Mode unlocks (see `storyReward` on Character/Sword) are checked
 * separately in isCharacterUnlocked/isSwordUnlocked rather than folded into
 * this number, since they're granted by specific level clears, not a count.
 */
export function getFightingLevel(): number {
  return getDefeatedEnemyIds().length;
}

export function isCharacterUnlocked(characterId: string): boolean {
  const character = CHARACTERS.find((c) => c.id === characterId);
  if (!character) return false;
  if (character.storyReward) return hasStoryReward(character.id);
  return getFightingLevel() >= character.unlockLevel;
}

export function isSwordUnlocked(swordId: string): boolean {
  const sword = SWORDS.find((s) => s.id === swordId);
  if (!sword) return false;
  if (sword.storyReward) return hasStoryReward(sword.id);
  return getFightingLevel() >= sword.unlockLevel;
}
