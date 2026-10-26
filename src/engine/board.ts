import type { Checker, CheckerId, CheckerLocation, PlayerId } from './types.js';

/**
 * Standard starting position, in each player's own numbering
 * (own point 24 is furthest from home, own point 1 is deepest in home).
 */
const STARTING_OWN_POINTS: readonly (readonly [ownPoint: number, count: number])[] = [
  [24, 2],
  [13, 5],
  [8, 3],
  [6, 5],
];

export const BAR = 25;
export const OFF = 0;

export function opponentOf(player: PlayerId): PlayerId {
  return player === 'white' ? 'black' : 'white';
}

/** Converts between absolute points and a player's own numbering (self-inverse). */
export function toOwnPoint(player: PlayerId, point: number): number {
  return player === 'white' ? point : 25 - point;
}

export const fromOwnPoint = toOwnPoint;

export function checkerId(player: PlayerId, index: number): CheckerId {
  return `${player}-${String(index).padStart(2, '0')}`;
}

export function createStartingCheckers(): Checker[] {
  const checkers: Checker[] = [];
  for (const player of ['white', 'black'] as const) {
    let index = 1;
    for (const [ownPoint, count] of STARTING_OWN_POINTS) {
      for (let i = 0; i < count; i++) {
        checkers.push({
          id: checkerId(player, index++),
          owner: player,
          location: { kind: 'point', point: fromOwnPoint(player, ownPoint) },
        });
      }
    }
  }
  return checkers;
}

/** Index in a player's own-perspective count array: 0 off, 1–24 points, 25 bar. */
export function ownIndex(player: PlayerId, location: CheckerLocation): number {
  switch (location.kind) {
    case 'off':
      return OFF;
    case 'bar':
      return BAR;
    case 'point':
      return toOwnPoint(player, location.point);
  }
}

/**
 * Counts for one player in their own numbering (`counts[i]` for index 0–25) and
 * the opponent's checkers on each point, also in the mover's numbering.
 */
export interface Position {
  readonly own: number[];
  readonly opponent: number[];
}

export function positionFor(checkers: readonly Checker[], player: PlayerId): Position {
  const own = new Array<number>(26).fill(0);
  const opponent = new Array<number>(26).fill(0);
  for (const checker of checkers) {
    if (checker.owner === player) {
      own[ownIndex(player, checker.location)]! += 1;
    } else if (checker.location.kind === 'point') {
      opponent[toOwnPoint(player, checker.location.point)]! += 1;
    }
  }
  return { own, opponent };
}

export function pipCount(checkers: readonly Checker[], player: PlayerId): number {
  let total = 0;
  for (const checker of checkers) {
    if (checker.owner === player) total += ownIndex(player, checker.location);
  }
  return total;
}
