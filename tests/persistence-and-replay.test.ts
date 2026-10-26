import { describe, expect, it } from 'vitest';
import {
  createGame,
  createReplay,
  getLegalActions,
  loadGame,
  parseReplay,
  runReplay,
  saveGame,
  serialiseReplay,
} from '../src/engine/index.js';
import { rollDie, seedStream } from '../src/engine/rng.js';
import { apply, playOut, seededChooser } from './helpers.js';

describe('seeded randomness', () => {
  it('is reproducible and depends on the seed', () => {
    const sequence = (seed: string) => {
      let state = seedStream(seed, 'dice');
      return Array.from({ length: 20 }, () => {
        const roll = rollDie(state);
        state = roll.state;
        return roll.value;
      });
    };
    expect(sequence('a')).toEqual(sequence('a'));
    expect(sequence('a')).not.toEqual(sequence('b'));
  });

  it('produces fair-looking dice over many rolls', () => {
    let state = seedStream('fairness', 'dice');
    const counts = [0, 0, 0, 0, 0, 0];
    const n = 60_000;
    for (let i = 0; i < n; i++) {
      const roll = rollDie(state);
      state = roll.state;
      counts[roll.value - 1]! += 1;
    }
    // Chi-squared with 5 degrees of freedom; 20.5 is roughly p = 0.001.
    const expected = n / 6;
    const chi2 = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
    expect(chi2).toBeLessThan(20.5);
  });

  it('keeps streams independent by name', () => {
    expect(seedStream('x', 'dice')).not.toEqual(seedStream('x', 'deck'));
  });
});

describe('deterministic play, save/load and replay', () => {
  it('reproduces an identical game from the same seed and choices', () => {
    const a = playOut(createGame({ seed: 'repro' }), 11);
    const b = playOut(createGame({ seed: 'repro' }), 11);
    expect(a.phase.kind).toBe('finished');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = playOut(createGame({ seed: 'repro-other' }), 11);
    expect(JSON.stringify(c.actionLog)).not.toBe(JSON.stringify(a.actionLog));
  });

  it('continues identically after saving and loading mid-game', () => {
    const choose = seededChooser(5);
    let uninterrupted = createGame({ seed: 'save-mid' });
    let resumed = uninterrupted;
    for (let step = 0; uninterrupted.phase.kind !== 'finished'; step++) {
      const action = choose(getLegalActions(uninterrupted));
      uninterrupted = apply(uninterrupted, action);
      resumed = apply(step === 40 ? loadGame(saveGame(resumed)) : resumed, action);
      if (step === 40) expect(resumed.sequence).toBe(uninterrupted.sequence);
    }
    expect(JSON.stringify(loadGame(saveGame(resumed)))).toBe(JSON.stringify(uninterrupted));
  });

  it('restores the random state, so the next roll matches', () => {
    let state = playOut(createGame({ seed: 'next-roll' }), 2, 30);
    while (state.pending?.kind !== 'roll') state = playOut(state, 2, 1);
    const loaded = loadGame(saveGame(state));
    const roll = getLegalActions(state)[0]!;
    expect(apply(loaded, roll)).toEqual(apply(state, roll));
  });

  it('replays a complete game to the same final state and event stream', () => {
    const live = playOut(createGame({ seed: 'replay' }), 21);
    const replay = parseReplay(serialiseReplay(createReplay(live)));
    const { state, events } = runReplay(replay);
    expect(JSON.stringify(state)).toBe(JSON.stringify(live));
    expect(events).toHaveLength(live.actionLog.length);
    expect(events.flat().at(-1)).toMatchObject({ type: 'game-won' });
  });

  it('records ruleset identity in saves and replays', () => {
    const state = createGame({ seed: 'identity' });
    const save = JSON.parse(saveGame(state));
    expect(save).toMatchObject({ format: 'gambit-gammon-save', saveVersion: 1, rulesetId: 'gambit-gammon', rulesVersion: '0.4' });
    expect(createReplay(state)).toMatchObject({ rulesetId: 'gambit-gammon', rulesVersion: '0.4', seed: 'identity' });
  });

  it('refuses to load a save or replay from another rules version', () => {
    const state = createGame({ seed: 'v03' });
    const save = JSON.parse(saveGame(state));
    expect(() => loadGame(JSON.stringify({ ...save, rulesVersion: '0.3' }))).toThrow(/0\.3/);
    const replay = createReplay(state);
    expect(() => parseReplay(JSON.stringify({ ...replay, rulesVersion: '0.3' }))).toThrow(/0\.3/);
  });

  it('refuses a save whose state does not match its recorded actions', () => {
    const state = playOut(createGame({ seed: 'tamper' }), 4, 20);
    const save = JSON.parse(saveGame(state));
    save.state.checkers[0].location = { kind: 'off' };
    expect(() => loadGame(JSON.stringify(save))).toThrow(/does not match/);
    expect(() => loadGame('not json')).toThrow(/JSON/);
    expect(() => loadGame(JSON.stringify({ format: 'other' }))).toThrow(/save file/);
  });

  it('refuses a replay containing an illegal action', () => {
    const replay = createReplay(playOut(createGame({ seed: 'bad-replay' }), 9, 10));
    const actions = [...replay.actions];
    actions[3] = { type: 'end-turn', player: 'white', sequence: 3 };
    expect(() => runReplay({ ...replay, actions })).toThrow(/rejected/);
  });
});
