/**
 * Phaser board view. It draws the current Observation and reports clicks; it
 * never decides anything. Placeholder art: geometric shapes in the approved
 * indigo / burgundy / gold / turquoise palette, pending original pixel art.
 */

import * as Phaser from 'phaser';
import type { Observation, PlayerId } from '../engine/index.js';

export type BoardSpot = number | 'bar' | 'off';

export interface BoardView {
  observation: Observation;
  /** Spots holding a checker the player may move. */
  sources: Set<BoardSpot>;
  /** Where the selected checker may go. */
  targets: Set<BoardSpot>;
  selected: BoardSpot | null;
  /** Which side sits at the bottom of the screen. */
  bottom: PlayerId;
}

export const BOARD_WIDTH = 960;
export const BOARD_HEIGHT = 620;

const COLORS = {
  table: 0x14102e,
  felt: 0x241d57,
  frame: 0xd4a943,
  pointA: 0x7a1f3d,
  pointB: 0x1f8a8a,
  bar: 0x1a1540,
  ivory: 0xf4ead5,
  ivoryEdge: 0xb08a3e,
  onyx: 0x2a2633,
  onyxEdge: 0x9a7bd0,
  highlight: 0xffd166,
  target: 0x5ef2c0,
  shield: 0x5ef2c0,
  mark: 0xff5d73,
};

const MARGIN = 24;
const POINT_W = 62;
const BAR_W = 56;
const OFF_W = 70;
const TOP = MARGIN;
const BOTTOM = BOARD_HEIGHT - MARGIN;
const POINT_H = 230;
const R = 24;

function colX(col: number): number {
  return MARGIN + col * POINT_W + (col >= 6 ? BAR_W : 0) + POINT_W / 2;
}

const BAR_X = MARGIN + 6 * POINT_W + BAR_W / 2;
const OFF_X = MARGIN + 12 * POINT_W + BAR_W + OFF_W / 2 + 8;

/** Screen placement for a point when `bottom` plays towards the bottom-right home. */
function pointPlacement(point: number, bottom: PlayerId): { x: number; top: boolean } {
  // White's home (1–6) sits bottom-right when white is at the bottom.
  const p = bottom === 'white' ? point : 25 - point;
  if (p >= 13) return { x: colX(p - 13), top: true };
  return { x: colX(12 - p), top: false };
}

