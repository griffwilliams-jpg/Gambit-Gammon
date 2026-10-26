# Remaining decisions — current v0.4 rules

v0.4 is now the current game direction, not a pending experiment. The agreed +1/+2 Dinar economy, three-turn Bazaar cadence and 4/7/12 lamp prices are provisional parameters to test. They are not reasons to erase accepted rules or substitute v0.3 as the default.

Read [current rules](rules.md) and [the decision history](agreed-decisions.md) first. No values below have been silently filled in, and no code is authorised by this documentation request.

## Bazaar specifications needed before implementation

| ID | Decision needed | Why it changes gameplay |
| --- | --- | --- |
| B01 | Initial Dinar balance. | Starting purchasing power has not been specified; a starting grant must not be invented. |
| B02 | What is actually stocked: fixed lamp types, limited lamp offers, changing prices/conditions or something else; offer count, availability and whether stock is private/shared. | With the same unlimited fixed-price lamps, a refresh has no effect. The stock model must justify free-refresh rewards. |
| B03 | What a refresh changes; paid-refresh price, refresh limit and whether refreshing one player's stock affects the other. | A free refresh needs a defined normally available action and target. Do not assume it rerolls a purchased/revealed Jinn. |
| B04 | Visit timing before/after movement; first visit; whether completed bonus turns and forced-pass turns count towards the three-personal-turn clock. | Sets when money/Jinn become useful and whether extra turns or blocked entry accelerate shopping. |
| B05 | Purchases per visit; optional visits; carry-over/reset of offers; purchase/reveal/equip timing; replacement/release and any refund policy. | Determines interruption cost, spending speed and usefulness once three slots are full. No resale or release refund is currently specified. |
| B06 | Royal Lamp's allowed rare tier(s), probabilities and fallback. | 'Rare-tier' is not an existing rarity name; the roster has Common, Uncommon and Legendary. Do not assume Royal means guaranteed Legendary. |
| B07 | Free-refresh token capacity, stacking, expiry and consumption; cumulative counter reset; simultaneous reward order. | Exact behaviour of repeated two-charge rewards is not specified. A non-double still breaks streak rather than erasing accumulated charge. |
| B08 | Purchased-Copper upgrade: whether Copper price is paid; eligible purchase; stacking/expiry/consumption; interaction with already-purchased lamps. | The old v0.3 free-lamp carry rule does not define this new purchase benefit. No retroactive reroll or upgrade is approved. |
| B09 | Three-streak discount amount (fixed/percentage), eligible lamps, minimum price, stacking/expiry/consumption and order relative to upgrades. | 'Substantial' is not executable. Do not choose an amount or permit free purchases by assumption. |
| B10 | Atomic order for a hit's Dinar credits, ordinary card reward, forced discard, replacement effects and slot-ordered Jinn triggers. | Keeps one real hit to one Dinar reward per recipient and prevents duplicated rewards during effect resolution. |

These questions must be resolved as a coherent purchase/turn model, not independently guessed by coding agents.

## Retained low-level rule specifications

- Define precise poker evaluator predicates for five-card overlaps and Mazin's virtual card substitution, preserving selected-subset choice, Ace-low straights and no wrapping.
- Define shielded-blot destination legality and shield expiry/cooldown boundaries in testable examples, including bonus turns and no eligible Malik target.
- Define card draw/reveal shortfalls, temporary card zones and simultaneous card awards/discards; Basim's unchosen card is already agreed to go to discard.
- Specify target selection when a checker is barred or borne off, without changing the agreed persistent Amira/Rakhim targets or next-own-turn retargeting.
- Remove the obsolete undefined 'river' terminology from executable design unless Griff defines an actual separate mechanic; do not change the historical JSON.
- Encode standard mandatory dice usage and bearing-off examples with powers. These constraints are agreed rules to formalise, not optional new mechanics.

Already resolved: initial-roll-only rewards; standard opening; four movements from effective doubles; reverse-home lock after first bear-off; meaningful enchanted-stack exchanges; overlapping poker-power choice; Malik skipping two own turns; next-turn Jinn activation including bonus turns; Basim discarding his other card. See [agreed decisions](agreed-decisions.md).

## Balance questions: test before changing rules

- Does +2 for being hit create useful comeback choices or dominant repeat-hit farming? Compare current B with A (+1/+1), C (+1/+3) and v0.3 control.
- Does shopping every three personal turns arrive early/often enough to matter? How often can no useful lamp be afforded?
- Are 4/7/12 prices and existing rarity odds appropriate given actual hit rates and match length?
- Does the extra card lost on capture offset the defender's income? How does the result change against an opponent who refuses a favourable hit?
- Do capture/card Jinn indirectly dominate the economy without directly generating Dinars?
- Do three full Jinn slots make further purchases useful replacement choices or unwanted churn?
- Do economy-driven choices improve player engagement? Simulation proxies need human playtesting too.

Diminishing repeat-hit rewards, earning caps, new artificial-loop restrictions and the three future economy Jinn are possible later changes, not current safeguards or approved roster additions.
