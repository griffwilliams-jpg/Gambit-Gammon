# Gambit Gammon — agreed decisions

## Current authority

**v0.4 Bazaar economy is the current game direction, approved by Griff on 26 October 2026.** The current authoritative rules are [rules.md](rules.md). This existing decisions document has been renamed from its v0.3-specific filename; it has not been duplicated as a separate experiment document.

Read current rules before older sources. Unresolved items in [open-decisions.md](open-decisions.md) remain unresolved; numerical parameters labelled provisional have not been proven balanced. Historical copies must not override current decisions.

## 26 October 2026: Bazaar promoted to the main rules

Griff initially supplied a v0.4 economy experiment, then directed that existing documents be updated and finally instructed: **“no just make this the rules of the game”.** That final direction promotes the Bazaar to current rules rather than leaving it as an optional experimental replacement. It does not approve unspecified values, new Jinn, game code or deployment.

- Current hit rewards: hitter +1 Dinar, hit player +2 Dinars, alongside the original hit/bar/card consequences.
- Bazaar after completed own turns 3, 6, 9 and so on; completed bonus and blocked turns count. Each visit has three randomly stocked mystery lamps; refreshing changes the available lamp types. Copper costs 4, Enchanted 7 and Royal 12 Dinars. Copper and Enchanted keep their existing rarity weights; Royal is 75% Uncommon and 25% Legendary, with no Common outcomes.
- Keep the free starting lamp, three equipped Jinn, existing twelve-Jinn roster, duplicate restrictions and once-per-match tracking.
- Replace doubles' additional free lamps: two cumulative qualifying doubles give a free Bazaar refresh; two consecutive qualifying doubles upgrade the next purchased Copper Lamp; three consecutive qualifying doubles give 3 Dinars off the next lamp, with a minimum final price of 1 Dinar.
- Stock-generation probabilities, refresh price and sold-slot behaviour, benefit stacking/expiry/consumption and the exact end-turn queue must be defined before implementation. Do not reopen the already selected three offers, post-turn cadence, Royal weights or 3-Dinar discount as though no choice was made.
- Economy A (+1/+1) and C (+1/+3) remain test configurations. Economy B (+1/+2) is current. Do not add anti-farming restrictions or economy-focused Jinn without reviewing evidence and agreeing changes.
- Keep v0.3 as a historical simulation control, not the live default. Preserve the original v0.2 reference files byte-for-byte.
- This request changes documentation only; no game engine, simulations, purchases or Bazaar UI have been implemented.

## 26 October 2026: Bazaar details selected

Griff explicitly selected the following options during the rules discussion:

| Topic | Accepted choice |
| --- | --- |
| Stock model | Three randomly stocked mystery lamps per visit; refreshing changes the available lamp types. |
| Visit timing | After own turns 3, 6, 9 and so on; completed bonus turns and blocked turns count. |
| Royal odds | 75% Uncommon, 25% Legendary; no Common Jinn. Provisional balance values. |
| Three-streak discount | 3 Dinars off the next lamp purchase, minimum final price 1 Dinar. Provisional balance values. |

Only these choices are resolved by this decision. Stock weights/guarantees, paid-refresh cost, purchase/restocking behaviour and benefit stacking/expiry remain open. The current documentation is ahead of the initial Claude audit baseline at commit e8c180f; an audit of that frozen commit must account for this later decision.

## Retained from the approved v0.3 development-planning session

The following decisions remain in force wherever the Bazaar does not explicitly supersede them:

| Topic | Accepted decision |
| --- | --- |
| Opening | Standard single-die opening contest; repeat ties; starter uses those two dice; opening 6-and-1 can trigger its card exchange. |
| Roll rewards | Use only the initial roll each turn; subsequent rerolls/value-setting affect movement, not reward qualification. Natural doubles modified away retain their initial rewards. |
| Movement doubles | Final effective doubles grant four movements, including power-created doubles. |
| Reverse home lock | Starts after that player actually bears off their first checker. |
| Amira/Rakhim | Persistent checker targets; retarget at the next own turn after their checker bears off. |
| Caravan Exchange | Equal-sized enchanted stacks may swap when it has a gameplay effect; preserve checker identities. |
| Poker selection | Choose any qualifying power for the selected subset; Ace-low straights allowed, no wrapping. |
| Malik | A use on own turn 1 skips turns 2 and 3; ready on turn 4. |
| Basim | Discard the unchosen revealed card. |
| New Jinn | Effective from the following turn, including a Royal Flush bonus turn; no retroactive effects. |
| Once-per-match use | Does not reset through replacement and reacquisition. |
| Lamp rarity selection | Uniform within an eligible tier; renormalise over remaining eligible tiers if a tier is exhausted. |
| Release audience | Desktop/tablet landscape, human versus local AI and local two-player play. |
| Engineering | Independent deterministic TypeScript engine, Phaser 4.2.1/Vite interface, versioned saves/replay, legal-action API, fair-information bots and automated tests. These remain an approved implementation direction, not completed work. |

The v0.3 rule that carried an off-cycle Enchanted benefit to the next **charge-earned free lamp** is historical only. v0.4 instead upgrades a **purchased Copper Lamp**, with its own outstanding consumption rules. The v0.3 third-streak extra free lamp is likewise replaced by the next-purchase discount.

## Historical reference and control

- [v0.3 repository snapshot before these changes](https://github.com/griffwilliams-jpg/Gambit-Gammon/tree/a67d4902b2424491bb556ec60a8089651f88f16c).
- [Original v0.3 consolidated document](https://github.com/griffwilliams-jpg/Gambit-Gammon/blob/a67d4902b2424491bb556ec60a8089651f88f16c/docs/v0.3-agreed-decisions.md).
- [Untouched original reference files](../reference/README.md), including JSON labelled v0.2 with Jokers.

The frozen Git snapshot predates the later planning clarifications recorded above. A future v0.3 control must include those already approved clarifications and its historical two-charge free lamps, carried upgrade and third-streak standard bonus lamp. Do not call the stale snapshot alone a fully reconciled executable control, and do not include Dinar rewards in v0.3.

No simulation results, model comparison or balance claims have been established by this documentation update.
