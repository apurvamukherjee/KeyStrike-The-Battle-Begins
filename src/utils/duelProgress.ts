import { ENEMIES } from '../data/enemies';

const STORAGE_KEY = 'keystrike:duelProgress:v1';

interface DuelProgress {
  /** Enemy ids the player has beaten at least once. */
  defeated: string[];
}

function readAll(): DuelProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DuelProgress) : { defeated: [] };
  } catch {
    return { defeated: [] };
  }
}

function writeAll(progress: DuelProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* private mode / quota exceeded — progress just won't persist this session */
  }
}

export function getDefeatedEnemyIds(): string[] {
  return readAll().defeated;
}

export function recordDuelWin(enemyId: string): void {
  const progress = readAll();
  if (!progress.defeated.includes(enemyId)) {
    progress.defeated.push(enemyId);
    writeAll(progress);
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
