# Gambit Gammon

A backgammon game with poker-hand powers and collectible Jinn. The visual direction is pixel art with a Middle Eastern fantasy atmosphere.

**Current stage: v0.3 rules and design preparation.** This repository contains planning documents and preserved source material. There is no playable build yet. Resolve the open rules before implementing the engine.

## Start here

- [v0.3 rules draft](docs/rules-v0.3.md): confirmed changes and the v0.2 baseline.
- [Jinn design](docs/jinn-design.md): lamps, collectible modifiers and legacy ability candidates.
- [Open decisions](docs/open-decisions.md): missing restrictions, balance values and interactions to settle.
- [Visual and interaction direction](docs/design-direction.md).
- [Development plan](docs/development-plan.md): suggested implementation and player-testing sequence, pending approval.
- [Reference sources](reference/README.md): the untouched uploaded JSON and rulebook.

## Layout

```text
docs/       Rules, Jinn, design and planning documents
reference/  Original uploaded material; do not edit in place
src/        Reserved for the future game implementation
tests/      Reserved for future engine and simulation tests
assets/     Reserved for original or appropriately licensed game assets
```

The original JSON identifies itself as **v0.2 (with Jokers)**. It is a historical reference, not an executable v0.3 specification. The v0.3 draft distinguishes confirmed user decisions from retained baseline rules and unresolved details.

No framework, package dependencies, publishing pipeline, licence or monetisation model has been selected.
