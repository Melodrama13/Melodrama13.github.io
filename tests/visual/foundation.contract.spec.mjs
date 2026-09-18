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

const expectProminentStatsNav = async (page) => {
  const navigation = page.locator('.stats-nav');
  await expect(navigation).toHaveClass(/ui-liquid-glass--prominent/);
  await expect(navigation).toHaveAttribute('data-liquid-glass-interactive', '');
  const material = await navigation.evaluate((surface) => {
    const style = getComputedStyle(surface);
    const filterMatch = surface.style.backdropFilter.match(/^url\(["']?#([^\)"']+)["']?\)$/);
    return {
      inlineBackdropFilter: surface.style.backdropFilter,
      hasConnectedFilter: Boolean(filterMatch && document.getElementById(filterMatch[1])?.isConnected),
      blurStdDeviation: filterMatch
        ? document.getElementById(filterMatch[1])?.querySelector('feGaussianBlur')?.getAttribute('stdDeviation')
        : null,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      opticalRim: {
        content: getComputedStyle(surface, '::after').content,
        display: getComputedStyle(surface, '::after').display,
        background: getComputedStyle(surface, '::after').backgroundImage,
        padding: getComputedStyle(surface, '::after').padding,
        pointerEvents: getComputedStyle(surface, '::after').pointerEvents,
        backdropFilter: getComputedStyle(surface, '::after').backdropFilter,
        maskImage: getComputedStyle(surface, '::after').maskImage,
        webkitMaskImage: getComputedStyle(surface, '::after').webkitMaskImage
      }
    };
  });
  expect(material.inlineBackdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
  expect(material.hasConnectedFilter).toBe(true);
  expect(material.blurStdDeviation).toBe('5.6');
  expect(material.backgroundImage).toContain('linear-gradient');
  expect(material.backgroundColor).not.toBe('rgb(255, 255, 255)');
  expect(material.boxShadow.match(/\binset\b/g) ?? []).toHaveLength(5);
  expect(material.opticalRim.content).toBe('""');
  expect(material.opticalRim.display).not.toBe('none');
  expect(material.opticalRim.background).toContain('conic-gradient');
  expect(material.opticalRim.padding).toBe('1px');
  expect(material.opticalRim.pointerEvents).toBe('none');
  expect(material.opticalRim.backdropFilter).toBe('none');
  expect(`${material.opticalRim.maskImage} ${material.opticalRim.webkitMaskImage}`).toContain('linear-gradient');
  await expect(navigation.locator('.nav-quick-wrap')).toHaveCSS('backdrop-filter', 'none');
};

const readProminentMaterial = (locator) => locator.evaluate((surface) => {
  const style = getComputedStyle(surface);
  const specular = getComputedStyle(surface, '::before');
  const opticalRim = getComputedStyle(surface, '::after');
  return {
    inlineBackdropFilter: surface.style.backdropFilter,
    hasConnectedFilter: Boolean(
      surface.style.backdropFilter.match(/^url\(["']?#([^\)"']+)["']?\)$/)?.[1]
      && document.getElementById(surface.style.backdropFilter.match(/^url\(["']?#([^\)"']+)["']?\)$/)?.[1])?.isConnected
    ),
    backdropFilter: style.backdropFilter,
    backgroundImage: style.backgroundImage,
    boxShadow: style.boxShadow,
    specularContent: specular.content,
    specularDisplay: specular.display,
    specularBackground: specular.backgroundImage,
    specularPointerEvents: specular.pointerEvents,
    specularZIndex: specular.zIndex,
    opticalRimContent: opticalRim.content,
    opticalRimDisplay: opticalRim.display,
    opticalRimBackground: opticalRim.backgroundImage,
    opticalRimPadding: opticalRim.padding,
    opticalRimPointerEvents: opticalRim.pointerEvents,
    opticalRimBackdropFilter: opticalRim.backdropFilter,
    opticalRimMaskImage: opticalRim.maskImage,
    opticalRimWebkitMaskImage: opticalRim.webkitMaskImage
  };
});

const rgbaAlphas = (value) => [...value.matchAll(/rgba\([^)]*?,\s*([\d.]+)\)/g)]
  .map((match) => Number(match[1]));

