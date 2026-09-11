/**
 * A single mixed-length word pool for Endless/Survival mode — short and long
 * words shuffled together on purpose, since the escalating pace (see
 * engine/endlessRunner.ts) is what ramps the difficulty, not word selection.
 */
export const ENDLESS_WORDS: readonly string[] = [
  'RUN',
  'JUMP',
  'DASH',
  'GRIT',
  'EDGE',
  'FLOW',
  'SPARK',
  'CLASH',
  'BLADE',
  'STRIKE',
  'COMBAT',
  'ARMOR',
  'FOCUS',
  'SPRINT',
  'RHYTHM',
  'IMPACT',
  'VELOCITY',
  'PRECISION',
  'MOMENTUM',
  'CIRCUIT',
  'VOLTAGE',
  'REFLEX',
  'CADENCE',
  'ENDURE',
  'OVERDRIVE',
  'RELENTLESS',
  'ADRENALINE',
  'UNSTOPPABLE',
];

export function getEndlessWordPool(): readonly string[] {
  return ENDLESS_WORDS;
}
