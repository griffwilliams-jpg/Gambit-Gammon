/**
 * A simple local computer opponent.
 *
 * Fair information: it decides from its own Observation only (public board,
 * its own hand and stock), never from the full game state. Its random
 * tie-breaks use a separate seeded stream, so they never touch gameplay
 * randomness. Moves are chosen greedily, one checker movement at a time, by
 * a position score; powers and shop choices follow plain rules of thumb.
 */

import {
  JINN_BY_ID,
  parseCard,
  type Checker,
  type GameAction,
  type Observation,
  type PlayerId,
  type Rarity,
} from '../engine/index.js';
import { nextUint32, seedStream, type RngState } from '../engine/rng.js';
import { planMove } from './planner.js';

/** 'planner' searches whole turns; 'basic' picks each movement greedily. */
export type BotLevel = 'basic' | 'planner';

export interface Bot {
  readonly player: PlayerId;
  readonly level: BotLevel;
  rng: RngState;
}

export function createBot(player: PlayerId, seed: string, level: BotLevel = 'planner'): Bot {
  return { player, level, rng: seedStream(seed, `bot-${player}`) };
}

export function chooseBotAction(bot: Bot, observation: Observation): GameAction {
  const actions = observation.legalActions;
  if (actions.length === 0) throw new Error('The bot has no legal action.');
  if (actions.length === 1) return actions[0]!;
  const pending = observation.pending;

  switch (pending?.kind) {
    case 'move':
      return chooseMove(bot, observation);
    case 'choose-hadi-mark':
      return best(bot, actions, (a) => (a.type === 'choose-hadi-mark' ? threatOn(observation, a.checkerId) : 0));
    case 'choose-jinn-target':
      // Enchant the checker furthest from home: it has the most moves left to benefit.
      return best(bot, actions, (a) => (a.type === 'choose-jinn-target' ? ownDistance(observation, a.checkerId) : 0));
    case 'offer-sahira':
      return pick(actions, (a) => a.type === 'use-sahira' && a.use === observation.private.hand.length <= 2);
    case 'offer-exchange':
      return best(bot, actions, (a) => (a.type === 'exchange' ? (a.discard ? 9 - cardValue(a.discard) : 0) : 0));
    case 'choose-zafir-value':
      return best(bot, actions, (a) => (a.type === 'choose-zafir-value' ? a.value : 0));
    case 'choose-straight-dice': {
      const sum = (pair: readonly number[]) => (pair[0] === pair[1] ? 4 : 2) * pair[0]! + (pair[0] === pair[1] ? 0 : pair[1]!);
      return best(bot, actions, (a) =>
        a.type === 'choose-straight-dice' ? sum(a.keep === 'original' ? pending.original : pending.rerolled) : 0,
      );
    }
    case 'discard-before-draw':
    case 'choose-nahla-discard':
      return best(bot, actions, (a) => (a.type === 'discard-card' ? -cardValue(a.cardId) : 0));
    case 'choose-basim-card':
      return best(bot, actions, (a) => (a.type === 'choose-basim-card' ? cardValue(a.cardId) : 0));
    case 'offer-malik':
      return best(bot, actions, (a) => (a.type === 'use-malik' && a.checkerId ? 1 + threatOn(observation, a.checkerId) : 0));
    case 'bazaar': {
      const prices = { copper: 4, enchanted: 7, royal: 12 } as const;
      return best(bot, actions, (a) => {
        if (a.type === 'bazaar-buy') return prices[observation.private.stock[a.slot]!];
        if (a.type === 'bazaar-refresh') return observation.players[bot.player].benefits.refreshes > 0 ? 0.5 : -1;
        return 0;
      });
    }
    case 'equip-jinn': {
      const rank: Record<Rarity, number> = { common: 1, uncommon: 2, legendary: 3 };
      const incoming = rank[JINN_BY_ID[pending.jinn].rarity];
      const equipped = observation.players[bot.player].jinn;
      return best(bot, actions, (a) => {
        if (a.type !== 'equip-jinn' || a.replaceSlot === null) return 0;
        return incoming - rank[JINN_BY_ID[equipped[a.replaceSlot]!.id].rarity];
      });
    }
    default:
      return random(bot, actions);
  }
}

// ---------------------------------------------------------------------------
// Moves and powers

function chooseMove(bot: Bot, observation: Observation): GameAction {
  const actions = observation.legalActions;
  const royal = actions.find((a) => a.type === 'declare-royal-flush');
  if (royal) return royal;

  const moves = actions.filter((a) => a.type === 'move-checker');
  const powers = actions.filter((a) => a.type === 'play-power');
  if (moves.length === 0 && bot.level === 'planner') {
    const planned = planMove(observation);
    if (planned) return planned.action;
  }
  if (moves.length === 0) {
    // Blocked: try to change the dice before giving up the turn.
    const order = ['straight-flush', 'four-of-a-kind', 'straight', 'pair', 'high-card'];
    for (const power of order) {
      const options = powers.filter((a) => a.type === 'play-power' && a.params.power === power);
      if (options.length > 0) {
        if (power === 'straight-flush' || power === 'four-of-a-kind') return best(bot, options, (a) => diceValue(a));
        if (power === 'straight') return pick(options, (a) => a.type === 'play-power' && a.params.power === 'straight' && a.params.mode === 'reroll');
        return random(bot, options);
      }
    }
    return pick(actions, (a) => a.type === 'end-turn');
  }

  // Shield the most threatened blot before moving, if a Flush is in hand.
  const flushes = powers.filter((a) => a.type === 'play-power' && a.params.power === 'flush');
  if (flushes.length > 0) {
    const shield = best(bot, flushes, (a) => (a.type === 'play-power' && a.params.power === 'flush' ? threatOn(observation, a.params.checkerId) : 0));
    if (shield.type === 'play-power' && shield.params.power === 'flush' && threatOn(observation, shield.params.checkerId) >= 2) {
      return shield;
    }
  }
  if (bot.level === 'planner') {
    const planned = planMove(observation);
    if (planned) return planned.action;
  }
  return best(bot, moves, (a) => (a.type === 'move-checker' ? scoreAfterMove(observation, a) : 0));
}

