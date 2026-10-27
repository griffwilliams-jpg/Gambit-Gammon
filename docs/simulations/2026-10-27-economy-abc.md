# Economy comparison: B against A and C (27 October 2026)

**Status:** first simulation run, for discussion. These are proxies from one fixed computer policy, not measured balance and not a reason to change the rules on their own.

## What was run

- 1,000 match seeds (`econ-0` to `econ-999`), each played once under Economy B (current, +1/+2), A (+1/+1) and C (+1/+3). Same seeds, same computer players and same rules otherwise, so differences are paired by seed.
- The whole-turn planner played both sides. It moves without regard to the economy, buys the dearest lamp it can afford at every visit, uses only free refreshes and never saves for a dearer lamp.
- No game reached the 2,000-turn diagnostic cap. Runtime was about three minutes.
- Reproduce with `npm run simulate -- --games 1000 --prefix econ`.
- The historical v0.3 control is not implemented in the engine yet, so it is not in this comparison.

## Findings

**Money is scarce under B.** Both players together earn about 18 Dinars a game, roughly 9 each, which buys about two lamps per player. In about 12 of the 16 Bazaar visits per game (78%) the visiting player cannot afford anything. Starting at 0 Dinars means the first visit after own turn 3 is usually empty-handed.

**Royal Lamps almost never get bought.** At 12 Dinars a Royal needs most of a player's whole-game income. This bot never saves, so it can't show whether saving for one is worth it. Purchases are overwhelmingly Copper (3.35 of 3.72 per game under B).

**The economy changes how much is bought, not who wins.** A paired against B means 6.6 fewer Dinars and 1.5 fewer lamps per game; C against B means 6.3 more Dinars and 1.2 more lamps. On 88 to 90% of seeds the same player wins whichever economy is used. Hits per game and game length barely move (under one turn of difference).

**Being hit is still a net loss, even under C.** Winners were hit about 1.1 to 1.2 times fewer than losers under every economy. Losers earned more Dinars than winners under B and C (1.2 and 2.1 more), so the compensation reaches the player who's behind, but with this bot it does not turn the game around.

**No first-player edge shows up.** The starter wins 50.6 to 52.5% of games, and every interval includes 50%.

**Doubles benefits work as intended.** About 5 refresh, upgrade or discount benefits are earned per game, and fewer than 1 is left unspent at the end.

## Limits

- One policy on both sides, and it ignores the economy when moving. The plan's exploit-seeking "repeat-hit farming" policy, saving policies and aggressive or defensive styles have not been run, so this says nothing yet about whether farming is dominant.
- "Affordable visits with no purchase" and "paid refreshes" are zero because of how this bot shops, not because of the rules.
- Confidence intervals are normal approximations over 1,000 seeds. Paired intervals use per-seed differences.

## Suggested next runs

1. A saving policy (for example, save for Enchanted or Royal) to test whether the dearer lamps are ever worth waiting for.
2. The repeat-hit farming policy against the planner, under B and C, to test the main risk in the development plan.
3. Rebuild the v0.3 control so it can be compared with B.

## Raw results

| Metric (mean, 95% CI) | Economy B | Economy A | Economy C |
| --- | --- | --- | --- |
| Turns per game | 50.9 (50.3 to 51.6) | 50.3 (49.7 to 50.9) | 51.2 (50.6 to 51.9) |
| Hits per game | 6.12 (5.82 to 6.42) | 5.90 (5.62 to 6.18) | 6.17 (5.86 to 6.48) |
| Dinars earned per game (both players) | 18.35 (17.45 to 19.26) | 11.80 (11.25 to 12.36) | 24.69 (23.45 to 25.92) |
| Dinars spent per game | 15.58 (14.68 to 16.48) | 8.84 (8.28 to 9.41) | 21.81 (20.58 to 23.05) |
| Dinars unspent at the end | 2.77 (2.67 to 2.87) | 2.96 (2.83 to 3.09) | 2.87 (2.77 to 2.98) |
| Lamps bought per game | 3.72 (3.52 to 3.93) | 2.27 (2.13 to 2.41) | 4.91 (4.65 to 5.18) |
|   Copper | 3.35 (3.16 to 3.53) | 2.21 (2.08 to 2.35) | 4.09 (3.87 to 4.31) |
|   Enchanted | 0.38 (0.33 to 0.42) | 0.06 (0.04 to 0.08) | 0.79 (0.72 to 0.86) |
|   Royal | 0.00 (-0.00 to 0.00) | 0.00 (0.00 to 0.00) | 0.03 (0.02 to 0.04) |
| Legendary Jinn revealed from purchases | 0.29 (0.26 to 0.33) | 0.18 (0.15 to 0.21) | 0.40 (0.35 to 0.44) |
| Bazaar visits per game | 15.95 (15.74 to 16.17) | 15.76 (15.55 to 15.96) | 16.06 (15.83 to 16.28) |
| Visits where nothing was affordable | 12.41 (12.27 to 12.54) | 13.50 (13.37 to 13.64) | 11.76 (11.62 to 11.89) |
| Affordable visits with no purchase | 0.00 (0.00 to 0.00) | 0.00 (0.00 to 0.00) | 0.00 (0.00 to 0.00) |
| Paid refreshes | 0.00 (0.00 to 0.00) | 0.00 (0.00 to 0.00) | 0.00 (0.00 to 0.00) |
| Free refreshes used | 3.37 (3.29 to 3.45) | 3.33 (3.25 to 3.41) | 3.34 (3.26 to 3.43) |
| Benefits earned (refresh/upgrade/discount) | 4.97 (4.83 to 5.10) | 4.92 (4.78 to 5.05) | 4.92 (4.79 to 5.06) |
| Benefits still banked at the end | 0.94 (0.88 to 1.00) | 1.00 (0.93 to 1.06) | 0.89 (0.83 to 0.95) |
| Winner's Dinar edge over loser | -1.21 (-1.35 to -1.08) | 0.00 (0.00 to 0.00) | -2.14 (-2.40 to -1.87) |
| Winner's hits-received edge over loser | -1.21 (-1.35 to -1.08) | -1.19 (-1.32 to -1.06) | -1.07 (-1.20 to -0.93) |
| Starter win rate (%) | 50.8 (47.7 to 53.9) | 50.6 (47.5 to 53.7) | 52.5 (49.4 to 55.6) |
| White win rate (%) | 52.2 (49.1 to 55.3) | 51.0 (47.9 to 54.1) | 52.9 (49.8 to 56.0) |
| Capped (inconclusive) games | 0 | 0 | 0 |

| Metric (paired by seed) | A minus B |
| --- | --- |
| Turns per game | -0.6 (-1.0 to -0.2) |
| Hits per game | -0.22 (-0.38 to -0.05) |
| Dinars earned per game (both players) | -6.55 (-7.08 to -6.02) |
| Dinars spent per game | -6.74 (-7.29 to -6.18) |
| Dinars unspent at the end | 0.19 (0.03 to 0.35) |
| Lamps bought per game | -1.45 (-1.58 to -1.32) |
| Same winner as B on the same seed | 89.8% |

| Metric (paired by seed) | C minus B |
| --- | --- |
| Turns per game | 0.3 (-0.2 to 0.8) |
| Hits per game | 0.05 (-0.15 to 0.25) |
| Dinars earned per game (both players) | 6.33 (5.57 to 7.10) |
| Dinars spent per game | 6.23 (5.45 to 7.02) |
| Dinars unspent at the end | 0.10 (-0.04 to 0.25) |
| Lamps bought per game | 1.19 (1.02 to 1.36) |
| Same winner as B on the same seed | 87.9% |
