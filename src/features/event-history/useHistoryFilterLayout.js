import { ref, nextTick, watch } from 'vue';
import { isViewportAtMost, UI_BREAKPOINTS } from '../../ui/breakpoints.js';

/** Filter Layout owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: PredictionEditor, Navigation, Lifecycle, PreviewLayout, Filtering, Rows.
 */
export function useHistoryFilterLayout(ports) {
const isCompactFilterBar = ref(false);

const isBottomPredictEditorMode = ref(false);

let resizeRafId = 0;
let filterFitSequence = 0;

const applyMeasuredFilterFit = () => {
  if (!ports.lifecycle.isHistoryPageActive) return;
  if (isBottomPredictEditorMode.value) return;
  const bar = ports.navigation.filterBarRef.value;
  if (!(bar instanceof HTMLElement)) return;
  // Flex/Grid has already reduced the gaps and button gutters. Compact only
  // when the complete labels still exceed the real available width.
  isCompactFilterBar.value = bar.scrollWidth > bar.clientWidth + 1;
};

const updateCompactFilterState = () => {
  if (!ports.lifecycle.isHistoryPageActive) return;
  const viewportWidth = window.innerWidth;
  const nextBottomMode = isViewportAtMost(viewportWidth, UI_BREAKPOINTS.compactMax);
  isBottomPredictEditorMode.value = nextBottomMode;

  isCompactFilterBar.value = nextBottomMode;
  const sequence = ++filterFitSequence;
  if (!nextBottomMode) {
    nextTick(() => {
      if (sequence === filterFitSequence) applyMeasuredFilterFit();
    });
  }
};

const handleWindowResize = () => {
  if (resizeRafId) cancelAnimationFrame(resizeRafId);
  resizeRafId = requestAnimationFrame(() => {
    updateCompactFilterState();
    if (Number.isFinite(ports.previewLayout.previewConfigPanelPos.value.x) && Number.isFinite(ports.previewLayout.previewConfigPanelPos.value.y)) {
      ports.previewLayout.previewConfigPanelPos.value = ports.previewLayout.clampPreviewConfigPanelPos(ports.previewLayout.previewConfigPanelPos.value.x, ports.previewLayout.previewConfigPanelPos.value.y);
    }
    ports.previewLayout.updatePreviewConfigOffset();
    Object.keys(ports.previewLayout.previewPanelState.value).forEach((panelId) => ports.previewLayout.clampPreviewPanelPosition(panelId));
    resizeRafId = 0;
  });
};

function watchEditorFilterLayout() {
watch([
  ports.filtering.showFilter,
  ports.filtering.hasActiveFilters,
  ports.rows.filterHitEventCount,
  ports.predictionEditor.isEditorOpen,
  ports.navigation.isEditorSpaceReserved,
], () => {
  if (!ports.lifecycle.isHistoryPageActive) return;
  nextTick(() => {
    if (!ports.lifecycle.isHistoryPageActive) return;
    updateCompactFilterState();
    ports.previewLayout.updatePreviewConfigOffset();
  });
}, { flush: 'post' });
}
return {
  isCompactFilterBar,
  isBottomPredictEditorMode,
  updateCompactFilterState,
  handleWindowResize,
  get resizeRafId() { return resizeRafId; },
  set resizeRafId(value) { resizeRafId = value; },
  watchEditorFilterLayout,
};
}
