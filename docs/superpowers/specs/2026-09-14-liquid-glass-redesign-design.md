# iOS Liquid Glass Redesign Design

**Date:** 2026-09-14

**Status:** Approved direction, pending written-spec review

## 1. Context

The UI-system-normalization branch deliberately preserved the published layout and visual values while centralizing exact duplicates, shared breakpoints, reusable primitives, and regression tests. That is why the normalized branch currently looks almost identical to the published site.

This phase adds a visibly different, Apple-inspired Liquid Glass material system to the existing normalized branch. It does not create another preview branch, worktree, or port. The only two product states remain the GitHub-published `main` branch and the in-development `codex/ui-system-normalization` branch.

The implementation must preserve the current information architecture and carefully tuned typography, spacing, dimensions, and responsive layout. The visible redesign is limited to material, light, depth, refraction, and interaction feedback on the functional UI layer.

## 2. Goals

1. Make the development version immediately recognizable as a Liquid Glass redesign.
2. Add genuine pixel displacement with SVG `feDisplacementMap` on supported Chromium browsers instead of describing ordinary blur as refraction.
3. Centralize reusable Liquid Glass values, rendering, capability detection, and accessibility fallbacks.
4. Apply high-fidelity refraction selectively to navigation and control surfaces, following Apple's functional-layer model.
5. Preserve current content layout, font metrics, spacing, dimensions, DOM semantics, breakpoints, behavior, and export output.
6. Keep long lists, dense tables, image grids, and exported content stable and performant.

## 3. Non-goals

- No new page layout or navigation structure.
- No font, font-size, line-height, letter-spacing, padding, gap, margin, card-size, or grid redesign.
- No new viewport breakpoint; the normalized `520/700/768/900/1000/1200/1360` meanings remain unchanged.
- No dark-mode project in this phase.
- No WebGL renderer, whole-page screenshot texture, third-party glass library, or new runtime dependency.
- No refraction on every event item, statistic panel, song card, avatar, table row, checkbox, or badge.
- No third deployed/development version and no dedicated `5174` preview.

## 4. Design Principles

### 4.1 Functional layer, not content layer

Liquid Glass belongs to navigation, toolbars, sidebars, menus, and modal controls that float above content. Content remains visually stable beneath that layer. This makes the depth relationship clear and avoids reducing legibility in data-heavy views.

### 4.2 One glass surface per hierarchy level

Nested glass is prohibited. Once an outer shell is glass, its child controls use transparent fills, subtle vibrancy, or opaque selected-state fills. They do not create another backdrop-filter layer.

### 4.3 Refraction is progressive enhancement

The baseline is a complete CSS frosted-glass material. Supported Chromium browsers add displacement refraction to the backdrop-sampling pseudo-element. Unsupported browsers, reduced-transparency environments, forced-colors mode, or any runtime failure retain the readable CSS baseline.

### 4.4 Content stays sharp

Refraction and blur are rendered on a pseudo-element behind the surface content. Text, icons, focus rings, and hit targets are never passed through the displacement filter.

## 5. Material Tiers

The centralized system exposes four tiers. Consumers select a tier; they do not recreate its gradients, blur, borders, highlights, shadows, or fallback rules locally.

| Tier | Purpose | Refraction | Typical consumers |
| --- | --- | --- | --- |
| `refractive` | Primary floating navigation/control shell | Chromium progressive enhancement | top navigation, Card/Song stats sidebar, mobile stats menu button |
| `regular` | Readable floating panel | CSS frost only | data-source menu, filter popover, prediction drawer, fixed toolbars |
| `modal` | High-legibility dialog above a scrim | CSS frost only | update, screenshot/export, prediction-switch dialogs |
| `chip` | Small control inside a glass parent | none | tabs, pills, compact actions, state badges |

Content panels, event rows, tables, song/card grids, and exported canvases are not tiers in this system and retain their current component styling.

## 6. Visual Language

### 6.1 Ambient backdrop

