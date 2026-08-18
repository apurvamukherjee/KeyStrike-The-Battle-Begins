import { useEffect } from 'react';
import './HomeScreen.css';

interface HomeScreenProps {
  onPlay: () => void;
  onSettings: () => void;
}

export default function HomeScreen({ onPlay, onSettings }: HomeScreenProps) {
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
      <p className="tagline">Type to the beat. Own the highway.</p>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" onClick={onPlay} autoFocus>
          Play
        </button>
        <button type="button" className="cap" onClick={onSettings}>
          Settings
        </button>
      </div>

      <div className="panel home__hint">
        <h2 className="home__hint-title">How to play</h2>
        <p>
          Hit <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> as the notes cross the line.
        </p>
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
