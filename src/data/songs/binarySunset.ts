import { MAJOR_PENTATONIC } from '../../engine/music';
import { buildWordSong } from '../../engine/songBuilder';

const WORDS = [
  'GLOW',
  'WARM',
  'DUSK',
  'CALM',
  'SLOW',
  'HAZY',
  'MILD',
  'EMBER',
  'AMBER',
  'SUNSET',
  'BINARY',
  'GOLDEN',
  'MEMORY',
  'WANDER',
  'GENTLE',
  'ISLAND',
  'HARBOR',
  'ANALOG',
  'VOYAGE',
  'COMPASS',
  'HORIZON',
  'LANTERN',
  'DRIFTING',
  'TWILIGHT',
  'AFTERGLOW',
];

export const binarySunset = buildWordSong({
  id: 'binary-sunset',
  title: 'Binary Sunset',
  artist: 'Apurva',
  bpm: 84,
  rootFreq: 174.61, // F3
  scale: MAJOR_PENTATONIC,
  accent: '#ff7a90',
  difficulty: 3,
  bars: 24,
  words: WORDS,
  bassDegrees: [0, 3, -2, 2],
});
