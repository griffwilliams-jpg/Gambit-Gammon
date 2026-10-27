/**
 * Command-line runner: `npm run simulate -- --games 1000 [--experiment economy|farming] [--prefix …] [--bot planner|basic]`.
 * Prints a markdown report to stdout.
 */

import { FARMING_INTENSITIES } from '../ai/planner.js';
import { runComparison, runMatchups, summarise, summariseIntensities, summariseMatchups } from './economy.js';

// Minimal Node globals, declared here so the engine build stays free of Node types.
declare const process: { argv: string[]; stdout: { write(text: string): void } };

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}

const games = Number(arg('games', '200'));
const experiment = arg('experiment', 'economy');
const started = Date.now();

if (experiment === 'farming') {
  // `npm run simulate -- --experiment farming --games 1000`
  const seedPrefix = arg('prefix', 'farm');
  const control = runMatchups({ games, seedPrefix, testLevel: 'planner' });
  const byIntensity = FARMING_INTENSITIES.map((intensity) => ({
    intensity,
    results: runMatchups({ games, seedPrefix, testLevel: 'farmer', farmingIntensity: intensity }),
  }));
  const strongest = byIntensity.reduce((best, x) =>
    x.results.B.filter((r) => r.winner === r.testSide).length > best.results.B.filter((r) => r.winner === r.testSide).length ? x : best,
  );
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(
    [
      `Farming test: ${games} seeds (${seedPrefix}-0 … ${seedPrefix}-${games - 1}), each farming intensity against the planner, seats alternating by seed, Economies B and C, ${seconds}s.`,
      '',
      summariseIntensities(byIntensity, control),
      '',
      `Detail for the strongest farmer under B ("${strongest.intensity}"):`,
      '',
      summariseMatchups(strongest.results, control),
      '',
    ].join('\n'),
  );
} else {
  const seedPrefix = arg('prefix', 'econ');
  const botLevel = arg('bot', 'planner') === 'basic' ? 'basic' : 'planner';
  const results = runComparison({ games, seedPrefix, botLevel });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(
    [
      `Economy comparison: ${games} paired seeds (${seedPrefix}-0 … ${seedPrefix}-${games - 1}), ${botLevel} bot on both sides, ${seconds}s.`,
      '',
      summarise(results),
      '',
    ].join('\n'),
  );
}
