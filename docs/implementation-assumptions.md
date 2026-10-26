# Implementation assumptions for review

The rules and decision documents don't specify these details, so the engine had to choose an answer for each to run. They are **not** agreed rules. Each one is a single place in the code, so overruling one is a small change. Griff should confirm or overrule them; anything confirmed then moves into [rules.md](rules.md) and [agreed-decisions.md](agreed-decisions.md).

## Setup and cards

| # | Assumption | Where |
| --- | --- | --- |
| A1 | The free starting lamp uses Copper odds (70% Common, 25% Uncommon, 5% Legendary). The v0.3 decisions called these "standard lamp" odds. | `rules.ts` `lamps.startingLamp` |
| A2 | If both the draw pile and the discard pile are empty, a draw is skipped and logged as a shortfall. | `game.ts` `drawNow` |
| A3 | Cards locked for the turn are those gained from a hit: the normal capture card, Basim's kept card, and Hadi's and Rakhim's extra cards. Sirocco's, Qamar's and Noura's cards are not locked. | `game.ts` hit and draw tasks |
| A4 | The 6-and-1 exchange is offered only when the roller holds at least one card. An opening 6-1 offers it to the starter. | `game.ts` `exchange` task |

## Poker powers

| # | Assumption | Where |
| --- | --- | --- |
| P1 | Powers can only be played before the first checker movement of the turn. Royal Flush is declared only once no legal move remains, and declaring it ends the turn. | `moveActions` |
| P2 | High Card adds its boost to one remaining movement value and never creates extra movements. With doubles it boosts one of the four movements. The boosted value must have at least one legal move when the power is played. | `powerActions` |
| P3 | Two Pair needs two different ranks, so four of a kind is not also two pair. | `cards.ts` |
| P4 | Four of a Kind and Straight Flush can't "set" dice to the values they already show. | `powerActions` |
| P5 | Straight's forced reroll: on the opponent's next turn, after their roll rewards (and any 6-1 exchange), both of their dice are rerolled automatically. Their roll rewards still come from the initial roll. | `forced-reroll` task |
| P6 | A shielded blot blocks its point like a made point: the opponent cannot land on it. | `searchPosition` |
| P7 | Flush can shield any of your checkers on a point. Malik can shield only an exposed blot. | `powerActions`, `exposedCheckers` |
| P8 | Caravan Exchange counts as "meaningful" when the two points differ in stack size or in which checkers carry an enchantment (Amira, Rakhim or a shield). | `caravanPairs` |
| P9 | A move that only becomes legal through a backward option still counts towards compulsory dice use, so a player may have to move backwards to play every die. | `movement.ts` |

## Jinn

| # | Assumption | Where |
| --- | --- | --- |
| J1 | The duplicate rule applies per player, so both players may each have the same Jinn. | `drawJinn` exclusions |
| J2 | Hadi chooses a fresh mark at the start of each own turn. The mark is required whenever an opposing checker is on a point. | `startJinn` |
| J3 | Amira and Rakhim must choose a target when they have none, and may enchant the same checker. | `startJinn` |
| J4 | Amira's checker may make one backward move per turn. Its forward moves are unlimited. | `movement.ts` |
| J5 | Sahira and Malik are optional each time they are offered. Malik's rest count belongs to the player, not the Jinn instance. | `startJinn`, `malik` task |
| J6 | At a full hand, Basim's player discards first, then sees the two revealed cards. If only one card can be revealed, it is the only choice. | `basim-reveal` task |
| J7 | Mazin's wild card cannot copy another selected card exactly. The engine does not offer spending Mazin on a selection that already qualifies without him. | `powerSelections` |
| J8 | Noura's check runs after Malik's shield choice, before the Bazaar. | `endTurn` |
| J9 | A Jinn becomes active from the next turn number. So a Jinn bought at the end of your turn (Nahla, for example) already works during the opponent's next turn. | `equip` task |

## Bazaar

| # | Assumption | Where |
| --- | --- | --- |
| Z1 | The opponent never sees a player's stock. Dinars, equipped Jinn and banked benefits are public. | `getObservation` |
| Z2 | Each player's stock is cleared when they leave the Bazaar and at handover. | `bazaar-leave`, `handover` |
