import { MAJOR_PENTATONIC } from '../../engine/music';
import { buildWordSong } from '../../engine/songBuilder';

const WORDS = [
  'PULSE',
  'DRIVE',
  'SPARK',
  'RUSH',
  'GLOW',
  'NEON',
  'RACE',
  'SURGE',
  'FLASH',
  'BOLT',
  'SPEED',
  'DASH',
  'VIVID',
  'ACCEL',
  'BRIGHT',
  'CHARGE',
  'MOTION',
  'ENERGY',
  'IGNITE',
  'FORWARD',
];

export const pulseDrive = buildWordSong({
  id: 'pulse-drive',
  title: 'Pulse Drive',
  artist: 'Apurva',
  bpm: 132,
  rootFreq: 261.63, // C4
  scale: MAJOR_PENTATONIC,
  accent: '#ff4d63',
  difficulty: 1,
  bars: 38,
  words: WORDS,
  bassDegrees: [0, 0, 2, -1],
});
