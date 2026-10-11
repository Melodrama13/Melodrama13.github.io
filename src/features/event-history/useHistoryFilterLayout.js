import { ref, nextTick, watch } from 'vue';
import { isViewportAtMost, UI_BREAKPOINTS } from '../../ui/breakpoints.js';

/** Filter Layout owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: PredictionEditor, Navigation, Lifecycle, PreviewLayout, Filtering.
 */
export function useHistoryFilterLayout(ports) {
const isCompactFilterBar = ref(false);

const isBottomPredictEditorMode = ref(false);

const isEditorFilterTight = ref(false);

const isEditorFilterMobile = ref(false);

let resizeRafId = 0;

let filterAdaptRafId = 0;

let filterAdaptFramesLeft = 0;

const getEditorDrawerWidthEstimate = () => {
  if (typeof window === 'undefined') return 360;
  return Math.min(380, Math.max(320, window.innerWidth * 0.3));
};

const getHistoryWidthWithEditor = () => {
  if (typeof window === 'undefined') return 0;
  if (!ports.predictionEditor.isEditorOpen.value || isBottomPredictEditorMode.value) return window.innerWidth;
  const wrapperWidth = ports.navigation.historyWrapperRef.value instanceof HTMLElement
    ? ports.navigation.historyWrapperRef.value.getBoundingClientRect().width
    : window.innerWidth;
  return Math.max(0, wrapperWidth - getEditorDrawerWidthEstimate());
};

const applyMeasuredFilterFit = () => {
  if (!ports.lifecycle.isHistoryPageActive) return;
  if (!ports.predictionEditor.isEditorOpen.value || isBottomPredictEditorMode.value || !isEditorFilterTight.value) return;
  const bar = ports.navigation.filterBarRef.value;
  if (!(bar instanceof HTMLElement)) return;
  const needsMobile = bar.scrollWidth > bar.clientWidth + 1;
  if (needsMobile !== isEditorFilterMobile.value) {
    isEditorFilterMobile.value = needsMobile;
    isCompactFilterBar.value = isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.compactMax) || needsMobile;
  }
};

const scheduleMeasuredFilterFit = () => {
  if (!ports.lifecycle.isHistoryPageActive) return;
  if (filterAdaptRafId) cancelAnimationFrame(filterAdaptRafId);
  filterAdaptFramesLeft = 6;
  const tick = () => {
    filterAdaptRafId = 0;
    applyMeasuredFilterFit();
    filterAdaptFramesLeft -= 1;
    if (filterAdaptFramesLeft > 0 && ports.predictionEditor.isEditorOpen.value && !isEditorFilterMobile.value) {
      filterAdaptRafId = requestAnimationFrame(tick);
    }
  };
  filterAdaptRafId = requestAnimationFrame(() => {
    tick();
  });
};

const updateCompactFilterState = () => {
  if (!ports.lifecycle.isHistoryPageActive) return;
  const viewportWidth = window.innerWidth;
  const nextBottomMode = isViewportAtMost(viewportWidth, UI_BREAKPOINTS.compactMax);
  isBottomPredictEditorMode.value = nextBottomMode;

  const historyWidth = getHistoryWidthWithEditor();
  const editorSideMode = ports.predictionEditor.isEditorOpen.value && !nextBottomMode;
  const editorTight = editorSideMode && historyWidth > 0 && historyWidth < 900;

  isEditorFilterTight.value = editorTight;
  isEditorFilterMobile.value = false;
  isCompactFilterBar.value = isViewportAtMost(viewportWidth, UI_BREAKPOINTS.compactMax);

  if (editorTight) {
    nextTick(() => {
      scheduleMeasuredFilterFit();
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
watch([ports.filtering.showFilter, ports.predictionEditor.isEditorOpen], () => {
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
  isEditorFilterTight,
  isEditorFilterMobile,
  updateCompactFilterState,
  handleWindowResize,
  get resizeRafId() { return resizeRafId; },
  set resizeRafId(value) { resizeRafId = value; },
  get filterAdaptRafId() { return filterAdaptRafId; },
  set filterAdaptRafId(value) { filterAdaptRafId = value; },
  watchEditorFilterLayout,
};
}