const expectTransmissiveProminentMaterial = async (surface) => {
  await expect(surface).toHaveClass(/ui-liquid-glass--prominent/);
  await expect(surface).toHaveAttribute('data-liquid-glass-interactive', '');
  const material = await readProminentMaterial(surface);
  const alphas = rgbaAlphas(material.backgroundImage);

  expect(material.backgroundImage).toContain('linear-gradient');
  expect(alphas.length).toBeGreaterThan(0);
  expect(Math.max(...alphas)).toBe(0.66);
  expect(material.inlineBackdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
  expect(material.hasConnectedFilter).toBe(true);
  expect(material.backdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
  expect(material.boxShadow.match(/\binset\b/g) ?? []).toHaveLength(5);
  expect(material.specularDisplay).not.toBe('none');
  expect(material.specularContent).toBe('""');
  expect(material.specularBackground).toContain('radial-gradient');
  expect(material.specularPointerEvents).toBe('none');
  expect(material.specularZIndex).toBe('-1');
  expect(material.opticalRimContent).toBe('""');
  expect(material.opticalRimDisplay).not.toBe('none');
  expect(material.opticalRimBackground).toContain('conic-gradient');
  expect(material.opticalRimPadding).toBe('1px');
  expect(material.opticalRimPointerEvents).toBe('none');
  expect(material.opticalRimBackdropFilter).toBe('none');
  expect(`${material.opticalRimMaskImage} ${material.opticalRimWebkitMaskImage}`).toContain('linear-gradient');
};

const expectCompactProminentStatsNav = async (page) => {
  const trigger = page.locator('.floating-menu-btn');
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveClass(/ui-liquid-glass--prominent/);
  await expect(trigger).toHaveAttribute('data-liquid-glass-interactive', '');

  await trigger.click();
  await expect(page.locator('.stats-nav')).toBeVisible();
  await expectProminentStatsNav(page);
};

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

  throw new Error('A second editable event did not open the existing unsaved-switch dialog');
};

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

test('Card Stats navigation adopts the prominent liquid-glass contract on desktop and compact layouts', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await settleUi(page);
  await expectProminentStatsNav(page);

  await gotoUiState(page, { tab: 'stats', width: 390, height: 844 });
  await settleUi(page);
  await expectCompactProminentStatsNav(page);
});

test('Song Stats navigation adopts the prominent liquid-glass contract on desktop and compact layouts', async ({ page }) => {
  await gotoUiState(page, { tab: 'songs', width: 1440, height: 1000 });
  await settleUi(page);
  await expectProminentStatsNav(page);

  await gotoUiState(page, { tab: 'songs', width: 390, height: 844 });
  await settleUi(page);
  await expectCompactProminentStatsNav(page);
});

test('history overlay controls adopt the shared liquid-glass tiers without nested menu filtering', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);

  await page.locator('.source-trigger').click();
  const sourceMenu = page.locator('.source-menu');
  await expect(sourceMenu).toHaveClass(/ui-liquid-glass--prominent/);
  await expect(sourceMenu.locator('.source-list')).toHaveCSS('backdrop-filter', 'none');

  const filterBar = page.locator('.filter-bar');
  await expect(filterBar).toHaveClass(/ui-liquid-glass--prominent/);
  await filterBar.locator('button[title="筛选面板"]').click();
  const filterPanel = page.locator('.filter-panel');
  await expect(filterPanel).toBeVisible();
  await expect(filterPanel).toHaveClass(/ui-liquid-glass--prominent/);

  await openUnsavedPredictSwitchDialog(page);
  await expect(page.locator('.predict-switch-dialog-card')).toHaveClass(/ui-liquid-glass--modal/);
});

test('disabled Event History filter options retain their pre-prominent base material', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);
  await page.locator('.filter-bar button[title="筛选面板"]').click();

  const option = page.locator('.filter-panel .btn-group-sm button').first();
  const wasDisabled = await option.isDisabled();
  try {
    await option.evaluate((element) => { element.disabled = true; });
    await expect(option).toHaveCSS('background-image', 'linear-gradient(145deg, rgba(255, 255, 255, 0.66), rgba(248, 250, 252, 0.36))');
    await expect(option).toHaveCSS('border-top-color', 'rgba(255, 255, 255, 0.7)');
    await expect(option).toHaveCSS('opacity', '1');
    await expect(option).toHaveCSS('cursor', 'pointer');
  } finally {
    await option.evaluate((element, disabled) => { element.disabled = disabled; }, wasDisabled);
  }
});