The existing PJSK-inspired light background remains the foundation. Its teal, cyan, pink, and violet radial fields may be strengthened enough to make transparency and edge displacement visible, without changing content contrast or layout. Motion-capable environments may use a very slow, low-amplitude drift; reduced-motion environments receive the same field in a static position.

### 6.2 Glass body

The glass body uses a near-colorless, low-opacity tint so that it borrows color from the backdrop. A saturation/brightness pass keeps the surface lively. Larger sidebars and menus use a more opaque tint than compact navigation controls.

### 6.3 Optical edge

Each refractive surface has:

- a narrow displacement band around the inner edge;
- a soft inner white rim on the light-facing edge;
- a restrained darker rim on the opposite edge;
- a broad specular highlight that can react subtly to pointer position;
- an external depth shadow that remains softer than the selected control shadow.

The center remains calmer than the edge so text does not appear to swim.

### 6.4 State treatment

Existing active colors and semantic status colors remain recognizable. Hover may brighten the rim and tint. Pressed state preserves the current darkening and slight scale feedback. Focus-visible state remains explicit and is never communicated by transparency alone.

## 7. Architecture

### 7.1 Design tokens

`src/styles/tokens.css` remains values-only and gains semantic `--ui-glass-*` tokens for tint, blur, saturation, border/rim, shadow, refraction strength, specular position, and motion duration. Existing compatibility aliases remain in their consumer roots where required by the UI normalization contract.

### 7.2 Central material stylesheet

Create `src/styles/liquid-glass.css` and import it once from `src/main.js` after `src/style.css` and before global primitives. It owns:

- the four material-tier classes;
- pseudo-element stacking and clipping;
- rim, highlight, tint, shadow, and fallback declarations;
- capability-state selectors;
- reduced motion, reduced transparency, increased contrast, and forced-colors rules;
- the ambient backdrop enhancement.

Component styles may retain layout declarations and selected-state colors, but reusable material recipes must not be copied back into SFCs.

### 7.3 SVG filter host

Create one small application-level Vue component that mounts hidden SVG filter definitions once. Its definitions use `feDisplacementMap` for a controlled optical displacement and expose stable filter IDs to the central stylesheet. The filter operates on the backdrop pseudo-element, not the content layer.

### 7.4 Runtime capability and interaction controller

Create a focused `src/ui/liquidGlass.js` module and tests. It is responsible for:

- conservative Chromium/capability detection;
- activating refraction only after the SVG host exists;
- honoring reduced-transparency, forced-colors, and reduced-motion preferences;
- requestAnimationFrame-throttled pointer variables for the specular highlight;
- ResizeObserver updates only for the small set of refractive surfaces;
- complete listener, observer, frame, and attribute cleanup on unmount;
- falling back silently to the CSS material if any capability or lifecycle step fails.

Vue consumers use one directive or composable interface from this module. They do not create filters or global listeners themselves.

### 7.5 Governance

Extend the existing UI policy checker so that:

- the central stylesheet is imported exactly once and in the declared order;
- the SVG filter host is mounted exactly once;
- approved refractive consumers use the shared interface;
- new reusable Liquid Glass declarations are not introduced into consumer SFCs;
- the known legacy/component-specific blur rules remain explicit rather than being silently treated as centralized Liquid Glass.

## 8. Surface Mapping

### 8.1 Refractive tier

- App top navigation shell as one surface. Child tabs and status controls become chip-level fills, not nested glass.
- Card Stats and Song Stats navigation sidebar through their existing shared scoped navigation source.
- The existing compact/mobile stats navigation trigger when the sidebar is collapsed.

Only surfaces present on the current page are observed or animated. A normal page should have no more than two large refractive surfaces active simultaneously.

### 8.2 Regular tier

- App data-source menu.
- Event History filter popover and sticky filter-control shell where legibility permits.
- Prediction editor drawer and Special Predict fixed toolbar.

These receive centralized frost/rim styling but no displacement map because scrolling or transformed ancestors can destabilize backdrop sampling.

