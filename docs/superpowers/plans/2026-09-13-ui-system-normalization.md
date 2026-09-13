# PJSK Planner UI System Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one governable UI foundation, canonical responsive runtime policy, scoped shared CSS sources, and deterministic regression coverage while preserving the current rendered interface except for the explicitly allowed breakpoint normalization.

**Architecture:** Global exact-value tokens load before the existing base stylesheet, while already-global controls move into a later primitives stylesheet without changing selectors. Runtime viewport decisions consume a small JavaScript registry; native CSS media queries retain numeric values and are checked by repository policy tooling. Exact Card/Song navigation and Card/Event/Song shimmer duplicates move to external CSS fragments that each Vue SFC compiles through its own `scoped` pipeline.

**Tech Stack:** Vue 3.5 SFCs, Vite 7, native CSS, Node.js test runner, Playwright 1.61 with Chromium, `html-to-image`, and `html2canvas`.

**Spec:** `docs/superpowers/specs/2026-09-13-ui-system-normalization-design.md`

## Global Constraints

1. Preserve the current font families, font sizes, line heights, spacing, dimensions, radii, colors, gradients, shadows, opacity, motion, DOM structure, class names, and feature behavior unless this plan explicitly names a breakpoint change.
2. Do not normalize merely similar values. Only exact duplicates may share a token or source fragment.
3. Preserve scoped-style compilation and cascade order. Shared rules from scoped components must remain scoped when compiled.
4. Keep compatibility aliases such as `--top-*`, `--history-*`, `--stats-*`, and `--pe-*`; consumers are not mass-renamed in this phase.
5. Keep feature/data variables local, including PJSK unit/attribute/rarity colors, card and matrix geometry, Anvo fill geometry, preview drag coordinates, export-clone overrides, and user-editable Special Predict canvas values.
6. Preserve the existing light appearance. Do not add dark mode, new fonts, new iconography, a new component library, or a new layout system.
7. Preserve pill controls and the existing press-to-darken feedback contract.
8. The only intentional layout changes are Card Stats `max-width: 760px` to `max-width: 768px` and JavaScript `< 1200` checks that model the CSS compact/export boundary to `<= 1200`.
9. Keep `699/700/701` ownership unchanged, keep Event History's `1000px` preview threshold, keep the Card Stats `1360px` bound, and keep `680px` minimum-side capture logic, pointer media features, reduced-motion media features, and container queries independent.
10. Do not push or publish. All commits remain on local branch `codex/ui-system-normalization`.

## File and Interface Map

| File | Responsibility |
|---|---|
| `playwright.config.mjs` | Pinned Windows/Chromium visual-test environment and Vite server lifecycle. |
| `tests/visual/fixtures.mjs` | Stable clock/storage/media routing, view navigation, computed-style capture, viewport overflow checks, and PNG validation. |
| `tests/visual/ui.visual.spec.mjs` | Desktop/compact screenshots, computed-style contract, and canonical boundary geometry checks. |
| `tests/visual/exports.visual.spec.mjs` | Card, Song, Event History, and Special Predict export validation. |
| `tests/visual/style-contract.json` | Current 1440px/390px computed-style and bounding-box baseline, generated before production CSS changes. |
| `tests/visual/__screenshots__/` | Pinned Chromium image baselines for representative states. |
| `src/styles/tokens.css` | Exact shared `--ui-*` values only; no selectors other than `:root`. |
| `src/styles/primitives.css` | Existing global `.pjsk-ui-*` and `.pjsk-table` rules, with selectors and declaration order preserved. |
| `src/ui/breakpoints.js` | Canonical runtime breakpoint values and inclusive comparison/query helpers. |
| `src/ui/breakpoints.test.js` | Exact-boundary unit tests for the runtime helpers. |
| `src/styles/scoped/stats-navigation-base.css` | Exact Card/Song base navigation rules compiled independently as scoped CSS by each SFC. |
| `src/styles/scoped/stats-navigation-responsive.css` | Exact Card/Song responsive navigation rules in their existing cascade position. |
| `src/styles/scoped/media-load-shimmer.css` | Exact shared shimmer selector, keyframes, and reduced-motion rule compiled independently by each consumer. |
| `scripts/check-ui-policy.js` | Executable repository policy for declared viewport widths and required scoped shared-source consumers. |
| `scripts/tests/check-ui-policy.test.js` | Behavior tests against controlled valid and invalid policy fixtures. |
| `docs/ui-system.md` | Developer contract for tokens, aliases, local exceptions, breakpoints, scoped fragments, and verification. |

---

### Task 1: Deterministic visual and export baseline

**Files:**

