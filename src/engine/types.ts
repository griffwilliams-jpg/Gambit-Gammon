import type { CardId, PowerKind } from './cards.js';
import type { JinnId, LampType } from './jinn.js';
import type { RulesConfig } from './rules.js';
import type { RngStreams } from './rng.js';

export const STATE_SCHEMA_VERSION = 2 as const;

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
  /** The current pair of dice after rerolls or set values. */
  readonly effective: readonly [number, number];
  /** Movement values still available (four for effective doubles; boosts change one value). */
  readonly remaining: readonly number[];
}

export interface EquippedJinn {
  readonly id: JinnId;
  /** Turn number from which the Jinn's effects apply (never the turn it was acquired). */
  readonly activeFromTurn: number;
  /** Amira and Rakhim: the enchanted own checker, kept through hits and exchanges. */
  readonly target: CheckerId | null;
}

export interface Shield {
  readonly checkerId: CheckerId;
  readonly owner: PlayerId;
  readonly source: 'flush' | 'malik';
}

export interface BankedBenefits {
  readonly refreshes: number;
  readonly upgrades: number;
  readonly discounts: number;
}

export interface PlayerState {
  readonly hand: readonly CardId[];
  /** Cards gained through hits this turn; they cannot be played until the turn ends. */
  readonly lockedCards: readonly CardId[];
  readonly dinars: number;
  /** Equipped Jinn in slot order (left to right), at most three. */
  readonly jinn: readonly EquippedJinn[];
  /** Once-per-match abilities already used; never reset by replacement. */
  readonly spentOncePerMatch: readonly JinnId[];
  /** Malik's shield is ready again from this own-turn number. */
  readonly malikReadyOnOwnTurn: number;
  readonly benefits: BankedBenefits;
  /** Qualifying natural doubles since the last refresh award, and the current streak. */
  readonly doubles: { readonly cumulative: number; readonly streak: number };
  /** An opponent's Straight requires this player to reroll at their next turn. */
  readonly forcedRerollPending: boolean;
  /** Private Bazaar stock during a visit; purchased slots are null. */
  readonly stock: readonly (LampType | null)[];
}

export interface TurnState {
  readonly player: PlayerId;
  readonly ownTurnNumber: number;
  /** A Royal Flush bonus turn, which cannot chain another bonus turn. */
  readonly bonus: boolean;
  readonly dice: DiceState | null;
  readonly movesMade: number;
  readonly powerUsed: PowerKind | null;
  readonly playedCards: readonly CardId[];
  readonly reverseAllowance: number;
  readonly anyDirection: boolean;
  readonly amiraReverseUsed: boolean;
  readonly hadiMark: CheckerId | null;
  readonly hadiTriggered: boolean;
  readonly rakhimTriggered: boolean;
  readonly basimTriggered: boolean;
  readonly siroccoTriggered: boolean;
  /** Nahla's choice has been used during this (opponent's) turn. */
  readonly nahlaUsed: boolean;
  readonly royalFlushDeclared: boolean;
}

/** The choice the engine is waiting for. */
export type Decision =
  | { readonly kind: 'opening-roll' }
  | { readonly kind: 'choose-hadi-mark'; readonly player: PlayerId }
  | { readonly kind: 'choose-jinn-target'; readonly player: PlayerId; readonly jinn: 'amira' | 'rakhim' }
  | { readonly kind: 'offer-sahira'; readonly player: PlayerId }
  | { readonly kind: 'roll'; readonly player: PlayerId }
  | { readonly kind: 'offer-exchange'; readonly player: PlayerId }
  | { readonly kind: 'move'; readonly player: PlayerId }
  | { readonly kind: 'choose-zafir-value'; readonly player: PlayerId; readonly die: 0 | 1; readonly candidates: readonly [number, number] }
  | { readonly kind: 'choose-straight-dice'; readonly player: PlayerId; readonly original: readonly [number, number]; readonly rerolled: readonly [number, number] }
  | { readonly kind: 'discard-before-draw'; readonly player: PlayerId }
  | { readonly kind: 'choose-nahla-discard'; readonly player: PlayerId }
  | { readonly kind: 'choose-basim-card'; readonly player: PlayerId; readonly revealed: readonly CardId[] }
  | { readonly kind: 'offer-malik'; readonly player: PlayerId }
  | { readonly kind: 'bazaar'; readonly player: PlayerId }
  | { readonly kind: 'equip-jinn'; readonly player: PlayerId; readonly jinn: JinnId };

