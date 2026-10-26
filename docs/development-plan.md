# Gambit Gammon — development and balance plan

## Current direction and actual status

The main rules are [v0.4 with the Jinn Bazaar](rules.md), promoted by Griff on 26 October 2026. Economy B (+1 Dinar for hitting, +2 for being hit) is the provisional default. Historical v0.3 is the control for later comparisons, not an alternative current default.

Royal Lamps currently use 75% Uncommon / 25% Legendary odds. Each visit stocks three random mystery lamps; the exact stock weights and refresh/purchase semantics are still to be agreed. The Royal weights and 3-Dinar next-lamp discount are provisional parameters to test, not unmade decisions.

The repository contains documentation and reserved directories. No game engine, Bazaar code, AI benchmark, UI prototype or balance simulations have been completed. This change updates existing documents only. Resolve [remaining shop specifications](open-decisions.md) before implementing the economy.

## Architecture retained from the approved development plan

Use one project with a deterministic, headless TypeScript rules engine and a Phaser 4.2.1/Vite presentation. Keep engine, interface, computer-player and simulation modules separate. Native HTML menus and accessible actions submit the same validated commands as canvas interactions.

Expose createGame, getObservation, getLegalActions, applyAction, save/load and replay. Record checker/card identity, original and effective dice, turn/phase, random state, Jinn targets/cooldowns, once-per-match usage and ordered events. For v0.4, also record Dinar balances, the personal-turn visit clock, shop/offer state and pending Bazaar benefits once their rules have been agreed.

Invalid/stale commands must change neither state nor randomness. Serialize ruleset identity/version with saves and replays. Never load a historical v0.3 save as v0.4, infer new money from an old lamp counter, or grant both versions' doubles rewards. Keep computer players' random choices separate from game randomness; cosmetic animation must not determine results.

Use versioned configurations to test v0.3 and v0.4 through the same core backgammon engine, poker powers, twelve-Jinn roster and underlying move validator. The only intentional comparison differences are specified acquisition/economy rules and their consequences. The v0.3 control needs the approved planning clarifications in [the decision history](agreed-decisions.md), not just the older incomplete draft.

Retain desktop/tablet landscape, human-versus-local-AI and local two-player play as the first-release audience. Phone layouts, online multiplayer, account progression and native packaging remain later work. No language-model service is required to play the shipped game.

## What the Bazaar may improve

- Capture and exposure become two-sided resource decisions. A positional setback can finance recovery while still costing bar-entry tempo and potentially a card.
- Saving for a lamp adds a visible medium-term goal, and optional shopping may let players shape a build more deliberately than waiting for free lamps.
- A periodic Bazaar provides a natural presentation moment for mystery lamps, replacement decisions and Jinn personalities.
- The same economy can support aggressive, cautious and opportunistic styles if the positional cost of being hit remains meaningful.

These are design hypotheses, not measured improvements.

## Risks and logical gaps

1. **Repeat-hit farming:** repeatedly exposing, hitting and re-entering one checker may create more useful lamp income than advancing. Track each checker across turns; repeated hits alone do not prove a strategy is dominant.
2. **Positive-sum money creation:** every hit creates 3 Dinars under B (2 under A and 4 under C). A/B/C therefore change total money supply as well as compensation for risk. Report both effects rather than attributing all differences to risk preference.
3. **Mutual prolonging:** both players may benefit from a long capture loop. Test whether a rational opponent can refuse an avoidable hit or race ahead. Agents must obey compulsory dice usage and cannot pass a legal required move just to optimise the economy.
4. **Indirect card/Jinn amplification:** Hadi, Rakhim and Basim can reward captures without directly awarding Dinars. Extra cards can create more reverse moves, hits or turns. Qamar, Sahira and Mazin may alter high-power frequency. Log the full chain, not just Dinars credited.
5. **Rotating stock needs generation rules:** each visit now offers three random mystery lamps and refreshes change the offered lamp types. Define generation weights, tier guarantees and sold-slot handling before implementation. Mystery Jinn content does not imply permission to reroll a revealed purchase.
6. **Purchase-benefit ordering:** the three-streak discount is now 3 Dinars off the next lamp, minimum final price 1. Define its stacking, expiry and consumption order with the Copper upgrade. Do not import the old free-lamp upgrade behaviour or apply benefits retroactively.
7. **Timing and full slots:** a player may earn enough money while the Bazaar is closed, lose before the next visit, or find that a fourth lamp has little replacement value. Visits now follow completed own turns 3/6/9, including bonus and blocked turns. Measure how that access pattern affects saving, buying and releasing, and specify the remaining end-turn event order.
8. **Collection is not exclusively passive:** the retained roster includes activated and once-per-match abilities. The Bazaar must not silently convert all twelve Jinn to passive-only effects or reset spent abilities through purchases.

Illustrative arithmetic, not a simulation result: under B, two hits received award 4 Dinars, enough for a base-price Copper Lamp; four hits made award the same amount. That alone says nothing about which position wins, whether the next visit arrives in time or whether the replacement Jinn helps.

## Reproducible comparisons

Start only after the shared engine is reliable and every open shop rule used by a configuration is explicitly resolved and versioned.

| Configuration | Acquisition system | Hit income: hitter / hit player |
| --- | --- | --- |
| Historical v0.3 control | Free lamps from qualifying doubles under the reconciled v0.3 rules | No Dinars or Bazaar |
| Current v0.4 B | Bazaar purchases; doubles give Bazaar benefits | +1 / +2 |
| v0.4 A comparison | Identical shop rules, prices and Jinn to B | +1 / +1 |
| v0.4 C comparison | Identical shop rules, prices and Jinn to B | +1 / +3 |

