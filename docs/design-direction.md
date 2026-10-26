# Visual and interaction direction

## Established identity

Original low-resolution pixel art, expressive animation and playful presentation inspired by Balatro's atmosphere, with Arabian Nights and Middle Eastern fantasy influences. Use indigo, burgundy, gold and turquoise, geometric ornament, magical oil lamps and distinctive Jinn. Create original artwork, names, interface elements and sound; do not reproduce Balatro assets or characters.

## Main game

Keep the backgammon board, dice, playing cards, three Jinn slots, Dinar balance and Bazaar progress legible together. The old free-lamp doubles meter must not remain labelled as the current acquisition system.

Show original versus effective dice and explain why a roll did or did not qualify for rewards. Show legal moves, selected power/targets, shields, marked/enhanced checkers, effect expiry and a readable event history. Capture feedback should distinguish the hitter's +1 Dinar, the hit player's +2 Dinars, the checker going to the bar and the card consequences.

Prioritise desktop and tablet landscape, mouse/keyboard/touch, reduced motion, controllable audio and readable labels. Hot-seat play needs a handover view to conceal private cards. Phone layouts are later work.

## The Jinn Bazaar

The Bazaar is the current game's magical marketplace, not a conventional shop screen. Use ornate oil lamps, animated smoke/glow, distinct Copper/Enchanted/Royal designs, an original mysterious merchant and satisfying currency/reveal feedback. The merchant's identity and final artwork are not approved yet.

Present prices, balance, pending visit timing and the exact benefits available before a purchase. Make spending/saving and replacement/release choices clear. Reveal Jinn with personality and visible rarity; do not confuse a lamp type with the rarity actually revealed. Explain why an upgrade or discount was consumed.

Show progress towards visits after own turns 3, 6, 9 and so on, including completed bonus and blocked turns. Present three mystery-lamp offers with visible lamp types, prices and odds. A refresh changes those available lamp types; its cost and treatment of sold offers are still being specified. Royal Lamps show 75% Uncommon / 25% Legendary. Keep the remaining cleanup/reveal/handover ordering a rule decision rather than allowing animation timing to decide it.

No visual mock-up, asset set, animation or game UI is implemented by this documentation update. Griff reviews the art direction before full asset production.

## Implementation direction

The previously approved stack is an independent TypeScript rules engine with Phaser 4.2.1/Vite presentation and native HTML menus/accessibility controls. Keep one authoritative engine state. Scenes, sound and animation display its events and must not determine results. See [the development plan](development-plan.md) for the staged implementation and test gates.
