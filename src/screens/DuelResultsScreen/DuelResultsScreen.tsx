import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Swordsman from '../../components/Swordsman/Swordsman';
import { prefersReducedMotion } from '../../utils/motion';
import { formatScore } from '../../utils/format';
import './DuelResultsScreen.css';

interface DuelStats {
  score: number;
  accuracy: number;
  maxCombo: number;
}

interface MatchScore {
  you: number;
  opponent: number;
}

interface DuelResultsScreenProps {
  won: boolean;
  youNickname: string;
  youAvatarIndex: number;
  opponentNickname: string;
  opponentAvatarIndex: number;
  youStats: DuelStats;
  /** Omitted for a CPU opponent — a simulated fighter has no score of its own worth showing. */
  opponentStats?: DuelStats;
  /** Round wins so far this best-of-N match — omit entirely for a single, non-match duel. */
  matchScore?: MatchScore;
  /** Wins needed to take the whole match — only meaningful alongside matchScore. */
  winsNeeded?: number;
  /** True once the match itself (not just this round) is decided. */
  matchOver?: boolean;
  /** Present only when the match isn't over yet and this viewer can advance it (mid-match). */
  onNextRound?: () => void;
  /** Omitted in multiplayer for a non-host — only the host can actually restart a shared room, mirroring BattleResultsScreen. Also used to start a fresh match once matchOver. */
  onRematch?: () => void;
  /** Overrides the "Rematch" button's text without changing its wiring — e.g. Story Mode shows "Next Level" here on a win. */
  rematchLabel?: string;
  onLeave: () => void;
  leaveLabel?: string;
}

export default function DuelResultsScreen({
  won,
  youNickname,
  youAvatarIndex,
  opponentNickname,
  opponentAvatarIndex,
  youStats,
  opponentStats,
  matchScore,
  winsNeeded,
  matchOver,
  onNextRound,
  onRematch,
  rematchLabel,
  onLeave,
  leaveLabel,
}: DuelResultsScreenProps) {
  const stampRef = useRef<HTMLDivElement>(null);
  const youBodyRef = useRef<SVGSVGElement>(null);
  const opponentBodyRef = useRef<SVGSVGElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = prefersReducedMotion();
      const t = reduce ? 0.01 : 1;
      const winnerBody = won ? youBodyRef.current : opponentBodyRef.current;
      const loserBody = won ? opponentBodyRef.current : youBodyRef.current;

      if (stampRef.current) {
        gsap.fromTo(
          stampRef.current,
          { scale: 3, opacity: 0, rotate: -8 },
          { scale: 1, opacity: 1, rotate: 0, duration: 0.5 * t, ease: 'back.out(2.2)' }
        );
      }
      if (winnerBody) {
        gsap.fromTo(winnerBody, { y: 14 }, { y: -6, duration: 0.7 * t, delay: 0.15 * t, ease: 'power2.out' });
      }
      if (loserBody) {
        gsap.to(loserBody, {
          rotation: -12,
          y: 10,
          opacity: 0.6,
          transformOrigin: '50% 100%',
          duration: 0.7 * t,
          delay: 0.15 * t,
          ease: 'power2.in',
        });
      }
    },
    { scope: scopeRef }
  );

  return (
    <div className="screen duel-results" ref={scopeRef}>
      <div className="duel-results__stage">
        <div ref={stampRef} className={`duel-results__stamp${won ? ' duel-results__stamp--victor' : ' duel-results__stamp--defeat'}`}>
          {won ? '勝' : '敗'}
        </div>

        <div className="duel-results__portraits">
          <div className="duel-results__portrait">
            <Swordsman index={youAvatarIndex} bodyRef={youBodyRef} />
            <span className="duel-results__portrait-name">{youNickname}</span>
          </div>
          <div className="duel-results__portrait">
            <Swordsman index={opponentAvatarIndex} bodyRef={opponentBodyRef} />
            <span className="duel-results__portrait-name">{opponentNickname}</span>
          </div>
        </div>
      </div>

      <h1 className={`wordmark wordmark--small duel-results__banner${won ? ' duel-results__banner--victor' : ''}`}>
        {won ? 'Victory' : 'Defeat'}
      </h1>
      <p className="tagline">
        {won ? `You struck down ${opponentNickname}.` : `${opponentNickname} proved too fast this time.`}
      </p>

      {matchScore && (
        <p className="duel-results__match-score">
          {matchOver ? 'Match won' : 'Match'}: You {matchScore.you} – {matchScore.opponent} {opponentNickname}
          {winsNeeded ? ` (first to ${winsNeeded})` : ''}
        </p>
      )}

      <div className="panel results__panel">
        <div className="results__stats">
          <div className="results__stat">
            <span className="results__stat-label">Score</span>
            <span className="results__stat-value">{formatScore(youStats.score)}</span>
          </div>
          <div className="results__stat">
            <span className="results__stat-label">Accuracy</span>
            <span className="results__stat-value">{youStats.accuracy.toFixed(1)}%</span>
          </div>
          <div className="results__stat">
            <span className="results__stat-label">Max Combo</span>
            <span className="results__stat-value">{youStats.maxCombo}</span>
          </div>
        </div>

        {opponentStats && (
          <div className="duel-results__opponent-stats">
            <span className="duel-results__opponent-label">{opponentNickname}</span>
            <span>
              {formatScore(opponentStats.score)} · {opponentStats.accuracy.toFixed(1)}% · {opponentStats.maxCombo}x combo
            </span>
          </div>
        )}
      </div>

      <div className="cap-row">
        {onNextRound && (
          <button type="button" className="cap cap--primary" onClick={onNextRound}>
            Next Round
          </button>
        )}
        {onRematch && (
          <button type="button" className={onNextRound ? 'cap' : 'cap cap--primary'} onClick={onRematch}>
            {rematchLabel ?? 'Rematch'}
          </button>
        )}
        <button type="button" className={onNextRound || onRematch ? 'cap' : 'cap cap--primary'} onClick={onLeave}>
          {leaveLabel ?? 'Leave'}
        </button>
      </div>
    </div>
  );
}
