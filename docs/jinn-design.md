# Collectible Jinn — v0.3 design notes

## Confirmed direction

Jinn are collectible modifiers that persist and change play, with distinctive names and personalities. Each player begins with one free mystery lamp. More lamps come from cumulative qualifying random-doubles charges plus streak bonuses. Jinn take over abilities previously awarded by the permanent doubles-streak ladder.

The recovered messages do not define an account-level collection, cross-match persistence, rarity table, active-slot limit, duplicate policy, lamp cost or reveal timing. Those remain design choices.

## Three separate concepts

Use these distinctions when discussing the design; their precise mechanics are still open:

- **Lamp:** the mystery reward the player can open or rub.
- **Jinn:** the collectible modifier revealed by a lamp.
- **Poker power:** the effect activated by a card hand, subject to the baseline one-power-per-turn rule.

Do not silently replace every card power or physical Joker card with a Jinn. Clarify whether Jinn are passive, active or a mixture, and whether activations consume the poker-power allowance.

## Legacy abilities to adapt

These names and effects come from the v0.2 doubles-streak section. They are candidate source material, not a balanced or final Jinn roster. Old streak thresholds are historical only.

| Legacy bonus | Original effect | Conversion questions |
| --- | --- | --- |
| Double Value Target (streak 2) | Mark an opponent checker; hits on it draw one additional card. | When is the target selected? Does the mark survive a hit, bar entry, exchange and bearing off? Can multiple marks stack? |
| Omni-Move Piece (streak 3) | One checker permanently moves in either direction. | Define bar entry, compulsory moves, home-board eligibility and whether the effect is tied to that checker or its owner. |
| Mass Card Refresh (streak 4; one-off) | Discard the whole hand and draw seven cards. | Possible consumable or activated Jinn candidate. Define activation timing, deck exhaustion and power budget. |
| Invincible Piece (streak 5) | One checker is permanently invincible. | Resolve whether opponents may land, blocking strength, effect duration and interaction with temporary shields. |
| Rampage Piece (streak 6) | A selected checker sends hit opponents to the bar and draws two cards. | Sending a hit checker to the bar is already normal movement. Clarify whether the draw is +2 total or additional to the normal hit reward and any target bonus. |

The confirmed direction replaces the original permanent streak rewards with collectible abilities. Do not award a permanent legacy power automatically as well as a new lamp without a new explicit decision.

## Lamp accounting to settle

- Define a qualifying random doubles event: opening roll, natural turn roll, Pair Reroll, Full Reroll and forced opponent rerolls need explicit treatment.
- Keep cumulative charge and consecutive streak as different state values.
- Specify charge cost, streak bonuses, carry-over, cap and whether a reward resets either counter.
- Ensure a single roll is not counted twice as dice are rerolled or modified.
- Define whether extra turns generate charges and how they affect streaks.
- Define lamp opening, collection capacity, duplicates, replacement and reveal visibility.

The free starting lamp is a separate setup grant; it should not depend on a player's first roll.

## Future design record

Once agreed, each Jinn needs an ID, display name, personality, source ability, acquisition rule, trigger/activation phase, target, duration, stacking policy, exclusions and visible explanation. Keep flavour text separate from exact rules text.

Distinct personalities and pixel-art portraits are requested. Specific names, art and lore have not yet been approved.