- Create: `playwright.config.mjs`
- Create: `tests/visual/fixtures.mjs`
- Create: `tests/visual/ui.visual.spec.mjs`
- Create: `tests/visual/exports.visual.spec.mjs`
- Create: `tests/visual/style-contract.json`
- Create: `tests/visual/__screenshots__/history-desktop-source-menu.png`
- Create: `tests/visual/__screenshots__/history-compact.png`
- Create: `tests/visual/__screenshots__/stats-desktop.png`
- Create: `tests/visual/__screenshots__/stats-compact.png`
- Create: `tests/visual/__screenshots__/songs-anvo-desktop.png`
- Create: `tests/visual/__screenshots__/special-predict-locked-compact.png`
- Create: `tests/visual/__screenshots__/special-predict-unlocked-desktop.png`
- Create: `tests/visual/__screenshots__/card-panel-export.png`
- Create: `tests/visual/__screenshots__/song-anvo-image-export.png`
- Create: `tests/visual/__screenshots__/song-anvo-fill-export.png`
- Create: `tests/visual/__screenshots__/history-predicted-export.png`
- Create: `tests/visual/__screenshots__/special-predict-export.png`
- Modify: `package.json`

**Interfaces:**

- Produces: `gotoUiState(page, options)` where `options` contains `tab`, `width`, `height`, `fullHistory`, and `unlockSpecialPredict`.
- Produces: `settleUi(page)`, `readStyleContract(page, selectors)`, `assertNoViewportOverflow(page)`, and `expectValidPng({ page, download, sourceRect, snapshotName })` from `tests/visual/fixtures.mjs`.
- Produces: package scripts `test:unit`, `test:visual`, and `test:visual:update`.
- Consumes: checked-in `public/data/*.json` and `public/hello.jpg`; it must not consume ignored `public/cards/` or `public/songs/` caches.

- [ ] **Step 1: Add the pinned Playwright environment**

Create `playwright.config.mjs` with one worker, a deterministic browser context, and the existing Vite dev server:

```js
import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.001
    }
  },
  snapshotPathTemplate: 'tests/visual/__screenshots__/{arg}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    reducedMotion: 'reduce',
    timezoneId: 'Asia/Shanghai',
    serviceWorkers: 'block',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
```

In `package.json`, add these scripts without changing dependency versions:

```json
"test:unit": "node --test src/utils/cardLimitedRules.test.js src/utils/cardImageVariants.test.js",
"test:visual": "playwright test --config=playwright.config.mjs",
"test:visual:update": "playwright test --config=playwright.config.mjs --update-snapshots"
```

- [ ] **Step 2: Add deterministic browser fixtures**

Create `tests/visual/fixtures.mjs`. Use the exact storage keys already consumed by the app, freeze the date, and route ignored media caches to the checked-in image:

```js
export const VISUAL_CLOCK_ISO = '2026-09-13T04:00:00.000Z';

export const VISUAL_SOURCE = Object.freeze({
  id: 'visual-source',
  name: '视觉回归基线',
  kind: 'local',
  ownerName: 'visual',
  predictiveEvents: [{ id: 226, predict_schema_version: 3 }],
  createdAt: VISUAL_CLOCK_ISO,
  updatedAt: VISUAL_CLOCK_ISO
});

export const UI_STORAGE_KEYS = Object.freeze({
  currentTab: 'pjsk_planner_current_tab_v1',
  predictSources: 'pjsk_predict_sources_v1',
  predictActive: 'pjsk_predict_active_source_v1',
  predictUser: 'pjsk_predict_user_name_v1',
  specialUnlocked: 'pjsk_special_predict_generator_unlocked_v1'
});
```

`gotoUiState` must clear local/session storage before navigation, set the requested tab, seed `VISUAL_SOURCE`, optionally set only the existing special-generator session flag, install a `Date` subclass whose zero-argument constructor and `Date.now()` return `VISUAL_CLOCK_ISO`, route both `**/cards/**` and `**/songs/**` to `public/hello.jpg`, navigate with `?eventFullRender=1` when requested, wait until `.app-data-loading` and `.app-tab-loading` are absent, wait for `document.fonts.ready`, and wait two animation frames.

`settleUi` must additionally wait for currently rendered images to report `complete`, call `decode()` where available with bounded error handling, then wait two more animation frames. It must not wait for ignored offscreen caches or suppress application errors.

`assertNoViewportOverflow` must assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, a non-zero `.main-app` rectangle, and that every visible top-level `.nav-tabs > button` intersects the viewport. It must not reject intentional scrolling inside `.pjsk-table` wrappers.

`expectValidPng` must read the downloaded bytes, assert the eight-byte PNG signature, read positive big-endian IHDR width and height at offsets 16 and 20, compare the image/source aspect ratios within `0.08` when `sourceRect` is supplied, decode the PNG in the browser, sample a bounded canvas grid, require both a non-white pixel and at least two distinct sampled RGBA values, and use `snapshotName` for its decoded-image crop.

