const VOLUME_KEY = 'keystrike:volume';
const OFFSET_KEY = 'keystrike:inputOffsetMs';
const GAME_SPEED_KEY = 'keystrike:gameSpeed';
const TEXT_SCALE_KEY = 'keystrike:textScale';
const PALETTE_KEY = 'keystrike:palette';
const REDUCE_MOTION_KEY = 'keystrike:reduceMotion';

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

/** Playback speed for normal play (accessibility) — below 1 gives more time per word. */
export function getGameSpeed(): number {
  return clamp(readNumber(GAME_SPEED_KEY, 1), 0.6, 1);
}

export function setGameSpeed(speed: number) {
  writeNumber(GAME_SPEED_KEY, clamp(speed, 0.6, 1));
}

export function getTextScale(): number {
  return clamp(readNumber(TEXT_SCALE_KEY, 1), 0.8, 1.4);
}

export function setTextScale(scale: number) {
  writeNumber(TEXT_SCALE_KEY, clamp(scale, 0.8, 1.4));
}

export type Palette = 'default' | 'alt';

export function getPalette(): Palette {
  return localStorage.getItem(PALETTE_KEY) === 'alt' ? 'alt' : 'default';
}

export function setPalette(palette: Palette) {
  try {
    localStorage.setItem(PALETTE_KEY, palette);
  } catch {
    /* private mode / quota exceeded — setting just won't persist this session */
  }
}

export function getReduceMotion(): boolean {
  return localStorage.getItem(REDUCE_MOTION_KEY) === '1';
}

export function setReduceMotion(on: boolean) {
  try {
    localStorage.setItem(REDUCE_MOTION_KEY, on ? '1' : '0');
  } catch {
    /* private mode / quota exceeded — setting just won't persist this session */
  }
}

/** Applies palette/reduce-motion/text-scale to the document root — call once at startup and after any change. */
export function applyAppearanceSettings() {
  const root = document.documentElement;
  root.dataset.palette = getPalette();
  root.dataset.reduceMotion = String(getReduceMotion());
  root.style.setProperty('--text-scale', String(getTextScale()));
}
