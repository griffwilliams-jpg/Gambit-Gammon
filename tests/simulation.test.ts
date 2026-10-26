import { describe, expect, it } from 'vitest';
import { createGame, getLegalActions, type GameState } from '../src/engine/index.js';
import { apply, chooseAction, seededChooser } from './helpers.js';

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
  if (state.phase.kind !== 'finished') expect(getLegalActions(state).length).toBeGreaterThan(0);
  const zones = [
    ...state.deck,
    ...state.discardPile,
    ...state.players.white.hand,
    ...state.players.black.hand,
    ...(state.turn?.playedCards ?? []),
    ...(state.pending?.kind === 'choose-basim-card' ? state.pending.revealed : []),
  ];
  expect(zones).toHaveLength(52);
  expect(new Set(zones).size).toBe(52);
  for (const player of ['white', 'black'] as const) {
    const p = state.players[player];
    expect(p.hand.length).toBeLessThanOrEqual(7);
    expect(p.dinars).toBeGreaterThanOrEqual(0);
    expect(p.jinn.length).toBeLessThanOrEqual(3);
    expect(new Set(p.jinn.map((j) => j.id)).size).toBe(p.jinn.length);
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
        state = apply(state, chooseAction(getLegalActions(state), choose));
        assertInvariants(state);
        if (++actions > 20_000) throw new Error(`Game sim-${game} exceeded the action cap.`);
      }
      const winner = state.phase.winner;
      expect(state.checkers.filter((c) => c.owner === winner && c.location.kind === 'off')).toHaveLength(15);
      turnCounts.push(state.turnNumber);
    }
    expect(turnCounts.every((t) => t > 10)).toBe(true);
  }, 60_000);
});
