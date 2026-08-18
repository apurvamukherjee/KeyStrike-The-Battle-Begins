import { MAJOR_PENTATONIC } from '../../engine/music';
import { buildLeadFromMotifs, buildSong } from '../../engine/songBuilder';

const bpm = 84;
const beatsPerBar = 4;
const bars = 24;
const progression = [0, 3, -2, 2];

const lead = buildLeadFromMotifs({
  bars,
  beatsPerBar,
  progression,
  lanePattern: [2, 0, 3, 1],
  motif: [
    [0, 0, 1.5],
    [1.5, 2, 0.5],
    [2, 4, 1],
    [3, 2, 1],
  ],
  fillMotif: [
    [0, 5, 1],
    [1, 4, 0.5],
    [1.5, 2, 0.5],
    [2, 0, 2],
  ],
  fillEvery: 6,
});

export const binarySunset = buildSong({
  id: 'binary-sunset',
  title: 'Binary Sunset',
  artist: 'Apurva',
  bpm,
  rootFreq: 174.61, // F3
  scale: MAJOR_PENTATONIC,
  accent: '#ff7a90',
  difficulty: 3,
  bars,
  beatsPerBar,
  lead,
  bassDegrees: progression,
});