- [ ] **Step 3: Capture current UI behavior before production CSS changes**

Create `tests/visual/ui.visual.spec.mjs` with these stable cases:

1. History at `1440x1000` with `.source-trigger` clicked and the teleported `.source-menu-floating` visible.
2. History at `390x844`.
3. Card Stats at `1440x1000`, including `.stats-layout` and `#panel-dist`.
4. Card Stats at `390x844`.
5. Song Stats at `1440x1000`, with `#panel-another-vocal` scrolled into view and captured as a locator.
6. Special Predict locked at `390x844`.
7. Special Predict unlocked through `UI_STORAGE_KEYS.specialUnlocked` at `1440x1000` without entering or persisting a password/hash.

For the History, Stats, and Songs desktop/compact cases, collect `fontFamily`, `padding`, `gap`, `backgroundImage`, `boxShadow`, `borderRadius`, and bounding boxes for `.nav-tabs`, the feature navigation surface, and one representative panel. Write the current values to `tests/visual/style-contract.json` before any later production-style task and assert exact equality on subsequent runs.

Use the Playwright `testInfo.config.updateSnapshots` value to control this file: when it is not `none`, write the sorted contract as two-space-indented JSON plus a trailing newline; otherwise read `tests/visual/style-contract.json` with `node:fs/promises`, parse it, and assert deep equality. This makes the normal `--update-snapshots` workflow update both pixel and computed-style baselines without introducing another environment switch.

Probe these viewports through `page.setViewportSize` and call `assertNoViewportOverflow` after each change:

```js
const VIEWPORTS = [
  [375, 667], [667, 375], [520, 800], [521, 800],
  [699, 800], [700, 800], [701, 800],
  [760, 800], [761, 800], [768, 800], [769, 800],
  [900, 800], [901, 800], [1000, 800], [1001, 800],
  [1200, 900], [1201, 900], [1360, 900], [1361, 900], [1440, 900]
];
```

Use geometry/overflow assertions rather than pixel baselines at boundary widths. Include component-specific non-zero/visible checks for Card Stats at `760/761/768/769/900/901/1200/1201/1360/1361`, Song Stats at `699/700/701/900/901/1200/1201`, and Event History at `900/901/1000/1001/1200/1201`.

Run:

```powershell
npm.cmd run test:visual:update -- tests/visual/ui.visual.spec.mjs
npm.cmd run test:visual -- tests/visual/ui.visual.spec.mjs
```

Expected: the first command creates the seven UI screenshots and `style-contract.json`; the second command passes without updating artifacts.

- [ ] **Step 4: Cover both export engines and all existing export surfaces**

Create `tests/visual/exports.visual.spec.mjs` with four download cases:

1. Card Stats: click the PNG action in `#panel-dist` and validate the `html-to-image` output.
2. Song Stats: click the PNG action in `#panel-another-vocal`; cover image mode and, at `1201px`, activate fill mode before a second export.
3. Event History: seed event `226`, open the source menu, open `预测截图`, use range `226` to `226`, confirm export, and validate the `html-to-image` output.
4. Special Predict: seed only the existing unlocked session flag, use the default valid canvas state, click its PNG export action, and validate the `html2canvas` output.

Before each click, record the exported source element's bounding box. Wrap the click in `page.waitForEvent('download')`; pass the result and source rectangle to `expectValidPng`. Also capture a fixed crop of the decoded PNG so a white-canvas regression produces an actionable image diff.

Run:

```powershell
npm.cmd run test:visual:update -- tests/visual/exports.visual.spec.mjs
npm.cmd run test:visual -- tests/visual/exports.visual.spec.mjs
```

Expected: four surface paths download valid, non-empty, non-white PNGs; the Song Anvo test validates both image and fill modes.

- [ ] **Step 5: Verify and commit the baseline**

Run:

```powershell
npm.cmd run test:unit
npm.cmd run test:visual
npm.cmd run build
git diff --check
```

Expected: 9 unit tests pass, the full Playwright suite passes on the newly generated baselines, Vite builds successfully, and `git diff --check` prints no errors.

Commit:

```powershell
git add package.json playwright.config.mjs tests/visual
git commit -m "test: establish UI visual baseline"
```

---

### Task 2: Exact-value tokens and existing global primitives

**Files:**

- Create: `src/styles/tokens.css`
- Create: `src/styles/primitives.css`
- Create: `tests/visual/foundation.contract.spec.mjs`
- Modify: `src/main.js`
- Modify: `src/style.css`
- Modify: `src/App.vue`
- Modify: `src/components/EventHistory.vue`
- Modify: `src/components/CardStats.vue`
- Modify: `src/components/SongStats.vue`

**Interfaces:**

