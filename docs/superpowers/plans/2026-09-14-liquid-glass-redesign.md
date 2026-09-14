# iOS Liquid Glass Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centralized, visibly iOS-inspired Liquid Glass functional layer with Chromium SVG displacement refraction while preserving the current typography, spacing, geometry, responsive layout, behavior, and exported content.

**Architecture:** A values-only token layer feeds one global Liquid Glass stylesheet. A single hidden SVG host receives geometry-keyed filters whose displacement maps are baked per distinct surface size/radius and shared by reference count; one tested Vue plugin owns capability state, map/filter lifecycle, pointer/resize lifecycle, and the `v-liquid-glass` directive. App, stats navigation, menus, drawers, toolbars, and modals consume four material tiers; repeated content never receives refraction.

**Tech Stack:** Vue 3.5, CSS backdrop filters and media queries, inline SVG Filter Effects (`feDisplacementMap`), Node test runner, Playwright Chromium, existing UI policy checker.

**Spec:** `docs/superpowers/specs/2026-09-14-liquid-glass-redesign-design.md`

## Global Constraints

- Work directly in `.worktrees/ui-system-normalization` on `codex/ui-system-normalization`; do not create another branch, worktree, preview port, or deployed version.
- Keep the dev server compatible with port `5173`.
- Do not add a runtime dependency, component library, WebGL renderer, or whole-page screenshot texture.
- Do not change font family, font size, font weight, line height, letter spacing, padding, gap, margin, card dimensions, grid structure, DOM order, labels, roles, aria state, or existing input behavior.
- Do not add a viewport breakpoint; retain the normalized `520/700/768/900/1000/1200/1360` ownership.
- Preserve all existing pressed-state darkening/scaling and release recovery.
- Refractive tier is limited to top navigation, Card/Song stats navigation, and the compact stats trigger.
- Repeated event items, data panels, tables, matrices, artwork, avatars, and export targets must not receive shared backdrop filtering.
- A CSS frost fallback must remain complete without JavaScript, SVG URL filters, Chromium, motion, or transparency.
- Run commands with `npm.cmd` on Windows. Do not update visual baselines until the relevant intentional material diff has been reviewed.

---

### Task 1: Freeze Typography and Geometry Before the Visual Change

**Files:**
- Modify: `tests/visual/fixtures.mjs:33-40`
- Modify: `tests/visual/style-contract.json`
- Test: `tests/visual/ui.visual.spec.mjs`

**Interfaces:**
- Consumes: existing `collectElementStyleContract(locator)` calls in `tests/visual/ui.visual.spec.mjs`.
- Produces: style-contract entries that freeze typography and layout before any Liquid Glass material is implemented.

- [ ] **Step 1: Expand the collected invariant properties while the UI is still visually unchanged**

Replace the single style-key list with explicitly named layout and material groups, preserving the flattened return format used by current callers:

```js
export const LAYOUT_STYLE_KEYS = Object.freeze([
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'padding',
  'gap',
  'margin',
  'borderRadius'
]);

export const MATERIAL_STYLE_KEYS = Object.freeze([
  'backgroundImage',
  'boxShadow'
]);

const STYLE_KEYS = Object.freeze([
  ...LAYOUT_STYLE_KEYS,
  ...MATERIAL_STYLE_KEYS
]);
```

Keep `boundingBox` collection and rounding exactly as currently implemented.

- [ ] **Step 2: Run the visual suite without updating and confirm the expanded contract fails for missing keys**

Run:

```powershell
npm.cmd run test:visual -- --reporter=line
```

Expected: screenshot assertions remain stable, while style-contract assertions report the newly collected typography/layout keys as absent from the saved JSON.

- [ ] **Step 3: Record the pre-redesign invariant baseline**

Run:

```powershell
npm.cmd run test:visual:update -- --reporter=line
```

