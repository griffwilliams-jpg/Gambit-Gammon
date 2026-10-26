# Gambit Gammon

A backgammon and poker game with collectible Jinn and a magical marketplace. Risking a checker can earn Dinars for a lamp, but being hit still costs board position and cards.

**Current rules: v0.4 — the Dinar-funded Jinn Bazaar.** The current default awards +1 Dinar for hitting and +2 for being hit. The Bazaar replaces additional free lamps from doubles. Its prices and rewards are provisional balance values, and some shop rules still need decisions.

**Current build status:** documentation only. There is no playable game, implemented economy or completed balance simulation yet. This update does not implement game code.

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
src/        Reserved for future engine and interface code
tests/      Reserved for future tests and simulations
assets/     Reserved for original or appropriately licensed art and sound
```

The approved implementation direction is a headless TypeScript engine with Phaser/Vite presentation, reproducible randomness, legal actions, saves/replay and local computer opponents. No dependencies or build pipeline have been installed in this repository.

Work through the remaining rule details with Griff before implementing the Bazaar. Dinars are an in-game resource; no real-money feature or monetisation model has been specified.
