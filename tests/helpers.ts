import {
  applyAction,
  createGame,
  getLegalActions,
  type Checker,
  type CheckerLocation,
  type GameAction,
  type GameState,
  type PlayerId,
} from '../src/engine/index.js';

type Layout = Partial<Record<number | 'bar', number>>;

/**
 * Builds a mid-turn test position. Points are absolute (white moves 24 → 1).
 * Checkers not placed are treated as already borne off.
 */
export function scenario(options: {
  player: PlayerId;
  dice: [number, number];
  white?: Layout;
  black?: Layout;
  seed?: string;
}): GameState {
  const base = createGame({ seed: options.seed ?? 'scenario' });
  const checkers: Checker[] = [];
  for (const player of ['white', 'black'] as const) {
    const locations: CheckerLocation[] = [];
    for (const [where, count] of Object.entries(options[player] ?? {})) {
      const location: CheckerLocation = where === 'bar' ? { kind: 'bar' } : { kind: 'point', point: Number(where) };
      for (let i = 0; i < (count ?? 0); i++) locations.push(location);
    }
    if (locations.length > 15) throw new Error(`Too many ${player} checkers.`);
    while (locations.length < 15) locations.push({ kind: 'off' });
    locations.forEach((location, i) =>
      checkers.push({ id: `${player}-${String(i + 1).padStart(2, '0')}`, owner: player, location }),
    );
  }
  const [a, b] = options.dice;
  const movementDice = a === b ? [a, a, a, a] : [a, b];
  return {
    ...base,
    turnNumber: 1,
    checkers,
    phase: {
      kind: 'moving',
      player: options.player,
      dice: { initialRoll: [a, b], initialRollSource: 'turn-roll', movementDice, remaining: movementDice },
    },
  };
}

/** Point-level summary of legal moves, e.g. "10>8/2". */
export function moveSummary(state: GameState): string[] {
  return [
    ...new Set(
      getLegalActions(state).map((action) =>
        action.type === 'move-checker' ? `${action.from}>${action.to}/${action.die}` : action.type,
      ),
    ),
  ].sort();
}

export function firstMove(state: GameState, from: number | 'bar', to: number | 'off', die: number): GameAction {
  const action = getLegalActions(state).find(
    (candidate) =>
      candidate.type === 'move-checker' && candidate.from === from && candidate.to === to && candidate.die === die,
  );
  if (!action) throw new Error(`No legal move ${from}>${to}/${die}; legal: ${moveSummary(state).join(' ')}`);
  return action;
}

export function apply(state: GameState, action: GameAction): GameState {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`Rejected (${result.code}): ${result.message}`);
  return result.state;
}

export function countAt(state: GameState, player: PlayerId, point: number): number {
  return state.checkers.filter(
    (c) => c.owner === player && c.location.kind === 'point' && c.location.point === point,
  ).length;
}

/** Deterministic test-only chooser, independent of gameplay randomness. */
export function seededChooser(seed: number): <T>(items: readonly T[]) => T {
  let s = seed >>> 0;
  return (items) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const item = items[s % items.length];
    if (item === undefined) throw new Error('No items to choose from.');
    return item;
  };
}

/** Plays legal actions chosen by a seeded test player until the game ends or the cap is reached. */
export function playOut(state: GameState, chooserSeed: number, maxActions = 10_000): GameState {
  const choose = seededChooser(chooserSeed);
  let current = state;
  for (let i = 0; i < maxActions && current.phase.kind !== 'finished'; i++) {
    current = apply(current, choose(getLegalActions(current)));
  }
  return current;
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