Expected: all visual tests pass and `tests/visual/style-contract.json` gains `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, and `margin` for every existing contract entry. Existing screenshot bytes should remain unchanged; inspect `git diff --stat` and do not accept unrelated PNG changes.

- [ ] **Step 4: Re-run the suite without update mode**

Run:

```powershell
npm.cmd run test:visual -- --reporter=line
```

Expected: all existing visual tests pass against the expanded baseline.

- [ ] **Step 5: Commit the invariant baseline**

```powershell
git add tests/visual/fixtures.mjs tests/visual/style-contract.json
git commit -m "test: freeze liquid glass layout invariants"
```

---

### Task 2: Build the Tested Liquid Glass Runtime and SVG Host

**Files:**
- Create: `src/ui/liquidGlass.js`
- Create: `src/ui/liquidGlass.test.js`
- Create: `src/components/ui/LiquidGlassFilters.vue`
- Modify: `package.json:6-7`

**Interfaces:**
- Produces: `LIQUID_GLASS_MODES`, `GLASS_PRESET`, `isChromiumEngine(navigatorLike)`, `resolveLiquidGlassMode(input)`, `buildLiquidGlassDisplacement(input)`, `installLiquidGlassEnvironment(options)`, `liquidGlassDirective`, and `liquidGlassPlugin`.
- Produces: one document-level `ui-liquid-glass-filter-host`; generated filters use unique `ui-liquid-glass-<number>` IDs and are cached by geometry/configuration.
- Consumers: `src/main.js`, `src/App.vue`, `CardStats.vue`, and `SongStats.vue` in later tasks.

- [ ] **Step 1: Add failing pure capability tests**

Create `src/ui/liquidGlass.test.js` with Node tests covering Chromium, fallback, and forced opaque modes:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LIQUID_GLASS_MODES,
  isChromiumEngine,
  resolveLiquidGlassMode
} from './liquidGlass.js';

test('detects Chromium and Edge brands without treating Safari as Chromium', () => {
  assert.equal(isChromiumEngine({ userAgentData: { brands: [{ brand: 'Chromium' }] } }), true);
  assert.equal(isChromiumEngine({ userAgent: 'Mozilla/5.0 Edg/140.0.0.0' }), true);
  assert.equal(isChromiumEngine({ userAgent: 'Mozilla/5.0 Version/18.0 Safari/605.1.15' }), false);
});

test('selects refraction only for Chromium with ordinary backdrop filtering', () => {
  assert.equal(resolveLiquidGlassMode({ isChromium: true, supportsBackdropFilter: true }), LIQUID_GLASS_MODES.refractive);
  assert.equal(resolveLiquidGlassMode({ isChromium: false, supportsBackdropFilter: true }), LIQUID_GLASS_MODES.frosted);
  assert.equal(resolveLiquidGlassMode({ isChromium: true, supportsBackdropFilter: false }), LIQUID_GLASS_MODES.frosted);
});

test('forced colors and reduced transparency always select opaque mode', () => {
  assert.equal(resolveLiquidGlassMode({ isChromium: true, supportsBackdropFilter: true, forcedColors: true }), LIQUID_GLASS_MODES.opaque);
  assert.equal(resolveLiquidGlassMode({ isChromium: true, supportsBackdropFilter: true, reducedTransparency: true }), LIQUID_GLASS_MODES.opaque);
});
```

- [ ] **Step 2: Register the test and verify it fails**

Append `src/ui/liquidGlass.test.js` to the existing `test:unit` command in `package.json`.

Run:

```powershell
npm.cmd run test:unit
```

Expected: failure because `src/ui/liquidGlass.js` does not exist.

- [ ] **Step 3: Implement capability resolution and root environment state**

Implement these exact mode names and function signatures:

```js
export const LIQUID_GLASS_MODES = Object.freeze({
  refractive: 'refractive',
  frosted: 'frosted',
  opaque: 'opaque'
});

export function isChromiumEngine(navigatorLike = {}) {}

export function resolveLiquidGlassMode({
  isChromium = false,
  supportsBackdropFilter = false,
  reducedTransparency = false,
  forcedColors = false
} = {}) {}

export function installLiquidGlassEnvironment({
  window: windowLike = globalThis.window,
  document: documentLike = globalThis.document
} = {}) {}
```

`installLiquidGlassEnvironment` must set `document.documentElement.dataset.uiGlassMode` to one of the three modes and `dataset.uiGlassMotion` to `full` or `reduced`. It must listen to `(prefers-reduced-transparency: reduce)`, `(forced-colors: active)`, and `(prefers-reduced-motion: reduce)`, support both `addEventListener('change')` and legacy `addListener`, and return one idempotent cleanup function that removes every listener and the two root attributes.

Feature queries cannot distinguish Safari's parsed-but-blank SVG backdrop behavior. Gate SVG refraction on `isChromiumEngine`; use capability probing only for the ordinary CSS fallback:

```js
const filterValue = 'blur(1px)';
const supportsBackdropFilter = Boolean(
  windowLike?.CSS?.supports?.('backdrop-filter', filterValue)
  || windowLike?.CSS?.supports?.('-webkit-backdrop-filter', filterValue)
);
```

- [ ] **Step 4: Add failing displacement-field tests**

Import `GLASS_PRESET` and `buildLiquidGlassDisplacement`. Use a literal `40x24` surface, `8px` radius, and `1440x1000` viewport. Assert that the returned RGBA buffer has four bytes per baked pixel, the decoded center displacement is within `0.5px` of zero, at least one edge sample exceeds `1px`, and `scale > 0`. Add a `2000x100` case proving the longest baked edge is at most `1400`, plus two identical calls whose cache keys match.

The production function has this exact interface:

```js
export function buildLiquidGlassDisplacement({
  width,
  height,
  radius,
  viewportWidth,
  viewportHeight,
  config = GLASS_PRESET
}) {
  return { mapWidth, mapHeight, rgba, scale, cacheKey };
}
```

