import {
  BAR,
  OFF,
  createStartingCheckers,
  fromOwnPoint,
  opponentOf,
  ownIndex,
  pipCount,
  positionFor,
} from './board.js';
import { legalSteps, type Step } from './movement.js';
import { RULES_V0_4, type RulesConfig } from './rules.js';
import { rollDie, seedStreams, type RngStreams } from './rng.js';
import {
  PLAYERS,
  STATE_SCHEMA_VERSION,
  type ApplyResult,
  type Checker,
  type CheckerLocation,
  type DiceState,
  type GameAction,
  type GameEvent,
  type GameState,
  type MoveSource,
  type MoveTarget,
  type Observation,
  type PlayerId,
} from './types.js';

export interface CreateGameOptions {
  readonly seed: string;
  readonly rules?: RulesConfig;
}

export function createGame({ seed, rules = RULES_V0_4 }: CreateGameOptions): GameState {
  if (typeof seed !== 'string' || seed.length === 0) throw new Error('A non-empty seed is required.');
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    rules,
    seed,
    rng: seedStreams(seed),
    sequence: 0,
    turnNumber: 0,
    completedOwnTurns: { white: 0, black: 0 },
    phase: { kind: 'opening', rolls: {} },
    checkers: createStartingCheckers(),
    actionLog: [],
  };
}

export function getLegalActions(state: GameState, player?: PlayerId): GameAction[] {
  const actions = allLegalActions(state);
  return player === undefined ? actions : actions.filter((action) => action.player === player);
}

function allLegalActions(state: GameState): GameAction[] {
  const { phase, sequence } = state;
  switch (phase.kind) {
    case 'opening':
      return PLAYERS.filter((player) => phase.rolls[player] === undefined).map((player) => ({
        type: 'roll-opening-die',
        player,
        sequence,
      }));
    case 'awaiting-roll':
      return [{ type: 'roll-dice', player: phase.player, sequence }];
    case 'moving': {
      const { player, dice } = phase;
      const steps = legalSteps(positionFor(state.checkers, player), dice.remaining);
      if (steps.length === 0) return [{ type: 'end-turn', player, sequence }];
      const actions: GameAction[] = [];
      for (const step of steps) {
        for (const checker of checkersAt(state.checkers, player, step.from)) {
          actions.push({
            type: 'move-checker',
            player,
            sequence,
            checkerId: checker.id,
            from: toSource(player, step.from),
            to: toTarget(player, step.to),
            die: step.die,
          });
        }
      }
      return actions;
    }
    case 'finished':
      return [];
  }
}

export function applyAction(state: GameState, action: GameAction): ApplyResult {
  if (state.phase.kind === 'finished') {
    return reject(state, 'game-finished', 'The game has already finished.');
  }
  if (!action || typeof action !== 'object' || action.sequence !== state.sequence) {
    return reject(state, 'stale-action', `Action sequence does not match state sequence ${state.sequence}.`);
  }
  const legal = getLegalActions(state);
  if (!legal.some((candidate) => candidate.player === action.player)) {
    return reject(state, 'wrong-player', `It is not ${String(action.player)}'s action.`);
  }
  // Resolve and log the engine's own copy, never the caller's object.
  const accepted = legal.find((candidate) => sameAction(candidate, action));
  if (!accepted) {
    return reject(state, 'illegal-action', 'That action is not legal in the current state.');
  }

  const events: GameEvent[] = [];
  const next = resolve(state, accepted, events);
  return {
    ok: true,
    state: { ...next, sequence: state.sequence + 1, actionLog: [...state.actionLog, accepted] },
    events,
  };
}

export function getObservation(state: GameState, viewer: PlayerId): Observation {
  const summary = (player: PlayerId) => ({
    onBar: state.checkers.filter((c) => c.owner === player && c.location.kind === 'bar').length,
    borneOff: state.checkers.filter((c) => c.owner === player && c.location.kind === 'off').length,
    pipCount: pipCount(state.checkers, player),
  });
  // Built field by field so the seed and random state can never leak.
  return {
    viewer,
    rules: { rulesetId: state.rules.rulesetId, rulesVersion: state.rules.rulesVersion },
    sequence: state.sequence,
    turnNumber: state.turnNumber,
    completedOwnTurns: { ...state.completedOwnTurns },
    phase: clone(state.phase),
    checkers: clone(state.checkers),
    players: { white: summary('white'), black: summary('black') },
    private: {},
    legalActions: getLegalActions(state, viewer),
  };
}

function resolve(state: GameState, action: GameAction, events: GameEvent[]): GameState {
  switch (action.type) {
    case 'roll-opening-die':
      return rollOpeningDie(state, action.player, events);
    case 'roll-dice':
      return rollTurnDice(state, action.player, events);
    case 'move-checker':
      return moveChecker(state, action, events);
    case 'end-turn':
      return endTurn(state, action.player, events);
  }
}

