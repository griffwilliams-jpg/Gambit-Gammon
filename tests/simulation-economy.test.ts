import { describe, expect, it } from 'vitest';
import { meanInterval, pairedDifference, playRecordedGame, runComparison, summarise } from '../src/sim/economy.js';

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
