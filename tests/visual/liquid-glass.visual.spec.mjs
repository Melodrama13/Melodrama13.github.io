import { test, expect } from 'playwright/test';

import { gotoUiState, setLiquidGlassMode, settleUi } from './fixtures.mjs';

const openUnsavedPredictSwitchDialog = async (page) => {
  const eventRows = page.locator('.event-item');
  const eventCount = await eventRows.count();
  let editorRowIndex = -1;

  for (let index = eventCount - 1; index >= Math.max(0, eventCount - 8); index -= 1) {
    const row = eventRows.nth(index);
    await row.scrollIntoViewIfNeeded();
    await row.click();
    if (await page.locator('.predict-drawer').isVisible()) {
      editorRowIndex = index;
      break;
    }
  }

  expect(editorRowIndex).toBeGreaterThanOrEqual(0);
  const attributeSelect = page.locator('.predict-drawer .global-config-bar select').nth(2);
  const currentAttribute = await attributeSelect.inputValue();
  const nextAttribute = await attributeSelect.locator('option').evaluateAll((options, current) => (
    options.map((option) => option.value).find((value) => value !== current)
  ), currentAttribute);
  expect(nextAttribute).toBeTruthy();
  await attributeSelect.selectOption(nextAttribute);

  for (let index = eventCount - 1; index >= Math.max(0, eventCount - 8); index -= 1) {
    if (index === editorRowIndex) continue;
    const row = eventRows.nth(index);
    await row.scrollIntoViewIfNeeded();
    await row.click();
    if (await page.locator('.predict-switch-dialog-card').isVisible()) return;
  }

  throw new Error('The existing unsaved predict-switch dialog did not open');
};

test('Chromium shell owns one connected SVG edge pipeline in filter order', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000 });
  await setLiquidGlassMode(page, 'refractive');
  await settleUi(page);

  const host = page.locator('#ui-liquid-glass-filter-host');
  const shell = page.locator('.nav-tabs');
  await expect(host).toHaveCount(1);
  await expect(shell).toHaveClass(/ui-liquid-glass--refractive/);
  await expect(shell).toHaveAttribute('data-liquid-glass-interactive', '');
  expect(await shell.evaluate((element) => element.style.backdropFilter))
    .toMatch(/^url\("?#ui-liquid-glass-\d+"?\)$/);
  await expect(host.locator('filter')).toHaveCount(1);

  const pipeline = await host.locator('filter').evaluate((filter) => (
    [...filter.children].map((element) => element.tagName.toLowerCase())
  ));
  expect(pipeline).toEqual(['feimage', 'fedisplacementmap', 'fegaussianblur']);
  await expect(host.locator('feImage')).toHaveCount(1);
  await expect(host.locator('feDisplacementMap')).toHaveCount(1);
  await expect(host.locator('feGaussianBlur')).toHaveCount(1);
});

test('forced frosted and opaque modes retain a visible fallback without SVG displacement', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 390, height: 844 });
  const shell = page.locator('.nav-tabs');

  await setLiquidGlassMode(page, 'frosted');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveCSS('background-image', /gradient/);
  await expect(shell).toHaveCSS('backdrop-filter', /^(?!.*url\().+/);

  await setLiquidGlassMode(page, 'opaque');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveCSS('background-color', 'rgb(248, 250, 252)');
  await expect(shell).toHaveCSS('background-image', 'none');
  await expect(shell).toHaveCSS('box-shadow', 'none');
  await expect(shell).toHaveCSS('backdrop-filter', 'none');
});

test('regular and modal tiers stay frosted while content surfaces remain outside refraction', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await setLiquidGlassMode(page, 'refractive');
  await settleUi(page);

  const sourceTrigger = page.locator('.source-trigger');
  await sourceTrigger.click();
  const sourceMenu = page.locator('.source-menu');
  await expect(sourceMenu).toBeVisible();
  await expect(sourceMenu).toHaveClass(/ui-liquid-glass--regular/);
  await expect(sourceMenu).not.toHaveAttribute('data-liquid-glass-interactive');
  await expect(sourceMenu.locator('.source-list')).toHaveCSS('backdrop-filter', 'none');

  const filterBar = page.locator('.filter-bar');
  await expect(filterBar).toHaveClass(/ui-liquid-glass--regular/);
  await expect(filterBar).not.toHaveAttribute('data-liquid-glass-interactive');
  await filterBar.locator('button[title="筛选面板"]').click();
  const filterPanel = page.locator('.filter-panel');
  await expect(filterPanel).toBeVisible();
  await expect(filterPanel).toHaveClass(/ui-liquid-glass--regular/);
  await expect(filterPanel).not.toHaveAttribute('data-liquid-glass-interactive');
  await expect(page.locator('.event-item').first()).not.toHaveClass(/ui-liquid-glass/);

  await openUnsavedPredictSwitchDialog(page);
  const modal = page.locator('.predict-switch-dialog-card');
  await expect(modal).toHaveClass(/ui-liquid-glass--modal/);
  await expect(modal).not.toHaveAttribute('data-liquid-glass-interactive');

  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await setLiquidGlassMode(page, 'refractive');
  await expect(page.locator('#panel-dist')).not.toHaveClass(/ui-liquid-glass/);
  await expect(page.locator('#panel-dist')).not.toHaveAttribute('data-liquid-glass-interactive');

  await gotoUiState(page, { tab: 'songs', width: 1440, height: 1000 });
  await setLiquidGlassMode(page, 'refractive');
  await expect(page.locator('#panel-another-vocal')).not.toHaveClass(/ui-liquid-glass/);
  await expect(page.locator('#panel-another-vocal')).not.toHaveAttribute('data-liquid-glass-interactive');
});

