import type { RulesConfig } from './rules.js';
import type { RngStreams } from './rng.js';

export const STATE_SCHEMA_VERSION = 1 as const;

export type PlayerId = 'white' | 'black';
export const PLAYERS: readonly PlayerId[] = ['white', 'black'];

/** Stable identity for one of the 30 checkers, e.g. `white-01`. */
export type CheckerId = `${PlayerId}-${string}`;

/**
 * Board points use one absolute numbering, 1–24. White moves from 24 towards 1
 * and bears off below 1; black moves from 1 towards 24 and bears off above 24.
 */
export type CheckerLocation =
  | { readonly kind: 'point'; readonly point: number }
  | { readonly kind: 'bar' }
  | { readonly kind: 'off' };

export interface Checker {
  readonly id: CheckerId;
  readonly owner: PlayerId;
  readonly location: CheckerLocation;
}

export type MoveSource = number | 'bar';
export type MoveTarget = number | 'off';

export interface DiceState {
  /** The initial roll of the turn; the only roll that qualifies for roll rewards. */
  readonly initialRoll: readonly [number, number];
  readonly initialRollSource: 'opening-contest' | 'turn-roll';
  /** Effective movement dice after any modification (none exist yet). */
  readonly movementDice: readonly number[];
  /** Movement dice still available this turn. */
  readonly remaining: readonly number[];
}

export type Phase =
  | { readonly kind: 'opening'; readonly rolls: Readonly<Partial<Record<PlayerId, number>>> }
  | { readonly kind: 'awaiting-roll'; readonly player: PlayerId }
  | { readonly kind: 'moving'; readonly player: PlayerId; readonly dice: DiceState }
  | { readonly kind: 'finished'; readonly winner: PlayerId };

export interface GameState {
  readonly schemaVersion: typeof STATE_SCHEMA_VERSION;
  readonly rules: RulesConfig;
  /** Private match seed; never exposed through observations. */
  readonly seed: string;
  /** Private random state; never exposed through observations. */
  readonly rng: RngStreams;
  /** Increments on every accepted action; actions must quote it. */
  readonly sequence: number;
  readonly turnNumber: number;
  readonly completedOwnTurns: Readonly<Record<PlayerId, number>>;
  readonly phase: Phase;
  readonly checkers: readonly Checker[];
  readonly actionLog: readonly GameAction[];
}

interface ActionBase {
  readonly player: PlayerId;
  /** The state sequence this action was chosen against; mismatches are stale. */
  readonly sequence: number;
}

export type GameAction =
  | (ActionBase & { readonly type: 'roll-opening-die' })
  | (ActionBase & { readonly type: 'roll-dice' })
  | (ActionBase & {
      readonly type: 'move-checker';
      readonly checkerId: CheckerId;
      readonly from: MoveSource;
      readonly to: MoveTarget;
      readonly die: number;
    })
  | (ActionBase & { readonly type: 'end-turn' });

export type GameEvent =
  | { readonly type: 'opening-die-rolled'; readonly player: PlayerId; readonly value: number }
  | { readonly type: 'opening-tie'; readonly value: number }
  | {
      readonly type: 'starter-determined';
      readonly player: PlayerId;
      readonly dice: readonly [number, number];
    }
  | { readonly type: 'dice-rolled'; readonly player: PlayerId; readonly dice: readonly [number, number] }
  | {
      readonly type: 'checker-moved';
      readonly player: PlayerId;
      readonly checkerId: CheckerId;
      readonly from: MoveSource;
      readonly to: MoveTarget;
      readonly die: number;
    }
  | {
      readonly type: 'checker-hit';
      readonly player: PlayerId;
      readonly checkerId: CheckerId;
      readonly point: number;
    }
  | { readonly type: 'checker-borne-off'; readonly player: PlayerId; readonly checkerId: CheckerId }
  | { readonly type: 'dice-unusable'; readonly player: PlayerId; readonly dice: readonly number[] }
  | { readonly type: 'turn-ended'; readonly player: PlayerId; readonly ownTurnNumber: number }
  | { readonly type: 'game-won'; readonly player: PlayerId };

export type RejectionCode = 'stale-action' | 'wrong-player' | 'illegal-action' | 'game-finished';

export type ApplyResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | {
      readonly ok: false;
      /** The exact input state, unchanged (including its random state). */
      readonly state: GameState;
      readonly code: RejectionCode;
      readonly message: string;
    };

/** What one player is allowed to see. Contains no seed or random state. */
export interface Observation {
  readonly viewer: PlayerId;
  readonly rules: { readonly rulesetId: string; readonly rulesVersion: string };
  readonly sequence: number;
  readonly turnNumber: number;
  readonly completedOwnTurns: Readonly<Record<PlayerId, number>>;
  readonly phase: Phase;
  readonly checkers: readonly Checker[];
  /** Per-player summary derived from public board state. */
  readonly players: Readonly<
    Record<PlayerId, { readonly onBar: number; readonly borneOff: number; readonly pipCount: number }>
  >;
  /**
   * The viewer's own private information. Empty in this stage; hands, lamps
   * and Bazaar stock belong here, never on the opponent's side.
   */
  readonly private: Readonly<Record<string, never>>;
  readonly legalActions: readonly GameAction[];
}
