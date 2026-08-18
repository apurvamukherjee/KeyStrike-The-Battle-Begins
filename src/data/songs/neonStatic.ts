import { MINOR_PENTATONIC } from '../../engine/music';
import { buildLeadFromMotifs, buildSong } from '../../engine/songBuilder';

const bpm = 100;
const beatsPerBar = 4;
const bars = 28;
const progression = [0, -2, 3, 0];

const lead = buildLeadFromMotifs({
  bars,
  beatsPerBar,
  progression,
  lanePattern: [1, 3, 0, 2, 1, 0, 3, 2],
  motif: [
    [0, 0, 0.5],
    [0.5, 1, 0.5],
    [1, 0, 1],
    [2, 2, 0.5],
    [2.5, 1, 0.5],
    [3, 0, 1],
  ],
  fillMotif: [
    [0, 3, 0.5],
    [0.5, 2, 0.5],
    [1, 1, 0.5],
    [1.5, 0, 0.5],
    [2, 4, 1],
    [3, 2, 1],
  ],
  fillEvery: 7,
});

export const neonStatic = buildSong({
  id: 'neon-static',
  title: 'Neon Static',
  artist: 'Apurva',
  bpm,
  rootFreq: 220, // A3
  scale: MINOR_PENTATONIC,
  accent: '#e0263f',
  difficulty: 2,
  bars,
  beatsPerBar,
  lead,
  bassDegrees: progression,
});
