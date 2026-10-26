# Gambit Gammon

A backgammon and poker game with collectible Jinn and a magical marketplace. Risking a checker can earn Dinars for a lamp, but being hit still costs board position and cards.

**Current rules: v0.4 — the Dinar-funded Jinn Bazaar.** The current default awards +1 Dinar for hitting and +2 for being hit. The Bazaar replaces additional free lamps from doubles. Its prices and rewards are provisional balance values, and the remaining shop rules were settled on 26 October 2026.

**Current build status:** playable v1 with placeholder art. You can play the full v0.4 rules in a browser, against the computer or with two players on one screen. That covers all ten poker powers, all twelve Jinn, Dinars and the Jinn Bazaar. The art is simple shapes in the approved palette, not the planned pixel art, and there is no sound. No balance simulation or human playtest has been run. Details the rules leave open are recorded for review in [implementation assumptions](docs/implementation-assumptions.md).

## Play it

You need Node.js 20 or later (tested with Node 22.18).

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints (normally http://localhost:5173). Adding `?seed=anything` to the address starts a reproducible game, which is useful for bug reports (`&mode=hot-seat` for two players, `&side=black` to play Onyx). Your game autosaves in the browser, and the menu can also download a save file and load it back.

- **Moving:** click a highlighted checker, then a green destination. Every legal move is also listed as a button, so you can play entirely by keyboard.
- **Powers:** your hand shows under the players. Poker powers appear as buttons before your first move; pick one, then pick how to use it.
- **Two players:** a "Pass to…" screen hides each player's cards and shop stock between turns.

## Running the checks

```bash
npm run check
```

That runs the type check, the tests and the build, stopping at the first failure. Each step also runs on its own:

| Command | What it does |
| --- | --- |
| `npm run typecheck` | Strict TypeScript check of the engine, computer player, interface and tests. |
| `npm test` | Runs the Vitest suite once (about 100 tests, including 200 seeded random games and bot-vs-random games). |
| `npm run test:e2e` | Playwright browser tests: loading, the opening, computer turns, clicking moves on the board, keyboard use, two-player handover, autosave and the Bazaar. Uses your installed Google Chrome; without Chrome, run `npx playwright install chromium` once and set `PW_BROWSER=bundled`. |
| `npm run build` | Compiles the engine and computer player to `dist/` (with no DOM or Node types, so they can't depend on a browser), then builds the web game to `dist-web/`. |
| `npm run preview` | Serves the built web game. |

## How it fits together

- **`src/engine/`**: the rules, with no rendering. `createGame`, `getLegalActions`, `applyAction`, `getObservation`, save/load and replay. Every choice in a turn is an explicit decision answered by a legal action. Rejected or stale actions change neither the game nor its randomness. Dice, deck shuffles, forced discards, Bazaar stock and lamp contents each use their own seeded random stream. Saves and replays carry the ruleset version, and a v0.3 file is refused.
- **`src/ai/`**: the computer opponent. It decides only from what its player can see, and its own randomness is kept apart from the game's. It plans whole turns: it searches every legal sequence of moves for the dice using the engine's own rules, and plays a dice-changing or backward-move power only when the improvement is worth the cards. It beat the earlier move-by-move bot in 195 of 200 games. It is still not an expert player: it looks one turn ahead and doesn't weigh Dinars or the Bazaar.
- **`src/ui/`**: Phaser 4.2.1 draws the board, and plain HTML panels handle every decision, the Bazaar, the hand and the event log.

### Known gaps

- Placeholder art and no sound. The pixel-art Jinn, lamps and Bazaar merchant still need designing and approving.
- The computer player looks one turn ahead and ignores the economy when moving.
- Phone layouts, online play and the balance comparisons in the development plan are later work.

## Start here

- [Current game rules](docs/rules.md): board, cards, powers, Dinars, Bazaar, doubles and all twelve Jinn.
- [Agreed decisions and history](docs/agreed-decisions.md): current authority and the retained development-planning decisions.
- [Remaining decisions](docs/open-decisions.md): resolved shop rules and open balance questions.
- [Implementation assumptions](docs/implementation-assumptions.md): details the engine had to choose, for Griff to confirm or overrule.
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
src/ai/     Computer opponent
src/ui/     Browser game (Phaser board, HTML panels)
tests/      Vitest and fast-check tests, including seeded random games
assets/     Reserved for original or appropriately licensed art and sound
```

The approved implementation direction is a headless TypeScript engine with Phaser/Vite presentation, reproducible randomness, legal actions, saves/replay and local computer opponents. The engine, computer player, tests and a Phaser/Vite browser game now exist.

Work through the remaining rule details with Griff before implementing the Bazaar. Dinars are an in-game resource; no real-money feature or monetisation model has been specified.
