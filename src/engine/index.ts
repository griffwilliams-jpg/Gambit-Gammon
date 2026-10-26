/**
 * Gambit Gammon headless rules engine: public interface.
 * Rendering-independent; no DOM or Node APIs are used.
 */

export { createGame, getLegalActions, applyAction, getObservation, purchaseQuote } from './game.js';
export type { CreateGameOptions } from './game.js';
export {
  saveGame,
  loadGame,
  createReplay,
  serialiseReplay,
  parseReplay,
  runReplay,
  SAVE_FORMAT,
  SAVE_VERSION,
  REPLAY_FORMAT,
  REPLAY_VERSION,
} from './persistence.js';
export type { SaveFile, Replay } from './persistence.js';
export { RULES_V0_4, RULESET_ID, CURRENT_RULES_VERSION, withEconomy } from './rules.js';
export type { RulesConfig } from './rules.js';
export { pipCount } from './board.js';
export { JINN, JINN_BY_ID } from './jinn.js';
export type { JinnId, JinnDefinition, LampType, Rarity } from './jinn.js';
export { parseCard, qualifyingHands, highCardBoost } from './cards.js';
export type { Card, CardId, PowerKind, Suit } from './cards.js';
export * from './types.js';
