import { describe, it, expect } from 'vitest';
import { advance, newTutorial, roadPrompts, choiceFromAnswer, migratedTutorial, PENDING, STEP_NUMBER, type TutorialState } from './lesson';
const run = (s: TutorialState, ...events: Parameters<typeof advance>[1][]) => events.reduce(advance, s);
describe('first evening, steps 1 and 2', () => {
  it('starts on the road with the opening unshown and no prompts until it is', () => {
    const s = newTutorial();
    expect(s).toMatchObject({ step: 'road', opened: false, choice: null });
    expect(roadPrompts(s, 4)).toEqual([]);
    expect(roadPrompts(advance(s, { type: 'opened' }), 4)).toEqual(['move', 'look']);
  });
  it('the opening is once', () => {
    const a = run(newTutorial(), { type: 'opened' });
    expect(advance(a, { type: 'opened' })).toBe(a);
  });
  it('each prompt goes once used; sprint waits for a few seconds of walking', () => {
    let s = run(newTutorial(), { type: 'opened' }, { type: 'walked', seconds: 1 });
    expect(roadPrompts(s, 4)).toEqual(['look']);
    s = run(s, { type: 'looked' }, { type: 'walked', seconds: 3 });
    expect(roadPrompts(s, 4)).toEqual(['sprint']);
    s = advance(s, { type: 'sprinted' });
    expect(roadPrompts(s, 4)).toEqual([]);
    expect(advance(s, { type: 'walked', seconds: 0 })).toBe(s);
  });
  it('sprinting before the prompt means it never shows', () => {
    const s = run(newTutorial(), { type: 'opened' }, { type: 'sprinted' }, { type: 'walked', seconds: 10 });
    expect(roadPrompts(s, 4)).not.toContain('sprint');
  });
  it('reaching the door, then "Show me" routes to the yard (step 3, pending)', () => {
    const s = run(newTutorial(), { type: 'reachedDoor' }, { type: 'chose', choice: 'show' });
    expect(s).toMatchObject({ step: 'yard', choice: 'show' }); expect(STEP_NUMBER[s.step]).toBe(3);
    expect(PENDING.yard).toMatch(/26/);
  });
  it('"I\'ve held a bow before" skips to the lantern (step 6, pending)', () => {
    const s = run(newTutorial(), { type: 'reachedDoor' }, { type: 'chose', choice: 'skip' });
    expect(s).toMatchObject({ step: 'lantern', choice: 'skip' }); expect(STEP_NUMBER[s.step]).toBe(6);
    expect(PENDING.lantern).toMatch(/27/);
  });
  it('the choice is made once', () => {
    const s = run(newTutorial(), { type: 'reachedDoor' }, { type: 'chose', choice: 'skip' });
    expect(advance(s, { type: 'chose', choice: 'show' })).toBe(s);
    expect(roadPrompts({ ...s, used: { move: false, look: false, sprint: false } }, 0)).toEqual([]);
  });
  it('answers map from authored ids only', () => {
    expect(choiceFromAnswer('evening.choice.0')).toBe('show');
    expect(choiceFromAnswer('evening.choice.1')).toBe('skip');
    expect(choiceFromAnswer(null)).toBeNull(); expect(choiceFromAnswer('evening.choice.2')).toBeNull();
  });
  it('old saves skip the road but keep the choice', () => {
    const m = migratedTutorial();
    expect(m).toMatchObject({ opened: true, step: 'door', choice: null });
    expect(roadPrompts(m, 0)).toEqual([]);
  });
});
