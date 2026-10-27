/**
 * Reproducible economy comparison (docs/development-plan.md, "Reproducible
 * comparisons"). Every configuration plays the same list of match seeds with
 * the same computer players, so differences are paired by seed. Results are
 * simulation proxies for one fixed policy, not measured balance.
 */

import { chooseBotAction, createBot, type BotLevel } from '../ai/bot.js';
import {
  JINN_BY_ID,
  RULES_V0_4,
  applyAction,
  createGame,
  getLegalActions,
  getObservation,
  withEconomy,
  type GameEvent,
  type LampType,
  type PlayerId,
  type Rarity,
  type RulesConfig,
} from '../engine/index.js';

export type EconomyLabel = 'A' | 'B' | 'C';

export interface GameRecord {
  readonly seed: string;
  readonly economy: EconomyLabel;
  /** null when the diagnostic turn cap was reached (inconclusive, never a win). */
  readonly winner: PlayerId | null;
  readonly starter: PlayerId;
  readonly turns: number;
  readonly hits: number;
  readonly dinarsEarned: number;
  readonly dinarsSpent: number;
  readonly dinarsUnspent: number;
  readonly purchases: Readonly<Record<LampType, number>>;
  readonly revealedRarity: Readonly<Record<Rarity, number>>;
  readonly visits: number;
  readonly affordableVisits: number;
  readonly affordableVisitsSkipped: number;
  readonly paidRefreshes: number;
  readonly freeRefreshes: number;
  readonly benefitsEarned: number;
  readonly benefitsUsed: number;
  readonly benefitsBankedAtEnd: number;
  /** Dinars earned by the eventual winner minus the loser (0 if capped). */
  readonly winnerDinarEdge: number;
  /** Hits received by the eventual winner minus the loser (0 if capped). */
  readonly winnerHitsReceivedEdge: number;
}

export interface SimulationOptions {
  readonly games: number;
  readonly seedPrefix?: string;
  readonly economies?: readonly EconomyLabel[];
  readonly botLevel?: BotLevel;
  /** Diagnostic cap; a capped game is reported as inconclusive. */
  readonly turnCap?: number;
}

export function rulesFor(economy: EconomyLabel): RulesConfig {
  return economy === 'B' ? RULES_V0_4 : withEconomy(RULES_V0_4, economy);
}

