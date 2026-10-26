# Remaining decisions — current v0.4 rules

v0.4 is now the current game direction, not a pending experiment. The agreed +1/+2 Dinar economy, three-turn Bazaar cadence and 4/7/12 lamp prices are provisional parameters to test. They are not reasons to erase accepted rules or substitute v0.3 as the default.

Read [current rules](rules.md) and [the decision history](agreed-decisions.md) first. No values below have been silently filled in, and no code is authorised by this documentation request.

## Bazaar specifications needed before implementation

| ID | Decision needed | Why it changes gameplay |
| --- | --- | --- |
| B01 | Initial Dinar balance. | Starting purchasing power has not been specified; a starting grant must not be invented. |
| B02 | Generation weights for the three lamp offers; guarantees/duplicates and private/shared stock. | The count and rotating-lamp model are resolved. Do not silently choose probabilities or assume a guaranteed affordable tier. |
| B03 | Paid-refresh price, refresh limit, treatment of sold slots and whether one player's refresh affects the other. | Refreshing offered lamp types is agreed; it does not authorise rerolling a purchased/revealed Jinn. |
| B04 | Exact end-turn ordering of the eligible visit, cleanup, reveals/equipment and handover. | Visits after completed own turns 3/6/9, including bonus and blocked turns, are agreed. Only the detailed event queue remains to specify. |
| B05 | Purchases per visit; optional visits; carry-over/reset of offers; purchase/reveal/equip timing; replacement/release and any refund policy. | Determines interruption cost, spending speed and usefulness once three slots are full. No resale or release refund is currently specified. |
| B06 — resolved | Royal is 75% Uncommon / 25% Legendary, excluding Common. | Retain uniform eligible-Jinn selection and renormalisation within those two tiers. These are provisional balance values; the choice itself is settled. |
| B07 | Free-refresh token capacity, stacking, expiry and consumption; cumulative counter reset; simultaneous reward order. | Exact behaviour of repeated two-charge rewards is not specified. A non-double still breaks streak rather than erasing accumulated charge. |
| B08 | Purchased-Copper upgrade: whether Copper price is paid; eligible purchase; stacking/expiry/consumption; interaction with already-purchased lamps. | The old v0.3 free-lamp carry rule does not define this new purchase benefit. No retroactive reroll or upgrade is approved. |
| B09 | Discount stacking, expiry, consumption order and interaction with Copper upgrades. | The next-lamp discount is already 3 Dinars with a minimum final price of 1; do not invent the remaining benefit-combination rules. |
| B10 | Atomic order for a hit's Dinar credits, ordinary card reward, forced discard, replacement effects and slot-ordered Jinn triggers. | Keeps one real hit to one Dinar reward per recipient and prevents duplicated rewards during effect resolution. |

These questions must be resolved as a coherent purchase/turn model, not independently guessed by coding agents.

## Retained low-level rule specifications

- Define precise poker evaluator predicates for five-card overlaps and Mazin's virtual card substitution, preserving selected-subset choice, Ace-low straights and no wrapping.
- Define shielded-blot destination legality and shield expiry/cooldown boundaries in testable examples, including bonus turns and no eligible Malik target.
- Define card draw/reveal shortfalls, temporary card zones and simultaneous card awards/discards; Basim's unchosen card is already agreed to go to discard.
- Specify target selection when a checker is barred or borne off, without changing the agreed persistent Amira/Rakhim targets or next-own-turn retargeting.
- Remove the obsolete undefined 'river' terminology from executable design unless Griff defines an actual separate mechanic; do not change the historical JSON.
- Encode standard mandatory dice usage and bearing-off examples with powers. These constraints are agreed rules to formalise, not optional new mechanics.

Bazaar choices now resolved: three random lamp offers; refresh changes available lamp types; visits after own turns 3/6/9 including completed bonus and blocked turns; Royal 75% Uncommon / 25% Legendary; next-lamp discount of 3 Dinars with a 1-Dinar minimum. Stock-generation probabilities and benefit combinations are not resolved by those choices.

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
