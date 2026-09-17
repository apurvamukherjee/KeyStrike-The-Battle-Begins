import { describe, it, expect } from 'vitest';
import { getActRange, getActTitle, getLevelScript, isRivalLevel, RIVAL_NAME } from './storyScript';
import { getStoryLevel, RIVAL_LEVELS, RIVAL_SWORDSMAN_INDEX, TOTAL_STORY_LEVELS } from './storyLevels';

const ALL = Array.from({ length: TOTAL_STORY_LEVELS }, (_, i) => i + 1);

describe('story script', () => {
  it('gives every level both an intro and an outro', () => {
    for (const level of ALL) {
      const script = getLevelScript(level);
      expect(script.before.length, `level ${level} before`).toBeGreaterThan(0);
      expect(script.after.length, `level ${level} after`).toBeGreaterThan(0);
    }
  });

  it('never emits an empty line', () => {
    for (const level of ALL) {
      const { before, after } = getLevelScript(level);
      for (const line of [...before, ...after]) {
        expect(line.text.trim().length, `level ${level}`).toBeGreaterThan(0);
      }
    }
  });

  it('opens each act with its scene-setting narration', () => {
    for (const level of [1, 11, 21, 31, 41]) {
      expect(getLevelScript(level).before[0].speaker).toBe('narrator');
    }
  });

  it('does not repeat the act opening on later levels of that act', () => {
    const opening = getLevelScript(11).before[0].text;
    for (const level of [12, 13, 14, 16]) {
      expect(getLevelScript(level).before.some((l) => l.text === opening)).toBe(false);
    }
  });

  it('gives the milestone levels bespoke, longer scenes', () => {
    for (const level of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]) {
      expect(getLevelScript(level).before.length, `level ${level}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('varies consecutive grunt fights rather than repeating one taunt', () => {
    const taunts = [12, 13, 14].map((l) => getLevelScript(l).before.find((x) => x.speaker === 'enemy')?.text);
    expect(new Set(taunts).size).toBe(3);
  });

  it('only uses known speakers', () => {
    for (const level of ALL) {
      const { before, after } = getLevelScript(level);
      for (const line of [...before, ...after]) {
        expect(['hero', 'enemy', 'narrator']).toContain(line.speaker);
      }
    }
  });

  it('titles every level with an act', () => {
    for (const level of ALL) expect(getActTitle(level).length).toBeGreaterThan(0);
  });

  it('covers all 50 levels with contiguous, non-overlapping acts', () => {
    const seen = new Set<number>();
    for (const level of ALL) {
      const { from, to } = getActRange(level);
      expect(level).toBeGreaterThanOrEqual(from);
      expect(level).toBeLessThanOrEqual(to);
      seen.add(from);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 11, 21, 31, 41]);
    expect(getActRange(50).to).toBe(TOTAL_STORY_LEVELS);
  });

  it('ends the campaign on the Sword Saint resolution', () => {
    const final = getLevelScript(50);
    expect(final.after.at(-1)?.speaker).toBe('narrator');
    expect(final.after.at(-1)?.text).toContain('down the mountain');
  });
});

describe('the recurring rival', () => {
  it('has a scene on exactly the levels where she is the opponent', () => {
    for (const level of ALL) {
      expect(isRivalLevel(level), `level ${level}`).toBe(RIVAL_LEVELS.has(level));
    }
  });

  it('is named consistently in her scenes and in the fight', () => {
    for (const level of RIVAL_LEVELS) {
      const { before, after } = getLevelScript(level);
      const named = [...before, ...after].filter((l) => l.speaker === 'enemy');
      expect(named.length, `level ${level} has no rival lines`).toBeGreaterThan(0);
      for (const line of named) expect(line.name).toBe(RIVAL_NAME);
      expect(getStoryLevel(level)?.name).toBe(RIVAL_NAME);
    }
  });

  it('appears across every act, not bunched into one', () => {
    const acts = new Set([...RIVAL_LEVELS].map((l) => getActRange(l).from));
    expect(acts.size).toBe(5);
  });

  it('keeps one face for the whole campaign', () => {
    for (const level of RIVAL_LEVELS) {
      expect(getStoryLevel(level)?.swordsmanIndex).toBe(RIVAL_SWORDSMAN_INDEX);
    }
  });

  it('never collides with a milestone boss level', () => {
    for (const level of RIVAL_LEVELS) expect(level % 5).not.toBe(0);
  });
});
