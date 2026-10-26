# Gambit Gammon v0.4 — current rules

**Current gameplay direction, approved by Griff on 26 October 2026:** the Dinar-funded Jinn Bazaar replaces v0.3's free-lamp doubles economy. This is the main game ruleset, not a separate experimental replacement waiting for approval. Its numerical economy values are provisional balance parameters; the explicitly unresolved details below still need decisions before implementation.

This existing rules document has a stable, versionless filename so future revisions can update the same source of truth. [Agreed decisions](agreed-decisions.md) records the change; [open decisions](open-decisions.md) lists only remaining specification and balance questions. No game code or simulations accompany this documentation change.

## 1. Objective, board and setup

- Two players; a traditional 24-point backgammon board, bar and bear-off area; 15 individually identifiable checkers each, in standard starting positions.
- First player to bear off all 15 checkers wins. Normal backgammon move legality applies unless a named power explicitly overrides it.
- Use a standard 52-card deck, without physical Jokers. Deal five cards each; maximum hand size seven.
- Each player receives one free mystery Jinn lamp before play. Each can equip up to three Jinn. Further lamps are primarily purchased in the Bazaar.
- Determine the starter by each player rolling one die, repeating ties. The winner uses those two unequal dice as their first movement dice. An opening 6-and-1 may trigger its normal card exchange.
- Each player starts with **0 Dinars**, in addition to their free starting mystery Jinn lamp. Earn purchase money through play.

## 2. Movement and turn structure

Use normal blocked-point, hit, bar-priority and bearing-off rules. Use both dice, or all four movements from effective doubles, whenever possible; where only one of two different dice can be used, apply the usual higher-die obligation if both are individually playable. Validate whole movement sequences rather than offering a move that prevents mandatory die use later.

Re-enter barred checkers normally before moving other checkers. No reverse entry, backwards bearing off or backwards movement off the board. A player who has borne off their first checker cannot subsequently use backwards movement to take a checker out of the home board. Being hit still requires normal re-entry and return home before bearing off resumes.

The inherited turn phases are: beginning-of-turn Jinn choices; initial roll and rewards; optional pre-movement poker power; checker movement; eligible Royal Flush declaration; played-card discard and end-turn effects; lamp opening/equipment; next turn. Eligible Bazaar visits occur after completed own turns 3, 6, 9 and so on, including completed bonus turns and blocked turns. Exact ordering relative to end-turn cleanup, reveals/equipment and handover still needs formalisation; the visit does not precede checker movement.

Stop on victory. Do not insert a post-victory purchase or additional turn. Game-state changes come from validated actions, never from animation completion.

## 3. Cards and poker powers

- Only the initial roll of each turn determines roll-triggered card rewards, doubles charge and streak progress. Rerolls and die-setting powers change movement, not that qualification. A natural double retains its rewards if later modified away; a manufactured double grants four movements but no natural-doubles reward.
- A qualifying natural double draws two cards. A natural 6-and-1 offers an optional discard-one/draw-two exchange.
- A successful hit draws one card for the hitter and forces the hit player to discard one random card, if they have one. Jinn may explicitly replace or modify those effects. Dinar rewards are additional to this card exchange.
- At a full hand, choose a discard before each draw. Resolve multiple draws sequentially; reshuffle the discard pile when the draw deck empties. Draw shortfalls and temporary reveal-zone ordering still need the specifications listed in [open decisions](open-decisions.md).
- At most one played poker-hand power per turn. There is no reactive countering. Jinn effects have their own triggers and do not consume that allowance unless explicitly stated.
- Select the precise cards to spend: a pair may be played from a larger matching group. If a selection qualifies for several powers, choose which qualifying power to activate; a straight flush can be spent as Straight, Flush or Straight Flush.
- Ace-low straights are allowed; wrapping sequences are not. Played cards become unavailable immediately and enter discard at turn end. Cards gained through hits cannot be played that turn, including for a turn-end Royal Flush.

