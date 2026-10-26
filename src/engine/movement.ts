/**
 * Backgammon movement legality with compulsory dice use.
 *
 * Moves are generated per point in the mover's own numbering, then whole
 * sequences over the remaining dice are searched so that no offered move
 * prevents later mandatory dice use:
 * - play as many dice as possible (all four for doubles);
 * - if two different dice remain and only one can be used, the higher die
 *   must be played when it is playable.
 *
 * Power-granted options are part of the search, so they carry the same
 * obligations: backward moves (Two Pair allowance, Three of a Kind, Amira's
 * enchanted checker), shielded blots (treated as blocked points) and boosted
 * dice above six (which cannot enter from the bar or bear off).
 */

import { BAR, OFF, type Position } from './board.js';

export type ReverseSource = 'power' | 'amira';

/** A single checker movement in the mover's own numbering. */
export interface Step {
  readonly die: number;
  /** Own index: 25 for the bar, 1–24 for points. */
  readonly from: number;
  /** Own index: 1–24 for points, 0 for bearing off. */
  readonly to: number;
  /** Set for backward movement, naming what permits it. */
  readonly reverse?: ReverseSource;
  /** True when Amira's enchanted checker makes this move. */
  readonly special?: boolean;
}

export interface MoveContext {
  /** Remaining single backward moves from Two Pair. */
  readonly reverseAllowance: number;
  /** Three of a Kind: any movement may go backwards this turn. */
  readonly anyDirection: boolean;
  /** Own index of Amira's checker while her once-per-turn reverse is unused. */
  readonly amiraAt: number | null;
  /** The player has borne off at least one checker (reverse home lock). */
  readonly hasBorneOff: boolean;
}

export const PLAIN_CONTEXT: MoveContext = {
  reverseAllowance: 0,
  anyDirection: false,
  amiraAt: null,
  hasBorneOff: false,
};

interface Node {
  readonly position: Position;
  readonly context: MoveContext;
}

function forwardSteps(node: Node, die: number): Step[] {
  const { own, opponent } = node.position;
  const { amiraAt } = node.context;
  if (own[BAR]! > 0) {
    const to = BAR - die;
    if (die > 6 || opponent[to]! >= 2) return [];
    const steps: Step[] = [];
    if (own[BAR]! > (amiraAt === BAR ? 1 : 0)) steps.push({ die, from: BAR, to });
    if (amiraAt === BAR) steps.push({ die, from: BAR, to, special: true });
    return steps;
  }

  const steps: Step[] = [];
  const allHome = own.slice(7, 26).every((count) => count === 0);
  for (let from = 24; from >= 1; from--) {
    if (own[from]! === 0) continue;
    const to = from - die;
    let legal = false;
    if (to >= 1) {
      legal = opponent[to]! < 2;
    } else if (allHome && die <= 6) {
      // Exact bear-off, or a higher die from the furthest occupied point.
      legal = to === 0 || own.slice(from + 1, 7).every((count) => count === 0);
    }
    if (!legal) continue;
    const target = Math.max(to, OFF);
    if (own[from]! > (amiraAt === from ? 1 : 0)) steps.push({ die, from, to: target });
    if (amiraAt === from) steps.push({ die, from, to: target, special: true });
  }
  return steps;
}

function reverseSteps(node: Node, die: number): Step[] {
  const { own, opponent } = node.position;
  const { reverseAllowance, anyDirection, amiraAt, hasBorneOff } = node.context;
  // No reverse entry, and barred checkers must enter first.
  if (own[BAR]! > 0) return [];
  const steps: Step[] = [];
  for (let from = 1; from <= 24; from++) {
    if (own[from]! === 0) continue;
    const to = from + die;
    if (to > 24 || opponent[to]! >= 2) continue;
    // After the first bear-off, backward movement cannot leave the home board.
    if (hasBorneOff && from <= 6 && to > 6) continue;
    const ordinary = own[from]! > (amiraAt === from ? 1 : 0);
    if (anyDirection || reverseAllowance > 0) {
      if (ordinary) steps.push({ die, from, to, reverse: 'power' });
      if (amiraAt === from) steps.push({ die, from, to, reverse: 'power', special: true });
    }
    if (amiraAt === from && !anyDirection) steps.push({ die, from, to, reverse: 'amira', special: true });
  }
  return steps;
}

