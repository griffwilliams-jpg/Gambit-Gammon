import { describe, expect, it } from 'vitest';
import { parseCard, qualifyingHands } from '../src/engine/index.js';
import { qualifyingHandsWithWild } from '../src/engine/cards.js';

const hands = (...ids: string[]) =>
  qualifyingHands(ids.map(parseCard))
    .map((h) => (h.boost ? `${h.power}+${h.boost}` : h.power))
    .sort();

describe('poker hand qualification', () => {
  it('gives High Card boosts only for J, Q, K and A', () => {
    expect(hands('JS')).toEqual(['high-card+1']);
    expect(hands('QH')).toEqual(['high-card+2']);
    expect(hands('KD')).toEqual(['high-card+3']);
    expect(hands('AC')).toEqual(['high-card+4']);
    expect(hands('10S')).toEqual([]);
  });

  it('recognises pairs, two pair, trips and quads by exact selection size', () => {
    expect(hands('5S', '5H')).toEqual(['pair']);
    expect(hands('5S', '6H')).toEqual([]);
    expect(hands('5S', '5H', '9C', '9D')).toEqual(['two-pair']);
    expect(hands('5S', '5H', '5C')).toEqual(['three-of-a-kind']);
    expect(hands('5S', '5H', '5C', '5D')).toEqual(['four-of-a-kind']);
  });

  it('allows Ace-low and Ace-high straights but not wrapping', () => {
    expect(hands('AS', '2H', '3C', '4D', '5S')).toEqual(['straight']);
    expect(hands('10S', 'JH', 'QC', 'KD', 'AS')).toEqual(['straight']);
    expect(hands('QS', 'KH', 'AC', '2D', '3S')).toEqual([]);
  });

  it('lets a straight flush be spent as Straight, Flush or Straight Flush', () => {
    expect(hands('5H', '6H', '7H', '8H', '9H')).toEqual(['flush', 'straight', 'straight-flush']);
    expect(hands('10S', 'JS', 'QS', 'KS', 'AS')).toEqual(['flush', 'royal-flush', 'straight', 'straight-flush']);
  });

  it('recognises flushes and full houses', () => {
    expect(hands('2D', '7D', '9D', 'JD', 'KD')).toEqual(['flush']);
    expect(hands('8S', '8H', '8C', '3D', '3S')).toEqual(['full-house']);
  });

  it('lets a wild card complete a hand without duplicating a selected card', () => {
    const cards = ['10S', 'JS', 'QS', 'KS', '2H'].map(parseCard);
    const withWild = qualifyingHandsWithWild(cards, 4).map((h) => h.power);
    expect(withWild).toContain('royal-flush');
    const single = qualifyingHandsWithWild([parseCard('3C')], 0).map((h) => `${h.power}+${h.boost}`);
    expect(single.sort()).toEqual(['high-card+1', 'high-card+2', 'high-card+3', 'high-card+4']);
  });
});
