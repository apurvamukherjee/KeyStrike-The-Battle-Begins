import { useEffect, useState, type CSSProperties } from 'react';
import { songs } from '../../data/songs';
import { getBestScore } from '../../utils/highScores';
import { DIFFICULTIES, type Difficulty } from '../../types/song';
import './SongSelectScreen.css';

interface SongSelectScreenProps {
  onSelect: (songId: string, difficulty: Difficulty) => void;
  onBack: () => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

export default function SongSelectScreen({ onSelect, onBack }: SongSelectScreenProps) {
  const [index, setIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const cycleDifficulty = (dir: 1 | -1) => {
    const i = DIFFICULTIES.indexOf(difficulty);
    setDifficulty(DIFFICULTIES[(i + dir + DIFFICULTIES.length) % DIFFICULTIES.length]);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') setIndex((i) => Math.min(songs.length - 1, i + 1));
      else if (e.code === 'ArrowUp') setIndex((i) => Math.max(0, i - 1));
      else if (e.code === 'ArrowRight') cycleDifficulty(1);
      else if (e.code === 'ArrowLeft') cycleDifficulty(-1);
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') onSelect(songs[index].id, difficulty);
      else if (e.code === 'Escape') onBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, difficulty, onSelect, onBack]);

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">Select Song</h1>

      <div className="difficulty-picker" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={d === difficulty}
            className={`difficulty-picker__option${d === difficulty ? ' difficulty-picker__option--active' : ''}`}
            onClick={() => setDifficulty(d)}
          >
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </div>

      <ul className="song-list" role="listbox" aria-activedescendant={songs[index]?.id}>
        {songs.map((song, i) => {
          const best = getBestScore(song.id, difficulty);
          const selected = i === index;
          return (
            <li
              key={song.id}
              id={song.id}
              role="option"
              aria-selected={selected}
              className={`song-list__item${selected ? ' song-list__item--selected' : ''}`}
              style={{ '--song-accent': song.accent } as CSSProperties}
              onClick={() => setIndex(i)}
              onDoubleClick={() => onSelect(song.id, difficulty)}
            >
              <span className="song-list__marker" aria-hidden="true" />
              <span className="song-list__meta">
                <span className="song-list__title">{song.title}</span>
                <span className="song-list__artist">{song.artist}</span>
              </span>
              <span className="song-list__difficulty" aria-label={`Difficulty ${song.difficulty} of 5`}>
                {'★'.repeat(song.difficulty)}
                {'☆'.repeat(5 - song.difficulty)}
              </span>
              <span className="song-list__best">{best ? `${Math.round(best.accuracy)}% · ${best.grade}` : '—'}</span>
            </li>
          );
        })}
      </ul>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" onClick={() => onSelect(songs[index].id, difficulty)}>
          Play
        </button>
        <button type="button" className="cap" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
