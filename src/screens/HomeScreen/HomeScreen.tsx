import { useEffect, useState } from 'react';
import './HomeScreen.css';

interface HomeScreenProps {
  onPlay: () => void;
  onSentences: () => void;
  onParagraph: () => void;
  onEndless: () => void;
  onBattle: () => void;
  onDuel: () => void;
  onStats: () => void;
  onCustomize: () => void;
  onSettings: () => void;
}

type Group = 'play' | 'versus' | 'profile';

interface GroupItem {
  label: string;
  onSelect: () => void;
}

export default function HomeScreen({
  onPlay,
  onSentences,
  onParagraph,
  onEndless,
  onBattle,
  onDuel,
  onStats,
  onCustomize,
  onSettings,
}: HomeScreenProps) {
  const [openGroup, setOpenGroup] = useState<Group | null>(null);

  const groups: Record<Group, { label: string; items: GroupItem[] }> = {
    play: {
      label: 'Play',
      items: [
        { label: 'Free Play', onSelect: onPlay },
        { label: 'Sentences', onSelect: onSentences },
        { label: 'Paragraph', onSelect: onParagraph },
        { label: 'Endless', onSelect: onEndless },
      ],
    },
    versus: {
      label: 'Versus',
      items: [
        { label: 'Battle', onSelect: onBattle },
        { label: 'Duel', onSelect: onDuel },
      ],
    },
    profile: {
      label: 'Profile',
      items: [
        { label: 'Stats', onSelect: onStats },
        { label: 'Customize', onSelect: onCustomize },
        { label: 'Settings', onSelect: onSettings },
      ],
    },
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        if (!openGroup) onPlay();
      } else if (e.code === 'Escape') {
        setOpenGroup(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onPlay, openGroup]);

  return (
    <div className="screen">
      <h1 className="wordmark">
        Key<span>Strike</span>
      </h1>
      <p className="tagline">Type to the beat. Beat the clock.</p>

      <div className="cap-row">
        {(Object.keys(groups) as Group[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`cap${key === 'play' ? ' cap--primary' : ''}${openGroup === key ? ' cap--open' : ''}`}
            aria-expanded={openGroup === key}
            autoFocus={key === 'play'}
            onClick={() => setOpenGroup((g) => (g === key ? null : key))}
          >
            {groups[key].label} <span className="home__caret" aria-hidden="true">{openGroup === key ? '▴' : '▾'}</span>
          </button>
        ))}
      </div>

      {openGroup && (
        <div className="panel home__flyout" role="menu" aria-label={groups[openGroup].label}>
          {groups[openGroup].items.map((item) => (
            <button key={item.label} type="button" role="menuitem" className="cap home__flyout-item" onClick={item.onSelect}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="panel home__hint">
        <h2 className="home__hint-title">How to play</h2>
        <p>Type each word before its timer runs out — every correct letter locks in, wrong ones are ignored.</p>
        <p>
          <kbd>Esc</kbd> pauses mid-song.
        </p>
      </div>

      <p className="credit">
        <strong>KeyStrike</strong> — by Apurva
      </p>
    </div>
  );
}
