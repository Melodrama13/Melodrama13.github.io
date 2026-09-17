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

const expectRefractiveStatsNav = async (page) => {
  const navigation = page.locator('.stats-nav');
  await expect(navigation).toHaveClass(/ui-liquid-glass--refractive/);
  await expect(navigation).toHaveAttribute('data-liquid-glass-interactive', '');
  const material = await navigation.evaluate((surface) => {
    const style = getComputedStyle(surface);
    const filterMatch = surface.style.backdropFilter.match(/^url\(["']?#([^\)"']+)["']?\)$/);
    return {
      inlineBackdropFilter: surface.style.backdropFilter,
      hasConnectedFilter: Boolean(filterMatch && document.getElementById(filterMatch[1])?.isConnected),
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow
    };
  });
  expect(material.inlineBackdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
  expect(material.hasConnectedFilter).toBe(true);
  expect(material.backgroundImage).toContain('linear-gradient');
  expect(material.backgroundColor).not.toBe('rgb(255, 255, 255)');
  expect(material.boxShadow.match(/\binset\b/g) ?? []).toHaveLength(4);
  await expect(navigation.locator('.nav-quick-wrap')).toHaveCSS('backdrop-filter', 'none');
};

const readRegularMaterial = (locator) => locator.evaluate((surface) => {
  const style = getComputedStyle(surface);
  const specular = getComputedStyle(surface, '::before');
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
    specularZIndex: specular.zIndex
  };
});

const rgbaAlphas = (value) => [...value.matchAll(/rgba\([^)]*?,\s*([\d.]+)\)/g)]
  .map((match) => Number(match[1]));

const expectTransmissiveRegularMaterial = async (surface) => {
  await expect(surface).toHaveClass(/ui-liquid-glass--regular/);
  await expect(surface).toHaveAttribute('data-liquid-glass-interactive', '');
  const material = await readRegularMaterial(surface);
  const alphas = rgbaAlphas(material.backgroundImage);

  expect(material.backgroundImage).toContain('linear-gradient');
  expect(alphas.length).toBeGreaterThan(0);
  expect(Math.max(...alphas)).toBeLessThanOrEqual(0.60);
  expect(material.inlineBackdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
  expect(material.hasConnectedFilter).toBe(true);
  expect(material.backdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
  expect(material.boxShadow.match(/\binset\b/g) ?? []).toHaveLength(4);
  expect(material.specularDisplay).not.toBe('none');
  expect(material.specularContent).toBe('""');
  expect(material.specularBackground).toContain('radial-gradient');
  expect(material.specularPointerEvents).toBe('none');
  expect(material.specularZIndex).toBe('-1');
};

const expectCompactRefractiveStatsNav = async (page) => {
  const trigger = page.locator('.floating-menu-btn');
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveClass(/ui-liquid-glass--refractive/);
  await expect(trigger).toHaveAttribute('data-liquid-glass-interactive', '');

  await trigger.click();
  await expect(page.locator('.stats-nav')).toBeVisible();
  await expectRefractiveStatsNav(page);
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

test('Card Stats navigation adopts the refractive liquid-glass contract on desktop and compact layouts', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 1440, height: 1000 });
  await settleUi(page);
  await expectRefractiveStatsNav(page);

  await gotoUiState(page, { tab: 'stats', width: 390, height: 844 });
  await settleUi(page);
  await expectCompactRefractiveStatsNav(page);
});

test('Song Stats navigation adopts the refractive liquid-glass contract on desktop and compact layouts', async ({ page }) => {
  await gotoUiState(page, { tab: 'songs', width: 1440, height: 1000 });
  await settleUi(page);
  await expectRefractiveStatsNav(page);

  await gotoUiState(page, { tab: 'songs', width: 390, height: 844 });
  await settleUi(page);
  await expectCompactRefractiveStatsNav(page);
});

