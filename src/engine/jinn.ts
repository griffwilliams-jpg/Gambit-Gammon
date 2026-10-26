/**
 * The approved twelve-Jinn roster (docs/rules.md section 7) and lamp contents.
 * Effects are implemented in the turn engine; this module holds identity,
 * rarity and the lamp rarity draw.
 */

import { randomInt, type RngState } from './rng.js';

export type Rarity = 'common' | 'uncommon' | 'legendary';
export type LampType = 'copper' | 'enchanted' | 'royal';

export type JinnId =
  | 'hadi'
  | 'amira'
  | 'sahira'
  | 'malik'
  | 'rakhim'
  | 'zafir'
  | 'basim'
  | 'nahla'
  | 'qamar'
  | 'sirocco'
  | 'noura'
  | 'mazin';

export interface JinnDefinition {
  readonly id: JinnId;
  readonly name: string;
  readonly rarity: Rarity;
  readonly effect: string;
  readonly quote: string;
}

export const JINN: readonly JinnDefinition[] = [
  {
    id: 'hadi',
    name: 'Hadi the Collector',
    rarity: 'uncommon',
    effect: 'Mark one opposing checker at the start of your turn. The first time you hit it each turn, draw 1 extra card.',
    quote: "There's a debt to be collected.",
  },
  {
    id: 'amira',
    name: 'Amira of the Crossroads',
    rarity: 'uncommon',
    effect: 'Enchant one of your checkers. Once per turn it may make a legal move in either direction.',
    quote: 'Every road eventually leads to me.',
  },
  {
    id: 'sahira',
    name: 'Sahira the Sevenfold',
    rarity: 'uncommon',
    effect: 'Once per match, at the start of your turn, discard your whole hand and draw 7 cards.',
    quote: 'A dreadful hand. Shall we try another?',
  },
  {
    id: 'malik',
    name: 'Malik the Unyielding',
    rarity: 'legendary',
    effect: "At the end of your turn, shield one exposed checker through the opponent's next turn. Then rests for your next two turns.",
    quote: 'My word is stone. My stone does not move.',
  },
  {
    id: 'rakhim',
    name: 'Rakhim the Ravager',
    rarity: 'legendary',
    effect: "Enchant one of your checkers. Its first hit each turn draws 1 extra card.",
    quote: 'Your pieces look better on the bar.',
  },
  {
    id: 'zafir',
    name: 'Zafir the Second-Guesser',
    rarity: 'common',
    effect: 'For Pair Reroll, roll two candidate values and choose one.',
    quote: 'That one? Are you quite sure?',
  },
  {
    id: 'basim',
    name: 'Basim the Bargainer',
    rarity: 'common',
    effect: 'On your first hit each turn, reveal two cards and keep one instead of the normal draw. The other is discarded.',
    quote: 'A little choice can be very expensive.',
  },
  {
    id: 'nahla',
    name: 'Nahla the Veiled',
    rarity: 'common',
    effect: "The first time each opponent turn you are forced to discard at random, choose the card instead.",
    quote: 'You may take a secret. But I choose which.',
  },
  {
    id: 'qamar',
    name: 'Qamar the Moon-Watcher',
    rarity: 'common',
    effect: 'Each qualifying natural double draws 1 extra card.',
    quote: 'Twice the fortune, twice the fun.',
  },
  {
    id: 'sirocco',
    name: 'Sirocco the Unbound',
    rarity: 'common',
    effect: 'Your first successful backward checker movement each turn draws 1 card.',
    quote: 'Forward, backward. Such tedious distinctions.',
  },
  {
    id: 'noura',
    name: 'Noura the Kindler',
    rarity: 'uncommon',
    effect: 'If you finish your turn with no cards after discarding played cards, draw 2.',
    quote: 'Even ashes contain the promise of fire.',
  },
  {
    id: 'mazin',
    name: 'Mazin the Wish-Breaker',
    rarity: 'legendary',
    effect: 'Once per match, treat one card as any rank and suit when playing a poker hand.',
    quote: 'You wished for a better hand. You never specified whose.',
  },
];

export const JINN_BY_ID: Readonly<Record<JinnId, JinnDefinition>> = Object.fromEntries(
  JINN.map((j) => [j.id, j]),
) as Record<JinnId, JinnDefinition>;

/** Rarity weights (percent) for the Jinn inside each lamp type. Provisional balance values. */
export type RarityWeights = Readonly<Record<Rarity, number>>;

/**
 * Draws a Jinn from a lamp: pick a rarity by weight, then uniformly within the
 * tier. Excluded (already equipped) Jinn are removed first; exhausted tiers
 * are dropped and the remaining weights renormalised. Zero-weight tiers are
 * never used as fallback (Royal never yields Common).
 */
export function drawJinn(
  weights: RarityWeights,
  excluded: readonly JinnId[],
  rng: RngState,
): { jinn: JinnId | null; state: RngState } {
  const tiers = (['common', 'uncommon', 'legendary'] as const)
    .map((rarity) => ({
      rarity,
      weight: weights[rarity],
      pool: JINN.filter((j) => j.rarity === rarity && !excluded.includes(j.id)).map((j) => j.id),
    }))
    .filter((tier) => tier.weight > 0 && tier.pool.length > 0);
  const total = tiers.reduce((sum, tier) => sum + tier.weight, 0);
  if (total === 0) return { jinn: null, state: rng };

  const pick = randomInt(rng, total);
  let roll = pick.value;
  for (const tier of tiers) {
    if (roll < tier.weight) {
      const member = randomInt(pick.state, tier.pool.length);
      return { jinn: tier.pool[member.value]!, state: member.state };
    }
    roll -= tier.weight;
  }
  throw new Error('Unreachable: rarity roll out of range.');
}
