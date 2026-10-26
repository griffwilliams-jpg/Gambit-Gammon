import { describe, expect, it } from 'vitest';
import { applyAction, getLegalActions } from '../src/engine/index.js';
import { apply, countAt, firstMove, moveSummary, scenario } from './helpers.js';

describe('compulsory dice use', () => {
  it('excludes a legal-looking move that would prevent using both dice', () => {
    // 10>5 with the 5 leaves the 2 unplayable (5>3 and 15>13 blocked).
    const state = scenario({ player: 'white', dice: [5, 2], white: { 15: 1, 10: 1 }, black: { 13: 2, 3: 2 } });
    expect(moveSummary(state)).toEqual(['10>8/2', '15>10/5']);
  });

  it('requires the higher die when only one of two different dice can be used', () => {
    // From 9, a 3 (to 6) or a 4 (to 5) is playable, but 2 is blocked so not both.
    const state = scenario({ player: 'white', dice: [3, 4], white: { 9: 1 }, black: { 2: 2 } });
    expect(moveSummary(state)).toEqual(['9>5/4']);
    const after = apply(state, firstMove(state, 9, 5, 4));
    expect(moveSummary(after)).toEqual(['end-turn']);
  });

  it('allows the lower die when the higher die cannot be played at all', () => {
    const state = scenario({ player: 'white', dice: [3, 4], white: { 9: 1 }, black: { 5: 2, 2: 2 } });
    expect(moveSummary(state)).toEqual(['9>6/3']);
  });

  it('gives four movements for doubles and requires as many as possible', () => {
    let state = scenario({ player: 'white', dice: [2, 2], white: { 13: 2 }, black: { 7: 2 } });
    expect(state.turn?.dice?.remaining).toEqual([2, 2, 2, 2]);
    // 13>11>9 is open; 9>7 is blocked, so each checker can move at most twice.
    for (let i = 0; i < 4; i++) {
      const action = getLegalActions(state).find((a) => a.type === 'move-checker');
      if (!action) throw new Error(`Expected a fourth move; legal: ${moveSummary(state).join(' ')}`);
      state = apply(state, action);
    }
    expect(countAt(state, 'white', 9)).toBe(2);
    expect(moveSummary(state)).toEqual(['end-turn']);
  });

  it('offers only end-turn when no die can be used, recording the unusable dice', () => {
    const blocking = { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2 };
    const state = scenario({ player: 'white', dice: [6, 3], white: { bar: 1, 13: 4 }, black: blocking });
    expect(moveSummary(state)).toEqual(['end-turn']);
    const result = applyAction(state, getLegalActions(state).find((a) => a.type === 'end-turn')!);
    if (!result.ok) throw new Error(result.message);
    expect(result.events.slice(0, 2)).toEqual([
      { type: 'dice-unusable', player: 'white', dice: [6, 3] },
      { type: 'turn-ended', player: 'white', ownTurnNumber: 1 },
    ]);
    expect(result.state.pending).toEqual({ kind: 'roll', player: 'black' });
    expect(result.state.completedOwnTurns.white).toBe(1);
  });
});

describe('bar, hits and bearing off', () => {
  it('requires barred checkers to enter before any other movement', () => {
    const state = scenario({ player: 'white', dice: [3, 5], white: { bar: 1, 13: 1 }, black: { 22: 2 } });
    expect(moveSummary(state)).toEqual(['bar>20/5']);
    const entered = apply(state, firstMove(state, 'bar', 20, 5));
    expect(moveSummary(entered)).toEqual(['13>10/3', '20>17/3']);
  });

  it('enters black from the bar on its own side of the board', () => {
    const state = scenario({ player: 'black', dice: [4, 2], black: { bar: 1, 12: 1 }, white: { 4: 2 } });
    expect(moveSummary(state)).toEqual(['bar>2/2']);
  });

  it('hits a single opposing checker and sends it to the bar', () => {
    const state = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 10: 1, 1: 2 } });
    const action = firstMove(state, 13, 10, 3);
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(result.message);
    const hitId = state.checkers.find((c) => c.owner === 'black' && c.location.kind === 'point' && c.location.point === 10)!.id;
    expect(result.events).toContainEqual({ type: 'checker-hit', player: 'white', checkerId: hitId, point: 10 });
    expect(result.state.checkers.find((c) => c.id === hitId)!.location).toEqual({ kind: 'bar' });
  });

  it('does not allow landing on a point held by two or more opposing checkers', () => {
    const state = scenario({ player: 'white', dice: [3, 1], white: { 13: 1 }, black: { 10: 2 } });
    expect(moveSummary(state)).not.toContain('13>10/3');
  });

  it('bears off with exact or higher dice from the furthest point, then wins', () => {
    const state = scenario({ player: 'white', dice: [6, 5], white: { 3: 1, 2: 1 }, black: { 24: 2 } });
    expect(moveSummary(state)).toEqual(['3>off/5', '3>off/6']);
    const first = apply(state, firstMove(state, 3, 'off', 6));
    expect(moveSummary(first)).toEqual(['2>off/5']);
    const result = applyAction(first, firstMove(first, 2, 'off', 5));
    if (!result.ok) throw new Error(result.message);
    expect(result.events.at(-1)).toEqual({ type: 'game-won', player: 'white' });
    expect(result.state.phase).toEqual({ kind: 'finished', winner: 'white' });
    expect(result.state.pending).toBeNull();
    expect(getLegalActions(result.state)).toEqual([]);
  });

  it('does not bear off while any checker is outside the home board', () => {
    const state = scenario({ player: 'white', dice: [6, 4], white: { 7: 1, 4: 1 }, black: { 24: 2 } });
    expect(moveSummary(state).filter((m) => m.includes('off'))).toEqual([]);
  });

  it('lists each identifiable checker on a source point as a separate move', () => {
    const state = scenario({ player: 'white', dice: [6, 1], white: { 13: 3 }, black: { 1: 2 } });
    const ids = getLegalActions(state)
      .filter((a) => a.type === 'move-checker' && a.from === 13 && a.die === 6)
      .map((a) => (a.type === 'move-checker' ? a.checkerId : ''));
    expect(ids).toEqual(['white-01', 'white-02', 'white-03']);
  });
});
