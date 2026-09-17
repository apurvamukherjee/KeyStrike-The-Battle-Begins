import { describe, it, expect } from 'vitest';
// Vite's ?raw import — reads the component's own source without pulling in
// @types/node just for this check.
import src from './Swordsman.tsx?raw';
import { SWORDSMAN_PART } from './Swordsman';

/**
 * strikeTimeline drives the figure by querying each part's class name. A
 * rename in the SVG would leave the query returning null and the limb simply
 * never moving — silent, and invisible to the type checker.
 */
describe('Swordsman animated parts', () => {
  for (const [key, cls] of Object.entries(SWORDSMAN_PART)) {
    it(`renders ${key} as .${cls}`, () => {
      expect(src).toContain(`"${cls}"`);
    });
  }

  it('gives every rotating part an explicit pivot', () => {
    // A part rotated without transformOrigin pivots at the SVG corner and
    // visibly detaches from the body.
    const pivoted = [
      SWORDSMAN_PART.swordArm,
      SWORDSMAN_PART.offArm,
      SWORDSMAN_PART.torso,
      SWORDSMAN_PART.head,
      SWORDSMAN_PART.hair,
      SWORDSMAN_PART.sash,
      SWORDSMAN_PART.frontLeg,
      SWORDSMAN_PART.backLeg,
    ];
    for (const cls of pivoted) {
      const at = src.indexOf(`"${cls}"`);
      expect(at, `${cls} missing`).toBeGreaterThan(-1);
      // The transformOrigin travels on the same element tag as the class.
      const tagEnd = src.indexOf('>', at);
      expect(src.slice(at, tagEnd), `${cls} has no transformOrigin`).toContain('transformOrigin');
    }
  });
});
