import { MAJOR_PENTATONIC } from '../../engine/music';
import { buildLeadFromMotifs, buildSong } from '../../engine/songBuilder';

const bpm = 132;
const beatsPerBar = 4;
const bars = 32;
const progression = [0, 0, 2, -1];

const lead = buildLeadFromMotifs({
  bars,
  beatsPerBar,
  progression,
  lanePattern: [0, 1, 2, 3],
  motif: [
    [0, 0, 1],
    [1, 1, 1],
    [2, 2, 1],
    [3, 1, 1],
  ],
  fillMotif: [
    [0, 2, 1],
    [1, 3, 1],
    [2, 2, 0.5],
    [2.5, 1, 0.5],
    [3, 0, 1],
  ],
  fillEvery: 8,
});

export const pulseDrive = buildSong({
  id: 'pulse-drive',
  title: 'Pulse Drive',
  artist: 'Apurva',
  bpm,
  rootFreq: 261.63, // C4
  scale: MAJOR_PENTATONIC,
  accent: '#ff4d63',
  difficulty: 1,
  bars,
  beatsPerBar,
  lead,
  bassDegrees: progression,
});
