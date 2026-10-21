# Decisions needed before coding

This register separates missing historical detail from new suggestions. The earlier assistant replies are unavailable, so none of the options below should be treated as previously approved.

| ID | Decision | Why it matters |
| --- | --- | --- |
| R01 | Recover or agree Caravan Exchange restrictions: point ownership, whole stacks, opposing stacks, empty points, bar/off exclusion, shields and marked checkers. | Only the same-quadrant whole-point exchange, including empty points, is confirmed. |
| R02 | Define bearing-off rules under reverse movement, exchange, Jinn and boosted dice above six. | Prevent illegal wins and inconsistent home-board checks. |
| R03 | Define “qualifying random doubles”, including Pair/Full/forced rerolls and an opening roll. | Power-created doubles grant four movements; lamp eligibility must depend on provenance. |
| R04 | Set cumulative charge thresholds, streak bonuses, reward timing and counter reset/carry rules. | No numerical v0.3 reward schedule is recoverable. |
| R05 | Define lamp reveal timing, collection/active capacity, duplicates and persistence scope. | “Persistent collectible” does not specify account-wide progression. |
| R06 | Decide Jinn activation rules, stacking and whether active Jinn consume the one-power limit. | Avoid accidental unlimited combinations. |
| R07 | Reconcile Flush shield duration and opponent-next-roll effects with cleanup. | The JSON has conflicting expiry statements. |
| R08 | Define High Card Boost's continuous move and intermediate landing rules. | It is unclear whether a boosted 7–12 move is atomic or split. |
| R09 | Specify standard bar entry, dice-use obligations, higher-die choice and doubles movement consumption under powers. | These are engine-critical legality rules. |
| R10 | Decide whether the two physical Joker cards remain, their wild-card substitution rules and bar-override movement cost. | Jinn adoption does not explicitly remove these cards. |
| R11 | Define hand overflow, acquisition timing, insufficient discard/draw handling and reshuffling. | Avoid card loss, duplication and stalled turns. |
| R12 | Define the “river” or remove its refresh flag in a new version. | The original JSON says river_refresh=end_of_turn but does not define a river. |
| R13 | Define exact card subsets/hand sizes, Ace-low straights, Joker legality and power selection. | Detecting a best poker hand does not establish which power the player must play. |
| R14 | Decide extra-turn chaining, lamp rewards and victory timing. | Royal Flush can affect both pacing and reward accounting. |
| R15 | Define target identity and effect precedence for hits, shields, exchanges and Jinn bonuses. | Persistent effects must follow a clear object or owner. |

## Suggested next discussion

Agree R01–R04 first, then settle Jinn capacity and timing, then the remaining power/turn conflicts. After that, produce an approved, versioned rules specification and examples before starting implementation. This order is a proposal.

## Source limitation

The recovered user messages include “subject to the restrictions discussed” and acceptance of earlier suggestions. Those assistant suggestions cannot currently be read. If Griff has a saved copy, reconcile it with this register rather than inventing a reconstruction.
