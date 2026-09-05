import { useEffect, useState } from 'react';
import { pickSentences } from '../../data/sentences';
import { songs } from '../../data/songs';
import { RoomClient } from '../../multiplayer/RoomClient';
import { clearPendingSession } from '../../multiplayer/session';
import type { RaceMode, RoomState, Team } from '../../multiplayer/types';
import { DIFFICULTIES, type Difficulty } from '../../types/song';
import Avatar from '../../components/Avatar/Avatar';
import { getWinStreak } from '../../utils/winStreak';
import './RoomScreen.css';

const TEAMS: Team[] = ['A', 'B'];
const SESSION_SENTENCE_COUNT = 4;
const MODES: RaceMode[] = ['song', 'sentence', 'duel'];
const MODE_LABEL: Record<RaceMode, string> = { song: 'Song', sentence: 'Sentence', duel: 'Duel' };

interface RoomScreenProps {
  client: RoomClient;
  initialRoom: RoomState;
  onEnterBattle: (room: RoomState) => void;
  onLeave: () => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

export default function RoomScreen({ client, initialRoom, onEnterBattle, onLeave }: RoomScreenProps) {
  const [room, setRoom] = useState(initialRoom);
  const [copied, setCopied] = useState(false);

  function handleCopyCode() {
    if (!navigator.clipboard) return;
    navigator.clipboard
      .writeText(room.code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  useEffect(() => {
    client.setOnRoomUpdate((next) => {
      setRoom(next);
      if (next.phase === 'countdown' || next.phase === 'battle') onEnterBattle(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const isHost = client.id === room.hostId;
  const me = room.players.find((p) => p.id === client.id);
  const myStreak = me ? getWinStreak(me.nickname) : null;
  const song = songs.find((s) => s.id === room.songId);
  const teamCounts: Record<Team, number> = {
    A: room.players.filter((p) => p.team === 'A').length,
    B: room.players.filter((p) => p.team === 'B').length,
  };
  const teamsReady = !room.teamMode || (teamCounts.A > 0 && teamCounts.B > 0);
  const connectedCount = room.players.filter((p) => p.connected).length;
  const duelFormat: 'ffa' | '2v2' | '1v1' = room.duelFFA ? 'ffa' : room.teamMode ? '2v2' : '1v1';
  const duelFormatLabel = duelFormat === 'ffa' ? 'FFA Duel' : duelFormat === '2v2' ? 'Team Duel' : 'Duel Mode';
  const duelCapLabel = duelFormat === 'ffa' ? '3-4' : duelFormat === '2v2' ? '4' : '2';
  const duelReady =
    room.mode !== 'duel' ||
    (duelFormat === 'ffa' ? connectedCount >= 3 && connectedCount <= 4 : duelFormat === '2v2' ? connectedCount === 4 : connectedCount === 2);

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small room__heading">
        Room {room.code}
        <button type="button" className="room__copy-code" onClick={handleCopyCode}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </h1>
      <p className="tagline">
        Share this code —{' '}
        {room.mode === 'duel'
          ? duelFormat === 'ffa'
            ? `${duelCapLabel} players`
            : `exactly ${duelCapLabel} players`
          : 'up to 4 players'}
        .
      </p>

      <div className="panel room__panel">
        <ul className="room__players">
          {room.players.map((p) => (
            <li key={p.id} className={`room__player${!p.connected ? ' room__player--disconnected' : ''}`}>
              <Avatar index={p.avatarIndex} size={32} />
              <span className="room__player-name">
                {p.nickname}
                {p.id === room.hostId ? ' (host)' : ''}
              </span>
              {p.id === client.id && myStreak && myStreak.current >= 2 && (
                <span className="room__player-streak">{myStreak.current}-win streak</span>
              )}
              {room.teamMode && p.team && <span className="room__player-team">Team {p.team}</span>}
              <span className={`room__player-ready${p.ready ? ' room__player-ready--yes' : ''}`}>
                {p.id === room.hostId ? '' : p.ready ? 'Ready' : 'Not ready'}
              </span>
            </li>
          ))}
        </ul>

        {isHost && (
          <div className="difficulty-picker room__mode-picker" role="radiogroup" aria-label="Race mode">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={room.mode === m}
                className={`difficulty-picker__option${room.mode === m ? ' difficulty-picker__option--active' : ''}`}
                onClick={() => client.selectMode(m)}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        )}
        {isHost && (
          <div className="room__mode-toggles">
            <button
              type="button"
              className={`room__team-mode-toggle${room.teamMode ? ' room__team-mode-toggle--active' : ''}`}
              onClick={() => client.toggleTeamMode()}
            >
              {room.mode === 'duel' ? 'Team Duel (2v2)' : 'Team Mode'}: {room.teamMode ? 'On' : 'Off'}
            </button>
            {room.mode === 'duel' && (
              <button
                type="button"
                className={`room__team-mode-toggle${room.duelFFA ? ' room__team-mode-toggle--active' : ''}`}
                onClick={() => client.toggleDuelFFA()}
              >
                FFA Duel (3-4): {room.duelFFA ? 'On' : 'Off'}
              </button>
            )}
            {room.mode === 'song' && (
              <button
                type="button"
                className={`room__team-mode-toggle${room.suddenDeath ? ' room__team-mode-toggle--active' : ''}`}
                onClick={() => client.toggleSuddenDeath()}
              >
                Sudden Death: {room.suddenDeath ? 'On' : 'Off'}
              </button>
            )}
          </div>
        )}
        {room.mode === 'song' && room.suddenDeath && (
          <p className="room__hint">One miss and you&rsquo;re out — spectate the rest of the race.</p>
        )}
        {room.mode === 'duel' && (
          <p className="room__hint">
            {duelReady
              ? duelFormat === 'ffa'
                ? `${duelFormatLabel} — last fighter standing wins the round.`
                : `${duelFormatLabel} — first side to fully strike the other down wins.`
              : duelFormat === 'ffa'
                ? `${duelFormatLabel} needs ${duelCapLabel} players to start.`
                : `${duelFormatLabel} needs exactly ${duelCapLabel} players to start.`}
          </p>
        )}

        {room.teamMode && (
          <div className="room__team-picker" role="radiogroup" aria-label="Your team">
            {TEAMS.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={me?.team === t}
                className={`difficulty-picker__option${me?.team === t ? ' difficulty-picker__option--active' : ''}`}
                disabled={me?.team !== t && teamCounts[t] >= 2}
                onClick={() => client.selectTeam(me?.team === t ? null : t)}
              >
                Team {t} ({teamCounts[t]}/2)
              </button>
            ))}
          </div>
        )}

        {isHost ? (
          room.mode === 'sentence' ? (
            <div className="room__song-picker">
              <div className="difficulty-picker" role="radiogroup" aria-label="Difficulty">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={room.difficulty === d}
                    className={`difficulty-picker__option${room.difficulty === d ? ' difficulty-picker__option--active' : ''}`}
                    onClick={() => client.selectDifficulty(d)}
                  >
                    {DIFFICULTY_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="room__song-picker">
              <label className="room__field">
                <span className="room__field-label">Song</span>
                <select
                  className="room__select"
                  value={room.songId ?? ''}
                  onChange={(e) => client.selectSong(e.target.value, room.difficulty)}
                >
                  <option value="" disabled>
                    Choose a song…
                  </option>
                  {songs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="difficulty-picker" role="radiogroup" aria-label="Difficulty">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={room.difficulty === d}
                    className={`difficulty-picker__option${room.difficulty === d ? ' difficulty-picker__option--active' : ''}`}
                    onClick={() => client.selectSong(room.songId ?? songs[0].id, d)}
                  >
                    {DIFFICULTY_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <p className="room__song-readout">
            {room.mode === 'sentence'
              ? `Sentence Mode · ${DIFFICULTY_LABEL[room.difficulty]}`
              : song
                ? `${room.mode === 'duel' ? 'Duel · ' : ''}${song.title} · ${DIFFICULTY_LABEL[room.difficulty]}`
                : 'Waiting for the host to pick a song…'}
          </p>
        )}
      </div>

      <div className="cap-row">
        {isHost ? (
          <button
            type="button"
            className="cap cap--primary"
            disabled={(room.mode !== 'sentence' && !room.songId) || !teamsReady || !duelReady}
            onClick={() =>
              client.startBattle(
                room.mode === 'sentence' ? pickSentences(room.difficulty, SESSION_SENTENCE_COUNT).join(' ') : undefined
              )
            }
          >
            Start Race
          </button>
        ) : (
          <button type="button" className="cap cap--primary" onClick={() => client.toggleReady()}>
            {me?.ready ? 'Not Ready' : 'Ready'}
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
