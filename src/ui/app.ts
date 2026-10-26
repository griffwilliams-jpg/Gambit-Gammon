/**
 * Game controller and HTML panels. One authoritative GameState lives here;
 * every interaction submits a legal action through applyAction. The board and
 * panels only display Observations, so hidden information stays hidden.
 */

import { chooseBotAction, createBot, type Bot } from '../ai/bot.js';
import {
  JINN_BY_ID,
  applyAction,
  createGame,
  getLegalActions,
  getObservation,
  loadGame,
  purchaseQuote,
  saveGame,
  type GameAction,
  type GameState,
  type LampType,
  type Observation,
  type PlayerId,
} from '../engine/index.js';
import type { BoardScene, BoardSpot } from './board.js';
import { POWER_NAMES, actionLabel, cardLabel, eventText, isRed, jinnName, playerName, powerParamsLabel } from './text.js';

type Mode = 'vs-ai' | 'hot-seat';

interface Session {
  mode: Mode;
  human: PlayerId;
  state: GameState;
  bots: Partial<Record<PlayerId, Bot>>;
  log: string[];
  viewer: PlayerId;
  handover: boolean;
  selected: BoardSpot | null;
  choices: GameAction[] | null;
  powerGroup: string | null;
}

const SAVE_KEY = 'gambit-gammon:autosave';
const LAMP_ODDS: Record<LampType, string> = {
  copper: '70% Common · 25% Uncommon · 5% Legendary',
  enchanted: '40% Common · 45% Uncommon · 15% Legendary',
  royal: '75% Uncommon · 25% Legendary',
};

export class App {
  private session: Session | null = null;
  private botTimer: number | null = null;

