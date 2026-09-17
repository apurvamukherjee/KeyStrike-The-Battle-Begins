import { describe, it, expect } from 'vitest';
import { ATTACKS, FINISHER_COMBO, HEAVY_COMBO, pickAttack, type AttackId } from './attacks';

describe('pickAttack', () => {
  it('promotes any strike at the finisher combo to the spin', () => {
    expect(pickAttack('good', FINISHER_COMBO, 0).id).toBe('spin');
    expect(pickAttack('perfect', FINISHER_COMBO + 40, 3).id).toBe('spin');
  });

  it('gives a good word the quick slash below the finisher combo', () => {
    expect(pickAttack('good', 0, 0).id).toBe('slash');
    expect(pickAttack('good', FINISHER_COMBO - 1, 7).id).toBe('slash');
  });

  it('gives a perfect word a heavy cut', () => {
    const heavy: AttackId[] = ['overhead', 'thrust', 'rising'];
    for (let seq = 0; seq < 6; seq++) {
      expect(heavy).toContain(pickAttack('perfect', 1, seq).id);
    }
  });

  it('cycles the heavy cuts so consecutive perfects vary', () => {
    const ids = [0, 1, 2].map((seq) => pickAttack('perfect', 1, seq).id);
    expect(new Set(ids).size).toBe(3);
  });

  // React can render the same strike twice; an attack picked randomly would
  // change mid-animation.
  it('is deterministic for a given seq', () => {
    expect(pickAttack('perfect', 4, 11).id).toBe(pickAttack('perfect', 4, 11).id);
  });

  it('uses the light jab for an unknown judgement (an opponent swing)', () => {
    expect(pickAttack(undefined, 0, 0).id).toBe('jab');
    expect(pickAttack('miss', 0, 0).id).toBe('jab');
  });

  it('escalates perfect words to the showpiece cuts as the combo builds', () => {
    const low = [0, 1, 2].map((seq) => pickAttack('perfect', HEAVY_COMBO - 1, seq).id);
    const high = [0, 1, 2].map((seq) => pickAttack('perfect', HEAVY_COMBO, seq).id);
    expect(low).not.toEqual(high);
    expect(high).toContain('crossCut');
    expect(high).toContain('iai');
  });

  it('keeps the finisher above every other attack in weight', () => {
    const others = Object.values(ATTACKS).filter((a) => a.id !== 'spin');
    for (const a of others) expect(ATTACKS.spin.weight).toBeGreaterThan(a.weight);
  });

  it('orders the light cuts below the heavy ones', () => {
    expect(ATTACKS.jab.weight).toBeLessThan(ATTACKS.slash.weight);
    expect(ATTACKS.slash.weight).toBeLessThan(ATTACKS.crossCut.weight);
    expect(ATTACKS.crossCut.weight).toBeLessThan(ATTACKS.iai.weight);
  });

  it('gives the jab the fastest wind-up so sloppy runs stay responsive', () => {
    for (const a of Object.values(ATTACKS)) {
      if (a.id !== 'jab') expect(a.windup).toBeGreaterThanOrEqual(ATTACKS.jab.windup);
    }
  });

  it('every attack lands its impact after its wind-up', () => {
    for (const spec of Object.values(ATTACKS)) {
      expect(spec.windup).toBeGreaterThan(0);
      expect(spec.travel).toBeGreaterThan(0);
    }
  });

  it('heavier attacks hit harder than lighter ones', () => {
    expect(ATTACKS.spin.weight).toBeGreaterThan(ATTACKS.overhead.weight);
    expect(ATTACKS.overhead.weight).toBeGreaterThan(ATTACKS.slash.weight);
    expect(ATTACKS.spin.hitstop).toBeGreaterThan(ATTACKS.slash.hitstop);
  });

  it('only the finisher flashes the screen', () => {
    const flashing = Object.values(ATTACKS).filter((a) => a.flash);
    expect(flashing.map((a) => a.id)).toEqual(['spin']);
  });
});
