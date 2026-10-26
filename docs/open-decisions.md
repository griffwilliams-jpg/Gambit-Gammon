# Remaining decisions — current v0.4 rules

v0.4 is now the current game direction, not a pending experiment. The agreed +1/+2 Dinar economy, three-turn Bazaar cadence and 4/7/12 lamp prices are provisional parameters to test. They are not reasons to erase accepted rules or substitute v0.3 as the default.

Read [current rules](rules.md) and [the decision history](agreed-decisions.md) first. Griff settled B03–B10 on 26 October 2026 and approved building a v1. No values below have been silently filled in.

## Bazaar specifications needed before implementation

| ID | Decision needed | Why it changes gameplay |
| --- | --- | --- |
| B01 — resolved | Each player starts with 0 Dinars alongside their free starting lamp. | The first purchase must be earned through play. |
| B02 — resolved | Private stock for each player; three fresh offers every visit. A refresh regenerates all three slots. | Every fresh stock uses one guaranteed Copper plus two independent 60% Copper / 30% Enchanted / 10% Royal draws, including after purchases. |
| B03 — resolved | A banked free refresh is always used automatically before paying 1 Dinar. | Banked refreshes never expire, so paying while holding one gains nothing. |
| B04 — resolved | End of turn: Royal Flush declaration, played-card discard and end-turn Jinn effects, lamp opening/equipment, Bazaar visit, handover. A Royal Flush bonus turn starts after the visit. | Visits follow completed own turns 3/6/9, including bonus and blocked turns. |
| B05 — resolved | No refund or resale. Releasing or declining a Jinn returns nothing. | Keeps purchases meaningful and money supply unchanged. |
| B06 — resolved | Royal is 75% Uncommon / 25% Legendary, excluding Common. | Retain uniform eligible-Jinn selection and renormalisation within those two tiers. These are provisional balance values; the choice itself is settled. |
| B07 — resolved | Every second cumulative qualifying natural double banks a refresh; the counter resets after each award. Streak 2 banks an upgrade, streak 3 a discount, 4+ nothing extra yet. One roll may trigger several awards; all are banked. | A non-double breaks the streak, not cumulative charge or banked benefits. |
| B08 — resolved | An upgraded Copper keeps the Copper price (4) and opens with Enchanted odds. | Upgrades apply automatically to the next Copper bought. |
| B09 — resolved | Benefits apply automatically: upgrade to the next Copper, discount to the next lamp. Upgrade first, then 3 off with a 1-Dinar floor (upgraded Copper costs 1). Nothing is consumed unless the purchase completes. | At most one upgrade and one discount per purchase. |
| B10 — resolved | Hit order: checker to bar; Dinars (+1 hitter, +2 hit player); hitter draws one card; hit player discards one at random. Replacement Jinn effects change those steps as they happen; other Jinn triggers then run in slot order. | One real hit is one Dinar reward per recipient. |

All Bazaar specification questions are now resolved.

## Retained low-level rule specifications

- Define precise poker evaluator predicates for five-card overlaps and Mazin's virtual card substitution, preserving selected-subset choice, Ace-low straights and no wrapping.
- Define shielded-blot destination legality and shield expiry/cooldown boundaries in testable examples, including bonus turns and no eligible Malik target.
- Define card draw/reveal shortfalls, temporary card zones and simultaneous card awards/discards; Basim's unchosen card is already agreed to go to discard.
- Specify target selection when a checker is barred or borne off, without changing the agreed persistent Amira/Rakhim targets or next-own-turn retargeting.
- Remove the obsolete undefined 'river' terminology from executable design unless Griff defines an actual separate mechanic; do not change the historical JSON.
- Encode standard mandatory dice usage and bearing-off examples with powers. These constraints are agreed rules to formalise, not optional new mechanics.

Bazaar choices now resolved: 0 starting Dinars plus the free lamp; one guaranteed Copper and two independent 60% Copper / 30% Enchanted / 10% Royal offers; paid refreshes 1 Dinar, earned refreshes free; visits after own turns 3/6/9 including completed bonus and blocked turns; Royal contents 75% Uncommon / 25% Legendary; next-lamp discount of 3 Dinars with a 1-Dinar minimum. Private stock resets to three fresh offers each visit; players can buy any affordable offers, bought offers disappear and full refreshes regenerate all three slots. Purchases reveal/equip immediately using replace-or-release. Every earned benefit banks until spent; at most one upgrade and one discount apply per purchase. Upgrade pricing, benefit consumption, refresh selection, refunds, doubles counting, end-turn order and hit order were resolved as B03–B10 above.

Already resolved inherited rules: initial-roll-only rewards; standard opening; four movements from effective doubles; reverse-home lock after first bear-off; meaningful enchanted-stack exchanges; overlapping poker-power choice; Malik skipping two own turns; next-turn Jinn activation including bonus turns; Basim discarding his other card. See [agreed decisions](agreed-decisions.md).

## Balance questions: test before changing rules

- Does +2 for being hit create useful comeback choices or dominant repeat-hit farming? Compare current B with A (+1/+1), C (+1/+3) and v0.3 control.
- Does shopping every three personal turns arrive early/often enough to matter? How often can no useful lamp be afforded?
- Are 4/7/12 prices and existing rarity odds appropriate given actual hit rates and match length?
- Does the extra card lost on capture offset the defender's income? How does the result change against an opponent who refuses a favourable hit?
- Do capture/card Jinn indirectly dominate the economy without directly generating Dinars?
- Do three full Jinn slots make further purchases useful replacement choices or unwanted churn?
- Do economy-driven choices improve player engagement? Simulation proxies need human playtesting too.

Diminishing repeat-hit rewards, earning caps, new artificial-loop restrictions and the three future economy Jinn are possible later changes, not current safeguards or approved roster additions.