- Consumes: Task 1's `gotoUiState` and `style-contract.json`.
- Produces: global exact-value `--ui-shell-glass-*`, `--ui-stats-nav-*`, `--ui-control-*`, `--ui-motion-control`, and `--ui-motion-shimmer-duration` tokens.
- Preserves: component-local `--top-*`, `--history-*`, and `--stats-*` names as aliases.

- [ ] **Step 1: Write and run the failing foundation contract**

Create `tests/visual/foundation.contract.spec.mjs`. At `1440x1000`, assert that these computed root custom properties equal their exact current values:

```js
const expectedTokens = {
  '--ui-shell-glass-border': 'rgba(255, 255, 255, 0.72)',
  '--ui-stats-nav-width': '220px',
  '--ui-control-border': '#cbd5e1',
  '--ui-motion-control': '0.16s ease',
  '--ui-motion-shimmer-duration': '1.05s'
};
```

Also assert that `.pjsk-ui-btn-pill` retains its baseline border, background, color, radius, padding, font size, transition, hover background/border, active scale, and disabled opacity/pointer behavior. Use real buttons in Card/Song panels; do not create mock elements.

Run:

```powershell
npm.cmd run test:visual -- tests/visual/foundation.contract.spec.mjs
```

Expected RED: the `--ui-*` properties are empty because `tokens.css` does not exist yet; existing control assertions pass.

- [ ] **Step 2: Add the exact token source**

Create `src/styles/tokens.css` with this exact `:root` contract:

```css
:root {
  --ui-shell-glass-bg: linear-gradient(145deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.34) 52%, rgba(219, 234, 254, 0.24));
  --ui-shell-glass-bg-hover: linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(236, 254, 255, 0.46) 55%, rgba(219, 234, 254, 0.30));
  --ui-shell-glass-border: rgba(255, 255, 255, 0.72);
  --ui-shell-glass-shadow: 0 10px 30px rgba(15, 23, 42, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.78);
  --ui-shell-glass-shadow-soft: 0 5px 16px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.76);
  --ui-shell-active-bg: linear-gradient(145deg, rgba(20, 184, 166, 0.90), rgba(45, 212, 191, 0.72) 52%, rgba(14, 165, 233, 0.58));
  --ui-shell-active-border: rgba(94, 234, 212, 0.78);

  --ui-stats-nav-radius: 28px;
  --ui-stats-nav-inner-radius: 22px;
  --ui-stats-control-radius: 12px;
  --ui-stats-nav-width: 220px;
  --ui-stats-nav-left: 44px;
  --ui-stats-nav-top: 78px;
  --ui-stats-nav-glass-bg: linear-gradient(145deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.24) 42%, rgba(219, 234, 254, 0.18));
  --ui-stats-nav-glass-border: rgba(255, 255, 255, 0.62);
  --ui-stats-nav-glass-line: rgba(148, 163, 184, 0.26);
  --ui-stats-nav-glass-shadow: 0 18px 46px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.72), inset 0 -1px 0 rgba(15, 23, 42, 0.04);
  --ui-stats-nav-glass-blur: saturate(170%) blur(18px);
  --ui-stats-nav-control-bg: rgba(255, 255, 255, 0.24);
  --ui-stats-nav-control-bg-hover: rgba(255, 255, 255, 0.42);
  --ui-stats-nav-active-bg: linear-gradient(135deg, rgba(191, 219, 254, 0.66), rgba(224, 242, 254, 0.34));
  --ui-stats-nav-active-border: rgba(96, 165, 250, 0.58);

  --ui-control-bg: #ffffff;
  --ui-control-bg-hover: #f8fafc;
  --ui-control-border: #cbd5e1;
  --ui-control-border-hover: #94a3b8;
  --ui-control-label: #334155;
  --ui-control-label-muted: #475569;
  --ui-motion-control: 0.16s ease;
  --ui-motion-shimmer-duration: 1.05s;
}
```

Do not add dark tokens or change the existing font stack. These names are new foundations, not replacements for the component aliases.

- [ ] **Step 3: Preserve component-local inheritance through aliases**

In `.nav-tabs`, replace only the seven `--top-*` literal declarations with references to the corresponding `--ui-shell-*` tokens. In `.event-history-wrapper`, do the same for the seven `--history-*` declarations. The result must retain the existing local alias names, for example:

```css
--top-glass-bg: var(--ui-shell-glass-bg);
--history-glass-bg: var(--ui-shell-glass-bg);
```

In `.pjsk-card-stats` and `.pjsk-song-stats`, retain `--stats-radius-panel` locally (`28px` for Card, `18px` for Song), and replace only the 15 exact shared navigation literals with `var(--ui-stats-...)` aliases. Do not move any export, card geometry, matrix, Anvo, unit-color, or data-driven custom property.

