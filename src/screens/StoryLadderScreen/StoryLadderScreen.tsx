import { useEffect, useState } from 'react';
import { songs } from '../../data/songs';
import { STORY_LEVELS, TOTAL_STORY_LEVELS } from '../../data/storyLevels';
import { getHighestStoryLevelCleared, isStoryLevelUnlocked } from '../../utils/storyProgress';
import Swordsman from '../../components/Swordsman/Swordsman';
import './StoryLadderScreen.css';

interface StoryLadderScreenProps {
  onFight: (level: number, songId: string) => void;
  onBack: () => void;
}

const KIND_LABEL: Record<(typeof STORY_LEVELS)[number]['kind'], string> = {
  grunt: '',
  miniboss: 'Miniboss',
  boss: 'Boss',
};

export default function StoryLadderScreen({ onFight, onBack }: StoryLadderScreenProps) {
  const [index, setIndex] = useState(() => Math.min(getHighestStoryLevelCleared(), TOTAL_STORY_LEVELS - 1));
  // Progress only ever changes by clearing a level, which unmounts this
  // screen entirely (App.tsx routes away and back) — reading once per mount
  // is enough, same convention as DuelSelectScreen's own progress read.
  const highestCleared = getHighestStoryLevelCleared();

  const selected = STORY_LEVELS[index];
  const unlocked = isStoryLevelUnlocked(selected.level);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onBack();
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') handleFight();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBack, index]);

  function handleFight() {
    if (!unlocked) return;
    // A random song per fight, same as the Duel ladder — the challenge is the
    // opponent's pace/accuracy profile, not any one song's specific chart.
    const song = songs[Math.floor(Math.random() * songs.length)];
    onFight(selected.level, song.id);
  }

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">Story Mode</h1>
      <p className="tagline">
        {highestCleared} / {TOTAL_STORY_LEVELS} cleared
      </p>

      <div className="story-ladder__preview">
        <Swordsman index={selected.swordsmanIndex} className={unlocked ? undefined : 'story-ladder__portrait--locked'} />
      </div>

      <div className="panel story-ladder__info">
        <span className="story-ladder__level-number">Level {selected.level}</span>
        <span className="story-ladder__name">{unlocked ? selected.name : '???'}</span>
        {unlocked && selected.kind !== 'grunt' && (
          <span className={`story-ladder__kind story-ladder__kind--${selected.kind}`}>{KIND_LABEL[selected.kind]}</span>
        )}
        <p className="story-ladder__flavor">{unlocked ? selected.flavor : 'Clear the previous level to unlock.'}</p>
      </div>

      <div className="story-ladder__grid" role="listbox" aria-label="Story level">
        {STORY_LEVELS.map((l, i) => {
          const open = isStoryLevelUnlocked(l.level);
          const cleared = l.level <= highestCleared;
          const selectedTile = i === index;
          return (
            <button
              key={l.level}
              type="button"
              role="option"
              aria-selected={selectedTile}
              aria-disabled={!open}
              className={
                'story-ladder__tile' +
                (selectedTile ? ' story-ladder__tile--selected' : '') +
                (!open ? ' story-ladder__tile--locked' : '') +
                (l.kind !== 'grunt' ? ` story-ladder__tile--${l.kind}` : '') +
                (cleared ? ' story-ladder__tile--cleared' : '')
              }
              onClick={() => open && setIndex(i)}
            >
              {open ? l.level : '🔒'}
            </button>
          );
        })}
      </div>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" disabled={!unlocked} onClick={handleFight}>
          Fight
        </button>
        <button type="button" className="cap" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
