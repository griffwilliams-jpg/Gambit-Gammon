# Proposed development sequence

This is a discussion plan, not approval to implement. The current deliverable is a documented starting point.

1. Settle the blocking rules in [open-decisions.md](open-decisions.md); write worked examples and an approved v0.3 specification.
2. Build a deterministic backgammon rules engine independently of the visual layer. Define state, legal actions and event records.
3. Verify board setup, bar priority, blocking, hits, compulsory dice use, doubles, bearing off and victory before adding powers.
4. Add poker-hand evaluation and one power at a time, testing each rule interaction and expiry boundary.
5. Add lamp accounting and Jinn with explicit roll provenance, effect order and collection rules.
6. Build a minimal playable interface, then develop the approved pixel-art direction.
7. Add automated player testing and balance reports once rules execution is reliable.

## AI player-testing direction

Griff asked whether AI can act as a player tester. A future engine should expose legal actions and structured observations so test players can choose moves without changing state directly.

Start with seeded random and simple heuristic players to detect illegal states and stalled turns. Later, compare stronger agents and selected language-model players. Retain seeds and action logs for reproducible bug reports.

Useful future measures include win rate by starting player, average game length, blocked turns, power/Jinn use, lamp frequency, and the win-rate impact of individual combinations. These are proposed measures; no simulations have run and no balance claims are established.

## Collaboration

Use this repository as the shared source of truth. Each later work package should identify the rules version, scope, acceptance examples and affected files. Review changes before combining model contributions. No cross-agent work or external model calls have been performed for this setup.

Select the implementation tools and model roles when that work is approved; the prior conversation did not establish a final stack or allocation.