- [ ] **Step 4: Move only already-global primitives and preserve import order**

Move the complete existing rule groups for `.pjsk-ui-checkbox`, `.pjsk-ui-btn-pill`, `.pjsk-table`, and `.pjsk-ui-btn-circle` from `src/style.css` into `src/styles/primitives.css`. Preserve selector order and every declaration. Replace only these exact repeated values with tokens:

```css
color: var(--ui-control-label-muted);
border-color: var(--ui-control-border);
background: var(--ui-control-bg);
color: var(--ui-control-label);
transition: all var(--ui-motion-control);
background: var(--ui-control-bg-hover);
border-color: var(--ui-control-border-hover);
```

Keep `border-radius: 999px`, `border-radius: 50%`, dimensions, opacity, transforms, typography, and disabled behavior unchanged.

Change `src/main.js` to this exact load order:

```js
import { createApp } from 'vue'
import './styles/tokens.css'
import './style.css'
import './styles/primitives.css'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 5: Run GREEN and visual equivalence checks**

Run:

```powershell
npm.cmd run test:visual -- tests/visual/foundation.contract.spec.mjs
npm.cmd run test:visual -- tests/visual/ui.visual.spec.mjs
npm.cmd run build
git diff --check
```

Expected GREEN: foundation tokens resolve to the exact values, global controls retain their interaction styles, all Task 1 screenshots and style contracts match, Vite builds, and the diff check is clean.

- [ ] **Step 6: Commit the foundation batch**

```powershell
git add src/main.js src/style.css src/styles/tokens.css src/styles/primitives.css src/App.vue src/components/EventHistory.vue src/components/CardStats.vue src/components/SongStats.vue tests/visual/foundation.contract.spec.mjs
git commit -m "refactor: centralize exact UI foundations"
```

---

### Task 3: Canonical runtime breakpoints and allowed boundary changes

**Files:**

- Create: `src/ui/breakpoints.js`
- Create: `src/ui/breakpoints.test.js`
- Modify: `src/App.vue`
- Modify: `src/components/PredictEditor.vue`
- Modify: `src/components/EventHistory.vue`
- Modify: `src/components/CardStats.vue`
- Modify: `src/components/SongStats.vue`
- Modify: `tests/visual/ui.visual.spec.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces: `UI_BREAKPOINTS`, `isViewportAtMost(width, boundary)`, `isViewportAbove(width, boundary)`, and `toMaxWidthMediaQuery(boundary)`.
- Preserves: CSS numeric media conditions, exact `700px` side ownership, `680px` minimum-side logic, container queries, and pointer/reduced-motion media features.
- Consumes: Task 1 boundary harness and Task 2 foundation styles.

- [ ] **Step 1: Write the failing exact-boundary unit contract**

Create `src/ui/breakpoints.test.js` using `node:test` and `node:assert/strict`. It must assert the exact registry object and both sides of every runtime comparison:

```js
const expected = {
  phoneXsMax: 520,
  editorTransition: 700,
  smallTabletMax: 768,
  compactMax: 900,
  historyPreviewMax: 1000,
  tabletMax: 1200,
  cardWideMax: 1360
};

assert.deepEqual(UI_BREAKPOINTS, expected);
assert.equal(isViewportAtMost(1200, UI_BREAKPOINTS.tabletMax), true);
assert.equal(isViewportAtMost(1200.01, UI_BREAKPOINTS.tabletMax), false);
assert.equal(isViewportAbove(1200, UI_BREAKPOINTS.tabletMax), false);
assert.equal(isViewportAbove(1201, UI_BREAKPOINTS.tabletMax), true);
assert.equal(toMaxWidthMediaQuery(UI_BREAKPOINTS.compactMax), '(max-width: 900px)');
```

Also assert the `900/901` and `1000/1001` pairs and that non-finite inputs return `false` from both comparison helpers.

Run:

```powershell
node --test src/ui/breakpoints.test.js
```

Expected RED: `src/ui/breakpoints.js` cannot be imported because it does not exist.

- [ ] **Step 2: Implement the minimal runtime registry**

Create `src/ui/breakpoints.js`:

```js
export const UI_BREAKPOINTS = Object.freeze({
  phoneXsMax: 520,
  editorTransition: 700,
  smallTabletMax: 768,
  compactMax: 900,
  historyPreviewMax: 1000,
  tabletMax: 1200,
  cardWideMax: 1360
});

const isFiniteWidth = (width) => Number.isFinite(Number(width));

export const isViewportAtMost = (width, boundary) => (
  isFiniteWidth(width)
  && isFiniteWidth(boundary)
  && Number(width) <= Number(boundary)
);

export const isViewportAbove = (width, boundary) => (
  isFiniteWidth(width)
  && isFiniteWidth(boundary)
  && Number(width) > Number(boundary)
);

export const toMaxWidthMediaQuery = (boundary) => `(max-width: ${Number(boundary)}px)`;
```

