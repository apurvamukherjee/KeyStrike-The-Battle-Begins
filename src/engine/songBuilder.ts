import { beatsToSeconds, degreeToFreq, MINOR_PENTATONIC } from './music';
import type { Difficulty, SongDefinition, SynthNote, SynthTrack, WordNote } from '../types/song';

const EASY_MAX_LEN = 5;
const HARD_MIN_LEN = 4;

export interface WordSongSource {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  /** bass/pad root frequency in Hz */
  rootFreq: number;
  scale?: readonly number[];
  accent: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  beatsPerBar?: number;
  /** total bars, drives backing-track length */
  bars: number;
  /** original word bank for this song, cycled as needed across all three difficulties */
  words: readonly string[];
  /** one scale degree per bar (cycled), played as the bass/pad root for that bar */
  bassDegrees: number[];
  hats?: boolean;
}

interface Placement {
  pool: readonly string[];
  beatsPerWord: number;
}

function placementFor(words: readonly string[], difficulty: Difficulty): Placement {
  if (difficulty === 'easy') {
    const pool = words.filter((w) => w.length <= EASY_MAX_LEN);
    return { pool: pool.length ? pool : words, beatsPerWord: 6 };
  }
  if (difficulty === 'hard') {
    const pool = words.filter((w) => w.length >= HARD_MIN_LEN);
    return { pool: pool.length ? pool : words, beatsPerWord: 2 };
  }
  return { pool: words, beatsPerWord: 4 };
}

function buildChart(
  words: readonly string[],
  difficulty: Difficulty,
  toSec: (beat: number) => number,
  bars: number,
  beatsPerBar: number
): WordNote[] {
  const { pool, beatsPerWord } = placementFor(words, difficulty);
  const totalBeats = bars * beatsPerBar;
  const count = Math.max(1, Math.floor(totalBeats / beatsPerWord));
  const notes: WordNote[] = [];
  for (let i = 0; i < count; i++) {
    notes.push({ time: toSec((i + 1) * beatsPerWord), word: pool[i % pool.length] });
  }
  return notes;
}

export function buildWordSong(src: WordSongSource): SongDefinition {
  const beatsPerBar = src.beatsPerBar ?? 4;
  const scale = src.scale ?? MINOR_PENTATONIC;
  const toSec = beatsToSeconds(src.bpm);
  const secPerBeat = 60 / src.bpm;

  const charts: Record<Difficulty, WordNote[]> = {
    easy: buildChart(src.words, 'easy', toSec, src.bars, beatsPerBar),
    normal: buildChart(src.words, 'normal', toSec, src.bars, beatsPerBar),
    hard: buildChart(src.words, 'hard', toSec, src.bars, beatsPerBar),
  };

  // Backing is difficulty-independent (bass + soft pad + hats) — words carry the
  // "melody" interactively now, so there's no lead line to keep in sync per chart.
  const bassNotes: SynthNote[] = [];
  const padNotes: SynthNote[] = [];
  for (let bar = 0; bar < src.bars; bar++) {
    const degree = src.bassDegrees[bar % src.bassDegrees.length];
    const barStartBeat = bar * beatsPerBar;
    const bassFreq = degreeToFreq(src.rootFreq / 2, degree, scale);
    bassNotes.push({ time: toSec(barStartBeat), freq: bassFreq, duration: secPerBeat * 1.7, velocity: 0.8 });
    bassNotes.push({
      time: toSec(barStartBeat + 2),
      freq: bassFreq,
      duration: secPerBeat * 1.7,
      velocity: 0.6,
    });

    const padFreq = degreeToFreq(src.rootFreq, degree, scale);
    padNotes.push({
      time: toSec(barStartBeat),
      freq: padFreq,
      duration: secPerBeat * beatsPerBar * 0.95,
      velocity: 0.35,
    });
  }

  const hatNotes: SynthNote[] = [];
  if (src.hats !== false) {
    const totalBeats = src.bars * beatsPerBar;
    const steps = totalBeats * 2; // 8th notes
    for (let half = 0; half < steps; half++) {
      const isOffbeat = half % 2 === 1;
      hatNotes.push({
        time: toSec(half / 2),
        freq: 0,
        duration: 0.045,
        velocity: isOffbeat ? 0.32 : 0.18,
      });
    }
  }

  const tracks: SynthTrack[] = [
    { wave: 'triangle', notes: bassNotes, gain: 0.26 },
    { wave: 'sine', notes: padNotes, gain: 0.14 },
  ];
  if (hatNotes.length) tracks.push({ wave: 'noise', notes: hatNotes, gain: 0.16 });

  const lastWordTime = Math.max(
    0,
    ...charts.easy.map((w) => w.time),
    ...charts.normal.map((w) => w.time),
    ...charts.hard.map((w) => w.time)
  );
  const durationSec = Math.max(toSec(src.bars * beatsPerBar) + 1.5, lastWordTime + 2.5);

  return {
    id: src.id,
    title: src.title,
    artist: src.artist,
    bpm: src.bpm,
    durationSec,
    difficulty: src.difficulty,
    accent: src.accent,
    charts,
    tracks,
  };
}