function diceValue(action: GameAction): number {
  if (action.type !== 'play-power') return 0;
  const p = action.params;
  if (p.power === 'straight-flush') return p.values[0] === p.values[1] ? 4 * p.values[0] : p.values[0] + p.values[1];
  if (p.power === 'four-of-a-kind') return p.value;
  return 0;
}

type Board = { id: string; owner: PlayerId; where: number }[];

/**
 * Positions in the bot's own numbering: 1–24 points, 0 off. The bot's barred
 * checkers are 25; the opponent's barred checkers are -1.
 */
function boardFor(observation: Observation): Board {
  const me = observation.viewer;
  return observation.checkers.map((c: Checker) => ({
    id: c.id,
    owner: c.owner,
    where:
      c.location.kind === 'off'
        ? 0
        : c.location.kind === 'bar'
          ? c.owner === me
            ? 25
            : -1
          : me === 'white'
            ? c.location.point
            : 25 - c.location.point,
  }));
}

function scoreAfterMove(observation: Observation, move: Extract<GameAction, { type: 'move-checker' }>): number {
  const me = observation.viewer;
  const board = boardFor(observation).map((c) => ({ ...c }));
  const toOwn = (p: number | 'off' | 'bar') => (p === 'off' ? 0 : p === 'bar' ? 25 : me === 'white' ? p : 25 - p);
  const target = toOwn(move.to);
  const mover = board.find((c) => c.id === move.checkerId)!;
  mover.where = target;
  let hit = 0;
  if (target > 0) {
    const blot = board.filter((c) => c.owner !== me && c.where === target);
    if (blot.length === 1) {
      blot[0]!.where = -1; // opponent bar, from the bot's view
      hit = 1;
    }
  }
  return evaluate(board, me) + hit * 8;
}

function evaluate(board: Board, me: PlayerId): number {
  const own = board.filter((c) => c.owner === me);
  const opp = board.filter((c) => c.owner !== me);
  const ownPips = own.reduce((sum, c) => sum + c.where, 0);
  // Opponent checkers in the bot's numbering: bar = -1 (their 25), off = 0.
  const oppPips = opp.reduce((sum, c) => sum + (c.where === -1 ? 25 : c.where === 0 ? 0 : 25 - c.where), 0);
  let score = oppPips - ownPips;

  const counts = new Map<number, number>();
  for (const c of own) if (c.where >= 1 && c.where <= 24) counts.set(c.where, (counts.get(c.where) ?? 0) + 1);
  for (const [point, count] of counts) {
    if (count >= 2) score += point <= 6 ? 4 : 2;
    if (count === 1) {
      // Direct shots from opponent checkers behind this blot (in front of it from their side).
      const shooters = opp.filter((c) => c.where >= 1 && c.where < point && point - c.where <= 6).length;
      // The opponent enters from the bar onto the bot's points 1–6.
      const barShooters = opp.some((c) => c.where === -1) && point <= 6 ? 1 : 0;
      score -= (shooters + barShooters) * 3 + 1;
    }
  }
  score += own.filter((c) => c.where === 0).length * 3;
  score += opp.filter((c) => c.where === -1).length * 6;
  return score;
}

/** How many opposing checkers have a direct shot at this checker. */
function threatOn(observation: Observation, id: string): number {
  const board = boardFor(observation);
  const target = board.find((c) => c.id === id);
  if (!target || target.where < 1 || target.where > 24) return 0;
  const owner = target.owner;
  const others = board.filter((c) => c.owner !== owner);
  // Compute in the target owner's numbering.
  const flip = owner !== observation.viewer;
  const where = flip ? 25 - target.where : target.where;
  return others.filter((c) => {
    const w = flip ? 25 - c.where : c.where;
    return w >= 1 && w < where && where - w <= 6;
  }).length;
}

function ownDistance(observation: Observation, id: string): number {
  return boardFor(observation).find((c) => c.id === id)?.where ?? 0;
}

function cardValue(id: string): number {
  return parseCard(id).rank;
}

// ---------------------------------------------------------------------------
// Choice helpers

function random(bot: Bot, actions: readonly GameAction[]): GameAction {
  const next = nextUint32(bot.rng);
  bot.rng = next.state;
  return actions[next.value % actions.length]!;
}

function best(bot: Bot, actions: readonly GameAction[], score: (a: GameAction) => number): GameAction {
  let top = -Infinity;
  let winners: GameAction[] = [];
  for (const action of actions) {
    const value = score(action);
    if (value > top) {
      top = value;
      winners = [action];
    } else if (value === top) winners.push(action);
  }
  return random(bot, winners);
}

function pick(actions: readonly GameAction[], predicate: (a: GameAction) => boolean): GameAction {
  return actions.find(predicate) ?? actions[actions.length - 1]!;
}
