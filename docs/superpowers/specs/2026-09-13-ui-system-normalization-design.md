# PJSK Planner UI System Normalization Design

## Context

The application already has a carefully tuned visual language, but most of its design decisions live inside six large scoped Vue style blocks. The refactor must make those decisions governable without redesigning the current interface.

Current high-confidence duplication includes:

- `App.vue` and `EventHistory.vue` define the same seven shell-glass values under different local names.
- `CardStats.vue` and `SongStats.vue` define the same statistics-navigation dimensions, materials, and interaction states, plus dozens of identical rule blocks.
- `CardStats.vue`, `EventHistory.vue`, and `SongStats.vue` contain the same loading-shimmer implementation.
- Viewport boundaries are expressed with several related values (`699/700/701`, `760/768/769`, `900/901`, `1200/1201`) and JavaScript has an inclusive/exclusive mismatch at exactly `1200px`.

## Goal

Introduce a maintainable UI foundation, shared scoped source fragments, canonical responsive policy, and visual-regression safety net while preserving the current rendered UI. Breakpoint normalization is the only intentional visual change in this phase.

## Binding Constraints

1. Preserve the current font families, font sizes, line heights, spacing, dimensions, radii, colors, gradients, shadows, opacity, motion, DOM structure, class names, and feature behavior unless this specification explicitly names a breakpoint change.
2. Do not normalize merely similar values. Only exact duplicates may share a token or source fragment.
3. Preserve scoped-style compilation and cascade order. Shared rules from scoped components must remain scoped when compiled.
4. Keep compatibility aliases such as `--top-*`, `--history-*`, `--stats-*`, and `--pe-*`; consumers are not mass-renamed in this phase.
5. Keep feature/data variables local, including PJSK unit/attribute/rarity colors, card and matrix geometry, Anvo fill geometry, preview drag coordinates, export-clone overrides, and user-editable Special Predict canvas values.
6. Preserve the existing light appearance. Do not add dark mode, new fonts, new iconography, a new component library, or a new layout system.
7. Preserve pill controls and the existing press-to-darken feedback contract.
8. Do not push or publish. Work remains on the local `codex/ui-system-normalization` branch.

## Canonical Responsive Policy

Canonical viewport concepts are:

| Boundary | Meaning | Pairing convention |
|---|---|---|
| `520px` | extra-small phone | `max-width: 520px` / `min-width: 521px` |
| `700px` | small/editor transition | existing `max-width: 699px` / `min-width: 700px`, or `min-width: 701px` where the current layout uses an inclusive `700px` lower side |
| `768px` | small-tablet transition | `max-width: 768px` / `min-width: 769px` |
| `900px` | compact application layout | `max-width: 900px` / `min-width: 901px` |
| `1000px` | Event History preview-panel positioning only | JavaScript-only feature threshold |
| `1200px` | tablet/desktop and export transition | `max-width: 1200px` / `min-width: 1201px` |
| `1360px` | wide Card Stats adjustment | feature-specific upper bound |

The `680px` minimum-side capture threshold, pointer/hover media features, reduced-motion preference, and container-query thresholds are separate concepts and are not viewport breakpoints.

Allowed intentional changes:

- Change the two Card Stats `max-width: 760px` queries to `max-width: 768px`.
- Align JavaScript `< 1200` checks that model the CSS compact/export boundary to `<= 1200`.
- Treat `699/700/701` as one documented `700px` concept, but do not change which side owns exactly `700px` unless a focused regression test proves the chosen component behavior.

No other breakpoint is merged merely for neatness. In particular, Event History's `1000px` preview threshold and the `1360px` Card Stats bound remain feature-specific.

## Architecture

### 1. Foundation tokens

Create `src/styles/tokens.css` and load it before existing global and component styles. It contains only values already present in the application:

- shell glass material tokens shared by App and Event History;
- statistics-navigation dimensions and material tokens shared by Card Stats and Song Stats;
- neutral global-control values used by the existing `.pjsk-ui-*` controls;
- existing press and shimmer timing values where they are exact duplicates.

The tokens use a `--ui-*` namespace. Existing component-local variables remain declared in their current root selectors and point to the new tokens. This preserves inheritance boundaries, Teleport fallbacks, and existing consumer names.

### 2. Global primitives

