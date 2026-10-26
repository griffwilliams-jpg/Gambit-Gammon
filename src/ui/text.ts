/** Human-readable labels for cards, actions and events. Display only. */

import {
  JINN_BY_ID,
  parseCard,
  type CardId,
  type GameAction,
  type GameEvent,
  type Observation,
  type PlayerId,
  type PowerKind,
} from '../engine/index.js';

const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' } as const;
const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function cardLabel(id: CardId): string {
  const card = parseCard(id);
  return `${RANK_LABEL[card.rank] ?? card.rank}${SUIT_SYMBOL[card.suit]}`;
}

export function isRed(id: CardId): boolean {
  const suit = parseCard(id).suit;
  return suit === 'H' || suit === 'D';
}

export const POWER_NAMES: Record<PowerKind, string> = {
  'high-card': 'High Card Boost',
  pair: 'Pair Reroll',
  'two-pair': 'Two Pair Reverse',
  'three-of-a-kind': 'Three of a Kind: any direction',
  straight: 'Straight Reroll',
  flush: 'Flush Shield',
  'full-house': 'Caravan Exchange',
  'four-of-a-kind': 'Four of a Kind: set a die',
  'straight-flush': 'Straight Flush: set both dice',
  'royal-flush': 'Royal Flush: bonus turn',
};

export function playerName(player: PlayerId): string {
  return player === 'white' ? 'Ivory' : 'Onyx';
}

export function jinnName(id: string): string {
  return JINN_BY_ID[id as keyof typeof JINN_BY_ID]?.name ?? id;
}

function where(point: number | 'bar' | 'off'): string {
  return point === 'bar' ? 'the bar' : point === 'off' ? 'off' : String(point);
}

export function checkerPoint(observation: Observation, id: string): string {
  const c = observation.checkers.find((x) => x.id === id);
  if (!c) return id;
  return c.location.kind === 'point' ? `point ${c.location.point}` : c.location.kind === 'bar' ? 'the bar' : 'off';
}

export function powerParamsLabel(action: Extract<GameAction, { type: 'play-power' }>, observation: Observation): string {
  const p = action.params;
  switch (p.power) {
    case 'high-card':
      return `boost a ${p.die} to ${p.die + p.boost}`;
    case 'pair':
      return `reroll die ${p.die + 1}`;
    case 'two-pair':
      return 'one backward move this turn';
    case 'three-of-a-kind':
      return 'move either way this turn';
    case 'straight':
      return p.mode === 'reroll' ? 'reroll both dice, then choose' : "force opponent's reroll next turn";
    case 'flush':
      return `shield checker on ${checkerPoint(observation, p.checkerId)}`;
    case 'full-house':
      return `swap points ${p.points[0]} and ${p.points[1]}`;
    case 'four-of-a-kind':
      return `set die ${p.die + 1} to ${p.value}`;
    case 'straight-flush':
      return `set dice to ${p.values[0]} and ${p.values[1]}`;
  }
}

export function actionLabel(action: GameAction, observation: Observation): string {
  switch (action.type) {
    case 'roll-opening-die':
      return `${playerName(action.player)}: roll opening die`;
    case 'choose-hadi-mark':
      return `Mark opposing checker on ${checkerPoint(observation, action.checkerId)}`;
    case 'choose-jinn-target':
      return `Enchant checker on ${checkerPoint(observation, action.checkerId)}`;
    case 'use-sahira':
      return action.use ? 'Use Sahira: discard hand, draw 7' : 'Keep hand';
    case 'roll-dice':
      return 'Roll dice';
    case 'exchange':
      return action.discard ? `Exchange: discard ${cardLabel(action.discard)}, draw 2` : 'Decline the 6-1 exchange';
    case 'move-checker':
      return `${where(action.from)} → ${where(action.to)} (${action.die})${action.reverse ? ' backward' : ''}`;
    case 'play-power':
      return `${POWER_NAMES[action.params.power]}: ${powerParamsLabel(action, observation)}`;
    case 'declare-royal-flush':
      return 'Declare Royal Flush (take a bonus turn)';
    case 'end-turn':
      return 'End turn';
    case 'choose-zafir-value':
      return `Take ${action.value}`;
    case 'choose-straight-dice':
      return action.keep === 'original' ? 'Keep original dice' : 'Take rerolled dice';
    case 'discard-card':
      return `Discard ${cardLabel(action.cardId)}`;
    case 'choose-basim-card':
      return `Keep ${cardLabel(action.cardId)}`;
    case 'use-malik':
      return action.checkerId ? `Shield checker on ${checkerPoint(observation, action.checkerId)}` : 'Not now';
    case 'bazaar-buy':
      return `Buy lamp ${action.slot + 1}`;
    case 'bazaar-refresh':
      return 'Refresh stock';
    case 'bazaar-leave':
      return 'Leave the Bazaar';
    case 'equip-jinn':
      return action.replaceSlot === null ? 'Release the new Jinn' : `Replace slot ${action.replaceSlot + 1}`;
  }
}