export class BoardScene extends Phaser.Scene {
  private view: BoardView | null = null;
  private onSpot: (spot: BoardSpot) => void = () => {};
  private layer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('board');
  }

  create(): void {
    this.layer = this.add.container(0, 0);
    if (this.view) this.draw();
  }

  setHandler(handler: (spot: BoardSpot) => void): void {
    this.onSpot = handler;
  }

  show(view: BoardView): void {
    this.view = view;
    if (this.layer) this.draw();
  }

  private draw(): void {
    const view = this.view!;
    const layer = this.layer!;
    layer.removeAll(true);
    const g = this.add.graphics();
    layer.add(g);

    g.fillStyle(COLORS.table).fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    const boardRight = MARGIN + 12 * POINT_W + BAR_W;
    g.fillStyle(COLORS.felt).fillRect(MARGIN, TOP, boardRight - MARGIN, BOTTOM - TOP);
    g.fillStyle(COLORS.bar).fillRect(BAR_X - BAR_W / 2, TOP, BAR_W, BOTTOM - TOP);
    g.lineStyle(4, COLORS.frame).strokeRect(MARGIN, TOP, boardRight - MARGIN, BOTTOM - TOP);
    g.fillStyle(COLORS.bar).fillRect(OFF_X - OFF_W / 2, TOP, OFF_W, BOTTOM - TOP);
    g.lineStyle(3, COLORS.frame).strokeRect(OFF_X - OFF_W / 2, TOP, OFF_W, BOTTOM - TOP);

    for (let point = 1; point <= 24; point++) {
      const { x, top } = pointPlacement(point, view.bottom);
      const color = point % 2 === 0 ? COLORS.pointA : COLORS.pointB;
      const isTarget = view.targets.has(point);
      g.fillStyle(isTarget ? COLORS.target : color, isTarget ? 0.85 : 1);
      if (top) g.fillTriangle(x - POINT_W / 2 + 3, TOP, x + POINT_W / 2 - 3, TOP, x, TOP + POINT_H);
      else g.fillTriangle(x - POINT_W / 2 + 3, BOTTOM, x + POINT_W / 2 - 3, BOTTOM, x, BOTTOM - POINT_H);
      const label = this.add
        .text(x, top ? TOP - 2 : BOTTOM + 2, String(point), { fontFamily: 'monospace', fontSize: '12px', color: '#d4a943' })
        .setOrigin(0.5, top ? 1 : 0);
      layer.add(label);
      this.hitArea(x, top ? TOP + POINT_H / 2 : BOTTOM - POINT_H / 2, POINT_W, POINT_H + 20, point);
    }
    this.hitArea(BAR_X, BOARD_HEIGHT / 2, BAR_W, BOTTOM - TOP, 'bar');
    this.hitArea(OFF_X, BOARD_HEIGHT / 2, OFF_W, BOTTOM - TOP, 'off');
    if (view.targets.has('off')) {
      g.lineStyle(4, COLORS.target).strokeRect(OFF_X - OFF_W / 2 + 4, TOP + 4, OFF_W - 8, BOTTOM - TOP - 8);
    }

    this.drawCheckers(g, view);
  }

  private hitArea(x: number, y: number, w: number, h: number, spot: BoardSpot): void {
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.onSpot(spot));
    this.layer!.add(zone);
  }

  private drawCheckers(g: Phaser.GameObjects.Graphics, view: BoardView): void {
    const obs = view.observation;
    const shielded = new Set(obs.shields.map((s) => s.checkerId));
    const enchanted = new Map<string, string>();
    for (const player of ['white', 'black'] as const) {
      for (const jinn of obs.players[player].jinn) if (jinn.target) enchanted.set(jinn.target, jinn.id === 'amira' ? 'A' : 'R');
    }
    const marked = obs.turn?.hadiMark ?? null;

    const stacks = new Map<string, typeof obs.checkers[number][]>();
    for (const c of obs.checkers) {
      const key = c.location.kind === 'point' ? `p${c.location.point}` : `${c.location.kind}-${c.owner}`;
      stacks.set(key, [...(stacks.get(key) ?? []), c]);
    }

    for (const [key, checkers] of stacks) {
      const sorted = [...checkers].sort((a, b) => a.id.localeCompare(b.id));
      let x: number;
      let y0: number;
      let dir: number;
      let spot: BoardSpot;
      let maxVisible = 5;
      if (key.startsWith('p')) {
        const point = Number(key.slice(1));
        const place = pointPlacement(point, view.bottom);
        x = place.x;
        y0 = place.top ? TOP + R + 2 : BOTTOM - R - 2;
        dir = place.top ? 1 : -1;
        spot = point;
      } else {
        const [zoneKind, owner] = key.split('-') as ['bar' | 'off', PlayerId];
        const atBottom = owner === view.bottom;
        x = zoneKind === 'bar' ? BAR_X : OFF_X;
        // Barred checkers sit near the middle; borne-off checkers stack from the owner's edge.
        if (zoneKind === 'bar') {
          y0 = BOARD_HEIGHT / 2 + (atBottom ? R + 6 : -R - 6);
          dir = atBottom ? 1 : -1;
        } else {
          y0 = atBottom ? BOTTOM - 10 : TOP + 10;
          dir = atBottom ? -1 : 1;
        }
        spot = zoneKind;
        if (zoneKind === 'off') maxVisible = 15;
      }
      const step = kind(key) === 'off' ? 12 : Math.min(2 * R, (POINT_H - 2 * R) / Math.max(1, Math.min(sorted.length, maxVisible) - 1));
      sorted.forEach((checker, i) => {
        const visibleIndex = Math.min(i, maxVisible - 1);
        const y = y0 + dir * visibleIndex * (kind(key) === 'off' ? step : Math.min(step, 2 * R - 4));
        const ivory = checker.owner === 'white';
        if (kind(key) === 'off') {
          g.fillStyle(ivory ? COLORS.ivory : COLORS.onyx).fillRect(x - 26, y - 5, 52, 10);
          g.lineStyle(1, ivory ? COLORS.ivoryEdge : COLORS.onyxEdge).strokeRect(x - 26, y - 5, 52, 10);
          return;
        }
        g.fillStyle(ivory ? COLORS.ivory : COLORS.onyx).fillCircle(x, y, R);
        g.lineStyle(3, ivory ? COLORS.ivoryEdge : COLORS.onyxEdge).strokeCircle(x, y, R);
        g.lineStyle(1, ivory ? COLORS.ivoryEdge : COLORS.onyxEdge).strokeCircle(x, y, R - 8);
        if (shielded.has(checker.id)) g.lineStyle(4, COLORS.shield).strokeCircle(x, y, R + 3);
        if (marked === checker.id) g.lineStyle(3, COLORS.mark).strokeCircle(x, y, R - 3);
        const tag = enchanted.get(checker.id);
        if (tag) {
          this.layer!.add(
            this.add
              .text(x, y, tag, { fontFamily: 'monospace', fontSize: '18px', color: ivory ? '#7a1f3d' : '#ffd166', fontStyle: 'bold' })
              .setOrigin(0.5),
          );
        }
      });
      if (sorted.length > maxVisible && kind(key) !== 'off') {
        const y = y0 + dir * (maxVisible - 1) * Math.min(step, 2 * R - 4);
        this.layer!.add(
          this.add.text(x, y, String(sorted.length), { fontFamily: 'monospace', fontSize: '16px', color: '#d4a943', fontStyle: 'bold' }).setOrigin(0.5),
        );
      }
      if (view.sources.has(spot) && sorted.some((c) => c.owner === obs.viewer || view.observation.pending?.kind === 'move')) {
        const top = y0 + dir * (Math.min(sorted.length, maxVisible) - 1) * Math.min(step, 2 * R - 4);
        const color = view.selected === spot ? COLORS.target : COLORS.highlight;
        if (kind(key) !== 'off') g.lineStyle(4, color).strokeCircle(x, top, R + 2);
      }
    }
  }
}

function kind(key: string): 'point' | 'bar' | 'off' {
  return key.startsWith('p') ? 'point' : key.startsWith('bar') ? 'bar' : 'off';
}

export function createBoard(parent: HTMLElement): Promise<BoardScene> {
  return new Promise((resolve) => {
    const scene = new BoardScene();
    new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      backgroundColor: '#14102e',
      scene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
      callbacks: { postBoot: () => resolve(scene) },
    });
  });
}