Run the focused test and require GREEN before touching component call sites.

- [ ] **Step 3: Replace JavaScript viewport literals without changing feature semantics**

Import the registry/helpers into `App.vue`, `PredictEditor.vue`, `EventHistory.vue`, `CardStats.vue`, and `SongStats.vue`.

Use `UI_BREAKPOINTS.compactMax` for existing `900px` JavaScript viewport decisions, `UI_BREAKPOINTS.historyPreviewMax` only for the Event History preview panel, and `UI_BREAKPOINTS.tabletMax` for the existing `1200px` compact/export decisions. Build App's media string with:

```js
`${toMaxWidthMediaQuery(UI_BREAKPOINTS.compactMax)}, (pointer: coarse)`
```

Keep each existing coarse-pointer clause and `minSide >= 680` clause in its current function. Keep `EventHistory` capture tier at its existing `900px` behavior. Keep `PredictEditor`'s local `MOBILE_BREAKPOINT` name as a compatibility alias assigned from `UI_BREAKPOINTS.compactMax`.

Change only the two known exclusive checks that model the CSS `max-width: 1200px` boundary:

```js
// CardStats and SongStats capture device tier
isViewportAtMost(width, UI_BREAKPOINTS.tabletMax)

// SongStats Anvo export compact branch
isViewportAtMost(Number(window?.innerWidth || 0), UI_BREAKPOINTS.tabletMax)
```

The existing Card Stats `viewportWidth > 0 && viewportWidth <= 1200` guard remains positive-width guarded while consuming the helper. Song's `canShowAnvoFillToggle` remains desktop-only through `isViewportAbove`.

- [ ] **Step 4: Make only the approved CSS breakpoint change and prove it in the browser**

Change both Card Stats queries from `@media (max-width: 760px)` to `@media (max-width: 768px)`. Do not change any declarations inside them.

Before changing the CSS, add a focused Playwright assertion to `tests/visual/ui.visual.spec.mjs` that opens Card Stats and checks at width `768`:

```js
await expect(page.locator('.section-head.section-head-sub').first()).toHaveCSS('align-items', 'center');
```

At width `769`, assert the base value `align-items: flex-start`. Assert `.nuigurumi-mobile-meta-head` is `display: table-cell` at `768px` and `display: none` at `769px`. Run the focused test before the CSS edit and record RED at `768px`; after the edit, record GREEN at `768px` and unchanged behavior at `769px`.

Do not alter `699/700/701`, `520/521`, `900/901`, `1200/1201`, or `1360` CSS conditions.

- [ ] **Step 5: Update commands and run boundary regression**

Update `test:unit` in `package.json` to include `src/ui/breakpoints.test.js`.

Run:

```powershell
npm.cmd run test:unit
npm.cmd run test:visual -- tests/visual/ui.visual.spec.mjs
npm.cmd run test:visual -- tests/visual/exports.visual.spec.mjs
npm.cmd run build
git diff --check
```

Expected: unit boundary tests pass, all canonical viewport probes have no global overflow, exact `768px` uses the newly approved Card Stats compact rules, exact `1200px` follows the CSS compact/export side, existing screenshot baselines outside the changed band remain unchanged, exports stay valid, and the build/diff checks pass.

- [ ] **Step 6: Commit the responsive-policy batch**

```powershell
git add src/ui/breakpoints.js src/ui/breakpoints.test.js src/App.vue src/components/PredictEditor.vue src/components/EventHistory.vue src/components/CardStats.vue src/components/SongStats.vue tests/visual/ui.visual.spec.mjs package.json
git commit -m "refactor: align canonical UI breakpoints"
```

---

### Task 4: Shared scoped navigation and shimmer sources with policy enforcement

**Files:**

- Create: `src/styles/scoped/stats-navigation-base.css`
- Create: `src/styles/scoped/stats-navigation-responsive.css`
- Create: `src/styles/scoped/media-load-shimmer.css`
- Create: `scripts/check-ui-policy.js`
- Create: `scripts/tests/check-ui-policy.test.js`
- Modify: `src/components/CardStats.vue`
- Modify: `src/components/SongStats.vue`
- Modify: `src/components/EventHistory.vue`
- Modify: `package.json`

**Interfaces:**

- Produces: three external author-source CSS fragments, each consumed through `<style scoped src="...">` rather than a global import.
- Produces: `inspectUiPolicy({ files, readText })` returning a sorted array of diagnostics and `runUiPolicyCheck(rootDir)` returning exit status through diagnostics.
- Consumes: Task 3's canonical CSS width set and Task 1's visual/style baselines.

- [ ] **Step 1: Write failing behavior tests for the UI policy checker**

