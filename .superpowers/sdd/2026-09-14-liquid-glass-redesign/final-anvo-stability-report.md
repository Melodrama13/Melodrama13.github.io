# Final Anvo stability and Liquid Glass acceptance report

Date: 2026-09-15

Worktree: `C:\Users\Melodrama\pjsk-planner\.worktrees\ui-system-normalization`
Branch / base: `codex/ui-system-normalization` / `88b1a2ad3c93efc7b47571c9312f1485809e797a`

## Scope

This acceptance wave addresses the Anvo visual-capture failure, the central specular stacking contract, the nested Special Predict backdrop filter, and the documented stylesheet order. It does not change UI data, layout geometry, interaction behavior, breakpoints, tokens, masks, mismatch thresholds, or unrelated visual baselines. The pre-existing untracked `test-results/` evidence was inspected but not deleted, reset, staged, or committed.

## Anvo root-cause investigation

### Failure evidence and focused versus suite-order characterization

The retained controller full-suite artifact at `88b1a2a` recorded 34/35 passing and the Anvo locator snapshot failing by 31,014 pixels (ratio `0.02`). Its trace shows three locator-screenshot attempts, each executing `attempting scroll into view`; the final retry was stable as an image but vertically displaced from the baseline. The retained expected/actual/diff images show the same panel content at different vertical slices.

A fresh focused reproduction at the same base also failed with the same 31,014-pixel / `0.02` result. This demonstrates that suite order was not required for the race, while the earlier controller suite establishes that it can surface after the complete run. In both paths the remaining shared operation was Playwright's implicit scrolling for a locator taller than its scroll viewport; Task 7 had already removed the prior explicit pre-capture scroll operations.

Targeted live instrumentation at the screenshot boundary recorded:

| State | Value |
| --- | --- |
| Viewport | `1440 × 1000` |
| Scroll host | `.content-area`, `top=73`, `height=927`, `scrollHeight=14418` |
| Anvo panel before capture | `top=4659.719`, `height=1721`, `width=1090` |
| Host `scrollTop` before capture | `0` |
| Direct locator-screenshot scroll event | `scrollTop=4984`, panel `top=-324.281` |

The focused RED contract reproduced the same cause under the real test fixture: after `anvoPanel.screenshot()`, the host was expected to remain at `0` but was `5013`. The small difference from the direct probe is an allowed rounded scroll alignment difference; both values center a `1721px` element inside the `927px` host rather than preserving the initial top. Therefore the single root-cause hypothesis was: **Playwright's implicit locator scroll and screenshot composition for this oversized panel depend on the resulting centered viewport slice, so the panel-wide locator capture is not deterministic in this fixed-layer scroll environment.**

### Root-cause fix

`tests/visual/ui.visual.spec.mjs` now deliberately aligns only the real `.content-area` to the Anvo panel's top, derives the visible intersection with that host, and captures that fixed `1090 × 927` viewport rectangle using `page.toHaveScreenshot`. This path contains no locator screenshot and proves that the page screenshot leaves the explicit `scrollTop` unchanged. It also verifies the crop contains the real `Anvo统计` heading and visible `.song-anvo-card` elements before capture.

The existing desktop style-contract collection and compact follow-up remain in place. After the page capture, the test restores the historical centered scroll position only for that pre-existing contract collection, so its established contract values remain verified without using that scroll position to choose the screenshot pixels.

Only `tests/visual/__screenshots__/songs-anvo-desktop.png` changed. It was visually inspected after regeneration: it contains the rendered Anvo title, mode/filter controls, export control, and four columns of populated character/song cards. It is a visible live panel crop, not a blank, synthetic, masked, or mocked surface.

### Anvo TDD evidence

| Step | Command / result |
| --- | --- |
| Existing behavior | Focused locator-snapshot reproduction: FAIL, 31,014 pixels / `0.02` |
| RED | Added real locator screenshot followed by no-scroll assertion: FAIL, expected `0`, received `5013` |
| GREEN | `npm.cmd run test:visual -- tests/visual/ui.visual.spec.mjs --grep "song stats captures the Anvo image panel" --reporter=line`: 1 passed (9.0s) |
| Stability | Same focused command with `--repeat-each=3`: 3 passed (25.0s) |

## Whole-branch review findings

### Central specular stacking

The central `.ui-liquid-glass` now establishes an isolated stacking context, and its one existing `::before` pseudo-element has `z-index: -1`. This preserves the single pseudo-element, its bounds, and `pointer-events: none`; the pseudo-element paints above the glass surface background but below normal consumer content. No layout property, dimensions, or hit-test behavior changed.

RED: the rendered source-menu contract expected `isolation: isolate` and pseudo `z-index: -1`, but received `auto` for both. GREEN: `npm.cmd run test:visual -- tests/visual/foundation.contract.spec.mjs --grep "liquid glass specular stays|Special Predict keeps" --reporter=line` passed both contracts. The source-menu probe also confirms that consumer content remains the hit target.

### Special Predict nested glass

The outer `.special-toolbar` remains the existing `ui-liquid-glass--regular` consumer. Its child `.special-toolbar-group` keeps its existing grouping geometry, border, gradient, padding, shadow, states, and interactions, but its two nested backdrop-filter declarations are now `none`. This removes only the second filter layer.

RED: the rendered child-group contract expected `backdrop-filter: none` but received `blur(14px) saturate(1.55)`. GREEN: the same focused two-contract command passed, proving the outer regular tier remains filtered and the child group does not.

### Documentation order

`docs/ui-system.md` now lists the actual global order: `tokens.css → style.css → liquid-glass.css → primitives.css`, matching `src/main.js` and the existing Liquid Glass ownership prose.

## Final verification

| Command | Result |
| --- | --- |
| Focused Anvo visual test | PASS, 1/1 |
| Focused Anvo visual test, `--repeat-each=3` | PASS, 3/3 |
| `npm.cmd run test:unit` | PASS, 57/57 |
| `npm.cmd run check:ui` | PASS, `UI policy check passed` |
| `npm.cmd run build` | PASS, 90 modules transformed |
| `npm.cmd run test:visual -- --reporter=line` | PASS, 37/37 in 8.6m |
| `git diff --check` | PASS; no whitespace errors (only repository line-ending notices) |

The full visual count is 37 rather than the prior 35 because this wave added two required rendered contracts: specular stacking and Special Predict nested-filter flattening. No unrelated screenshot baseline was updated.

## Self-review

- [x] Anvo root cause is demonstrated by actual host/panel bounds and screenshot-induced scroll events, not inferred from pixels alone.
- [x] The capture correction is test-harness-only and removes the oversized locator screenshot from the capture path; it adds no sleep, retry, mask, or tolerance change.
- [x] The single updated baseline was visually checked as real rendered Anvo content.
- [x] The specular change is central, retains one pseudo-element, and does not add consumer wrappers or geometry rules.
- [x] The Special Predict change retains the outer regular material and removes only the nested child filter.
- [x] The stylesheet documentation matches the live import order.
- [x] Only authorized implementation/test/baseline/documentation/report paths are staged for the acceptance commit; `test-results/` remains untracked.
