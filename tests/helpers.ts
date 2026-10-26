import {
  applyAction,
  createGame,
  getLegalActions,
  type CardId,
  type Checker,
  type CheckerLocation,
  type EquippedJinn,
  type GameAction,
  type GameState,
  type JinnId,
  type PlayerId,
  type PlayerState,
  type TurnState,
} from '../src/engine/index.js';

type Layout = Partial<Record<number | 'bar', number>>;

export function freshTurn(player: PlayerId, overrides: Partial<TurnState> = {}): TurnState {
  return {
    player,
    ownTurnNumber: 1,
    bonus: false,
    dice: null,
    movesMade: 0,
    powerUsed: null,
    playedCards: [],
    reverseAllowance: 0,
    anyDirection: false,
    amiraReverseUsed: false,
    hadiMark: null,
    hadiTriggered: false,
    rakhimTriggered: false,
    basimTriggered: false,
    siroccoTriggered: false,
    nahlaUsed: false,
    royalFlushDeclared: false,
    ...overrides,
  };
}

/** Removes both starting Jinn so a test controls every decision. */
export function withoutJinn(state: GameState): GameState {
  return {
    ...state,
    players: {
      white: { ...state.players.white, jinn: [] },
      black: { ...state.players.black, jinn: [] },
    },
  };
}

export interface ScenarioOptions {
  player: PlayerId;
  dice: [number, number];
  white?: Layout;
  black?: Layout;
  seed?: string;
  /** Hands by player (cards are taken out of the deck). Defaults to empty. */
  hands?: Partial<Record<PlayerId, CardId[]>>;
  /** Equipped Jinn by player, active this turn. Defaults to none. */
  jinn?: Partial<Record<PlayerId, (JinnId | EquippedJinn)[]>>;
  players?: Partial<Record<PlayerId, Partial<PlayerState>>>;
  turn?: Partial<TurnState>;
  /** Treat the roll as a natural turn roll (default) or the opening contest. */
  initialRollSource?: 'turn-roll' | 'opening-contest';
}

/**
 * Builds a mid-turn position waiting for the player's move decision.
 * Points are absolute (white moves 24 → 1). Unplaced checkers are borne off.
 */
export function scenario(options: ScenarioOptions): GameState {
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

  const handCards = [...(options.hands?.white ?? []), ...(options.hands?.black ?? [])];
  const allCards = [...base.deck, ...base.players.white.hand, ...base.players.black.hand];
  const deck = allCards.filter((c) => !handCards.includes(c));

  const playerState = (player: PlayerId): PlayerState => ({
    ...base.players[player],
    hand: options.hands?.[player] ?? [],
    jinn: (options.jinn?.[player] ?? []).map((j) =>
      typeof j === 'string' ? { id: j, activeFromTurn: 1, target: null } : j,
    ),
    ...options.players?.[player],
  });

  const [a, b] = options.dice;
  const remaining = a === b ? [a, a, a, a] : [a, b];
  return {
    ...base,
    phase: { kind: 'playing' },
    turnNumber: 1,
    checkers,
    deck,
    players: { white: playerState('white'), black: playerState('black') },
    turn: freshTurn(options.player, {
      dice: {
        initialRoll: [a, b],
        initialRollSource: options.initialRollSource ?? 'turn-roll',
        effective: [a, b],
        remaining,
      },
      ...options.turn,
    }),
    pending: { kind: 'move', player: options.player },
    queue: [],
  };
}

/** Point-level summary of legal moves (plus end-turn), e.g. "10>8/2" or "3>9/6r". */
export function moveSummary(state: GameState): string[] {
  return [
    ...new Set(
      getLegalActions(state)
        .filter((a) => a.type === 'move-checker' || a.type === 'end-turn')
        .map((action) =>
          action.type === 'move-checker' ? `${action.from}>${action.to}/${action.die}${action.reverse ? 'r' : ''}` : action.type,
        ),
    ),
  ].sort();
}

export function actionTypes(state: GameState): string[] {
  return [...new Set(getLegalActions(state).map((a) => a.type))].sort();
}

