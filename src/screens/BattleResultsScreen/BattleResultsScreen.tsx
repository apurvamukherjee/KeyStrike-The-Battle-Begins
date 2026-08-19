import { RoomClient } from '../../multiplayer/RoomClient';
import { clearPendingSession } from '../../multiplayer/session';
import type { RoomPlayer, RoomState, Team } from '../../multiplayer/types';
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
const TEAMS: Team[] = ['A', 'B'];

function scoreOf(p: RoomPlayer) {
  return p.result?.score ?? p.progress?.score ?? 0;
}

function PlayerRow({ p, isYou }: { p: RoomPlayer; isYou: boolean }) {
  const accuracy = p.result?.accuracy ?? p.progress?.accuracy ?? 0;
  return (
    <div className="battle-results__row">
      <Avatar index={p.avatarIndex} size={28} />
      <span className="battle-results__name">
        {p.nickname}
        {isYou ? ' (you)' : ''}
      </span>
      <span className="battle-results__score">{formatScore(scoreOf(p))}</span>
      <span className="battle-results__accuracy">{accuracy.toFixed(1)}%</span>
    </div>
  );
}

export default function BattleResultsScreen({ client, room, onRematch, onLeave }: BattleResultsScreenProps) {
  const isHost = client.id === room.hostId;

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">Race Results</h1>

      {room.teamMode ? (
        room.winningTeam && <p className="battle-results__winner">Team {room.winningTeam} wins the race!</p>
      ) : (
        (() => {
          const winner = room.players.find((p) => p.id === room.winnerId);
          return winner && <p className="battle-results__winner">{winner.nickname} wins the race!</p>;
        })()
      )}

      <div className="panel battle-results__panel">
        {room.teamMode
          ? TEAMS.map((team) => {
              const members = [...room.players].filter((p) => p.team === team).sort((a, b) => scoreOf(b) - scoreOf(a));
              return (
                <div
                  key={team}
                  className={`battle-results__team${room.winningTeam === team ? ' battle-results__team--winner' : ''}`}
                >
                  <h2 className="battle-results__team-heading">
                    Team {team}
                    {room.winningTeam === team ? ' — Winner' : ''}
                  </h2>
                  {members.map((p) => (
                    <PlayerRow key={p.id} p={p} isYou={p.id === client.id} />
                  ))}
                </div>
              );
            })
          : [...room.players]
              .sort((a, b) => {
                if (a.id === room.winnerId) return -1;
                if (b.id === room.winnerId) return 1;
                return scoreOf(b) - scoreOf(a);
              })
              .map((p, i) => (
                <div
                  key={p.id}
                  className={`battle-results__row${p.id === room.winnerId ? ' battle-results__row--winner' : ''}`}
                >
                  <span className="battle-results__place">{PLACE_LABEL[i] ?? `${i + 1}th`}</span>
                  <Avatar index={p.avatarIndex} size={28} />
                  <span className="battle-results__name">
                    {p.nickname}
                    {p.id === client.id ? ' (you)' : ''}
                  </span>
                  <span className="battle-results__score">{formatScore(scoreOf(p))}</span>
                  <span className="battle-results__accuracy">
                    {(p.result?.accuracy ?? p.progress?.accuracy ?? 0).toFixed(1)}%
                  </span>
                </div>
              ))}
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
            clearPendingSession();
            onLeave();
          }}
        >
          Leave
        </button>
      </div>
    </div>
  );
}
