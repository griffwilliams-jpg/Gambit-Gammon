/**
 * Whole-turn planning for the computer player.
 *
 * From the bot's own Observation it rebuilds the public board, then searches
 * every legal sequence of checker movements for the remaining dice with the
 * engine's own move rules (compulsory dice use, shields, backward options),
 * scores each end position and plays the first movement of the best plan.
 * The same search prices pre-movement powers: a dice-changing or
 * backward-movement power is played only when the best plan it enables beats
 * the current best plan by more than the cards are worth.
 */

import { BAR, OFF, positionFor, toOwnPoint, type Position } from '../engine/board.js';
import { applyStepInContext, legalSteps, type MoveContext, type Step } from '../engine/movement.js';
import type { Checker, GameAction, Observation } from '../engine/index.js';

type MoveAction = Extract<GameAction, { type: 'move-checker' }>;
type PowerAction = Extract<GameAction, { type: 'play-power' }>;

/**
 * How the planner values an exposed own blot. Standard play penalises each
 * direct shot. Farming styles, exploit-seeking test policies from the
 * development plan, penalise shots less or reward them for the Dinars a hit
 * would pay.
 */
export interface PlanStyle {
  readonly kind: 'standard' | 'farming';
  /** Score per direct shot at an own blot (standard: -3). */
  readonly shotValue: number;
  /** Extra penalty per exposed blot regardless of shots (standard only). */
  readonly blotPenalty: boolean;
}

export const STANDARD_STYLE: PlanStyle = { kind: 'standard', shotValue: -3, blotPenalty: true };

export type FarmingIntensity = 'cautious' | 'neutral' | 'eager' | 'maximal';
export const FARMING_INTENSITIES: readonly FarmingIntensity[] = ['cautious', 'neutral', 'eager', 'maximal'];

/** Farming styles priced from the Dinars the hit player receives (Economy B: 2). */
export function farmingStyle(hitPlayerDinars: number, intensity: FarmingIntensity = 'maximal'): PlanStyle {
  const shotValue = { cautious: -1, neutral: 0, eager: hitPlayerDinars, maximal: 2 * hitPlayerDinars }[intensity];
  return { kind: 'farming', shotValue, blotPenalty: false };
}

interface Board {
  style: PlanStyle;
  position: Position;
  /** Opponent blots protected by a shield: blocked in the search, but still one checker. */
  shielded: Set<number>;
  /** Own points holding a shielded checker, safe through the opponent's next turn. */
  ownShielded: Set<number>;
  opponentBar: number;
  opponentOff: number;
}

/** Score adjustment a power must beat, per card spent. */
const CARD_VALUE = 2;

function boardFrom(observation: Observation, style: PlanStyle): Board {
  const me = observation.viewer;
  const position = positionFor(observation.checkers as Checker[], me);
  const shielded = new Set<number>();
  const ownShielded = new Set<number>();
  for (const shield of observation.shields) {
    const checker = observation.checkers.find((c) => c.id === shield.checkerId);
    if (shield.owner === me) {
      if (checker?.location.kind === 'point') ownShielded.add(toOwnPoint(me, checker.location.point));
      continue;
    }
    if (checker?.location.kind === 'point') {
      const index = toOwnPoint(me, checker.location.point);
      if (position.opponent[index] === 1) shielded.add(index);
      position.opponent[index] = Math.max(position.opponent[index]!, 2);
    }
  }
  const theirs = observation.checkers.filter((c) => c.owner !== me);
  return {
    style,
    position,
    shielded,
    ownShielded,
    opponentBar: theirs.filter((c) => c.location.kind === 'bar').length,
    opponentOff: theirs.filter((c) => c.location.kind === 'off').length,
  };
}

