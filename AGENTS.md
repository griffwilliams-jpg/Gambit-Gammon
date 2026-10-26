# Working with Griff

Before carrying out any workflow, explain what you remember or understand, identify any uncertainties, and describe the proposed plan in conversation. Wait for Griff's explicit go-ahead before executing the plan, creating documents or other artifacts, or making changes. A request to help, discuss, recall, outline, or plan is not approval to create a deliverable. Work through the plan with Griff first. This applies to all workflows, not just LEGO campaign work. Once Griff approves a plan or step, carry out the approved scope without repeatedly asking for the same approval.

# Project context

- Read README.md, docs/rules.md, docs/agreed-decisions.md and docs/open-decisions.md before proposing implementation.
- Current game direction is v0.4: Dinar-funded Jinn Bazaar. v0.3 remains a historical testing control, not the current default.
- Preserve reference files byte-for-byte. The original JSON and PDF are historical sources, not executable current rules.
- Keep provisional balance parameters distinct from fixed mechanics and genuinely unresolved questions. Selected rules: 0 starting Dinars plus the free lamp; one guaranteed Copper and two independent 60% Copper / 30% Enchanted / 10% Royal offers; paid refreshes 1 Dinar and earned refreshes free; post-turn 3/6/9 visits including bonus/blocked turns; Royal contents 75% Uncommon / 25% Legendary; next-lamp discount 3 Dinars, minimum price 1. Do not confuse stock weights with Jinn rarity odds.
- Each player has private stock, with three fresh offers every visit. Buy any affordable offers; purchased offers disappear. Reveal/equip immediately, using replace-or-release at full capacity. A refresh regenerates all three slots using the same Copper guarantee and random weights. Bank every earned refresh, upgrade and discount until spent; at most one upgrade and one discount apply per purchase. B03–B10 (refresh selection, end-turn order, refunds, doubles counting, upgrade pricing, benefit consumption, hit order) were settled on 26 October 2026; see docs/agreed-decisions.md.
- The 26 October 2026 documentation request did not authorise code. Later that day Griff approved building a v1 of the game, including the v0.4 economy and Bazaar, through draft pull requests.
- Keep the twelve-Jinn roster. Farid, Layla and Yasmin are future candidates only. Do not add anti-farming rules before evidence and review.
- Preserve the v0.3 acquisition/control configuration when implementation is later approved, and keep ruleset identity in saves, replay and simulation reports.
