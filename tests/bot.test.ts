import { describe, expect, it } from 'vitest';
import { chooseBotAction, createBot } from '../src/ai/bot.js';
import { planMove } from '../src/ai/planner.js';
import { applyAction, createGame, getLegalActions, getObservation, type GameState, type PlayerId } from '../src/engine/index.js';
import { apply, chooseAction, countAt, scenario, seededChooser } from './helpers.js';

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

describe('whole-turn planner', () => {
  const opening = { white: { 24: 2, 13: 5, 8: 3, 6: 5 }, black: { 1: 2, 12: 5, 17: 3, 19: 5 } };

  it('plays an opening 3-1 as 8/5 6/5, making the 5-point', () => {
    let state = scenario({ player: 'white', dice: [3, 1], ...opening });
    for (let i = 0; i < 2; i++) {
      const planned = planMove(getObservation(state, 'white'));
      expect(planned).not.toBeNull();
      state = apply(state, planned!.action);
    }
    expect(countAt(state, 'white', 5)).toBe(2);
    expect(countAt(state, 'white', 8)).toBe(2);
    expect(countAt(state, 'white', 6)).toBe(4);
  });

  it('hits a blot when it can do so safely', () => {
    const state = scenario({ player: 'white', dice: [4, 2], white: { 13: 2, 6: 4 }, black: { 9: 1, 1: 2 } });
    let next = state;
    for (let i = 0; i < 2; i++) next = apply(next, planMove(getObservation(next, 'white'))!.action);
    expect(next.checkers.filter((c) => c.owner === 'black' && c.location.kind === 'bar')).toHaveLength(1);
  });

  it('plays a dice power only when it improves the turn enough', () => {
    // Blocked 6-6 with a Straight Flush in hand: setting the dice rescues the whole turn.
    const blocked = scenario({
      player: 'white',
      dice: [6, 6],
      white: { bar: 1, 13: 2 },
      black: { 19: 2, 1: 2 },
      hands: { white: ['5H', '6H', '7H', '8H', '9H'] },
    });
    const planned = planMove(getObservation(blocked, 'white'));
    expect(planned?.action).toMatchObject({ type: 'play-power', params: { power: 'straight-flush' } });

    // Bearing off in a race with 6-6 already rolled: no setting is better, so the cards are kept.
    const fine = scenario({
      player: 'white',
      dice: [6, 6],
      white: { 6: 4, 5: 4 },
      black: { 19: 2 },
      hands: { white: ['5H', '6H', '7H', '8H', '9H'] },
    });
    expect(planMove(getObservation(fine, 'white'))?.action.type).toBe('move-checker');
  });

  it('beats the basic bot clearly over alternating seats', () => {
    let wins = 0;
    const games = 24;
    for (let g = 0; g < games; g++) {
      let state = createGame({ seed: `planner-${g}` });
      const side: PlayerId = g % 2 === 0 ? 'white' : 'black';
      const other: PlayerId = side === 'white' ? 'black' : 'white';
      const bots = { [side]: createBot(side, `p${g}`, 'planner'), [other]: createBot(other, `b${g}`, 'basic') } as Record<PlayerId, ReturnType<typeof createBot>>;
      while (state.phase.kind !== 'finished') {
        const actor = getLegalActions(state)[0]!.player;
        state = apply(state, chooseBotAction(bots[actor], getObservation(state, actor)));
      }
      if (state.phase.winner === side) wins++;
    }
    expect(wins / games).toBeGreaterThan(0.7);
  }, 60_000);
});
