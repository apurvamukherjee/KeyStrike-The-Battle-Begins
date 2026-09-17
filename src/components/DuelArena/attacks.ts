import type { Judgement } from '../../types/game';

export type AttackId = 'slash' | 'thrust' | 'overhead' | 'rising' | 'spin' | 'jab' | 'crossCut' | 'iai';

export interface AttackSpec {
  id: AttackId;
  /** Blade angle at the end of the wind-up, relative to the guard stance. */
  windupRotation: number;
  /** Blade angle at the moment of impact, relative to the guard stance. */
  strikeRotation: number;
  /** Shoulder drive at impact, in degrees — what makes a cut read as heavy. */
  armRotation: number;
  /** How far the attacker travels toward the defender, in px. */
  lunge: number;
  /** Seconds spent winding up before the blade commits. */
  windup: number;
  /** Seconds from commit to impact — shorter reads as faster/lighter. */
  travel: number;
  /** 0-1 impact weight: scales knockback, shake, sparks and hitstop. */
  weight: number;
  /** Freeze-frame at contact, in seconds. The cinematic beat on heavy blows. */
  hitstop: number;
  /** Angle of the on-screen slash streak, in degrees. */
  streakAngle: number;
  /** A vertical cut's streak sweeps top-to-bottom rather than across. */
  streakVertical?: boolean;
  /** Full-screen impact flash, finishers only. */
  flash?: boolean;
  /** Attacker leaves afterimages through the lunge. */
  afterimage?: boolean;
  /** Draws a second streak crossing the first, for an X-shaped cut. */
  doubleStreak?: boolean;
}

/**
 * The move set. Every attack is a real gameplay signal rather than decoration:
 * see pickAttack — a clean word swings differently from a sloppy one, and a
 * deep combo earns the finisher.
 */
export const ATTACKS: Record<AttackId, AttackSpec> = {
  // Fast horizontal cut — the bread-and-butter hit for a 'good' word.
  slash: {
    id: 'slash',
    windupRotation: -46,
    strikeRotation: 96,
    armRotation: 16,
    lunge: 58,
    windup: 0.1,
    travel: 0.12,
    weight: 0.55,
    hitstop: 0.03,
    streakAngle: -8,
  },
  // Straight stab — minimal blade rotation, maximum forward reach.
  thrust: {
    id: 'thrust',
    windupRotation: -18,
    strikeRotation: 30,
    armRotation: 30,
    lunge: 78,
    windup: 0.12,
    travel: 0.09,
    weight: 0.7,
    hitstop: 0.05,
    streakAngle: 4,
  },
  // Heavy vertical chop — the slowest wind-up, the hardest landing.
  overhead: {
    id: 'overhead',
    windupRotation: -128,
    strikeRotation: 74,
    armRotation: -34,
    lunge: 66,
    windup: 0.17,
    travel: 0.11,
    weight: 1,
    hitstop: 0.075,
    streakAngle: 84,
    streakVertical: true,
  },
  // Upward cut from a low guard — the counter-punch read.
  rising: {
    id: 'rising',
    windupRotation: 52,
    strikeRotation: -76,
    armRotation: -20,
    lunge: 52,
    windup: 0.13,
    travel: 0.1,
    weight: 0.8,
    hitstop: 0.055,
    streakAngle: -66,
    streakVertical: true,
  },
  // The lightest cut in the set — a flick of the wrist for a scrappy word.
  // Almost no wind-up, so a messy run still feels responsive.
  jab: {
    id: 'jab',
    windupRotation: -24,
    strikeRotation: 52,
    armRotation: 10,
    lunge: 38,
    windup: 0.07,
    travel: 0.09,
    weight: 0.38,
    hitstop: 0.02,
    streakAngle: -16,
  },
  // Two cuts in one motion — an X through the defender. The reward for a
  // perfect word once the combo is building but before the finisher unlocks.
  crossCut: {
    id: 'crossCut',
    windupRotation: -92,
    strikeRotation: 128,
    armRotation: 24,
    lunge: 70,
    windup: 0.14,
    travel: 0.12,
    weight: 0.92,
    hitstop: 0.065,
    streakAngle: -38,
    doubleStreak: true,
  },
  // Iai — the draw-cut. A long, still wind-up and a single decisive line, the
  // most "samurai film" beat in the set.
  iai: {
    id: 'iai',
    windupRotation: -8,
    strikeRotation: 154,
    armRotation: 36,
    lunge: 96,
    windup: 0.24,
    travel: 0.07,
    weight: 1.1,
    hitstop: 0.09,
    streakAngle: -4,
    afterimage: true,
  },
  // Combo finisher — a full rotation through the defender.
  spin: {
    id: 'spin',
    windupRotation: -150,
    strikeRotation: 286,
    armRotation: 40,
    lunge: 88,
    windup: 0.19,
    travel: 0.14,
    weight: 1.35,
    hitstop: 0.11,
    streakAngle: -20,
    flash: true,
    afterimage: true,
  },
};

/** Combo at which a strike is promoted to the spinning finisher. */
export const FINISHER_COMBO = 20;
/** Combo at which perfect words start landing the heaviest non-finisher cuts. */
export const HEAVY_COMBO = 8;

/**
 * Chooses the attack for a strike from how the word was actually typed.
 *
 * The move escalates on two axes — accuracy and combo — so the fight visibly
 * answers how you are playing:
 *
 *   miss/unknown          jab        (scrappy, near-instant)
 *   good                  slash      (the workhorse)
 *   perfect, low combo    thrust / rising / overhead
 *   perfect, combo >= 8   crossCut / iai  (the showpieces)
 *   any, combo >= 20      spin       (the finisher)
 *
 * Variants rotate on `seq` rather than Math.random so the pick is
 * deterministic: React may render the same strike twice, and a random choice
 * would swap the animation mid-swing.
 */
export function pickAttack(judgement: Judgement | undefined, combo: number, seq: number): AttackSpec {
  if (combo >= FINISHER_COMBO) return ATTACKS.spin;

  if (judgement === 'perfect') {
    const pool: AttackId[] =
      combo >= HEAVY_COMBO ? ['crossCut', 'iai', 'overhead'] : ['overhead', 'thrust', 'rising'];
    return ATTACKS[pool[seq % pool.length]];
  }

  if (judgement === 'good') return ATTACKS.slash;

  // No judgement (an opponent's swing) or a miss-driven strike: the light cut.
  return ATTACKS.jab;
}
