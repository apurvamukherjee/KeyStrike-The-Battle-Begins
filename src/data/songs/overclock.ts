import { MINOR_PENTATONIC } from '../../engine/music';
import { buildWordSong } from '../../engine/songBuilder';

const WORDS = [
  'CORE',
  'PEAK',
  'PUSH',
  'SNAP',
  'JOLT',
  'SPIKE',
  'CRASH',
  'LIMIT',
  'BOOST',
  'STRESS',
  'KERNEL',
  'VORTEX',
  'CASCADE',
  'PARADOX',
  'ANOMALY',
  'ENTROPY',
  'OVERLOAD',
  'FEEDBACK',
  'MELTDOWN',
  'FRAGMENT',
  'BLACKOUT',
  'SUPERNOVA',
  'THRESHOLD',
  'RECURSION',
  'SINGULARITY',
];

export const overclock = buildWordSong({
  id: 'overclock',
  title: 'Overclock',
  artist: 'Apurva',
  bpm: 170,
  rootFreq: 164.81, // E3
  scale: MINOR_PENTATONIC,
  accent: '#ff1f3d',
  difficulty: 5,
  bars: 50,
  words: WORDS,
  bassDegrees: [0, 3, -2, 1],
});
