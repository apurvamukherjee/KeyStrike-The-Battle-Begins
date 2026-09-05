export type Waveform = OscillatorType | 'noise';

export interface SynthNote {
  /** seconds from song start */
  time: number;
  /** ignored for 'noise' tracks */
  freq: number;
  /** seconds */
  duration: number;
  /** 0-1, defaults to 1 */
  velocity?: number;
}

/** A reactive backing-track layer, faded in live as the player's combo multiplier climbs (see engine/musicIntensity.ts). */
export type TrackRole = 'intensityPad' | 'intensityHats';

export interface SynthTrack {
  wave: Waveform;
  notes: SynthNote[];
  /** 0-1 track gain, defaults to 0.2. For a track with `role` set, this is the gain it ramps up to at full intensity — it starts silent. */
  gain?: number;
  role?: TrackRole;
}

export interface WordNote {
  /** seconds from song start — the deadline this word should be fully typed by */
  time: number;
  word: string;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export interface SongDefinition {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  /** seconds, playable region ends here */
  durationSec: number;
  /** baseline/"Normal" challenge rating shown as stars in Song Select */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** hex accent used for this song's card / stage flourish */
  accent: string;
  charts: Record<Difficulty, WordNote[]>;
  tracks: SynthTrack[];
}
