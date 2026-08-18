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

export interface SynthTrack {
  wave: Waveform;
  notes: SynthNote[];
  /** 0-1 track gain, defaults to 0.2 */
  gain?: number;
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
