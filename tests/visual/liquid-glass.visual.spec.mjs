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

const openPredictDrawer = async (page) => {
  const eventRows = page.locator('.event-item');
  const eventCount = await eventRows.count();

  for (let index = eventCount - 1; index >= Math.max(0, eventCount - 8); index -= 1) {
    const row = eventRows.nth(index);
    await row.scrollIntoViewIfNeeded();
    await row.click();
    if (await page.locator('.predict-drawer').isVisible()) return;
  }

  throw new Error('The existing Event History rows did not open the Predict drawer');
};

const refractiveFilterPattern = /^url\("?#ui-liquid-glass-\d+"?\)$/;

const expectRefractiveOuterSurface = async (root, descendantSelector, label) => {
  await expect(root).toHaveAttribute('data-liquid-glass-interactive', '');
  await expect.poll(() => root.evaluate((element) => element.style.backdropFilter), {
    message: `${label} must own an inline SVG displacement filter`
  }).toMatch(refractiveFilterPattern);
  await expect(root).toHaveCSS('backdrop-filter', refractiveFilterPattern);

  const descendantStates = await root.locator(descendantSelector).evaluateAll((elements) => elements.map((element) => ({
    backdropFilter: getComputedStyle(element).backdropFilter,
    interactive: element.hasAttribute('data-liquid-glass-interactive'),
    directiveAttribute: element.hasAttribute('v-liquid-glass')
  })));
  expect(descendantStates.length, `${label} needs a representative descendant`).toBeGreaterThan(0);
  for (const [index, state] of descendantStates.entries()) {
    expect(state.backdropFilter, `${label} descendant ${index} backdrop filter`).toBe('none');
    expect(state.interactive, `${label} descendant ${index} must not own refraction`).toBe(false);
    expect(state.directiveAttribute, `${label} descendant ${index} must not retain a directive attribute`).toBe(false);
  }
};

const readSurfaceMaterial = (root) => root.evaluate((element) => {
  const style = getComputedStyle(element);
  const parseRgb = (value) => {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const channels = match[1].split(',').map((channel) => Number.parseFloat(channel.trim()));
    if (channels.length < 3 || channels.some((channel) => !Number.isFinite(channel))) return null;
    return {
      rgb: channels.slice(0, 3).map((channel) => channel / 255),
      alpha: channels.length >= 4 ? channels[3] : 1
    };
  };
  const relativeLuminance = (value) => {
    const parsed = parseRgb(value);
    if (!parsed) return null;
    return parsed.rgb.reduce((total, channel, index) => {
      const linear = channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      return total + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
  };
  const backgroundLuminance = relativeLuminance(style.backgroundColor);
  const textLuminance = relativeLuminance(style.color);
  const contrast = backgroundLuminance === null || textLuminance === null
    ? null
    : (Math.max(backgroundLuminance, textLuminance) + 0.05)
      / (Math.min(backgroundLuminance, textLuminance) + 0.05);
  return {
    inlineBackdropFilter: element.style.backdropFilter,
    backdropFilter: style.backdropFilter,
    backgroundImage: style.backgroundImage,
    backgroundColor: style.backgroundColor,
    backgroundAlpha: parseRgb(style.backgroundColor)?.alpha ?? null,
    contrast
  };
});

const setEmulatedMediaFeature = async (mediaSession, name, value) => {
  await mediaSession.send('Emulation.setEmulatedMedia', {
    features: [{ name, value }]
  });
};

const assertFrostedFallbacks = async (page, roots, label) => {
  await expect.poll(() => page.locator('#ui-liquid-glass-filter-host filter').count(), {
    message: `${label} frosted filter nodes must be released`
  }).toBe(0);
  for (const root of roots) {
    const material = await readSurfaceMaterial(root);
    expect(material.inlineBackdropFilter, `${label} frosted inline filter`).toBe('');
    expect(material.backdropFilter, `${label} frosted computed filter`).not.toContain('url(');
    expect(material.backdropFilter, `${label} frosted computed filter`).toMatch(/blur\(/);
    expect(material.backgroundImage, `${label} frosted background`).toContain('linear-gradient');
  }
};

const assertOpaqueFallbacks = async (page, roots, label) => {
  await expect.poll(() => page.locator('#ui-liquid-glass-filter-host filter').count(), {
    message: `${label} opaque filter nodes must be released`
  }).toBe(0);
  for (const root of roots) {
    const material = await readSurfaceMaterial(root);
    expect(material.inlineBackdropFilter, `${label} opaque inline filter`).toBe('');
    expect(material.backdropFilter, `${label} opaque computed filter`).toBe('none');
    expect(material.backgroundImage, `${label} opaque background image`).toBe('none');
    expect(material.backgroundAlpha, `${label} opaque background alpha`).toBe(1);
    expect(material.contrast, `${label} opaque text contrast`).toBeGreaterThanOrEqual(4.5);
  }
};

const assertReducedTransparencyFallback = async (page, mediaSession, roots, label) => {
  await setEmulatedMediaFeature(mediaSession, 'prefers-reduced-transparency', 'reduce');
  await expect.poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.uiGlassMode)).toBe('opaque');
  await assertOpaqueFallbacks(page, roots, label);

  await setEmulatedMediaFeature(mediaSession, 'prefers-reduced-transparency', 'no-preference');
  await expect.poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(false);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.uiGlassMode)).toBe('refractive');
};

