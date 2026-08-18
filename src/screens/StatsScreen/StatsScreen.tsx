import { getStats } from '../../utils/stats';
import { formatScore } from '../../utils/format';
import './StatsScreen.css';

interface StatsScreenProps {
  onBack: () => void;
}

export default function StatsScreen({ onBack }: StatsScreenProps) {
  const stats = getStats();
  const accuracy =
    stats.totalWordsTyped + stats.totalMiss > 0
      ? ((stats.totalPerfect + stats.totalGood * 0.5) / (stats.totalPerfect + stats.totalGood + stats.totalMiss)) *
        100
      : 100;

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">Stats</h1>

      <div className="panel stats__panel">
        <div className="stats__grid">
          <div className="stats__stat">
            <span className="stats__label">Plays</span>
            <span className="stats__value">{stats.totalPlays}</span>
          </div>
          <div className="stats__stat">
            <span className="stats__label">Words Typed</span>
            <span className="stats__value">{stats.totalWordsTyped}</span>
          </div>
          <div className="stats__stat">
            <span className="stats__label">Best Combo</span>
            <span className="stats__value">{stats.bestComboEver}</span>
          </div>
          <div className="stats__stat">
            <span className="stats__label">Total Score</span>
            <span className="stats__value">{formatScore(stats.totalScoreEver)}</span>
          </div>
          <div className="stats__stat">
            <span className="stats__label">Lifetime Accuracy</span>
            <span className="stats__value">{accuracy.toFixed(1)}%</span>
          </div>
          <div className="stats__stat">
            <span className="stats__label">Longest Word Cleared</span>
            <span className="stats__value stats__value--word">{stats.longestWordCleared || '—'}</span>
          </div>
        </div>

        <div className="stats__counts">
          <span className="stats__count stats__count--perfect">{stats.totalPerfect} Perfect</span>
          <span className="stats__count stats__count--good">{stats.totalGood} Good</span>
          <span className="stats__count stats__count--miss">{stats.totalMiss} Miss</span>
        </div>
      </div>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
