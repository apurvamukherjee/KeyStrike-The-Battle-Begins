import type { SongDefinition, SynthNote, Waveform } from '../types/song';

let sharedCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

/** Lazily creates the single shared AudioContext. Call from within a user gesture. */
export function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const length = ctx.sampleRate * 0.5;
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function playTone(
  ctx: AudioContext,
  destination: AudioNode,
  wave: OscillatorType,
  note: SynthNote,
  startAt: number
) {
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.value = note.freq;

  const gain = ctx.createGain();
  const peak = 0.85 * (note.velocity ?? 1);
  const noteStart = startAt + note.time;
  const noteEnd = noteStart + note.duration;
  const attack = Math.min(0.012, note.duration * 0.3);
  const release = Math.min(0.06, note.duration * 0.4);

  gain.gain.setValueAtTime(0, noteStart);
  gain.gain.linearRampToValueAtTime(peak, noteStart + attack);
  gain.gain.setValueAtTime(peak, Math.max(noteStart + attack, noteEnd - release));
  gain.gain.linearRampToValueAtTime(0, noteEnd);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(noteStart);
  osc.stop(noteEnd + 0.02);
}

function playNoiseHit(ctx: AudioContext, destination: AudioNode, note: SynthNote, startAt: number) {
  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6000;

  const gain = ctx.createGain();
  const peak = 0.6 * (note.velocity ?? 1);
  const noteStart = startAt + note.time;
  const noteEnd = noteStart + note.duration;

  gain.gain.setValueAtTime(peak, noteStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(noteStart);
  source.stop(noteEnd + 0.02);
}

function isNoise(wave: Waveform): wave is 'noise' {
  return wave === 'noise';
}

export type ChimeKind = 'key' | 'perfect' | 'good' | 'miss' | 'onbeat';

const CHIME_FREQ: Record<ChimeKind, number> = {
  key: 1200,
  perfect: 880,
  good: 660,
  miss: 220,
  onbeat: 1600,
};

/**
 * An immediate, short reactive sound — keystroke ticks and word judgements —
 * played right now rather than pre-scheduled, since with three differently-
 * timed difficulty charts there's no single fixed timeline left to bake these
 * into ahead of time the way the backing track is.
 */
export function playChime(ctx: AudioContext, destination: AudioNode, kind: ChimeKind) {
  const osc = ctx.createOscillator();
  osc.type = kind === 'miss' ? 'sawtooth' : 'square';
  osc.frequency.value = CHIME_FREQ[kind];

  const gain = ctx.createGain();
  const peak = kind === 'key' ? 0.12 : 0.22;
  const duration = kind === 'key' ? 0.05 : kind === 'miss' ? 0.16 : 0.09;
  const now = ctx.currentTime;

  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/**
 * Schedules every track of a song against the audio clock starting at `startAt`
 * (in ctx.currentTime terms) through `masterGain`. Callers stop the whole song by
 * disconnecting `masterGain` — the still-running oscillators then have nowhere to
 * output to, and are GC'd once their scheduled stop() elapses.
 */
export function scheduleSong(ctx: AudioContext, song: SongDefinition, startAt: number, masterGain: GainNode) {
  for (const track of song.tracks) {
    const trackGain = ctx.createGain();
    trackGain.gain.value = track.gain ?? 0.2;
    trackGain.connect(masterGain);

    for (const note of track.notes) {
      if (isNoise(track.wave)) {
        playNoiseHit(ctx, trackGain, note, startAt);
      } else {
        playTone(ctx, trackGain, track.wave, note, startAt);
      }
    }
  }
}
