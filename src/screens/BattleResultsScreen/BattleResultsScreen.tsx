import { useEffect, useState } from 'react';
import { RoomClient } from '../../multiplayer/RoomClient';
import { clearPendingSession } from '../../multiplayer/session';
import type { RoomPlayer, RoomState, Team } from '../../multiplayer/types';
import Avatar from '../../components/Avatar/Avatar';
import DuelResultsScreen from '../DuelResultsScreen/DuelResultsScreen';
import { songs } from '../../data/songs';
import { formatScore } from '../../utils/format';
import { recordBattleOutcome, type StreakRecord } from '../../utils/winStreak';
import './BattleResultsScreen.css';

interface BattleResultsScreenProps {
  client: RoomClient;
  room: RoomState;
  onRematch: () => void;
  /** Duel Mode's "Next Round" lands here directly (skipping the lobby) once the room comes back to countdown/battle — mirrors RoomScreen's own onRoomUpdate watch, since this screen replaces BattleScreen (and its listener) the moment results appear. */
  onEnterBattle: (room: RoomState) => void;
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
      {p.eliminated && <span className="battle-results__eliminated-tag">Eliminated</span>}
      <span className="battle-results__score">{formatScore(scoreOf(p))}</span>
      <span className="battle-results__accuracy">{accuracy.toFixed(1)}%</span>
    </div>
  );
}

export default function BattleResultsScreen({ client, room, onRematch, onEnterBattle, onLeave }: BattleResultsScreenProps) {
  const isHost = client.id === room.hostId;
  const [streak, setStreak] = useState<StreakRecord | null>(null);

  // Recorded once per race conclusion — this screen is freshly mounted each
  // time a race ends, so an empty dep array is exactly "once per result."
  useEffect(() => {
    const me = room.players.find((p) => p.id === client.id);
    if (!me) return;
    const won = room.teamMode
      ? room.winningTeam !== null && me.team === room.winningTeam
      : room.mode === 'duel'
        ? me.clientId === room.winnerId
        : me.id === room.winnerId;
    setStreak(recordBattleOutcome(me.nickname, won));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Duel Mode's "Next Round" advances the room straight from here (no lobby
  // stop) — BattleScreen's own onRoomUpdate listener is gone the moment this
  // screen mounted, so this is the one still watching for the room coming
  // back to countdown/battle to hand the app back into a live duel.
  useEffect(() => {
    client.setOnRoomUpdate((next) => {
      if (next.phase === 'countdown' || next.phase === 'battle') onEnterBattle(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  if (room.mode === 'duel') {
    const zeroStats = { score: 0, accuracy: 0, maxCombo: 0 };
    const winsNeeded = Math.ceil((room.duelBestOf ?? 3) / 2);
    const nextRoundHandlers = {
      onNextRound:
        isHost && !room.duelMatchOver
          ? () => client.nextRound(songs[Math.floor(Math.random() * songs.length)].id)
          : undefined,
      onRematch: isHost && room.duelMatchOver ? onRematch : undefined,
      onLeave: () => {
        client.leaveRoom();
        client.destroy();
        clearPendingSession();
        onLeave();
      },
    };

    if (room.teamMode) {
      const myTeam = room.players.find((p) => p.id === client.id)?.team ?? null;
      if (!myTeam) return null;
      const otherTeam: Team = myTeam === 'A' ? 'B' : 'A';
      const mine = room.players.filter((p) => p.team === myTeam);
      const theirs = room.players.filter((p) => p.team === otherTeam);
      // A side's combined stats: total score/max-of-max-combo across both
      // teammates, average accuracy — same "sum the side" spirit as the
      // server's teamProgressTotals, just for the results screen's tiles.
      const combine = (members: RoomPlayer[]) => {
        const results = members.map((p) => p.result ?? zeroStats);
        if (results.length === 0) return zeroStats;
        return {
          score: results.reduce((sum, r) => sum + r.score, 0),
          maxCombo: Math.max(...results.map((r) => r.maxCombo)),
          accuracy: results.reduce((sum, r) => sum + r.accuracy, 0) / results.length,
        };
      };
      return (
        <DuelResultsScreen
          won={room.winningTeam === myTeam}
          youNickname={mine.map((p) => p.nickname).join(' & ') || 'Your Team'}
          youAvatarIndex={mine[0]?.avatarIndex ?? 0}
          opponentNickname={theirs.map((p) => p.nickname).join(' & ') || 'Rival Team'}
          opponentAvatarIndex={theirs[0]?.avatarIndex ?? 0}
          youStats={combine(mine)}
          opponentStats={combine(theirs)}
          matchScore={{ you: room.duelWins[myTeam] ?? 0, opponent: room.duelWins[otherTeam] ?? 0 }}
          winsNeeded={winsNeeded}
          matchOver={room.duelMatchOver}
          {...nextRoundHandlers}
        />
      );
    }

    if (room.duelFFA) {
      const me = room.players.find((p) => p.id === client.id);
      if (!me) return null;
      const iWon = me.clientId === room.winnerId;
      const others = room.players.filter((p) => p.id !== client.id);
      // DuelResultsScreen is built for a you-vs-one shape — FFA's 3-4-way
      // result compresses onto that same card as "you vs the winner," or (if
      // you won) "you vs your closest rival by remaining hp."
      const rival = iWon
        ? others.reduce<RoomPlayer | undefined>((best, p) => (!best || p.hp > best.hp ? p : best), undefined)
        : room.players.find((p) => p.clientId === room.winnerId);
      if (!rival) return null;
      return (
        <DuelResultsScreen
          won={iWon}
          youNickname={me.nickname}
          youAvatarIndex={me.avatarIndex}
          opponentNickname={rival.nickname}
          opponentAvatarIndex={rival.avatarIndex}
          youStats={me.result ?? zeroStats}
          opponentStats={rival.result ?? zeroStats}
          matchScore={{ you: room.duelWins[me.clientId] ?? 0, opponent: room.duelWins[rival.clientId] ?? 0 }}
          winsNeeded={winsNeeded}
          matchOver={room.duelMatchOver}
          {...nextRoundHandlers}
        />
      );
    }

    const me = room.players.find((p) => p.id === client.id);
    const opponent = room.players.find((p) => p.id !== client.id);
    if (!me || !opponent) return null;
    return (
      <DuelResultsScreen
        won={me.clientId === room.winnerId}
        youNickname={me.nickname}
        youAvatarIndex={me.avatarIndex}
        opponentNickname={opponent.nickname}
        opponentAvatarIndex={opponent.avatarIndex}
        youStats={me.result ?? zeroStats}
        opponentStats={opponent.result ?? zeroStats}
        matchScore={{ you: room.duelWins[me.clientId] ?? 0, opponent: room.duelWins[opponent.clientId] ?? 0 }}
        winsNeeded={winsNeeded}
        matchOver={room.duelMatchOver}
        {...nextRoundHandlers}
      />
    );
  }

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

      {streak && streak.current >= 2 && (
        <p className="battle-results__streak">{streak.current}-win streak</p>
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
                  {p.eliminated && <span className="battle-results__eliminated-tag">Eliminated</span>}
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
