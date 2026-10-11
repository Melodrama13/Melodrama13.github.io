import { ref, nextTick } from 'vue';
import { clampScrollTop, notifyScrollPositionChange } from '../../composables/scrollNavigation.js';
import { getHistoryRowsInBounds } from './historyVisibleRows.js';

/** Viewport owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: Navigation, Lifecycle, ProgressiveRender, Formatting, Filtering.
 */
export function useHistoryViewport(ports) {
const historyScrollTop = ref(0);

const HISTORY_SCROLL_KEY = 'pjsk_history_scroll_top_v1';

const viewportAnchor = ref({ id: '', top: 0 });

let activationRestoreToken = 0;

let activationRestoreTimeoutIds = [];

let viewportStabilizationToken = 0;

let viewportStabilizationRafId = 0;

let viewportStabilizationTimeoutIds = [];

let isViewportStabilizing = false;

const cancelViewportStabilization = () => {
  viewportStabilizationToken += 1;
  isViewportStabilizing = false;
  if (viewportStabilizationRafId) {
    cancelAnimationFrame(viewportStabilizationRafId);
    viewportStabilizationRafId = 0;
  }
  viewportStabilizationTimeoutIds.forEach((timerId) => clearTimeout(timerId));
  viewportStabilizationTimeoutIds = [];
};

const cancelActivationRestore = () => {
  activationRestoreToken += 1;
  activationRestoreTimeoutIds.forEach((timerId) => clearTimeout(timerId));
  activationRestoreTimeoutIds = [];
};

const scheduleActivationRestoreTimeout = (callback, delayMs, token) => {
  const timerId = setTimeout(() => {
    activationRestoreTimeoutIds = activationRestoreTimeoutIds.filter((id) => id !== timerId);
    if (token !== activationRestoreToken) return;
    callback();
  }, delayMs);
  activationRestoreTimeoutIds.push(timerId);
};

const isHistoryContainerVisible = () => {
  const container = ports.navigation.historyContainer.value;
  return !!container
    && container.isConnected
    && container.clientHeight > 0
    && container.getClientRects().length > 0;
};

const saveHistoryScroll = ({ force = false, requireVisible = false } = {}) => {
  if (!force && !ports.lifecycle.isHistoryPageActive) return;
  if (!ports.navigation.historyContainer.value) return;
  if (requireVisible && !isHistoryContainerVisible()) return;
  const nextTop = ports.navigation.historyContainer.value.scrollTop || 0;
  if (force && nextTop <= 0 && !isHistoryContainerVisible() && historyScrollTop.value > 0) return;
  historyScrollTop.value = nextTop;
  try {
    sessionStorage.setItem(HISTORY_SCROLL_KEY, String(historyScrollTop.value));
  } catch (_) {}
};

const handleHistoryScroll = () => {
  if (!ports.lifecycle.isHistoryPageActive) return;
  if (isViewportStabilizing || ports.navigation.historyNavigator.isNavigating()) {
    saveHistoryScroll();
    return;
  }
  updateViewportAnchor();
  ports.progressiveRender.scheduleVisibleEventRowsHeavy();
  saveHistoryScroll();
};

const getViewportVisibleBounds = () => {
  const container = ports.navigation.historyContainer.value;
  if (!container) return null;

  const containerRect = container.getBoundingClientRect();
  const stickyRect = ports.navigation.filterStickyRef.value?.getBoundingClientRect?.();
  const top = Math.min(
    containerRect.bottom,
    Math.max(containerRect.top, stickyRect?.bottom || containerRect.top)
  );
  return {
    containerTop: containerRect.top,
    top,
    bottom: containerRect.bottom
  };
};

const getViewportAnchor = () => {
  const container = ports.navigation.historyContainer.value;
  const bounds = getViewportVisibleBounds();
  if (!container || !bounds) return null;

  const activeId = ports.navigation.currentActiveId.value ? `event-${ports.formatting.normalizeEventId(ports.navigation.currentActiveId.value)}` : '';
  const activeNode = activeId ? ports.navigation.findRowElementInContainer(activeId) : null;
  if (activeNode) {
    const rect = activeNode.getBoundingClientRect();
    if (rect.bottom > bounds.top && rect.top < bounds.bottom) {
      return { id: activeNode.id, top: rect.top - bounds.containerTop, screenTop: rect.top };
    }
  }

  // Keep the leading reading row, rather than selecting another event at
  // the viewport center when card heights change or the page reactivates.
  const readingEnd = bounds.top + Math.min(180, (bounds.bottom - bounds.top) * 0.35);
  let firstVisible = null;
  let leadingRow = null;
  for (const { element: node, rect } of getHistoryRowsInBounds(ports.navigation.listRef.value, bounds.top, bounds.bottom)) {
    if (!node.id) continue;
    if (rect.bottom <= bounds.top) continue;
    if (rect.top >= bounds.bottom) break;
    firstVisible ||= node;
    if (rect.top >= bounds.top + 8 && rect.top <= readingEnd) { leadingRow = node; break; }
  }
  const anchorNode = leadingRow || firstVisible;
  if (!anchorNode) return null;

  return {
    id: anchorNode.id,
    top: anchorNode.getBoundingClientRect().top - bounds.containerTop,
    screenTop: anchorNode.getBoundingClientRect().top
  };
};

const updateViewportAnchor = () => {
  const anchor = getViewportAnchor();
  if (!anchor) return;
  viewportAnchor.value = anchor;
};

const getVisibleRowAnchorById = (rowId) => {
  const container = ports.navigation.historyContainer.value;
  const bounds = getViewportVisibleBounds();
  const id = String(rowId || '').trim();
  if (!container || !bounds || !id) return null;

  const el = ports.navigation.findRowElementInContainer(id);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  if (rect.bottom <= bounds.top || rect.top >= bounds.bottom) return null;
  return {
    id,
    top: rect.top - bounds.containerTop,
    screenTop: rect.top
  };
};

const updateViewportAnchorForSnapshot = () => {
  const activeId = ports.navigation.currentActiveId.value ? `event-${ports.formatting.normalizeEventId(ports.navigation.currentActiveId.value)}` : '';
  const activeAnchor = getVisibleRowAnchorById(activeId);
  if (activeAnchor) {
    viewportAnchor.value = activeAnchor;
    return;
  }
  updateViewportAnchor();
};

const saveHistoryScrollSnapshot = () => {
  updateViewportAnchorForSnapshot();
  saveHistoryScroll({ force: true, requireVisible: true });
};

const restoreViewportAnchor = (anchorOverride = null) => {
  const container = ports.navigation.historyContainer.value;
  const anchor = anchorOverride || viewportAnchor.value;
  if (!container || !anchor?.id) return false;

  const el = ports.navigation.findRowElementInContainer(anchor.id);
  if (!el) return false;

  const containerTop = container.getBoundingClientRect().top;
  const screenTop = el.getBoundingClientRect().top;
  const delta = Number.isFinite(anchor.screenTop)
    ? screenTop - anchor.screenTop
    : screenTop - containerTop - anchor.top;
  if (Math.abs(delta) >= 0.5) {
    container.scrollTo({ top: Math.round(clampScrollTop(container, container.scrollTop + delta)), behavior: 'instant' });
  }
  notifyScrollPositionChange(container);
  saveHistoryScroll();
  return true;
};

const stabilizeViewportAnchor = (anchor, { frames = 18, delays = [240, 520] } = {}) => {
  if (!anchor?.id) return false;
  cancelViewportStabilization();
  const token = viewportStabilizationToken;
  isViewportStabilizing = true;
  const correct = () => {
    if (token !== viewportStabilizationToken || !ports.lifecycle.isHistoryPageActive) return false;
    return restoreViewportAnchor(anchor);
  };
  const scheduleTimeout = (delay, isFinal = false) => {
    const timerId = setTimeout(() => {
      viewportStabilizationTimeoutIds = viewportStabilizationTimeoutIds.filter((id) => id !== timerId);
      const restored = correct();
      if (!isFinal) return;
      isViewportStabilizing = false;
      if (restored) {
        viewportAnchor.value = { ...anchor };
        saveHistoryScroll();
      }
      ports.progressiveRender.scheduleVisibleEventRowsHeavy();
    }, delay);
    viewportStabilizationTimeoutIds.push(timerId);
  };

  nextTick(() => {
    if (token !== viewportStabilizationToken) return;
    let framesLeft = Math.max(1, frames);
    const tick = () => {
      viewportStabilizationRafId = 0;
      if (token !== viewportStabilizationToken) return;
      correct();
      framesLeft -= 1;
      if (framesLeft > 0) viewportStabilizationRafId = requestAnimationFrame(tick);
    };
    viewportStabilizationRafId = requestAnimationFrame(tick);
    delays.forEach((delay, index) => scheduleTimeout(delay, index === delays.length - 1));
  });
  return true;
};

const restoreHistoryPositionAfterActivation = () => {
  if (ports.navigation.pendingJumpEventId.value) return false;
  if (ports.navigation.hasUnhandledJumpFromProps()) return false;
  cancelActivationRestore();
  const restoreToken = activationRestoreToken + 1;
  activationRestoreToken = restoreToken;
  const savedAnchor = viewportAnchor.value?.id
    ? { ...viewportAnchor.value }
    : null;
  const hadAnchor = !!savedAnchor?.id;
  // An anchor and an absolute scrollTop can disagree after lazy card
  // heights change. Use a single coordinate owner when an anchor exists.
  const restoredScroll = hadAnchor ? false : restoreHistoryScroll(restoreToken);
  const restoreAnchor = () => {
    if (restoreToken !== activationRestoreToken || !ports.lifecycle.isHistoryPageActive || !hadAnchor || ports.navigation.pendingJumpEventId.value) return;
    restoreViewportAnchor(savedAnchor);
  };

  restoreAnchor();
  requestAnimationFrame(() => {
    if (restoreToken !== activationRestoreToken) return;
    restoreAnchor();
    requestAnimationFrame(() => {
      if (restoreToken !== activationRestoreToken) return;
      restoreAnchor();
    });
  });
  scheduleActivationRestoreTimeout(restoreAnchor, 220, restoreToken);
  scheduleActivationRestoreTimeout(() => {
    restoreAnchor();
    updateViewportAnchor();
  }, 620, restoreToken);
  return restoredScroll || hadAnchor;
};

const toggleVisibilityWithViewportAnchor = (targetRef) => {
  const container = ports.navigation.historyContainer.value;
  if (!container) {
    targetRef.value = !targetRef.value;
    return;
  }

  cancelActivationRestore();
  ports.navigation.cancelScrollCorrections();
  container.scrollTo({ top: container.scrollTop, behavior: 'auto' });
  const anchor = getViewportAnchor();
  if (anchor) viewportAnchor.value = anchor;
  const prevScrollTop = container.scrollTop;
  const prevScrollHeight = container.scrollHeight;
  targetRef.value = !targetRef.value;

  nextTick(() => {
    const restored = anchor ? stabilizeViewportAnchor(anchor) : false;
    if (!restored) {
      const delta = container.scrollHeight - prevScrollHeight;
      container.scrollTop = Math.max(0, prevScrollTop + delta);
      notifyScrollPositionChange(container);
      saveHistoryScroll();
    }
  });
};

const toggleBirthdayRowsVisibility = () => toggleVisibilityWithViewportAnchor(ports.filtering.hideBirthdayRows);

const togglePreviewRowsVisibility = () => toggleVisibilityWithViewportAnchor(ports.filtering.hidePreviewRows);

const toggleCollabPoolsVisibility = () => toggleVisibilityWithViewportAnchor(ports.filtering.hideCollabPools);

const isReloadNavigation = () => {
  try {
    const navEntries = performance.getEntriesByType('navigation');
    const nav = Array.isArray(navEntries) && navEntries.length > 0 ? navEntries[0] : null;
    return nav?.type === 'reload';
  } catch (_) {
    return false;
  }
};

const restoreHistoryScroll = (restoreToken = activationRestoreToken) => {
  const container = ports.navigation.historyContainer.value;
  if (!container) return false;
  if (ports.navigation.pendingJumpEventId.value) return false;

  let targetTop = historyScrollTop.value;
  if (!Number.isFinite(targetTop) || targetTop <= 0) {
    try {
      const cached = Number(sessionStorage.getItem(HISTORY_SCROLL_KEY) || '0');
      targetTop = Number.isFinite(cached) ? cached : 0;
    } catch (_) {
      targetTop = 0;
    }
  }

  container.scrollTop = targetTop;
  notifyScrollPositionChange(container);
  historyScrollTop.value = targetTop;
  requestAnimationFrame(() => {
    if (restoreToken !== activationRestoreToken || ports.navigation.historyNavigator.isNavigating()) return;
    container.scrollTop = targetTop;
    notifyScrollPositionChange(container);
    requestAnimationFrame(() => {
      if (restoreToken !== activationRestoreToken || ports.navigation.historyNavigator.isNavigating()) return;
      container.scrollTop = targetTop;
      notifyScrollPositionChange(container);
    });
  });
  return true;
};


return {
  handleHistoryScroll,
  saveHistoryScrollSnapshot,
  toggleBirthdayRowsVisibility,
  togglePreviewRowsVisibility,
  toggleCollabPoolsVisibility,
  getVisibleRowAnchorById,
  cancelActivationRestore,
  cancelViewportStabilization,
  saveHistoryScroll,
  updateViewportAnchor,
  isHistoryContainerVisible,
  getViewportAnchor,
  viewportAnchor,
  get viewportStabilizationToken() { return viewportStabilizationToken; },
  set viewportStabilizationToken(value) { viewportStabilizationToken = value; },
  get activationRestoreToken() { return activationRestoreToken; },
  set activationRestoreToken(value) { activationRestoreToken = value; },
  restoreViewportAnchor,
  isReloadNavigation,
  historyScrollTop,
  HISTORY_SCROLL_KEY,
  restoreHistoryScroll,
  restoreHistoryPositionAfterActivation,
};
}
