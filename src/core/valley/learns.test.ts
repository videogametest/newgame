import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANSWERS, answersInForce, effectsAt, leanings, LEARNS_TUNING, linesToStage, openApproaches, type Taking } from './learns';

const taking = (over: Partial<Taking> = {}): Taking =>
  ({ placeId: 'mill', defendersBeaten: 7, headShots: 0, beatenAtNight: 0, quietRemovals: 0, bellStopped: false, beatenByFire: 0, ...over });
const habits = (t: Taking[]) => answersInForce(t).map(a => a.habit);

describe('the valley learns', () => {
  it('a player with no habits draws no answer', () => {
    expect(habits([])).toEqual([]);
    expect(habits([taking()])).toEqual([]);
    expect(effectsAt([taking()])).toEqual({});
  });

  it('a varied approach draws no answer', () => {
    const mixed = taking({ headShots: 2, beatenAtNight: 3, quietRemovals: 2, beatenByFire: 1 });
    expect(habits([mixed])).toEqual([]);
    expect(habits([mixed, { ...mixed, placeId: 'forge', defendersBeaten: 8 }])).toEqual([]);
  });

  it('leaning on head shots brings helmets to the next place', () => {
    const t = [taking({ headShots: 5 })];
    expect(habits(t)).toEqual(['head_shots']);
    expect(effectsAt(t)).toEqual({ helmets: ANSWERS.head_shots.effect.amount });
  });

  it.each([
    ['night', { beatenAtNight: 6 }],
    ['quiet_removals', { quietRemovals: 4 }],
    ['fire', { beatenByFire: 3 }],
    ['bell', { bellStopped: true }],
  ] as const)('leaning on %s is answered', (habit, counts) => {
    expect(habits([taking(counts)])).toEqual([habit]);
  });

  it('the same play always draws the same answer', () => {
    const t = [taking({ headShots: 5, beatenAtNight: 7 })];
    expect(answersInForce(t)).toEqual(answersInForce(t));
    expect(answersInForce(t)).toEqual(answersInForce([{ ...t[0] }]));
  });

  it('one answer after the first place, a second after the next, never more', () => {
    const sniper = taking({ headShots: 6, beatenAtNight: 7, bellStopped: true });
    expect(habits([sniper])).toHaveLength(1);
    expect(habits([sniper, { ...sniper, placeId: 'forge' }])).toHaveLength(2);
    expect(habits([sniper, { ...sniper, placeId: 'forge' }, { ...sniper, placeId: 'mill' }])).toHaveLength(LEARNS_TUNING.maxAnswers);
  });

  it('answers the heaviest habit first', () => {
    const t = taking({ headShots: 4, beatenAtNight: 7 });
    expect(leanings([t]).night).toBeGreaterThan(1);
    expect(habits([taking({ headShots: 7, beatenAtNight: 5 })])[0]).toBe('head_shots');
    expect(habits([taking({ headShots: 4, quietRemovals: 7 })])[0]).toBe('quiet_removals');
  });

  it('stopping the bell is ordinary good play: it is answered only when nothing else stands out', () => {
    expect(habits([taking({ bellStopped: true, headShots: 5 })])).toEqual(['head_shots']);
    expect(habits([taking({ bellStopped: true })])).toEqual(['bell']);
    expect(habits([taking({ bellStopped: true }), taking({ placeId: 'forge' })])).toEqual(['bell']);
  });

  it('an answer once given is never withdrawn, even if the hero changes', () => {
    const first = taking({ headShots: 6 });
    const changed = taking({ placeId: 'forge', defendersBeaten: 8, quietRemovals: 8 });
    expect(habits([first, changed])[0]).toBe('head_shots');
  });

  it('changing approach after being answered is rewarded: the new way is open', () => {
    const t = [taking({ headShots: 6 })];
    expect(openApproaches(t)).not.toContain('head_shots');
    expect(openApproaches(t).length).toBeGreaterThanOrEqual(3);
  });

  it('no set of answers ever covers every way in', () => {
    const everything = taking({ headShots: 7, beatenAtNight: 7, quietRemovals: 7, beatenByFire: 7, bellStopped: true });
    const t = [everything, { ...everything, placeId: 'forge' }, { ...everything, placeId: 'watch_house' }];
    expect(openApproaches(t).length).toBeGreaterThanOrEqual(1);
    for (const answer of Object.values(ANSWERS)) {
      expect(answer.wayRound).not.toContain(answer.habit);
      expect(answer.wayRound.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('follows the counts, not the story: place names and order of names change nothing', () => {
    const a = taking({ headShots: 6 });
    expect(habits([{ ...a, placeId: 'forge' }])).toEqual(habits([a]));
  });

  it('a single unusual night is diluted by how the hero usually plays', () => {
    const day = taking({ defendersBeaten: 8 });
    const night = taking({ placeId: 'forge', defendersBeaten: 4, beatenAtNight: 4 });
    expect(habits([day, night])).toEqual([]);
  });

  it('stages each announcing line once, and every line exists in the writing', () => {
    const t = [taking({ headShots: 6 })];
    expect(linesToStage(t, [])).toEqual(['overheard.learns.helmets']);
    expect(linesToStage(t, ['overheard.learns.helmets'])).toEqual([]);
    const writing = readFileSync('docs/writing/bandits.md', 'utf8');
    for (const answer of Object.values(ANSWERS)) expect(writing).toContain(`\`${answer.line}\``);
  });

  it('survives nonsense counts', () => {
    expect(habits([taking({ defendersBeaten: 0, headShots: 5 })])).toEqual([]);
    expect(habits([taking({ headShots: -3 })])).toEqual([]);
  });
});
