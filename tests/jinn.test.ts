import { describe, expect, it } from 'vitest';
import { getLegalActions, type GameState } from '../src/engine/index.js';
import { actionTypes, apply, applyWithEvents, find, firstMove, rigDice, scenario, startTurnFor } from './helpers.js';

const endTurn = (state: GameState) => apply(state, find(state, (a) => a.type === 'end-turn'));

describe('Jinn activation timing', () => {
  it('ignores a Jinn acquired this turn until the following turn', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 10: 1, 1: 2 },
      jinn: { white: [{ id: 'basim', activeFromTurn: 2, target: null }] },
    });
    const { events } = applyWithEvents(state, firstMove(state, 13, 10, 3));
    expect(events.some((e) => e.type === 'jinn-triggered')).toBe(false);
  });
});

describe('hit-triggered Jinn', () => {
  it('Basim reveals two cards on the first hit; one is kept (locked) and the other discarded', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 10: 1, 1: 2 },
      jinn: { white: ['basim'] },
    });
    const top = state.deck.slice(0, 2);
    const revealed = apply(state, firstMove(state, 13, 10, 3));
    expect(revealed.pending).toEqual({ kind: 'choose-basim-card', player: 'white', revealed: top });
    const chosen = apply(revealed, find(revealed, (a) => a.type === 'choose-basim-card' && a.cardId === top[1]));
    expect(chosen.players.white.hand).toEqual([top[1]]);
    expect(chosen.players.white.lockedCards).toEqual([top[1]]);
    expect(chosen.discardPile).toContain(top[0]);
  });

  it('Hadi marks an opposing checker at turn start; hitting it draws an extra card', () => {
    let state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 10: 1, 1: 2 },
      jinn: { white: ['hadi'] },
    });
    const blot = state.checkers.find((c) => c.owner === 'black' && c.location.kind === 'point' && c.location.point === 10)!.id;
    state = { ...state, turn: { ...state.turn!, hadiMark: blot } };
    const { state: after, events } = applyWithEvents(state, firstMove(state, 13, 10, 3));
    expect(events).toContainEqual({ type: 'jinn-triggered', player: 'white', jinn: 'hadi', detail: 'marked checker hit' });
    expect(after.players.white.hand).toHaveLength(2);
    expect(after.players.white.lockedCards).toHaveLength(2);
  });

  it('Rakhim draws an extra card when his enchanted checker hits', () => {
    const base = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 10: 1, 1: 2 } });
    const hitter = base.checkers.find((c) => c.owner === 'white' && c.location.kind === 'point')!.id;
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 10: 1, 1: 2 },
      jinn: { white: [{ id: 'rakhim', activeFromTurn: 1, target: hitter }] },
    });
    const move = find(state, (a) => a.type === 'move-checker' && a.checkerId === hitter && a.to === 10);
    const { state: after, events } = applyWithEvents(state, move);
    expect(events).toContainEqual(expect.objectContaining({ jinn: 'rakhim' }));
    expect(after.players.white.hand).toHaveLength(2);
  });

  it("Nahla lets the hit player choose the forced discard once per opponent turn", () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 10: 1, 1: 2 },
      hands: { black: ['2C', '9H'] },
      jinn: { black: ['nahla'] },
    });
    const after = apply(state, firstMove(state, 13, 10, 3));
    expect(after.pending).toEqual({ kind: 'choose-nahla-discard', player: 'black' });
    expect(getLegalActions(after, 'black').map((a) => (a.type === 'discard-card' ? a.cardId : ''))).toEqual(['2C', '9H']);
    const chosen = apply(after, find(after, (a) => a.type === 'discard-card' && a.cardId === '2C'));
    expect(chosen.players.black.hand).toEqual(['9H']);
    expect(chosen.pending).toEqual({ kind: 'move', player: 'white' });
  });
});