export function singleSteps(position: Position, die: number, context: MoveContext = PLAIN_CONTEXT): Step[] {
  const node = { position, context };
  return [...forwardSteps(node, die), ...reverseSteps(node, die)];
}

function applyToNode(node: Node, step: Step): Node {
  const own = node.position.own.slice();
  const opponent = node.position.opponent.slice();
  own[step.from]! -= 1;
  own[step.to]! += 1;
  // A hit removes the blot from the board; the opponent's bar does not affect the mover.
  if (step.to !== OFF && opponent[step.to] === 1) opponent[step.to] = 0;

  let { reverseAllowance, amiraAt } = node.context;
  if (step.reverse === 'power' && !node.context.anyDirection) reverseAllowance -= 1;
  if (step.reverse === 'amira') amiraAt = null;
  else if (step.special) amiraAt = step.to === OFF ? null : step.to;

  return {
    position: { own, opponent },
    context: {
      ...node.context,
      reverseAllowance,
      amiraAt,
      hasBorneOff: node.context.hasBorneOff || step.to === OFF,
    },
  };
}

export function applyStep(position: Position, step: Step): Position {
  return applyToNode({ position, context: PLAIN_CONTEXT }, step).position;
}

function key(node: Node, remaining: readonly number[]): string {
  const { reverseAllowance, anyDirection, amiraAt, hasBorneOff } = node.context;
  return [
    node.position.own.join(','),
    node.position.opponent.join(','),
    [...remaining].sort().join(','),
    reverseAllowance,
    anyDirection ? 1 : 0,
    amiraAt ?? '-',
    hasBorneOff ? 1 : 0,
  ].join('|');
}

function distinct(values: readonly number[]): number[] {
  return [...new Set(values)];
}

function without(values: readonly number[], value: number): number[] {
  const index = values.indexOf(value);
  return [...values.slice(0, index), ...values.slice(index + 1)];
}

function maxDiceUsable(node: Node, remaining: readonly number[], memo: Map<string, number>): number {
  if (remaining.length === 0) return 0;
  const memoKey = key(node, remaining);
  const cached = memo.get(memoKey);
  if (cached !== undefined) return cached;

  let best = 0;
  outer: for (const die of distinct(remaining)) {
    for (const step of singleSteps(node.position, die, node.context)) {
      const used = 1 + maxDiceUsable(applyToNode(node, step), without(remaining, die), memo);
      if (used > best) best = used;
      if (best === remaining.length) break outer;
    }
  }
  memo.set(memoKey, best);
  return best;
}

/** Legal next steps that keep the turn on a sequence satisfying compulsory dice use. */
export function legalSteps(
  position: Position,
  remaining: readonly number[],
  context: MoveContext = PLAIN_CONTEXT,
): Step[] {
  if (remaining.length === 0) return [];
  const node = { position, context };
  const memo = new Map<string, number>();
  const target = maxDiceUsable(node, remaining, memo);
  if (target === 0) return [];

  let candidates: Step[] = [];
  for (const die of distinct(remaining)) {
    for (const step of singleSteps(position, die, context)) {
      if (1 + maxDiceUsable(applyToNode(node, step), without(remaining, die), memo) === target) {
        candidates.push(step);
      }
    }
  }

  // Higher-die obligation: only one of two different dice can be played.
  if (target === 1 && remaining.length === 2 && remaining[0] !== remaining[1]) {
    const higher = Math.max(...remaining);
    if (candidates.some((step) => step.die === higher)) {
      candidates = candidates.filter((step) => step.die === higher);
    }
  }
  return candidates;
}
