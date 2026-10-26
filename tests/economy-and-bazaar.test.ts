import { describe, expect, it } from 'vitest';
import {
  RULES_V0_4,
  createGame,
  getLegalActions,
  getObservation,
  purchaseQuote,
  withEconomy,
  type GameState,
  type LampType,
} from '../src/engine/index.js';
import { apply, applyWithEvents, find, firstMove, rigDice, scenario, startTurnFor } from './helpers.js';

const endTurn = (state: GameState) => apply(state, find(state, (a) => a.type === 'end-turn'));

/** A Bazaar visit for white with given stock, Dinars and banked benefits. */
function bazaar(stock: LampType[], dinars: number, benefits = { refreshes: 0, upgrades: 0, discounts: 0 }, jinn: string[] = []): GameState {
  const state = scenario({
    player: 'white',
    dice: [3, 1],
    white: { 13: 2 },
    black: { 1: 2 },
    jinn: { white: jinn as never[] },
    players: { white: { dinars, benefits, stock } },
  });
  return { ...state, pending: { kind: 'bazaar', player: 'white' }, queue: [{ t: 'handover' }] };
}

describe('hits', () => {
  it('awards +1 Dinar to the hitter and +2 to the hit player, with the card exchange, in order', () => {
    const state = scenario({
      player: 'white',
      dice: [3, 1],
      white: { 13: 2 },
      black: { 10: 1, 1: 2 },
      hands: { black: ['2C'] },
    });
    const { state: after, events } = applyWithEvents(state, firstMove(state, 13, 10, 3));
    expect(events.map((e) => e.type)).toEqual([
      'checker-moved',
      'checker-hit',
      'dinars-awarded',
      'dinars-awarded',
      'card-drawn',
      'card-discarded',
    ]);
    expect(after.players.white.dinars).toBe(1);
    expect(after.players.black.dinars).toBe(2);
    expect(after.players.white.hand).toHaveLength(1);
    expect(after.players.white.lockedCards).toEqual(after.players.white.hand);
    expect(after.players.black.hand).toEqual([]);
    expect(after.discardPile).toEqual(['2C']);
  });

  it('awards nothing for a move that does not hit, and unlocks hit cards at turn end', () => {
    let state = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 10: 1, 1: 2 } });
    state = apply(state, firstMove(state, 13, 10, 3));
    const { state: noHit, events } = applyWithEvents(state, firstMove(state, 13, 12, 1));
    expect(events.some((e) => e.type === 'dinars-awarded')).toBe(false);
    const ended = endTurn(noHit);
    expect(ended.players.white.lockedCards).toEqual([]);
    expect(ended.players.white.hand).toHaveLength(1);
  });

  it('uses the configured economy for comparison runs', () => {
    const rules = withEconomy(RULES_V0_4, 'C');
    expect(rules.economy).toMatchObject({ label: 'C', hitterDinars: 1, hitPlayerDinars: 3 });
    expect(RULES_V0_4.economy.hitPlayerDinars).toBe(2);
  });
});

describe('hand limit and card exchange', () => {
  it('asks for a discard before each draw at a full hand', () => {
    const hand = ['2C', '3C', '4C', '5C', '6C', '7C', '8C'];
    const state = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 10: 1, 1: 2 }, hands: { white: hand } });
    const after = apply(state, firstMove(state, 13, 10, 3));
    expect(after.pending).toEqual({ kind: 'discard-before-draw', player: 'white' });
    const discarded = apply(after, find(after, (a) => a.type === 'discard-card' && a.cardId === '2C'));
    expect(discarded.players.white.hand).toHaveLength(7);
    expect(discarded.players.white.hand).not.toContain('2C');
    expect(discarded.pending).toEqual({ kind: 'move', player: 'white' });
  });

  it('offers the optional 6-and-1 discard-one/draw-two exchange', () => {
    const start = rigDice(startTurnFor({ player: 'white', white: { 13: 2 }, black: { 1: 2 }, hands: { white: ['2C'] } }), [6, 1]);
    const rolled = apply(start, find(start, (a) => a.type === 'roll-dice'));
    expect(rolled.pending).toEqual({ kind: 'offer-exchange', player: 'white' });
    const declined = apply(rolled, find(rolled, (a) => a.type === 'exchange' && a.discard === null));
    expect(declined.players.white.hand).toEqual(['2C']);
    const exchanged = apply(rolled, find(rolled, (a) => a.type === 'exchange' && a.discard === '2C'));
    expect(exchanged.players.white.hand).toHaveLength(2);
    expect(exchanged.discardPile).toContain('2C');
  });
});

