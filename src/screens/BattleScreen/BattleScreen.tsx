import { useEffect, useState } from 'react';
import { RoomClient } from '../../multiplayer/RoomClient';
import type { RoomPlayer, RoomState } from '../../multiplayer/types';
import type { Racer } from '../../components/RaceTrack/RaceTrack';
import SentenceBattleStage from './SentenceBattleStage';
import WordBattleStage from './WordBattleStage';
import './BattleScreen.css';

interface BattleScreenProps {
  client: RoomClient;
  initialRoom: RoomState;
  onResults: (room: RoomState) => void;
  onLeave: () => void;
}

export default function BattleScreen({ client, initialRoom, onResults, onLeave }: BattleScreenProps) {
  const [room, setRoom] = useState(initialRoom);
  const [carProgress, setCarProgress] = useState(0);
  const [countdown, setCountdown] = useState<number | 'go' | null>(null);
  const [eliminated, setEliminated] = useState(false);

  useEffect(() => {
    client.setOnRoomUpdate((next) => {
      setRoom(next);
      if (next.phase === 'results') onResults(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  useEffect(() => {
    const startAtMs = room.startAtMs;
    if (!startAtMs) {
      setCountdown(null);
      return;
    }
    let raf = 0;
    let goTimeout: number;
    function tick() {
      const secLeft = Math.ceil((startAtMs! - Date.now()) / 1000);
      if (secLeft > 0) {
        setCountdown(secLeft);
        raf = requestAnimationFrame(tick);
      } else {
        setCountdown('go');
        goTimeout = window.setTimeout(() => setCountdown(null), 700);
      }
    }
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(goTimeout);
    };
  }, [room.startAtMs]);

  function playerProgress(p: RoomPlayer) {
    return p.id === client.id ? carProgress : (p.progress?.carProgress ?? 0);
  }

  function playerEliminated(p: RoomPlayer) {
    return p.id === client.id ? eliminated : p.eliminated;
  }

  const racers: Racer[] = room.teamMode
    ? (['A', 'B'] as const).map((team) => {
        const members = room.players.filter((p) => p.team === team);
        return {
          id: `team-${team}`,
          nickname: `Team ${team}`,
          avatarIndex: members[0]?.avatarIndex ?? 0,
          carProgress: Math.min(1, members.reduce((sum, p) => sum + playerProgress(p), 0)),
          isYou: members.some((p) => p.id === client.id),
          finished: room.winningTeam === team,
          connected: members.some((p) => p.connected),
          eliminated: members.length > 0 && members.every((p) => playerEliminated(p)),
          members: members.map((p) => ({ nickname: p.nickname, avatarIndex: p.avatarIndex, isYou: p.id === client.id })),
        };
      })
    : room.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatarIndex: p.avatarIndex,
        carProgress: playerProgress(p),
        isYou: p.id === client.id,
        finished: p.finished,
        connected: p.connected,
        eliminated: playerEliminated(p),
      }));

  return (
    <div className="screen gameplay-screen battle-screen">
      {room.mode === 'sentence' ? (
        <SentenceBattleStage
          client={client}
          room={room}
          racers={racers}
          onCarProgress={setCarProgress}
          onEliminated={() => setEliminated(true)}
          onLeave={onLeave}
        />
      ) : (
        <WordBattleStage
          client={client}
          room={room}
          racers={racers}
          onCarProgress={setCarProgress}
          onEliminated={() => setEliminated(true)}
          onLeave={onLeave}
        />
      )}

      {countdown !== null && (
        <div key={countdown} className={`battle-countdown${countdown === 'go' ? ' battle-countdown--go' : ''}`}>
          {countdown === 'go' ? 'GO' : countdown}
        </div>
      )}
    </div>
  );
}
