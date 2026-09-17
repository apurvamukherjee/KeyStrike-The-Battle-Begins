import gsap from 'gsap';
import type { AttackSpec } from './attacks';
import { SWORDSMAN_PART } from '../Swordsman/Swordsman';

export interface StrikeTargets {
  /** The attacking figure's root <svg>. */
  attacker: SVGSVGElement;
  /** The attacker's blade group, pivoted at the hilt. */
  sword: SVGGElement;
  /** The figure taking the hit. */
  defender: SVGSVGElement;
  /** The arena root — shaken and flashed on impact. */
  arena: HTMLElement;
  /** The directional slash streak for this attacker's side, if the arena draws one. */
  streak?: HTMLElement | null;
  /** Where sparks and the impact ring are spawned. */
  impact?: HTMLElement | null;
}

export interface StrikeOptions {
  /** +1 when the attacker faces right, -1 when it faces left. */
  dir: number;
  /** The blade's guard-stance angle, which every rotation is relative to. */
  restAngle: number;
  /** Skips every non-essential flourish and collapses the timing. */
  reduceMotion: boolean;
}

const SPARK_COUNT = 9;

/** Retriggers a CSS animation class that may already be applied. */
function replayClass(el: Element, className: string) {
  el.classList.remove(className);
  void el.getBoundingClientRect(); // works for both HTML and SVG elements
  el.classList.add(className);
}

function part(root: SVGSVGElement, name: string): SVGGraphicsElement | null {
  return root.querySelector<SVGGraphicsElement>(`.${name}`);
}

/**
 * Spawns a short-lived burst of sparks at the point of contact.
 *
 * Removal is scheduled on the passed-in timeline rather than a bare
 * setTimeout: an arena that unmounts mid-strike (duel ends, player quits)
 * kills the timeline, which cancels the pending removal instead of leaving a
 * callback to fire against a detached node. Any layer still attached at that
 * point goes out with its host.
 */
function spawnSparks(tl: gsap.core.Timeline, host: HTMLElement, weight: number, dir: number, at: number) {
  const layer = document.createElement('div');
  layer.className = 'duel-impact__sparks';
  const count = Math.round(SPARK_COUNT * weight);

  for (let i = 0; i < count; i++) {
    const spark = document.createElement('i');
    // Fan the sparks back along the blade's direction of travel.
    const spread = (Math.random() - 0.5) * 2.4;
    const distance = (26 + Math.random() * 48) * weight;
    spark.style.setProperty('--dx', `${Math.cos(spread) * distance * -dir}px`);
    spark.style.setProperty('--dy', `${Math.sin(spread) * distance - 14}px`);
    spark.style.setProperty('--delay', `${Math.random() * 40}ms`);
    spark.style.setProperty('--size', `${2 + Math.random() * 3}px`);
    layer.appendChild(spark);
  }

  host.appendChild(layer);
  tl.call(() => layer.remove(), undefined, at + 0.7);
}

/**
 * Snaps a fighter back to the guard stance, for when an in-flight strike is
 * cancelled by the next one. Without this the killed timeline leaves every
 * limb wherever it stopped and the figure never returns to pose.
 */
export function resetFighter(body: SVGSVGElement, sword: SVGGElement, restAngle: number): void {
  gsap.set(sword, { rotation: restAngle });
  gsap.set(body, { x: 0 });

  const limbs = [
    SWORDSMAN_PART.swordArm,
    SWORDSMAN_PART.offArm,
    SWORDSMAN_PART.torso,
    SWORDSMAN_PART.head,
    SWORDSMAN_PART.hair,
    SWORDSMAN_PART.sash,
    SWORDSMAN_PART.frontLeg,
    SWORDSMAN_PART.backLeg,
  ]
    .map((cls) => body.querySelector(`.${cls}`))
    .filter(Boolean);

  if (limbs.length > 0) gsap.set(limbs, { rotation: 0, y: 0 });

  const trail = sword.querySelector(`.${SWORDSMAN_PART.trail}`);
  if (trail) gsap.set(trail, { opacity: 0 });
}

/**
 * Plays one full attack: wind-up, committed swing, impact, recovery.
 *
 * The whole sequence is a single GSAP timeline so it can be scrubbed and so a
 * `hitstop` pause genuinely freezes every part of the figure at once — the
 * cinematic beat that sells a heavy blow. Returns the timeline so the caller
 * can kill it if a new strike lands first.
 */