export function playRecordedGame(seed: string, economy: EconomyLabel, botLevel: BotLevel = 'planner', turnCap = 2000): GameRecord {
  let state = createGame({ seed, rules: rulesFor(economy) });
  // Computer-player seeds are fixed per match seed and independent of the economy.
  const bots = { white: createBot('white', `${seed}/white`, botLevel), black: createBot('black', `${seed}/black`, botLevel) };

  const purchases: Record<LampType, number> = { copper: 0, enchanted: 0, royal: 0 };
  const revealedRarity: Record<Rarity, number> = { common: 0, uncommon: 0, legendary: 0 };
  const earned: Record<PlayerId, number> = { white: 0, black: 0 };
  const hitsReceived: Record<PlayerId, number> = { white: 0, black: 0 };
  let starter: PlayerId = 'white';
  let hits = 0;
  let spent = 0;
  let visits = 0;
  let affordableVisits = 0;
  let affordableVisitsSkipped = 0;
  let paidRefreshes = 0;
  let freeRefreshes = 0;
  let benefitsEarned = 0;
  let benefitsUsed = 0;
  let visit: { affordable: boolean; bought: boolean } | null = null;

  const record = (event: GameEvent) => {
    switch (event.type) {
      case 'starter-determined':
        starter = event.player;
        break;
      case 'checker-hit':
        hits += 1;
        hitsReceived[event.player === 'white' ? 'black' : 'white'] += 1;
        break;
      case 'dinars-awarded':
        earned[event.player] += event.amount;
        break;
      case 'lamp-bought':
        purchases[event.lamp] += 1;
        spent += event.price;
        benefitsUsed += (event.upgraded ? 1 : 0) + (event.discounted ? 1 : 0);
        if (visit) visit.bought = true;
        break;
      case 'jinn-revealed':
        if (event.lamp !== 'starting') revealedRarity[JINN_BY_ID[event.jinn].rarity] += 1;
        break;
      case 'bazaar-refreshed':
        if (event.paid > 0) {
          paidRefreshes += 1;
          spent += event.paid;
        } else {
          freeRefreshes += 1;
          benefitsUsed += 1;
        }
        break;
      case 'benefit-banked':
        benefitsEarned += 1;
        break;
      case 'bazaar-closed':
        if (visit?.affordable && !visit.bought) affordableVisitsSkipped += 1;
        visit = null;
        break;
    }
  };

  while (state.phase.kind !== 'finished' && state.turnNumber <= turnCap) {
    const actor = getLegalActions(state)[0]!.player;
    const result = applyAction(state, chooseBotAction(bots[actor], getObservation(state, actor)));
    if (!result.ok) throw new Error(`Simulation chose an illegal action in ${seed}: ${result.message}`);
    state = result.state;
    for (const event of result.events) {
      record(event);
      if (event.type === 'bazaar-opened') {
        visits += 1;
        const affordable = getLegalActions(state).some((a) => a.type === 'bazaar-buy');
        if (affordable) affordableVisits += 1;
        visit = { affordable, bought: false };
      }
    }
  }

  const winner = state.phase.kind === 'finished' ? state.phase.winner : null;
  const loser: PlayerId | null = winner === null ? null : winner === 'white' ? 'black' : 'white';
  const banked = (p: PlayerId) => {
    const b = state.players[p].benefits;
    return b.refreshes + b.upgrades + b.discounts;
  };
  return {
    seed,
    economy,
    winner,
    starter,
    turns: state.turnNumber,
    hits,
    dinarsEarned: earned.white + earned.black,
    dinarsSpent: spent,
    dinarsUnspent: state.players.white.dinars + state.players.black.dinars,
    purchases,
    revealedRarity,
    visits,
    affordableVisits,
    affordableVisitsSkipped,
    paidRefreshes,
    freeRefreshes,
    benefitsEarned,
    benefitsUsed,
    benefitsBankedAtEnd: banked('white') + banked('black'),
    winnerDinarEdge: winner && loser ? earned[winner] - earned[loser] : 0,
    winnerHitsReceivedEdge: winner && loser ? hitsReceived[winner] - hitsReceived[loser] : 0,
  };
}

