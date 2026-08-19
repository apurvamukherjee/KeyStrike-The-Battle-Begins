import Avatar from '../Avatar/Avatar';
import './RaceTrack.css';

export interface RacerMember {
  nickname: string;
  avatarIndex: number;
  isYou: boolean;
}

export interface Racer {
  id: string;
  nickname: string;
  avatarIndex: number;
  carProgress: number;
  isYou: boolean;
  finished: boolean;
  connected: boolean;
  /** Present for a team-mode lane: renders stacked avatars for both teammates instead of one. */
  members?: RacerMember[];
}

interface RaceTrackProps {
  racers: Racer[];
}

function CarIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 18" className="race-track__car-icon" aria-hidden="true">
      <path d="M2 13 L5 6 Q7 3 11 3 H21 Q25 3 27 6 L30 13 Z" fill={color} stroke="#0a0a0c" strokeWidth="0.6" />
      <rect x="9" y="5" width="14" height="5" rx="1.5" fill="#0a0a0c" opacity="0.55" />
      <circle cx="9" cy="14" r="3" fill="#151316" stroke="#3a3640" strokeWidth="0.8" />
      <circle cx="23" cy="14" r="3" fill="#151316" stroke="#3a3640" strokeWidth="0.8" />
    </svg>
  );
}

const CAR_COLORS = ['#e0263f', '#3fa7e0', '#f5a623', '#7fe07f'];

export default function RaceTrack({ racers }: RaceTrackProps) {
  return (
    <div className="race-track">
      {racers.map((r, i) => (
        <div
          key={r.id}
          className={`race-track__lane${r.isYou ? ' race-track__lane--you' : ''}${!r.connected ? ' race-track__lane--disconnected' : ''}`}
        >
          <span className="race-track__label">
            {r.members ? (
              r.members.map((m, mi) => (
                <span key={mi} className="race-track__member">
                  <Avatar index={m.avatarIndex} size={18} />
                  {m.nickname}
                  {m.isYou ? ' (you)' : ''}
                </span>
              ))
            ) : (
              <>
                <Avatar index={r.avatarIndex} size={18} />
                {r.nickname}
                {r.isYou ? ' (you)' : ''}
              </>
            )}
          </span>
          <div className="race-track__road">
            <div className="race-track__finish" aria-hidden="true" />
            <div
              className={`race-track__car${r.finished ? ' race-track__car--finished' : ''}`}
              style={{ left: `${Math.min(100, Math.max(0, r.carProgress * 100))}%` }}
            >
              <CarIcon color={CAR_COLORS[i % CAR_COLORS.length]} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