const readBackgroundImage = (locator) => locator.evaluate((element) => getComputedStyle(element).backgroundImage);

test('Chromium shell owns one connected SVG edge pipeline in filter order', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000 });
  await setLiquidGlassMode(page, 'refractive');
  await settleUi(page);

  const host = page.locator('#ui-liquid-glass-filter-host');
  const shell = page.locator('.nav-tabs');
  await expect(host).toHaveCount(1);
  await expect(shell).toHaveClass(/ui-liquid-glass--refractive/);
  await expect(shell).toHaveAttribute('data-liquid-glass-interactive', '');
  const shellFilterId = await shell.evaluate((element) => (
    element.style.backdropFilter.match(/^url\(["']?#([^\)"']+)["']?\)$/)?.[1]
  ));
  expect(shellFilterId).toMatch(/^ui-liquid-glass-\d+$/);
  const shellPipeline = host.locator(`filter#${shellFilterId}`);
  await expect(shellPipeline).toHaveCount(1);

  const pipeline = await shellPipeline.evaluate((filter) => (
    [...filter.children].map((element) => element.tagName.toLowerCase())
  ));
  expect(pipeline).toEqual(['feimage', 'fedisplacementmap', 'fegaussianblur']);
  await expect(shellPipeline.locator('feImage')).toHaveCount(1);
  await expect(shellPipeline.locator('feDisplacementMap')).toHaveCount(1);
  await expect(shellPipeline.locator('feGaussianBlur')).toHaveCount(1);
});

test('forced frosted and opaque modes retain a visible fallback without SVG displacement', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 390, height: 844 });
  const shell = page.locator('.nav-tabs');

  await setLiquidGlassMode(page, 'frosted');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveCSS('background-image', /gradient/);
  await expect(shell).toHaveCSS('backdrop-filter', /^(?!.*url\().+/);
  await expect(shell).toHaveScreenshot('liquid-glass-card-stats-390-frosted-fallback.png', {
    animations: 'disabled',
    caret: 'hide'
  });

  await setLiquidGlassMode(page, 'opaque');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveCSS('background-color', 'rgb(248, 250, 252)');
  await expect(shell).toHaveCSS('background-image', 'none');
  await expect(shell).toHaveCSS('box-shadow', 'none');
  await expect(shell).toHaveCSS('backdrop-filter', 'none');
  await expect(shell).toHaveScreenshot('liquid-glass-card-stats-390-opaque-fallback.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});

test('forced-colors clears regular-shell URL filters and filter nodes while retaining an opaque readable fallback', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await setLiquidGlassMode(page, 'refractive');
  await settleUi(page);

  const host = page.locator('#ui-liquid-glass-filter-host');
  const filterBar = page.locator('.filter-bar');
  await expectRefractiveOuterSurface(filterBar, '.sort-btn', 'forced-colors regular root');
  expect(await host.locator('filter').count()).toBeGreaterThan(0);

  await page.emulateMedia({ forcedColors: 'active' });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.uiGlassMode)).toBe('opaque');
  await expect.poll(() => filterBar.evaluate((element) => element.style.backdropFilter)).toBe('');
  await expect(filterBar).toHaveCSS('backdrop-filter', 'none');
  await expect(filterBar).toHaveCSS('background-image', 'none');
  await expect(host.locator('filter')).toHaveCount(0);

  const fallback = await readSurfaceMaterial(filterBar);
  expect(fallback.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(fallback.contrast).toBeGreaterThanOrEqual(4.5);
});