Create `scripts/tests/check-ui-policy.test.js` using controlled in-memory file maps and `node:test`. Tests must call `inspectUiPolicy` and cover these behaviors:

1. Accept viewport media widths `520/521`, `699/700/701`, `768/769`, `900/901`, `1200/1201`, and `1360`.
2. Reject undeclared viewport widths such as `760` with a diagnostic containing file and line.
3. Ignore `@container (min-width: 760px)`, `prefers-reduced-motion`, and pointer/hover-only media features.
4. Require CardStats and SongStats to consume both scoped navigation fragments.
5. Require CardStats, SongStats, and EventHistory to consume the scoped shimmer fragment.
6. Reject an unscoped shared `src` style or a missing consumer.
7. Reject an exact normalized rule that remains duplicated inline in a consumer after the same rule is present in one of its shared fragments.

The fixture adapter must pass contents directly through `readText`; tests must not modify real repository files.

Run:

```powershell
node --test scripts/tests/check-ui-policy.test.js
```

Expected RED: `scripts/check-ui-policy.js` cannot be imported because it does not exist.

- [ ] **Step 2: Implement the minimal checker and confirm current-repo RED**

Create `scripts/check-ui-policy.js` as an ESM module. It must:

- scan `src/**/*.vue` and `src/**/*.css` with deterministic sorted paths;
- extract only `@media` condition headers before their opening brace;
- collect numeric `min-width`/`max-width` pixel values from those headers;
- reject any viewport width outside the exact set `[520, 521, 699, 700, 701, 768, 769, 900, 901, 1200, 1201, 1360]`;
- never inspect `@container` headers as viewport media;
- verify exact `<style scoped src="...">` consumers for the three shared fragments;
- compare normalized selector/declaration blocks in each shared fragment with the corresponding consumer's inline `<style scoped>` blocks and reject exact duplicates that remain in both places;
- print one diagnostic per line and exit `1` when run directly with findings, otherwise print `UI policy check passed` and exit `0`.

Implement file/line reporting by counting newlines before each match. Do not add a CSS parser dependency for this bounded grammar.

Run the unit test to GREEN, then run:

```powershell
node scripts/check-ui-policy.js
```

Expected repository RED at this point: missing scoped shared-fragment consumers. There must be no remaining `760px` diagnostic because Task 3 already normalized it.

- [ ] **Step 3: Extract the exact shared shimmer source at the same cascade point**

Create `src/styles/scoped/media-load-shimmer.css` from the currently identical CardStats/EventHistory/SongStats block:

```css
.media-load-shimmer:not([data-loaded='1']) {
  background-image: linear-gradient(110deg, #d1d5db 8%, #f3f4f6 18%, #d1d5db 33%);
  background-size: 220% 100%;
  animation: media-shimmer var(--ui-motion-shimmer-duration) linear infinite;
}

@keyframes media-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -40% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-load-shimmer:not([data-loaded='1']) {
    animation: none;
    background-image: none;
    background-color: #d1d5db;
  }
}
```

Remove the three duplicate blocks. Split each component's existing style block at the original shimmer position and insert:

```html
<style scoped src="../styles/scoped/media-load-shimmer.css"></style>
```

The local styles before and after it must remain on the same sides of the external block. Do not move export-clone shimmer disabling logic from JavaScript.

- [ ] **Step 4: Extract only exact Card/Song navigation rules**

Create `src/styles/scoped/stats-navigation-base.css` from the complete CardStats/SongStats rule blocks that are byte-equivalent after whitespace normalization in their base sections. Create `src/styles/scoped/stats-navigation-responsive.css` from their complete equivalent rule blocks inside the existing `max-width: 1200px`, `max-width: 900px`, and `max-width: 520px` sections.

Both consumers must include the fragments as scoped external style blocks:

```html
<style scoped src="../styles/scoped/stats-navigation-base.css"></style>
<style scoped src="../styles/scoped/stats-navigation-responsive.css"></style>
```

Split the local style blocks so each external fragment occupies the same relative cascade position as the earliest extracted rule it replaces. Leave these declarations local:

- `--stats-radius-panel` (`28px` Card, `18px` Song);
- any selector or declaration that differs between Card and Song;
- Card festival/matrix/related-record/special-limited geometry;
- Song Anvo fill and unit tint rules;
- all export-clone overrides and component-specific responsive rules.

Do not combine partial rule blocks. When a selector is common but one declaration differs, keep the complete rule local in both components unless the existing block can be split without changing selector specificity or declaration order.

- [ ] **Step 5: Prove scoped compilation, source governance, and visual equivalence**

Add to `package.json`:

```json
"check:ui": "node scripts/check-ui-policy.js"
```

Extend `test:unit` to include `scripts/tests/check-ui-policy.test.js`.

Run:

