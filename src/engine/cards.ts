/**
 * Standard 52-card deck and poker-hand qualification for played powers.
 *
 * A played selection must use exactly the cards its hand needs; a pair may be
 * chosen from a larger matching group because the player picks the subset.
 * Ace-low straights (A-2-3-4-5) are allowed; wrapping (Q-K-A-2-3) is not.
 * A straight flush may be spent as Straight, Flush or Straight Flush, and a
 * royal flush additionally as the end-of-turn Royal Flush.
 */

export type Suit = 'S' | 'H' | 'D' | 'C';
export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];

/** 2–10, J = 11, Q = 12, K = 13, A = 14. */
export type Rank = number;
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/** e.g. `AS`, `10H`, `QD`. */
export type CardId = string;

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
}

const RANK_LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function cardId(card: Card): CardId {
  return `${RANK_LABELS[card.rank] ?? String(card.rank)}${card.suit}`;
}

export function parseCard(id: CardId): Card {
  const suit = id.slice(-1) as Suit;
  const label = id.slice(0, -1);
  const entry = Object.entries(RANK_LABELS).find(([, value]) => value === label);
  const rank = entry ? Number(entry[0]) : Number(label);
  if (!SUITS.includes(suit) || !RANKS.includes(rank)) throw new Error(`Invalid card: ${id}`);
  return { rank, suit };
}

export function fullDeck(): CardId[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => cardId({ rank, suit })));
}

export type PowerKind =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

/** High Card boost by rank: J +1, Q +2, K +3, A +4. */
export function highCardBoost(rank: Rank): number | null {
  return rank >= 11 ? rank - 10 : null;
}

function isStraight(ranks: readonly Rank[]): boolean {
  const sorted = [...ranks].sort((a, b) => a - b);
  if (new Set(sorted).size !== 5) return false;
  if (sorted[4]! - sorted[0]! === 4) return true;
  // Ace-low: A-2-3-4-5.
  return sorted.join(',') === '2,3,4,5,14';
}

/** Powers a fully specified selection qualifies for, with High Card boosts. */
export function qualifyingHands(cards: readonly Card[]): { power: PowerKind; boost?: number }[] {
  const ranks = cards.map((c) => c.rank);
  const counts = [...countBy(ranks).values()].sort((a, b) => b - a);
  const results: { power: PowerKind; boost?: number }[] = [];
  switch (cards.length) {
    case 1: {
      const boost = highCardBoost(ranks[0]!);
      if (boost !== null) results.push({ power: 'high-card', boost });
      break;
    }
    case 2:
      if (counts[0] === 2) results.push({ power: 'pair' });
      break;
    case 3:
      if (counts[0] === 3) results.push({ power: 'three-of-a-kind' });
      break;
    case 4:
      if (counts[0] === 4) results.push({ power: 'four-of-a-kind' });
      if (counts[0] === 2 && counts[1] === 2) results.push({ power: 'two-pair' });
      break;
    case 5: {
      const straight = isStraight(ranks);
      const flush = new Set(cards.map((c) => c.suit)).size === 1;
      if (counts[0] === 3 && counts[1] === 2) results.push({ power: 'full-house' });
      if (straight) results.push({ power: 'straight' });
      if (flush) results.push({ power: 'flush' });
      if (straight && flush) {
        results.push({ power: 'straight-flush' });
        if (Math.min(...ranks) === 10) results.push({ power: 'royal-flush' });
      }
      break;
    }
  }
  return results;
}

/**
 * Qualifying hands when one selected card is wild (Mazin). The wild card may
 * stand for any rank and suit not already among the other selected cards.
 */
export function qualifyingHandsWithWild(
  cards: readonly Card[],
  wildIndex: number,
): { power: PowerKind; boost?: number }[] {
  const others = cards.filter((_, i) => i !== wildIndex);
  const taken = new Set(others.map(cardId));
  const found = new Map<string, { power: PowerKind; boost?: number }>();
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const virtual = { rank, suit };
      if (taken.has(cardId(virtual))) continue;
      for (const hand of qualifyingHands([...others, virtual])) {
        found.set(`${hand.power}:${hand.boost ?? ''}`, hand);
      }
    }
  }
  return [...found.values()];
}

function countBy<T>(values: readonly T[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return map;
}

/** Card counts per played hand, for enumerating candidate selections. */
export const HAND_SIZES: readonly number[] = [1, 2, 3, 4, 5];