export function eventText(event: GameEvent, viewer: PlayerId): string | null {
  const who = (p: PlayerId) => (p === viewer ? 'You' : playerName(p));
  switch (event.type) {
    case 'opening-die-rolled':
      return `${who(event.player)} rolled ${event.value} for the opening.`;
    case 'opening-tie':
      return `Opening tie on ${event.value}: roll again.`;
    case 'starter-determined':
      return `${who(event.player)} start${event.player === viewer ? '' : 's'} with ${event.dice[0]}-${event.dice[1]}.`;
    case 'turn-started':
      return `${playerName(event.player)}'s turn ${event.ownTurnNumber}${event.bonus ? ' (Royal Flush bonus turn)' : ''}`;
    case 'dice-rolled':
      return `${who(event.player)} rolled ${event.dice[0]}-${event.dice[1]}${event.reason === 'turn' ? '' : ` (${event.reason})`}.`;
    case 'dice-set':
      return `Dice now ${event.remaining.join(', ')}.`;
    case 'natural-doubles':
      return `Natural doubles! Charge ${event.cumulative}/2, streak ${event.streak}.`;
    case 'benefit-banked':
      return `${who(event.player)} banked a ${event.benefit === 'refresh' ? 'free Bazaar refresh' : event.benefit === 'upgrade' ? 'Copper→Enchanted upgrade' : '3-Dinar discount'}.`;
    case 'checker-moved':
      return `${who(event.player)}: ${where(event.from)} → ${where(event.to)} (${event.die})${event.reverse ? ' backward' : ''}.`;
    case 'checker-hit':
      return `${who(event.player)} hit a checker on ${event.point}; it goes to the bar.`;
    case 'checker-borne-off':
      return null; // Covered by the checker-moved line ("→ off").
    case 'dinars-awarded':
      return `${who(event.player)} +${event.amount} Dinar${event.amount === 1 ? '' : 's'} (${event.reason === 'hitter' ? 'for hitting' : 'for being hit'}).`;
    case 'card-drawn':
      return `${who(event.player)} drew a card${event.locked ? ' (capture card: not playable this turn)' : ''}.`;
    case 'draw-shortfall':
      return 'No cards left to draw.';
    case 'deck-reshuffled':
      return `Discard pile reshuffled into the deck (${event.size} cards).`;
    case 'card-discarded':
      return `${who(event.player)} discarded ${cardLabel(event.cardId)}${event.reason === 'forced' ? ' (forced, random)' : ''}.`;
    case 'cards-revealed':
      return `${who(event.player)} revealed ${event.count} card${event.count === 1 ? '' : 's'}.`;
    case 'power-played':
      return `${who(event.player)} played ${POWER_NAMES[event.power]} with ${event.cardIds.map(cardLabel).join(' ')}${event.wildCardId ? ` (${cardLabel(event.wildCardId)} wild)` : ''}.`;
    case 'caravan-exchange':
      return `Caravan Exchange swapped points ${event.points[0]} and ${event.points[1]}.`;
    case 'shield-added':
      return `${who(event.player)} shielded a checker (${event.source === 'flush' ? 'Flush' : 'Malik'}).`;
    case 'shield-removed':
      return `A shield ${event.reason === 'expired' ? 'expired' : event.reason === 'self-stacked' ? 'ended (stacked)' : 'ended'}.`;
    case 'forced-reroll-pending':
      return `${who(event.player)} must reroll next turn.`;
    case 'royal-flush-declared':
      return `${who(event.player)} declared a Royal Flush!`;
    case 'jinn-triggered':
      return `${jinnName(event.jinn)}: ${event.detail}.`;
    case 'jinn-target-set':
      return `${jinnName(event.jinn)} chose a checker.`;
    case 'jinn-revealed':
      return `${who(event.player)} revealed ${jinnName(event.jinn)} (${JINN_BY_ID[event.jinn].rarity}) from a ${event.lamp} lamp.`;
    case 'jinn-equipped':
      return `${jinnName(event.jinn)} joins slot ${event.slot + 1} (active from next turn).`;
    case 'jinn-released':
      return `${jinnName(event.jinn)} was released.`;
    case 'lamp-empty':
      return 'The lamp was empty.';
    case 'bazaar-opened':
      return `${who(event.player)} visit${event.player === viewer ? '' : 's'} the Jinn Bazaar.`;
    case 'bazaar-refreshed':
      return `Stock refreshed${event.paid ? ` for ${event.paid} Dinar` : ' (free)'}.`;
    case 'lamp-bought':
      return `${who(event.player)} bought a ${event.lamp} lamp for ${event.price}${event.upgraded ? ', upgraded to Enchanted' : ''}${event.discounted ? ', discounted' : ''}.`;
    case 'bazaar-closed':
      return null;
    case 'dice-unusable':
      return `${who(event.player)} could not use ${event.dice.join(', ')}.`;
    case 'turn-ended':
      return null;
    case 'game-won':
      return `${who(event.player)} ${event.player === viewer ? 'win' : 'wins'}!`;
  }
}
