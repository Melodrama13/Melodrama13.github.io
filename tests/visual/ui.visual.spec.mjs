import { test, expect } from 'playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  UI_STORAGE_KEYS,
  assertNoViewportOverflow,
  gotoUiState,
  readStyleContract,
  settleUi
} from './fixtures.mjs';
import {
  isExplicitStyleContractUpdate,
  mergeStyleContract,
  pickStyleContractEntries
} from '../../src/utils/styleContract.js';

const STYLE_CONTRACT_PATH = fileURLToPath(new URL('./style-contract.json', import.meta.url));
const styleContracts = new Map();

const recordStyleContract = (name, value) => {
  styleContracts.set(name, value);
};

const saveOrAssertStyleContract = async (testInfo) => {
  if (styleContracts.size === 0) return;
  const current = Object.fromEntries([...styleContracts.entries()].sort(([left], [right]) => left.localeCompare(right)));
  const expected = JSON.parse(await readFile(STYLE_CONTRACT_PATH, 'utf8'));
  if (isExplicitStyleContractUpdate(testInfo.config.updateSnapshots)) {
    const merged = mergeStyleContract(expected, current);
    await writeFile(STYLE_CONTRACT_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
    return;
  }

  expect(current).toEqual(pickStyleContractEntries(expected, current));
};

const styleSelectors = Object.freeze({
  history: {
    navTabs: '.nav-tabs',
    featureNavigation: '.filter-bar',
    representativePanel: '.event-item'
  },
  stats: {
    navTabs: '.nav-tabs',
    featureNavigation: '.stats-nav',
    representativePanel: '#panel-dist'
  },
  songs: {
    navTabs: '.nav-tabs',
    featureNavigation: '.stats-nav',
    representativePanel: '#panel-another-vocal'
  }
});

const VIEWPORTS = [
  [375, 667], [667, 375], [520, 800], [521, 800],
  [699, 800], [700, 800], [701, 800],
  [760, 800], [761, 800], [768, 800], [769, 800],
  [900, 800], [901, 800], [1000, 800], [1001, 800],
  [1200, 900], [1201, 900], [1360, 900], [1361, 900], [1440, 900]
];

const CARD_BOUNDARY_WIDTHS = [760, 761, 768, 769, 900, 901, 1200, 1201, 1360, 1361];
const SONG_BOUNDARY_WIDTHS = [699, 700, 701, 900, 901, 1200, 1201];
const HISTORY_BOUNDARY_WIDTHS = [900, 901, 1000, 1001, 1200, 1201];

const assertNonZeroVisible = async (locator, name) => {
  await locator.scrollIntoViewIfNeeded();
  const geometry = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      width: rect.width,
      height: rect.height,
      display: style.display,
      visibility: style.visibility
    };
  });
  expect(geometry.width, `${name} width`).toBeGreaterThan(0);
  expect(geometry.height, `${name} height`).toBeGreaterThan(0);
  expect(geometry.display, `${name} display`).not.toBe('none');
  expect(geometry.visibility, `${name} visibility`).not.toBe('hidden');
};

const stabilizeSongPanelScroll = async (page, locator) => {
  await locator.scrollIntoViewIfNeeded();
  await settleUi(page);
  await page.evaluate((selector) => {
    const host = document.querySelector('.content-area');
    const target = document.querySelector(selector);
    if (!(host instanceof HTMLElement) || !(target instanceof HTMLElement)) return;

    const hostRect = host.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetTop = host.scrollTop + targetRect.top - hostRect.top;
    const centeredTop = targetTop - ((host.clientHeight - targetRect.height) / 2);
    const maxScrollTop = Math.max(0, host.scrollHeight - host.clientHeight);
    host.scrollTop = Math.max(0, Math.min(maxScrollTop, centeredTop));
  }, '#panel-another-vocal');
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
};

test.afterAll(async ({}, testInfo) => {
  await saveOrAssertStyleContract(testInfo);
});