| Cards | Hand | Power |
| --- | --- | --- |
| 1 J/Q/K/A | High Card | Boost one die by +1/+2/+3/+4 respectively, as one indivisible movement with a legal destination. An ordinary die can reach at most 10. Values above six cannot enter from the bar or bear off. |
| 2 | One Pair | Reroll one die once before movement. |
| 4 | Two Pair | Reverse one checker movement using one die; normal blocking and hits apply. |
| 3 | Three of a Kind | Eligible movements may go forward or backwards this turn, subject to normal destination and movement obligations. |
| 5 | Straight | Reroll both dice and choose the original or new pair, or require an opponent reroll on their next turn. That pending effect survives cleanup until resolved. |
| 5 | Flush | Shield one chosen checker against hits throughout the opponent's next turn; expires after that turn or earlier on self-stacking. |
| 5 | Full House | **Caravan Exchange:** swap the entire contents of two points within one six-point quadrant. Both points must be empty or occupied solely by your own checkers; at least one must be occupied. Cannot activate while you have a checker on the bar. No hits, bearing off or dice are spent. Preserve checker identities and enchantments. Reject ineffective swaps; equal-sized stacks are meaningful if different enchantments change the tactical position. |
| 4 | Four of a Kind | Set one die to any value 1–6. Effective doubles grant four movements, without natural-doubles rewards. |
| 5 | Straight Flush | Set both dice to any values 1–6, including effective doubles for four movements, without natural-doubles rewards. |
| 5 | Royal Flush | After the current turn, take one additional full turn. Declare at turn end only if no other poker power was used. A bonus turn cannot chain another Royal Flush bonus turn. |

## 4. Dinars: the current economy

Each completed legal hit awards:

| Recipient | Current reward |
| --- | ---: |
| Player hitting an opposing checker | +1 Dinar |
| Player whose checker is hit | +2 Dinars |

The hit checker goes to the bar normally. The existing card gain and forced discard still happen. A blocked, shield-prevented or otherwise unsuccessful attempted hit awards no Dinars. One actual hit is one reward event; do not award again merely because several Jinn react to it.

The intended trade-off is deliberate exposure for money versus losing board position, bar-entry tempo and potentially a card. Risk-taking is allowed. Do not add diminishing rewards, per-turn earning caps or new movement restrictions before testing whether farming is actually dominant.

The +1/+2 setting is **Economy B**, the current provisional default. Economies A (+1/+1) and C (+1/+3) are comparison configurations for balancing, not alternative main rules a coding agent may silently select. No real-money value, cash-out or wagering feature is specified for Dinars.

## 5. The Jinn Bazaar

The Bazaar opens **after completed own turns 3, 6, 9 and so on**. Completed bonus turns and blocked turns count towards this personal-turn clock. Players may buy lamps or save their Dinars for a later visit.

Each visit stocks **three mystery-lamp offers**: one guaranteed Copper Lamp and two independently generated offers. Each of the two random slots has a **60% Copper / 30% Enchanted / 10% Royal** chance. Repeated lamp types are possible because those two slots are independent; this does not relax equipped-Jinn duplicate restrictions. These are provisional stock-generation parameters, separate from the Jinn rarity probabilities inside each lamp.

Lamp types are shown before purchase; Jinn contents remain a mystery until revealed. A refresh changes the available lamp types. **Paid refreshes cost 1 Dinar; refreshes earned from doubles are free.** Private versus shared stock, refresh limits, treatment of purchased slots, purchase limits and the application of the Copper guarantee when refreshing partly sold stock remain unresolved.

| Lamp | Base cost | Rarity distribution |
| --- | ---: | --- |
| Copper | 4 Dinars | 70% Common, 25% Uncommon, 5% Legendary |
| Enchanted | 7 Dinars | 40% Common, 45% Uncommon, 15% Legendary |
| Royal | 12 Dinars | 0% Common, 75% Uncommon, 25% Legendary |

