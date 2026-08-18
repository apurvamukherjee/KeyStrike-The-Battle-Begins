const VOLUME_KEY = 'keystrike:volume';
const OFFSET_KEY = 'keystrike:inputOffsetMs';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  const n = raw !== null ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* private mode / quota exceeded — setting just won't persist this session */
  }
}

export function getVolume(): number {
  return clamp(readNumber(VOLUME_KEY, 0.8), 0, 1);
}

export function setVolume(volume: number) {
  writeNumber(VOLUME_KEY, clamp(volume, 0, 1));
}

/** Shifts when a keypress is judged relative to the audio clock, to compensate for output latency. */
export function getInputOffsetMs(): number {
  return clamp(readNumber(OFFSET_KEY, 0), -150, 150);
}

export function setInputOffsetMs(ms: number) {
  writeNumber(OFFSET_KEY, clamp(ms, -150, 150));
}