test('history desktop captures the source menu and style contract', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);
  await page.locator('.source-trigger').click();
  await expect(page.locator('.source-menu-floating')).toBeVisible();
  await settleUi(page);

  recordStyleContract('history-desktop', await readStyleContract(page, styleSelectors.history));
  await expect(page).toHaveScreenshot('history-desktop-source-menu.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('history compact captures the current compact surface and style contract', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 390, height: 844, fullHistory: true });
  await settleUi(page);

  recordStyleContract('history-compact', await readStyleContract(page, styleSelectors.history));
  await expect(page).toHaveScreenshot('history-compact.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('card stats desktop captures the navigation and distribution panel', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await settleUi(page);
  await assertNonZeroVisible(page.locator('.stats-layout'), 'Card Stats layout');
  await assertNonZeroVisible(page.locator('#panel-dist'), 'Card Stats distribution panel');

  recordStyleContract('stats-desktop', await readStyleContract(page, styleSelectors.stats));
  await expect(page).toHaveScreenshot('stats-desktop.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('card stats compact captures the compact distribution panel', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 390, height: 844 });
  await settleUi(page);
  await assertNonZeroVisible(page.locator('.stats-layout'), 'compact Card Stats layout');
  await assertNonZeroVisible(page.locator('#panel-dist'), 'compact Card Stats distribution panel');

  recordStyleContract('stats-compact', await readStyleContract(page, styleSelectors.stats));
  await expect(page).toHaveScreenshot('stats-compact.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('card stats applies compact subsection rules through 768px', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 768, height: 800 });
  await settleUi(page);
  await expect(page.locator('.section-head.section-head-sub').first()).toHaveCSS('align-items', 'center');
  await expect(page.locator('.nuigurumi-mobile-meta-head').first()).toHaveCSS('display', 'table-cell');

  await page.setViewportSize({ width: 769, height: 800 });
  await settleUi(page);
  await expect(page.locator('.section-head.section-head-sub').first()).toHaveCSS('align-items', 'flex-start');
  await expect(page.locator('.nuigurumi-mobile-meta-head').first()).toHaveCSS('display', 'none');
});

test('song stats captures the Anvo image panel and compact style contract', async ({ page }) => {
  await gotoUiState(page, { tab: 'songs', width: 1440, height: 1000 });
  await settleUi(page);
  const anvoPanel = page.locator('#panel-another-vocal');
  await stabilizeSongPanelScroll(page, anvoPanel);
  await assertNonZeroVisible(anvoPanel, 'Song Stats Anvo panel');

  recordStyleContract('songs-desktop', await readStyleContract(page, styleSelectors.songs));
  await expect(anvoPanel).toHaveScreenshot('songs-anvo-desktop.png', {
    animations: 'disabled',
    caret: 'hide'
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await settleUi(page);
  recordStyleContract('songs-compact', await readStyleContract(page, styleSelectors.songs));
});

test('special predict remains locked without a credential', async ({ page }) => {
  await gotoUiState(page, { tab: 'specialPredict', width: 390, height: 844 });
  await settleUi(page);
  await expect(page.locator('.special-lock-panel')).toBeVisible();
  await expect(page.locator('.special-generator-shell')).toHaveCount(0);
  await expect(page).toHaveScreenshot('special-predict-locked-compact.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('special predict unlocks through the existing session flag only', async ({ page }) => {
  await gotoUiState(page, {
    tab: 'specialPredict',
    width: 1440,
    height: 1000,
    unlockSpecialPredict: true
  });
  await settleUi(page);
  await expect(page.locator('.special-generator-shell')).toBeVisible();
  await expect(page.locator('.special-lock-panel')).toHaveCount(0);
  await expect(page).toHaveScreenshot('special-predict-unlocked-desktop.png', {
    animations: 'disabled',
    caret: 'hide'
  });

  expect(await page.evaluate((key) => sessionStorage.getItem(key), UI_STORAGE_KEYS.specialUnlocked)).toBe('1');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => /password|hash|key/i.test(key)))).toEqual([]);
});

test('canonical viewport probes preserve Card Stats geometry', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 900 });
  for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height });
    await settleUi(page);
    await assertNoViewportOverflow(page);
    if (CARD_BOUNDARY_WIDTHS.includes(width)) {
      await assertNonZeroVisible(page.locator('#panel-dist'), `Card Stats panel at ${width}px`);
    }
  }
});

test('canonical viewport probes preserve Song Stats geometry', async ({ page }) => {
  await gotoUiState(page, { tab: 'songs', width: 1440, height: 900 });
  for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height });
    await settleUi(page);
    await assertNoViewportOverflow(page);
    if (SONG_BOUNDARY_WIDTHS.includes(width)) {
      await assertNonZeroVisible(page.locator('#panel-another-vocal'), `Song Stats Anvo panel at ${width}px`);
    }
  }
});

test('canonical viewport probes preserve Event History geometry', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 900, fullHistory: true });
  for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height });
    await settleUi(page);
    await assertNoViewportOverflow(page);
    if (HISTORY_BOUNDARY_WIDTHS.includes(width)) {
      await assertNonZeroVisible(page.locator('.event-history'), `Event History at ${width}px`);
      await assertNonZeroVisible(page.locator('.event-item').first(), `Event History first item at ${width}px`);
    }
  }
});
