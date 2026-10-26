/**
 * The turn engine.
 *
 * Every accepted action answers the current `pending` decision. The engine
 * then works through its task queue until it needs another decision. Tasks
 * follow the documented turn order:
 *
 *   start-of-turn Jinn choices → roll and roll rewards (natural doubles,
 *   6-and-1 exchange, forced reroll) → optional pre-movement poker power and
 *   checker movement → Royal Flush declaration → played-card discard and
 *   end-turn Jinn (Malik, Noura) → Bazaar visit if due → handover or bonus turn.
 *
 * A hit resolves as: checker to the bar, Dinars to both players, the hitter's
 * card (or Basim's choice), the hit player's random discard (or Nahla's
 * choice), then other Jinn triggers in slot order (B10).
 *
 * applyAction never mutates its input. It works on a private copy and returns
 * the original state object untouched when an action is rejected.
 */

import { BAR, OFF, createStartingCheckers, fromOwnPoint, opponentOf, ownIndex, pipCount, positionFor, toOwnPoint } from './board.js';
import {
  fullDeck,
  parseCard,
  qualifyingHands,
  qualifyingHandsWithWild,
  type CardId,
  type PowerKind,
} from './cards.js';
import { drawJinn, type JinnId, type LampType } from './jinn.js';
import { legalSteps, type MoveContext, type Step } from './movement.js';
import { RULES_V0_4, type RulesConfig } from './rules.js';
import { randomInt, rollDie, seedStreams, shuffle, type RngState, type RngStreamName } from './rng.js';
import {
  PLAYERS,
  STATE_SCHEMA_VERSION,
  type ApplyResult,
  type Checker,
  type CheckerId,
  type Decision,
  type DrawSource,
  type GameAction,
  type GameEvent,
  type GameState,
  type MoveSource,
  type MoveTarget,
  type Observation,
  type PlayerId,
  type PlayerState,
  type PowerParams,
  type Task,
  type TurnState,
} from './types.js';

// ---------------------------------------------------------------------------
// Mutable working copy

type DeepMutable<T> = T extends readonly (infer U)[]
  ? DeepMutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
    : T;

type Draft = DeepMutable<Omit<GameState, 'rules' | 'actionLog' | 'rng'>> & {
  rules: RulesConfig;
  rng: { -readonly [K in RngStreamName]: RngState };
  actionLog: readonly GameAction[];
};
type DraftPlayer = DeepMutable<PlayerState>;
type DraftTurn = DeepMutable<TurnState>;