test('disabled Event History reset and unit controls retain their pre-prominent neutral material', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);
  await page.locator('.filter-bar button[title="筛选面板"]').click();

  const reset = page.locator('.filter-mode-row .panel-reset-btn').first();
  await expect(reset).toBeDisabled();
  await expect(reset).toHaveCSS('background-image', 'linear-gradient(145deg, rgba(255, 255, 255, 0.64), rgba(248, 250, 252, 0.34))');
  await expect(reset).toHaveCSS('border-top-color', 'rgba(255, 255, 255, 0.7)');
  await expect(reset).toHaveCSS('opacity', '0.6');
  await expect(reset).toHaveCSS('cursor', 'not-allowed');

  const eventTypeRow = page.locator('.filter-panel .filter-row').filter({ hasText: '活动类型' });
  await eventTypeRow.getByRole('button', { name: '混活', exact: true }).click();

  const disabledUnits = page.locator('.filter-panel .icon-group.units.is-disabled');
  const disabledUnit = disabledUnits.locator('img').first();
  await expect(disabledUnits).toHaveAttribute('title', '选择混活时不可选活动团体');
  await expect(disabledUnit).toHaveClass(/icon-disabled/);
  await expect(disabledUnit).toHaveCSS('background-image', 'linear-gradient(145deg, rgba(255, 255, 255, 0.58), rgba(248, 250, 252, 0.28))');
  await expect(disabledUnit).toHaveCSS('border-top-color', 'rgba(255, 255, 255, 0.44)');
  await expect(disabledUnits).toHaveCSS('opacity', '0.38');
  await expect(disabledUnit).toHaveCSS('cursor', 'not-allowed');
});

test('disabled data-source actions retain their pre-prominent base material', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);
  await page.locator('.source-trigger').click();

  const action = page.locator('.source-actions .io-btn').first();
  const wasDisabled = await action.isDisabled();
  try {
    await action.evaluate((element) => { element.disabled = true; });
    await expect(action).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.18)');
    await expect(action).toHaveCSS('border-top-color', 'rgba(148, 163, 184, 0.42)');
    await expect(action).toHaveCSS('opacity', '1');
    await expect(action).toHaveCSS('cursor', 'pointer');
  } finally {
    await action.evaluate((element, disabled) => { element.disabled = disabled; }, wasDisabled);
  }
});

test('prominent glass controls transmit ambient color with outer-only Chromium refraction', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);

  await page.locator('.source-trigger').click();
  const sourceMenu = page.locator('.source-menu');
  await expect(sourceMenu).toBeVisible();
  await expectTransmissiveProminentMaterial(sourceMenu);

  const sourceGroups = await sourceMenu
    .locator('.source-menu-username-wrap, .source-list, .source-actions')
    .evaluateAll((surfaces) => surfaces.map((surface) => {
      const style = getComputedStyle(surface);
      return {
        className: surface.className,
        backdropFilter: style.backdropFilter,
        backgroundColor: style.backgroundColor
      };
    }));
  expect(sourceGroups).toHaveLength(3);
  expect(sourceGroups.find((surface) => surface.className.includes('source-list'))?.backdropFilter).toBe('none');
  for (const sourceGroup of sourceGroups) {
    const alphas = rgbaAlphas(sourceGroup.backgroundColor);
    expect(alphas.length).toBeGreaterThan(0);
    expect(Math.max(...alphas)).toBe(0.24);
  }

  const filterBar = page.locator('.filter-bar');
  await expectTransmissiveProminentMaterial(filterBar);
  await filterBar.locator('button[title="筛选面板"]').click();
  const filterPanel = page.locator('.filter-panel');
  await expect(filterPanel).toBeVisible();
  await expectTransmissiveProminentMaterial(filterPanel);
});