Use the preset values and formulas from `C:/Users/Melodrama/.codex/skills/liquid-glass/references/refraction.md` verbatim, including `SUPERSAMPLE = 2`, `MAX_MAP_EDGE = 1400`, `BLUR_STD_PER_RADIUS = 0.35`, `warp:false`, and neutral-byte bias correction.

- [ ] **Step 5: Add failing lifecycle and filter-registry tests for the directive**

Add test doubles for `requestAnimationFrame`, `cancelAnimationFrame`, `ResizeObserver`, element event listeners, `style.setProperty`, and `getBoundingClientRect`. Assert that:

```js
const element = createFakeGlassElement({ left: 10, top: 20, width: 200, height: 100 });
liquidGlassDirective.mounted(element);
element.dispatch('pointermove', { clientX: 160, clientY: 45 });
flushAnimationFrame();
assert.equal(element.style.values.get('--ui-glass-pointer-x'), '75%');
assert.equal(element.style.values.get('--ui-glass-pointer-y'), '25%');
assert.equal(element.style.values.get('--ui-glass-surface-width'), '200px');
assert.equal(element.style.values.get('--ui-glass-surface-height'), '100px');
liquidGlassDirective.unmounted(element);
assert.equal(element.listenerCount(), 0);
assert.equal(activeResizeObservers(), 0);
```

Also verify that multiple pointer events before one frame produce only one style update, a window resize is debounced by 180ms, identical geometry shares one filter node with two references, unmounting the first consumer retains the shared node, and unmounting the final consumer removes it. The fake DOM/canvas belongs in the test file; production must not expose test-only cleanup methods.

- [ ] **Step 6: Implement the displacement field, directive, registry, and Vue plugin**

Keep this MIT attribution notice at the top of the port:

```js
/*!
 * Liquid Glass refraction field derived from liquid-glass-js
 * (https://github.com/dashersw/liquid-glass-js), Copyright (c) 2025
 * Armagan Amcalar, MIT License. The web port samples the live backdrop.
 */
```

Use a module-level `WeakMap` for per-element cleanup. `liquidGlassDirective.mounted(element)` must:

- set `data-liquid-glass-interactive` without changing classes or geometry;
- attach `pointermove` and `pointerleave` listeners;
- coalesce pointer writes through one animation frame;
- clamp percentages to `0..100`;
- read the computed border radius, bake/acquire the geometry-keyed SVG displacement filter, and set inline `backdropFilter:url(#generated-id)` only in refractive mode;
- update size variables and rebuild/acquire through one `ResizeObserver` when available;
- debounce window-resize rebuilds by 180ms because displacement is viewport-relative;
- share connected same-key filter nodes through a reference-counted registry and release the prior entry before switching keys;
- restore the highlight to `50% 0%` on pointer leave;
- remove listeners, observer, timers, queued frames, data attribute, inline refraction style, owned custom properties, and the final filter reference on unmount.

Export a plugin with this interface:

```js
export const liquidGlassPlugin = {
  install(app) {
    const cleanupEnvironment = installLiquidGlassEnvironment();
    app.directive('liquid-glass', liquidGlassDirective);
    app.onUnmount?.(cleanupEnvironment);
  }
};
```

- [ ] **Step 7: Create the singleton SVG filter host**

Create `src/components/ui/LiquidGlassFilters.vue` with one hidden, non-focusable SVG host. Keep it in the DOM rather than `display:none`; generated filters are appended to its `<defs>` by the directive:

```vue
<template>
  <svg
    id="ui-liquid-glass-filter-host"
    class="ui-liquid-glass-filter-host"
    width="0"
    height="0"
    aria-hidden="true"
    focusable="false"
  >
    <defs></defs>
  </svg>
</template>

<style scoped>
.ui-liquid-glass-filter-host {
  position: fixed;
  inset: 0 auto auto 0;
  overflow: hidden;
  pointer-events: none;
}
</style>
```

Each generated filter must contain `feImage → feDisplacementMap → feGaussianBlur`, set its filter region from `scale / 2 + 3 * blurRadius * 0.35`, and verify a cached filter's `isConnected` before reuse.

- [ ] **Step 8: Run unit tests and commit**

Run:

```powershell
npm.cmd run test:unit
git diff --check
```

Expected: all unit tests pass and the diff has no whitespace errors.

```powershell
git add package.json src/ui/liquidGlass.js src/ui/liquidGlass.test.js src/components/ui/LiquidGlassFilters.vue
git commit -m "feat: add liquid glass runtime"
```

---

### Task 3: Add the Central Material Styles and App Shell Refraction

**Files:**
- Modify: `src/styles/tokens.css`
- Create: `src/styles/liquid-glass.css`
- Modify: `src/main.js`
- Modify: `src/App.vue:1-4,407-430,3120-3141`
- Modify: `scripts/check-ui-policy.js`
- Modify: `scripts/tests/check-ui-policy.test.js`
- Test: `tests/visual/foundation.contract.spec.mjs`

