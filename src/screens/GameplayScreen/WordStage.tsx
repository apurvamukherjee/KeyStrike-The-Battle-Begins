import './WordStage.css';

interface WordStageProps {
  word: string;
  typed: number;
  /** 0-1, how much of this word's time budget is left; can go negative-ish (clamped) once overtime */
  fractionRemaining: number;
  overtime: boolean;
  upcoming: string[];
}

export default function WordStage({ word, typed, fractionRemaining, overtime, upcoming }: WordStageProps) {
  return (
    <div className={`word-stage${overtime ? ' word-stage--overtime' : ''}`}>
      <div className="word-stage__active" aria-live="off">
        {word.split('').map((ch, i) => (
          <span
            key={i}
            className={
              'word-stage__letter' +
              (i < typed ? ' word-stage__letter--done' : '') +
              (i === typed ? ' word-stage__letter--next' : '')
            }
          >
            {ch}
          </span>
        ))}
      </div>

      <div className="word-stage__bar">
        <div
          className={`word-stage__bar-fill${fractionRemaining < 0.25 ? ' word-stage__bar-fill--urgent' : ''}`}
          style={{ width: `${Math.max(0, Math.min(1, fractionRemaining)) * 100}%` }}
        />
      </div>

      <div className="word-stage__queue">
        {upcoming.map((w, i) => (
          <span key={i} className="word-stage__queue-word">
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}
