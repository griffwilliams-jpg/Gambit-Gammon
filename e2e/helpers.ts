import { expect, type Page } from '@playwright/test';

/** Minimal view of the app's state for assertions (read through the debug handle). */
export interface Snapshot {
  phase: string;
  pending: { kind: string; player?: string } | null;
  sequence: number;
  viewer: string;
}

export async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const app = (window as unknown as { gambitGammon: { session: { state: { phase: { kind: string }; pending: Snapshot['pending']; sequence: number }; viewer: string } } }).gambitGammon;
    const { state, viewer } = app.session;
    return { phase: state.phase.kind, pending: state.pending, sequence: state.sequence, viewer };
  });
}

/** Collects console errors and uncaught exceptions for a test. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

export async function startSeeded(page: Page, seed: string, query = ''): Promise<void> {
  await page.goto(`/?seed=${encodeURIComponent(seed)}${query}`);
  await expect(page.locator('#board canvas')).toBeVisible();
  await expect(page.locator('.status')).toBeVisible();
}

/**
 * Plays as the human by pressing the first offered decision button (or the
 * hot-seat handover button) until `done` holds or the step limit is reached.
 */
export async function playUntil(page: Page, done: (s: Snapshot) => boolean, maxSteps = 400): Promise<Snapshot> {
  for (let i = 0; i < maxSteps; i++) {
    const s = await snapshot(page);
    if (done(s) || s.phase === 'finished') return s;
    const handover = page.locator('.handover button');
    if (await handover.count()) {
      await handover.first().click();
      continue;
    }
    const buttons = page.locator('.decision button').filter({ hasNotText: /^(Cancel|Back)$/ });
    if ((await buttons.count()) > 0) await buttons.first().click();
    else await page.waitForTimeout(40);
  }
  return snapshot(page);
}

const MARGIN = 24;
const POINT_W = 62;
const BAR_W = 56;
const OFF_W = 70;
const BOARD_W = 960;
const BOARD_H = 620;

/** Page coordinates of a board spot, with white at the bottom (matches src/ui/board.ts). */
export async function spotPosition(page: Page, spot: number | 'bar' | 'off'): Promise<{ x: number; y: number }> {
  const box = (await page.locator('#board canvas').boundingBox())!;
  const scale = box.width / BOARD_W;
  let x: number;
  let y: number;
  if (spot === 'off') {
    x = MARGIN + 12 * POINT_W + BAR_W + OFF_W / 2 + 8;
    y = BOARD_H / 2;
  } else if (spot === 'bar') {
    x = MARGIN + 6 * POINT_W + BAR_W / 2;
    y = BOARD_H / 2;
  } else {
    const top = spot >= 13;
    const col = top ? spot - 13 : 12 - spot;
    x = MARGIN + col * POINT_W + (col >= 6 ? BAR_W : 0) + POINT_W / 2;
    y = top ? MARGIN + 90 : BOARD_H - MARGIN - 90;
  }
  return { x: box.x + x * scale, y: box.y + y * scale };
}
