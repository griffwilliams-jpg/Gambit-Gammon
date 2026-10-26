import { describe, expect, it } from 'vitest';
import { chooseBotAction, createBot } from '../src/ai/bot.js';
import { applyAction, createGame, getLegalActions, getObservation, type GameState, type PlayerId } from '../src/engine/index.js';
import { chooseAction, seededChooser } from './helpers.js';

function playBotGame(seed: string, botSide: PlayerId): GameState {
  let state = createGame({ seed });
  const bot = createBot(botSide, `bot-${seed}`);
  const choose = seededChooser(seed.length * 7919);
  for (let i = 0; i < 30_000 && state.phase.kind !== 'finished'; i++) {
    const legal = getLegalActions(state);
    const actor = legal[0]!.player;
    const action = actor === botSide ? chooseBotAction(bot, getObservation(state, botSide)) : chooseAction(legal, choose);
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(`Bot chose an illegal action: ${result.message}`);
    state = result.state;
  }
  return state;
}

describe('computer opponent', () => {
  it('always chooses legal actions and clearly beats a random player', () => {
    let wins = 0;
    const games = 30;
    for (let g = 0; g < games; g++) {
      const side: PlayerId = g % 2 === 0 ? 'white' : 'black';
      const final = playBotGame(`bot-game-${g}`, side);
      expect(final.phase.kind).toBe('finished');
      if (final.phase.kind === 'finished' && final.phase.winner === side) wins++;
    }
    expect(wins / games).toBeGreaterThan(0.75);
  }, 60_000);

  it('is deterministic for the same seeds', () => {
    const a = playBotGame('bot-repeat', 'white');
    const b = playBotGame('bot-repeat', 'white');
    expect(JSON.stringify(a.actionLog)).toBe(JSON.stringify(b.actionLog));
  });

  it('does not change gameplay randomness when choosing', () => {
    const state = createGame({ seed: 'bot-rng' });
    const bot = createBot('white', 'x');
    const before = JSON.stringify(state.rng);
    chooseBotAction(bot, getObservation(state, 'white'));
    expect(JSON.stringify(state.rng)).toBe(before);
  });
});