describe('natural doubles', () => {
  it('draw two cards and bank a refresh every second double, an upgrade at streak 2 and a discount at streak 3', () => {
    let state = startTurnFor({ player: 'white', white: { 13: 2 }, black: { 1: 2 } });
    state = rigDice(state, [2, 2]);
    let { state: first, events } = applyWithEvents(state, find(state, (a) => a.type === 'roll-dice'));
    expect(events).toContainEqual({ type: 'natural-doubles', player: 'white', cumulative: 1, streak: 1 });
    expect(first.players.white.hand).toHaveLength(2);

    // Second consecutive natural double.
    first = { ...first, turn: { ...first.turn!, dice: null }, pending: { kind: 'roll', player: 'white' }, queue: [] };
    first = rigDice(first, [3, 3]);
    const second = applyWithEvents(first, find(first, (a) => a.type === 'roll-dice'));
    expect(second.state.players.white.benefits).toEqual({ refreshes: 1, upgrades: 1, discounts: 0 });
    expect(second.state.players.white.doubles).toEqual({ cumulative: 0, streak: 2 });

    let third: GameState = { ...second.state, turn: { ...second.state.turn!, dice: null }, pending: { kind: 'roll' as const, player: 'white' as const }, queue: [] };
    third = rigDice(third, [4, 4]);
    const third2 = apply(third, find(third, (a) => a.type === 'roll-dice'));
    expect(third2.players.white.benefits).toEqual({ refreshes: 1, upgrades: 1, discounts: 1 });
    expect(third2.players.white.doubles).toEqual({ cumulative: 1, streak: 3 });

    let broken: GameState = { ...third2, turn: { ...third2.turn!, dice: null }, pending: { kind: 'roll' as const, player: 'white' as const }, queue: [] };
    broken = rigDice(broken, [5, 2]);
    const after = apply(broken, find(broken, (a) => a.type === 'roll-dice'));
    // A non-double breaks the streak but keeps cumulative charge and banked benefits.
    expect(after.players.white.doubles).toEqual({ cumulative: 1, streak: 0 });
    expect(after.players.white.benefits).toEqual({ refreshes: 1, upgrades: 1, discounts: 1 });
  });
});