Move only the already-global `.pjsk-ui-checkbox`, `.pjsk-ui-btn-pill`, `.pjsk-table`, and `.pjsk-ui-btn-circle` rules from `src/style.css` into `src/styles/primitives.css`. Their selectors and declarations remain behaviorally identical, with repeated literal values replaced by exact foundation tokens.

`src/main.js` loads `tokens.css`, then the existing `style.css` base rules, then `primitives.css`. This keeps the current base-before-primitive cascade order. No new Vue wrapper component is introduced in this phase because extra DOM and changed selector specificity would violate the visual-preservation constraint.

### 3. Shared scoped fragments

Extract exact duplicated author-source rules into shared CSS fragments that are compiled separately through each consuming SFC's `scoped` pipeline:

- statistics navigation base rules shared by Card Stats and Song Stats;
- statistics navigation responsive rules shared by Card Stats and Song Stats;
- loading-shimmer rules shared by Card Stats, Event History, and Song Stats.

Split SFC style blocks only where necessary to preserve the original source order. Component-specific declarations stay adjacent to their original override positions. Generated CSS must retain equivalent selector scoping and precedence.

### 4. Breakpoint registry and contract check

Create a small JavaScript breakpoint registry for runtime checks and replace duplicated JavaScript threshold literals with named queries or predicates. CSS continues to use numeric media queries because native CSS variables cannot be used in media conditions without adding a preprocessor.

Add a repository check that parses viewport `@media` conditions and rejects undeclared width boundaries. It must ignore container-query widths and non-width media features. The check is policy tooling, not a substitute for rendered regression tests.

### 5. Verification layer

Add Playwright configuration and deterministic visual tests using the already-installed Playwright dependency. Tests use local JSON data and deterministic media routing, locale, timezone, device scale, storage, and animation settling.

Coverage must include:

- App navigation and data-source controls;
- Card Stats representative navigation/panel states;
- Song Stats representative navigation/Anvo states;
- Event History top/filter/source states with full-render mode where needed;
- Special Predict locked state and a credential-free session-unlocked state;
- compact and desktop screenshots;
- geometry/overflow assertions immediately around canonical boundaries;
- representative exported PNG validation for both `html-to-image` and `html2canvas` paths.

System fonts can render differently across operating systems, so pixel baselines are authoritative only in the pinned Windows/Chromium environment. Computed-style and geometry assertions provide the cross-run contract.

## Migration Sequence

1. Establish the visual/geometry baseline before production CSS changes.
2. Add tokens and migrate the existing global primitives without visual change.
3. Add the breakpoint registry, normalize the explicitly allowed boundaries, and run boundary tests.
4. Extract the exact duplicated scoped statistics-navigation and shimmer rules.
5. Add the UI contract check and developer documentation.
6. Run unit tests, UI policy checks, production build, Playwright visual tests, export checks, and final code review.

Each production batch must be independently reviewable and committed locally before the next batch begins.

## Validation Matrix

At minimum, verify these viewport sizes:

- `375x667` and `667x375`;
- `520/521px` wide;
- `699/700/701px` wide;
- `760/761/768/769px` wide;
- `900/901px` wide;
- `1000/1001px` wide for Event History preview behavior;
- `1200/1201px` wide;
- `1360/1361px` wide;
- `1440x900` desktop baseline.

Tests immediately around breakpoints emphasize geometry and overflow rather than freezing both sides to the old pixel baselines, because the breakpoint normalization is intentional.

## Acceptance Criteria

1. Outside the documented breakpoint bands, before/after computed styles and geometry match for representative elements.
2. Desktop and compact visual snapshots show no unexplained differences.
3. Card Stats uses `768px`, not `760px`, for its two isolated compact rules.
4. Runtime checks that represent the `1200px` CSS boundary use the same inclusive semantics.
5. Card Stats and Song Stats consume one author-source implementation for their exact duplicated navigation rules.
6. Card Stats, Event History, and Song Stats consume one scoped author-source implementation for the exact duplicated shimmer rules.
7. Existing export paths still produce non-empty, non-white PNGs with valid dimensions.
8. Existing nine unit tests, the UI contract check, the production build, and the new Playwright suite pass.
9. No remote push or publish occurs.

## Deferred Work

The following are deliberately deferred to a future, explicitly visual redesign:

- merging similar-but-not-identical colors, spacing, radii, shadows, or typography;
- changing control sizes for accessibility;
- redesigning page composition or responsive wrapping;
- replacing image icons or introducing a component library;
- dark mode and global theme switching;
- migrating feature-specific dynamic and export-only styles.