/** Internal resolution queue entries; not part of observations. */
export type Task =
  | {
      readonly t: 'start-turn';
      readonly player: PlayerId;
      readonly bonus: boolean;
      /** The opening contest's dice, used instead of rolling on the first turn. */
      readonly openingDice?: readonly [number, number];
    }
  | { readonly t: 'start-jinn'; readonly slot: number }
  | { readonly t: 'roll' }
  | { readonly t: 'roll-rewards' }
  | { readonly t: 'exchange' }
  | { readonly t: 'forced-reroll' }
  | { readonly t: 'move' }
  | { readonly t: 'draw'; readonly player: PlayerId; readonly locked: boolean; readonly source: DrawSource }
  | { readonly t: 'draw-now'; readonly player: PlayerId; readonly locked: boolean; readonly source: DrawSource }
  | { readonly t: 'hit-card'; readonly player: PlayerId }
  | { readonly t: 'basim-reveal'; readonly player: PlayerId }
  | { readonly t: 'forced-discard'; readonly player: PlayerId }
  | { readonly t: 'end-turn' }
  | { readonly t: 'malik' }
  | { readonly t: 'noura' }
  | { readonly t: 'bazaar' }
  | { readonly t: 'bazaar-menu' }
  | { readonly t: 'equip'; readonly player: PlayerId; readonly jinn: JinnId }
  | { readonly t: 'handover' };

export type DrawSource = 'doubles' | 'qamar' | 'exchange' | 'hit' | 'hadi' | 'rakhim' | 'sirocco' | 'noura' | 'sahira';

export type Phase =
  | { readonly kind: 'opening'; readonly rolls: Readonly<Partial<Record<PlayerId, number>>> }
  | { readonly kind: 'playing' }
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
  /** Private draw order. */
  readonly deck: readonly CardId[];
  readonly discardPile: readonly CardId[];
  readonly players: Readonly<Record<PlayerId, PlayerState>>;
  readonly shields: readonly Shield[];
  readonly turn: TurnState | null;
  readonly pending: Decision | null;
  readonly queue: readonly Task[];
  readonly actionLog: readonly GameAction[];
}

interface ActionBase {
  readonly player: PlayerId;
  /** The state sequence this action was chosen against; mismatches are stale. */
  readonly sequence: number;
}

export interface PowerPlay {
  readonly cardIds: readonly CardId[];
  /** Mazin: the selected card treated as any rank and suit. */
  readonly wildCardId?: CardId;
}

export type PowerParams =
  | { readonly power: 'high-card'; readonly die: number; readonly boost: number }
  | { readonly power: 'pair'; readonly die: 0 | 1 }
  | { readonly power: 'two-pair' }
  | { readonly power: 'three-of-a-kind' }
  | { readonly power: 'straight'; readonly mode: 'reroll' | 'force-opponent' }
  | { readonly power: 'flush'; readonly checkerId: CheckerId }
  | { readonly power: 'full-house'; readonly points: readonly [number, number] }
  | { readonly power: 'four-of-a-kind'; readonly die: 0 | 1; readonly value: number }
  | { readonly power: 'straight-flush'; readonly values: readonly [number, number] };

export type GameAction =
  | (ActionBase & { readonly type: 'roll-opening-die' })
  | (ActionBase & { readonly type: 'choose-hadi-mark'; readonly checkerId: CheckerId })
  | (ActionBase & { readonly type: 'choose-jinn-target'; readonly checkerId: CheckerId })
  | (ActionBase & { readonly type: 'use-sahira'; readonly use: boolean })
  | (ActionBase & { readonly type: 'roll-dice' })
  | (ActionBase & { readonly type: 'exchange'; readonly discard: CardId | null })
  | (ActionBase & {
      readonly type: 'move-checker';
      readonly checkerId: CheckerId;
      readonly from: MoveSource;
      readonly to: MoveTarget;
      readonly die: number;
      readonly reverse?: 'power' | 'amira';
    })
  | (ActionBase & PowerPlay & { readonly type: 'play-power'; readonly params: PowerParams })
  | (ActionBase & PowerPlay & { readonly type: 'declare-royal-flush' })
  | (ActionBase & { readonly type: 'end-turn' })
  | (ActionBase & { readonly type: 'choose-zafir-value'; readonly value: number })
  | (ActionBase & { readonly type: 'choose-straight-dice'; readonly keep: 'original' | 'rerolled' })
  | (ActionBase & { readonly type: 'discard-card'; readonly cardId: CardId })
  | (ActionBase & { readonly type: 'choose-basim-card'; readonly cardId: CardId })
  | (ActionBase & { readonly type: 'use-malik'; readonly checkerId: CheckerId | null })
  | (ActionBase & { readonly type: 'bazaar-buy'; readonly slot: number })
  | (ActionBase & { readonly type: 'bazaar-refresh' })
  | (ActionBase & { readonly type: 'bazaar-leave' })
  | (ActionBase & { readonly type: 'equip-jinn'; readonly replaceSlot: number | null });