These prices and probabilities are starting balance parameters, not measured fair values. A purchase spends Dinars and reveals a random Jinn according to the lamp's resolved probabilities; owning three Jinn does not remove the replacement-or-release decision. Whether purchases resolve immediately during a visit or later in turn cleanup must be settled with Bazaar timing.

Use uniform selection within an eligible rarity and renormalise over remaining eligible rarities if a tier is exhausted, as already approved for v0.3. Royal Lamps remain restricted to eligible Uncommon and Legendary Jinn; fallback never adds Common outcomes. The 75%/25% Royal distribution is an approved provisional balance value, not a measured fair price or strength.

A refresh regenerates offered lamp types rather than rerolling a purchased or revealed Jinn. The approved initial three-offer generation rule is one guaranteed Copper plus two independent 60%/30%/10% lamp-type draws, and a paid refresh costs 1 Dinar. Define sold-slot/restocking behaviour and how the Copper guarantee applies to any partial refresh before implementation; do not silently refill purchased slots or charge Dinars for an earned free refresh.

## 6. Natural doubles now improve Bazaar opportunities

Keep initial-roll provenance separate from effective movement dice. Qualifying natural doubles retain their card rewards. Replace the old additional free lamps with:

| Trigger | Current Bazaar rule |
| --- | --- |
| Two cumulative qualifying natural doubles | Award one free Bazaar refresh. |
| Two consecutive qualifying natural doubles | Upgrade the next purchased Copper Lamp to Enchanted. |
| Three consecutive qualifying natural doubles | Award 3 Dinars off the next lamp purchase, with a minimum final price of 1 Dinar. |

**There are no additional free lamps from doubles in v0.4.** The free setup lamp remains. The old automatic permanent streak powers also remain replaced by collectible Jinn.

The existing cumulative-versus-streak distinction is retained: a non-double breaks the consecutive streak, not accumulated doubles charge. Reuse the two-charge trigger for a refresh, but specify its consumption/reset order together with visit timing. Four-plus-consecutive bonuses remain deferred.

Do not copy v0.3's carried free-lamp Enchanted-upgrade rule into v0.4: the new benefit concerns a **purchased Copper Lamp**. Its price, stacking, expiry, consumption, interaction with discounts, and interaction with previously bought lamps still need explicit decisions. There is no authority to reroll an already revealed Jinn or apply a retroactive upgrade without such a decision.

Completed extra turns count towards the Bazaar visit clock and use the normal initial-roll reward rule. Pair Reroll, Full Reroll, opponent-forced rerolls and values set by powers cannot farm extra Bazaar reward events.

The three-streak discount applies to the next lamp purchase, with a final price floor of 1 Dinar. Without other benefits, the base-price examples are Copper 4 to 1, Enchanted 7 to 4 and Royal 12 to 9. The amount and floor are approved provisional balance values. Discount stacking, expiry, consumption order and interactions with the Copper upgrade remain decisions to resolve.

## 7. Jinn collection and the retained roster

- Every player opens one free mystery lamp before play and may equip three persistent Jinn during the match. No separate unequipped inventory or account-wide collection is specified.
- At full capacity, replace one equipped Jinn or release the revealed Jinn. Replacing a Jinn removes its attached enchantments unless its own rule says otherwise. Release does not imply a refund or resale value.
- Exclude already-equipped copies; at most one active copy per named Jinn. Once-per-match use remains spent even if the Jinn is replaced and later reacquired.
- Newly acquired Jinn activate from the following turn, including an immediate Royal Flush bonus turn, never retroactively in the triggering turn.
- Resolve simultaneous Jinn effects in stable left-to-right equipped-slot order. Resolve replacement effects before ordinary effects and record the complete sequence. Effect recursion must not silently discard events.
- Retain all twelve existing Jinn and their established activations, not just their passive effects. Sahira and Mazin still have once-per-match abilities; Malik still has a cooldown. No new economy Jinn are approved.
- Amira and Rakhim retain their chosen checker through hits, bar entry and exchanges. If it bears off, select a new target at the next own turn.


