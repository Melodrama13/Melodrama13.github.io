import { test, expect } from 'playwright/test';
import {
  assertNoViewportOverflow,
  expectValidPng,
  gotoUiState,
  settleUi
} from './fixtures.mjs';

const sourceRectOf = async (locator, name) => {
  const rect = await locator.boundingBox();
  expect(rect, `${name} must have a renderable source rectangle`).not.toBeNull();
  expect(rect.width, `${name} source width`).toBeGreaterThan(0);
  expect(rect.height, `${name} source height`).toBeGreaterThan(0);
  return rect;
};

const validateDownload = async ({ page, sourceLocator, sourceName, buttonLocator, snapshotName, ignoreAspectRatio = false }) => {
  const sourceRect = await sourceRectOf(sourceLocator, sourceName);
  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
  await buttonLocator.click();
  const download = await downloadPromise;
  await expectValidPng({
    page,
    download,
    sourceRect: ignoreAspectRatio ? { ...sourceRect, ignoreAspectRatio: true } : sourceRect,
    snapshotName
  });
};

test('Card Stats PNG export produces a non-white html-to-image result', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await settleUi(page);
  const panel = page.locator('#panel-dist');
  await panel.scrollIntoViewIfNeeded();
  await settleUi(page);
  await validateDownload({
    page,
    sourceLocator: panel,
    sourceName: 'Card Stats distribution panel',
    buttonLocator: panel.locator('.card-export-btn').first(),
    snapshotName: 'card-panel-export.png'
  });
});

test('Song Anvo PNG export covers image and 1201px fill modes', async ({ page }) => {
  await gotoUiState(page, { tab: 'songs', width: 1440, height: 1000 });
  await settleUi(page);
  const panel = page.locator('#panel-another-vocal');
  await panel.scrollIntoViewIfNeeded();
  await settleUi(page);

  const imageToggle = panel.locator('label').filter({ hasText: '曲绘显示' }).locator('input').first();
  await imageToggle.check();
  await settleUi(page);
  await validateDownload({
    page,
    sourceLocator: panel,
    sourceName: 'Song Anvo image panel',
    buttonLocator: panel.locator('.song-export-btn').first(),
    snapshotName: 'song-anvo-image-export.png'
  });

  await page.setViewportSize({ width: 1201, height: 1000 });
  await settleUi(page);
  const fillToggle = panel.locator('label').filter({ hasText: '铺满显示' }).locator('input').first();
  await expect(fillToggle).toBeVisible();
  await fillToggle.check();
  await settleUi(page);
  await validateDownload({
    page,
    sourceLocator: panel,
    sourceName: 'Song Anvo fill panel',
    buttonLocator: panel.locator('.song-export-btn').first(),
    snapshotName: 'song-anvo-fill-export.png'
  });
});

test('Event History predicted range export produces a non-white html-to-image result', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);
  await page.locator('.source-trigger').click();
  const menu = page.locator('.source-menu-floating');
  await expect(menu).toBeVisible();
  await menu.locator('button').filter({ hasText: '预测截图' }).click();

  const rangeInputs = page.locator('.source-export-range-input');
  await expect(rangeInputs).toHaveCount(2);
  await rangeInputs.nth(0).fill('226');
  await rangeInputs.nth(1).fill('226');
  const historyList = page.locator('.history-list');
  await validateDownload({
    page,
    sourceLocator: historyList,
    sourceName: 'Event History list',
    buttonLocator: page.locator('.source-export-confirm').getByRole('button', { name: /确认导出PNG/ }),
    snapshotName: 'history-predicted-export.png',
    ignoreAspectRatio: true
  });
});

test('Special Predict PNG export uses the unlocked default canvas state', async ({ page }) => {
  await gotoUiState(page, {
    tab: 'specialPredict',
    width: 1440,
    height: 1000,
    unlockSpecialPredict: true
  });
  await settleUi(page);
  const canvas = page.locator('.special-canvas');
  await assertNoViewportOverflow(page);
  await validateDownload({
    page,
    sourceLocator: canvas,
    sourceName: 'Special Predict canvas',
    buttonLocator: page.locator('.special-action-btn').filter({ hasText: '导出 PNG' }),
    snapshotName: 'special-predict-export.png'
  });
});
