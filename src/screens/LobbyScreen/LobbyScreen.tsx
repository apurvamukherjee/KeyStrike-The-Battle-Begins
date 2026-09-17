import { useState } from 'react';
import { BATTLE_SERVER_UNCONFIGURED, RoomClient } from '../../multiplayer/RoomClient';
import { getOrCreateClientId, savePendingSession } from '../../multiplayer/session';
import type { RoomState } from '../../multiplayer/types';
import { sanitizeNickname } from '../../utils/nickname';
import { getProfile } from '../../utils/profile';
import './LobbyScreen.css';

interface LobbyScreenProps {
  /** Set when arriving via "Duel a friend online" — a created room auto-selects Duel mode instead of the default racing one. */
  presetMode?: 'duel';
  onEnterRoom: (client: RoomClient, room: RoomState) => void;
  onBack: () => void;
}

export default function LobbyScreen({ presetMode, onEnterRoom, onBack }: LobbyScreenProps) {
  const [nickname, setNickname] = useState(() => getProfile().name);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  // Without a relay there is nothing to connect to, so the buttons would only
  // hang until the socket timed out.
  const offline = BATTLE_SERVER_UNCONFIGURED;

  async function handleCreate() {
    setError(null);
    setBusy('create');
    const client = new RoomClient(() => {});
    const finalNickname = nickname.trim() || 'Player';
    const clientId = getOrCreateClientId();
    const ack = await client.createRoom(finalNickname, clientId);
    setBusy(null);
    if (!ack.ok || !ack.room) {
      setError(ack.error ?? 'Could not create room — is the battle server running?');
      client.destroy();
      return;
    }
    if (presetMode === 'duel') client.selectMode('duel');
    savePendingSession({ clientId, code: ack.room.code, nickname: finalNickname });
    onEnterRoom(client, ack.room);
  }

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setError('Enter the 4-character room code.');
      return;
    }
    setError(null);
    setBusy('join');
    const client = new RoomClient(() => {});
    const finalNickname = nickname.trim() || 'Player';
    const clientId = getOrCreateClientId();
    const ack = await client.joinRoom(trimmed, finalNickname, clientId);
    setBusy(null);
    if (!ack.ok || !ack.room) {
      setError(ack.error ?? 'Could not join room');
      client.destroy();
      return;
    }
    savePendingSession({ clientId, code: ack.room.code, nickname: finalNickname });
    onEnterRoom(client, ack.room);
  }

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">{presetMode === 'duel' ? 'Duel a Friend' : 'Battle'}</h1>
      <p className="tagline">
        {presetMode === 'duel'
          ? 'Create a room and it starts in Duel mode — no login, just a name and a room code.'
          : 'Up to 4 players. No login — just a name and a room code.'}
      </p>

      <div className="panel lobby__panel">
        <label className="lobby__field">
          <span className="lobby__label">Your name</span>
          <input
            className="lobby__input"
            type="text"
            maxLength={16}
            value={nickname}
            onChange={(e) => setNickname(sanitizeNickname(e.target.value))}
            placeholder="Racer"
          />
        </label>

        <button type="button" className="cap cap--primary lobby__wide" onClick={handleCreate} disabled={busy !== null || offline}>
          {busy === 'create' ? 'Creating…' : 'Create Room'}
        </button>

        <div className="lobby__divider">or</div>

        <label className="lobby__field">
          <span className="lobby__label">Room code</span>
          <input
            className="lobby__input lobby__input--code"
            type="text"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
          />
        </label>
        <button type="button" className="cap lobby__wide" onClick={handleJoin} disabled={busy !== null || offline}>
          {busy === 'join' ? 'Joining…' : 'Join Room'}
        </button>

        {BATTLE_SERVER_UNCONFIGURED && (
          <p className="lobby__error">
            Online play isn’t available on this build — no battle server was configured. Every other mode works
            offline.
          </p>
        )}
        {error && <p className="lobby__error">{error}</p>}
      </div>

      <div className="cap-row">
        <button type="button" className="cap" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
