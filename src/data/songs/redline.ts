import { MINOR_PENTATONIC } from '../../engine/music';
import { buildLeadFromMotifs, buildSong } from '../../engine/songBuilder';

const bpm = 150;
const beatsPerBar = 4;
const bars = 36;
const progression = [0, -2, 1, 3];

const lead = buildLeadFromMotifs({
  bars,
  beatsPerBar,
  progression,
  lanePattern: [0, 2, 1, 3, 2, 0, 3, 1],
  motif: [
    [0, 0, 0.5],
    [0.5, 1, 0.5],
    [1, 2, 0.5],
    [1.5, 1, 0.5],
    [2, 3, 0.5],
    [2.5, 2, 0.5],
    [3, 1, 0.5],
    [3.5, 0, 0.5],
  ],
  fillMotif: [
    [0, 4, 0.5],
    [0.5, 3, 0.5],
    [1, 2, 0.5],
    [1.5, 1, 0.5],
    [2, 0, 0.5],
    [2.5, 1, 0.5],
    [3, 2, 1],
  ],
  fillEvery: 9,
});

export const redline = buildSong({
  id: 'redline',
  title: 'Redline',
  artist: 'Apurva',
  bpm,
  rootFreq: 293.66, // D4
  scale: MINOR_PENTATONIC,
  accent: '#c41630',
  difficulty: 4,
  bars,
  beatsPerBar,
  lead,
  bassDegrees: progression,
});