### 8.3 Modal tier

- App update dialog.
- App screenshot/export dialog.
- Event History prediction-switch dialog and equivalent high-priority confirmations.

Scrims remain independent from the dialog material and preserve current z-index ownership.

### 8.4 Untouched content layer

- Event items and long event-history lists.
- Card/Song statistic panels, tables, matrices, images, and avatars.
- Anvo artwork and fill export targets.
- Special Predict canvas content.

These may visually sit beneath glass controls but do not receive shared backdrop filtering.

## 9. Responsive Behavior

No breakpoint ownership changes. The same surface changes shape through existing CSS:

- desktop stats navigation remains fixed at its existing dimensions;
- compact stats navigation continues to use the existing mobile trigger and drawer behavior;
- top navigation preserves its current wrapping and label behavior;
- menus and modals preserve current placement, maximum dimensions, and scrolling.

Refraction geometry must refresh after a surface resize without changing its measured bounding box. The boundary suite covers both sides of every registered breakpoint, including exact `768px`.

## 10. Accessibility and Compatibility

- `prefers-reduced-motion: reduce`: disable ambient drift, pointer-following highlight motion, elastic/depth motion, and animated refraction changes; retain a static material.
- `prefers-reduced-transparency: reduce`: disable refraction/backdrop transparency and use an opaque high-legibility surface.
- `prefers-contrast: more`: strengthen the readable tint, edge, text contrast, and focus ring without changing geometry.
- `forced-colors: active`: remove gradients, shadows, backdrop filters, and displacement; use system colors and visible borders.
- Safari, Firefox, non-Chromium engines, or unsupported Chromium configurations: render the complete CSS frost fallback.
- Missing SVG host, observer support, or runtime exceptions: fail closed to the CSS frost fallback; never hide a control or block input.

## 11. Performance and Export Safety

- No whole-page DOM capture for live refraction.
- No WebGL canvas and no per-frame background texture upload.
- No repeated displacement filter on list/card/table items.
- Pointer updates are frame-throttled and local to hovered refractive surfaces.
- Resize work is observer-driven and coalesced.
- Hidden pages and unmounted components release observers and scheduled frames.
- Export targets keep their current content styling. Capture-mode and clone tests must prove that shell filters do not leak into PNG output.

## 12. Testing and Acceptance Criteria

### 12.1 Unit and policy tests

- Capability detection enables refraction only in the intended environment.
- Reduced-transparency and forced-colors states always select the opaque fallback.
- Pointer/resize controllers coalesce updates and clean up fully.
- SVG host and central stylesheet are singletons.
- Shared consumers do not duplicate the core material recipe.

### 12.2 Visual and geometry tests

- Add representative Liquid Glass screenshots for desktop and compact layouts.
- Exercise `375`, `390`, `768`, `900`, `1200`, and `1440` pixel widths, with boundary contracts covering the registered adjacent values.
- Capture top navigation, stats sidebar open/closed, data-source menu, filter panel, and representative modal states.
- Test both refraction-enabled and forced-fallback states.
- Preserve DOM order, roles, labels, aria state, keyboard behavior, and outside-click/Escape behavior.
- Expand the style contract to freeze `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, padding, gap, margin, and bounding boxes. Only material properties may intentionally differ.

### 12.3 Required project verification

The final implementation must pass:

```powershell
npm.cmd run test:unit
npm.cmd run check:ui
npm.cmd run build
npm.cmd run test:visual
git diff --check
```

Visual baselines may be updated only for the explicitly redesigned material regions. Content crops and geometry contracts must demonstrate that typography, spacing, and layout remain unchanged.

## 13. Delivery Boundary

Implementation occurs directly on `codex/ui-system-normalization` in the existing `.worktrees/ui-system-normalization` worktree. The dev server may continue to use port `5173`. No merge, push, or GitHub Pages deployment is authorized by this design; those remain separate user decisions after local visual review.
