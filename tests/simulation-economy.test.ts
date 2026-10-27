import { describe, expect, it } from 'vitest';
import { meanInterval, pairedDifference, playMatchup, playRecordedGame, rateInterval, runComparison, summarise } from '../src/sim/economy.js';

describe('economy comparison tool', () => {
  it('is reproducible for the same seed and economy', () => {
    expect(playRecordedGame('sim-repeat', 'B')).toEqual(playRecordedGame('sim-repeat', 'B'));
  });

  it('plays every economy on the same seeds and keeps the money accounting consistent', () => {
    const results = runComparison({ games: 4, seedPrefix: 'sim-check' });
    for (const economy of ['A', 'B', 'C'] as const) {
      expect(results[economy].map((r) => r.seed)).toEqual(['sim-check-0', 'sim-check-1', 'sim-check-2', 'sim-check-3']);
      for (const r of results[economy]) {
        // Every Dinar earned is either spent or still held.
        expect(r.dinarsEarned).toBe(r.dinarsSpent + r.dinarsUnspent);
        expect(r.affordableVisits).toBeLessThanOrEqual(r.visits);
      }
    }
    // Economy C pays more per hit than A.
    const perHit = (e: 'A' | 'C') => results[e].reduce((s, r) => s + r.dinarsEarned, 0) / Math.max(1, results[e].reduce((s, r) => s + r.hits, 0));
    expect(perHit('A')).toBe(2);
    expect(perHit('C')).toBe(4);
    expect(summarise(results)).toContain('| Turns per game |');
  }, 60_000);

  it('computes intervals and paired differences', () => {
    expect(meanInterval([2, 2, 2])).toEqual({ mean: 2, low: 2, high: 2 });
    const a = playRecordedGame('sim-pair', 'C');
    const b = playRecordedGame('sim-pair', 'A');
    expect(pairedDifference([a], [b], (r) => r.turns).mean).toBe(a.turns - b.turns);
  });
});

describe('farming test policy', () => {
  it('seeks more hits than the standard planner on the same seeds', () => {
    const seeds = ['farm-t-0', 'farm-t-1', 'farm-t-2', 'farm-t-3'];
    const received = (level: 'planner' | 'farmer') =>
      seeds.reduce((sum, seed, i) => sum + playMatchup(seed, 'B', i % 2 ? 'black' : 'white', level).test.hitsReceived, 0);
    expect(received('farmer')).toBeGreaterThan(received('planner'));
  }, 60_000);

  it('records consistent per-side accounting', () => {
    const r = playMatchup('farm-acct', 'C', 'white', 'farmer');
    // Every hit made by one side is a hit received by the other.
    expect(r.test.hitsMade).toBe(r.opponent.hitsReceived);
    expect(r.test.hitsReceived).toBe(r.opponent.hitsMade);
    // Economy C: +1 per hit made, +3 per hit received.
    expect(r.test.dinarsEarned).toBe(r.test.hitsMade + 3 * r.test.hitsReceived);
    expect(r.winner === null || r.test.pipsAtEnd === 0 || r.opponent.pipsAtEnd === 0).toBe(true);
  }, 60_000);

  it('keeps win-rate intervals within 0 to 100%', () => {
    const all = rateInterval([0, 0, 0, 0]);
    expect(all.low).toBe(0);
    expect(all.high).toBeGreaterThan(0);
    expect(rateInterval([100, 100]).high).toBe(100);
  });
});
