import { beatsToSeconds, degreeToFreq, MINOR_PENTATONIC } from './music';
import type { Difficulty, SongDefinition, SynthNote, SynthTrack, WordNote } from '../types/song';

const EASY_MAX_LEN = 5;

/**
 * Beats of time budget per character, by difficulty. A word's timing window
 * scales with its own length, so the typing speed required to make the
 * deadline stays roughly constant within a tier — a flat per-word window
 * (the old model) is trivial for short words and impossible for long ones
 * in the very same tier, which is exactly what made Hard unplayable.
 */
const BEATS_PER_CHAR: Record<Difficulty, number> = {
  easy: 1.1,
  normal: 0.75,
  hard: 0.5,
};

/** Floor so even a short word never flashes by unreadably fast on Hard. */
const MIN_WORD_BEATS = 1.5;

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

/** Easy leans on shorter words for readability; Normal/Hard draw from the full bank — the per-word timing below is what actually paces them apart. */
function poolFor(words: readonly string[], difficulty: Difficulty): readonly string[] {
  if (difficulty === 'easy') {
    const pool = words.filter((w) => w.length <= EASY_MAX_LEN);
    return pool.length ? pool : words;
  }
  return words;
}

function buildChart(
  words: readonly string[],
  difficulty: Difficulty,
  toSec: (beat: number) => number,
  bars: number,
  beatsPerBar: number
): WordNote[] {
  const pool = poolFor(words, difficulty);
  const beatsPerChar = BEATS_PER_CHAR[difficulty];
  const totalBeats = bars * beatsPerBar;

  const notes: WordNote[] = [];
  let cumulative = 0;
  for (let i = 0; ; i++) {
    const word = pool[i % pool.length];
    const wordBeats = Math.max(MIN_WORD_BEATS, word.length * beatsPerChar);
    // Always place at least one word, even in a degenerate too-short chart.
    if (notes.length > 0 && cumulative + wordBeats > totalBeats) break;
    cumulative += wordBeats;
    notes.push({ time: toSec(cumulative), word });
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

/**
 * Returns a copy of `song` with every timestamp divided by `factor` — factor
 * 0.5 plays everything back at half speed (twice the wall-clock time to reach
 * each word/note), factor 2 doubles the pace. Since every note is synthesized
 * rather than a decoded audio file, this changes tempo without pitch-shifting.
 * Used for both the "Game speed" accessibility setting and Practice mode.
 */
export function scaleSongTiming(song: SongDefinition, factor: number): SongDefinition {
  if (factor === 1) return song;
  const scale = (t: number) => t / factor;

  const charts = Object.fromEntries(
    Object.entries(song.charts).map(([difficulty, notes]) => [
      difficulty,
      notes.map((n) => ({ ...n, time: scale(n.time) })),
    ])
  ) as SongDefinition['charts'];

  const tracks = song.tracks.map((track) => ({
    ...track,
    notes: track.notes.map((n) => ({ ...n, time: scale(n.time), duration: scale(n.duration) })),
  }));

  return { ...song, charts, tracks, durationSec: scale(song.durationSec) };
}

/**
 * Returns a copy of `song` covering only `[start, end)` of the given
 * difficulty's chart (and the backing tracks), re-based so the window starts
 * at time 0. Used by Practice mode to loop a section — other difficulties'
 * charts are left untouched since only one is ever in play at a time.
 */
export function sliceSong(song: SongDefinition, difficulty: Difficulty, start: number, end: number): SongDefinition {
  const shift = (t: number) => t - start;
  const inWindow = (t: number) => t >= start && t < end;

  const charts: SongDefinition['charts'] = {
    ...song.charts,
    [difficulty]: song.charts[difficulty].filter((n) => inWindow(n.time)).map((n) => ({ ...n, time: shift(n.time) })),
  };

  const tracks = song.tracks.map((track) => ({
    ...track,
    notes: track.notes.filter((n) => inWindow(n.time)).map((n) => ({ ...n, time: shift(n.time) })),
  }));

  return { ...song, charts, tracks, durationSec: end - start };
}
