import { describe, expect, it } from 'vitest';
import { getLegalActions, type GameAction, type GameState } from '../src/engine/index.js';
import { actionTypes, apply, applyWithEvents, countAt, find, firstMove, moveSummary, scenario } from './helpers.js';

function powers(state: GameState): Extract<GameAction, { type: 'play-power' }>[] {
  return getLegalActions(state).filter((a): a is Extract<GameAction, { type: 'play-power' }> => a.type === 'play-power');
}

function play(state: GameState, match: (a: Extract<GameAction, { type: 'play-power' }>) => boolean): GameState {
  const action = powers(state).find(match);
  if (!action) throw new Error(`No matching power; have ${powers(state).map((p) => JSON.stringify(p.params)).join(' ')}`);
  return apply(state, action);
}

const endTurn = (state: GameState) => apply(state, find(state, (a) => a.type === 'end-turn'));

describe('High Card boost', () => {
  it('boosts one die by the card value as one indivisible move', () => {
    const state = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 1: 2 }, hands: { white: ['KS'] } });
    expect(powers(state).map((p) => p.params)).toEqual([
      { power: 'high-card', die: 3, boost: 3 },
      { power: 'high-card', die: 1, boost: 3 },
    ]);
    const boosted = play(state, (p) => p.params.power === 'high-card' && p.params.die === 3);
    expect(boosted.turn?.dice?.remaining).toEqual([6, 1]);
    expect(moveSummary(boosted)).toContain('13>7/6');
    expect(boosted.turn?.playedCards).toEqual(['KS']);
    expect(boosted.players.white.hand).toEqual([]);
  });

  it('cannot use a boosted value above six to enter from the bar', () => {
    const state = scenario({ player: 'white', dice: [3, 1], white: { bar: 1, 13: 1 }, black: { 1: 2 }, hands: { white: ['AS'] } });
    // 3 + 4 = 7 cannot enter; 1 + 4 = 5 can.
    expect(powers(state).map((p) => p.params)).toEqual([{ power: 'high-card', die: 1, boost: 4 }]);
  });

  it('allows an ordinary die to reach 10 but no higher', () => {
    const state = scenario({ player: 'white', dice: [6, 5], white: { 24: 1 }, black: { 1: 2 }, hands: { white: ['AS'] } });
    expect(powers(state).map((p) => p.params)).toEqual([
      { power: 'high-card', die: 6, boost: 4 },
      { power: 'high-card', die: 5, boost: 4 },
    ]);
  });
});

describe('dice powers', () => {
  it('Pair Reroll rerolls one chosen die', () => {
    const state = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 1: 2 }, hands: { white: ['5S', '5H'] } });
    expect(powers(state).map((p) => p.params)).toEqual([
      { power: 'pair', die: 0 },
      { power: 'pair', die: 1 },
    ]);
    const { state: after, events } = applyWithEvents(state, powers(state).find((p) => p.params.power === 'pair' && p.params.die === 1)!);
    expect(events).toContainEqual(expect.objectContaining({ type: 'dice-rolled', reason: 'pair' }));
    expect(after.turn?.dice?.effective[0]).toBe(3);
    expect(after.turn?.dice?.initialRoll).toEqual([3, 1]);
  });

  it('Four of a Kind sets one die; created doubles give four moves but no natural-doubles reward', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 4 },
      black: { 1: 2 },
      hands: { white: ['9S', '9H', '9C', '9D'] },
    });
    const after = play(state, (p) => p.params.power === 'four-of-a-kind' && p.params.die === 1 && p.params.value === 3);
    expect(after.turn?.dice?.effective).toEqual([3, 3]);
    expect(after.turn?.dice?.remaining).toEqual([3, 3, 3, 3]);
    expect(after.players.white.doubles).toEqual({ cumulative: 0, streak: 0 });
    expect(after.players.white.hand).toEqual([]);
  });

  it('Straight Flush sets both dice', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 1: 2 },
      hands: { white: ['5H', '6H', '7H', '8H', '9H'] },
    });
    const after = play(state, (p) => p.params.power === 'straight-flush' && p.params.values[0] === 6 && p.params.values[1] === 5);
    expect(after.turn?.dice?.remaining).toEqual([6, 5]);
  });

  it('Straight can reroll both dice and keep either pair', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 1: 2 },
      hands: { white: ['5S', '6H', '7C', '8D', '9S'] },
    });
    const pending = play(state, (p) => p.params.power === 'straight' && p.params.mode === 'reroll');
    expect(pending.pending?.kind).toBe('choose-straight-dice');
    const kept = apply(pending, find(pending, (a) => a.type === 'choose-straight-dice' && a.keep === 'original'));
    expect(kept.turn?.dice?.effective).toEqual([3, 1]);
  });

  it("Straight can instead force the opponent to reroll on their next turn", () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 1: 2 },
      hands: { white: ['5S', '6H', '7C', '8D', '9S'] },
    });
    let after = play(state, (p) => p.params.power === 'straight' && p.params.mode === 'force-opponent');
    expect(after.players.black.forcedRerollPending).toBe(true);
    after = apply(after, firstMove(after, 13, 10, 3));
    after = apply(after, firstMove(after, 13, 12, 1));
    after = endTurn(after);
    expect(after.pending).toEqual({ kind: 'roll', player: 'black' });
    const { state: rolled, events } = applyWithEvents(after, find(after, (a) => a.type === 'roll-dice'));
    expect(events.filter((e) => e.type === 'dice-rolled').map((e) => (e as { reason: string }).reason)).toEqual(['turn', 'forced']);
    expect(rolled.players.black.forcedRerollPending).toBe(false);
  });
});

