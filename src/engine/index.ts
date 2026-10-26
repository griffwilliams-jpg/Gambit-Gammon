/**
 * Gambit Gammon headless rules engine: public interface.
 * Rendering-independent; no DOM or Node APIs are used.
 */

export { createGame, getLegalActions, applyAction, getObservation } from './game.js';
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
export { RULES_V0_4, RULESET_ID, CURRENT_RULES_VERSION } from './rules.js';
export type { RulesConfig } from './rules.js';
export { pipCount } from './board.js';
export * from './types.js';
