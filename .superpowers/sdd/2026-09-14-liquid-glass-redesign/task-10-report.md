# Task 10 — Liquid Glass overlay refraction and transmission report

## Scope and handoff

- Worktree: `C:/Users/Melodrama/pjsk-planner/.worktrees/ui-system-normalization`
- Branch: `codex/ui-system-normalization`
- Base: `01a4e2b4663ee83546a695aefa5d81689dd28b69`
- Implementation commit: `9205954eb8a2a7fc88fb5f3064185f21f368ee8f` (`feat: extend liquid glass overlays`)
- The pre-existing untracked `test-results/` directory was preserved exactly and was never staged or committed.
- No dependency, breakpoint, layout, typography, DOM-structure, interaction, scroll, z-index, export-code, or export-artifact changes were made.

## Inherited RED evidence and root cause

The implementation was taken over after the Terra xhigh run had established RED and exhausted its account-side quota. The following evidence was rechecked against the base-to-working-tree diff and the final regression contracts; it is recorded as inherited evidence, not as final verification:

1. Tests-only browser contracts failed because the four approved regular overlay roots did not own `data-liquid-glass-interactive` or an inline `url(#ui-liquid-glass-...)` backdrop filter.
2. Focused unit RED command:

   ```text
   node --test --test-name-pattern='plugin bridge suspends and restores a disconnected surface behind a Fragment root' src/ui/liquidGlass.test.js
   ```

   In the inherited pre-fix state it failed at the suspension assertion with `true !== false`.
3. Chromium RED showed the cached `.filter-bar` after History → Stats as `isConnected: false` while retaining `data-liquid-glass-interactive` and its `url(#...)` filter.
4. Root cause: `EventHistory` has a top-level Teleport/Fragment shape, so the existing mixin bridge's `$el.contains()` test did not find registered surfaces during KeepAlive deactivation. A later RED update-while-disconnected case motivated the minimal resume guard in the final worktree.
5. A preceding focused four-test rendered-contract run passed before the quota interruption, but was not treated as final verification.

The current diff confirms the minimal causal fix: disconnected registered surfaces are suspended by the bridge, `resume()` does not attach a lifecycle while the element is disconnected, and a connected surface is restored once on activation. The added unit regression directly covers the Fragment-root sequence.

## Implementation summary

- Added `v-liquid-glass` only to the approved regular outer shells: Event History `.filter-bar` and conditional `.filter-panel`, the App conditional floating source menu, the conditional Predict drawer, and Special Predict `.special-toolbar`.
- Kept descendants, repeated event/card/list content, toolbar groups, and modal shells outside directive ownership.
- Kept the existing stats navigation directive and changed centralized `.stats-nav.ui-liquid-glass--refractive` material resolution to `--ui-stats-nav-glass-bg`.
- Applied the exact revised central material values from the latest brief:

  ```css
  --ui-stats-nav-glass-bg: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.56),
    rgba(255, 255, 255, 0.28) 42%,
    rgba(219, 234, 254, 0.20)
  );
  --ui-glass-regular-bg: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.48),
    rgba(248, 250, 252, 0.30) 52%,
    rgba(226, 232, 240, 0.20)
  );
  --ui-glass-filter-regular: saturate(142%) brightness(1.02) blur(15px);
  --ui-shell-glass-bg: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.52),
    rgba(255, 255, 255, 0.28) 52%,
    rgba(219, 234, 254, 0.18)
  );
  --ui-shell-glass-bg-hover: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.66),
    rgba(236, 254, 255, 0.38) 55%,
    rgba(219, 234, 254, 0.24)
  );
  ```

- Updated rendered contracts to assert runtime directive ownership, connected SVG filters, unfiltered descendants, opaque/forced-color cleanup, conditional release, KeepAlive restoration, stats-specific material, and style invariants.

## Fresh verification

All commands below were run after the final token correction and before the implementation commit unless noted otherwise.

| Command | Outcome |
| --- | --- |
| `node --test --test-name-pattern='plugin bridge suspends and restores a disconnected surface behind a Fragment root' src/ui/liquidGlass.test.js` | 1 passed, 0 failed |
| `npm.cmd run test:unit` | 65 passed, 0 failed |
| `npm.cmd run check:ui` | UI policy check passed |
| `npm.cmd run build` | Vite build passed; 90 modules transformed |
| Focused rendered contracts: `npx.cmd playwright test --config=playwright.config.mjs tests/visual/foundation.contract.spec.mjs tests/visual/liquid-glass.visual.spec.mjs --grep "regular|conditional|Card and Song|forced-colors clears|Special Predict toolbar" --reporter=line` | 7 passed; the eighth test hit a transient shared Vite `ERR_CONNECTION_REFUSED` before execution, then passed in isolation |
| Isolated rendered retry: `npx.cmd playwright test --config=playwright.config.mjs tests/visual/liquid-glass.visual.spec.mjs --grep "Card and Song expanded navigation" --reporter=line` | 1 passed |
| Targeted UI snapshot refresh: `npx.cmd playwright test --config=playwright.config.mjs tests/visual/ui.visual.spec.mjs --grep "history desktop captures\|history compact captures\|card stats desktop captures\|card stats compact captures\|song stats captures" --update-snapshots=all --reporter=line` | 5 passed |
| Targeted liquid-glass snapshot refresh: `npx.cmd playwright test --config=playwright.config.mjs tests/visual/liquid-glass.visual.spec.mjs --grep "card stats compact sidebar\|history compact filter\|card stats preserves the exact 768px\|history preserves the compact 900px\|desktop stats navigation\|desktop data-source menu\|desktop history filter panel" --update-snapshots=all --reporter=line` | 7 passed |
| `npm.cmd run test:visual -- --reporter=line` | 43 passed, 0 failed in 8.0 minutes |
| `git diff --check 01a4e2b4663ee83546a695aefa5d81689dd28b69..HEAD` | exit 0 after implementation commit |