**Interfaces:**
- Consumes: `liquidGlassPlugin`, `v-liquid-glass`, and filter IDs from Task 2.
- Produces: `.ui-liquid-glass`, `.ui-liquid-glass--refractive`, `.ui-liquid-glass--regular`, `.ui-liquid-glass--modal`, and `.ui-liquid-glass--chip`.
- Produces: one document-level `<LiquidGlassFilters />` instance.

- [ ] **Step 1: Add failing UI policy tests for a single source of truth**

Extend the policy-test fixture with `src/styles/liquid-glass.css`, `src/main.js`, `src/App.vue`, and `src/components/ui/LiquidGlassFilters.vue`. Add tests requiring:

```js
assert.ok(diagnostics.some((message) => message.includes('missing global liquid glass import')));
assert.ok(diagnostics.some((message) => message.includes('LiquidGlassFilters must be mounted exactly once')));
assert.ok(diagnostics.some((message) => message.includes('liquid glass material selector must stay centralized')));
```

The passing fixture must contain exactly one `import './styles/liquid-glass.css'`, with this order:

```js
import './styles/tokens.css';
import './style.css';
import './styles/liquid-glass.css';
import './styles/primitives.css';
```

It must also contain exactly one `LiquidGlassFilters` import and template instance. A consumer SFC defining `.ui-liquid-glass--regular { ... }` must fail policy inspection.

- [ ] **Step 2: Verify the policy tests fail**

Run:

```powershell
node --test scripts/tests/check-ui-policy.test.js
```

Expected: the new governance assertions fail before the checker knows about Liquid Glass.

- [ ] **Step 3: Add values-only material tokens**

Append this semantic family to `:root` in `src/styles/tokens.css`; visual tuning may adjust only these values, not consumer geometry:

```css
--ui-glass-refractive-bg: linear-gradient(145deg, rgba(255, 255, 255, 0.40), rgba(236, 254, 255, 0.18) 46%, rgba(224, 231, 255, 0.14));
--ui-glass-regular-bg: linear-gradient(145deg, rgba(255, 255, 255, 0.70), rgba(239, 246, 255, 0.46) 52%, rgba(238, 242, 255, 0.34));
--ui-glass-modal-bg: linear-gradient(145deg, rgba(255, 255, 255, 0.84), rgba(239, 246, 255, 0.66) 54%, rgba(238, 242, 255, 0.56));
--ui-glass-chip-bg: rgba(255, 255, 255, 0.30);
--ui-glass-chip-bg-hover: rgba(255, 255, 255, 0.46);
--ui-glass-rim-light: rgba(255, 255, 255, 0.88);
--ui-glass-rim-dark: rgba(100, 116, 139, 0.18);
--ui-glass-shadow-refractive: 0 20px 54px rgba(15, 23, 42, 0.16), 0 3px 12px rgba(14, 165, 233, 0.08);
--ui-glass-shadow-regular: 0 18px 48px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(59, 130, 246, 0.06);
--ui-glass-shadow-modal: 0 28px 80px rgba(15, 23, 42, 0.26), 0 8px 24px rgba(14, 165, 233, 0.10);
--ui-glass-filter-refractive: saturate(190%) brightness(1.05) blur(14px);
--ui-glass-filter-regular: saturate(180%) brightness(1.03) blur(22px);
--ui-glass-filter-modal: saturate(175%) brightness(1.02) blur(30px);
--ui-glass-pointer-x: 50%;
--ui-glass-pointer-y: 0%;
--ui-glass-motion-duration: 220ms;
```

- [ ] **Step 4: Implement the four centralized tiers and accessibility fallback**

Create `src/styles/liquid-glass.css`. The implementation must preserve consumer border widths, radii, padding, and overflow rules. Use tier variables and pseudo-elements rather than geometry overrides:

```css
.ui-liquid-glass {
  position: relative;
  background: var(--ui-glass-surface-bg);
  border-color: var(--ui-glass-rim-light);
  box-shadow: var(--ui-glass-surface-shadow);
  -webkit-backdrop-filter: var(--ui-glass-surface-filter);
  backdrop-filter: var(--ui-glass-surface-filter);
}

.ui-liquid-glass--refractive {
  --ui-glass-surface-bg: var(--ui-glass-refractive-bg);
  --ui-glass-surface-shadow: var(--ui-glass-shadow-refractive);
  --ui-glass-surface-filter: var(--ui-glass-filter-refractive);
}

.ui-liquid-glass--regular {
  --ui-glass-surface-bg: var(--ui-glass-regular-bg);
  --ui-glass-surface-shadow: var(--ui-glass-shadow-regular);
  --ui-glass-surface-filter: var(--ui-glass-filter-regular);
}

.ui-liquid-glass--modal {
  --ui-glass-surface-bg: var(--ui-glass-modal-bg);
  --ui-glass-surface-shadow: var(--ui-glass-shadow-modal);
  --ui-glass-surface-filter: var(--ui-glass-filter-modal);
}

.ui-liquid-glass--chip {
  --ui-glass-surface-bg: var(--ui-glass-chip-bg);
  --ui-glass-surface-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
  --ui-glass-surface-filter: none;
}

.ui-liquid-glass--chip:hover {
  --ui-glass-surface-bg: var(--ui-glass-chip-bg-hover);
}
```

