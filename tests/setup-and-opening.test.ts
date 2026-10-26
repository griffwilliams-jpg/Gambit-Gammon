import { describe, expect, it } from 'vitest';
import {
  RULES_V0_4,
  applyAction,
  createGame,
  getLegalActions,
  getObservation,
  type GameEvent,
  type GameState,
} from '../src/engine/index.js';
import { apply, countAt, firstMove, moveSummary } from './helpers.js';

/** Rolls opening dice, white first each round, until a starter is chosen. */
function runOpening(state: GameState): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let current = state;
  while (current.phase.kind === 'opening') {
    const actions = getLegalActions(current);
    const result = applyAction(current, actions.find((a) => a.player === 'white') ?? actions[0]!);
    if (!result.ok) throw new Error(result.message);
    events.push(...result.events);
    current = result.state;
  }
  return { state: current, events };
}

describe('createGame and the standard starting position', () => {
  const game = createGame({ seed: 'setup' });

  it('records ruleset identity and schema version', () => {
    expect(game.schemaVersion).toBe(1);
    expect(game.rules).toBe(RULES_V0_4);
    expect(game.rules.rulesVersion).toBe('0.4');
    expect(game.rules.economy.status).toBe('provisional');
    expect(game.rules.bazaar.status).toBe('provisional');
  });

  it('places 15 uniquely identified checkers per player in the standard position', () => {
    const ids = new Set(game.checkers.map((c) => c.id));
    expect(ids.size).toBe(30);
    for (const player of ['white', 'black'] as const) {
      expect(game.checkers.filter((c) => c.owner === player)).toHaveLength(15);
    }
    expect([24, 13, 8, 6].map((p) => countAt(game, 'white', p))).toEqual([2, 5, 3, 5]);
    expect([1, 12, 17, 19].map((p) => countAt(game, 'black', p))).toEqual([2, 5, 3, 5]);
    const observation = getObservation(game, 'white');
    expect(observation.players.white.pipCount).toBe(167);
    expect(observation.players.black.pipCount).toBe(167);
  });

  it('starts in the opening contest with both players able to roll one die', () => {
    expect(game.phase).toEqual({ kind: 'opening', rolls: {} });
    expect(getLegalActions(game).map((a) => `${a.player}:${a.type}`)).toEqual([
      'white:roll-opening-die',
      'black:roll-opening-die',
    ]);
  });

  it('rejects an empty seed', () => {
    expect(() => createGame({ seed: '' })).toThrow();
  });
});

describe('opening contest', () => {
  it('repeats tied single-die rolls, then the higher roller starts with both dice', () => {
    // seed-166: first round ties, second round white 3, black 1.
    const { state, events } = runOpening(createGame({ seed: 'seed-166' }));
    const types = events.map((e) => e.type);
    expect(types).toEqual([
      'opening-die-rolled',
      'opening-die-rolled',
      'opening-tie',
      'opening-die-rolled',
      'opening-die-rolled',
      'starter-determined',
    ]);
    expect(events[2]).toMatchObject({ type: 'opening-tie' });
    expect(events[5]).toEqual({ type: 'starter-determined', player: 'white', dice: [3, 1] });
    expect(state.phase).toEqual({
      kind: 'moving',
      player: 'white',
      dice: { initialRoll: [3, 1], initialRollSource: 'opening-contest', movementDice: [3, 1], remaining: [3, 1] },
    });
    expect(state.turnNumber).toBe(1);
  });

  it('never produces a doubles opening and always gives the starter the higher die first', () => {
    for (let i = 0; i < 300; i++) {
      const { state, events } = runOpening(createGame({ seed: `opening-${i}` }));
      if (state.phase.kind !== 'moving') throw new Error('Expected movement after the opening.');
      const [starterDie, otherDie] = state.phase.dice.initialRoll;
      expect(starterDie).toBeGreaterThan(otherDie);
      const tiesThenRolls = events.filter((e) => e.type === 'opening-die-rolled');
      const lastTwo = tiesThenRolls.slice(-2);
      const starter = state.phase.player;
      const starterRoll = lastTwo.find((e) => e.type === 'opening-die-rolled' && e.player === starter);
      expect(starterRoll).toMatchObject({ value: starterDie });
    }
  });

  it('lets black start when black rolls higher', () => {
    const { state } = runOpening(createGame({ seed: 'seed-44' }));
    expect(state.phase).toMatchObject({ kind: 'moving', player: 'black', dice: { initialRoll: [6, 5] } });
  });

  it('does not let a player roll their opening die twice', () => {
    const game = createGame({ seed: 'twice' });
    const whiteRoll = getLegalActions(game, 'white')[0]!;
    const after = apply(game, whiteRoll);
    expect(getLegalActions(after).map((a) => a.player)).toEqual(['black']);
  });
});

describe('a complete legal opening movement sequence', () => {
  it('plays an opening 3-1 as 8/5 6/5 and hands over the turn', () => {
    let { state } = runOpening(createGame({ seed: 'seed-166' }));

    // Every unblocked 3 and 1 is offered; 13>12 is blocked by black's five checkers.
    expect(moveSummary(state)).toEqual([
      '13>10/3',
      '24>21/3',
      '24>23/1',
      '6>3/3',
      '6>5/1',
      '8>5/3',
      '8>7/1',
    ]);

    state = apply(state, firstMove(state, 8, 5, 3));
    expect(moveSummary(state)).toEqual(['24>23/1', '5>4/1', '6>5/1', '8>7/1']);

    state = apply(state, firstMove(state, 6, 5, 1));
    expect(getLegalActions(state)).toEqual([{ type: 'end-turn', player: 'white', sequence: state.sequence }]);

    state = apply(state, getLegalActions(state)[0]!);
    expect(state.phase).toEqual({ kind: 'awaiting-roll', player: 'black' });
    expect(state.completedOwnTurns).toEqual({ white: 1, black: 0 });
    expect([8, 6, 5].map((p) => countAt(state, 'white', p))).toEqual([2, 4, 2]);

    const rolled = apply(state, getLegalActions(state)[0]!);
    expect(rolled.phase).toMatchObject({ kind: 'moving', player: 'black', dice: { initialRollSource: 'turn-roll' } });
  });
});