export function firstMove(state: GameState, from: number | 'bar', to: number | 'off', die: number): GameAction {
  const action = getLegalActions(state).find(
    (candidate) =>
      candidate.type === 'move-checker' && candidate.from === from && candidate.to === to && candidate.die === die,
  );
  if (!action) throw new Error(`No legal move ${from}>${to}/${die}; legal: ${moveSummary(state).join(' ')}`);
  return action;
}

export function find(state: GameState, predicate: (action: GameAction) => boolean): GameAction {
  const action = getLegalActions(state).find(predicate);
  if (!action) throw new Error(`No matching legal action; legal types: ${actionTypes(state).join(', ')}`);
  return action;
}

export function apply(state: GameState, action: GameAction): GameState {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`Rejected (${result.code}): ${result.message}`);
  return result.state;
}

export function applyWithEvents(state: GameState, action: GameAction) {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`Rejected (${result.code}): ${result.message}`);
  return result;
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
    const item = items[(s >>> 8) % items.length];
    if (item === undefined) throw new Error('No items to choose from.');
    return item;
  };
}

/**
 * Seeded test player: mostly moves, sometimes plays powers, so random games
 * finish while still exercising cards, Jinn and the Bazaar.
 */
export function chooseAction(actions: readonly GameAction[], choose: <T>(items: readonly T[]) => T): GameAction {
  const moves = actions.filter((a) => a.type === 'move-checker');
  const powers = actions.filter((a) => a.type === 'play-power' || a.type === 'declare-royal-flush');
  const buys = actions.filter((a) => a.type === 'bazaar-buy');
  if (buys.length > 0 && choose([true, false])) return choose(buys);
  if (powers.length > 0 && choose([true, false, false, false])) return choose(powers);
  if (moves.length > 0) {
    // Prefer forward moves so random games finish.
    const forward = moves.filter((a) => a.type === 'move-checker' && !a.reverse);
    return choose(forward.length > 0 && choose([true, true, true, false]) ? forward : moves);
  }
  const nonPower = actions.filter((a) => a.type !== 'play-power');
  return choose(nonPower.length > 0 ? nonPower : actions);
}

/** Plays seeded test-player actions until the game ends or the cap is reached. */
export function playOut(state: GameState, chooserSeed: number, maxActions = 20_000): GameState {
  const choose = seededChooser(chooserSeed);
  let current = state;
  for (let i = 0; i < maxActions && current.phase.kind !== 'finished'; i++) {
    current = apply(current, chooseAction(getLegalActions(current), choose));
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

import { rollDie, seedStream, type RngState } from '../src/engine/rng.js';

/** Finds a dice random state whose next rolls are exactly `values` (test-only rigging). */
export function rigDice(state: GameState, values: number[]): GameState {
  for (let i = 0; i < 1_000_000; i++) {
    let rng: RngState = seedStream(`rig-${i}`, 'dice');
    const start = rng;
    let ok = true;
    for (const value of values) {
      const roll = rollDie(rng);
      rng = roll.state;
      if (roll.value !== value) {
        ok = false;
        break;
      }
    }
    if (ok) return { ...state, rng: { ...state.rng, dice: start } };
  }
  throw new Error(`Could not rig dice ${values.join(',')}`);
}

/**
 * Ends black's (finished) turn so `options.player`'s next turn starts for real:
 * start-of-turn Jinn choices run, then the roll decision appears.
 */
export function startTurnFor(options: Omit<ScenarioOptions, 'player' | 'dice'> & { player: 'white' }): GameState {
  const state = scenario({ ...options, dice: [6, 5] });
  const blacksTurn: GameState = {
    ...state,
    turn: freshTurn('black', {
      dice: { initialRoll: [6, 5], initialRollSource: 'turn-roll', effective: [6, 5], remaining: [] },
    }),
    pending: { kind: 'move', player: 'black' },
  };
  return apply(blacksTurn, find(blacksTurn, (a) => a.type === 'end-turn'));
}
