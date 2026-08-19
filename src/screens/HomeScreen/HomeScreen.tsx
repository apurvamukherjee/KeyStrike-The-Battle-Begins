import { useEffect } from 'react';
import './HomeScreen.css';

interface HomeScreenProps {
  onPlay: () => void;
  onSentences: () => void;
  onSettings: () => void;
  onStats: () => void;
  onBattle: () => void;
}

export default function HomeScreen({ onPlay, onSentences, onSettings, onStats, onBattle }: HomeScreenProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') onPlay();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onPlay]);

  return (
    <div className="screen">
      <h1 className="wordmark">
        Key<span>Strike</span>
      </h1>
      <p className="tagline">Type to the beat. Beat the clock.</p>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" onClick={onPlay} autoFocus>
          Play
        </button>
        <button type="button" className="cap" onClick={onSentences}>
          Sentences
        </button>
        <button type="button" className="cap" onClick={onBattle}>
          Battle
        </button>
        <button type="button" className="cap" onClick={onStats}>
          Stats
        </button>
        <button type="button" className="cap" onClick={onSettings}>
          Settings
        </button>
      </div>

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
