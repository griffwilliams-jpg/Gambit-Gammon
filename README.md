# Gambit Gammon

A backgammon and poker game with collectible Jinn and a magical marketplace. Risking a checker can earn Dinars for a lamp, but being hit still costs board position and cards.

**Current rules: v0.4 — the Dinar-funded Jinn Bazaar.** The current default awards +1 Dinar for hitting and +2 for being hit. The Bazaar replaces additional free lamps from doubles. Its prices and rewards are provisional balance values, and the remaining shop rules were settled on 26 October 2026.

**Current build status:** engine foundations only. A headless TypeScript engine plays standard backgammon from the opening contest to bearing off, with seeded dice, legal-action generation, save/load and replay. There is no interface, and no cards, poker powers, Dinars, Bazaar or Jinn are implemented yet. No balance simulation has run.

## Running and testing

You need Node.js 20 or later (tested with Node 22.18).

```bash
npm install
```

```bash
npm run check
```

`npm run check` runs the type check, the test suite and the build in that order, and stops at the first failure. Each step also runs on its own:

| Command | What it does |
| --- | --- |
| `npm run typecheck` | Strict TypeScript check of the engine and tests. |
| `npm test` | Runs the Vitest suite once, including 200 seeded random games to completion. |
| `npm run test:watch` | Reruns tests as you edit. |
| `npm run build` | Compiles the engine to `dist/` with type declarations. The build has no DOM or Node types, so engine code cannot depend on a renderer or the browser. |

### What the engine does now

The public interface lives in `src/engine/index.ts`:

- `createGame({ seed })` sets up the standard position with 15 individually identified checkers per player and starts the opening contest.
- `getLegalActions(state, player?)` lists every legal action. Moves name the exact checker, source, destination and die.
- `applyAction(state, action)` returns a new state and an ordered list of events. Invalid, stale or out-of-turn actions are rejected and the original state, including its random state, is returned untouched.
- `getObservation(state, viewer)` is what a player or interface may see. It never contains the match seed or random state.
- `saveGame` / `loadGame` and `createReplay` / `runReplay` serialise games with the ruleset identity and version. Loading re-derives the state from the seed and action log and refuses saves that disagree, as well as any file from another rules version such as v0.3.

Each player rolls one die in the opening contest, ties are rerolled, and the higher roller moves first using both dice. Movement follows normal blocked-point, hit, bar-entry and bearing-off rules. The engine searches whole move sequences so it never offers a move that would stop a later die being used, and it applies the higher-die rule when only one of two different dice can be played. A blocked turn ends with an explicit `end-turn` action.

### Not built yet

Cards, poker powers, the opening 6-and-1 card exchange, hit card rewards, Dinars, the Bazaar, Jinn and any interface. The rules configuration records the v0.4 economy and Bazaar values marked `provisional`, but nothing reads them yet. The open shop questions in [open decisions](docs/open-decisions.md) are still open.

## Start here

- [Current game rules](docs/rules.md): board, cards, powers, Dinars, Bazaar, doubles and all twelve Jinn.
- [Agreed decisions and history](docs/agreed-decisions.md): current authority and the retained development-planning decisions.
- [Remaining decisions](docs/open-decisions.md): exact shop rules needed before implementation.
- [Jinn design](docs/jinn-design.md): approved roster, retained activations and future candidates.
- [Development and testing plan](docs/development-plan.md): architecture, staged work, Bazaar assessment and v0.3 comparisons.
- [Visual direction](docs/design-direction.md): original pixel art, board, lamps and Bazaar presentation.
- [Original references](reference/README.md): preserved source JSON and rulebook.

The existing version-specific rules and decisions files have been renamed to stable filenames rather than adding a separate experiment document. Older v0.3 rules remain available through [Git history](https://github.com/griffwilliams-jpg/Gambit-Gammon/tree/a67d4902b2424491bb556ec60a8089651f88f16c) and form the historical testing control; v0.4 is now the main direction.

## Layout

```text
docs/       Current rules, decisions, design and development plan
reference/  Untouched original material
src/engine/ Headless rules engine (no rendering code)
tests/      Vitest and fast-check tests, including seeded random games
assets/     Reserved for original or appropriately licensed art and sound
```

The approved implementation direction is a headless TypeScript engine with Phaser/Vite presentation, reproducible randomness, legal actions, saves/replay and local computer opponents. The engine, tests and build pipeline exist; Phaser/Vite presentation has not been added.

Work through the remaining rule details with Griff before implementing the Bazaar. Dinars are an in-game resource; no real-money feature or monetisation model has been specified.
