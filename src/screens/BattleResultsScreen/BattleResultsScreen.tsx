import { RoomClient } from '../../multiplayer/RoomClient';
import type { RoomState } from '../../multiplayer/types';
import Avatar from '../../components/Avatar/Avatar';
import { formatScore } from '../../utils/format';
import './BattleResultsScreen.css';

interface BattleResultsScreenProps {
  client: RoomClient;
  room: RoomState;
  onRematch: () => void;
  onLeave: () => void;
}

const PLACE_LABEL = ['1st', '2nd', '3rd', '4th'];

export default function BattleResultsScreen({ client, room, onRematch, onLeave }: BattleResultsScreenProps) {
  const ranked = [...room.players].sort((a, b) => {
    if (a.id === room.winnerId) return -1;
    if (b.id === room.winnerId) return 1;
    const aScore = a.result?.score ?? a.progress?.score ?? 0;
    const bScore = b.result?.score ?? b.progress?.score ?? 0;
    return bScore - aScore;
  });

  const winner = room.players.find((p) => p.id === room.winnerId);
  const isHost = client.id === room.hostId;

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">Race Results</h1>
      {winner && <p className="battle-results__winner">{winner.nickname} wins the race!</p>}

      <div className="panel battle-results__panel">
        {ranked.map((p, i) => {
          const score = p.result?.score ?? p.progress?.score ?? 0;
          const accuracy = p.result?.accuracy ?? p.progress?.accuracy ?? 0;
          return (
            <div key={p.id} className={`battle-results__row${p.id === room.winnerId ? ' battle-results__row--winner' : ''}`}>
              <span className="battle-results__place">{PLACE_LABEL[i] ?? `${i + 1}th`}</span>
              <Avatar index={p.avatarIndex} size={28} />
              <span className="battle-results__name">
                {p.nickname}
                {p.id === client.id ? ' (you)' : ''}
              </span>
              <span className="battle-results__score">{formatScore(score)}</span>
              <span className="battle-results__accuracy">{accuracy.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <div className="cap-row">
        {isHost && (
          <button type="button" className="cap cap--primary" onClick={onRematch}>
            Rematch
          </button>
        )}
        <button
          type="button"
          className="cap"
          onClick={() => {
            client.leaveRoom();
            client.destroy();
            onLeave();
          }}
        >
          Leave
        </button>
      </div>
    </div>
  );
}
