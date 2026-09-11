import { useEffect } from 'react';
import type { EndlessRunResult } from '../../types/game';
import { formatScore } from '../../utils/format';

interface EndlessResultsScreenProps {
  result: EndlessRunResult;
  onRetry: () => void;
  onHome: () => void;
}

export default function EndlessResultsScreen({ result, onRetry, onHome }: EndlessResultsScreenProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') onRetry();
      else if (e.code === 'Escape') onHome();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onRetry, onHome]);

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">Run Over</h1>
      <p className="results__difficulty">{result.difficulty} start</p>
      {result.isNewBest && <p className="results__best">New Best!</p>}

      <div className="panel results__panel">
        <div className="results__stats">
          <div className="results__stat">
            <span className="results__stat-label">Score</span>
            <span className="results__stat-value">{formatScore(result.score)}</span>
          </div>
          <div className="results__stat">
            <span className="results__stat-label">Words Cleared</span>
            <span className="results__stat-value">{result.wordsCleared}</span>
          </div>
          <div className="results__stat">
            <span className="results__stat-label">Max Combo</span>
            <span className="results__stat-value">{result.maxCombo}</span>
          </div>
        </div>
      </div>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" onClick={onRetry} autoFocus>
          Retry
        </button>
        <button type="button" className="cap" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  );
}
