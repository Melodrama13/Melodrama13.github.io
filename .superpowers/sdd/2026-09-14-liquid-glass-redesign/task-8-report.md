# Task 8 — Liquid Glass optics report

_Worktree: `C:\Users\Melodrama\pjsk-planner\.worktrees\ui-system-normalization` · branch: `codex/ui-system-normalization` · base: `935b872` · 2026-09-15_

---

## 📋 Outcome

The centralized Liquid Glass material now uses neutral transmission, a restrained rose/cyan/mint/violet ambient field, tiered soft elevation, and a four-part static inset optical rim. A single non-interactive `::before` carries the pointer-driven specular highlight. The existing `.filter-bar`, `.filter-panel`, and `.source-menu` consumers continue to select `regular`, so they render the refined CSS-frosted material without SVG displacement or pointer lifecycle work.

## 🧪 TDD and rendered-material evidence

The inherited RED is recorded honestly: the interrupted implementer reported **0** computed `inset` shadow entries before the central CSS change, while the new material contract required **4**. This takeover did not deliberately remove the inherited implementation to reproduce that RED, because doing so would temporarily violate the active material and alter the approved visual tree.

The GREEN contract in `foundation.contract.spec.mjs` checks all three regular consumers in normal and reduced motion. It verifies their shared class, CSS-only backdrop filtering, no `data-liquid-glass-interactive`, no `url(...)` filter, four inset shadow entries, visible pointer-safe specular in full motion, and hidden specular with the same static rim in reduced motion.

| Command | Result |
| --- | --- |
| `npm.cmd run test:visual -- tests/visual/foundation.contract.spec.mjs --reporter=line` | 8/8 passed in 1.6m |
| `npm.cmd run test:visual -- tests/visual/liquid-glass.visual.spec.mjs --reporter=line` | 12/12 passed in 1.9m |
| `npm.cmd run test:visual -- tests/visual/ui.visual.spec.mjs --reporter=line` | 11/11 passed in 2.5m |

An earlier inherited concurrent full-suite result had one Anvo screenshot failure. A fresh isolated run of that exact UI suite passed 11/11, and the final full suite below passed, so it is treated as stale concurrent-run evidence rather than a Task 8 regression.

## 👁️ Visual review

Reviewed intentional baselines for these states: 1440px source menu; 1440px operation bar plus expanded filter panel; 390px operation bar plus expanded filter panel; 1440px Card Stats pointer-highlight navigation; frosted and opaque compact fallbacks; and `songs-anvo-desktop`.

The source and filter surfaces remain readable above Event History rows, with the filter panel retaining its existing geometry. The compact panel does not create a horizontal overflow. Card Stats retains its refractive navigation/highlight path. Fallbacks remove decorative effects as required while retaining a readable control surface. The Anvo capture retains content and panel geometry; its export snapshots remain unchanged.

## 🔎 Scope and property audits

| Audit | Evidence |
| --- | --- |
| Central ownership | Source diff contains only `src/styles/tokens.css` and `src/styles/liquid-glass.css`; consumer markup and `src/ui/liquidGlass.js` are unchanged |
| Regular overlays | Existing target markup selects `ui-liquid-glass--regular`; rendered-material contract passes for source menu, operation bar, and filter panel |
| SVG boundary | No consumer diff adds `v-liquid-glass`, `data-liquid-glass-interactive`, or SVG URL filtering; the rendered contract confirms the three overlays have no URL backdrop filter |
| Style contract | Compared with `935b872`, exactly 16 changed leaves; every one is `backgroundImage` or `boxShadow` |
| Export isolation | All 5 export PNG snapshot blobs are byte-identical to both `935b872` and `4016950` |
| Breakpoints and layout | The visual suites cover the retained 375/390/768/900/1200/1440 states, and `check:ui` passes |

`test-results/` is pre-existing/untracked operational output. It was inspected for the inherited failure diagnosis but is excluded from this change and commit.

## ✅ Final verification

| Command | Result |
| --- | --- |
| `npm.cmd run test:unit` | 57/57 passed |
| `npm.cmd run check:ui` | passed |
| `npm.cmd run build` | passed |
| `npm.cmd run test:visual -- --reporter=line` | 35/35 passed in 7.1m, including the two appended fallback screenshots and the 1440px filter-panel capture |
| `git diff --check` | passed |
| `git status --short --branch` | reviewed before staging; only authorized Task 8 changes plus excluded `test-results/` |

## 🧾 Self-review

After the final verification, I re-read the central stylesheet and the new rendered-material test, inspected the intended screenshots, checked the changed-path allowlist, and ran `git diff --check`. No concrete Task 8 defect remained to correct.
