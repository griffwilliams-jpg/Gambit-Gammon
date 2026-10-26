# Gambit Gammon — development and balance plan

## Current direction and actual status

The main rules are [v0.4 with the Jinn Bazaar](rules.md), promoted by Griff on 26 October 2026. Economy B (+1 Dinar for hitting, +2 for being hit) is the provisional default. Historical v0.3 is the control for later comparisons, not an alternative current default.

Royal Lamps currently use 75% Uncommon / 25% Legendary odds. Players start with 0 Dinars alongside their free lamp. Each visit offers one guaranteed Copper and two independent lamp-type draws at 60% Copper / 30% Enchanted / 10% Royal. Paid refreshes cost 1 Dinar; earned refreshes are free. These stock weights differ from Jinn rarity odds inside a lamp. The weights, price and 3-Dinar next-lamp discount are provisional parameters to test, not unmade decisions. Stock is private, with three fresh offers each visit. Buy any affordable offers; bought offers disappear and a refresh regenerates all three slots. Reveal/equip immediately using replace-or-release. Bank every earned benefit until spent, with at most one upgrade and one discount per purchase. Upgrade pricing, benefit consumption and the end-turn order were settled as B03–B10 in [agreed decisions](agreed-decisions.md).

A playable v1 now exists, with the engine, Bazaar, a basic computer player and a placeholder-art browser interface (see the README). No AI benchmark, balance simulation or human playtest has been completed. The details the engine had to choose are listed in [implementation assumptions](implementation-assumptions.md).

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
5. **Refreshing expands purchase opportunities:** private stock resets each visit to one guaranteed Copper and two independent 60%/30%/10% lamp-type draws. Players may buy any affordable offers; bought slots disappear until a full three-slot refresh or the next visit. A paid refresh costs 1 Dinar; earned refreshes are free. Measure purchases and stock searches across repeated refreshes. Mystery Jinn content does not imply permission to reroll a revealed purchase.
6. **Banked benefits and purchase ordering:** every earned refresh, upgrade and discount banks until spent. At most one upgrade and one discount apply per purchase; additional uses remain banked. The discount is 3 Dinars with a minimum final price of 1. Define upgraded Copper pricing and benefit selection/consumption order. Measure accumulated benefits and spending bursts; do not import the old free-lamp upgrade behaviour or apply benefits retroactively.
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
- Bazaar visits, purchase opportunities, unaffordable visits, affordable visits voluntarily skipped and time from earning money to being able to spend it. Include the effect of starting at 0 Dinars, the guaranteed Copper offer and the 1-Dinar cost of a paid refresh.
- Free refreshes, upgrades and discounts earned, used and left banked; no expiry is approved. Track combined upgrade/discount purchases after pricing and consumption order are agreed.
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