```powershell
npm.cmd run test:unit
npm.cmd run check:ui
npm.cmd run build
npm.cmd run test:visual -- tests/visual/foundation.contract.spec.mjs tests/visual/ui.visual.spec.mjs tests/visual/exports.visual.spec.mjs
git diff --check
```

Expected: the checker passes with no undeclared viewport width or missing/unscoped shared consumer, the emitted Card/Song/Event CSS still contains scoped selectors for navigation/shimmer rules, Task 1 style contracts and snapshots match, all export PNG checks pass, Vite builds, and the diff check is clean.

- [ ] **Step 6: Commit the scoped-source batch**

```powershell
git add src/styles/scoped src/components/CardStats.vue src/components/SongStats.vue src/components/EventHistory.vue scripts/check-ui-policy.js scripts/tests/check-ui-policy.test.js package.json
git commit -m "refactor: share scoped UI style sources"
```

---

### Task 5: UI governance documentation and complete local verification

**Files:**

- Create: `docs/ui-system.md`
- Modify: `README.md`

**Interfaces:**

- Consumes: Task 2 token names, Task 3 registry, Task 4 policy command/fragments, and Task 1 regression commands.
- Produces: one developer-facing source of truth linked from the repository README.

- [ ] **Step 1: Write the UI governance guide**

Create `docs/ui-system.md` with these concrete sections:

1. `范围与保真原则`: exact duplicates only; current visual values are frozen; breakpoint normalization is the only current visual change.
2. `加载顺序`: `tokens.css` → `style.css` → `primitives.css`, and why primitives remain after base rules.
3. `Token 分层`: shell glass, stats navigation, neutral global controls, and motion; show how `--top-*`, `--history-*`, and `--stats-*` remain local aliases.
4. `全局与局部边界`: list the four global primitive selector families and the feature/data/export variables that must stay local.
5. `Scoped 共享片段`: list all three fragment paths and every consumer; require `<style scoped src>` and explain cascade-position preservation.
6. `响应式策略`: document `520`, `700`, `768`, `900`, Event-only `1000`, `1200`, and Card-only `1360`; explicitly separate `680` minimum-side, pointer/hover, reduced-motion, and container queries.
7. `修改流程`: add or reuse a token only after exact-value comparison, add a breakpoint only with a documented feature meaning, run policy/tests/build, and update visual baselines only for reviewed visual changes.
8. `验证命令`: include the exact commands from Step 3 below.
9. `暂缓事项`: similar-value merging, accessibility-driven size changes, layout redesign, dark mode, new fonts/icons/library, and feature-specific dynamic/export styles.

Document that existing `border-radius: 999px` pill controls and press-to-darken/restore behavior are part of the UI contract. Do not describe future design work as already implemented.

- [ ] **Step 2: Link the guide from README without rewriting unrelated documentation**

Add one concise `UI 开发规范` entry in `README.md` linking to `docs/ui-system.md`. Keep all existing setup, sync, and product content unchanged.

- [ ] **Step 3: Run the complete fresh verification matrix**

Run each command independently and record its exit code/output in the implementer report:

```powershell
npm.cmd run test:unit
npm.cmd run check:ui
npm.cmd run build
npm.cmd run test:visual
git diff --check
git status --short
```

Expected: all unit tests pass with zero failures, `UI policy check passed`, Vite reports a successful production build, all UI/export Playwright tests pass without baseline updates, `git diff --check` is silent, and `git status --short` contains only the two documentation files before commit.

- [ ] **Step 4: Commit the documentation batch**

```powershell
git add docs/ui-system.md README.md
git commit -m "docs: define UI governance workflow"
```

- [ ] **Step 5: Verify the committed branch state**

After the commit, run:

```powershell
git status --short
git log --oneline --decorate -7
```

Expected: the worktree is clean, all implementation commits are on `codex/ui-system-normalization`, and no remote operation has occurred.

---

## Final Whole-Branch Review Gate

After Tasks 1–5 pass their task-scoped reviews, generate one review package from the branch merge base through `HEAD` and dispatch a fresh whole-branch reviewer. The reviewer must compare the complete diff against the design spec and specifically inspect:

- unexplained computed-style or screenshot changes outside `761–768px` and exact `1200px` runtime semantics;
- local alias/inheritance preservation around Teleport consumers;
- scoped compilation and cascade order of all three shared fragments;
- exact-only token extraction, especially Card `28px` versus Song `18px` panel radii;
- unchanged export clone/runtime behavior and non-white output coverage;
- UI policy false positives/negatives around `@container`, pointer, and reduced-motion rules;
- package scripts, documentation accuracy, and absence of push/publish changes.

If the reviewer reports Critical or Important findings, use one fix subagent for the complete final finding set, then one scoped re-review. Do not push, merge, or publish after review.
