import { useEffect } from 'react';
import { getSongById } from '../../data/songs';
import type { RunResult } from '../../types/game';
import { formatScore } from '../../utils/format';
import './ResultsScreen.css';

interface ResultsScreenProps {
  result: RunResult;
  onRetry: () => void;
  onSongSelect: () => void;
  onHome: () => void;
}

export default function ResultsScreen({ result, onRetry, onSongSelect, onHome }: ResultsScreenProps) {
  const song = getSongById(result.songId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') onRetry();
      else if (e.code === 'Escape') onSongSelect();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onRetry, onSongSelect]);

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">{song?.title ?? 'Results'}</h1>
      <p className="results__difficulty">{result.difficulty}</p>
      {result.isNewBest && <p className="results__best">New Best!</p>}

      <div className="panel results__panel">
        <div className="results__grade">{result.grade}</div>
        <div className="results__stats">
          <div className="results__stat">
            <span className="results__stat-label">Score</span>
            <span className="results__stat-value">{formatScore(result.score)}</span>
          </div>
          <div className="results__stat">
            <span className="results__stat-label">Accuracy</span>
            <span className="results__stat-value">{result.accuracy.toFixed(1)}%</span>
          </div>
          <div className="results__stat">
            <span className="results__stat-label">Max Combo</span>
            <span className="results__stat-value">{result.maxCombo}</span>
          </div>
        </div>
        <div className="results__counts">
          <span className="results__count results__count--perfect">{result.counts.perfect} Perfect</span>
          <span className="results__count results__count--good">{result.counts.good} Good</span>
          <span className="results__count results__count--miss">{result.counts.miss} Miss</span>
        </div>
      </div>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" onClick={onRetry} autoFocus>
          Retry
        </button>
        <button type="button" className="cap" onClick={onSongSelect}>
          Song Select
        </button>
        <button type="button" className="cap" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  );
}
