import { describe, expect, it } from 'vitest';
import { buildWordSong } from './songBuilder';
import type { WordSongSource } from './songBuilder';
import type { Difficulty } from '../types/song';

const BPM = 120;
const SEC_PER_BEAT = 60 / BPM;

function makeSource(overrides: Partial<WordSongSource> = {}): WordSongSource {
  return {
    id: 'test-song',
    title: 'Test',
    artist: 'Test',
    bpm: BPM,
    rootFreq: 220,
    accent: '#fff',
    difficulty: 3,
    bars: 60,
    words: ['ELEPHANT', 'COLLISION', 'OVERDRIVE', 'FRAGMENT', 'SINGULARITY'],
    bassDegrees: [0],
    ...overrides,
  };
}

describe('buildWordSong — per-word difficulty timing', () => {
  it('budgets time in proportion to each word\'s length, not a flat window', () => {
    const song = buildWordSong(makeSource());
    const hard = song.charts.hard;
    const firstPace = hard[0].time / hard[0].word.length;
    const secondPace = (hard[1].time - hard[0].time) / hard[1].word.length;
    expect(firstPace).toBeCloseTo(secondPace, 5);
  });

  it('requires a tighter per-character pace on hard than normal than easy, for the same word', () => {
    // A word long enough that Easy's length filter empties out and falls back
    // to the full pool, so all three tiers place the exact same first word.
    const song = buildWordSong(makeSource({ words: ['THRESHOLD'] }));
    const paceFor = (d: Difficulty) => song.charts[d][0].time / song.charts[d][0].word.length;
    const hardPace = paceFor('hard');
    const normalPace = paceFor('normal');
    const easyPace = paceFor('easy');
    expect(hardPace).toBeLessThan(normalPace);
    expect(normalPace).toBeLessThan(easyPace);
  });

  it('makes a long word (COLLISION-style) typeable on hard instead of physically impossible', () => {
    const song = buildWordSong(makeSource({ bpm: 150, words: ['COLLISION'] }));
    // Old flat model gave this ~0.8s (2 beats @ 150bpm) — impossible for 9 keystrokes.
    expect(song.charts.hard[0].time).toBeGreaterThan(1.5);
  });

  it('floors a short word\'s budget so it never appears unreadably fast on hard', () => {
    const song = buildWordSong(makeSource({ words: ['GO', 'HI', 'OK'] }));
    expect(song.charts.hard[0].time).toBeCloseTo(1.5 * SEC_PER_BEAT, 5);
  });

  it('no longer restricts hard to a minimum word length', () => {
    const song = buildWordSong(makeSource({ words: ['GO', 'HI', 'OK', 'ELEPHANT'] }));
    const hardWords = new Set(song.charts.hard.map((n) => n.word));
    expect(hardWords.has('GO')).toBe(true);
  });

  it('never schedules a word beyond the backing track\'s length', () => {
    const source = makeSource();
    const song = buildWordSong(source);
    const totalSec = source.bars * 4 * SEC_PER_BEAT;
    for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
      for (const note of song.charts[difficulty]) {
        expect(note.time).toBeLessThanOrEqual(totalSec + 1e-6);
      }
    }
  });

  it('always places at least one word, even for a degenerately short song', () => {
    const song = buildWordSong(makeSource({ bars: 1 }));
    for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
      expect(song.charts[difficulty].length).toBeGreaterThanOrEqual(1);
    }
  });

  it('falls back to the full word bank when a filtered pool would be empty', () => {
    const song = buildWordSong(makeSource({ words: ['SINGULARITY'] }));
    expect(song.charts.easy.length).toBeGreaterThan(0);
    expect(song.charts.easy[0].word).toBe('SINGULARITY');
  });
});
