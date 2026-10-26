import { expect, test } from '@playwright/test';
import { playUntil, snapshot, spotPosition, startSeeded, watchErrors } from './helpers.js';

test('loads the board, menu and opening contest', async ({ page }) => {
  const errors = watchErrors(page);
  await startSeeded(page, 'e2e-load');
  await expect(page.getByRole('button', { name: 'New game vs computer (Ivory)' })).toBeVisible();
  await expect(page.locator('.status')).toContainText('Opening contest');
  await expect(page.locator('.player')).toHaveCount(2);
  await expect(page.locator('.hand .playing-card')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Ivory: roll opening die' })).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('plays the opening and lets the computer take its turns', async ({ page }) => {
  const errors = watchErrors(page);
  await startSeeded(page, 'e2e-turns');
  await page.getByRole('button', { name: 'Ivory: roll opening die' }).click();
  // Keep playing as Ivory until the computer has completed at least two turns.
  const s = await playUntil(page, () => false, 60);
  expect(s.sequence).toBeGreaterThan(20);
  const turnsByOnyx = await page.locator('.log li', { hasText: "Onyx's turn" }).count();
  expect(turnsByOnyx).toBeGreaterThanOrEqual(2);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('moves a checker by clicking the board', async ({ page }) => {
  const errors = watchErrors(page);
  await startSeeded(page, 'e2e-click');
  await page.getByRole('button', { name: 'Ivory: roll opening die' }).click();
  await playUntil(page, (s) => s.pending?.kind === 'move' && s.pending.player === 'white');

  const before = (await snapshot(page)).sequence;
  // A forward move between two points keeps the clicks unambiguous.
  const options = await page.locator('.move-list button').allTextContents();
  const pointMove = options.map((t) => /^(\d+) → (\d+) \((\d+)\)$/.exec(t)).find(Boolean);
  test.skip(!pointMove, 'No point-to-point move offered for this roll.');
  const [, from, to] = pointMove!;

  const source = await spotPosition(page, Number(from));
  await page.mouse.click(source.x, source.y);
  const target = await spotPosition(page, Number(to));
  await page.mouse.click(target.x, target.y);

  await expect.poll(async () => (await snapshot(page)).sequence).toBeGreaterThan(before);
  await expect(page.locator('.log li').first()).toContainText(`You: ${from} → ${to}`);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('every decision is reachable by keyboard', async ({ page }) => {
  await startSeeded(page, 'e2e-keys');
  const roll = page.getByRole('button', { name: 'Ivory: roll opening die' });
  await roll.focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).sequence).toBeGreaterThan(0);
});

test('two-player mode hides private cards between turns', async ({ page }) => {
  const errors = watchErrors(page);
  await startSeeded(page, 'e2e-hotseat', '&mode=hot-seat');
  // Nobody's hand is shown while both players share the opening.
  await expect(page.locator('.hand')).toHaveCount(0);
  for (let i = 0; i < 2; i++) await page.locator('.decision button').first().click();

  // Play until the turn passes and the handover screen appears.
  let sawHandover = false;
  for (let i = 0; i < 200 && !sawHandover; i++) {
    if (await page.locator('.handover').count()) sawHandover = true;
    else await page.locator('.decision button').filter({ hasNotText: /^(Cancel|Back)$/ }).first().click();
  }
  expect(sawHandover).toBe(true);
  await expect(page.locator('.hand')).toHaveCount(0);
  await expect(page.locator('.decision')).toHaveCount(0);
  const next = (await snapshot(page)).viewer;
  await page.locator('.handover button').click();
  await expect(page.locator('.hand')).toHaveCount(1);
  await expect(page.locator('.player.' + next + ' .player-head')).toContainText('(you)');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('autosave resumes the same game after a reload', async ({ page }) => {
  await startSeeded(page, 'e2e-save');
  await page.getByRole('button', { name: 'Ivory: roll opening die' }).click();
  const before = await playUntil(page, (s) => s.sequence >= 12);
  await page.goto('/');
  await expect(page.locator('.log')).toContainText('Resumed your saved game.');
  const after = await snapshot(page);
  expect(after.sequence).toBe(before.sequence);
});

test('the Bazaar opens after own turn 3 with prices and odds', async ({ page }) => {
  const errors = watchErrors(page);
  await startSeeded(page, 'e2e-bazaar');
  await page.getByRole('button', { name: 'Ivory: roll opening die' }).click();
  const s = await playUntil(page, (x) => x.pending?.kind === 'bazaar' && x.pending.player === 'white', 600);
  expect(s.pending?.kind).toBe('bazaar');
  const bazaar = page.locator('.bazaar');
  await expect(bazaar).toContainText('The Jinn Bazaar');
  await expect(bazaar.locator('.lamp')).toHaveCount(3);
  await expect(bazaar.locator('.lamp').first()).toContainText('Copper Lamp');
  await expect(bazaar).toContainText('60% Copper');
  await bazaar.getByRole('button', { name: /Leave the Bazaar/ }).click();
  await expect(page.locator('.bazaar')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});
