/**
 * Saves and replays. Both carry ruleset identity and version; a file from a
 * different ruleset version (for example historical v0.3) is rejected rather
 * than converted. Loading a save re-derives the state from its seed and
 * action log and refuses any save whose stored state disagrees.
 */

import { applyAction, createGame } from './game.js';
import { CURRENT_RULES_VERSION, RULESET_ID, type RulesConfig } from './rules.js';
import { STATE_SCHEMA_VERSION, type GameAction, type GameEvent, type GameState } from './types.js';

export const SAVE_FORMAT = 'gambit-gammon-save' as const;
export const SAVE_VERSION = 1 as const;
export const REPLAY_FORMAT = 'gambit-gammon-replay' as const;
export const REPLAY_VERSION = 1 as const;

export interface SaveFile {
  readonly format: typeof SAVE_FORMAT;
  readonly saveVersion: typeof SAVE_VERSION;
  readonly rulesetId: string;
  readonly rulesVersion: string;
  readonly state: GameState;
}

export interface Replay {
  readonly format: typeof REPLAY_FORMAT;
  readonly replayVersion: typeof REPLAY_VERSION;
  readonly rulesetId: string;
  readonly rulesVersion: string;
  readonly rules: RulesConfig;
  readonly seed: string;
  readonly actions: readonly GameAction[];
}

export function saveGame(state: GameState): string {
  const save: SaveFile = {
    format: SAVE_FORMAT,
    saveVersion: SAVE_VERSION,
    rulesetId: state.rules.rulesetId,
    rulesVersion: state.rules.rulesVersion,
    state,
  };
  return JSON.stringify(save);
}

export function loadGame(serialised: string): GameState {
  const save = parse(serialised) as Partial<SaveFile>;
  if (save.format !== SAVE_FORMAT) throw new Error('Not a Gambit Gammon save file.');
  if (save.saveVersion !== SAVE_VERSION) throw new Error(`Unsupported save version: ${String(save.saveVersion)}.`);
  assertRuleset(save.rulesetId, save.rulesVersion);
  const state = save.state;
  if (!state || state.schemaVersion !== STATE_SCHEMA_VERSION) throw new Error('Unsupported game state schema.');
  if (state.rules?.rulesetId !== save.rulesetId || state.rules?.rulesVersion !== save.rulesVersion) {
    throw new Error('Save header and game state disagree on the ruleset.');
  }

  const { state: rebuilt } = runReplay(createReplay(state));
  if (canonical(rebuilt) !== canonical(state)) {
    throw new Error('Save file state does not match its recorded actions.');
  }
  return rebuilt;
}

export function createReplay(state: GameState): Replay {
  return {
    format: REPLAY_FORMAT,
    replayVersion: REPLAY_VERSION,
    rulesetId: state.rules.rulesetId,
    rulesVersion: state.rules.rulesVersion,
    rules: state.rules,
    seed: state.seed,
    actions: state.actionLog,
  };
}

export function serialiseReplay(replay: Replay): string {
  return JSON.stringify(replay);
}

export function parseReplay(serialised: string): Replay {
  const replay = parse(serialised) as Partial<Replay>;
  if (replay.format !== REPLAY_FORMAT) throw new Error('Not a Gambit Gammon replay.');
  if (replay.replayVersion !== REPLAY_VERSION) {
    throw new Error(`Unsupported replay version: ${String(replay.replayVersion)}.`);
  }
  assertRuleset(replay.rulesetId, replay.rulesVersion);
  if (!replay.rules || typeof replay.seed !== 'string' || !Array.isArray(replay.actions)) {
    throw new Error('Replay is missing its rules, seed or actions.');
  }
  return replay as Replay;
}

/** Re-applies every recorded action from the seed; throws if any is rejected. */
export function runReplay(replay: Replay): { state: GameState; events: GameEvent[][] } {
  assertRuleset(replay.rulesetId, replay.rulesVersion);
  let state = createGame({ seed: replay.seed, rules: replay.rules });
  const events: GameEvent[][] = [];
  replay.actions.forEach((action, index) => {
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(`Replay action ${index} rejected (${result.code}): ${result.message}`);
    state = result.state;
    events.push([...result.events]);
  });
  return { state, events };
}

function assertRuleset(rulesetId: unknown, rulesVersion: unknown): void {
  if (rulesetId !== RULESET_ID) throw new Error(`Unknown ruleset: ${String(rulesetId)}.`);
  if (rulesVersion !== CURRENT_RULES_VERSION) {
    throw new Error(
      `Rules version ${String(rulesVersion)} cannot be loaded as v${CURRENT_RULES_VERSION}; no conversion is defined.`,
    );
  }
}

function parse(serialised: string): unknown {
  try {
    return JSON.parse(serialised);
  } catch {
    throw new Error('File is not valid JSON.');
  }
}

/** JSON with sorted keys, so equality does not depend on property order. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : inner,
  );
}