The transient focused-run server interruption was retried with a fresh server and did not recur in the isolated test or the complete 43-test suite.

## Visual inspection matrix

Playwright Chromium generated the following matrix; the listed busy-background artifacts were opened and inspected locally after the final token refresh.

| Surface/mode | Viewports and evidence | Result |
| --- | --- | --- |
| Card Stats expanded navigation | 390, 768, 1200, 1440; `stats-compact.png`, `liquid-glass-card-stats-375-sidebar.png`, `liquid-glass-card-stats-768-boundary.png`, `liquid-glass-card-stats-1200-export-boundary.png`, `liquid-glass-card-stats-1440-navigation.png` | Stats-specific wash and rim remain visible; geometry and content remain stable. |
| Song Stats navigation/content | 390, 768, 1200, 1440; rendered contracts, canonical viewport probes, `songs-anvo-desktop.png` | Stats navigation uses the dedicated token; Anvo cards/content remain unfiltered. |
| Event History filter bar/panel | 390, 900, 1440; `liquid-glass-history-390-filter.png`, `liquid-glass-history-900-compact-boundary.png`, `liquid-glass-history-1440-filter-panel.png` | Busy event backdrops transmit through the outer surface while labels and controls remain legible/clickable. |
| Data-source menu | 390 and 1440; rendered contracts and `liquid-glass-history-1440-source-menu.png` | One refractive outer menu; source list descendants remain unfiltered. |
| Predict drawer | 390 and 1440; rendered contracts and lifecycle test | Conditional mount/unmount releases the filter and listener state. |
| Special Predict toolbar | 390 and 1440; rendered contracts plus locked/unlocked visual coverage | Toolbar owns the regular refraction; `.special-toolbar-group` remains unfiltered. |
| Frosted, opaque/reduced-transparency, forced-colors, reduced-motion | fallback artifacts and foundation/liquid-glass contracts | URL filters and filter nodes clear in opaque/forced-color modes; fallback remains readable; reduced motion keeps the static rim. |

## Snapshot and hash accounting

- Only material-affected, non-export screenshots are changed: `history-compact.png`, `history-desktop-source-menu.png`, `liquid-glass-card-stats-1440-navigation.png`, `liquid-glass-card-stats-375-sidebar.png`, `liquid-glass-card-stats-768-boundary.png`, `liquid-glass-history-1440-filter-panel.png`, `liquid-glass-history-1440-source-menu.png`, `liquid-glass-history-390-filter.png`, `liquid-glass-history-900-compact-boundary.png`, `songs-anvo-desktop.png`, `stats-compact.png`, and `stats-desktop.png`.
- `tests/visual/style-contract.json` changed only the six permitted `backgroundImage` material leaves (two regular leaves and four stats-navigation leaves); geometry, typography, spacing, radii, shadows, and all bounding boxes remain unchanged.
- The six export-named PNGs were compared byte-for-byte against base `01a4e2b4663ee83546a695aefa5d81689dd28b69` and all matched:

  | Artifact | Base/current SHA-1 |
  | --- | --- |
  | `card-panel-export.png` | `54ac360f8cb7bfef74dd32f3e484978d210be8c0` |
  | `history-predicted-export.png` | `b28851796ff7c2343a91c65026eaac9f51df59aa` |
  | `liquid-glass-card-stats-1200-export-boundary.png` | `697686382c12030de46963f1a7f9c530a70bb930` |
  | `song-anvo-fill-export.png` | `6d70bef636419e0458d02110af178758f1564381` |
  | `song-anvo-image-export.png` | `324691ad3b19800afe0f28ee9f155b7df34ae36b` |
  | `special-predict-export.png` | `86fffc6d9595e8f2171ac4831fef223a0676b67b` |

- No export source or export code changed.

## Changed files

Implementation commit `9205954eb8a2a7fc88fb5f3064185f21f368ee8f` contains these 23 tracked files:

```text
src/App.vue
src/components/EventHistory.vue
src/components/PredictEditor.vue
src/components/SpecialPredictGenerator.vue
src/styles/liquid-glass.css
src/styles/tokens.css
src/ui/liquidGlass.js
src/ui/liquidGlass.test.js
tests/visual/__screenshots__/history-compact.png
tests/visual/__screenshots__/history-desktop-source-menu.png
tests/visual/__screenshots__/liquid-glass-card-stats-1440-navigation.png
tests/visual/__screenshots__/liquid-glass-card-stats-375-sidebar.png
tests/visual/__screenshots__/liquid-glass-card-stats-768-boundary.png
tests/visual/__screenshots__/liquid-glass-history-1440-filter-panel.png
tests/visual/__screenshots__/liquid-glass-history-1440-source-menu.png
tests/visual/__screenshots__/liquid-glass-history-390-filter.png
tests/visual/__screenshots__/liquid-glass-history-900-compact-boundary.png
tests/visual/__screenshots__/songs-anvo-desktop.png
tests/visual/__screenshots__/stats-compact.png
tests/visual/__screenshots__/stats-desktop.png
tests/visual/foundation.contract.spec.mjs
tests/visual/liquid-glass.visual.spec.mjs
tests/visual/style-contract.json
```

## Concerns

- No verification blocker remains. The regular tier is intentionally a midpoint white wash over busy event backdrops; if a later human review still finds a specific panel too ghosted or too opaque, the next adjustment should remain a central token-only change.
- The required untracked `test-results/` directory remains present and unstaged; it was not deleted or altered intentionally.