test('compact Card Stats navigation releases hidden refraction before restoring one visible aside', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 390, height: 844 });
  await settleUi(page);

  const navigation = page.locator('.stats-nav');
  const trigger = page.locator('.floating-menu-btn');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(navigation).toBeVisible();

  const expandedFilterId = await navigation.evaluate((surface) => {
    const match = surface.style.backdropFilter.match(/^url\(["']?#([^\)"']+)["']?\)$/);
    if (!match) throw new Error('Expanded stats navigation did not own an inline refraction filter');
    return match[1];
  });

  await navigation.locator('.nav-collapse-fab').click();
  await expect(trigger).toBeVisible();
  await expect(navigation).toBeHidden();

  const collapsed = await page.evaluate((filterId) => {
    const navigation = document.querySelector('.stats-nav');
    const activeSurfaces = [...document.querySelectorAll('[data-liquid-glass-interactive]')];
    const filterOwningSurfaces = activeSurfaces.filter((surface) => surface.style.backdropFilter.includes('url('));
    return {
      interactive: navigation?.hasAttribute('data-liquid-glass-interactive'),
      backdropFilter: navigation?.style.backdropFilter,
      webkitBackdropFilter: navigation?.style.webkitBackdropFilter,
      previousFilterPresent: Boolean(document.getElementById(filterId)),
      activeSurfaceCount: activeSurfaces.length,
      filterOwningSurfaceCount: filterOwningSurfaces.length,
      filterCount: document.querySelectorAll('#ui-liquid-glass-filter-host filter').length
    };
  }, expandedFilterId);
  expect(collapsed).toEqual({
    interactive: false,
    backdropFilter: '',
    webkitBackdropFilter: '',
    previousFilterPresent: false,
    activeSurfaceCount: 2,
    filterOwningSurfaceCount: 2,
    filterCount: 2
  });

  await trigger.click();
  await expect(navigation).toBeVisible();
  await expect(trigger).toHaveCount(0);
  const reopened = await page.evaluate(() => {
    const navigation = document.querySelector('.stats-nav');
    const activeSurfaces = [...document.querySelectorAll('[data-liquid-glass-interactive]')];
    const filterOwningSurfaces = activeSurfaces.filter((surface) => surface.style.backdropFilter.includes('url('));
    return {
      interactive: navigation?.hasAttribute('data-liquid-glass-interactive'),
      backdropFilter: navigation?.style.backdropFilter,
      activeSurfaceCount: activeSurfaces.length,
      filterOwningSurfaceCount: filterOwningSurfaces.length,
      filterCount: document.querySelectorAll('#ui-liquid-glass-filter-host filter').length
    };
  });
  expect(reopened.interactive).toBe(true);
  expect(reopened.backdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
  expect(reopened.activeSurfaceCount).toBe(2);
  expect(reopened.filterOwningSurfaceCount).toBe(2);
  expect(reopened.filterCount).toBe(2);
});

test('liquid glass specular stays below prominent-glass content without changing its interaction layer', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);
  await page.locator('.source-trigger').click();

  const layering = await page.locator('.source-menu').evaluate((surface) => {
    const consumer = surface.querySelector('button');
    if (!(consumer instanceof HTMLElement)) throw new Error('Source menu consumer content was not found');
    const rect = consumer.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      surfaceIsolation: getComputedStyle(surface).isolation,
      specularZIndex: getComputedStyle(surface, '::before').zIndex,
      specularPointerEvents: getComputedStyle(surface, '::before').pointerEvents,
      consumerHit: hit === consumer || consumer.contains(hit)
    };
  });

  expect(layering).toEqual({
    surfaceIsolation: 'isolate',
    specularZIndex: '-1',
    specularPointerEvents: 'none',
    consumerHit: true
  });
});