The directive supplies the generated inline SVG backdrop filter on supported surfaces. Do not add a static URL filter in CSS. Add one rim/specular pseudo-element whose radial highlight uses `--ui-glass-pointer-x` and `--ui-glass-pointer-y`; it must use `pointer-events:none` and must not alter hit testing or measured size. The center tint remains near-colorless so hue comes from the strengthened ambient backdrop.

Add complete rules for:

```css
@media (prefers-reduced-motion: reduce) {}
@media (prefers-reduced-transparency: reduce) {}
@media (prefers-contrast: more) {}
@media (forced-colors: active) {}
```

The opaque paths must set `background:#f8fafc`, remove background images, box shadows, filters, and pseudo-elements, and restore a visible `CanvasText` border in forced-colors mode.

Enhance the existing body background only through `background-image`, `background-size`, and a low-amplitude transform-free `background-position` animation. Do not change body dimensions or scrolling.

- [ ] **Step 5: Import and install the system once**

Update `src/main.js`:

```js
import { createApp } from 'vue';
import './styles/tokens.css';
import './style.css';
import './styles/liquid-glass.css';
import './styles/primitives.css';
import { liquidGlassPlugin } from './ui/liquidGlass.js';
import App from './App.vue';

createApp(App).use(liquidGlassPlugin).mount('#app');
```

Import `LiquidGlassFilters` in `App.vue`, mount `<LiquidGlassFilters />` once immediately inside `.main-app`, and change the top shell to:

```vue
<div
  v-liquid-glass
  class="nav-tabs ui-liquid-glass ui-liquid-glass--refractive"
  :class="{ 'is-stats-top-compact': isStatsTopNavCompact }"
>
```

Remove the top shell's local background, shadow, border-color, and backdrop-filter values that are now owned centrally. Keep display, position, z-index, dimensions, padding, gap, and compact overflow unchanged. Remove backdrop filtering from its immediate tab buttons so they behave as chip fills rather than nested glass; keep active, hover, focus, pressed, and disabled states.

- [ ] **Step 6: Implement policy checks and make them pass**

Teach `scripts/check-ui-policy.js` to read `src/main.js` in addition to Vue/CSS sources. Add `inspectLiquidGlassGovernance(sourceMap)` that verifies the single import, import order, singleton host, and prohibits `.ui-liquid-glass`, `.ui-liquid-glass--refractive`, `.ui-liquid-glass--regular`, `.ui-liquid-glass--modal`, or `.ui-liquid-glass--chip` rule definitions outside `src/styles/liquid-glass.css`.

Run:

```powershell
node --test scripts/tests/check-ui-policy.test.js
npm.cmd run check:ui
npm.cmd run test:unit
```

Expected: all tests pass and the project policy prints `UI policy check passed`.

- [ ] **Step 7: Build and commit the central shell**

Run:

```powershell
npm.cmd run build
git diff --check
```

Expected: Vite build succeeds and the diff has no whitespace errors.

```powershell
git add src/styles/tokens.css src/styles/liquid-glass.css src/main.js src/App.vue scripts/check-ui-policy.js scripts/tests/check-ui-policy.test.js tests/visual/foundation.contract.spec.mjs
git commit -m "feat: centralize liquid glass materials"
```

---

### Task 4: Adopt Refraction in Shared Card and Song Navigation

**Files:**
- Modify: `src/components/CardStats.vue:2-18`
- Modify: `src/components/SongStats.vue:2-24`
- Modify: `src/styles/scoped/stats-navigation-base.css:19-80`
- Modify: `src/styles/scoped/stats-navigation-responsive.css:37-54`
- Test: `tests/visual/foundation.contract.spec.mjs`

**Interfaces:**
- Consumes: global tier classes and `v-liquid-glass` from Tasks 2-3.
- Produces: exactly matching Card/Song refractive sidebar and compact trigger behavior through the existing shared scoped files.

- [ ] **Step 1: Add failing DOM/material assertions**

Extend `foundation.contract.spec.mjs` to visit Card Stats and Song Stats at desktop and compact sizes and assert:

```js
await expect(page.locator('.stats-nav')).toHaveClass(/ui-liquid-glass--refractive/);
await expect(page.locator('.stats-nav')).toHaveAttribute('data-liquid-glass-interactive', '');
await expect(page.locator('.stats-nav .nav-quick-wrap')).toHaveCSS('backdrop-filter', 'none');
```