test('switching away from an async refractive tab releases its filter and pointer state', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await setLiquidGlassMode(page, 'refractive');
  await settleUi(page);

  const shellFilterBeforeTabSwitch = await page.locator('.nav-tabs').evaluate((element) => element.style.backdropFilter);
  const statsNavigation = page.locator('.stats-nav');
  await expect(statsNavigation).toHaveAttribute('data-liquid-glass-interactive', '');
  await statsNavigation.evaluate((element) => {
    window.__liquidGlassVisualDetachedSurface = element;
  });

  const bounds = await statsNavigation.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds.x + bounds.width * 0.75, bounds.y + bounds.height * 0.25);
  await expect.poll(() => statsNavigation.evaluate((element) => (
    element.style.getPropertyValue('--ui-glass-pointer-x')
  ))).toBe('75%');

  await page.locator('.nav-tabs > button').filter({ hasText: '历史活动一览' }).click();
  await expect(page.locator('.event-history')).toBeVisible();
  await settleUi(page);

  const retiredSurface = await page.evaluate(() => {
    const surface = window.__liquidGlassVisualDetachedSurface;
    return {
      isConnected: surface?.isConnected,
      interactive: surface?.hasAttribute('data-liquid-glass-interactive'),
      backdropFilter: surface?.style.backdropFilter,
      pointerX: surface?.style.getPropertyValue('--ui-glass-pointer-x'),
      pointerY: surface?.style.getPropertyValue('--ui-glass-pointer-y')
    };
  });

  expect(retiredSurface).toEqual({
    isConnected: false,
    interactive: false,
    backdropFilter: '',
    pointerX: '',
    pointerY: ''
  });
  await expect(page.locator('#ui-liquid-glass-filter-host filter')).toHaveCount(1);
  expect(await page.locator('.nav-tabs').evaluate((element) => element.style.backdropFilter))
    .toBe(shellFilterBeforeTabSwitch);
  expect(await page.locator('.nav-tabs').evaluate((element) => {
    const filterId = element.style.backdropFilter.match(/#([^\")]+)/)?.[1];
    return Boolean(filterId && document.getElementById(filterId)?.isConnected);
  })).toBe(true);

  await page.locator('.nav-tabs > button').filter({ hasText: '统计面板' }).click();
  await expect(page.locator('.pjsk-stats')).toBeVisible();
  await settleUi(page);
  await expect(page.locator('.stats-nav')).toHaveAttribute('data-liquid-glass-interactive', '');
  await expect(page.locator('[data-liquid-glass-interactive]')).toHaveCount(2);
  await expect(page.locator('#ui-liquid-glass-filter-host filter')).toHaveCount(2);
});

test('liquid-glass card stats compact sidebar is stable at 375px', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 375, height: 812 });
  await setLiquidGlassMode(page, 'refractive');
  const trigger = page.locator('.floating-menu-btn');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.locator('.stats-nav')).toBeVisible();
  await settleUi(page);
  await expect(page).toHaveScreenshot('liquid-glass-card-stats-375-sidebar.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('liquid-glass history compact filter is stable at 390px', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 390, height: 844, fullHistory: true });
  await setLiquidGlassMode(page, 'refractive');
  await page.locator('.filter-bar button[title="筛选面板"]').click();
  await expect(page.locator('.filter-panel')).toBeVisible();
  await settleUi(page);
  await expect(page).toHaveScreenshot('liquid-glass-history-390-filter.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('liquid-glass card stats preserves the exact 768px boundary', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 768, height: 900 });
  await setLiquidGlassMode(page, 'refractive');
  await page.locator('.floating-menu-btn').click();
  await expect(page.locator('.stats-nav')).toBeVisible();
  await settleUi(page);
  await expect(page).toHaveScreenshot('liquid-glass-card-stats-768-boundary.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('liquid-glass history preserves the compact 900px boundary', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 900, height: 900, fullHistory: true });
  await setLiquidGlassMode(page, 'refractive');
  await page.locator('.filter-bar button[title="筛选面板"]').click();
  await expect(page.locator('.filter-panel')).toBeVisible();
  await settleUi(page);
  await expect(page).toHaveScreenshot('liquid-glass-history-900-compact-boundary.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('liquid-glass card stats preserves the 1200px export boundary', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 1200, height: 900 });
  await setLiquidGlassMode(page, 'refractive');
  await page.locator('#panel-dist').scrollIntoViewIfNeeded();
  await settleUi(page);
  await expect(page).toHaveScreenshot('liquid-glass-card-stats-1200-export-boundary.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('liquid-glass desktop stats navigation is stable at 1440px', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await setLiquidGlassMode(page, 'refractive');
  await settleUi(page);
  await expect(page).toHaveScreenshot('liquid-glass-card-stats-1440-navigation.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('liquid-glass desktop data-source menu is stable at 1440px', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await setLiquidGlassMode(page, 'refractive');
  await page.locator('.source-trigger').click();
  await expect(page.locator('.source-menu-floating')).toBeVisible();
  await settleUi(page);
  await expect(page).toHaveScreenshot('liquid-glass-history-1440-source-menu.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});
