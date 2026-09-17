import { createJsonStore } from '../utils/jsonStore';

export interface PendingSession {
  clientId: string;
  code: string;
  nickname: string;
}

const store = createJsonStore<Partial<PendingSession>>('keystrike:pendingRoom', () => ({}), { storage: 'session' });

export function getOrCreateClientId(): string {
  const existing = loadPendingSession();
  if (existing) return existing.clientId;
  return crypto.randomUUID();
}

export function savePendingSession(session: PendingSession) {
  store.write(session);
}

/** Validates shape — sessionStorage can be edited by hand, so a malformed value must not be trusted as a real session. */
export function loadPendingSession(): PendingSession | null {
  const parsed: Partial<PendingSession> | null = store.read();
  if (
    parsed !== null &&
    typeof parsed.clientId === 'string' &&
    typeof parsed.code === 'string' &&
    typeof parsed.nickname === 'string'
  ) {
    return parsed as PendingSession;
  }
  return null;
}

export function clearPendingSession() {
  store.clear();
}
