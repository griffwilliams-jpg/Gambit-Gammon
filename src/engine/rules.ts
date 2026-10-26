/**
 * Versioned rules configuration.
 *
 * `RULES_V0_4` is the current ruleset (docs/rules.md). Only the backgammon
 * board, setup and opening contest are executed by this engine stage. The
 * economy and Bazaar values are recorded for ruleset identity and are
 * explicitly provisional balance parameters: the engine does not consume them
 * yet. Unresolved shop mechanics (docs/open-decisions.md B03–B10) are
 * deliberately absent rather than guessed.
 */

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
    readonly startingHandSize: 5;
    readonly maxHandSize: 7;
  };
  readonly jinn: {
    readonly freeStartingLamps: 1;
    readonly equipSlots: 3;
  };
  /** Provisional balance values (Economy B). Not implemented in this stage. */
  readonly economy: {
    readonly status: 'provisional';
    readonly label: 'B';
    readonly startingDinars: 0;
    readonly hitterDinars: 1;
    readonly hitPlayerDinars: 2;
  };
  /** Provisional balance values. Not implemented in this stage. */
  readonly bazaar: {
    readonly status: 'provisional';
    readonly visitEveryOwnTurns: 3;
    readonly offersPerVisit: 3;
    readonly guaranteedCopperOffers: 1;
    readonly randomOfferWeights: { readonly copper: 60; readonly enchanted: 30; readonly royal: 10 };
    readonly lampPrices: { readonly copper: 4; readonly enchanted: 7; readonly royal: 12 };
    readonly paidRefreshPrice: 1;
    readonly nextLampDiscount: 3;
    readonly minimumDiscountedPrice: 1;
  };
}

export const RULES_V0_4: RulesConfig = deepFreeze({
  rulesetId: RULESET_ID,
  rulesVersion: CURRENT_RULES_VERSION,
  board: { points: 24, checkersPerPlayer: 15 },
  cards: { startingHandSize: 5, maxHandSize: 7 },
  jinn: { freeStartingLamps: 1, equipSlots: 3 },
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
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
