import { useEffect, useState } from 'react';
import { ENEMIES } from '../../data/enemies';
import { songs } from '../../data/songs';
import { getDefeatedEnemyIds, isEnemyUnlocked } from '../../utils/duelProgress';
import { DIFFICULTIES, type Difficulty } from '../../types/song';
import Swordsman from '../../components/Swordsman/Swordsman';
import './DuelSelectScreen.css';

interface DuelSelectScreenProps {
  onFight: (songId: string, difficulty: Difficulty, enemyId: string) => void;
  /** Routes to the room lobby with Duel mode preselected — the online counterpart to this CPU ladder. */
  onDuelOnline: () => void;
  onBack: () => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

export default function DuelSelectScreen({ onFight, onDuelOnline, onBack }: DuelSelectScreenProps) {
  const [index, setIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  // Progress only ever changes by finishing a duel, which unmounts this screen
  // entirely (App.tsx routes away and back) — reading once per mount is enough.
  const defeated = getDefeatedEnemyIds();

  const enemy = ENEMIES[index];
  const unlocked = isEnemyUnlocked(enemy.id);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack]);

  function handleFight() {
    if (!unlocked) return;
    // A random song per duel keeps the ladder fresh — the fight is against
    // the enemy's pacing/accuracy profile, not any one song's specific chart.
    const song = songs[Math.floor(Math.random() * songs.length)];
    onFight(song.id, difficulty, enemy.id);
  }

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">Duel Ladder</h1>
      <p className="tagline">Defeat each rival to reveal the next.</p>

      <div className="difficulty-picker" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={difficulty === d}
            className={`difficulty-picker__option${difficulty === d ? ' difficulty-picker__option--active' : ''}`}
            onClick={() => setDifficulty(d)}
          >
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </div>

      <div className="duel-select__preview">
        <Swordsman index={enemy.swordsmanIndex} className={unlocked ? undefined : 'duel-select__portrait--locked'} />
      </div>

      <ul className="song-list" role="listbox" aria-activedescendant={enemy.id}>
        {ENEMIES.map((e, i) => {
          const won = defeated.includes(e.id);
          const open = isEnemyUnlocked(e.id);
          const selected = i === index;
          return (
            <li
              key={e.id}
              id={e.id}
              role="option"
              aria-selected={selected}
              aria-disabled={!open}
              className={`song-list__item${selected ? ' song-list__item--selected' : ''}${!open ? ' duel-select__item--locked' : ''}`}
              onClick={() => open && setIndex(i)}
            >
              <span className="song-list__marker" aria-hidden="true" />
              <span className="song-list__meta">
                <span className="song-list__title">{open ? e.name : '???'}</span>
                <span className="song-list__artist">{open ? e.flavor : 'Defeat the previous rival to unlock'}</span>
              </span>
              <span className="song-list__best">{won ? 'Defeated' : open ? '—' : '🔒'}</span>
            </li>
          );
        })}
      </ul>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" disabled={!unlocked} onClick={handleFight}>
          Fight
        </button>
        <button type="button" className="cap" onClick={onBack}>
          Back
        </button>
      </div>

      <button type="button" className="duel-select__online-link" onClick={onDuelOnline}>
        Duel a friend online →
      </button>
    </div>
  );
}
