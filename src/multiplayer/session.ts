const SESSION_KEY = 'keystrike:pendingRoom';

export interface PendingSession {
  clientId: string;
  code: string;
  nickname: string;
}

export function getOrCreateClientId(): string {
  const existing = loadPendingSession();
  if (existing) return existing.clientId;
  return crypto.randomUUID();
}

export function savePendingSession(session: PendingSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* private mode / quota exceeded — rejoin-after-refresh just won't work this session */
  }
}

export function loadPendingSession(): PendingSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.clientId === 'string' && typeof parsed?.code === 'string' && typeof parsed?.nickname === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPendingSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode / quota exceeded */
  }
}
