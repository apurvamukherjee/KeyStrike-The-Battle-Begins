import { MINOR_PENTATONIC } from '../../engine/music';
import { buildLeadFromMotifs, buildSong } from '../../engine/songBuilder';

const bpm = 170;
const beatsPerBar = 4;
const bars = 40;
const progression = [0, 3, -2, 1];

const lead = buildLeadFromMotifs({
  bars,
  beatsPerBar,
  progression,
  lanePattern: [0, 3, 1, 2, 3, 0, 2, 1, 3, 2, 0, 1],
  motif: [
    [0, 0, 0.5],
    [0.5, 2, 0.5],
    [1, 5, 0.5],
    [1.5, 2, 0.5],
    [2, 4, 0.5],
    [2.5, 1, 0.5],
    [3, 3, 0.5],
    [3.5, 0, 0.5],
  ],
  fillMotif: [
    [0, 0, 0.25],
    [0.25, 1, 0.25],
    [0.5, 2, 0.25],
    [0.75, 3, 0.25],
    [1, 4, 0.25],
    [1.25, 3, 0.25],
    [1.5, 2, 0.25],
    [1.75, 1, 0.25],
    [2, 0, 1],
    [3, 5, 1],
  ],
  fillEvery: 8,
});

export const overclock = buildSong({
  id: 'overclock',
  title: 'Overclock',
  artist: 'Apurva',
  bpm,
  rootFreq: 164.81, // E3
  scale: MINOR_PENTATONIC,
  accent: '#ff1f3d',
  difficulty: 5,
  bars,
  beatsPerBar,
  lead,
  bassDegrees: progression,
});