test('Special Predict toolbar owns Chromium refraction while toolbar groups remain unfiltered', async ({ page }) => {
  await gotoUiState(page, {
    tab: 'specialPredict',
    width: 1440,
    height: 1000,
    unlockSpecialPredict: true
  });
  await settleUi(page);

  const toolbar = page.locator('.special-toolbar');
  await expect(toolbar).toHaveClass(/ui-liquid-glass--regular/);
  await expect(toolbar).toHaveAttribute('data-liquid-glass-interactive', '');
  await expect.poll(() => toolbar.evaluate((element) => element.style.backdropFilter)).toMatch(/^url\("?#ui-liquid-glass-\d+"?\)$/);
  await expect(toolbar).toHaveCSS('backdrop-filter', /^url\("?#ui-liquid-glass-\d+"?\)$/);
  await expect(toolbar.locator('.special-toolbar-group').first()).toHaveCSS('backdrop-filter', 'none');
  await expect(toolbar.locator('.special-toolbar-group').first()).not.toHaveAttribute('data-liquid-glass-interactive');
});

test('history prominent glass keeps a static optical rim when motion is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);

  const readProminentMaterial = (locator) => locator.evaluate((surface) => {
    const style = getComputedStyle(surface);
    const specular = getComputedStyle(surface, '::before');
    const opticalRim = getComputedStyle(surface, '::after');
    return {
      inlineBackdropFilter: surface.style.backdropFilter,
      hasConnectedFilter: Boolean(
        surface.style.backdropFilter.match(/^url\(["']?#([^\)"']+)["']?\)$/)?.[1]
        && document.getElementById(surface.style.backdropFilter.match(/^url\(["']?#([^\)"']+)["']?\)$/)?.[1])?.isConnected
      ),
      backdropFilter: style.backdropFilter,
      boxShadow: style.boxShadow,
      specularDisplay: specular.display,
      specularContent: specular.content,
      specularBackground: specular.backgroundImage,
      specularPointerEvents: specular.pointerEvents,
      opticalRimContent: opticalRim.content,
      opticalRimDisplay: opticalRim.display,
      opticalRimBackground: opticalRim.backgroundImage,
      opticalRimPadding: opticalRim.padding,
      opticalRimPointerEvents: opticalRim.pointerEvents,
      opticalRimBackdropFilter: opticalRim.backdropFilter,
      opticalRimMaskImage: opticalRim.maskImage,
      opticalRimWebkitMaskImage: opticalRim.webkitMaskImage
    };
  });

  await page.locator('.source-trigger').click();
  const sourceMenu = page.locator('.source-menu');
  await expect(sourceMenu).toBeVisible();

  const assertFullMotionMaterial = async (surface) => {
    await expect(surface).toHaveClass(/ui-liquid-glass--prominent/);
    await expect(surface).toHaveAttribute('data-liquid-glass-interactive', '');
    const material = await readProminentMaterial(surface);
    expect(material.inlineBackdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
    expect(material.hasConnectedFilter).toBe(true);
    expect(material.backdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
    expect(material.boxShadow.match(/\binset\b/g) ?? []).toHaveLength(5);
    expect(material.specularDisplay).not.toBe('none');
    expect(material.specularContent).toBe('""');
    expect(material.specularBackground).toContain('radial-gradient');
    expect(material.specularPointerEvents).toBe('none');
    expect(material.opticalRimContent).toBe('""');
    expect(material.opticalRimDisplay).not.toBe('none');
    expect(material.opticalRimBackground).toContain('conic-gradient');
    expect(material.opticalRimPadding).toBe('1px');
    expect(material.opticalRimPointerEvents).toBe('none');
    expect(material.opticalRimBackdropFilter).toBe('none');
    expect(`${material.opticalRimMaskImage} ${material.opticalRimWebkitMaskImage}`).toContain('linear-gradient');
    return material;
  };

  const sourceFullMotion = await assertFullMotionMaterial(sourceMenu);
  const sourceReducedMotion = await page.evaluate(() => {
    document.documentElement.dataset.uiGlassMotion = 'reduced';
    const surface = document.querySelector('.source-menu');
    const style = getComputedStyle(surface);
    const specular = getComputedStyle(surface, '::before');
    const opticalRim = getComputedStyle(surface, '::after');
    const material = {
      boxShadow: style.boxShadow,
      specularDisplay: specular.display,
      opticalRimDisplay: opticalRim.display,
      opticalRimBackground: opticalRim.backgroundImage,
      opticalRimBackdropFilter: opticalRim.backdropFilter
    };
    delete document.documentElement.dataset.uiGlassMotion;
    return material;
  });

  const filterBar = page.locator('.filter-bar');
  await filterBar.locator('button[title="筛选面板"]').click();
  const filterPanel = page.locator('.filter-panel');
  await expect(filterPanel).toBeVisible();
  const fullMotionMaterials = [
    sourceFullMotion,
    await assertFullMotionMaterial(filterBar),
    await assertFullMotionMaterial(filterPanel)
  ];

  const filterReducedMotionMaterials = await page.evaluate(() => {
    document.documentElement.dataset.uiGlassMotion = 'reduced';
    const materials = ['.filter-bar', '.filter-panel'].map((selector) => {
      const surface = document.querySelector(selector);
      const style = getComputedStyle(surface);
      const specular = getComputedStyle(surface, '::before');
      const opticalRim = getComputedStyle(surface, '::after');
      return {
        boxShadow: style.boxShadow,
        specularDisplay: specular.display,
        opticalRimDisplay: opticalRim.display,
        opticalRimBackground: opticalRim.backgroundImage,
        opticalRimBackdropFilter: opticalRim.backdropFilter
      };
    });
    delete document.documentElement.dataset.uiGlassMotion;
    return materials;
  });
  const reducedMotionMaterials = [sourceReducedMotion, ...filterReducedMotionMaterials];

  for (const [index, material] of reducedMotionMaterials.entries()) {
    expect(material.boxShadow).toBe(fullMotionMaterials[index].boxShadow);
    expect(material.boxShadow.match(/\binset\b/g) ?? []).toHaveLength(5);
    expect(material.specularDisplay).toBe('none');
    expect(material.opticalRimDisplay).not.toBe('none');
    expect(material.opticalRimBackground).toContain('conic-gradient');
    expect(material.opticalRimBackdropFilter).toBe('none');
  }
});

test('liquid glass capability states override stale inline refraction', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await settleUi(page);

  const state = await page.locator('.nav-tabs').evaluate((surface) => {
    const root = document.documentElement;
    const readMaterial = (style, specular) => ({
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
      specularDisplay: specular?.display
    });
    surface.style.backdropFilter = 'url(#stale-liquid-glass-filter)';
    surface.style.webkitBackdropFilter = 'url(#stale-liquid-glass-filter)';

    root.dataset.uiGlassMode = 'opaque';
    const opaque = readMaterial(getComputedStyle(surface), getComputedStyle(surface, '::before'));

    root.dataset.uiGlassMode = 'frosted';
    const frosted = readMaterial(getComputedStyle(surface));

    return {
      opaque,
      frosted: {
        backgroundImage: frosted.backgroundImage,
        backdropFilter: frosted.backdropFilter
      }
    };
  });

  expect(state.opaque).toEqual({
    backgroundColor: 'rgb(248, 250, 252)',
    backgroundImage: 'none',
    boxShadow: 'none',
    backdropFilter: 'none',
    specularDisplay: 'none'
  });
  expect(state.frosted.backgroundImage).not.toBe('none');
  expect(state.frosted.backdropFilter).not.toContain('url(');
});

test('liquid glass reduced motion freezes specular and ambient motion', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await settleUi(page);

  const state = await page.locator('.nav-tabs').evaluate((surface) => {
    const root = document.documentElement;
    root.dataset.uiGlassMotion = 'reduced';
    surface.style.setProperty('--ui-glass-pointer-x', '90%');
    surface.style.setProperty('--ui-glass-pointer-y', '90%');

    return {
      backgroundImage: getComputedStyle(surface).backgroundImage,
      specularDisplay: getComputedStyle(surface, '::before').display,
      ambientAnimation: getComputedStyle(document.body).animationName
    };
  });

  expect(state.backgroundImage).not.toBe('none');
  expect(state.specularDisplay).toBe('none');
  expect(state.ambientAnimation).toBe('none');
});

test('liquid glass forced colors removes the ambient gradients and animation', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await settleUi(page);

  const state = await page.evaluate(() => ({
    backgroundImage: getComputedStyle(document.body).backgroundImage,
    ambientAnimation: getComputedStyle(document.body).animationName
  }));

  expect(state).toEqual({
    backgroundImage: 'none',
    ambientAnimation: 'none'
  });
});