  constructor(
    private readonly board: BoardScene,
    private readonly panel: HTMLElement,
    private readonly menu: HTMLElement,
  ) {
    board.setHandler((spot) => this.onSpot(spot));
    this.renderMenu();
    // `?seed=…&mode=hot-seat|vs-ai&side=white|black` starts a reproducible game (tests, bug reports).
    const params = new URLSearchParams(location.search);
    const seed = params.get('seed');
    if (seed) {
      const mode: Mode = params.get('mode') === 'hot-seat' ? 'hot-seat' : 'vs-ai';
      const side: PlayerId = params.get('side') === 'black' ? 'black' : 'white';
      this.begin(mode, side, createGame({ seed }), [`New game from a fixed seed.`], seed);
      return;
    }
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const { mode, human, save } = JSON.parse(saved) as { mode: Mode; human: PlayerId; save: string };
        this.begin(mode, human, loadGame(save), ['Resumed your saved game.']);
        return;
      } catch {
        localStorage.removeItem(SAVE_KEY);
      }
    }
    this.newGame('vs-ai', 'white');
  }

  // -------------------------------------------------------------------------
  // Session lifecycle

  newGame(mode: Mode, human: PlayerId): void {
    const seed = Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(36)).join('-');
    this.begin(mode, human, createGame({ seed }), ['New game. Each player rolls one die to decide who starts.']);
  }

  private begin(mode: Mode, human: PlayerId, state: GameState, log: string[], botSeed = `${Date.now()}`): void {
    if (this.botTimer !== null) window.clearTimeout(this.botTimer);
    const bots: Partial<Record<PlayerId, Bot>> = {};
    if (mode === 'vs-ai') {
      const side: PlayerId = human === 'white' ? 'black' : 'white';
      bots[side] = createBot(side, botSeed);
    }
    this.session = { mode, human, state, bots, log, viewer: human, handover: false, selected: null, choices: null, powerGroup: null };
    this.afterChange();
  }

  private submit(action: GameAction): void {
    const s = this.session!;
    const result = applyAction(s.state, action);
    if (!result.ok) {
      s.log.unshift(`Not allowed: ${result.message}`);
      return this.render();
    }
    s.state = result.state;
    for (const event of result.events) {
      const text = eventText(event, s.mode === 'vs-ai' ? s.human : s.viewer);
      if (text) s.log.unshift(text);
    }
    s.log.length = Math.min(s.log.length, 200);
    s.selected = null;
    s.choices = null;
    s.powerGroup = null;
    this.afterChange();
  }

  private afterChange(): void {
    const s = this.session!;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ mode: s.mode, human: s.human, save: saveGame(s.state) }));
    const deciders = this.deciders();
    if (s.mode === 'hot-seat' && deciders.length === 1 && deciders[0] !== s.viewer && s.state.phase.kind !== 'opening') {
      s.viewer = deciders[0]!;
      s.handover = true;
    }
    this.render();
    // At most one scheduled computer move; it re-checks the game when it fires,
    // because the human may have acted in the meantime (e.g. both opening rolls).
    if (this.botTimer !== null) window.clearTimeout(this.botTimer);
    this.botTimer = null;
    const botSide = deciders.find((p) => s.bots[p]);
    if (botSide && s.state.phase.kind !== 'finished') {
      const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 450;
      this.botTimer = window.setTimeout(() => {
        this.botTimer = null;
        if (this.session !== s) return;
        const observation = getObservation(s.state, botSide);
        if (observation.legalActions.length > 0) this.submit(chooseBotAction(s.bots[botSide]!, observation));
      }, delay);
    }
  }

  private deciders(): PlayerId[] {
    return [...new Set(getLegalActions(this.session!.state).map((a) => a.player))];
  }

  private humanActions(): GameAction[] {
    const s = this.session!;
    if (s.handover) return [];
    return getLegalActions(s.state).filter((a) => !s.bots[a.player] && (s.mode === 'vs-ai' || a.player === s.viewer || a.type === 'roll-opening-die'));
  }

  // -------------------------------------------------------------------------
  // Board interaction

  private onSpot(spot: BoardSpot): void {
    const s = this.session;
    if (!s || s.handover) return;
    const moves = this.humanActions().filter((a): a is Extract<GameAction, { type: 'move-checker' }> => a.type === 'move-checker');
    if (s.selected !== null) {
      const options = moves.filter((m) => m.from === s.selected && m.to === spot);
      if (options.length > 0) return this.pickMove(options);
    }
    s.selected = moves.some((m) => m.from === spot) ? spot : null;
    s.choices = null;
    this.render();
  }

  private pickMove(options: Extract<GameAction, { type: 'move-checker' }>[]): void {
    const s = this.session!;
    // Identical checkers are interchangeable unless one is enchanted or shielded.
    const obs = getObservation(s.state, s.viewer);
    const special = new Set([...obs.shields.map((x) => x.checkerId), ...Object.values(obs.players).flatMap((p) => p.jinn.map((j) => j.target))]);
    const distinct = new Map<string, GameAction>();
    for (const o of options) {
      const key = `${o.die}|${o.reverse ?? ''}|${special.has(o.checkerId) ? o.checkerId : ''}`;
      if (!distinct.has(key)) distinct.set(key, o);
    }
    const unique = [...distinct.values()];
    if (unique.length === 1) return this.submit(unique[0]!);
    s.choices = unique;
    this.render();
  }

  // -------------------------------------------------------------------------
  // Rendering

  private render(): void {
    const s = this.session!;
    const obs = getObservation(s.state, s.viewer);
    const actions = this.humanActions();
    const moves = actions.filter((a): a is Extract<GameAction, { type: 'move-checker' }> => a.type === 'move-checker');
    const sources = new Set<BoardSpot>(moves.map((m) => m.from));
    const targets = new Set<BoardSpot>(s.selected === null ? [] : moves.filter((m) => m.from === s.selected).map((m) => m.to));
    this.board.show({ observation: obs, sources, targets, selected: s.selected, bottom: s.mode === 'vs-ai' ? s.human : 'white' });

    this.panel.replaceChildren(
      ...(s.handover ? [this.handoverView()] : []),
      this.statusView(obs),
      this.diceView(obs),
      ...(['white', 'black'] as const).map((p) => this.playerView(obs, p)),
      // In two-player games nobody's hand shows while both players share the opening roll.
      ...(s.handover || (s.mode === 'hot-seat' && obs.phase.kind === 'opening') ? [] : [this.handView(obs)]),
      ...(s.handover ? [] : [this.decisionView(obs, actions)]),
      this.logView(),
    );
  }

  private handoverView(): HTMLElement {
    const s = this.session!;
    return h('section', { class: 'card handover' }, [
      h('h2', {}, [`Pass to ${playerName(s.viewer)}`]),
      h('p', {}, ['Private cards and shop stock are hidden until the next player is ready.']),
      button(`I am ${playerName(s.viewer)}: show my turn`, () => {
        s.handover = false;
        this.render();
      }),
    ]);
  }

  private statusView(obs: Observation): HTMLElement {
    const s = this.session!;
    let text: string;
    if (obs.phase.kind === 'finished') text = `${playerName(obs.phase.winner)} wins the game!`;
    else if (obs.phase.kind === 'opening') text = 'Opening contest: each player rolls one die. Ties roll again.';
    else {
      const p = obs.pending;
      const who = p && 'player' in p ? playerName(p.player) : '';
      const mine = p && 'player' in p && !s.bots[p.player];
      text = `${who} ${mine ? '(your decision)' : 'is thinking…'}: ${describePending(obs)}`;
    }
    return h('section', { class: 'card status' }, [
      h('div', { class: 'turn' }, [obs.turn ? `Turn ${obs.turnNumber} · ${playerName(obs.turn.player)}'s own turn ${obs.turn.ownTurnNumber}${obs.turn.bonus ? ' (bonus)' : ''}` : 'Before play']),
      h('div', {}, [text]),
    ]);
  }

  private diceView(obs: Observation): HTMLElement {
    const dice = obs.turn?.dice;
    if (!dice) return h('section', { class: 'card dice' }, [h('span', { class: 'muted' }, ['No dice rolled yet.'])]);
    const [a, b] = dice.initialRoll;
    const natural = a === b && dice.initialRollSource === 'turn-roll';
    const note =
      dice.initialRollSource === 'opening-contest'
        ? 'Opening dice: no doubles rewards.'
        : natural
          ? 'Natural doubles: +2 cards and doubles charge.'
          : a + b === 7 && (a === 6 || b === 6)
            ? 'Natural 6-1: optional exchange.'
            : 'Not a natural double: no roll reward.';
    return h('section', { class: 'card dice' }, [
      h('div', { class: 'dice-row' }, [
        h('span', { class: 'label' }, ['Rolled']),
        ...[a, b].map((v) => h('span', { class: 'die' }, [String(v)])),
        h('span', { class: 'label' }, ['Moves left']),
        ...dice.remaining.map((v) => h('span', { class: 'die live' }, [String(v)])),
      ]),
      h('div', { class: 'muted' }, [note, obs.turn?.powerUsed ? ` Power used: ${POWER_NAMES[obs.turn.powerUsed]}.` : '']),
    ]);
  }

  private playerView(obs: Observation, player: PlayerId): HTMLElement {
    const p = obs.players[player];
    const visit = obs.completedOwnTurns[player];
    const nextVisit = Math.floor(visit / 3) * 3 + 3;
    const benefits = [
      p.benefits.refreshes ? `${p.benefits.refreshes} free refresh` : '',
      p.benefits.upgrades ? `${p.benefits.upgrades} Copper upgrade` : '',
      p.benefits.discounts ? `${p.benefits.discounts} discount (−3)` : '',
    ].filter(Boolean);
    return h('section', { class: `card player ${player}` }, [
      h('div', { class: 'player-head' }, [
        h('strong', {}, [`${playerName(player)}${player === obs.viewer ? ' (you)' : ''}`]),
        h('span', { class: 'dinars', title: 'Dinars' }, [`◈ ${p.dinars}`]),
      ]),
      h('div', { class: 'muted' }, [
        `Pips ${p.pipCount} · bar ${p.onBar} · off ${p.borneOff} · cards ${p.handCount} · doubles ${p.doubles.cumulative}/2, streak ${p.doubles.streak}`,
      ]),
      h('div', { class: 'muted' }, [`Bazaar after own turn ${nextVisit} (completed ${visit})${benefits.length ? ` · banked: ${benefits.join(', ')}` : ''}${p.forcedRerollPending ? ' · must reroll next turn' : ''}`]),
      h(
        'div',
        { class: 'jinn-row' },
        [0, 1, 2].map((slot) => {
          const j = p.jinn[slot];
          if (!j) return h('div', { class: 'jinn empty' }, ['empty slot']);
          const def = JINN_BY_ID[j.id];
          const waiting = obs.turnNumber > 0 && j.activeFromTurn > obs.turnNumber;
          const spent = p.spentOncePerMatch.includes(j.id) && (j.id === 'sahira' || j.id === 'mazin');
          const resting = j.id === 'malik' && obs.turn?.player === player && obs.turn.ownTurnNumber < p.malikReadyOnOwnTurn;
          return h('div', { class: `jinn ${def.rarity}`, title: `${def.effect}\n“${def.quote}”` }, [
            h('div', { class: 'jinn-name' }, [def.name]),
            h('div', { class: 'jinn-meta' }, [
              def.rarity,
              waiting ? ' · active next turn' : '',
              spent ? ' · used' : '',
              resting ? ' · resting' : '',
              j.target ? ` · enchanting ${checkerSpot(obs, j.target)}` : '',
            ]),
          ]);
        }),
      ),
    ]);
  }

  private handView(obs: Observation): HTMLElement {
    const hand = obs.private.hand;
    return h('section', { class: 'card hand' }, [
      h('div', { class: 'label' }, [`Your hand (${hand.length}/7)`]),
      h(
        'div',
        { class: 'cards' },
        hand.length === 0
          ? [h('span', { class: 'muted' }, ['No cards.'])]
          : hand.map((c) =>
              h('span', { class: `playing-card ${isRed(c) ? 'red' : ''} ${obs.private.lockedCards.includes(c) ? 'locked' : ''}`, title: obs.private.lockedCards.includes(c) ? 'Capture card: playable from your next turn' : '' }, [cardLabel(c)]),
            ),
      ),
    ]);
  }

  private decisionView(obs: Observation, actions: GameAction[]): HTMLElement {
    const s = this.session!;
    const section = h('section', { class: 'card decision' }, []);
    if (actions.length === 0) {
      section.append(h('span', { class: 'muted' }, [obs.phase.kind === 'finished' ? 'Game over. Start a new game from the menu.' : 'Waiting…']));
      return section;
    }
    if (s.choices) {
      section.append(h('div', { class: 'label' }, ['Which way?']), ...s.choices.map((a) => button(actionLabel(a, obs), () => this.submit(a))));
      section.append(button('Cancel', () => ((s.choices = null), this.render()), 'quiet'));
      return section;
    }
    const pending = obs.pending;
    if (pending?.kind === 'bazaar') return this.bazaarView(obs, actions, section);
    if (pending?.kind === 'equip-jinn') {
      const def = JINN_BY_ID[pending.jinn];
      section.append(
        h('div', { class: 'label' }, [`${def.name} (${def.rarity}) wants a slot`]),
        h('p', { class: 'muted' }, [def.effect]),
        ...actions.map((a) =>
          button(
            a.type === 'equip-jinn' && a.replaceSlot !== null
              ? `Replace ${jinnName(obs.players[a.player].jinn[a.replaceSlot]!.id)}`
              : 'Release the new Jinn (no refund)',
            () => this.submit(a),
          ),
        ),
      );
      return section;
    }

    const moves = actions.filter((a) => a.type === 'move-checker');
    const powers = actions.filter((a): a is Extract<GameAction, { type: 'play-power' }> => a.type === 'play-power');
    const others = actions.filter((a) => a.type !== 'move-checker' && a.type !== 'play-power');

    if (moves.length > 0) {
      section.append(h('div', { class: 'label' }, ['Click a highlighted checker, then a green destination. Or choose a move:']));
      const list = h('div', { class: 'move-list' }, []);
      const seen = new Set<string>();
      for (const m of moves) {
        const label = actionLabel(m, obs);
        if (seen.has(label)) continue;
        seen.add(label);
        list.append(button(label, () => this.pickMove(moves.filter((x) => actionLabel(x, obs) === label) as Extract<GameAction, { type: 'move-checker' }>[]), 'small'));
      }
      section.append(list);
    }
    for (const a of others) section.append(button(actionLabel(a, obs), () => this.submit(a), a.type === 'end-turn' ? 'primary' : ''));

    if (powers.length > 0) {
      const groups = new Map<string, Extract<GameAction, { type: 'play-power' }>[]>();
      for (const p of powers) {
        const key = `${p.params.power}|${p.cardIds.join(',')}|${p.wildCardId ?? ''}`;
        groups.set(key, [...(groups.get(key) ?? []), p]);
      }
      section.append(h('div', { class: 'label' }, ['Poker powers (one per turn, before moving):']));
      for (const [key, group] of groups) {
        const first = group[0]!;
        const cards = first.cardIds.map((c) => (c === first.wildCardId ? `${cardLabel(c)}★` : cardLabel(c))).join(' ');
        if (s.powerGroup === key) {
          section.append(h('div', { class: 'power-open' }, [
            h('strong', {}, [`${POWER_NAMES[first.params.power]}: ${cards}`]),
            ...group.map((g) => button(powerParamsLabel(g, obs), () => this.submit(g), 'small')),
            button('Back', () => ((s.powerGroup = null), this.render()), 'quiet'),
          ]));
        } else {
          section.append(button(`${POWER_NAMES[first.params.power]}: ${cards}`, () => (group.length === 1 ? this.submit(first) : ((s.powerGroup = key), this.render())), 'power'));
        }
      }
    }
    return section;
  }

  private bazaarView(obs: Observation, actions: GameAction[], section: HTMLElement): HTMLElement {
    const s = this.session!;
    const player = obs.viewer;
    const p = obs.players[player];
    section.classList.add('bazaar');
    section.append(
      h('h2', {}, ['The Jinn Bazaar']),
      h('div', { class: 'muted' }, [
        `Balance ◈ ${p.dinars}. Each random slot: 60% Copper · 30% Enchanted · 10% Royal (first slot always Copper). These are stock odds, separate from the Jinn rarity inside each lamp.`,
      ]),
    );
    const lamps = h('div', { class: 'lamps' }, []);
    obs.private.stock.forEach((lamp, slot) => {
      if (!lamp) return lamps.append(h('div', { class: 'lamp sold' }, ['Sold']));
      const quote = purchaseQuote(s.state, player, lamp);
      const buy = actions.find((a) => a.type === 'bazaar-buy' && a.slot === slot);
      lamps.append(
        h('div', { class: `lamp ${lamp}` }, [
          h('div', { class: 'lamp-name' }, [`${lamp[0]!.toUpperCase()}${lamp.slice(1)} Lamp`]),
          h('div', { class: 'lamp-price' }, [`◈ ${quote.price}`]),
          h('div', { class: 'muted small' }, [
            LAMP_ODDS[quote.opensAs],
            quote.upgraded ? ' · upgrade applies: opens as Enchanted' : '',
            quote.discounted ? ' · 3-Dinar discount applies' : '',
          ]),
          buy ? button('Buy', () => this.submit(buy), 'primary small') : h('div', { class: 'muted small' }, ['Not enough Dinars']),
        ]),
      );
    });
    section.append(lamps);
    const refresh = actions.find((a) => a.type === 'bazaar-refresh');
    if (refresh) section.append(button(p.benefits.refreshes > 0 ? `Refresh all three (free · ${p.benefits.refreshes} banked)` : 'Refresh all three (◈ 1)', () => this.submit(refresh)));
    const leave = actions.find((a) => a.type === 'bazaar-leave')!;
    section.append(button('Leave the Bazaar (save your Dinars)', () => this.submit(leave)));
    return section;
  }

  private logView(): HTMLElement {
    return h('section', { class: 'card log' }, [
      h('div', { class: 'label' }, ['Event history']),
      h('ol', { reversed: 'reversed' }, this.session!.log.slice(0, 60).map((line) => h('li', {}, [line]))),
    ]);
  }

  private renderMenu(): void {
    this.menu.replaceChildren(
      h('strong', { class: 'title' }, ['Gambit Gammon']),
      button('New game vs computer (Ivory)', () => this.newGame('vs-ai', 'white'), 'small'),
      button('New game vs computer (Onyx)', () => this.newGame('vs-ai', 'black'), 'small'),
      button('New two-player game', () => this.newGame('hot-seat', 'white'), 'small'),
      button('Download save', () => this.download(), 'small quiet'),
      fileInput((text) => {
        try {
          const s = this.session!;
          this.begin(s.mode, s.human, loadGame(text), ['Loaded a saved game.']);
        } catch (error) {
          alert(`Could not load that file: ${(error as Error).message}`);
        }
      }),
    );
  }

  private download(): void {
    const blob = new Blob([saveGame(this.session!.state)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gambit-gammon-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

function describePending(obs: Observation): string {
  const p = obs.pending;
  if (!p) return '';
  switch (p.kind) {
    case 'opening-roll':
      return 'roll the opening die';
    case 'choose-hadi-mark':
      return 'Hadi marks an opposing checker';
    case 'choose-jinn-target':
      return `${jinnName(p.jinn)} chooses a checker to enchant`;
    case 'offer-sahira':
      return 'use Sahira this turn?';
    case 'roll':
      return 'roll the dice';
    case 'offer-exchange':
      return 'natural 6-1: exchange a card?';
    case 'move':
      return 'move checkers (or play a power first)';
    case 'choose-zafir-value':
      return `Zafir offers ${p.candidates[0]} or ${p.candidates[1]}`;
    case 'choose-straight-dice':
      return `keep ${p.original.join('-')} or take ${p.rerolled.join('-')}`;
    case 'discard-before-draw':
      return 'hand is full: discard before drawing';
    case 'choose-nahla-discard':
      return 'Nahla: choose the card to discard';
    case 'choose-basim-card':
      return 'Basim: keep one revealed card';
    case 'offer-malik':
      return 'Malik may shield an exposed checker';
    case 'bazaar':
      return 'shopping in the Jinn Bazaar';
    case 'equip-jinn':
      return 'all slots full: replace or release';
  }
}

function checkerSpot(obs: Observation, id: string): string {
  const c = obs.checkers.find((x) => x.id === id);
  return !c ? '?' : c.location.kind === 'point' ? `point ${c.location.point}` : c.location.kind;
}

function h(tag: string, attrs: Record<string, string>, children: (Node | string)[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

function button(label: string, onClick: () => void, variant = ''): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  if (variant) el.className = variant;
  el.addEventListener('click', onClick);
  return el;
}

function fileInput(onText: (text: string) => void): HTMLElement {
  const label = document.createElement('label');
  label.className = 'small quiet file';
  label.textContent = 'Load save';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (file) onText(await file.text());
    input.value = '';
  });
  label.append(input);
  return label;
}