test('history overlay controls adopt the shared liquid-glass tiers without nested menu filtering', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);

  await page.locator('.source-trigger').click();
  const sourceMenu = page.locator('.source-menu');
  await expect(sourceMenu).toHaveClass(/ui-liquid-glass--regular/);
  await expect(sourceMenu.locator('.source-list')).toHaveCSS('backdrop-filter', 'none');

  const filterBar = page.locator('.filter-bar');
  await expect(filterBar).toHaveClass(/ui-liquid-glass--regular/);
  await filterBar.locator('button[title="筛选面板"]').click();
  const filterPanel = page.locator('.filter-panel');
  await expect(filterPanel).toBeVisible();
  await expect(filterPanel).toHaveClass(/ui-liquid-glass--regular/);

  await openUnsavedPredictSwitchDialog(page);
  await expect(page.locator('.predict-switch-dialog-card')).toHaveClass(/ui-liquid-glass--modal/);
});

test('regular glass controls transmit ambient color with outer-only Chromium refraction', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);

  await page.locator('.source-trigger').click();
  const sourceMenu = page.locator('.source-menu');
  await expect(sourceMenu).toBeVisible();
  await expectTransmissiveRegularMaterial(sourceMenu);

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
    expect(Math.max(...alphas)).toBeLessThanOrEqual(0.14);
  }

  const filterBar = page.locator('.filter-bar');
  await expectTransmissiveRegularMaterial(filterBar);
  await filterBar.locator('button[title="筛选面板"]').click();
  const filterPanel = page.locator('.filter-panel');
  await expect(filterPanel).toBeVisible();
  await expectTransmissiveRegularMaterial(filterPanel);
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

test('liquid glass specular stays below regular-glass content without changing its interaction layer', async ({ page }) => {
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

test('history regular glass keeps a static optical rim when motion is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000, fullHistory: true });
  await settleUi(page);

  const readRegularMaterial = (locator) => locator.evaluate((surface) => {
    const style = getComputedStyle(surface);
    const specular = getComputedStyle(surface, '::before');
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
      specularPointerEvents: specular.pointerEvents
    };
  });

  await page.locator('.source-trigger').click();
  const sourceMenu = page.locator('.source-menu');
  await expect(sourceMenu).toBeVisible();

  const assertFullMotionMaterial = async (surface) => {
    await expect(surface).toHaveClass(/ui-liquid-glass--regular/);
    await expect(surface).toHaveAttribute('data-liquid-glass-interactive', '');
    const material = await readRegularMaterial(surface);
    expect(material.inlineBackdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
    expect(material.hasConnectedFilter).toBe(true);
    expect(material.backdropFilter).toMatch(/^url\(["']?#ui-liquid-glass-\d+["']?\)$/);
    expect(material.boxShadow.match(/\binset\b/g) ?? []).toHaveLength(4);
    expect(material.specularDisplay).not.toBe('none');
    expect(material.specularContent).toBe('""');
    expect(material.specularBackground).toContain('radial-gradient');
    expect(material.specularPointerEvents).toBe('none');
    return material;
  };

  const sourceFullMotion = await assertFullMotionMaterial(sourceMenu);
  const sourceReducedMotion = await page.evaluate(() => {
    document.documentElement.dataset.uiGlassMotion = 'reduced';
    const surface = document.querySelector('.source-menu');
    const style = getComputedStyle(surface);
    const specular = getComputedStyle(surface, '::before');
    const material = { boxShadow: style.boxShadow, specularDisplay: specular.display };
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
      return {
        boxShadow: style.boxShadow,
        specularDisplay: specular.display
      };
    });
    delete document.documentElement.dataset.uiGlassMotion;
    return materials;
  });
  const reducedMotionMaterials = [sourceReducedMotion, ...filterReducedMotionMaterials];

  for (const [index, material] of reducedMotionMaterials.entries()) {
    expect(material.boxShadow).toBe(fullMotionMaterials[index].boxShadow);
    expect(material.boxShadow.match(/\binset\b/g) ?? []).toHaveLength(4);
    expect(material.specularDisplay).toBe('none');
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