describe('Bazaar', () => {
  it('opens after completed own turns 3, 6, 9 with one guaranteed Copper', () => {
    let state = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 1: 2 }, players: { white: { dinars: 0 } } });
    state = { ...state, completedOwnTurns: { white: 2, black: 2 } };
    state = apply(state, firstMove(state, 13, 10, 3));
    state = apply(state, firstMove(state, 13, 12, 1));
    const { state: open, events } = applyWithEvents(state, find(state, (a) => a.type === 'end-turn'));
    expect(open.pending).toEqual({ kind: 'bazaar', player: 'white' });
    expect(open.players.white.stock).toHaveLength(3);
    expect(open.players.white.stock[0]).toBe('copper');
    expect(events).toContainEqual(expect.objectContaining({ type: 'bazaar-opened', player: 'white' }));
    // Nothing affordable at 0 Dinars: only leave.
    expect(getLegalActions(open).map((a) => a.type)).toEqual(['bazaar-leave']);
    // The opponent cannot see the private stock.
    expect(getObservation(open, 'black').private.stock).toEqual([]);
    expect(JSON.stringify(getObservation(open, 'black'))).not.toContain('"stock":["copper"');
    const left = apply(open, find(open, (a) => a.type === 'bazaar-leave'));
    expect(left.pending).toEqual({ kind: 'roll', player: 'black' });
  });

  it('does not open after own turns that are not a multiple of three', () => {
    let state = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 1: 2 } });
    state = { ...state, completedOwnTurns: { white: 3, black: 3 } };
    state = apply(state, firstMove(state, 13, 10, 3));
    state = apply(state, firstMove(state, 13, 12, 1));
    expect(endTurn(state).pending).toEqual({ kind: 'roll', player: 'black' });
  });

  it('sells affordable lamps, reveals the Jinn and equips it for the following turn', () => {
    const state = bazaar(['copper', 'enchanted', 'royal'], 7);
    expect(getLegalActions(state).map((a) => (a.type === 'bazaar-buy' ? a.slot : a.type))).toEqual([0, 1, 'bazaar-refresh', 'bazaar-leave']);
    const { state: bought, events } = applyWithEvents(state, find(state, (a) => a.type === 'bazaar-buy' && a.slot === 1));
    expect(bought.players.white.dinars).toBe(0);
    expect(bought.players.white.stock).toEqual(['copper', null, 'royal']);
    expect(events).toContainEqual(expect.objectContaining({ type: 'lamp-bought', lamp: 'enchanted', price: 7 }));
    expect(bought.players.white.jinn).toHaveLength(1);
    expect(bought.players.white.jinn[0]!.activeFromTurn).toBe(bought.turnNumber + 1);
    expect(bought.pending).toEqual({ kind: 'bazaar', player: 'white' });
  });

  it('applies an upgrade (Copper price, Enchanted odds) then the discount, flooring at 1', () => {
    const both = bazaar(['copper'], 1, { refreshes: 0, upgrades: 1, discounts: 1 });
    expect(purchaseQuote(both, 'white', 'copper')).toEqual({ price: 1, opensAs: 'enchanted', upgraded: true, discounted: true });
    expect(purchaseQuote(both, 'white', 'royal')).toEqual({ price: 9, opensAs: 'royal', upgraded: false, discounted: true });
    const upgradeOnly = bazaar(['copper'], 4, { refreshes: 0, upgrades: 2, discounts: 0 });
    expect(purchaseQuote(upgradeOnly, 'white', 'copper')).toEqual({ price: 4, opensAs: 'enchanted', upgraded: true, discounted: false });
    const bought = apply(both, find(both, (a) => a.type === 'bazaar-buy'));
    expect(bought.players.white.benefits).toEqual({ refreshes: 0, upgrades: 0, discounts: 0 });
    expect(bought.players.white.dinars).toBe(0);
  });

  it('uses a banked free refresh before charging 1 Dinar, regenerating all three slots', () => {
    const state = bazaar(['copper', null as never, null as never], 3, { refreshes: 1, upgrades: 0, discounts: 0 });
    const free = applyWithEvents(state, find(state, (a) => a.type === 'bazaar-refresh'));
    expect(free.events).toContainEqual(expect.objectContaining({ type: 'bazaar-refreshed', paid: 0 }));
    expect(free.state.players.white.dinars).toBe(3);
    expect(free.state.players.white.benefits.refreshes).toBe(0);
    expect(free.state.players.white.stock.every((s) => s !== null)).toBe(true);
    const paid = applyWithEvents(free.state, find(free.state, (a) => a.type === 'bazaar-refresh'));
    expect(paid.events).toContainEqual(expect.objectContaining({ type: 'bazaar-refreshed', paid: 1 }));
    expect(paid.state.players.white.dinars).toBe(2);
  });

  it('asks to replace or release a revealed Jinn when all three slots are full, with no refund', () => {
    const state = bazaar(['copper'], 4, undefined, ['zafir', 'basim', 'nahla']);
    const revealed = apply(state, find(state, (a) => a.type === 'bazaar-buy'));
    expect(revealed.pending?.kind).toBe('equip-jinn');
    const newJinn = (revealed.pending as { jinn: string }).jinn;
    expect(['zafir', 'basim', 'nahla']).not.toContain(newJinn);
    const released = apply(revealed, find(revealed, (a) => a.type === 'equip-jinn' && a.replaceSlot === null));
    expect(released.players.white.jinn.map((j) => j.id)).toEqual(['zafir', 'basim', 'nahla']);
    expect(released.players.white.dinars).toBe(0);
    const replaced = apply(revealed, find(revealed, (a) => a.type === 'equip-jinn' && a.replaceSlot === 1));
    expect(replaced.players.white.jinn.map((j) => j.id)).toEqual(['zafir', newJinn, 'nahla']);
  });

  it('never reveals a Common Jinn from a Royal Lamp', () => {
    for (let i = 0; i < 40; i++) {
      const state = { ...bazaar(['royal'], 12), seed: `royal-${i}`, rng: createGame({ seed: `royal-${i}` }).rng };
      const bought = apply(state, find(state, (a) => a.type === 'bazaar-buy'));
      const revealed = bought.players.white.jinn[0]!.id;
      expect(['zafir', 'basim', 'nahla', 'qamar', 'sirocco']).not.toContain(revealed);
    }
  });
});
