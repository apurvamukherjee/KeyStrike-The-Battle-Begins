/**
 * Small scale/frequency helpers so songs can be authored as scale degrees and
 * beat offsets instead of raw Hz and seconds — see src/data/songs.
 */

export const MINOR_PENTATONIC = [0, 3, 5, 7, 10];
export const MAJOR_PENTATONIC = [0, 2, 4, 7, 9];

export function degreeToSemitones(degree: number, scale: readonly number[]): number {
  const len = scale.length;
  const octave = Math.floor(degree / len);
  const idx = ((degree % len) + len) % len;
  return scale[idx] + octave * 12;
}

export function semitonesToFreq(rootFreq: number, semitones: number): number {
  return rootFreq * Math.pow(2, semitones / 12);
}

export function degreeToFreq(rootFreq: number, degree: number, scale: readonly number[] = MINOR_PENTATONIC): number {
  return semitonesToFreq(rootFreq, degreeToSemitones(degree, scale));
}

/** Returns a beat-number -> seconds converter for a given tempo. */
export function beatsToSeconds(bpm: number) {
  const secPerBeat = 60 / bpm;
  return (beat: number) => beat * secPerBeat;
}