export function playStrike(spec: AttackSpec, targets: StrikeTargets, options: StrikeOptions): gsap.core.Timeline {
  const { attacker, sword, defender, arena, streak, impact } = targets;
  const { dir, restAngle, reduceMotion } = options;

  const tl = gsap.timeline();

  // Reduced motion keeps the hit *feedback* (who hit whom still has to read)
  // but drops the travel, flourish and screen effects to near-instant.
  const scale = reduceMotion ? 0.01 : 1;
  const windup = spec.windup * scale;
  const travel = spec.travel * scale;
  const hitstop = reduceMotion ? 0 : spec.hitstop;

  const arm = part(attacker, SWORDSMAN_PART.swordArm);
  const offArm = part(attacker, SWORDSMAN_PART.offArm);
  const torso = part(attacker, SWORDSMAN_PART.torso);
  const head = part(attacker, SWORDSMAN_PART.head);
  const hair = part(attacker, SWORDSMAN_PART.hair);
  const sash = part(attacker, SWORDSMAN_PART.sash);
  const frontLeg = part(attacker, SWORDSMAN_PART.frontLeg);
  const backLeg = part(attacker, SWORDSMAN_PART.backLeg);
  const trail = sword.querySelector<SVGPathElement>(`.${SWORDSMAN_PART.trail}`);

  const defTorso = part(defender, SWORDSMAN_PART.torso);
  const defHead = part(defender, SWORDSMAN_PART.head);
  const defHair = part(defender, SWORDSMAN_PART.hair);

  // ---- Wind-up: coil back, weight onto the back foot -------------------
  // Heavier attacks coil further and settle sooner, leaving a beat of stillness
  // before the commit — the anticipation that makes a big cut land hard. The
  // blade reaches its wind-up angle in a fraction of the wind-up window, and
  // holds there for the remainder.
  const coil = windup * (reduceMotion ? 1 : 0.68);
  const drawBack = -10 - spec.weight * 6;

  tl.to(sword, { rotation: restAngle + spec.windupRotation, duration: coil, ease: 'power2.out' }, 0).to(
    attacker,
    { x: drawBack * dir, duration: coil, ease: 'power2.out' },
    0,
  );

  if (!reduceMotion) {
    tl.to(arm, { rotation: -spec.armRotation * 0.5, duration: coil, ease: 'power2.out' }, 0)
      .to(torso, { rotation: -5 * dir - spec.weight * 3, duration: coil, ease: 'power2.out' }, 0)
      .to(head, { rotation: -3 * dir, duration: coil, ease: 'power2.out' }, 0)
      .to([hair, sash], { rotation: 16 * dir, duration: coil, ease: 'power2.out' }, 0)
      // The crouch is expressed through the legs, not the body's `y` — the
      // idle breathing loop owns `y` on the attacker for the whole fight, and
      // a second tween on it would fight the loop and leave the figure
      // displaced once the strike ends.
      .to(backLeg, { rotation: -8 - spec.weight * 4, duration: coil, ease: 'power2.out' }, 0)
      .to(frontLeg, { rotation: 6 + spec.weight * 3, duration: coil, ease: 'power2.out' }, 0);
  }

  // ---- Commit: drive forward, blade sweeps to the contact angle ---------
  tl.to(sword, { rotation: restAngle + spec.strikeRotation, duration: travel, ease: 'power4.in' }, windup)
    .to(attacker, { x: spec.lunge * dir, duration: travel, ease: 'power4.in' }, windup);

  if (!reduceMotion) {
    tl.to(arm, { rotation: spec.armRotation, duration: travel, ease: 'power4.in' }, windup)
      .to(torso, { rotation: 8 * dir, duration: travel, ease: 'power3.in' }, windup)
      .to(offArm, { rotation: -22 * dir, duration: travel, ease: 'power3.in' }, windup)
      .to([hair, sash], { rotation: -26 * dir, duration: travel, ease: 'power3.in' }, windup)
      .to(frontLeg, { rotation: -14, duration: travel, ease: 'power3.in' }, windup)
      .to(backLeg, { rotation: 10, duration: travel, ease: 'power3.in' }, windup);

    // Blade trail fades in with the swing and out just after contact.
    if (trail) {
      tl.to(trail, { opacity: 0.85, duration: travel * 0.6, ease: 'power2.in' }, windup)
        .to(trail, { opacity: 0, duration: 0.18, ease: 'power2.out' }, windup + travel + hitstop);
    }

    if (spec.afterimage) {
      tl.to(attacker, { '--afterimage': 1, duration: travel, ease: 'none' }, windup);
      tl.call(() => replayClass(attacker, 'swordsman--afterimage'), undefined, windup);
    }
  }

  // ---- Impact ----------------------------------------------------------
  const contact = windup + travel;

  // Class-based effects fire as a callback; everything tweened is placed on
  // THIS timeline (not a nested one created inside the callback), so killing
  // this timeline cancels the defender's reaction too. Nested timelines built
  // inside a .call() escape useGSAP's cleanup and keep running after unmount.
  tl.call(
    () => {
      if (streak) {
        streak.style.setProperty('--streak-angle', `${spec.streakAngle}deg`);
        streak.style.setProperty('--streak-weight', String(spec.weight));
        // toggle(), not add(): the orientation must be cleared when the next
        // attack cuts the other way, or a single overhead would leave every
        // later horizontal slash rendering as a vertical streak.
        streak.classList.toggle('duel-arena__slash--double', !!spec.doubleStreak);
        streak.classList.toggle('duel-arena__slash--vertical', !!spec.streakVertical);
        replayClass(streak, 'duel-arena__slash--active');
      }

      replayClass(defender, 'swordsman--hit-flash');
      arena.style.setProperty('--shake-weight', String(spec.weight));
      replayClass(arena, 'duel-backdrop--shake');

      if (!reduceMotion && spec.flash) replayClass(arena, 'duel-backdrop--flash');
    },
    undefined,
    contact,
  );

  if (!reduceMotion && impact) spawnSparks(tl, impact, spec.weight, dir, contact);

  // The defender's recoil: struck backward, then recovers elastically.
  const knock = -18 * spec.weight * dir;
  tl.to(defender, { x: knock, duration: reduceMotion ? 0.01 : 0.07, ease: 'power4.out' }, contact).to(
    defender,
    { x: 0, duration: reduceMotion ? 0.01 : 0.34, ease: 'elastic.out(1, 0.5)' },
    contact + (reduceMotion ? 0.01 : 0.07),
  );

  if (!reduceMotion) {
    // Hit reaction: the body folds around the blow rather than sliding rigidly.
    tl.to(defTorso, { rotation: -12 * dir, duration: 0.08, ease: 'power3.out' }, contact)
      .to(defTorso, { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.45)' }, contact + 0.08)
      .to(defHead, { rotation: -18 * dir, y: 2, duration: 0.09, ease: 'power3.out' }, contact)
      .to(defHead, { rotation: 0, y: 0, duration: 0.45, ease: 'elastic.out(1, 0.4)' }, contact + 0.09)
      .to(defHair, { rotation: 30 * dir, duration: 0.1, ease: 'power2.out' }, contact)
      .to(defHair, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, contact + 0.1);
  }

  // Hitstop — a genuine freeze-frame at contact. Pausing the timeline and
  // resuming it is what actually holds both fighters mid-motion; an empty
  // placeholder tween here would only pad the schedule while everything kept
  // moving underneath it.
  if (hitstop > 0) {
    tl.call(
      () => {
        tl.pause();
        gsap.delayedCall(hitstop, () => tl.resume());
      },
      undefined,
      contact,
    );
  }

  // ---- Recovery: settle back to guard ----------------------------------
  // The hitstop pause holds wall-clock time without advancing the timeline, so
  // these are scheduled on the timeline's own clock. A short beat after contact
  // lets the blow land visibly before the attacker resets.
  const recover = contact + (reduceMotion ? 0.01 : 0.06);
  const recoverDur = (reduceMotion ? 0.01 : 0.36) * (1 + spec.weight * 0.2);

  tl.to(attacker, { x: 0, duration: recoverDur, ease: 'power2.out' }, recover)
    .to(sword, { rotation: restAngle, duration: recoverDur, ease: 'power2.out' }, recover);

  if (!reduceMotion) {
    tl.to([arm, offArm, torso, head, hair, sash, frontLeg, backLeg], {
      rotation: 0,
      duration: recoverDur,
      ease: 'power2.out',
    }, recover);
  }

  return tl;
}
