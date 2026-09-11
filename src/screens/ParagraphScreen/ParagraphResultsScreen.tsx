import { useEffect } from 'react';
import type { ParagraphRunResult } from '../../types/game';
import { formatScore } from '../../utils/format';

interface ParagraphResultsScreenProps {
  result: ParagraphRunResult;
  onRetry: () => void;
  onHome: () => void;
}

export default function ParagraphResultsScreen({ result, onRetry, onHome }: ParagraphResultsScreenProps) {
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
      <h1 className="wordmark wordmark--small">Paragraph Complete</h1>
      <p className="results__difficulty">{result.difficulty}</p>
      {result.isNewBest && <p className="results__best">New Best!</p>}

      <div className="panel results__panel">
        <div className="results__grade">{result.grade}</div>
        <div className="results__stats">
          <div className="results__stat">
            <span className="results__stat-label">WPM</span>
            <span className="results__stat-value">{Math.round(result.wpm)}</span>
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
          <span className="results__count results__count--good">{result.charactersTyped} typed</span>
          <span className="results__count results__count--miss">{result.errors} errors</span>
          <span className="results__count results__count--perfect">{formatScore(result.score)} score</span>
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