function toDraft(state: GameState): Draft {
  const { rules, actionLog, ...rest } = state;
  return { ...(JSON.parse(JSON.stringify(rest)) as Omit<Draft, 'rules' | 'actionLog'>), rules, actionLog };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ---------------------------------------------------------------------------
// Setup

export interface CreateGameOptions {
  readonly seed: string;
  readonly rules?: RulesConfig;
}

export function createGame({ seed, rules = RULES_V0_4 }: CreateGameOptions): GameState {
  if (typeof seed !== 'string' || seed.length === 0) throw new Error('A non-empty seed is required.');
  const emptyPlayer = (): DraftPlayer => ({
    hand: [],
    lockedCards: [],
    dinars: rules.economy.startingDinars,
    jinn: [],
    spentOncePerMatch: [],
    malikReadyOnOwnTurn: 0,
    benefits: { refreshes: 0, upgrades: 0, discounts: 0 },
    doubles: { cumulative: 0, streak: 0 },
    forcedRerollPending: false,
    stock: [],
  });
  const draft: Draft = {
    schemaVersion: STATE_SCHEMA_VERSION,
    rules,
    seed,
    rng: { ...seedStreams(seed) },
    sequence: 0,
    turnNumber: 0,
    completedOwnTurns: { white: 0, black: 0 },
    phase: { kind: 'opening', rolls: {} },
    checkers: createStartingCheckers() as Draft['checkers'],
    deck: [],
    discardPile: [],
    players: { white: emptyPlayer(), black: emptyPlayer() },
    shields: [],
    turn: null,
    pending: { kind: 'opening-roll' },
    queue: [],
    actionLog: [],
  };

  const shuffled = shuffle(fullDeck(), draft.rng.deck);
  draft.rng.deck = shuffled.state;
  draft.deck = shuffled.items;
  for (let i = 0; i < rules.cards.startingHandSize; i++) {
    for (const player of PLAYERS) draft.players[player].hand.push(draft.deck.shift()!);
  }

  // Each player's free mystery lamp is opened before play.
  for (const player of PLAYERS) {
    const result = drawJinn(rules.lamps.rarityWeights[rules.lamps.startingLamp], [], draft.rng.lamp);
    draft.rng.lamp = result.state;
    if (result.jinn) draft.players[player].jinn.push({ id: result.jinn, activeFromTurn: 1, target: null });
  }
  return draft as unknown as GameState;
}

// ---------------------------------------------------------------------------
// Public interface

export function applyAction(state: GameState, action: GameAction): ApplyResult {
  if (state.phase.kind === 'finished') return reject(state, 'game-finished', 'The game has already finished.');
  if (!action || typeof action !== 'object' || action.sequence !== state.sequence) {
    return reject(state, 'stale-action', `Action sequence does not match state sequence ${state.sequence}.`);
  }
  const legal = getLegalActions(state);
  if (!legal.some((candidate) => candidate.player === action.player)) {
    return reject(state, 'wrong-player', `It is not ${String(action.player)}'s decision.`);
  }
  // Resolve and log the engine's own copy, never the caller's object.
  const accepted = legal.find((candidate) => sameAction(candidate, action));
  if (!accepted) return reject(state, 'illegal-action', 'That action is not legal in the current state.');

  const draft = toDraft(state);
  const events: GameEvent[] = [];
  const decision = clone(state.pending!);
  draft.pending = null;
  resolveDecision(draft, decision, accepted, events);
  run(draft, events);
  draft.sequence = state.sequence + 1;
  draft.actionLog = [...state.actionLog, accepted];
  return { ok: true, state: draft as unknown as GameState, events };
}

export function getLegalActions(state: GameState, player?: PlayerId): GameAction[] {
  const actions = state.phase.kind === 'finished' || !state.pending ? [] : decisionActions(state, state.pending);
  return player === undefined ? actions : actions.filter((action) => action.player === player);
}

export function getObservation(state: GameState, viewer: PlayerId): Observation {
  const publicPlayer = (player: PlayerId) => {
    const p = state.players[player];
    return {
      handCount: p.hand.length,
      dinars: p.dinars,
      jinn: clone(p.jinn),
      spentOncePerMatch: [...p.spentOncePerMatch],
      malikReadyOnOwnTurn: p.malikReadyOnOwnTurn,
      benefits: { ...p.benefits },
      doubles: { ...p.doubles },
      forcedRerollPending: p.forcedRerollPending,
      onBar: state.checkers.filter((c) => c.owner === player && c.location.kind === 'bar').length,
      borneOff: state.checkers.filter((c) => c.owner === player && c.location.kind === 'off').length,
      pipCount: pipCount(state.checkers, player),
    };
  };
  let pending = state.pending ? clone(state.pending) : null;
  if (pending?.kind === 'choose-basim-card' && pending.player !== viewer) pending = { ...pending, revealed: [] };
  const own = state.players[viewer];
  // Built field by field so the seed, random state, deck order and opponent secrets never leak.
  return {
    viewer,
    rules: { rulesetId: state.rules.rulesetId, rulesVersion: state.rules.rulesVersion },
    sequence: state.sequence,
    turnNumber: state.turnNumber,
    completedOwnTurns: { ...state.completedOwnTurns },
    phase: clone(state.phase),
    checkers: clone(state.checkers),
    shields: clone(state.shields),
    deckCount: state.deck.length,
    discardPile: [...state.discardPile],
    turn: state.turn ? clone(state.turn) : null,
    pending,
    players: { white: publicPlayer('white'), black: publicPlayer('black') },
    private: { hand: [...own.hand], lockedCards: [...own.lockedCards], stock: [...own.stock] },
    legalActions: getLegalActions(state, viewer),
  };
}

// ---------------------------------------------------------------------------
// Task queue

function run(draft: Draft, events: GameEvent[]): void {
  while (!draft.pending && draft.phase.kind !== 'finished') {
    const task = draft.queue.shift();
    if (!task) throw new Error('Engine stalled: no pending decision and no queued work.');
    runTask(draft, task as Task, events);
  }
}

function push(draft: Draft, ...tasks: Task[]): void {
  draft.queue.unshift(...(clone(tasks) as Draft['queue']));
}

function wait(draft: Draft, decision: Decision): void {
  draft.pending = clone(decision) as Draft['pending'];
}

function turnOf(draft: Draft): DraftTurn {
  if (!draft.turn) throw new Error('No turn in progress.');
  return draft.turn;
}

function isActive(draft: Draft | GameState, player: PlayerId, jinn: JinnId): boolean {
  return draft.players[player].jinn.some((j) => j.id === jinn && j.activeFromTurn <= draft.turnNumber);
}

function activeSlot(draft: Draft | GameState, player: PlayerId, jinn: JinnId) {
  return draft.players[player].jinn.find((j) => j.id === jinn && j.activeFromTurn <= draft.turnNumber);
}

function random(draft: Draft, stream: RngStreamName, n: number): number {
  const result = randomInt(draft.rng[stream], n);
  draft.rng[stream] = result.state;
  return result.value;
}

function die(draft: Draft): number {
  const result = rollDie(draft.rng.dice);
  draft.rng.dice = result.state;
  return result.value;
}

function movementValues(effective: readonly [number, number] | number[]): number[] {
  const [a, b] = effective as [number, number];
  return a === b ? [a, a, a, a] : [a, b];
}

function runTask(draft: Draft, task: Task, events: GameEvent[]): void {
  switch (task.t) {
    case 'start-turn':
      return startTurn(draft, task.player, task.bonus, task.openingDice, events);
    case 'start-jinn':
      return startJinn(draft, task.slot);
    case 'roll':
      return wait(draft, { kind: 'roll', player: turnOf(draft).player });
    case 'roll-rewards':
      return rollRewards(draft, events);
    case 'exchange': {
      const player = turnOf(draft).player;
      if (draft.players[player].hand.length > 0) wait(draft, { kind: 'offer-exchange', player });
      return;
    }
    case 'forced-reroll': {
      const turn = turnOf(draft);
      const p = draft.players[turn.player];
      if (!p.forcedRerollPending || !turn.dice) return;
      p.forcedRerollPending = false;
      const dice: [number, number] = [die(draft), die(draft)];
      turn.dice.effective = dice;
      turn.dice.remaining = movementValues(dice);
      events.push({ type: 'dice-rolled', player: turn.player, dice, reason: 'forced' });
      return;
    }
    case 'move':
      return wait(draft, { kind: 'move', player: turnOf(draft).player });
    case 'draw':
      if (draft.players[task.player].hand.length >= draft.rules.cards.maxHandSize) {
        push(draft, { t: 'draw-now', player: task.player, locked: task.locked, source: task.source });
        return wait(draft, { kind: 'discard-before-draw', player: task.player });
      }
      return drawNow(draft, task.player, task.locked, task.source, events);
    case 'draw-now':
      return drawNow(draft, task.player, task.locked, task.source, events);
    case 'hit-card': {
      const turn = turnOf(draft);
      if (isActive(draft, task.player, 'basim') && !turn.basimTriggered) {
        turn.basimTriggered = true;
        events.push({ type: 'jinn-triggered', player: task.player, jinn: 'basim', detail: 'reveal two capture cards' });
        return push(draft, { t: 'basim-reveal', player: task.player });
      }
      return push(draft, { t: 'draw', player: task.player, locked: true, source: 'hit' });
    }
    case 'basim-reveal': {
      if (draft.players[task.player].hand.length >= draft.rules.cards.maxHandSize) {
        push(draft, { t: 'basim-reveal', player: task.player });
        return wait(draft, { kind: 'discard-before-draw', player: task.player });
      }
      const revealed: CardId[] = [];
      for (let i = 0; i < 2; i++) {
        const card = takeFromDeck(draft, events);
        if (card) revealed.push(card);
      }
      if (revealed.length === 0) {
        events.push({ type: 'draw-shortfall', player: task.player, source: 'hit' });
        return;
      }
      events.push({ type: 'cards-revealed', player: task.player, count: revealed.length });
      return wait(draft, { kind: 'choose-basim-card', player: task.player, revealed });
    }
    case 'forced-discard':
      return forcedDiscard(draft, task.player, events);
    case 'end-turn':
      return endTurn(draft, events);
    case 'malik': {
      const turn = turnOf(draft);
      const p = draft.players[turn.player];
      if (
        isActive(draft, turn.player, 'malik') &&
        turn.ownTurnNumber >= p.malikReadyOnOwnTurn &&
        exposedCheckers(draft, turn.player).length > 0
      ) {
        wait(draft, { kind: 'offer-malik', player: turn.player });
      }
      return;
    }
    case 'noura': {
      const player = turnOf(draft).player;
      if (isActive(draft, player, 'noura') && draft.players[player].hand.length === 0) {
        events.push({ type: 'jinn-triggered', player, jinn: 'noura', detail: 'draw 2 on an empty hand' });
        push(
          draft,
          { t: 'draw', player, locked: false, source: 'noura' },
          { t: 'draw', player, locked: false, source: 'noura' },
        );
      }
      return;
    }
    case 'bazaar': {
      const player = turnOf(draft).player;
      if (draft.completedOwnTurns[player] % draft.rules.bazaar.visitEveryOwnTurns !== 0) return;
      const stock = generateStock(draft);
      draft.players[player].stock = stock;
      // Stock is private, so the shared event carries no offers (Z1).
      events.push({ type: 'bazaar-opened', player });
      return push(draft, { t: 'bazaar-menu' });
    }
    case 'bazaar-menu':
      return wait(draft, { kind: 'bazaar', player: turnOf(draft).player });
    case 'equip': {
      const p = draft.players[task.player];
      if (p.jinn.length < draft.rules.jinn.equipSlots) {
        p.jinn.push({ id: task.jinn, activeFromTurn: draft.turnNumber + 1, target: null });
        events.push({ type: 'jinn-equipped', player: task.player, jinn: task.jinn, slot: p.jinn.length - 1, replaced: null });
        return;
      }
      return wait(draft, { kind: 'equip-jinn', player: task.player, jinn: task.jinn });
    }
    case 'handover':
      return handover(draft, events);
  }
}

// ---------------------------------------------------------------------------
// Turn flow

function startTurn(
  draft: Draft,
  player: PlayerId,
  bonus: boolean,
  openingDice: readonly [number, number] | undefined,
  events: GameEvent[],
): void {
  draft.turnNumber += 1;
  const ownTurnNumber = draft.completedOwnTurns[player] + 1;
  draft.turn = {
    player,
    ownTurnNumber,
    bonus,
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
  };
  events.push({ type: 'turn-started', player, turnNumber: draft.turnNumber, ownTurnNumber, bonus });
  const tasks: Task[] = draft.players[player].jinn.map((_, slot) => ({ t: 'start-jinn', slot }));
  if (openingDice) {
    draft.turn.dice = {
      initialRoll: [...openingDice],
      initialRollSource: 'opening-contest',
      effective: [...openingDice],
      remaining: movementValues([...openingDice]),
    };
    tasks.push({ t: 'roll-rewards' });
  } else {
    tasks.push({ t: 'roll' });
  }
  push(draft, ...tasks);
}

function startJinn(draft: Draft, slot: number): void {
  const turn = turnOf(draft);
  const player = turn.player;
  const jinn = draft.players[player].jinn[slot];
  if (!jinn || jinn.activeFromTurn > draft.turnNumber) return;
  switch (jinn.id) {
    case 'hadi':
      if (draft.checkers.some((c) => c.owner !== player && c.location.kind === 'point')) {
        wait(draft, { kind: 'choose-hadi-mark', player });
      }
      return;
    case 'amira':
    case 'rakhim': {
      const target = jinn.target ? draft.checkers.find((c) => c.id === jinn.target) : undefined;
      if (target && target.location.kind !== 'off') return;
      jinn.target = null;
      if (draft.checkers.some((c) => c.owner === player && c.location.kind !== 'off')) {
        wait(draft, { kind: 'choose-jinn-target', player, jinn: jinn.id });
      }
      return;
    }
    case 'sahira':
      if (!draft.players[player].spentOncePerMatch.includes('sahira')) wait(draft, { kind: 'offer-sahira', player });
      return;
    default:
      return;
  }
}

function rollRewards(draft: Draft, events: GameEvent[]): void {
  const turn = turnOf(draft);
  const dice = turn.dice!;
  const player = turn.player;
  const p = draft.players[player];
  const [a, b] = dice.initialRoll as [number, number];
  const tasks: Task[] = [];

  if (a === b && dice.initialRollSource === 'turn-roll') {
    p.doubles.cumulative += 1;
    p.doubles.streak += 1;
    events.push({ type: 'natural-doubles', player, cumulative: p.doubles.cumulative, streak: p.doubles.streak });
    if (p.doubles.cumulative >= 2) {
      p.doubles.cumulative = 0;
      p.benefits.refreshes += 1;
      events.push({ type: 'benefit-banked', player, benefit: 'refresh' });
    }
    if (p.doubles.streak === 2) {
      p.benefits.upgrades += 1;
      events.push({ type: 'benefit-banked', player, benefit: 'upgrade' });
    }
    if (p.doubles.streak === 3) {
      p.benefits.discounts += 1;
      events.push({ type: 'benefit-banked', player, benefit: 'discount' });
    }
    for (let i = 0; i < draft.rules.cards.naturalDoublesDraw; i++) {
      tasks.push({ t: 'draw', player, locked: false, source: 'doubles' });
    }
    if (isActive(draft, player, 'qamar')) {
      events.push({ type: 'jinn-triggered', player, jinn: 'qamar', detail: 'extra card for natural doubles' });
      tasks.push({ t: 'draw', player, locked: false, source: 'qamar' });
    }
  } else {
    p.doubles.streak = 0;
  }
  if ((a === 6 && b === 1) || (a === 1 && b === 6)) tasks.push({ t: 'exchange' });
  tasks.push({ t: 'forced-reroll' }, { t: 'move' });
  push(draft, ...tasks);
}

function endTurn(draft: Draft, events: GameEvent[]): void {
  const turn = turnOf(draft);
  const player = turn.player;
  const p = draft.players[player];
  if (turn.dice && turn.dice.remaining.length > 0) {
    events.push({ type: 'dice-unusable', player, dice: [...turn.dice.remaining] });
  }
  draft.discardPile.push(...turn.playedCards);
  turn.playedCards = [];
  p.lockedCards = [];
  draft.completedOwnTurns[player] += 1;
  events.push({ type: 'turn-ended', player, ownTurnNumber: draft.completedOwnTurns[player] });
  push(draft, { t: 'malik' }, { t: 'noura' }, { t: 'bazaar' }, { t: 'handover' });
}

function handover(draft: Draft, events: GameEvent[]): void {
  const turn = turnOf(draft);
  const player = turn.player;
  const opponent = opponentOf(player);
  // The opponent's shields protected them through this turn and now expire.
  for (const shield of draft.shields.filter((s) => s.owner === opponent)) {
    events.push({ type: 'shield-removed', player: opponent, checkerId: shield.checkerId, reason: 'expired' });
  }
  draft.shields = draft.shields.filter((s) => s.owner !== opponent);
  draft.players[player].stock = [];
  const bonus = turn.royalFlushDeclared;
  draft.turn = null;
  push(draft, { t: 'start-turn', player: bonus ? player : opponent, bonus });
}

// ---------------------------------------------------------------------------
// Cards

function takeFromDeck(draft: Draft, events: GameEvent[]): CardId | null {
  if (draft.deck.length === 0 && draft.discardPile.length > 0) {
    const shuffled = shuffle(draft.discardPile, draft.rng.deck);
    draft.rng.deck = shuffled.state;
    draft.deck = shuffled.items;
    draft.discardPile = [];
    events.push({ type: 'deck-reshuffled', size: draft.deck.length });
  }
  return draft.deck.shift() ?? null;
}

function drawNow(draft: Draft, player: PlayerId, locked: boolean, source: DrawSource, events: GameEvent[]): void {
  const card = takeFromDeck(draft, events);
  if (!card) {
    events.push({ type: 'draw-shortfall', player, source });
    return;
  }
  const p = draft.players[player];
  p.hand.push(card);
  if (locked) p.lockedCards.push(card);
  events.push({ type: 'card-drawn', player, source, locked });
}

function discardFromHand(
  draft: Draft,
  player: PlayerId,
  cardId: CardId,
  reason: Extract<GameEvent, { type: 'card-discarded' }>['reason'],
  events: GameEvent[],
): void {
  const p = draft.players[player];
  p.hand = p.hand.filter((c) => c !== cardId);
  p.lockedCards = p.lockedCards.filter((c) => c !== cardId);
  draft.discardPile.push(cardId);
  events.push({ type: 'card-discarded', player, cardId, reason });
}

function forcedDiscard(draft: Draft, player: PlayerId, events: GameEvent[]): void {
  const p = draft.players[player];
  if (p.hand.length === 0) return;
  const turn = turnOf(draft);
  if (isActive(draft, player, 'nahla') && !turn.nahlaUsed) {
    turn.nahlaUsed = true;
    events.push({ type: 'jinn-triggered', player, jinn: 'nahla', detail: 'choose the forced discard' });
    return wait(draft, { kind: 'choose-nahla-discard', player });
  }
  discardFromHand(draft, player, p.hand[random(draft, 'discard', p.hand.length)]!, 'forced', events);
}

function playableCards(state: Draft | GameState, player: PlayerId): CardId[] {
  const p = state.players[player];
  return p.hand.filter((c) => !p.lockedCards.includes(c));
}

// ---------------------------------------------------------------------------
// Board helpers

function checkerById(state: Draft | GameState, id: CheckerId): Checker {
  const checker = state.checkers.find((c) => c.id === id);
  if (!checker) throw new Error(`Unknown checker ${id}`);
  return checker as Checker;
}

function draftChecker(draft: Draft, id: CheckerId): Draft['checkers'][number] {
  const checker = draft.checkers.find((c) => c.id === id);
  if (!checker) throw new Error(`Unknown checker ${id}`);
  return checker;
}

function checkersOn(state: Draft | GameState, point: number): readonly Checker[] {
  return state.checkers.filter((c) => c.location.kind === 'point' && c.location.point === point) as readonly Checker[];
}

function exposedCheckers(state: Draft | GameState, player: PlayerId): CheckerId[] {
  const result: CheckerId[] = [];
  for (let point = 1; point <= 24; point++) {
    const here = checkersOn(state, point);
    if (here.length === 1 && here[0]!.owner === player && !state.shields.some((s) => s.checkerId === here[0]!.id)) {
      result.push(here[0]!.id);
    }
  }
  return result;
}

function moveContext(state: Draft | GameState, player: PlayerId): MoveContext {
  const turn = state.turn!;
  const amira = activeSlot(state, player, 'amira');
  let amiraAt: number | null = null;
  if (amira?.target && !turn.amiraReverseUsed) {
    const target = checkerById(state, amira.target);
    if (target.location.kind !== 'off') amiraAt = ownIndex(player, target.location);
  }
  return {
    reverseAllowance: turn.reverseAllowance,
    anyDirection: turn.anyDirection,
    amiraAt,
    hasBorneOff: state.checkers.some((c) => c.owner === player && c.location.kind === 'off'),
  };
}

function searchPosition(state: Draft | GameState, player: PlayerId) {
  const position = positionFor(state.checkers as readonly Checker[], player);
  // A shielded blot cannot be hit, so it blocks the point like a made point.
  for (const shield of state.shields) {
    if (shield.owner === player) continue;
    const checker = checkerById(state, shield.checkerId);
    if (checker.location.kind === 'point') {
      const index = toOwnPoint(player, checker.location.point);
      position.opponent[index] = Math.max(position.opponent[index]!, 2);
    }
  }
  return position;
}

function currentSteps(state: Draft | GameState, remaining?: readonly number[]): Step[] {
  const turn = state.turn!;
  return legalSteps(searchPosition(state, turn.player), remaining ?? turn.dice!.remaining, moveContext(state, turn.player));
}

// ---------------------------------------------------------------------------
// Decisions: legal actions

function decisionActions(state: GameState, decision: Decision): GameAction[] {
  const sequence = state.sequence;
  if (decision.kind === 'opening-roll') {
    if (state.phase.kind !== 'opening') return [];
    const rolls = state.phase.rolls;
    return PLAYERS.filter((p) => rolls[p] === undefined).map((player) => ({ type: 'roll-opening-die', player, sequence }));
  }
  const player = decision.player;
  const base = { player, sequence };
  const hand = state.players[player].hand;
  switch (decision.kind) {
    case 'choose-hadi-mark':
      return state.checkers
        .filter((c) => c.owner !== player && c.location.kind === 'point')
        .map((c) => ({ ...base, type: 'choose-hadi-mark', checkerId: c.id }));
    case 'choose-jinn-target':
      return state.checkers
        .filter((c) => c.owner === player && c.location.kind !== 'off')
        .map((c) => ({ ...base, type: 'choose-jinn-target', checkerId: c.id }));
    case 'offer-sahira':
      return [
        { ...base, type: 'use-sahira', use: true },
        { ...base, type: 'use-sahira', use: false },
      ];
    case 'roll':
      return [{ ...base, type: 'roll-dice' }];
    case 'offer-exchange':
      return [
        ...hand.map((cardId): GameAction => ({ ...base, type: 'exchange', discard: cardId })),
        { ...base, type: 'exchange', discard: null },
      ];
    case 'move':
      return moveActions(state, player);
    case 'choose-zafir-value':
      return [...new Set(decision.candidates)].map((value) => ({ ...base, type: 'choose-zafir-value', value }));
    case 'choose-straight-dice':
      return [
        { ...base, type: 'choose-straight-dice', keep: 'original' },
        { ...base, type: 'choose-straight-dice', keep: 'rerolled' },
      ];
    case 'discard-before-draw':
    case 'choose-nahla-discard':
      return hand.map((cardId) => ({ ...base, type: 'discard-card', cardId }));
    case 'choose-basim-card':
      return decision.revealed.map((cardId) => ({ ...base, type: 'choose-basim-card', cardId }));
    case 'offer-malik':
      return [
        ...exposedCheckers(state, player).map((checkerId): GameAction => ({ ...base, type: 'use-malik', checkerId })),
        { ...base, type: 'use-malik', checkerId: null },
      ];
    case 'bazaar': {
      const p = state.players[player];
      const actions: GameAction[] = [];
      p.stock.forEach((lamp, slot) => {
        if (lamp && purchaseQuote(state, player, lamp).price <= p.dinars) actions.push({ ...base, type: 'bazaar-buy', slot });
      });
      if (p.benefits.refreshes > 0 || p.dinars >= state.rules.bazaar.paidRefreshPrice) {
        actions.push({ ...base, type: 'bazaar-refresh' });
      }
      actions.push({ ...base, type: 'bazaar-leave' });
      return actions;
    }
    case 'equip-jinn':
      return [
        ...state.players[player].jinn.map((_, slot): GameAction => ({ ...base, type: 'equip-jinn', replaceSlot: slot })),
        { ...base, type: 'equip-jinn', replaceSlot: null },
      ];
  }
}

function moveActions(state: GameState, player: PlayerId): GameAction[] {
  const turn = state.turn!;
  const base = { player, sequence: state.sequence };
  const steps = currentSteps(state);
  const actions: GameAction[] = [];
  const amira = activeSlot(state, player, 'amira');
  const amiraId = moveContext(state, player).amiraAt !== null ? amira?.target ?? null : null;

  for (const step of steps) {
    const sources = step.special
      ? [checkerById(state, amiraId!)]
      : state.checkers
          .filter(
            (c) =>
              c.owner === player &&
              c.location.kind !== 'off' &&
              ownIndex(player, c.location) === step.from &&
              c.id !== amiraId,
          )
          .sort((a, b) => a.id.localeCompare(b.id));
    for (const checker of sources) {
      actions.push({
        ...base,
        type: 'move-checker',
        checkerId: checker.id,
        from: step.from === BAR ? 'bar' : fromOwnPoint(player, step.from),
        to: step.to === OFF ? 'off' : fromOwnPoint(player, step.to),
        die: step.die,
        ...(step.reverse ? { reverse: step.reverse } : {}),
      });
    }
  }
  if (steps.length === 0) {
    actions.push({ ...base, type: 'end-turn' });
    if (!turn.powerUsed && !turn.bonus) {
      for (const play of powerSelections(state, player)) {
        if (play.power === 'royal-flush') actions.push({ ...base, type: 'declare-royal-flush', ...play.selection });
      }
    }
  }
  if (turn.movesMade === 0 && !turn.powerUsed) actions.push(...powerActions(state, player));
  return actions;
}

interface Selection {
  readonly cardIds: readonly CardId[];
  readonly wildCardId?: CardId;
}

/** Every qualifying (selection, power) pair from the player's playable cards. */
function powerSelections(state: GameState, player: PlayerId): { selection: Selection; power: PowerKind; boost?: number }[] {
  const cards = playableCards(state, player);
  const wild = isActive(state, player, 'mazin') && !state.players[player].spentOncePerMatch.includes('mazin');
  const results: { selection: Selection; power: PowerKind; boost?: number }[] = [];
  for (const subset of combinations(cards, 5)) {
    const parsed = subset.map(parseCard);
    const plain = qualifyingHands(parsed);
    const seen = new Set(plain.map((h) => `${h.power}:${h.boost ?? ''}`));
    for (const hand of plain) results.push({ selection: { cardIds: subset }, ...hand });
    if (!wild) continue;
    subset.forEach((wildCardId, index) => {
      for (const hand of qualifyingHandsWithWild(parsed, index)) {
        // Spending Mazin on a hand that already qualifies would only waste him.
        if (seen.has(`${hand.power}:${hand.boost ?? ''}`)) continue;
        results.push({ selection: { cardIds: subset, wildCardId }, ...hand });
      }
    });
  }
  return results;
}

function combinations<T>(items: readonly T[], maxSize: number): T[][] {
  const result: T[][] = [];
  const recurse = (start: number, current: T[]) => {
    if (current.length > 0) result.push([...current]);
    if (current.length === maxSize) return;
    for (let i = start; i < items.length; i++) {
      current.push(items[i]!);
      recurse(i + 1, current);
      current.pop();
    }
  };
  recurse(0, []);
  return result;
}

function powerActions(state: GameState, player: PlayerId): GameAction[] {
  const turn = state.turn!;
  const dice = turn.dice!;
  const base = { player, sequence: state.sequence, type: 'play-power' as const };
  const actions: GameAction[] = [];
  const [e0, e1] = dice.effective as [number, number];
  const dieIndices: (0 | 1)[] = e0 === e1 ? [0] : [0, 1];

  for (const { selection, power, boost } of powerSelections(state, player)) {
    const add = (params: PowerParams) => actions.push({ ...base, ...selection, params });
    switch (power) {
      case 'high-card': {
        for (const value of new Set(dice.remaining)) {
          const boosted = value + boost!;
          if (boosted > state.rules.cards.maxBoostedDie) continue;
          const remaining = replaceOne(dice.remaining, value, boosted);
          // The boosted die must have a legal destination.
          if (currentSteps(state, remaining).some((s) => s.die === boosted)) add({ power, die: value, boost: boost! });
        }
        break;
      }
      case 'pair':
        for (const die of dieIndices) add({ power, die });
        break;
      case 'two-pair':
      case 'three-of-a-kind':
        add({ power });
        break;
      case 'straight':
        add({ power, mode: 'reroll' });
        add({ power, mode: 'force-opponent' });
        break;
      case 'flush':
        for (const c of state.checkers) {
          if (c.owner === player && c.location.kind === 'point' && !state.shields.some((s) => s.checkerId === c.id)) {
            add({ power, checkerId: c.id });
          }
        }
        break;
      case 'full-house':
        for (const points of caravanPairs(state, player)) add({ power, points });
        break;
      case 'four-of-a-kind':
        for (const die of dieIndices) {
          for (let value = 1; value <= 6; value++) {
            if (value !== dice.effective[die]) add({ power, die, value });
          }
        }
        break;
      case 'straight-flush':
        for (let a = 1; a <= 6; a++) {
          for (let b = 1; b <= 6; b++) {
            // Setting the dice to the values they already show (in either order) changes nothing.
            if (!((a === e0 && b === e1) || (a === e1 && b === e0))) add({ power, values: [a, b] });
          }
        }
        break;
      case 'royal-flush':
        break;
    }
  }
  return actions;
}

function replaceOne(values: readonly number[], from: number, to: number): number[] {
  const index = values.indexOf(from);
  return values.map((v, i) => (i === index ? to : v));
}

/** Point signature for Caravan Exchange: stack size plus enchanted checkers. */
function pointSignature(state: GameState, player: PlayerId, point: number): string {
  const here = checkersOn(state, point);
  const enchanted = here
    .filter((c) => enchantments(state, player, c.id).length > 0)
    .map((c) => `${c.id}:${enchantments(state, player, c.id).join('+')}`)
    .sort();
  return `${here.length}|${enchanted.join(',')}`;
}

function enchantments(state: GameState, player: PlayerId, id: CheckerId): string[] {
  const tags: string[] = [];
  for (const jinn of state.players[player].jinn) if (jinn.target === id) tags.push(jinn.id);
  if (state.shields.some((s) => s.checkerId === id)) tags.push('shield');
  return tags;
}

function caravanPairs(state: GameState, player: PlayerId): [number, number][] {
  if (state.checkers.some((c) => c.owner === player && c.location.kind === 'bar')) return [];
  const pairs: [number, number][] = [];
  for (let quadrant = 0; quadrant < 4; quadrant++) {
    const points = [1, 2, 3, 4, 5, 6].map((n) => quadrant * 6 + n);
    const usable = points.filter((p) => checkersOn(state, p).every((c) => c.owner === player));
    for (let i = 0; i < usable.length; i++) {
      for (let j = i + 1; j < usable.length; j++) {
        const a = usable[i]!;
        const b = usable[j]!;
        if (checkersOn(state, a).length === 0 && checkersOn(state, b).length === 0) continue;
        // Reject ineffective swaps: identical stacks with no differing enchantments.
        if (pointSignature(state, player, a) === pointSignature(state, player, b)) continue;
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// Decisions: resolution

function resolveDecision(draft: Draft, decision: Decision, action: GameAction, events: GameEvent[]): void {
  const player = action.player;
  const p = draft.players[player];
  switch (action.type) {
    case 'roll-opening-die':
      return rollOpening(draft, player, events);
    case 'choose-hadi-mark': {
      turnOf(draft).hadiMark = action.checkerId;
      events.push({ type: 'jinn-target-set', player, jinn: 'hadi', checkerId: action.checkerId });
      return;
    }
    case 'choose-jinn-target': {
      if (decision.kind !== 'choose-jinn-target') return;
      const slot = p.jinn.find((j) => j.id === decision.jinn)!;
      slot.target = action.checkerId;
      events.push({ type: 'jinn-target-set', player, jinn: decision.jinn, checkerId: action.checkerId });
      return;
    }
    case 'use-sahira':
      if (!action.use) return;
      p.spentOncePerMatch.push('sahira');
      events.push({ type: 'jinn-triggered', player, jinn: 'sahira', detail: 'discard hand and draw 7' });
      for (const card of [...p.hand]) discardFromHand(draft, player, card, 'sahira', events);
      for (let i = 0; i < 7; i++) push(draft, { t: 'draw', player, locked: false, source: 'sahira' });
      return;
    case 'roll-dice': {
      const dice: [number, number] = [die(draft), die(draft)];
      turnOf(draft).dice = { initialRoll: dice, initialRollSource: 'turn-roll', effective: [...dice], remaining: movementValues(dice) };
      events.push({ type: 'dice-rolled', player, dice, reason: 'turn' });
      return push(draft, { t: 'roll-rewards' });
    }
    case 'exchange':
      if (action.discard === null) return;
      discardFromHand(draft, player, action.discard, 'exchange', events);
      return push(
        draft,
        { t: 'draw', player, locked: false, source: 'exchange' },
        { t: 'draw', player, locked: false, source: 'exchange' },
      );
    case 'move-checker':
      return moveChecker(draft, action, events);
    case 'play-power':
      return playPower(draft, action, events);
    case 'declare-royal-flush': {
      const turn = turnOf(draft);
      spendCards(draft, player, action, 'royal-flush', events);
      turn.royalFlushDeclared = true;
      events.push({ type: 'royal-flush-declared', player });
      return push(draft, { t: 'end-turn' });
    }
    case 'end-turn':
      return push(draft, { t: 'end-turn' });
    case 'choose-zafir-value': {
      const turn = turnOf(draft);
      if (decision.kind !== 'choose-zafir-value') return;
      const effective = [...turn.dice!.effective];
      effective[decision.die] = action.value;
      setDice(draft, effective as [number, number], events);
      return push(draft, { t: 'move' });
    }
    case 'choose-straight-dice': {
      if (decision.kind !== 'choose-straight-dice') return;
      setDice(draft, [...(action.keep === 'original' ? decision.original : decision.rerolled)] as [number, number], events);
      return push(draft, { t: 'move' });
    }
    case 'discard-card': {
      discardFromHand(draft, player, action.cardId, decision.kind === 'choose-nahla-discard' ? 'nahla' : 'hand-limit', events);
      return;
    }
    case 'choose-basim-card': {
      if (decision.kind !== 'choose-basim-card') return;
      p.hand.push(action.cardId);
      p.lockedCards.push(action.cardId);
      events.push({ type: 'card-drawn', player, source: 'hit', locked: true });
      for (const other of decision.revealed.filter((c) => c !== action.cardId)) {
        draft.discardPile.push(other);
        events.push({ type: 'card-discarded', player, cardId: other, reason: 'basim' });
      }
      return;
    }
    case 'use-malik': {
      if (action.checkerId === null) return;
      const turn = turnOf(draft);
      draft.shields.push({ checkerId: action.checkerId, owner: player, source: 'malik' });
      p.malikReadyOnOwnTurn = turn.ownTurnNumber + draft.rules.jinn.malikRestTurns + 1;
      events.push({ type: 'jinn-triggered', player, jinn: 'malik', detail: 'shield an exposed checker' });
      events.push({ type: 'shield-added', player, checkerId: action.checkerId, source: 'malik' });
      return;
    }
    case 'bazaar-buy':
      return buyLamp(draft, player, action.slot, events);
    case 'bazaar-refresh': {
      let paid = 0;
      if (p.benefits.refreshes > 0) p.benefits.refreshes -= 1;
      else {
        paid = draft.rules.bazaar.paidRefreshPrice;
        p.dinars -= paid;
      }
      p.stock = generateStock(draft);
      events.push({ type: 'bazaar-refreshed', player, paid });
      return push(draft, { t: 'bazaar-menu' });
    }
    case 'bazaar-leave':
      p.stock = [];
      events.push({ type: 'bazaar-closed', player });
      return;
    case 'equip-jinn': {
      if (decision.kind !== 'equip-jinn') return;
      if (action.replaceSlot === null) {
        events.push({ type: 'jinn-released', player, jinn: decision.jinn });
        return;
      }
      const replaced = p.jinn[action.replaceSlot]!;
      // Replacing a Jinn removes its attached enchantments.
      p.jinn[action.replaceSlot] = { id: decision.jinn, activeFromTurn: draft.turnNumber + 1, target: null };
      events.push({ type: 'jinn-released', player, jinn: replaced.id });
      events.push({ type: 'jinn-equipped', player, jinn: decision.jinn, slot: action.replaceSlot, replaced: replaced.id });
      return;
    }
  }
}

function rollOpening(draft: Draft, player: PlayerId, events: GameEvent[]): void {
  if (draft.phase.kind !== 'opening') throw new Error('Unreachable: not in opening.');
  const value = die(draft);
  events.push({ type: 'opening-die-rolled', player, value });
  const rolls = { ...draft.phase.rolls, [player]: value };
  const { white, black } = rolls;
  if (white === undefined || black === undefined) {
    draft.phase = { kind: 'opening', rolls };
    return wait(draft, { kind: 'opening-roll' });
  }
  if (white === black) {
    events.push({ type: 'opening-tie', value: white });
    draft.phase = { kind: 'opening', rolls: {} };
    return wait(draft, { kind: 'opening-roll' });
  }
  const starter: PlayerId = white > black ? 'white' : 'black';
  const dice: [number, number] = starter === 'white' ? [white, black] : [black, white];
  events.push({ type: 'starter-determined', player: starter, dice });
  draft.phase = { kind: 'playing' };
  push(draft, { t: 'start-turn', player: starter, bonus: false, openingDice: dice });
}

function setDice(draft: Draft, effective: [number, number], events: GameEvent[]): void {
  const turn = turnOf(draft);
  turn.dice!.effective = effective;
  turn.dice!.remaining = movementValues(effective);
  events.push({ type: 'dice-set', player: turn.player, effective, remaining: [...turn.dice!.remaining] });
}

function moveChecker(draft: Draft, action: Extract<GameAction, { type: 'move-checker' }>, events: GameEvent[]): void {
  const turn = turnOf(draft);
  const player = turn.player;
  const opponent = opponentOf(player);
  const checker = draftChecker(draft, action.checkerId);
  const reverse = action.reverse !== undefined;
  if (action.reverse === 'amira') turn.amiraReverseUsed = true;
  if (action.reverse === 'power' && !turn.anyDirection) turn.reverseAllowance -= 1;

  checker.location = action.to === 'off' ? { kind: 'off' } : { kind: 'point', point: action.to };
  const index = turn.dice!.remaining.indexOf(action.die);
  turn.dice!.remaining.splice(index, 1);
  turn.movesMade += 1;
  events.push({ type: 'checker-moved', player, checkerId: checker.id, from: action.from, to: action.to, die: action.die, reverse });

  const tasks: Task[] = [];
  let hitId: CheckerId | null = null;
  if (action.to === 'off') {
    events.push({ type: 'checker-borne-off', player, checkerId: checker.id });
    removeShield(draft, checker.id, 'left-board', events);
    // Amira and Rakhim retarget at the next own turn after their checker bears off.
    for (const jinn of draft.players[player].jinn) if (jinn.target === checker.id) jinn.target = null;
  } else {
    const point = action.to;
    const blot = draft.checkers.find((c) => c.owner === opponent && c.location.kind === 'point' && c.location.point === point);
    if (blot) {
      blot.location = { kind: 'bar' };
      events.push({ type: 'checker-hit', player, checkerId: blot.id, point });
      const economy = draft.rules.economy;
      draft.players[player].dinars += economy.hitterDinars;
      events.push({ type: 'dinars-awarded', player, amount: economy.hitterDinars, balance: draft.players[player].dinars, reason: 'hitter' });
      draft.players[opponent].dinars += economy.hitPlayerDinars;
      events.push({ type: 'dinars-awarded', player: opponent, amount: economy.hitPlayerDinars, balance: draft.players[opponent].dinars, reason: 'hit' });
      tasks.push({ t: 'hit-card', player }, { t: 'forced-discard', player: opponent });
      hitId = blot.id;
    }
    // A shield ends early when its owner stacks onto the shielded checker:
    // either another checker lands on it, or the shielded checker joins a stack.
    const landed = checkersOn(draft, point);
    if (landed.length > 1) {
      for (const shield of draft.shields.filter((s) => s.owner === player)) {
        if (landed.some((c) => c.id === shield.checkerId)) removeShield(draft, shield.checkerId, 'self-stacked', events);
      }
    }
  }
  // Other Jinn triggers from this movement, in left-to-right slot order (B10).
  for (const jinn of draft.players[player].jinn) {
    if (jinn.activeFromTurn > draft.turnNumber) continue;
    if (jinn.id === 'hadi' && hitId !== null && turn.hadiMark === hitId && !turn.hadiTriggered) {
      turn.hadiTriggered = true;
      events.push({ type: 'jinn-triggered', player, jinn: 'hadi', detail: 'marked checker hit' });
      tasks.push({ t: 'draw', player, locked: true, source: 'hadi' });
    }
    if (jinn.id === 'rakhim' && hitId !== null && jinn.target === checker.id && !turn.rakhimTriggered) {
      turn.rakhimTriggered = true;
      events.push({ type: 'jinn-triggered', player, jinn: 'rakhim', detail: 'enchanted checker hit' });
      tasks.push({ t: 'draw', player, locked: true, source: 'rakhim' });
    }
    if (jinn.id === 'sirocco' && reverse && !turn.siroccoTriggered) {
      turn.siroccoTriggered = true;
      events.push({ type: 'jinn-triggered', player, jinn: 'sirocco', detail: 'first backward move' });
      tasks.push({ t: 'draw', player, locked: false, source: 'sirocco' });
    }
  }

  if (draft.checkers.every((c) => c.owner !== player || c.location.kind === 'off')) {
    events.push({ type: 'game-won', player });
    draft.phase = { kind: 'finished', winner: player };
    draft.queue = [];
    draft.pending = null;
    return;
  }
  push(draft, ...tasks, { t: 'move' });
}

function removeShield(draft: Draft, checkerId: CheckerId, reason: 'expired' | 'self-stacked' | 'left-board', events: GameEvent[]): void {
  const shield = draft.shields.find((s) => s.checkerId === checkerId);
  if (!shield) return;
  draft.shields = draft.shields.filter((s) => s.checkerId !== checkerId);
  events.push({ type: 'shield-removed', player: shield.owner, checkerId, reason });
}

function spendCards(draft: Draft, player: PlayerId, play: Selection, power: PowerKind, events: GameEvent[]): void {
  const turn = turnOf(draft);
  const p = draft.players[player];
  p.hand = p.hand.filter((c) => !play.cardIds.includes(c));
  turn.playedCards.push(...play.cardIds);
  turn.powerUsed = power;
  events.push({ type: 'power-played', player, power, cardIds: [...play.cardIds], wildCardId: play.wildCardId ?? null });
  if (play.wildCardId) {
    p.spentOncePerMatch.push('mazin');
    events.push({ type: 'jinn-triggered', player, jinn: 'mazin', detail: `${play.wildCardId} played as a wild card` });
  }
}

function playPower(draft: Draft, action: Extract<GameAction, { type: 'play-power' }>, events: GameEvent[]): void {
  const turn = turnOf(draft);
  const player = action.player;
  const params = action.params;
  spendCards(draft, player, action, params.power, events);
  const dice = turn.dice!;
  switch (params.power) {
    case 'high-card': {
      dice.remaining = replaceOne(dice.remaining, params.die, params.die + params.boost);
      events.push({ type: 'dice-set', player, effective: [...dice.effective] as [number, number], remaining: [...dice.remaining] });
      break;
    }
    case 'pair': {
      if (isActive(draft, player, 'zafir')) {
        const candidates: [number, number] = [die(draft), die(draft)];
        events.push({ type: 'jinn-triggered', player, jinn: 'zafir', detail: 'two candidate rerolls' });
        events.push({ type: 'dice-rolled', player, dice: candidates, reason: 'zafir' });
        return wait(draft, { kind: 'choose-zafir-value', player, die: params.die, candidates });
      }
      const effective = [...dice.effective] as [number, number];
      effective[params.die] = die(draft);
      events.push({ type: 'dice-rolled', player, dice: effective, reason: 'pair' });
      setDice(draft, effective, events);
      break;
    }
    case 'two-pair':
      turn.reverseAllowance += 1;
      break;
    case 'three-of-a-kind':
      turn.anyDirection = true;
      break;
    case 'straight':
      if (params.mode === 'force-opponent') {
        draft.players[opponentOf(player)].forcedRerollPending = true;
        events.push({ type: 'forced-reroll-pending', player: opponentOf(player) });
        break;
      } else {
        const rerolled: [number, number] = [die(draft), die(draft)];
        events.push({ type: 'dice-rolled', player, dice: rerolled, reason: 'straight' });
        return wait(draft, {
          kind: 'choose-straight-dice',
          player,
          original: [...dice.effective] as [number, number],
          rerolled,
        });
      }
    case 'flush':
      draft.shields.push({ checkerId: params.checkerId, owner: player, source: 'flush' });
      events.push({ type: 'shield-added', player, checkerId: params.checkerId, source: 'flush' });
      break;
    case 'full-house': {
      const [a, b] = params.points;
      const atA = checkersOn(draft, a).map((c) => c.id);
      const atB = checkersOn(draft, b).map((c) => c.id);
      for (const checker of draft.checkers) {
        if (atA.includes(checker.id)) checker.location = { kind: 'point', point: b };
        else if (atB.includes(checker.id)) checker.location = { kind: 'point', point: a };
      }
      events.push({ type: 'caravan-exchange', player, points: [a, b] });
      break;
    }
    case 'four-of-a-kind': {
      const effective = [...dice.effective] as [number, number];
      effective[params.die] = params.value;
      setDice(draft, effective, events);
      break;
    }
    case 'straight-flush':
      setDice(draft, [...params.values] as [number, number], events);
      break;
  }
  push(draft, { t: 'move' });
}

// ---------------------------------------------------------------------------
// Bazaar

function generateStock(draft: Draft): LampType[] {
  const { offersPerVisit, guaranteedCopperOffers, randomOfferWeights } = draft.rules.bazaar;
  const stock: LampType[] = [];
  for (let i = 0; i < guaranteedCopperOffers; i++) stock.push('copper');
  const types = Object.entries(randomOfferWeights) as [LampType, number][];
  const total = types.reduce((sum, [, weight]) => sum + weight, 0);
  while (stock.length < offersPerVisit) {
    let roll = random(draft, 'stock', total);
    for (const [type, weight] of types) {
      if (roll < weight) {
        stock.push(type);
        break;
      }
      roll -= weight;
    }
  }
  return stock;
}

/** Price and benefits for buying a lamp now (B08/B09: upgrade first, then discount). */
export function purchaseQuote(
  state: Draft | GameState,
  player: PlayerId,
  lamp: LampType,
): { price: number; opensAs: LampType; upgraded: boolean; discounted: boolean } {
  const { lampPrices, nextLampDiscount, minimumDiscountedPrice } = state.rules.bazaar;
  const benefits = state.players[player].benefits;
  const upgraded = lamp === 'copper' && benefits.upgrades > 0;
  const opensAs: LampType = upgraded ? 'enchanted' : lamp;
  let price = lampPrices[lamp];
  const discounted = benefits.discounts > 0;
  if (discounted) price = Math.max(minimumDiscountedPrice, price - nextLampDiscount);
  return { price, opensAs, upgraded, discounted };
}

function buyLamp(draft: Draft, player: PlayerId, slot: number, events: GameEvent[]): void {
  const p = draft.players[player];
  const lamp = p.stock[slot]!;
  const quote = purchaseQuote(draft, player, lamp);
  p.dinars -= quote.price;
  if (quote.upgraded) p.benefits.upgrades -= 1;
  if (quote.discounted) p.benefits.discounts -= 1;
  p.stock[slot] = null;
  events.push({ type: 'lamp-bought', player, lamp, ...quote });
  const result = drawJinn(draft.rules.lamps.rarityWeights[quote.opensAs], p.jinn.map((j) => j.id), draft.rng.lamp);
  draft.rng.lamp = result.state;
  if (!result.jinn) {
    events.push({ type: 'lamp-empty', player });
    return push(draft, { t: 'bazaar-menu' });
  }
  events.push({ type: 'jinn-revealed', player, jinn: result.jinn, lamp: quote.opensAs });
  push(draft, { t: 'equip', player, jinn: result.jinn }, { t: 'bazaar-menu' });
}

// ---------------------------------------------------------------------------

function sameAction(a: GameAction, b: GameAction): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)))
      : inner,
  );
}

function reject(state: GameState, code: Extract<ApplyResult, { ok: false }>['code'], message: string): ApplyResult {
  return { ok: false, state, code, message };
}
