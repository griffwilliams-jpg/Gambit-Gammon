/**
 * Standard backgammon movement legality with compulsory dice use.
 *
 * Moves are generated per point in the mover's own numbering, then whole
 * sequences over the remaining dice are searched so that no offered move
 * prevents later mandatory dice use:
 * - play as many dice as possible (all four for doubles);
 * - if two different dice remain and only one can be used, the higher die
 *   must be played when it is playable.
 * Powers that override movement (reverse moves, boosted dice, shields, etc.)
 * are not part of this stage.
 */

import { BAR, OFF, type Position } from './board.js';

/** A single checker movement in the mover's own numbering. */
export interface Step {
  readonly die: number;
  /** Own index: 25 for the bar, 1–24 for points. */
  readonly from: number;
  /** Own index: 1–24 for points, 0 for bearing off. */
  readonly to: number;
}

export function singleSteps(position: Position, die: number): Step[] {
  const { own, opponent } = position;
  if (own[BAR]! > 0) {
    const to = BAR - die;
    return opponent[to]! < 2 ? [{ die, from: BAR, to }] : [];
  }

  const steps: Step[] = [];
  const allHome = own.slice(7, 26).every((count) => count === 0);
  for (let from = 24; from >= 1; from--) {
    if (own[from]! === 0) continue;
    const to = from - die;
    if (to >= 1) {
      if (opponent[to]! < 2) steps.push({ die, from, to });
    } else if (allHome) {
      // Exact bear-off, or a higher die from the furthest occupied point.
      const furthest = to === 0 || own.slice(from + 1, 7).every((count) => count === 0);
      if (furthest) steps.push({ die, from, to: OFF });
    }
  }
  return steps;
}

export function applyStep(position: Position, step: Step): Position {
  const own = position.own.slice();
  const opponent = position.opponent.slice();
  own[step.from]! -= 1;
  own[step.to]! += 1;
  // A hit removes the blot from the board; the opponent's bar does not affect the mover.
  if (step.to !== OFF && opponent[step.to] === 1) opponent[step.to] = 0;
  return { own, opponent };
}

function key(position: Position, remaining: readonly number[]): string {
  return `${position.own.join(',')}|${position.opponent.join(',')}|${[...remaining].sort().join(',')}`;
}

function distinct(values: readonly number[]): number[] {
  return [...new Set(values)];
}

function without(values: readonly number[], value: number): number[] {
  const index = values.indexOf(value);
  return [...values.slice(0, index), ...values.slice(index + 1)];
}

/** Maximum number of the remaining dice that can be played from this position. */
function maxDiceUsable(position: Position, remaining: readonly number[], memo: Map<string, number>): number {
  if (remaining.length === 0) return 0;
  const memoKey = key(position, remaining);
  const cached = memo.get(memoKey);
  if (cached !== undefined) return cached;

  let best = 0;
  for (const die of distinct(remaining)) {
    for (const step of singleSteps(position, die)) {
      const used = 1 + maxDiceUsable(applyStep(position, step), without(remaining, die), memo);
      if (used > best) best = used;
      if (best === remaining.length) break;
    }
    if (best === remaining.length) break;
  }
  memo.set(memoKey, best);
  return best;
}

/** Legal next steps that keep the turn on a sequence satisfying compulsory dice use. */
export function legalSteps(position: Position, remaining: readonly number[]): Step[] {
  if (remaining.length === 0) return [];
  const memo = new Map<string, number>();
  const target = maxDiceUsable(position, remaining, memo);
  if (target === 0) return [];

  let candidates: Step[] = [];
  for (const die of distinct(remaining)) {
    for (const step of singleSteps(position, die)) {
      if (1 + maxDiceUsable(applyStep(position, step), without(remaining, die), memo) === target) {
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
