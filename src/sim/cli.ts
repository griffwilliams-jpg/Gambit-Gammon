/**
 * Command-line runner: `npm run simulate -- --games 1000 [--prefix econ] [--bot planner|basic]`.
 * Prints a markdown report to stdout.
 */

import { runComparison, summarise } from './economy.js';

// Minimal Node globals, declared here so the engine build stays free of Node types.
declare const process: { argv: string[]; stdout: { write(text: string): void } };

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}

const games = Number(arg('games', '200'));
const seedPrefix = arg('prefix', 'econ');
const botLevel = arg('bot', 'planner') === 'basic' ? 'basic' : 'planner';
const started = Date.now();
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
