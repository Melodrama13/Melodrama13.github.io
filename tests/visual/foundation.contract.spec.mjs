import { test, expect } from 'playwright/test';
import { gotoUiState, settleUi } from './fixtures.mjs';

const expectedTokens = {
  '--ui-shell-glass-border': 'rgba(255, 255, 255, 0.72)',
  '--ui-stats-nav-width': '220px',
  '--ui-control-border': '#cbd5e1',
  '--ui-motion-control': '0.16s ease',
  '--ui-motion-shimmer-duration': '1.05s'
};

const readRootTokens = (page) => page.evaluate((names) => {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()]));
}, Object.keys(expectedTokens));

const isolateSongPill = (locator) => locator.evaluate((element) => {
  const root = element.closest('.pjsk-song-stats');
  if (!root) throw new Error('SongStats root was not found for pill isolation');

  const state = {
    buttonClassName: element.className,
    disabled: element.disabled,
    rootClassName: root.className
  };
  element.className = 'pjsk-ui-btn-pill';
  root.dataset.foundationTestSongRoot = 'true';
  root.classList.remove('pjsk-song-stats');
  return state;
});

const restoreSongPill = (locator, state) => locator.evaluate((element, original) => {
  const root = document.querySelector('[data-foundation-test-song-root]');
  if (!root) throw new Error('SongStats root was not found while restoring pill isolation');

  element.className = original.buttonClassName;
  element.disabled = original.disabled;
  root.className = original.rootClassName;
  delete root.dataset.foundationTestSongRoot;
}, state);

test('foundation tokens and existing global controls retain their contracts', async ({ page }) => {
  await gotoUiState(page, { tab: 'songs', width: 1440, height: 1000 });
  await settleUi(page);

  expect(await readRootTokens(page)).toEqual(expectedTokens);

  const pill = page.locator('#panel-another-vocal .pjsk-ui-btn-pill').first();
  await pill.scrollIntoViewIfNeeded();
  const pillState = await isolateSongPill(pill);
  try {
    await expect(pill).toHaveCSS('border', '1px solid rgb(203, 213, 225)');
    await expect(pill).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(pill).toHaveCSS('color', 'rgb(51, 65, 85)');
    await expect(pill).toHaveCSS('border-radius', '999px');
    await expect(pill).toHaveCSS('padding', '4px 8px');
    await expect(pill).toHaveCSS('font-size', '12.16px');
    await expect(pill).toHaveCSS('transition-property', 'all');
    await expect(pill).toHaveCSS('transition-duration', '0.16s');
    await expect(pill).toHaveCSS('transition-timing-function', 'ease');

    await pill.hover();
    await expect(pill).toHaveCSS('background-color', 'rgb(248, 250, 252)');
    await expect(pill).toHaveCSS('border-color', 'rgb(148, 163, 184)');

    const pillBox = await pill.boundingBox();
    expect(pillBox).not.toBeNull();
    await page.mouse.move(pillBox.x + pillBox.width / 2, pillBox.y + pillBox.height / 2);
    await page.mouse.down();
    await expect(pill).toHaveCSS('transform', 'matrix(0.96, 0, 0, 0.96, 0, 0)');
    await page.mouse.up();
    await expect(pill).toHaveCSS('transform', 'none');

    await pill.evaluate((element) => { element.disabled = true; });
    await expect(pill).toHaveCSS('opacity', '0.6');
    await expect(pill).toHaveCSS('pointer-events', 'none');
  } finally {
    await restoreSongPill(pill, pillState);
  }

  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await settleUi(page);

  const cardExportButton = page.locator('#panel-dist .card-export-btn').first();
  await cardExportButton.scrollIntoViewIfNeeded();
  const cardBox = await cardExportButton.boundingBox();
  expect(cardBox).not.toBeNull();
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await expect(cardExportButton).toHaveCSS('filter', 'brightness(0.86)');
  await expect(cardExportButton).toHaveCSS('transform', 'matrix(0.97, 0, 0, 0.97, 0, 1)');
  await page.mouse.up();
  await expect(cardExportButton).toHaveCSS('filter', 'none');
  await expect(cardExportButton).toHaveCSS('transform', 'none');

  const cardWasDisabled = await cardExportButton.isDisabled();
  try {
    await cardExportButton.evaluate((element) => { element.disabled = true; });
    await expect(cardExportButton).toHaveCSS('opacity', '0.6');
    await expect(cardExportButton).toHaveCSS('cursor', 'not-allowed');
  } finally {
    await cardExportButton.evaluate((element, disabled) => { element.disabled = disabled; }, cardWasDisabled);
  }
});
