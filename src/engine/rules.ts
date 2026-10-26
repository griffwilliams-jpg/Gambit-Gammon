/**
 * Versioned rules configuration.
 *
 * `RULES_V0_4` is the current ruleset (docs/rules.md, with Griff's B03–B10
 * decisions in docs/agreed-decisions.md). Values under `economy`, `bazaar`
 * and `lamps` are provisional balance parameters, not measured fair values.
 * Economy A and C are comparison configurations only.
 */

import type { LampType, RarityWeights } from './jinn.js';

export const RULESET_ID = 'gambit-gammon' as const;
export const CURRENT_RULES_VERSION = '0.4' as const;

export interface RulesConfig {
  readonly rulesetId: typeof RULESET_ID;
  readonly rulesVersion: typeof CURRENT_RULES_VERSION;
  readonly board: {
    readonly points: 24;
    readonly checkersPerPlayer: 15;
  };
  readonly cards: {
    readonly startingHandSize: number;
    readonly maxHandSize: number;
    readonly naturalDoublesDraw: number;
    /** Highest movement value a boosted ordinary die may reach. */
    readonly maxBoostedDie: number;
  };
  readonly jinn: {
    readonly equipSlots: number;
    /** Own turns Malik rests after use (use on turn 1, ready on turn 4). */
    readonly malikRestTurns: number;
  };
  readonly economy: {
    readonly status: 'provisional';
    readonly label: 'A' | 'B' | 'C';
    readonly startingDinars: number;
    readonly hitterDinars: number;
    readonly hitPlayerDinars: number;
  };
  readonly bazaar: {
    readonly status: 'provisional';
    readonly visitEveryOwnTurns: number;
    readonly offersPerVisit: number;
    readonly guaranteedCopperOffers: number;
    readonly randomOfferWeights: Readonly<Record<LampType, number>>;
    readonly lampPrices: Readonly<Record<LampType, number>>;
    readonly paidRefreshPrice: number;
    readonly nextLampDiscount: number;
    readonly minimumDiscountedPrice: number;
  };
  readonly lamps: {
    readonly status: 'provisional';
    readonly rarityWeights: Readonly<Record<LampType, RarityWeights>>;
    /**
     * The free setup lamp. The rules call it a "mystery lamp"; the original
     * v0.3 decisions used standard-lamp odds, which match Copper.
     */
    readonly startingLamp: LampType;
  };
}

export const RULES_V0_4: RulesConfig = deepFreeze({
  rulesetId: RULESET_ID,
  rulesVersion: CURRENT_RULES_VERSION,
  board: { points: 24, checkersPerPlayer: 15 },
  cards: { startingHandSize: 5, maxHandSize: 7, naturalDoublesDraw: 2, maxBoostedDie: 10 },
  jinn: { equipSlots: 3, malikRestTurns: 2 },
  economy: {
    status: 'provisional',
    label: 'B',
    startingDinars: 0,
    hitterDinars: 1,
    hitPlayerDinars: 2,
  },
  bazaar: {
    status: 'provisional',
    visitEveryOwnTurns: 3,
    offersPerVisit: 3,
    guaranteedCopperOffers: 1,
    randomOfferWeights: { copper: 60, enchanted: 30, royal: 10 },
    lampPrices: { copper: 4, enchanted: 7, royal: 12 },
    paidRefreshPrice: 1,
    nextLampDiscount: 3,
    minimumDiscountedPrice: 1,
  },
  lamps: {
    status: 'provisional',
    rarityWeights: {
      copper: { common: 70, uncommon: 25, legendary: 5 },
      enchanted: { common: 40, uncommon: 45, legendary: 15 },
      royal: { common: 0, uncommon: 75, legendary: 25 },
    },
    startingLamp: 'copper',
  },
});

/** Comparison economies for balance testing; never the silent default. */
export function withEconomy(rules: RulesConfig, label: 'A' | 'B' | 'C'): RulesConfig {
  const hitPlayerDinars = { A: 1, B: 2, C: 3 }[label];
  return deepFreeze({ ...rules, economy: { ...rules.economy, label, hitPlayerDinars } });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