Fix engine, rules/config hash, bot version/style and seed list. Pair matches with the same seed and swapped seats/starting advantage across configurations. Use separate reproducible streams for dice, deck, lamps, forced discards and bot choices so cosmetic or strategy randomness cannot alter gameplay draws. Matched seeds reduce noise; they do not guarantee identical paths after strategies and random consumption diverge.

Compare conventional backgammon, aggressive capture-hunting, risk-taking, defensive and economy-optimising opponents in a cross-play matrix. Include a deliberately exploit-seeking repeated-checker exposure policy. Train/tune each policy with a fixed equal budget per ruleset, then evaluate on held-out seeds; also run frozen policies to expose changes without adaptation. A farming policy beating a weak random opponent is not evidence of dominance.

Test fixed starting positions and existing Jinn combinations as well as full matches with random lamps. Compare rules with starting Jinn held constant where possible. Run Jinn-on/off diagnostic configurations only as labelled analyses, never as silent current-rule changes. If A/B/C differ, separately investigate money supply versus reward distribution before changing rewards or prices.

### Measurements

- Match turns and duration; completion, deadlock and turn-cap rates; first-player advantage.
- Hits made/received, checker exposure and bar/re-entry delays; per-checker repeated-hit sequences and changes in pip distance.
- Dinars earned, spent and unspent, purchases and purchase timing by lamp type, and the rarity of the Jinn actually revealed.
- Bazaar visits, purchase opportunities, unaffordable visits, affordable visits voluntarily skipped and time from earning money to being able to spend it.
- Free refreshes, upgrades and discounts earned/used/expired once their semantics are defined.
- Card draws/discards, power use, Jinn acquisition/activation, replacement and release when all slots are full.
- Outcomes by opponent strength, style, seat, starting position and resource/position deficit before a possible comeback.
- Apparent farming episodes, prolonged loops, their currency yield, positional cost and eventual result against responsive opponents.

Report paired outcome differences and uncertainty/confidence intervals, not only raw win rates. Separate selection effects: winners may have more purchases because they survived longer; late powerful Jinn may be acquired from already favourable positions. Use pre-acquisition position, turn and opponent/style controls and controlled diagnostic matches before making causal claims.

A human playtest should compare decision interest, perceived fairness, clarity of being rewarded when hit, shopping interruption and satisfaction of reveals. Simulation alone cannot establish whether the game is more engaging.

### Test gates and safeguards

Use Vitest for scenario tests, fast-check for state/action invariants and Playwright for later UI journeys. Add economy tests for one successful hit producing one credit to each recipient, unsuccessful/shielded hits producing no currency, integer balances, no unaffordable purchases and no duplicated spend on a repeated command. Test all bonus-consumption and rarity-fallback boundaries after the outstanding rules are agreed.

Start a fixed 200-game relevant-change smoke suite, then 10,000-game milestone comparisons with swapped seats and archived seeds/replays. Cap diagnostic matches at 2,000 turns and report them as inconclusive; this is a simulator guard, not a new live-game draw rule. Preserve failing traces and never declare a capped game a win.

Do not add diminishing repeated-hit income, earning caps or new movement-loop restrictions in the first comparison. If an exploit remains profitable against strong responsive policies on held-out seeds, document the evidence and propose one safeguard at a time for Griff to approve, then rerun the same evaluation. Such safeguards are not current game rules.

## Development sequence and collaboration

1. Reconcile the current documentation and settle the outstanding Bazaar model, prices/benefit semantics and exact turn order. Preserve original references.
2. Specify versioned machine-readable rules and examples; set up TypeScript contracts, seeded randomness, save/replay and automated checks.
3. Implement and test standard backgammon; introduce a seeded test player immediately, including 10,000-game invariant checks.
4. Add card economy/evaluation, each poker power and the twelve Jinn with scenario and interaction tests.
5. Establish a reproducible historical v0.3 control and stronger fair-information strategic opponents.
6. After Griff reviews the unresolved details and approves the coding step, implement configurable v0.4 Dinars/Bazaar acquisition in the shared engine. Run B/A/C cross-play without automatic safeguards or extra Jinn.
7. Build the minimal playable interface, then the approved original pixel-art presentation; test actual mouse, keyboard and tablet-touch journeys.
8. Compare balance and player experience, agree any changes, and prepare a versioned browser release/deployment for approval.

Use one integration owner, separate contributor branches/worktrees, one canonical rules source, issue-linked pull requests and passing type checks/tests/build before merge. Keep Todo/In progress/Review/Done tracking, and include seed, rules version and replay in bug reports. Independent reviewers must not silently invent mechanics or weaken acceptance tests.

The approved AI collaboration direction uses Codex for integration/engine work, Claude for independent tests/refactoring/UI work where suitable, and Gemini for independent review and test ideas. Run the controlled same-task, same-commit comparison only with verified available personal clients; it has not run. Work-provided Claude credits require employer permission irrespective of expiry. The current request does not install clients, call other models or implement any code.

## Recommendation

Proceed with v0.4 as the current design, retaining v0.3 in history as the evaluation control. Build the shared reliable engine first and resolve the remaining shop semantics before the Bazaar coding step. Parallel configurable rulesets are useful for evidence; a separate engine or a duplicated game implementation is not justified. Keep the first economy comparison to the existing twelve Jinn and B/A/C rewards so its results remain interpretable.