export type GameEvent =
  | { readonly type: 'opening-die-rolled'; readonly player: PlayerId; readonly value: number }
  | { readonly type: 'opening-tie'; readonly value: number }
  | { readonly type: 'starter-determined'; readonly player: PlayerId; readonly dice: readonly [number, number] }
  | { readonly type: 'turn-started'; readonly player: PlayerId; readonly turnNumber: number; readonly ownTurnNumber: number; readonly bonus: boolean }
  | { readonly type: 'dice-rolled'; readonly player: PlayerId; readonly dice: readonly [number, number]; readonly reason: 'turn' | 'pair' | 'straight' | 'forced' | 'zafir' }
  | { readonly type: 'dice-set'; readonly player: PlayerId; readonly effective: readonly [number, number]; readonly remaining: readonly number[] }
  | { readonly type: 'natural-doubles'; readonly player: PlayerId; readonly cumulative: number; readonly streak: number }
  | { readonly type: 'benefit-banked'; readonly player: PlayerId; readonly benefit: 'refresh' | 'upgrade' | 'discount' }
  | { readonly type: 'checker-moved'; readonly player: PlayerId; readonly checkerId: CheckerId; readonly from: MoveSource; readonly to: MoveTarget; readonly die: number; readonly reverse: boolean }
  | { readonly type: 'checker-hit'; readonly player: PlayerId; readonly checkerId: CheckerId; readonly point: number }
  | { readonly type: 'checker-borne-off'; readonly player: PlayerId; readonly checkerId: CheckerId }
  | { readonly type: 'dinars-awarded'; readonly player: PlayerId; readonly amount: number; readonly balance: number; readonly reason: 'hitter' | 'hit' }
  | { readonly type: 'card-drawn'; readonly player: PlayerId; readonly source: DrawSource; readonly locked: boolean }
  | { readonly type: 'draw-shortfall'; readonly player: PlayerId; readonly source: DrawSource }
  | { readonly type: 'deck-reshuffled'; readonly size: number }
  | { readonly type: 'card-discarded'; readonly player: PlayerId; readonly cardId: CardId; readonly reason: 'hand-limit' | 'forced' | 'nahla' | 'exchange' | 'basim' | 'sahira' }
  | { readonly type: 'cards-revealed'; readonly player: PlayerId; readonly count: number }
  | { readonly type: 'power-played'; readonly player: PlayerId; readonly power: PowerKind; readonly cardIds: readonly CardId[]; readonly wildCardId: CardId | null }
  | { readonly type: 'caravan-exchange'; readonly player: PlayerId; readonly points: readonly [number, number] }
  | { readonly type: 'shield-added'; readonly player: PlayerId; readonly checkerId: CheckerId; readonly source: 'flush' | 'malik' }
  | { readonly type: 'shield-removed'; readonly player: PlayerId; readonly checkerId: CheckerId; readonly reason: 'expired' | 'self-stacked' | 'left-board' }
  | { readonly type: 'forced-reroll-pending'; readonly player: PlayerId }
  | { readonly type: 'royal-flush-declared'; readonly player: PlayerId }
  | { readonly type: 'jinn-triggered'; readonly player: PlayerId; readonly jinn: JinnId; readonly detail: string }
  | { readonly type: 'jinn-target-set'; readonly player: PlayerId; readonly jinn: JinnId; readonly checkerId: CheckerId }
  | { readonly type: 'jinn-revealed'; readonly player: PlayerId; readonly jinn: JinnId; readonly lamp: LampType | 'starting' }
  | { readonly type: 'jinn-equipped'; readonly player: PlayerId; readonly jinn: JinnId; readonly slot: number; readonly replaced: JinnId | null }
  | { readonly type: 'jinn-released'; readonly player: PlayerId; readonly jinn: JinnId }
  | { readonly type: 'lamp-empty'; readonly player: PlayerId }
  | { readonly type: 'bazaar-opened'; readonly player: PlayerId; readonly stock: readonly LampType[] }
  | { readonly type: 'bazaar-refreshed'; readonly player: PlayerId; readonly paid: number; readonly stock: readonly LampType[] }
  | { readonly type: 'lamp-bought'; readonly player: PlayerId; readonly lamp: LampType; readonly opensAs: LampType; readonly price: number; readonly upgraded: boolean; readonly discounted: boolean }
  | { readonly type: 'bazaar-closed'; readonly player: PlayerId }
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

export interface PublicPlayer {
  readonly handCount: number;
  readonly dinars: number;
  readonly jinn: readonly EquippedJinn[];
  readonly spentOncePerMatch: readonly JinnId[];
  readonly malikReadyOnOwnTurn: number;
  readonly benefits: BankedBenefits;
  readonly doubles: { readonly cumulative: number; readonly streak: number };
  readonly forcedRerollPending: boolean;
  readonly onBar: number;
  readonly borneOff: number;
  readonly pipCount: number;
}

/** What one player is allowed to see. Contains no seed, random state or opponent secrets. */
export interface Observation {
  readonly viewer: PlayerId;
  readonly rules: { readonly rulesetId: string; readonly rulesVersion: string };
  readonly sequence: number;
  readonly turnNumber: number;
  readonly completedOwnTurns: Readonly<Record<PlayerId, number>>;
  readonly phase: Phase;
  readonly checkers: readonly Checker[];
  readonly shields: readonly Shield[];
  readonly deckCount: number;
  readonly discardPile: readonly CardId[];
  readonly turn: TurnState | null;
  /** The pending decision; private details are included only for its own player. */
  readonly pending: Decision | null;
  readonly players: Readonly<Record<PlayerId, PublicPlayer>>;
  readonly private: {
    readonly hand: readonly CardId[];
    readonly lockedCards: readonly CardId[];
    readonly stock: readonly (LampType | null)[];
  };
  readonly legalActions: readonly GameAction[];
}