| ID | Name | Rarity | Effect | Legacy source |
| --- | --- | --- | --- | --- |
| hadi | Hadi the Collector | Uncommon | Mark one opposing checker at start of your turn. First time you hit that target each turn, draw **+1 extra** card. | Double Value Target |
| amira | Amira of the Crossroads | Uncommon | Enchant one own checker persistently; once per turn it may make a legal move in either direction without a reverse poker power. If it bears off, choose a replacement at the next own turn. | Omni-Move Piece |
| sahira | Sahira the Sevenfold | Uncommon | Once per match, at the beginning of your turn, discard your whole hand and draw 7 new cards. | Mass Card Refresh |
| malik | Malik the Unyielding | Legendary | At the end of your turn, shield one exposed own checker from hits through the opponent's next turn; then skip the next two own turns (use on turn 1 means ready on turn 4). | Invincible Piece, toned down |
| rakhim | Rakhim the Ravager | Legendary | Enchant one checker persistently; its first successful hit each turn draws **+1 extra** card beyond the normal hit reward. | Rampage Piece |
| zafir | Zafir the Second-Guesser | Common | For Pair Reroll, generate two candidate replacement die values and choose one. | New |
| basim | Basim the Bargainer | Common | On first hit each turn, reveal two cards and choose one **instead of** drawing the ordinary random capture card. Discard the unchosen card. Other separately triggered Jinn bonuses still apply. | New |
| nahla | Nahla the Veiled | Common | On first opponent-forced random discard each opponent turn, choose which card to discard instead. | New |
| qamar | Qamar the Moon-Watcher | Common | Each qualifying natural doubles event draws +1 extra card, respecting hand limit. | New |
| sirocco | Sirocco the Unbound | Common | First successful backward checker movement per turn draws 1 card. | New |
| noura | Noura the Kindler | Uncommon | If you finish your turn with no cards after played-hand discard, draw 2. | New |
| mazin | Mazin the Wish-Breaker | Legendary | Once per match, treat one card as any rank and suit for forming a played poker hand. | Former Joker wild-card idea |

Rarity roster count: **5 Common, 4 Uncommon, 3 Legendary**.

Every Jinn has a name, personality, pixel-art portrait, flavour quote, and a visible trigger animation. Illustrative established voice lines:
- Hadi: “There's a debt to be collected.”
- Amira: “Every road eventually leads to me.”
- Sahira: “A dreadful hand. Shall we try another?”
- Malik: “My word is stone. My stone does not move.”
- Rakhim: “Your pieces look better on the bar.”
- Zafir: “That one? Are you quite sure?”
- Basim: “A little choice can be very expensive.”
- Nahla: “You may take a secret. But I choose which.”
- Qamar: “Twice the fortune, twice the fun.”
- Sirocco: “Forward, backward. Such tedious distinctions.”
- Noura: “Even ashes contain the promise of fire.”
- Mazin: “You wished for a better hand. You never specified whose.”

Existing **synergy hypotheses**, not validated balance: Hadi + Rakhim + Basim (capture/card build); Amira + Sirocco + Zafir (reverse manoeuvring); Qamar + Sahira + Mazin (high-end poker hands).

## 8. Balance, design and implementation status

The Bazaar is the current game direction. Its benefits and risks remain hypotheses until tested. The [development plan](development-plan.md) defines the comparison against historical v0.3, adversarial strategies, metrics and visual direction.

This rules change authorises documentation updates only. The repository currently has planning documents and reserved implementation directories; there is no implemented engine or measured economy comparison. Resolve [the remaining rules](open-decisions.md) and agree the prototype step before coding this economy.