describe('roll and movement Jinn', () => {
  it('Qamar draws one extra card on qualifying natural doubles', () => {
    const start = rigDice(startTurnFor({ player: 'white', white: { 13: 2 }, black: { 1: 2 }, jinn: { white: ['qamar'] } }), [2, 2]);
    expect(start.pending).toEqual({ kind: 'roll', player: 'white' });
    const { state, events } = applyWithEvents(start, find(start, (a) => a.type === 'roll-dice'));
    expect(events).toContainEqual(expect.objectContaining({ type: 'jinn-triggered', jinn: 'qamar' }));
    expect(state.players.white.hand).toHaveLength(3);
  });

  it('Zafir offers two candidate values for Pair Reroll', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 1: 2 },
      hands: { white: ['5S', '5H'] },
      jinn: { white: ['zafir'] },
    });
    const after = apply(state, find(state, (a) => a.type === 'play-power' && a.params.power === 'pair' && a.params.die === 0));
    expect(after.pending?.kind).toBe('choose-zafir-value');
    const pending = after.pending as Extract<GameState['pending'], { kind: 'choose-zafir-value' }>;
    const chosen = apply(after, find(after, (a) => a.type === 'choose-zafir-value' && a.value === pending.candidates[1]));
    expect(chosen.turn?.dice?.effective).toEqual([pending.candidates[1], 1]);
  });

  it("Amira's checker may make one backward move per turn", () => {
    const base = scenario({ player: 'white', dice: [3, 1], white: { 10: 2 }, black: { 1: 2 } });
    const enchanted = base.checkers.find((c) => c.owner === 'white' && c.location.kind === 'point')!.id;
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 10: 2 },
      black: { 1: 2 },
      jinn: { white: [{ id: 'amira', activeFromTurn: 1, target: enchanted }] },
    });
    const reverse = getLegalActions(state).filter((a) => a.type === 'move-checker' && a.reverse);
    expect(reverse.every((a) => a.type === 'move-checker' && a.checkerId === enchanted && a.reverse === 'amira')).toBe(true);
    expect(reverse.length).toBeGreaterThan(0);
    const after = apply(state, find(state, (a) => a.type === 'move-checker' && a.reverse === 'amira' && a.die === 3));
    expect(after.turn?.amiraReverseUsed).toBe(true);
    expect(getLegalActions(after).some((a) => a.type === 'move-checker' && a.reverse)).toBe(false);
  });

  it('Sirocco draws a card on the first backward move each turn', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 10: 2 },
      black: { 1: 2 },
      hands: { white: ['5S', '5H', '5C'] },
      jinn: { white: ['sirocco'] },
    });
    let after = apply(state, find(state, (a) => a.type === 'play-power' && a.params.power === 'three-of-a-kind'));
    after = apply(after, firstMove(after, 10, 13, 3));
    expect(after.players.white.hand).toHaveLength(1);
    after = apply(after, firstMove(after, 10, 11, 1));
    expect(after.players.white.hand).toHaveLength(1);
  });
});