test('approved regular roots release runtime refraction through reduced-transparency media transitions', async ({ page }) => {
  const mediaSession = await page.context().newCDPSession(page);
  await setEmulatedMediaFeature(mediaSession, 'prefers-reduced-transparency', 'no-preference');

  const expectChromiumRefractive = async () => {
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.uiGlassMode)).toBe('refractive');
  };

  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await expectChromiumRefractive();
  await settleUi(page);

  const filterBar = page.locator('.filter-bar');
  await expectRefractiveOuterSurface(filterBar, '.sort-btn', 'reduced-transparency filter bar');
  expect(await filterBar.evaluate((element) => {
    const surfaceOwner = element.__vueParentComponent?.proxy;
    const eventHistoryOwner = element.closest('.event-history')?.__vueParentComponent?.proxy;
    const directiveOwner = element.__vnode?.dirs?.[0]?.instance;
    return {
      hasSurfaceOwner: Boolean(surfaceOwner),
      matchesEventHistoryOwner: surfaceOwner === eventHistoryOwner,
      directiveOwnerUid: directiveOwner?.$?.uid,
      mixinOwnerUid: surfaceOwner?.$?.uid,
      directiveOwnerMatchesMixin: directiveOwner?.$ === surfaceOwner?.$
    };
  })).toEqual({
    hasSurfaceOwner: true,
    matchesEventHistoryOwner: true,
    directiveOwnerUid: expect.any(Number),
    mixinOwnerUid: expect.any(Number),
    directiveOwnerMatchesMixin: true
  });

  await page.locator('.source-trigger').click();
  const sourceMenu = page.locator('.source-menu-floating');
  await expectRefractiveOuterSurface(sourceMenu, '.source-list', 'reduced-transparency source menu');
  await assertReducedTransparencyFallback(
    page,
    mediaSession,
    [filterBar, sourceMenu],
    'reduced-transparency Event History filter bar and source menu'
  );

  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await expectChromiumRefractive();
  await settleUi(page);
  const filterBarWithPanel = page.locator('.filter-bar');
  await expectRefractiveOuterSurface(filterBarWithPanel, '.sort-btn', 'reduced-transparency filter panel bar');
  await filterBarWithPanel.locator('button[title="筛选面板"]').click();
  const filterPanel = page.locator('.filter-panel');
  await expectRefractiveOuterSurface(filterPanel, '.filter-row', 'reduced-transparency filter panel');
  await assertReducedTransparencyFallback(page, mediaSession, [filterBarWithPanel, filterPanel], 'reduced-transparency Event History filter panel');

  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await expectChromiumRefractive();
  await settleUi(page);
  await openPredictDrawer(page);
  const predictDrawer = page.locator('.predict-drawer');
  await expectRefractiveOuterSurface(predictDrawer, '.drawer-header', 'reduced-transparency Predict drawer');
  await assertReducedTransparencyFallback(page, mediaSession, [predictDrawer], 'reduced-transparency Predict drawer');

  await gotoUiState(page, { tab: 'specialPredict', width: 1440, height: 1000, unlockSpecialPredict: true });
  await expectChromiumRefractive();
  await settleUi(page);
  const toolbar = page.locator('.special-toolbar');
  await expectRefractiveOuterSurface(toolbar, '.special-toolbar-group', 'reduced-transparency Special Predict toolbar');
  await assertReducedTransparencyFallback(page, mediaSession, [toolbar], 'reduced-transparency Special Predict toolbar');
});

