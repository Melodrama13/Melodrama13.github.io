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

const assertNonZeroVisible = async (locator, name, { scrollIntoView = true } = {}) => {
  if (scrollIntoView) await locator.scrollIntoViewIfNeeded();
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

const prepareVisibleAnvoViewportCapture = async (panel) => {
  const capture = await panel.evaluate((element) => {
    const host = document.querySelector('.content-area');
    if (!(host instanceof HTMLElement)) throw new Error('Song Stats scroll host was not found');

    const hostRect = host.getBoundingClientRect();
    const panelBeforeScroll = element.getBoundingClientRect();
    const nextScrollTop = Math.max(0, Math.min(
      host.scrollHeight - host.clientHeight,
      host.scrollTop + panelBeforeScroll.top - hostRect.top
    ));
    host.scrollTop = nextScrollTop;

    const panelRect = element.getBoundingClientRect();
    const visibleTop = Math.max(panelRect.top, hostRect.top);
    const visibleBottom = Math.min(panelRect.bottom, hostRect.bottom);
    return {
      scrollTop: host.scrollTop,
      styleContractScrollTop: Math.round(host.scrollTop + (panelRect.height - (visibleBottom - visibleTop)) / 2),
      panelHeight: panelRect.height,
      visibleCardCount: [...element.querySelectorAll('.song-anvo-card')].filter((card) => {
        const rect = card.getBoundingClientRect();
        return rect.bottom > hostRect.top && rect.top < hostRect.bottom;
      }).length,
      heading: element.querySelector('h2')?.textContent?.trim(),
      clip: {
        x: Math.round(panelRect.left),
        y: Math.round(visibleTop),
        width: Math.round(panelRect.width),
        height: Math.round(visibleBottom - visibleTop)
      }
    };
  });

  expect(capture.scrollTop, 'Anvo viewport capture must use an explicit host position').toBeGreaterThan(0);
  expect(capture.clip.height, 'Anvo viewport capture must stay within the scroll host').toBeGreaterThan(0);
  expect(capture.clip.height).toBeLessThan(capture.panelHeight);
  expect(capture.heading).toBe('Anvo统计');
  expect(capture.visibleCardCount, 'Anvo viewport capture must include rendered cards').toBeGreaterThan(0);
  return capture;
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
  const contentArea = page.locator('.content-area');
  const initialContentScrollTop = await contentArea.evaluate((element) => element.scrollTop);
  await assertNonZeroVisible(anvoPanel, 'Song Stats Anvo panel', { scrollIntoView: false });
  expect(await contentArea.evaluate((element) => element.scrollTop)).toBe(initialContentScrollTop);

  const anvoCapture = await prepareVisibleAnvoViewportCapture(anvoPanel);
  await expect(page).toHaveScreenshot('songs-anvo-desktop.png', {
    clip: anvoCapture.clip,
    animations: 'disabled',
    caret: 'hide'
  });
  expect(await contentArea.evaluate((element) => element.scrollTop)).toBe(anvoCapture.scrollTop);
  await contentArea.evaluate((element, scrollTop) => { element.scrollTop = scrollTop; }, anvoCapture.styleContractScrollTop);
  expect(await contentArea.evaluate((element) => element.scrollTop)).toBe(anvoCapture.styleContractScrollTop);
  recordStyleContract('songs-desktop', await readStyleContract(page, styleSelectors.songs));

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
