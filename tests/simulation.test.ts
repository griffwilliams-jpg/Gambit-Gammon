import { describe, expect, it } from 'vitest';
import { createGame, getLegalActions, type GameState } from '../src/engine/index.js';
import { apply, seededChooser } from './helpers.js';

function assertInvariants(state: GameState): void {
  for (const player of ['white', 'black'] as const) {
    expect(state.checkers.filter((c) => c.owner === player)).toHaveLength(15);
  }
  const owners = new Map<number, string>();
  for (const checker of state.checkers) {
    if (checker.location.kind !== 'point') continue;
    const { point } = checker.location;
    expect(point).toBeGreaterThanOrEqual(1);
    expect(point).toBeLessThanOrEqual(24);
    const owner = owners.get(point);
    if (owner !== undefined) expect(owner).toBe(checker.owner);
    owners.set(point, checker.owner);
  }
  if (state.phase.kind === 'moving') {
    expect(getLegalActions(state).length).toBeGreaterThan(0);
  }
}

describe('seeded random play', () => {
  it('completes 200 games with board invariants holding after every action', () => {
    const turnCounts: number[] = [];
    for (let game = 0; game < 200; game++) {
      const choose = seededChooser(game + 1);
      let state = createGame({ seed: `sim-${game}` });
      let actions = 0;
      while (state.phase.kind !== 'finished') {
        state = apply(state, choose(getLegalActions(state)));
        assertInvariants(state);
        if (++actions > 5_000) throw new Error(`Game sim-${game} exceeded the action cap.`);
      }
      const winner = state.phase.winner;
      expect(state.checkers.filter((c) => c.owner === winner && c.location.kind === 'off')).toHaveLength(15);
      turnCounts.push(state.turnNumber);
    }
    expect(turnCounts.every((t) => t > 10)).toBe(true);
  }, 60_000);
});