function contextFrom(observation: Observation, overrides: Partial<MoveContext> = {}): MoveContext {
  const me = observation.viewer;
  const turn = observation.turn!;
  const amira = observation.players[me].jinn.find((j) => j.id === 'amira' && j.activeFromTurn <= observation.turnNumber);
  let amiraAt: number | null = null;
  if (amira?.target && !turn.amiraReverseUsed) {
    const checker = observation.checkers.find((c) => c.id === amira.target);
    if (checker && checker.location.kind !== 'off') {
      amiraAt = checker.location.kind === 'bar' ? BAR : toOwnPoint(me, checker.location.point);
    }
  }
  return {
    reverseAllowance: turn.reverseAllowance,
    anyDirection: turn.anyDirection,
    amiraAt,
    hasBorneOff: observation.checkers.some((c) => c.owner === me && c.location.kind === 'off'),
    ...overrides,
  };
}

/** Static evaluation of a position from the mover's side (higher is better). */
export function evaluatePosition(
  position: Position,
  shielded: Set<number>,
  ownShielded: Set<number>,
  opponentBar: number,
  opponentOff: number,
  style: PlanStyle = STANDARD_STYLE,
): number {
  const own = position.own;
  const opp = position.opponent.map((count, i) => (shielded.has(i) && count >= 1 ? 1 : count));

  let ownPips = 0;
  for (let i = 1; i <= 25; i++) ownPips += i * own[i]!;
  let oppPips = opponentBar * 25;
  for (let i = 1; i <= 24; i++) oppPips += (25 - i) * opp[i]!;
  let score = oppPips - ownPips;

  // Contact: does any own checker still have to pass an opposing one?
  let furthestOwn = 0;
  for (let i = 25; i >= 1; i--) if (own[i]! > 0) { furthestOwn = i; break; }
  let nearestOpp = 25;
  for (let i = 1; i <= 24; i++) if (opp[i]! > 0) { nearestOpp = i; break; }
  const contact = opponentBar > 0 || furthestOwn > nearestOpp;

  for (let point = 1; point <= 24; point++) {
    const count = own[point]!;
    if (count >= 2) score += point <= 6 ? 4 : point <= 9 ? 3 : 2;
    if (count === 1 && contact && !ownShielded.has(point)) {
      let shots = 0;
      for (let d = 1; d <= 6; d++) {
        const from = point - d;
        if (from >= 1 && opp[from]! > 0) shots += 1;
      }
      if (opponentBar > 0 && point <= 6) shots += 1;
      score += shots * style.shotValue - (style.blotPenalty ? (point <= 6 ? 2 : 1) : 0);
    }
  }
  // Primes block escaping checkers.
  let run = 0;
  for (let point = 1; point <= 12; point++) {
    run = own[point]! >= 2 ? run + 1 : 0;
    if (run >= 3) score += run;
  }
  score += own[OFF]! * 3 - opponentOff;
  score += opponentBar * 6;
  if (!contact) score += own[OFF]! * 2; // In a pure race, bear off as fast as possible.
  return score;
}

interface Plan {
  value: number;
  first: Step | null;
}

function key(position: Position, context: MoveContext, remaining: readonly number[]): string {
  return `${position.own.join(',')}|${position.opponent.join(',')}|${[...remaining].sort().join(',')}|${context.reverseAllowance}|${context.anyDirection ? 1 : 0}|${context.amiraAt ?? '-'}|${context.hasBorneOff ? 1 : 0}`;
}

function without(values: readonly number[], value: number): number[] {
  const index = values.indexOf(value);
  return [...values.slice(0, index), ...values.slice(index + 1)];
}

/** Best end-of-turn value reachable from here, with the first step of that plan. */
export function planTurn(board: Board, context: MoveContext, remaining: readonly number[]): Plan {
  const memo = new Map<string, number>();
  let budget = 60_000;

  const search = (position: Position, ctx: MoveContext, dice: readonly number[], hits: number): number => {
    const memoKey = `${key(position, ctx, dice)}|${hits}`;
    const cached = memo.get(memoKey);
    if (cached !== undefined) return cached;
    const steps = budget-- > 0 ? legalSteps(position, dice, ctx) : [];
    let best: number;
    if (steps.length === 0) {
      best = evaluatePosition(position, board.shielded, board.ownShielded, board.opponentBar + hits, board.opponentOff, board.style);
    } else {
      best = -Infinity;
      for (const step of steps) {
        const hit = step.to !== OFF && position.opponent[step.to] === 1 ? 1 : 0;
        const next = applyStepInContext(position, ctx, step);
        best = Math.max(best, search(next.position, next.context, without(dice, step.die), hits + hit));
      }
    }
    memo.set(memoKey, best);
    return best;
  };

  const steps = legalSteps(board.position, remaining, context);
  if (steps.length === 0) {
    return { value: evaluatePosition(board.position, board.shielded, board.ownShielded, board.opponentBar, board.opponentOff, board.style), first: null };
  }
  let plan: Plan = { value: -Infinity, first: null };
  for (const step of steps) {
    const hit = step.to !== OFF && board.position.opponent[step.to] === 1 ? 1 : 0;
    const next = applyStepInContext(board.position, context, step);
    const value = search(next.position, next.context, without(remaining, step.die), hit);
    if (value > plan.value) plan = { value, first: step };
  }
  return plan;
}

