import assert from 'node:assert/strict';
import test from 'node:test';

import {
  UI_BREAKPOINTS,
  isViewportAbove,
  isViewportAtMost,
  toMaxWidthMediaQuery
} from './breakpoints.js';

test('exposes the canonical runtime breakpoint registry', () => {
  assert.deepEqual(UI_BREAKPOINTS, {
    phoneXsMax: 520,
    editorTransition: 700,
    smallTabletMax: 768,
    compactMax: 900,
    historyPreviewMax: 1000,
    tabletMax: 1200,
    cardWideMax: 1360
  });
  assert.equal(toMaxWidthMediaQuery(UI_BREAKPOINTS.compactMax), '(max-width: 900px)');
});

test('treats canonical max-width boundaries as inclusive', () => {
  assert.equal(isViewportAtMost(900, UI_BREAKPOINTS.compactMax), true);
  assert.equal(isViewportAtMost(901, UI_BREAKPOINTS.compactMax), false);
  assert.equal(isViewportAtMost(1000, UI_BREAKPOINTS.historyPreviewMax), true);
  assert.equal(isViewportAtMost(1001, UI_BREAKPOINTS.historyPreviewMax), false);
  assert.equal(isViewportAtMost(1200, UI_BREAKPOINTS.tabletMax), true);
  assert.equal(isViewportAtMost(1200.01, UI_BREAKPOINTS.tabletMax), false);
});

test('treats canonical desktop comparisons as strictly above', () => {
  assert.equal(isViewportAbove(900, UI_BREAKPOINTS.compactMax), false);
  assert.equal(isViewportAbove(901, UI_BREAKPOINTS.compactMax), true);
  assert.equal(isViewportAbove(1000, UI_BREAKPOINTS.historyPreviewMax), false);
  assert.equal(isViewportAbove(1001, UI_BREAKPOINTS.historyPreviewMax), true);
  assert.equal(isViewportAbove(1200, UI_BREAKPOINTS.tabletMax), false);
  assert.equal(isViewportAbove(1201, UI_BREAKPOINTS.tabletMax), true);
});

test('rejects non-finite viewport comparison inputs', () => {
  for (const invalidInput of [NaN, Infinity, -Infinity, 'not-a-number']) {
    assert.equal(isViewportAtMost(invalidInput, UI_BREAKPOINTS.compactMax), false);
    assert.equal(isViewportAbove(invalidInput, UI_BREAKPOINTS.compactMax), false);
  }
  assert.equal(isViewportAtMost(900, NaN), false);
  assert.equal(isViewportAbove(900, Infinity), false);
});
