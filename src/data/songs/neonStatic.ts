import { MINOR_PENTATONIC } from '../../engine/music';
import { buildWordSong } from '../../engine/songBuilder';

const WORDS = [
  'NEON',
  'HAZE',
  'ECHO',
  'DUSK',
  'VOID',
  'HUSH',
  'DRIFT',
  'FROST',
  'RADIO',
  'STATIC',
  'SIGNAL',
  'GLITCH',
  'SHADOW',
  'HOLLOW',
  'MIRROR',
  'FLICKER',
  'CIRCUIT',
  'WHISPER',
  'PHANTOM',
  'MIDNIGHT',
];

export const neonStatic = buildWordSong({
  id: 'neon-static',
  title: 'Neon Static',
  artist: 'Apurva',
  bpm: 100,
  rootFreq: 220, // A3
  scale: MINOR_PENTATONIC,
  accent: '#e0263f',
  difficulty: 2,
  bars: 29,
  words: WORDS,
  bassDegrees: [0, -2, 3, 0],
});