test('approved regular roots start with CSS frost on a non-Chromium user agent', async ({ page }) => {
  const fallbackPage = await page.context().newPage();
  const userAgentSession = await fallbackPage.context().newCDPSession(fallbackPage);
  await userAgentSession.send('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
    acceptLanguage: 'en-US,en;q=0.9',
    platform: 'MacIntel',
    userAgentMetadata: {
      brands: [],
      fullVersionList: [],
      platform: 'macOS',
      platformVersion: '10.15.7',
      architecture: 'x86',
      model: '',
      mobile: false,
      bitness: '64',
      wow64: false
    }
  });

  try {
    await gotoUiState(fallbackPage, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
    await expect.poll(() => fallbackPage.evaluate(() => document.documentElement.dataset.uiGlassMode)).toBe('frosted');
    expect(await fallbackPage.evaluate(() => navigator.userAgent)).toContain('Safari');
    expect(await fallbackPage.evaluate(() => navigator.userAgentData?.brands ?? [])).toEqual([]);
    await settleUi(fallbackPage);

    const filterBar = fallbackPage.locator('.filter-bar');
    await assertFrostedFallbacks(fallbackPage, [filterBar], 'non-Chromium Event History filter bar');
    await fallbackPage.locator('.source-trigger').click();
    const sourceMenu = fallbackPage.locator('.source-menu-floating');
    await assertFrostedFallbacks(fallbackPage, [filterBar, sourceMenu], 'non-Chromium Event History filter bar and source menu');

    await gotoUiState(fallbackPage, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
    await settleUi(fallbackPage);
    const filterBarWithPanel = fallbackPage.locator('.filter-bar');
    await filterBarWithPanel.locator('button[title="筛选面板"]').click();
    const filterPanel = fallbackPage.locator('.filter-panel');
    await assertFrostedFallbacks(fallbackPage, [filterBarWithPanel, filterPanel], 'non-Chromium Event History filter panel');

    await gotoUiState(fallbackPage, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
    await settleUi(fallbackPage);
    await openPredictDrawer(fallbackPage);
    const predictDrawer = fallbackPage.locator('.predict-drawer');
    await assertFrostedFallbacks(fallbackPage, [predictDrawer], 'non-Chromium Predict drawer');

    await gotoUiState(fallbackPage, { tab: 'specialPredict', width: 1440, height: 1000, unlockSpecialPredict: true });
    await settleUi(fallbackPage);
    const toolbar = fallbackPage.locator('.special-toolbar');
    await assertFrostedFallbacks(fallbackPage, [toolbar], 'non-Chromium Special Predict toolbar');
  } finally {
    await fallbackPage.close();
  }
});

test('approved regular overlay shells own Chromium refraction while descendants and content stay outside it', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await setLiquidGlassMode(page, 'refractive');
  await settleUi(page);

  const sourceTrigger = page.locator('.source-trigger');
  await sourceTrigger.click();
  const sourceMenu = page.locator('.source-menu');
  await expect(sourceMenu).toBeVisible();
  await expect(sourceMenu).toHaveClass(/ui-liquid-glass--regular/);
  await expectRefractiveOuterSurface(sourceMenu, '.source-list', 'data-source menu');

  const filterBar = page.locator('.filter-bar');
  await expect(filterBar).toHaveClass(/ui-liquid-glass--regular/);
  await expectRefractiveOuterSurface(filterBar, '.sort-btn, .nav-btn', 'Event History filter bar');
  await filterBar.locator('button[title="筛选面板"]').click();
  const filterPanel = page.locator('.filter-panel');
  await expect(filterPanel).toBeVisible();
  await expect(filterPanel).toHaveClass(/ui-liquid-glass--regular/);
  await expectRefractiveOuterSurface(filterPanel, '.filter-row', 'Event History filter panel');
  await expect(page.locator('.event-item').first()).not.toHaveClass(/ui-liquid-glass/);

  await openPredictDrawer(page);
  const predictDrawer = page.locator('.predict-drawer');
  await expectRefractiveOuterSurface(predictDrawer, '.drawer-header, .global-config-bar, .editor-card', 'Predict drawer');
  await predictDrawer.locator('.close-btn').click();
  await expect(predictDrawer).toHaveCount(0);

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

test('conditional regular roots release filters and KeepAlive restores the Event History lifecycle once', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await setLiquidGlassMode(page, 'refractive');
  await settleUi(page);

  const host = page.locator('#ui-liquid-glass-filter-host');
  const filterBar = page.locator('.filter-bar');
  await expectRefractiveOuterSurface(filterBar, '.sort-btn', 'Event History filter bar lifecycle root');
  const baselineFilters = await host.locator('filter').count();

  const sourceTrigger = page.locator('.source-trigger');
  await sourceTrigger.click();
  const sourceMenu = page.locator('.source-menu-floating');
  await expectRefractiveOuterSurface(sourceMenu, '.source-list', 'data-source lifecycle root');
  await sourceMenu.evaluate((element) => { window.__liquidGlassReleasedSourceMenu = element; });
  await expect(host.locator('filter')).toHaveCount(baselineFilters + 1);
  await sourceTrigger.click();
  await expect(sourceMenu).toHaveCount(0);
  await expect(host.locator('filter')).toHaveCount(baselineFilters);
  expect(await page.evaluate(() => {
    const element = window.__liquidGlassReleasedSourceMenu;
    return {
      connected: element?.isConnected,
      interactive: element?.hasAttribute('data-liquid-glass-interactive'),
      backdropFilter: element?.style.backdropFilter
    };
  })).toEqual({ connected: false, interactive: false, backdropFilter: '' });

  await filterBar.locator('button[title="筛选面板"]').click();
  const filterPanel = page.locator('.filter-panel');
  await expectRefractiveOuterSurface(filterPanel, '.filter-row', 'filter-panel lifecycle root');
  await filterPanel.evaluate((element) => { window.__liquidGlassReleasedFilterPanel = element; });
  await expect(host.locator('filter')).toHaveCount(baselineFilters + 1);
  await filterPanel.locator('.panel-collapse-btn').click();
  await expect(filterPanel).toHaveCount(0);
  await expect(host.locator('filter')).toHaveCount(baselineFilters);
  expect(await page.evaluate(() => {
    const element = window.__liquidGlassReleasedFilterPanel;
    return {
      connected: element?.isConnected,
      interactive: element?.hasAttribute('data-liquid-glass-interactive'),
      backdropFilter: element?.style.backdropFilter
    };
  })).toEqual({ connected: false, interactive: false, backdropFilter: '' });

  await openPredictDrawer(page);
  const predictDrawer = page.locator('.predict-drawer');
  await expectRefractiveOuterSurface(predictDrawer, '.drawer-header', 'Predict drawer lifecycle root');
  await predictDrawer.evaluate((element) => { window.__liquidGlassReleasedPredictDrawer = element; });
  await expect(host.locator('filter')).toHaveCount(baselineFilters + 1);
  await predictDrawer.locator('.close-btn').click();
  await expect(predictDrawer).toHaveCount(0);
  await expect(host.locator('filter')).toHaveCount(baselineFilters);
  expect(await page.evaluate(() => {
    const element = window.__liquidGlassReleasedPredictDrawer;
    return {
      connected: element?.isConnected,
      interactive: element?.hasAttribute('data-liquid-glass-interactive'),
      backdropFilter: element?.style.backdropFilter
    };
  })).toEqual({ connected: false, interactive: false, backdropFilter: '' });

  await filterBar.evaluate((element) => { window.__liquidGlassKeptAliveFilterBar = element; });
  await page.locator('.nav-tabs > button').filter({ hasText: '统计面板' }).click();
  await expect(page.locator('.pjsk-stats')).toBeVisible();
  await settleUi(page);
  expect(await page.evaluate(() => {
    const element = window.__liquidGlassKeptAliveFilterBar;
    return {
      connected: element?.isConnected,
      interactive: element?.hasAttribute('data-liquid-glass-interactive'),
      backdropFilter: element?.style.backdropFilter
    };
  })).toEqual({ connected: false, interactive: false, backdropFilter: '' });

  await page.locator('.nav-tabs > button').filter({ hasText: '历史活动一览' }).click();
  await expect(page.locator('.event-history')).toBeVisible();
  await settleUi(page);
  await expectRefractiveOuterSurface(page.locator('.filter-bar'), '.sort-btn', 'resumed Event History filter bar');
  await expect(host.locator('filter')).toHaveCount(baselineFilters);
});

test('Card and Song expanded navigation use their stats material while top and compact refractive shells keep the general material', async ({ page }) => {
  const statsNavigationBackground = 'linear-gradient(145deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.28) 42%, rgba(219, 234, 254, 0.2))';
  const generalRefractiveBackground = 'linear-gradient(145deg, rgba(255, 255, 255, 0.46), rgba(248, 250, 252, 0.22) 46%, rgba(226, 232, 240, 0.16))';

  for (const tab of ['stats', 'songs']) {
    await gotoUiState(page, { tab, width: 1440, height: 1000 });
    await setLiquidGlassMode(page, 'refractive');
    await settleUi(page);
    expect(await readBackgroundImage(page.locator('.stats-nav'))).toBe(statsNavigationBackground);
    expect(await readBackgroundImage(page.locator('.nav-tabs'))).toBe(generalRefractiveBackground);

    await gotoUiState(page, { tab, width: 390, height: 844 });
    await setLiquidGlassMode(page, 'refractive');
    await settleUi(page);
    expect(await readBackgroundImage(page.locator('.floating-menu-btn'))).toBe(generalRefractiveBackground);
  }
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
  await expect(page.locator('#ui-liquid-glass-filter-host filter')).toHaveCount(2);
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
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await setLiquidGlassMode(page, 'refractive', 'full');
  await settleUi(page);
  const navigation = page.locator('.stats-nav');
  const bounds = await navigation.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds.x + bounds.width * 0.78, bounds.y + bounds.height * 0.18);
  await expect.poll(() => navigation.evaluate((element) => Number.parseFloat(
    element.style.getPropertyValue('--ui-glass-pointer-x')
  ))).toBeCloseTo(78, 4);
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

test('liquid-glass desktop history filter panel is stable at 1440px', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await setLiquidGlassMode(page, 'refractive');
  await page.locator('.filter-bar button[title="筛选面板"]').click();
  await expect(page.locator('.filter-panel')).toBeVisible();
  await settleUi(page);
  await expect(page).toHaveScreenshot('liquid-glass-history-1440-filter-panel.png', {
    animations: 'disabled',
    caret: 'hide'
  });
});