export function runComparison(options: SimulationOptions): Record<EconomyLabel, GameRecord[]> {
  const economies = options.economies ?? ['B', 'A', 'C'];
  const prefix = options.seedPrefix ?? 'econ';
  const results = { A: [], B: [], C: [] } as Record<EconomyLabel, GameRecord[]>;
  for (let i = 0; i < options.games; i++) {
    const seed = `${prefix}-${i}`;
    for (const economy of economies) {
      results[economy].push(playRecordedGame(seed, economy, options.botLevel, options.turnCap));
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Summaries

export interface Interval {
  readonly mean: number;
  readonly low: number;
  readonly high: number;
}

/** Mean with a normal-approximation 95% confidence interval. */
export function meanInterval(values: readonly number[]): Interval {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const half = 1.96 * Math.sqrt(variance / n);
  return { mean, low: mean - half, high: mean + half };
}

/** Per-seed differences `a - b` for a metric, with a 95% interval. */
export function pairedDifference(a: readonly GameRecord[], b: readonly GameRecord[], metric: (r: GameRecord) => number): Interval {
  const bySeed = new Map(b.map((r) => [r.seed, r]));
  const diffs = a.filter((r) => bySeed.has(r.seed)).map((r) => metric(r) - metric(bySeed.get(r.seed)!));
  return meanInterval(diffs);
}

const fmt = (x: number, digits = 2) => x.toFixed(digits);
const interval = (i: Interval, digits = 2) => `${fmt(i.mean, digits)} (${fmt(i.low, digits)} to ${fmt(i.high, digits)})`;

export function summarise(results: Record<EconomyLabel, GameRecord[]>, economies: readonly EconomyLabel[] = ['B', 'A', 'C']): string {
  const rows: [string, (r: GameRecord) => number, number][] = [
    ['Turns per game', (r) => r.turns, 1],
    ['Hits per game', (r) => r.hits, 2],
    ['Dinars earned per game (both players)', (r) => r.dinarsEarned, 2],
    ['Dinars spent per game', (r) => r.dinarsSpent, 2],
    ['Dinars unspent at the end', (r) => r.dinarsUnspent, 2],
    ['Lamps bought per game', (r) => r.purchases.copper + r.purchases.enchanted + r.purchases.royal, 2],
    ['  Copper', (r) => r.purchases.copper, 2],
    ['  Enchanted', (r) => r.purchases.enchanted, 2],
    ['  Royal', (r) => r.purchases.royal, 2],
    ['Legendary Jinn revealed from purchases', (r) => r.revealedRarity.legendary, 2],
    ['Bazaar visits per game', (r) => r.visits, 2],
    ['Visits where nothing was affordable', (r) => r.visits - r.affordableVisits, 2],
    ['Affordable visits with no purchase', (r) => r.affordableVisitsSkipped, 2],
    ['Paid refreshes', (r) => r.paidRefreshes, 2],
    ['Free refreshes used', (r) => r.freeRefreshes, 2],
    ['Benefits earned (refresh/upgrade/discount)', (r) => r.benefitsEarned, 2],
    ['Benefits still banked at the end', (r) => r.benefitsBankedAtEnd, 2],
    ["Winner's Dinar edge over loser", (r) => r.winnerDinarEdge, 2],
    ["Winner's hits-received edge over loser", (r) => r.winnerHitsReceivedEdge, 2],
  ];
  const lines: string[] = [];
  lines.push(`| Metric (mean, 95% CI) | ${economies.map((e) => `Economy ${e}`).join(' | ')} |`);
  lines.push(`| --- | ${economies.map(() => '---').join(' | ')} |`);
  for (const [label, metric, digits] of rows) {
    lines.push(`| ${label} | ${economies.map((e) => interval(meanInterval(results[e].map(metric)), digits)).join(' | ')} |`);
  }
  const rate = (records: GameRecord[], won: (r: GameRecord) => boolean) => {
    const decided = records.filter((r) => r.winner !== null);
    return meanInterval(decided.map((r) => (won(r) ? 100 : 0)));
  };
  lines.push(`| Starter win rate (%) | ${economies.map((e) => interval(rate(results[e], (r) => r.winner === r.starter), 1)).join(' | ')} |`);
  lines.push(`| White win rate (%) | ${economies.map((e) => interval(rate(results[e], (r) => r.winner === 'white'), 1)).join(' | ')} |`);
  lines.push(`| Capped (inconclusive) games | ${economies.map((e) => String(results[e].filter((r) => r.winner === null).length)).join(' | ')} |`);

  const base = economies[0]!;
  const paired: string[] = [];
  for (const other of economies.slice(1)) {
    paired.push(`| Metric (paired by seed) | ${other} minus ${base} |`, '| --- | --- |');
    for (const [label, metric, digits] of rows.slice(0, 6)) {
      paired.push(`| ${label.trim()} | ${interval(pairedDifference(results[other], results[base], metric), digits)} |`);
    }
    const sameWinner = results[other].filter((r, i) => r.winner === results[base][i]!.winner).length / results[other].length;
    paired.push(`| Same winner as ${base} on the same seed | ${fmt(sameWinner * 100, 1)}% |`, '');
  }
  return [...lines, '', ...paired].join('\n');
}
