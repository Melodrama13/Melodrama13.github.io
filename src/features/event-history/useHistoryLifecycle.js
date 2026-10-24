import { onMounted, nextTick, onDeactivated, onActivated, onBeforeUnmount } from 'vue';
import { registerTransientOverlayDismissal } from '../../ui/transientOverlays.js';

/** Lifecycle owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: emit, ProgressiveRender, Clock, Rows, PreviewLayout, Tooltips, FilterLayout, Viewport, Navigation, PredictionEditor.
 */
export function useHistoryLifecycle(ports) {
let isHistoryPageActive = true;
let unregisterTransientDismissal;
const dismissHistoryOverlays = () => {
  ports.tooltips.closeInlineTooltips();
  ports.precedents.close(false);
  ports.filtering.showFilter.value = false;
};
const handleHistoryOverlayKeydown = event => {
  if (event.key !== 'Escape' || event.defaultPrevented || !isHistoryPageActive) return;
  if (ports.tooltips.hasAnyInlineTooltipOpen()) ports.tooltips.closeInlineTooltips();
  else if (ports.precedents.isOpen.value) ports.precedents.close();
  else if (ports.filtering.showFilter.value) ports.filtering.showFilter.value = false;
  else return;
  event.preventDefault(); event.stopPropagation();
};

function registerMounted() {
onMounted(() => {
  unregisterTransientDismissal = registerTransientOverlayDismissal(dismissHistoryOverlays);
  document.addEventListener('keydown', handleHistoryOverlayKeydown);
  if (typeof window !== 'undefined') {
    window.pjskSetEventHistoryFullRender = (enabled = true) => ports.progressiveRender.setFullEventRenderMode(enabled);
    window.pjskIsEventHistoryFullRender = () => ports.progressiveRender.isFullEventRenderMode.value;
  }
  ports.clock.refreshSpoilerClock();
  ports.clock.spoilerClockTimer = window.setInterval(ports.clock.refreshSpoilerClock, ports.clock.SPOILER_CLOCK_INTERVAL_MS);
  Promise.all([
    fetch('/data/pjsk_preview.json').then((res) => (res.ok ? res.json() : [])).catch(() => [])
  ]).then(([previewRows]) => {
    ports.rows.previewDataRows.value = Array.isArray(previewRows) ? previewRows : [];
  });

  window.addEventListener('mousemove', ports.previewLayout.handleDragPreviewConfig);
  window.addEventListener('mouseup', ports.previewLayout.stopDragPreviewConfig);
  window.addEventListener('touchmove', ports.previewLayout.handleDragPreviewConfigTouch, { passive: false });
  window.addEventListener('touchend', ports.previewLayout.stopDragPreviewConfig);
  window.addEventListener('touchcancel', ports.previewLayout.stopDragPreviewConfig);
  window.addEventListener('mousemove', ports.previewLayout.handleDragPreview);
  window.addEventListener('mousemove', ports.previewLayout.handleResizePreview);
  window.addEventListener('mouseup', ports.previewLayout.stopDragPreview);
  window.addEventListener('mouseup', ports.previewLayout.stopResizePreview);
  window.addEventListener('touchmove', ports.previewLayout.handleDragPreviewTouch, { passive: false });
  window.addEventListener('touchmove', ports.previewLayout.handleResizePreviewTouch, { passive: false });
  window.addEventListener('touchend', ports.previewLayout.stopDragPreview);
  window.addEventListener('touchend', ports.previewLayout.stopResizePreview);
  window.addEventListener('touchcancel', ports.previewLayout.stopDragPreview);
  window.addEventListener('touchcancel', ports.previewLayout.stopResizePreview);
  document.addEventListener('pointerdown', ports.tooltips.handleTooltipGlobalPointerDown, true);
  ports.filterLayout.updateCompactFilterState();
  ports.previewLayout.updatePreviewConfigOffset();
  if (ports.viewport.isReloadNavigation()) {
    ports.viewport.historyScrollTop.value = 0;
    try {
      sessionStorage.setItem(ports.viewport.HISTORY_SCROLL_KEY, '0');
    } catch (_) {}
  }

  nextTick(() => {
    ports.navigation.queueJumpFromProps();
    if (ports.navigation.pendingJumpEventId.value) {
      ports.navigation.consumePendingJump('auto');
    } else if (!ports.navigation.consumePendingJump('auto')) {
      ports.viewport.restoreHistoryScroll();
      ports.viewport.saveHistoryScroll();
    } else {
      ports.viewport.saveHistoryScroll();
    }
    ports.viewport.updateViewportAnchor();
  });
  window.addEventListener('resize', ports.filterLayout.handleWindowResize);
});
}

function registerDeactivated() {
onDeactivated(() => {
  isHistoryPageActive = false;
  dismissHistoryOverlays();
  document.removeEventListener('keydown', handleHistoryOverlayKeydown);
  ports.predictionEditor.cancelPendingEditorOpen();
  ports.predictionEditor.resolvePredictSwitchDialog('cancel');
  ports.viewport.cancelActivationRestore();
  ports.tooltips.closeInlineTooltips();
  ports.previewLayout.stopDragPreviewConfig();
  ports.previewLayout.stopDragPreview();
  ports.previewLayout.stopResizePreview();
  ports.navigation.cancelScrollCorrections();
  ports.progressiveRender.cancelProgressiveEventRender();
  ports.navigation.pendingJumpEventId.value = '';
  ports.navigation.pendingJumpSeq.value = 0;
  if (ports.filterLayout.resizeRafId) {
    cancelAnimationFrame(ports.filterLayout.resizeRafId);
    ports.filterLayout.resizeRafId = 0;
  }
  if (ports.filterLayout.filterAdaptRafId) {
    cancelAnimationFrame(ports.filterLayout.filterAdaptRafId);
    ports.filterLayout.filterAdaptRafId = 0;
  }
  window.removeEventListener('mousemove', ports.previewLayout.handleDragPreviewConfig);
  window.removeEventListener('mouseup', ports.previewLayout.stopDragPreviewConfig);
  window.removeEventListener('touchmove', ports.previewLayout.handleDragPreviewConfigTouch);
  window.removeEventListener('touchend', ports.previewLayout.stopDragPreviewConfig);
  window.removeEventListener('touchcancel', ports.previewLayout.stopDragPreviewConfig);
  window.removeEventListener('mousemove', ports.previewLayout.handleDragPreview);
  window.removeEventListener('mousemove', ports.previewLayout.handleResizePreview);
  window.removeEventListener('mouseup', ports.previewLayout.stopDragPreview);
  window.removeEventListener('mouseup', ports.previewLayout.stopResizePreview);
  window.removeEventListener('touchmove', ports.previewLayout.handleDragPreviewTouch);
  window.removeEventListener('touchmove', ports.previewLayout.handleResizePreviewTouch);
  window.removeEventListener('touchend', ports.previewLayout.stopDragPreview);
  window.removeEventListener('touchend', ports.previewLayout.stopResizePreview);
  window.removeEventListener('touchcancel', ports.previewLayout.stopDragPreview);
  window.removeEventListener('touchcancel', ports.previewLayout.stopResizePreview);
  window.removeEventListener('resize', ports.filterLayout.handleWindowResize);
  document.removeEventListener('pointerdown', ports.tooltips.handleTooltipGlobalPointerDown, true);
  document.removeEventListener('keydown', ports.navigation.handleHistoryKeydown);
});
}

function registerActivated() {
onActivated(() => {
  isHistoryPageActive = true;
  document.addEventListener('keydown', handleHistoryOverlayKeydown);
  ports.tooltips.closeInlineTooltips();
  ports.navigation.queueJumpFromProps();
  if (ports.navigation.pendingJumpEventId.value || ports.navigation.hasUnhandledJumpFromProps()) {
    ports.viewport.cancelActivationRestore();
    if (!ports.navigation.consumePendingJump('auto')) {
      nextTick(() => {
        requestAnimationFrame(() => {
          ports.navigation.queueJumpFromProps();
          ports.navigation.consumePendingJump('auto');
          ports.previewLayout.updatePreviewConfigOffset();
        });
      });
    }
  }
  nextTick(() => {
    ports.navigation.queueJumpFromProps();
    if (ports.navigation.pendingJumpEventId.value) {
      ports.navigation.consumePendingJump('auto');
    } else if (!ports.navigation.consumePendingJump('auto')) {
      ports.viewport.restoreHistoryPositionAfterActivation();
    }
    ports.previewLayout.updatePreviewConfigOffset();
  });
  window.addEventListener('mousemove', ports.previewLayout.handleDragPreviewConfig);
  window.addEventListener('mouseup', ports.previewLayout.stopDragPreviewConfig);
  window.addEventListener('touchmove', ports.previewLayout.handleDragPreviewConfigTouch, { passive: false });
  window.addEventListener('touchend', ports.previewLayout.stopDragPreviewConfig);
  window.addEventListener('touchcancel', ports.previewLayout.stopDragPreviewConfig);
  window.addEventListener('mousemove', ports.previewLayout.handleDragPreview);
  window.addEventListener('mousemove', ports.previewLayout.handleResizePreview);
  window.addEventListener('mouseup', ports.previewLayout.stopDragPreview);
  window.addEventListener('mouseup', ports.previewLayout.stopResizePreview);
  window.addEventListener('touchmove', ports.previewLayout.handleDragPreviewTouch, { passive: false });
  window.addEventListener('touchmove', ports.previewLayout.handleResizePreviewTouch, { passive: false });
  window.addEventListener('touchend', ports.previewLayout.stopDragPreview);
  window.addEventListener('touchend', ports.previewLayout.stopResizePreview);
  window.addEventListener('touchcancel', ports.previewLayout.stopDragPreview);
  window.addEventListener('touchcancel', ports.previewLayout.stopResizePreview);
  window.addEventListener('resize', ports.filterLayout.handleWindowResize);
  document.addEventListener('pointerdown', ports.tooltips.handleTooltipGlobalPointerDown, true);
  document.addEventListener('keydown', ports.navigation.handleHistoryKeydown);
});
}

function registerBeforeUnmount() {
onBeforeUnmount(() => {
  unregisterTransientDismissal?.();
  document.removeEventListener('keydown', handleHistoryOverlayKeydown);
  dismissHistoryOverlays();
  ports.predictionEditor.cancelPendingEditorOpen();
  ports.predictionEditor.resolvePredictSwitchDialog('cancel');
  if (typeof window !== 'undefined') {
    if (window.pjskSetEventHistoryFullRender) delete window.pjskSetEventHistoryFullRender;
    if (window.pjskIsEventHistoryFullRender) delete window.pjskIsEventHistoryFullRender;
  }
  if (ports.clock.spoilerClockTimer) {
    clearInterval(ports.clock.spoilerClockTimer);
    ports.clock.spoilerClockTimer = 0;
  }
  ports.tooltips.closeInlineTooltips();
  ports.previewLayout.stopDragPreviewConfig();
  ports.emit('sync-preview-event-id', null);
  ports.previewLayout.stopDragPreview();
  ports.previewLayout.stopResizePreview();
  ports.viewport.cancelActivationRestore();
  ports.navigation.cancelScrollCorrections();
  ports.progressiveRender.cancelProgressiveEventRender();
  if (ports.filterLayout.resizeRafId) {
    cancelAnimationFrame(ports.filterLayout.resizeRafId);
    ports.filterLayout.resizeRafId = 0;
  }
  if (ports.filterLayout.filterAdaptRafId) {
    cancelAnimationFrame(ports.filterLayout.filterAdaptRafId);
    ports.filterLayout.filterAdaptRafId = 0;
  }
  window.removeEventListener('mousemove', ports.previewLayout.handleDragPreviewConfig);
  window.removeEventListener('mouseup', ports.previewLayout.stopDragPreviewConfig);
  window.removeEventListener('touchmove', ports.previewLayout.handleDragPreviewConfigTouch);
  window.removeEventListener('touchend', ports.previewLayout.stopDragPreviewConfig);
  window.removeEventListener('touchcancel', ports.previewLayout.stopDragPreviewConfig);
  window.removeEventListener('mousemove', ports.previewLayout.handleDragPreview);
  window.removeEventListener('mousemove', ports.previewLayout.handleResizePreview);
  window.removeEventListener('mouseup', ports.previewLayout.stopDragPreview);
  window.removeEventListener('mouseup', ports.previewLayout.stopResizePreview);
  window.removeEventListener('touchmove', ports.previewLayout.handleDragPreviewTouch);
  window.removeEventListener('touchmove', ports.previewLayout.handleResizePreviewTouch);
  window.removeEventListener('touchend', ports.previewLayout.stopDragPreview);
  window.removeEventListener('touchend', ports.previewLayout.stopResizePreview);
  window.removeEventListener('touchcancel', ports.previewLayout.stopDragPreview);
  window.removeEventListener('touchcancel', ports.previewLayout.stopResizePreview);
  window.removeEventListener('resize', ports.filterLayout.handleWindowResize);
  document.removeEventListener('pointerdown', ports.tooltips.handleTooltipGlobalPointerDown, true);
  document.removeEventListener('keydown', ports.navigation.handleHistoryKeydown);
});
}
return {
  get isHistoryPageActive() { return isHistoryPageActive; },
  set isHistoryPageActive(value) { isHistoryPageActive = value; },
  registerMounted,
  registerDeactivated,
  registerActivated,
  registerBeforeUnmount,
};
}