/** The legal action that carries out a planned step. */
function actionForStep(observation: Observation, step: Step): MoveAction | undefined {
  const me = observation.viewer;
  const from = step.from === BAR ? 'bar' : toOwnPoint(me, step.from);
  const to = step.to === OFF ? 'off' : toOwnPoint(me, step.to);
  const amiraTarget = observation.players[me].jinn.find((j) => j.id === 'amira')?.target ?? null;
  const candidates = observation.legalActions.filter(
    (a): a is MoveAction => a.type === 'move-checker' && a.from === from && a.to === to && a.die === step.die && a.reverse === step.reverse,
  );
  if (step.special) return candidates.find((a) => a.checkerId === amiraTarget) ?? candidates[0];
  return candidates.find((a) => a.checkerId !== amiraTarget) ?? candidates[0];
}

export interface PlannedMove {
  readonly action: GameAction;
  readonly value: number;
}

/** Chooses the next move (or a worthwhile power) for a move decision, or null if none applies. */
export function planMove(observation: Observation, style: PlanStyle = STANDARD_STYLE): PlannedMove | null {
  const turn = observation.turn;
  if (!turn?.dice || observation.pending?.kind !== 'move') return null;
  const board = boardFrom(observation, style);
  const remaining = turn.dice.remaining;
  const current = planTurn(board, contextFrom(observation), remaining);

  let bestPower: { action: PowerAction; gain: number } | null = null;
  if (turn.movesMade === 0 && !turn.powerUsed) {
    for (const action of observation.legalActions) {
      if (action.type !== 'play-power') continue;
      const value = powerValue(observation, board, action);
      if (value === null) continue;
      const gain = value - current.value - CARD_VALUE * action.cardIds.length - (action.wildCardId ? 6 : 0);
      if (gain > 0 && (!bestPower || gain > bestPower.gain)) bestPower = { action, gain };
    }
  }
  if (bestPower) return { action: bestPower.action, value: current.value + bestPower.gain };
  if (!current.first) return null;
  const action = actionForStep(observation, current.first);
  return action ? { action, value: current.value } : null;
}

/** Best plan value after a deterministic power, or null for powers the planner doesn't price. */
function powerValue(observation: Observation, board: Board, action: PowerAction): number | null {
  const dice = observation.turn!.dice!;
  const p = action.params;
  const pairValues = (a: number, b: number) => (a === b ? [a, a, a, a] : [a, b]);
  switch (p.power) {
    case 'high-card': {
      const index = dice.remaining.indexOf(p.die);
      const remaining = dice.remaining.map((v, i) => (i === index ? v + p.boost : v));
      return planTurn(board, contextFrom(observation), remaining).value;
    }
    case 'four-of-a-kind': {
      const effective = [...dice.effective] as [number, number];
      effective[p.die] = p.value;
      return planTurn(board, contextFrom(observation), pairValues(effective[0], effective[1])).value;
    }
    case 'straight-flush':
      return planTurn(board, contextFrom(observation), pairValues(p.values[0], p.values[1])).value;
    case 'two-pair':
      return planTurn(board, contextFrom(observation, { reverseAllowance: observation.turn!.reverseAllowance + 1 }), dice.remaining).value;
    case 'three-of-a-kind':
      return planTurn(board, contextFrom(observation, { anyDirection: true }), dice.remaining).value;
    default:
      return null;
  }
}