describe('movement powers', () => {
  it('Two Pair allows one backward checker movement', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 10: 2 },
      black: { 1: 2 },
      hands: { white: ['5S', '5H', '9C', '9D'] },
    });
    const after = play(state, (p) => p.params.power === 'two-pair');
    expect(moveSummary(after)).toContain('10>13/3r');
    const reversed = apply(after, find(after, (a) => a.type === 'move-checker' && a.reverse === 'power' && a.die === 3));
    expect(moveSummary(reversed).some((m) => m.endsWith('r'))).toBe(false);
  });

  it('Three of a Kind lets every movement go either way', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 10: 2 },
      black: { 1: 2 },
      hands: { white: ['5S', '5H', '5C'] },
    });
    const after = play(state, (p) => p.params.power === 'three-of-a-kind');
    const reversed = apply(after, firstMove(after, 10, 13, 3));
    expect(moveSummary(reversed)).toContain('10>11/1r');
  });

  it('never allows reverse entry or backward bearing off', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { bar: 1, 10: 1 },
      black: { 1: 2 },
      hands: { white: ['5S', '5H', '5C'] },
    });
    const after = play(state, (p) => p.params.power === 'three-of-a-kind');
    expect(moveSummary(after)).toEqual(['bar>22/3', 'bar>24/1']);
  });

  it('locks backward movement out of the home board after the first bear-off', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 5: 2 },
      black: { 24: 2 },
      hands: { white: ['5S', '5H', '5C'] },
    });
    const after = play(state, (p) => p.params.power === 'three-of-a-kind');
    // 13 checkers already borne off: 5>8 would leave home.
    expect(moveSummary(after)).not.toContain('5>8/3r');
    expect(moveSummary(after)).toContain('5>6/1r');
  });

  it('Full House swaps two own points within a quadrant, preserving identities', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 6: 3, 4: 1 },
      black: { 24: 2, 5: 1 },
      hands: { white: ['8S', '8H', '8C', '3D', '3S'] },
    });
    const pairs = powers(state)
      .filter((p) => p.params.power === 'full-house')
      .map((p) => (p.params.power === 'full-house' ? p.params.points.join('-') : ''));
    // Point 5 holds a black checker; equal empty points are excluded.
    expect(pairs).toContain('4-6');
    expect(pairs).not.toContain('5-6');
    expect(pairs).not.toContain('1-2');
    const onFour = state.checkers.find((c) => c.location.kind === 'point' && c.location.point === 4)!.id;
    const after = play(state, (p) => p.params.power === 'full-house' && p.params.points.join('-') === '4-6');
    expect(countAt(after, 'white', 4)).toBe(3);
    expect(countAt(after, 'white', 6)).toBe(1);
    expect(after.checkers.find((c) => c.id === onFour)!.location).toEqual({ kind: 'point', point: 6 });
  });

  it('Full House cannot activate with a checker on the bar', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { bar: 1, 6: 3, 4: 1 },
      black: { 24: 2 },
      hands: { white: ['8S', '8H', '8C', '3D', '3S'] },
    });
    expect(powers(state).filter((p) => p.params.power === 'full-house')).toEqual([]);
  });
});