At compact width, click the existing collapsed navigation trigger and assert the visible `.stats-nav` keeps the refractive tier. When the trigger itself is visible, assert it has the same tier and directive attribute.

- [ ] **Step 2: Verify the new assertions fail**

Run:

```powershell
npm.cmd run test:visual -- --grep "foundation"
```

Expected: failure because the stats consumers have not adopted the shared tier.

- [ ] **Step 3: Add the shared consumer classes without changing structure**

In both CardStats and SongStats, change only the class/directive attributes:

```vue
<button
  v-if="navCollapsed"
  v-liquid-glass
  class="floating-menu-btn ui-liquid-glass ui-liquid-glass--refractive"
>
```

```vue
<aside
  v-liquid-glass
  class="stats-nav card-panel ui-liquid-glass ui-liquid-glass--refractive"
  :class="{ 'mobile-floating': isNavTopLayout, 'is-collapsed': navCollapsed, 'is-open': !navCollapsed }"
>
```

Do not change event handlers, conditional rendering, titles, icons, or state classes.

- [ ] **Step 4: Remove only the now-centralized shared material recipe**

In `stats-navigation-base.css` and its responsive counterpart, preserve layout, border width, radius, z-index, dimensions, scrolling, and transitions. Remove the duplicated glass background, shadow, backdrop-filter, and pseudo-element highlight from `.stats-nav` and `.floating-menu-btn` where the global tier now supplies them.

Flatten `.nav-quick-wrap` to a non-glass inner grouping surface:

```css
.nav-quick-wrap {
  border-color: var(--stats-nav-glass-line);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.34);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
```

Retain existing active navigation colors and pressed interactions.

- [ ] **Step 5: Run focused tests and commit**

Run:

```powershell
npm.cmd run test:visual -- --grep "foundation"
npm.cmd run check:ui
npm.cmd run build
git diff --check
```

Expected: focused foundation assertions, policy, and build pass. Existing style-contract material entries may still fail in the full visual suite until Task 6 deliberately updates them.

```powershell
git add src/components/CardStats.vue src/components/SongStats.vue src/styles/scoped/stats-navigation-base.css src/styles/scoped/stats-navigation-responsive.css tests/visual/foundation.contract.spec.mjs
git commit -m "feat: apply liquid glass to stats navigation"
```

---

### Task 5: Migrate Menus, Drawers, Toolbars, and Modals to Shared Tiers

**Files:**
- Modify: `src/App.vue:74-260,277-346,3176-3196,3814-4387`
- Modify: `src/components/EventHistory.vue:527-650,1147-1177,7366-7511,8404-9147`
- Modify: `src/components/PredictEditor.vue:2-10,1060-1323`
- Modify: `src/components/SpecialPredictGenerator.vue:26-31,4499-4651`
- Test: `tests/visual/foundation.contract.spec.mjs`

**Interfaces:**
- Consumes: `.ui-liquid-glass--regular` and `.ui-liquid-glass--modal` from Task 3.
- Produces: centralized non-refractive frost for overlay controls without changing Teleport positioning, transitions, z-index, scroll, or capture targets.

- [ ] **Step 1: Add failing tier and anti-nesting assertions**

Add representative Playwright assertions:

```js
await expect(page.locator('.source-menu')).toHaveClass(/ui-liquid-glass--regular/);
await expect(page.locator('.source-menu .source-list')).toHaveCSS('backdrop-filter', 'none');
await expect(page.locator('.filter-bar')).toHaveClass(/ui-liquid-glass--regular/);
await expect(page.locator('.filter-panel')).toHaveClass(/ui-liquid-glass--regular/);
await expect(page.locator('.predict-switch-dialog-card')).toHaveClass(/ui-liquid-glass--modal/);
```

Use existing fixture helpers to open the data-source menu and filter panel. For dialogs that require complex state, add a DOM contract assertion through the closest already-supported fixture rather than changing production behavior.

- [ ] **Step 2: Verify the assertions fail**

Run:

```powershell
npm.cmd run test:visual -- --grep "foundation"
```

Expected: failure because overlay consumers have not adopted the tiers.

- [ ] **Step 3: Apply regular and modal classes**

Add classes without wrappers or DOM reordering:

```text
regular: .source-menu, .filter-bar, .filter-panel, .predict-drawer, .special-toolbar
modal: .app-update-modal, .app-screenshot-modal, .predict-switch-dialog-card
```

These surfaces do not receive `v-liquid-glass`; displacement and pointer tracking remain limited to Task 4 and the App shell.

- [ ] **Step 4: Flatten nested glass inside the data-source menu**

Keep current dimensions, padding, gaps, and control state colors. Remove backdrop-filter from `.source-menu-username-wrap`, `.source-list`, `.source-actions`, `.source-order-controls`, confirmation groups, and drop zone. Use transparent or low-opacity non-filtered fills and `box-shadow`/border separation only. Remove `.source-menu::before` because the global tier owns the surface highlight.

