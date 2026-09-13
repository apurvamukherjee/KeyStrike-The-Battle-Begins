import { ENEMIES } from '../data/enemies';
import { createJsonStore } from './jsonStore';

interface DuelProgress {
  /** Enemy ids the player has beaten at least once. */
  defeated: string[];
}

const store = createJsonStore<DuelProgress>('keystrike:duelProgress:v1', () => ({ defeated: [] }));

export function getDefeatedEnemyIds(): string[] {
  return store.read().defeated;
}

export function recordDuelWin(enemyId: string): void {
  const progress = store.read();
  if (!progress.defeated.includes(enemyId)) {
    progress.defeated.push(enemyId);
    store.write(progress);
  }
}

/** Rank 1 is always open; every other rank needs the previous rank defeated. */
export function isEnemyUnlocked(enemyId: string): boolean {
  const enemy = ENEMIES.find((e) => e.id === enemyId);
  if (!enemy) return false;
  if (enemy.rank <= 1) return true;
  const previous = ENEMIES.find((e) => e.rank === enemy.rank - 1);
  if (!previous) return true;
  return getDefeatedEnemyIds().includes(previous.id);
}
