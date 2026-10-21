# Gambit Gammon v0.3 — working rules draft

Status: design preparation; **not yet a complete implementation specification**.

## Evidence and precedence

The original uploaded JSON is `reference/gambit_gammon_rules(1).json`, version `0.2 (with Jokers)`. The original rulebook is preserved alongside it.

The recovered user messages in *Review Gambit Game Plan* confirm the changes below. Earlier assistant replies could not be recovered: the chat reader returned content-reference placeholders and the browser displayed “This response couldn't load”. A user message accepting suggestions therefore does not establish the unrecovered suggestions' exact wording, numbers or restrictions.

For this draft, explicit recovered v0.3 decisions take precedence over the v0.2 JSON. Other JSON rules remain a baseline for discussion. Unresolved details are listed in [open-decisions.md](open-decisions.md).

## Confirmed v0.3 decisions

1. Keep the original Gambit Gammon rulebook as the baseline while refining the game before coding.
2. Introduce collectible Jinn that persist and modify the game, inspired by Balatro's persistent Joker modifiers. Persistence across matches or runs is not established.
3. Each player starts with one free mystery Jinn lamp.
4. Earn additional lamps using cumulative doubles charges with streak bonuses. The exact thresholds and bonus schedule are not recoverable.
5. Dice powers may create doubles and grant four checker movements. Only qualifying random doubles earn lamps. The treatment of randomly rerolled dice remains unresolved.
6. Convert the original permanent doubles-streak powers into collectible Jinn abilities. Other removed bonuses may also be considered for Jinn.
7. Full House uses **Caravan Exchange**: exchange the contents of two points within the same six-point quadrant, including empty points, subject to restrictions discussed previously. Those restrictions are not available in the recovered record and must be recovered or agreed before implementation.

## Board and objective — v0.2 baseline

- Two players, 15 checkers each, a 24-point board, bar and bear-off area.
- Standard backgammon starting positions.
- Two six-sided dice.
- First player to bear off all their checkers wins.
- Apply power modifiers before validating backgammon move rules.
- At most one poker power per turn; no countering.

The phrase “standard backgammon” is not sufficient for an engine specification. Bar priority, blocked points, compulsory dice usage, the higher-die rule, intermediate landings and bearing-off overshoots must be explicitly defined and tested alongside powers.

## Cards — v0.2 baseline pending v0.3 review

- The uploaded deck contains 52 standard cards and two Jokers.
- Each player starts with five cards and has a hand limit of seven.
- Doubles draw two cards.
- A hit draws one card for the active player and randomly discards one opponent card.
- Rolling 6 and 1 offers an optional discard-one/draw-two exchange.
- Played cards are discarded at the end of the turn; the discard pile is reshuffled when the deck is exhausted.

Introducing Jinn does not by itself establish removal of the two physical Joker cards. Deck composition, hand overflow, draw timing and reshuffle wording require clarification. Card-draw qualification for power-created doubles is also unresolved; the confirmed random-doubles restriction concerns lamps.

## Poker powers

Except for Full House, these are the uploaded v0.2 effects retained for review, not freshly approved v0.3 implementations.

| Hand | Power | Baseline effect / v0.3 status |
| --- | --- | --- |
| High Card (J/Q/K/A) | High Card Boost | Add +1/+2/+3/+4 to one die; resulting value 1–12; original wording requires a continuous move. Clarify landing and movement semantics. |
| One Pair | Pair Reroll | Reroll one die once before moving. Resolve random-doubles eligibility. |
| Two Pair | Reverse Run | One checker may move in reverse for one move. Define exactly which die/movement it consumes. |
| Three of a Kind | Double Reverse | Both dice may be used in reverse this turn. Define interaction with doubles and the bar. |
| Straight | Full Reroll | Reroll both dice, or force the opponent to reroll their next roll. Define mandatory acceptance and eligibility for lamps. |
| Flush | Shield Point | Shield one checker, with removal on self-stacking; uploaded timing says one move but also expiry at the end of the owner's next turn. Reconcile before coding. |
| Full House | **Caravan Exchange** | **Confirmed replacement:** exchange contents of two points in the same six-point quadrant, including empty points. Remaining restrictions unresolved. |
| Four of a Kind | Wild Die | Set one die to a value 1–6. Power-created doubles grant four checker movements but do not qualify for lamps merely because they are doubles. |
| Straight Flush | Perfect Roll | Set both dice to values 1–6. Same confirmed rule for power-created doubles. |
| Royal Flush | Double Turn | Take an additional full turn. Resolve chaining, lamp triggers and end-game timing. |

The original Full House swaps any two friendly checkers. That is superseded by Caravan Exchange; do not implement the old effect as v0.3.

The original two Joker-card abilities are wild-card substitution and bar-entry override. Their relationship to Jinn and the one-power limit needs a decision.

## Turn sequence — baseline requiring revision

The uploaded sequence is: roll; apply draw triggers; optionally play one power; move checkers; update doubles streak/bonuses; discard played cards; cleanup.

The new lamp and Jinn system has not yet been assigned precise phases. Record the source of dice outcomes separately from their current values so a die-setting power cannot accidentally award a random-doubles lamp.

Do not automatically inherit the old end-of-turn clearing of pending reroll flags: an opponent-next-roll effect must survive until that next roll. This is a conflict to resolve, not an approved timing change.

## Bearing off and Caravan Exchange

Continue refining both before coding. The recovered conversation does not establish the exact bearing-off treatment for reverse movement, die values above six, Jinn movement or exchanges that place checkers outside the home board. Likewise, it does not recover Caravan Exchange's ownership, bar, shield, target or mixed-stack restrictions.

These are blocking design questions. This draft deliberately does not supply replacement restrictions and label them as settled.