- [ ] **Step 5: Remove only outer material declarations from the remaining consumers**

For each regular/modal consumer, remove local background gradient, material border color, glass shadow, backdrop-filter, and conflicting surface pseudo-element that are supplied centrally. Preserve:

- fixed/sticky/absolute positioning and z-index;
- width, height, max-size, padding, radius, overflow, and scrollbar behavior;
- transform/opacity transitions;
- semantic status borders such as failed/success;
- selected controls and destructive/save action colors;
- modal scrims and their independent blur;
- all focus, hover, active, disabled, Escape, outside-click, drag, and touch behavior.

- [ ] **Step 6: Run focused behavior and build checks**

Run:

```powershell
npm.cmd run test:visual -- --grep "foundation|history|special"
npm.cmd run check:ui
npm.cmd run build
git diff --check
```

Expected: focused behavior/contract tests, policy, and build pass. No export screenshot should change because none of the captured content targets gained a glass tier.

- [ ] **Step 7: Commit overlay adoption**

```powershell
git add src/App.vue src/components/EventHistory.vue src/components/PredictEditor.vue src/components/SpecialPredictGenerator.vue tests/visual/foundation.contract.spec.mjs
git commit -m "feat: unify liquid glass overlays"
```

---

### Task 6: Prove Refraction, Fallback, Layout Fidelity, and Export Safety

**Files:**
- Modify: `tests/visual/fixtures.mjs`
- Create: `tests/visual/liquid-glass.visual.spec.mjs`
- Modify: `tests/visual/style-contract.json`
- Modify: `tests/visual/__screenshots__/*.png` only for reviewed material screenshots
- Modify: `docs/ui-system.md`

**Interfaces:**
- Consumes: all runtime modes, tiers, consumers, and pre-redesign layout contract from Tasks 1-5.
- Produces: deterministic refraction/fallback coverage and reviewed visual baselines.

- [ ] **Step 1: Add deterministic mode helpers**

Extend `tests/visual/fixtures.mjs` with a helper that overrides the root mode after navigation without changing production storage or URL state:

```js
export const setLiquidGlassMode = async (page, mode, motion = 'reduced') => {
  await page.evaluate(({ nextMode, nextMotion }) => {
    document.documentElement.dataset.uiGlassMode = nextMode;
    document.documentElement.dataset.uiGlassMotion = nextMotion;
  }, { nextMode: mode, nextMotion: motion });
};
```

- [ ] **Step 2: Create failing refraction/fallback tests**

Create `liquid-glass.visual.spec.mjs` and assert at minimum:

```js
test('Chromium mode exposes one SVG host and a generated edge filter on the shell', async ({ page }) => {
  await gotoUiState(page, { tab: 'history', width: 1440, height: 1000 });
  await setLiquidGlassMode(page, 'refractive');
  await expect(page.locator('#ui-liquid-glass-filter-host')).toHaveCount(1);
  await expect(page.locator('.nav-tabs')).toHaveClass(/ui-liquid-glass--refractive/);
  const inlineFilter = await page.locator('.nav-tabs').evaluate((element) => element.style.backdropFilter);
  expect(inlineFilter).toMatch(/^url\("?#ui-liquid-glass-\d+"?\)$/);
  await expect(page.locator('#ui-liquid-glass-filter-host feImage')).toHaveCount(1);
  await expect(page.locator('#ui-liquid-glass-filter-host feDisplacementMap')).toHaveCount(1);
});

test('forced fallback keeps surfaces visible and removes displacement', async ({ page }) => {
  await gotoUiState(page, { tab: 'stats', width: 390, height: 844 });
  await setLiquidGlassMode(page, 'opaque');
  await expect(page.locator('.nav-tabs')).toBeVisible();
  await expect(page.locator('.nav-tabs')).toHaveCSS('background-color', 'rgb(248, 250, 252)');
  await expect(page.locator('.nav-tabs')).toHaveCSS('backdrop-filter', 'none');
});
```

Add tests for regular/menu and modal tiers, generated `feImage → feDisplacementMap → feGaussianBlur` order, singleton host, no refraction class on representative content panels, connected filter reuse, and complete pointer/filter cleanup after switching away from an async tab.

- [ ] **Step 3: Add material screenshots at representative viewports**

Capture stable states at:

```text
375x812   Card Stats compact trigger/sidebar state
390x844   Event History compact filter state
768x900   exact normalized breakpoint state
900x900   compact application boundary
1200x900  stats/export boundary
1440x1000 desktop stats navigation and data-source menu
```

Use `reducedMotion: 'reduce'`, fixed fixture data, and existing media route stubs. Screenshot names must include `liquid-glass` so they cannot be mistaken for the pre-redesign references.

- [ ] **Step 4: Run without snapshot updates and inspect failures**

Run:

```powershell
npm.cmd run test:visual -- --reporter=line
```

Expected: new screenshots are missing and existing style-contract material properties differ. Typography, spacing, margin, radius, and bounding boxes must match the Task 1 baseline; fix production CSS if any invariant differs.

