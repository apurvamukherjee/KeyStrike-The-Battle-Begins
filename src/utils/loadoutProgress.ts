import { CHARACTERS } from '../data/characters';
import { SWORDS } from '../data/swords';
import { getDefeatedEnemyIds } from './duelProgress';

/**
 * "Fighting level" — for now, the number of distinct Duel ladder enemies
 * beaten. Once Story Mode ships (Phase 4) its own progress folds into this
 * same number, so every unlock defined against it keeps working unchanged.
 */
export function getFightingLevel(): number {
  return getDefeatedEnemyIds().length;
}

export function isCharacterUnlocked(characterId: string): boolean {
  const character = CHARACTERS.find((c) => c.id === characterId);
  if (!character) return false;
  return getFightingLevel() >= character.unlockLevel;
}

export function isSwordUnlocked(swordId: string): boolean {
  const sword = SWORDS.find((s) => s.id === swordId);
  if (!sword) return false;
  return getFightingLevel() >= sword.unlockLevel;
}
