import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  getLegalActions,
  getObservation,
  type GameAction,
  type GameState,
} from '../src/engine/index.js';
import { apply, deepFreeze, playOut, scenario } from './helpers.js';

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner && typeof inner === 'object' && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))) : inner,
  );
}

function expectRejectedUnchanged(state: GameState, action: GameAction, code: string): void {
  const snapshot = JSON.stringify(state);
  const result = applyAction(deepFreeze(state), action);
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.code).toBe(code);
  expect(result.state).toBe(state);
  expect(JSON.stringify(state)).toBe(snapshot);
}

describe('rejected actions change neither state nor randomness', () => {
  it('rejects stale actions chosen against an earlier state', () => {
    const game = createGame({ seed: 'stale' });
    const whiteRoll = getLegalActions(game, 'white')[0]!;
    const after = apply(game, whiteRoll);
    // Black's roll from the original state is still black's action, but stale.
    expectRejectedUnchanged(after, getLegalActions(game, 'black')[0]!, 'stale-action');
    expectRejectedUnchanged(after, whiteRoll, 'stale-action');
  });

  it("rejects the other player's action", () => {
    const state = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 1: 2 } });
    expectRejectedUnchanged(state, { type: 'end-turn', player: 'black', sequence: state.sequence }, 'wrong-player');
  });

  it('rejects illegal moves, including blocked points, wrong dice and wrong checkers', () => {
    const state = scenario({ player: 'white', dice: [3, 1], white: { 13: 2 }, black: { 10: 2, 1: 2 }, hands: { white: ['AS'] } });
    const base = { type: 'move-checker', player: 'white', sequence: state.sequence } as const;
    expectRejectedUnchanged(state, { ...base, checkerId: 'white-01', from: 13, to: 10, die: 3 }, 'illegal-action');
    expectRejectedUnchanged(state, { ...base, checkerId: 'white-01', from: 13, to: 11, die: 2 }, 'illegal-action');
    expectRejectedUnchanged(state, { ...base, checkerId: 'black-01', from: 13, to: 12, die: 1 }, 'illegal-action');
    expectRejectedUnchanged(state, { ...base, checkerId: 'white-03', from: 13, to: 12, die: 1 }, 'illegal-action');
    expectRejectedUnchanged(state, { type: 'end-turn', player: 'white', sequence: state.sequence }, 'illegal-action');
    expectRejectedUnchanged(state, { type: 'roll-dice', player: 'white', sequence: state.sequence }, 'illegal-action');
    // A power with a card the player does not hold, or a hand that does not qualify.
    expectRejectedUnchanged(
      state,
      { type: 'play-power', player: 'white', sequence: state.sequence, cardIds: ['KS'], params: { power: 'high-card', die: 3, boost: 3 } },
      'illegal-action',
    );
    expectRejectedUnchanged(
      state,
      { type: 'play-power', player: 'white', sequence: state.sequence, cardIds: ['AS'], params: { power: 'high-card', die: 3, boost: 3 } },
      'illegal-action',
    );
  });

  it('rejects malformed input without throwing', () => {
    const state = createGame({ seed: 'malformed' });
    for (const junk of [null, undefined, 42, 'roll', {}, { type: 'roll-dice' }]) {
      expectRejectedUnchanged(state, junk as unknown as GameAction, 'stale-action');
    }
    expectRejectedUnchanged(
      state,
      { type: 'teleport', player: 'white', sequence: 0 } as unknown as GameAction,
      'illegal-action',
    );
  });

  it('rejects any action after the game has finished', () => {
    const finished = playOut(createGame({ seed: 'finish' }), 7);
    expect(finished.phase.kind).toBe('finished');
    expectRejectedUnchanged(finished, { type: 'roll-dice', player: 'white', sequence: finished.sequence }, 'game-finished');
  });

  it('does not consume dice randomness when an action is rejected', () => {
    const game = createGame({ seed: 'no-consume' });
    const roll = getLegalActions(game, 'white')[0]!;
    const rejected = applyAction(game, { ...roll, sequence: 99 });
    expect(rejected.state.rng).toEqual(game.rng);
    const direct = applyAction(game, roll);
    const afterRejection = applyAction(rejected.state, roll);
    expect(afterRejection).toEqual(direct);
  });

  it('property: arbitrary actions are either legal or leave the state untouched', () => {
    const actionArb: fc.Arbitrary<GameAction> = fc.oneof(
      fc.record({
        type: fc.constantFrom('roll-opening-die', 'roll-dice', 'end-turn'),
        player: fc.constantFrom('white', 'black'),
        sequence: fc.integer({ min: -1, max: 400 }),
      }),
      fc.record({
        type: fc.constant('move-checker'),
        player: fc.constantFrom('white', 'black'),
        sequence: fc.integer({ min: -1, max: 400 }),
        checkerId: fc.constantFrom('white-01', 'white-07', 'white-15', 'black-03', 'black-15'),
        from: fc.oneof(fc.integer({ min: 0, max: 26 }), fc.constant('bar' as const)),
        to: fc.oneof(fc.integer({ min: 0, max: 26 }), fc.constant('off' as const)),
        die: fc.integer({ min: 0, max: 7 }),
      }),
    ) as fc.Arbitrary<GameAction>;

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000 }), fc.integer({ min: 0, max: 120 }), actionArb, (seed, steps, action) => {
        const state = playOut(createGame({ seed: `prop-${seed}` }), seed, steps);
        const snapshot = JSON.stringify(state);
        const result = applyAction(state, action);
        // Compare with sorted keys, as the engine does: property order is not meaningful.
        const legal = getLegalActions(state).some((a) => canonical(a) === canonical(action));
        if (result.ok) {
          expect(legal).toBe(true);
        } else {
          expect(result.state).toBe(state);
        }
        expect(JSON.stringify(state)).toBe(snapshot);
      }),
      { numRuns: 300 },
    );
  });
});

describe('observations', () => {
  it('never exposes the gameplay seed, random state, deck order or opponent hand', () => {
    const seed = 'very-secret-seed-1234';
    let state = createGame({ seed });
    state = playOut(state, 3, 60);
    for (const viewer of ['white', 'black'] as const) {
      const observation = getObservation(state, viewer);
      const text = JSON.stringify(observation);
      expect(text).not.toContain(seed);
      expect(observation).not.toHaveProperty('seed');
      expect(observation).not.toHaveProperty('rng');
      expect(observation).not.toHaveProperty('deck');
      for (const stream of Object.values(state.rng)) for (const word of stream) expect(text).not.toContain(String(word));
      expect(observation.private.hand).toEqual(state.players[viewer].hand);
      const opponent = viewer === 'white' ? 'black' : 'white';
      for (const card of state.players[opponent].hand) expect(text).not.toContain(`"${card}"`);
      for (const card of state.deck) expect(text).not.toContain(`"${card}"`);
      expect(observation.players[opponent].handCount).toBe(state.players[opponent].hand.length);
    }
  });

  it("lists only the viewer's legal actions and cannot be used to mutate the game", () => {
    const state = createGame({ seed: 'obs' });
    const observation = getObservation(state, 'black');
    expect(observation.legalActions.every((a) => a.player === 'black')).toBe(true);
    (observation.checkers as unknown as { location: unknown }[])[0]!.location = { kind: 'off' };
    (observation.private.hand as string[]).length = 0;
    expect(state.checkers[0]!.location).toEqual({ kind: 'point', point: 24 });
    expect(state.players.black.hand).toHaveLength(5);
  });
});