- [ ] **Step 5: Update only reviewed material baselines**

After visually inspecting every generated screenshot, run:

```powershell
npm.cmd run test:visual:update -- --reporter=line
```

Inspect `git diff -- tests/visual/style-contract.json` and accept changes only to `backgroundImage` and `boxShadow`. Reject changes to font properties, padding, gap, margin, borderRadius, or boundingBox. Export PNG snapshots must remain byte-for-byte unchanged unless a test-environment-only metadata difference is proven and documented.

- [ ] **Step 6: Document the implemented ownership model**

Update `docs/ui-system.md` with:

- token → central stylesheet → plugin/filter host → consumer flow;
- the four tiers and approved consumers;
- the prohibition on nested/repeated-content glass;
- Chromium enhancement and frosted/opaque fallback behavior;
- accessibility media behavior;
- the rule that local SFCs retain geometry and semantic state colors only.

- [ ] **Step 7: Run the full verification matrix**

Run each command independently:

```powershell
npm.cmd run test:unit
npm.cmd run check:ui
npm.cmd run build
npm.cmd run test:visual -- --reporter=line
git diff --check
git status --short
```

Expected: unit and visual tests have zero failures, policy prints `UI policy check passed`, build succeeds, diff check is empty, and status contains only the reviewed Task 6 files.

- [ ] **Step 8: Commit verification artifacts and documentation**

```powershell
git add tests/visual/fixtures.mjs tests/visual/liquid-glass.visual.spec.mjs tests/visual/style-contract.json tests/visual/__screenshots__ docs/ui-system.md
git commit -m "test: verify liquid glass fidelity"
```

---

### Task 7: Final Interactive Visual Review and Corrective Pass

**Files:**
- Modify: only files implicated by verified visual, accessibility, performance, or behavior defects
- Test: full unit, policy, build, visual, and interactive browser checks

**Interfaces:**
- Consumes: completed implementation and baseline suite.
- Produces: a locally reviewable `5173` development version with no known fidelity regression.

- [ ] **Step 1: Start the existing development version**

Run from the development worktree:

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

Confirm the process path and served module sources resolve inside `.worktrees/ui-system-normalization`.

- [ ] **Step 2: Review real interactions in Chromium**

Inspect Card Stats, Event History, Song Stats, and Special Predict at desktop and compact sizes. Exercise tabs, source menu, filter panel, stats sidebar open/close, hover, pointer highlight, press/release, focus-visible, modal state, and scrolling beneath fixed glass surfaces.

Acceptance conditions:

- refraction is clearly visible at edges over teal/cyan/pink/violet backdrop fields;
- text and icons remain sharp;
- content cards do not shimmer or distort;
- no nested glass produces gray or muddy controls;
- no clipped pseudo-element blocks scrolling or clicks;
- resize across `768`, `900`, and `1200` keeps geometry stable;
- fallback mode remains readable and visually complete.

- [ ] **Step 3: Check runtime cost and lifecycle**

In browser evaluation, count `[data-liquid-glass-interactive]` and confirm no more than three are mounted on a normal page. Switch async tabs repeatedly and verify the count returns to the correct page state. Record that no console error, detached observer, runaway animation frame, or visibly degraded long-list scrolling occurs.

- [ ] **Step 4: Apply one bounded corrective pass if evidence requires it**

Adjust central token values first. Change consumer CSS only when the defect is consumer-specific. Do not alter invariant geometry to improve the material. Add a regression assertion for every functional defect fixed in this pass.

- [ ] **Step 5: Re-run final verification from a clean test state**

```powershell
npm.cmd run test:unit
npm.cmd run check:ui
npm.cmd run build
npm.cmd run test:visual -- --reporter=line
git diff --check
git status --short --branch
```

Expected: all checks pass. If the corrective pass changed files, stage only the implementation and regression-test paths that this plan authorizes, then commit the verified defect fix:

```powershell
git add src/styles/tokens.css src/styles/liquid-glass.css src/main.js src/App.vue src/components/CardStats.vue src/components/SongStats.vue src/components/EventHistory.vue src/components/PredictEditor.vue src/components/SpecialPredictGenerator.vue src/styles/scoped/stats-navigation-base.css src/styles/scoped/stats-navigation-responsive.css src/ui/liquidGlass.js src/ui/liquidGlass.test.js src/components/ui/LiquidGlassFilters.vue scripts/check-ui-policy.js scripts/tests/check-ui-policy.test.js tests/visual/fixtures.mjs tests/visual/foundation.contract.spec.mjs tests/visual/liquid-glass.visual.spec.mjs tests/visual/style-contract.json tests/visual/__screenshots__ docs/ui-system.md
git commit -m "fix: refine liquid glass edge fidelity"
```

Do not merge, push, or deploy. Hand the verified local branch and `5173` preview back to the user for approval.