describe('Flush shield', () => {
  it('stops the opponent landing on the shielded blot until the end of their next turn', () => {
    let state = scenario({
      player: 'white',
      dice: [6, 5],
      white: { 10: 1, 24: 2 },
      black: { 4: 2 },
      hands: { white: ['2D', '7D', '9D', 'JD', 'KD'] },
    });
    const shieldedId = state.checkers.find((c) => c.owner === 'white' && c.location.kind === 'point' && c.location.point === 10)!.id;
    state = play(state, (p) => p.params.power === 'flush' && p.params.checkerId === shieldedId);
    expect(state.shields).toEqual([{ checkerId: shieldedId, owner: 'white', source: 'flush' }]);
    state = apply(state, firstMove(state, 24, 18, 6));
    state = apply(state, firstMove(state, 24, 19, 5));
    state = endTurn(state);
    // Black would hit 10 from 4 with a 6; the shield blocks it.
    state = {
      ...state,
      turn: { ...state.turn!, dice: { initialRoll: [6, 1], initialRollSource: 'turn-roll', effective: [6, 1], remaining: [6, 1] } },
      pending: { kind: 'move', player: 'black' },
      queue: [],
    };
    expect(moveSummary(state)).not.toContain('4>10/6');
    state = apply(state, firstMove(state, 4, 5, 1));
    state = apply(state, getLegalActions(state).find((a) => a.type === 'move-checker' || a.type === 'end-turn')!);
    if (state.pending?.kind === 'move') state = endTurn(state);
    expect(state.shields).toEqual([]);
  });
});

describe('power limits and Royal Flush', () => {
  it('allows only one power, and only before the first movement', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 1: 2 },
      hands: { white: ['KS', '5S', '5H'] },
    });
    const afterPower = play(state, (p) => p.params.power === 'pair');
    expect(powers(afterPower)).toEqual([]);
    const afterMove = apply(state, firstMove(state, 13, 10, 3));
    expect(powers(afterMove)).toEqual([]);
  });

  it('cannot play cards gained through a hit this turn', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 1: 2 },
      hands: { white: ['KS'] },
      players: { white: { lockedCards: ['KS'] } },
    });
    expect(powers(state)).toEqual([]);
  });

  it('declares a Royal Flush at turn end for one bonus turn that cannot chain', () => {
    let state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 1: 2 },
      hands: { white: ['10S', 'JS', 'QS', 'KS', 'AS'] },
    });
    expect(actionTypes(state)).not.toContain('declare-royal-flush');
    state = apply(state, firstMove(state, 13, 10, 3));
    state = apply(state, firstMove(state, 13, 12, 1));
    expect(actionTypes(state)).toContain('declare-royal-flush');
    const { state: bonus, events } = applyWithEvents(state, find(state, (a) => a.type === 'declare-royal-flush'));
    expect(events).toContainEqual({ type: 'royal-flush-declared', player: 'white' });
    expect(events).toContainEqual(expect.objectContaining({ type: 'turn-started', player: 'white', bonus: true }));
    expect(bonus.discardPile).toEqual(expect.arrayContaining(['10S', 'JS', 'QS', 'KS', 'AS']));
    expect(bonus.turn?.bonus).toBe(true);
    expect(bonus.completedOwnTurns.white).toBe(1);
  });

  it('does not offer Royal Flush after another power was used', () => {
    let state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 1: 2 },
      hands: { white: ['10S', 'JS', 'QS', 'KS', 'AS', '5H', '5D'] },
    });
    state = play(state, (p) => p.params.power === 'pair' && p.params.die === 0);
    while (moveSummary(state).some((m) => m !== 'end-turn')) {
      state = apply(state, getLegalActions(state).find((a) => a.type === 'move-checker')!);
    }
    expect(actionTypes(state)).not.toContain('declare-royal-flush');
  });
});