describe('start- and end-of-turn Jinn', () => {
  it('Sahira, once per match, discards the hand and draws seven', () => {
    let state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 1: 2 },
      hands: { white: ['2C', '3C'] },
      jinn: { white: ['sahira'] },
    });
    state = { ...state, turn: { ...state.turn!, dice: null }, pending: { kind: 'offer-sahira', player: 'white' }, queue: [{ t: 'roll' }] };
    const used = apply(state, find(state, (a) => a.type === 'use-sahira' && a.use));
    expect(used.players.white.hand).toHaveLength(7);
    expect(used.discardPile).toEqual(expect.arrayContaining(['2C', '3C']));
    expect(used.players.white.spentOncePerMatch).toEqual(['sahira']);
    expect(used.pending).toEqual({ kind: 'roll', player: 'white' });
  });

  it('asks Amira for a target at turn start when she has none', () => {
    const next = startTurnFor({ player: 'white', white: { 13: 2 }, black: { 1: 2 }, jinn: { white: ['amira'] } });
    expect(next.pending).toEqual({ kind: 'choose-jinn-target', player: 'white', jinn: 'amira' });
    const targeted = apply(next, getLegalActions(next)[0]!);
    expect(targeted.players.white.jinn[0]!.target).toBe('white-01');
    expect(targeted.pending).toEqual({ kind: 'roll', player: 'white' });
  });

  it('asks Hadi to mark an opposing checker on the board at turn start', () => {
    const next = startTurnFor({ player: 'white', white: { 13: 2 }, black: { 1: 2, bar: 1 }, jinn: { white: ['hadi'] } });
    expect(next.pending).toEqual({ kind: 'choose-hadi-mark', player: 'white' });
    expect(getLegalActions(next)).toHaveLength(2);
    const marked = apply(next, getLegalActions(next)[0]!);
    expect(marked.turn?.hadiMark).toBe('black-01');
  });

  it('offers Sahira at turn start only while unspent', () => {
    const fresh = startTurnFor({ player: 'white', white: { 13: 2 }, black: { 1: 2 }, jinn: { white: ['sahira'] } });
    expect(fresh.pending).toEqual({ kind: 'offer-sahira', player: 'white' });
    const spent = startTurnFor({
      player: 'white',
      white: { 13: 2 },
      black: { 1: 2 },
      jinn: { white: ['sahira'] },
      players: { white: { spentOncePerMatch: ['sahira'] } },
    });
    expect(spent.pending).toEqual({ kind: 'roll', player: 'white' });
  });

  it('Malik shields an exposed checker at turn end, then rests two own turns', () => {
    let state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2, 20: 1 },
      black: { 1: 2 },
      jinn: { white: ['malik'] },
    });
    state = apply(state, firstMove(state, 13, 10, 3));
    state = apply(state, firstMove(state, 13, 12, 1));
    state = endTurn(state);
    expect(state.pending).toEqual({ kind: 'offer-malik', player: 'white' });
    const blots = getLegalActions(state).filter((a) => a.type === 'use-malik' && a.checkerId !== null);
    expect(blots).toHaveLength(3);
    const used = apply(state, blots[0]!);
    expect(used.shields).toHaveLength(1);
    expect(used.players.white.malikReadyOnOwnTurn).toBe(4);
  });

  it('Noura draws two cards when the turn ends with an empty hand', () => {
    let state = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 1: 2 }, jinn: { white: ['noura'] } });
    state = apply(state, firstMove(state, 13, 10, 3));
    state = apply(state, firstMove(state, 13, 12, 1));
    const { state: after, events } = applyWithEvents(state, find(state, (a) => a.type === 'end-turn'));
    expect(events).toContainEqual(expect.objectContaining({ jinn: 'noura' }));
    expect(after.players.white.hand).toHaveLength(2);
  });

  it('Mazin, once per match, makes one card wild for a played hand', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 1: 2 },
      hands: { white: ['5S', '9H'] },
      jinn: { white: ['mazin'] },
    });
    const wildPair = find(state, (a) => a.type === 'play-power' && a.params.power === 'pair' && a.wildCardId !== undefined);
    const after = apply(state, wildPair);
    expect(after.players.white.spentOncePerMatch).toEqual(['mazin']);
    expect(actionTypes(after)).not.toContain('play-power');
  });
});

describe('Malik availability', () => {
  it('does not offer Malik when no checker is exposed', () => {
    let state = scenario({ player: 'white', dice: [3, 3], white: { 13: 4 }, black: { 1: 2 }, jinn: { white: ['malik'] } });
    for (let i = 0; i < 4; i++) state = apply(state, firstMove(state, 13, 10, 3));
    state = endTurn(state);
    expect(state.pending).toEqual({ kind: 'roll', player: 'black' });
  });

  it('does not offer Malik while he is resting', () => {
    let state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2, 20: 1 },
      black: { 1: 2 },
      jinn: { white: ['malik'] },
      players: { white: { malikReadyOnOwnTurn: 4 } },
      turn: { ownTurnNumber: 3 },
    });
    state = apply(state, firstMove(state, 13, 10, 3));
    state = apply(state, firstMove(state, 13, 12, 1));
    state = endTurn(state);
    expect(state.pending?.kind).not.toBe('offer-malik');
  });
});
