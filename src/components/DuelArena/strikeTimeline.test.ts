import { describe, it, expect } from 'vitest';
import timelineSrc from './strikeTimeline.ts?raw';
import arenaSrc from './DuelArena.tsx?raw';
import ffaSrc from '../DuelArenaFFA/DuelArenaFFA.tsx?raw';
import { ATTACKS } from './attacks';

/**
 * These guard bugs that are invisible to the type checker and only show up as
 * a fighter stuck mid-pose, or animations still running after a duel ends.
 */
describe('strike timeline safety', () => {
  it('builds no nested timeline inside a .call() callback', () => {
    // A timeline created inside a callback isn't registered with useGSAP, so
    // it survives unmount and animates a detached node.
    for (const [name, src] of [
      ['strikeTimeline', timelineSrc],
      ['DuelArenaFFA', ffaSrc],
    ] as const) {
      const callBodies = [...src.matchAll(/\.call\(\s*\(\)\s*=>\s*\{([\s\S]*?)\n {4,6}\},/g)].map((m) => m[1]);
      for (const body of callBodies) {
        expect(body, `${name} nests a timeline inside .call()`).not.toMatch(/gsap\s*\n?\s*\.timeline\(\)|gsap\.timeline\(/);
      }
    }
  });

  it('schedules spark cleanup on the timeline, not a bare setTimeout', () => {
    // A raw setTimeout keeps firing after the arena unmounts. (Matches a call,
    // not the word in the comment explaining why it isn't used.)
    expect(timelineSrc).not.toMatch(/(?:window\.)?setTimeout\s*\(/);
    expect(timelineSrc).toMatch(/tl\.call\(\(\) => layer\.remove\(\)/);
  });

  it('implements hitstop by pausing, not by an empty placeholder tween', () => {
    // `tl.to({}, {duration})` does not freeze anything — verified against GSAP.
    expect(timelineSrc).toMatch(/tl\.pause\(\)/);
    expect(timelineSrc).not.toMatch(/\.to\(\{\}, \{ duration: hitstop \}/);
    expect(ffaSrc).toMatch(/tl\.pause\(\)/);
    expect(ffaSrc).not.toMatch(/\.to\(\{\}, \{ duration: hitstop \}/);
  });

  it('cancels an in-flight strike before starting the next one', () => {
    // At 80+ WPM strikes arrive faster than an animation completes.
    for (const [name, src] of [
      ['DuelArena', arenaSrc],
      ['DuelArenaFFA', ffaSrc],
    ] as const) {
      expect(src, `${name} does not kill the previous strike`).toMatch(/inFlight\.kill\(\)/);
      expect(src, `${name} does not reset the fighter after a kill`).toMatch(/resetFighter\(/);
    }
  });

  it('resets every animated limb, so a cancelled strike leaves no drift', () => {
    const reset = timelineSrc.slice(timelineSrc.indexOf('export function resetFighter'));
    const body = reset.slice(0, reset.indexOf('\n}\n'));
    for (const part of ['swordArm', 'offArm', 'torso', 'head', 'hair', 'sash', 'frontLeg', 'backLeg']) {
      expect(body, `resetFighter misses ${part}`).toContain(part);
    }
    expect(body).toContain('trail');
  });
});

describe('attack pacing', () => {
  // Animations must not outlast the typing that triggers them.
  it('every attack completes fast enough to keep up with fast typing', () => {
    for (const spec of Object.values(ATTACKS)) {
      const contact = spec.windup + spec.travel;
      const total = contact + spec.hitstop + 0.36 * (1 + spec.weight * 0.2);
      expect(contact, `${spec.id} contact`).toBeLessThan(0.45);
      expect(total, `${spec.id} total`).toBeLessThan(1.1);
    }
  });

  it('lands the impact before the animation is half over', () => {
    for (const spec of Object.values(ATTACKS)) {
      const contact = spec.windup + spec.travel;
      const total = contact + spec.hitstop + 0.36 * (1 + spec.weight * 0.2);
      expect(contact / total, `${spec.id} is back-loaded`).toBeLessThan(0.55);
    }
  });
});

describe('idle loop and strike do not fight over the same property', () => {
  it('never tweens the attacker body y, which the idle breath owns', () => {
    // Two tweens on one property leave the figure displaced once the strike ends.
    expect(timelineSrc).not.toMatch(/\.to\(\s*attacker,\s*\{[^}]*\by\s*:/);
  });

  it('suspends the rotation-based idle sway while a strike plays', () => {
    // The sway shares `rotation` with every limb the strike drives.
    expect(arenaSrc).toMatch(/idleSway/);
    expect(arenaSrc).toMatch(/tween\.pause\(\)/);
    expect(arenaSrc).toMatch(/tween\.resume\(\)/);
  });

  it('holds the sway until BOTH sides have finished striking', () => {
    // Resuming while the opponent is still mid-swing re-introduces the conflict.
    expect(arenaSrc).toMatch(/if \(activeStrikes\.current\[defenderKey\]\) return;/);
  });

  it('keeps breathing on y so it survives a strike uninterrupted', () => {
    expect(arenaSrc).toMatch(/\{ y: -4, duration: 2\.1, repeat: -1/);
  });
});

describe('streak orientation does not stick between attacks', () => {
  it('toggles the vertical class rather than only adding it', () => {
    // add() alone leaves --vertical applied after an overhead, so every later
    // horizontal slash would keep rendering as a vertical streak.
    expect(timelineSrc).toMatch(/classList\.toggle\('duel-arena__slash--vertical', !!spec\.streakVertical\)/);
    expect(timelineSrc).not.toMatch(/replayClass\([^)]*slash--vertical[^)]*:[^)]*slash--across/);
  });

  it('toggles the cross-cut class the same way', () => {
    expect(timelineSrc).toMatch(/classList\.toggle\('duel-arena__slash--double', !!spec\.doubleStreak\)/);
  });

  it('actually uses both streak orientations in the move set', () => {
    // If no attack set these flags the toggles above would be dead code.
    // (The matching CSS rules are asserted by the repo-wide class audit.)
    expect(Object.values(ATTACKS).filter((a) => a.streakVertical).length).toBeGreaterThan(0);
    expect(Object.values(ATTACKS).filter((a) => a.doubleStreak).length).toBeGreaterThan(0);
  });
});
