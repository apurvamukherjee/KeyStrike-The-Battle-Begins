import { MINOR_PENTATONIC } from '../../engine/music';
import { buildWordSong } from '../../engine/songBuilder';

const WORDS = [
  'GRIP',
  'BURN',
  'EDGE',
  'RUSH',
  'HEAT',
  'SPIN',
  'METAL',
  'TRACK',
  'SHIFT',
  'CRASH',
  'STEEL',
  'CHROME',
  'PISTON',
  'TARMAC',
  'GRAVEL',
  'HAZARD',
  'CRIMSON',
  'EXHAUST',
  'TURBINE',
  'VELOCITY',
  'THROTTLE',
  'IGNITION',
  'FRICTION',
  'OVERDRIVE',
  'COLLISION',
];

export const redline = buildWordSong({
  id: 'redline',
  title: 'Redline',
  artist: 'Apurva',
  bpm: 150,
  rootFreq: 293.66, // D4
  scale: MINOR_PENTATONIC,
  accent: '#c41630',
  difficulty: 4,
  bars: 44,
  words: WORDS,
  bassDegrees: [0, -2, 1, 3],
});