function rollOpeningDie(state: GameState, player: PlayerId, events: GameEvent[]): GameState {
  if (state.phase.kind !== 'opening') throw new Error('Unreachable: not in opening.');
  const roll = rollDie(state.rng.dice);
  const rng: RngStreams = { ...state.rng, dice: roll.state };
  events.push({ type: 'opening-die-rolled', player, value: roll.value });

  const rolls = { ...state.phase.rolls, [player]: roll.value };
  const { white, black } = rolls;
  if (white === undefined || black === undefined) {
    return { ...state, rng, phase: { kind: 'opening', rolls } };
  }
  if (white === black) {
    events.push({ type: 'opening-tie', value: white });
    return { ...state, rng, phase: { kind: 'opening', rolls: {} } };
  }

  const starter: PlayerId = white > black ? 'white' : 'black';
  const dice: [number, number] = starter === 'white' ? [white, black] : [black, white];
  events.push({ type: 'starter-determined', player: starter, dice });
  return {
    ...state,
    rng,
    turnNumber: 1,
    phase: { kind: 'moving', player: starter, dice: newDice(dice, 'opening-contest') },
  };
}

function rollTurnDice(state: GameState, player: PlayerId, events: GameEvent[]): GameState {
  const first = rollDie(state.rng.dice);
  const second = rollDie(first.state);
  const dice: [number, number] = [first.value, second.value];
  events.push({ type: 'dice-rolled', player, dice });
  return {
    ...state,
    rng: { ...state.rng, dice: second.state },
    phase: { kind: 'moving', player, dice: newDice(dice, 'turn-roll') },
  };
}

function newDice(roll: [number, number], source: DiceState['initialRollSource']): DiceState {
  const movementDice = roll[0] === roll[1] ? [roll[0], roll[0], roll[0], roll[0]] : [...roll];
  return { initialRoll: roll, initialRollSource: source, movementDice, remaining: movementDice };
}

function moveChecker(
  state: GameState,
  action: Extract<GameAction, { type: 'move-checker' }>,
  events: GameEvent[],
): GameState {
  if (state.phase.kind !== 'moving') throw new Error('Unreachable: not moving.');
  const { player, dice } = state.phase;
  const opponent = opponentOf(player);
  const destination: CheckerLocation =
    action.to === 'off' ? { kind: 'off' } : { kind: 'point', point: action.to };

  let checkers = state.checkers.map((checker) =>
    checker.id === action.checkerId ? { ...checker, location: destination } : checker,
  );
  events.push({
    type: 'checker-moved',
    player,
    checkerId: action.checkerId,
    from: action.from,
    to: action.to,
    die: action.die,
  });

  if (action.to === 'off') {
    events.push({ type: 'checker-borne-off', player, checkerId: action.checkerId });
  } else {
    const point = action.to;
    const blot = checkers.find(
      (c) => c.owner === opponent && c.location.kind === 'point' && c.location.point === point,
    );
    if (blot) {
      checkers = checkers.map((c) => (c.id === blot.id ? { ...c, location: { kind: 'bar' } } : c));
      events.push({ type: 'checker-hit', player, checkerId: blot.id, point });
    }
  }

  const remainingIndex = dice.remaining.indexOf(action.die);
  const remaining = dice.remaining.filter((_, index) => index !== remainingIndex);

  if (checkers.every((c) => c.owner !== player || c.location.kind === 'off')) {
    events.push({ type: 'game-won', player });
    return { ...state, checkers, phase: { kind: 'finished', winner: player } };
  }
  return { ...state, checkers, phase: { kind: 'moving', player, dice: { ...dice, remaining } } };
}

function endTurn(state: GameState, player: PlayerId, events: GameEvent[]): GameState {
  if (state.phase.kind !== 'moving') throw new Error('Unreachable: not moving.');
  const { remaining } = state.phase.dice;
  if (remaining.length > 0) events.push({ type: 'dice-unusable', player, dice: remaining });
  const ownTurnNumber = state.completedOwnTurns[player] + 1;
  events.push({ type: 'turn-ended', player, ownTurnNumber });
  return {
    ...state,
    turnNumber: state.turnNumber + 1,
    completedOwnTurns: { ...state.completedOwnTurns, [player]: ownTurnNumber },
    phase: { kind: 'awaiting-roll', player: opponentOf(player) },
  };
}

function checkersAt(checkers: readonly Checker[], player: PlayerId, index: number): Checker[] {
  return checkers
    .filter((c) => c.owner === player && c.location.kind !== 'off' && ownIndex(player, c.location) === index)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function toSource(player: PlayerId, index: Step['from']): MoveSource {
  return index === BAR ? 'bar' : fromOwnPoint(player, index);
}

function toTarget(player: PlayerId, index: Step['to']): MoveTarget {
  return index === OFF ? 'off' : fromOwnPoint(player, index);
}

function sameAction(a: GameAction, b: GameAction): boolean {
  if (a.type !== b.type || a.player !== b.player || a.sequence !== b.sequence) return false;
  if (a.type === 'move-checker' && b.type === 'move-checker') {
    return a.checkerId === b.checkerId && a.from === b.from && a.to === b.to && a.die === b.die;
  }
  return true;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function reject(
  state: GameState,
  code: Extract<ApplyResult, { ok: false }>['code'],
  message: string,
): ApplyResult {
  return { ok: false, state, code, message };
}
