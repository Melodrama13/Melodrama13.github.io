import { getInitialHeavyRowBudget, selectInitialHeavyEventKeys, resolveInitialHistoryTargetId } from './historyRenderSchedule.js';
import { ref, computed, nextTick, watch } from 'vue';
import { isViewportAtMost, UI_BREAKPOINTS } from '../../ui/breakpoints.js';
import { getHistoryRowsInBounds } from './historyVisibleRows.js';

/** Progressive Render owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: Rows, Formatting, Navigation, Tooltips, Viewport, CaptureRange, Lifecycle, Presentation.
 */
export function useHistoryProgressiveRender(ports) {
const PROGRESSIVE_RENDER_VIEWPORT_BUFFER_PX = 900;

const PROGRESSIVE_MANUAL_SCROLL_IDLE_MS = 800;
const PROGRESSIVE_EDITOR_TRANSITION_IDLE_MS = 800;

const EVENT_FULL_RENDER_STORAGE_KEY = 'pjsk_event_history_full_render_v1';

const EVENT_FULL_RENDER_QUERY_PARAM = 'eventFullRender';

const progressiveEventRenderKeys = ref(new Set());

const isFullEventRenderMode = ref(false);

let progressiveRenderTimer = 0;

let progressiveVisibleRaf = 0;

let progressiveResumeTimer = 0;

let progressivePausedUntil = 0;

const readFullEventRenderPreference = () => {
  if (typeof window === 'undefined') return false;
  try {
    const queryValue = new URLSearchParams(window.location.search).get(EVENT_FULL_RENDER_QUERY_PARAM);
    if (queryValue !== null) {
      return ['1', 'true', 'yes', 'on', 'full'].includes(String(queryValue).trim().toLowerCase());
    }
    return String(localStorage.getItem(EVENT_FULL_RENDER_STORAGE_KEY) || '').trim() === '1';
  } catch (_) {
    return false;
  }
};

const persistFullEventRenderPreference = (enabled) => {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      localStorage.setItem(EVENT_FULL_RENDER_STORAGE_KEY, '1');
    } else {
      localStorage.removeItem(EVENT_FULL_RENDER_STORAGE_KEY);
    }
  } catch (_) {}
};

const setFullEventRenderMode = (enabled, options = {}) => {
  const next = !!enabled;
  isFullEventRenderMode.value = next;
  if (options.persist !== false) {
    persistFullEventRenderPreference(next);
  }
  resetProgressiveEventRender();
  return isFullEventRenderMode.value;
};

const isProgressiveTouchLayout = () => {
  if (typeof window === 'undefined') return false;
  return isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.tabletMax)
    || window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches;
};

const getProgressiveInitialRowCount = () => getInitialHeavyRowBudget(
  typeof window === 'undefined' ? 900 : window.innerHeight
);

const getProgressiveBatchRowCount = () => {
  if (typeof window === 'undefined') return 12;
  return isProgressiveTouchLayout() ? 6 : 12;
};

const getProgressiveBatchDelayMs = () => {
  if (typeof window === 'undefined') return 48;
  return isProgressiveTouchLayout() ? 80 : 48;
};

const shouldRunProgressiveBackgroundRender = () => {
  if (isFullEventRenderMode.value) return false;
  if (typeof window === 'undefined') return true;
  return !isProgressiveTouchLayout();
};

const getProgressiveJumpPrewarmCounts = () => {
  if (typeof window === 'undefined') return { before: 48, after: 12 };
  return isProgressiveTouchLayout()
    ? { before: 56, after: 12 }
    : { before: 72, after: 18 };
};

const progressiveEventRows = computed(() => ports.rows.displayRows.value.filter((row) => row.kind === 'event'));
const getProgressiveEventRows = () => progressiveEventRows.value;

const isProgressiveRenderPaused = () => Date.now() < progressivePausedUntil;

const forcedHeavyEventKeys = computed(() => {
  const keys = new Set();
  const pushEventId = (value) => {
    const idKey = ports.formatting.normalizeEventId(value);
    if (idKey) keys.add(`event-${idKey}`);
  };

  pushEventId(ports.navigation.currentActiveId.value);
  pushEventId(ports.navigation.pendingJumpEventId.value);

  const raisedKey = String(ports.tooltips.tooltipRaisedEventKey.value || '').trim();
  if (raisedKey.startsWith('event-')) keys.add(raisedKey);

  return keys;
});

const getForceHeavyEventKeys = () => new Set(forcedHeavyEventKeys.value);

const setProgressiveEventRenderKeys = (nextKeys) => {
  progressiveEventRenderKeys.value = nextKeys;
};

const addProgressiveEventRenderKeys = (keys) => {
  if (!keys || keys.size === 0) return false;
  const next = new Set(progressiveEventRenderKeys.value);
  let changed = false;
  keys.forEach((key) => {
    if (!key || next.has(key)) return;
    next.add(key);
    changed = true;
  });
  if (changed) setProgressiveEventRenderKeys(next);
  return changed;
};

const forceRenderEventRow = (eventId) => {
  const idKey = ports.formatting.normalizeEventId(eventId);
  if (!idKey) return false;
  return addProgressiveEventRenderKeys(new Set([`event-${idKey}`]));
};

const forceRenderEventNeighborhood = (eventId, options = {}) => {
  const idKey = ports.formatting.normalizeEventId(eventId);
  if (!idKey) return false;
  const rows = getProgressiveEventRows();
  const targetIndex = rows.findIndex((row) => ports.formatting.normalizeEventId(row.event?.id) === idKey);
  if (targetIndex < 0) {
    return forceRenderEventRow(idKey);
  }

  const fallback = getProgressiveJumpPrewarmCounts();
  const before = Number.isFinite(options.before) ? Math.max(0, options.before) : fallback.before;
  const after = Number.isFinite(options.after) ? Math.max(0, options.after) : fallback.after;
  const start = Math.max(0, targetIndex - before);
  const end = Math.min(rows.length, targetIndex + after + 1);
  return addProgressiveEventRenderKeys(new Set(rows.slice(start, end).map((row) => row.key)));
};

const cancelProgressiveEventRender = () => {
  if (progressiveRenderTimer) {
    clearTimeout(progressiveRenderTimer);
    progressiveRenderTimer = 0;
  }
  if (progressiveVisibleRaf) {
    cancelAnimationFrame(progressiveVisibleRaf);
    progressiveVisibleRaf = 0;
  }
  if (progressiveResumeTimer) {
    clearTimeout(progressiveResumeTimer);
    progressiveResumeTimer = 0;
  }
};

const scheduleProgressiveResume = () => {
  if (isFullEventRenderMode.value) return;
  if (progressiveResumeTimer) clearTimeout(progressiveResumeTimer);
  const delay = Math.max(80, progressivePausedUntil - Date.now() + 32);
  progressiveResumeTimer = window.setTimeout(() => {
    progressiveResumeTimer = 0;
    if (isProgressiveRenderPaused()) {
      scheduleProgressiveResume();
      return;
    }
    scheduleVisibleEventRowsHeavy();
    scheduleProgressiveEventRender();
  }, delay);
};

const pauseProgressiveRender = (idleMs) => {
  if (isFullEventRenderMode.value) return;
  progressivePausedUntil = Math.max(progressivePausedUntil, Date.now() + idleMs);
  if (progressiveRenderTimer) {
    clearTimeout(progressiveRenderTimer);
    progressiveRenderTimer = 0;
  }
  scheduleProgressiveResume();
};

const pauseProgressiveRenderForManualScroll = () => pauseProgressiveRender(PROGRESSIVE_MANUAL_SCROLL_IDLE_MS);
const pauseProgressiveRenderForEditorTransition = () => pauseProgressiveRender(PROGRESSIVE_EDITOR_TRANSITION_IDLE_MS);

const scheduleProgressiveEventRender = () => {
  if (isFullEventRenderMode.value) return;
  if (!shouldRunProgressiveBackgroundRender()) return;
  if (isProgressiveRenderPaused()) {
    scheduleProgressiveResume();
    return;
  }
  if (progressiveRenderTimer) return;
  progressiveRenderTimer = window.setTimeout(() => {
    progressiveRenderTimer = 0;
    if (isProgressiveRenderPaused()) {
      scheduleProgressiveResume();
      return;
    }
    const rows = getProgressiveEventRows();
    if (rows.length === 0) return;

    const next = new Set(progressiveEventRenderKeys.value);
    const batch = getProgressiveBatchRowCount();
    let added = 0;

    for (const row of rows) {
      if (next.has(row.key)) continue;
      next.add(row.key);
      added += 1;
      if (added >= batch) break;
    }

    if (added > 0) {
      setProgressiveEventRenderKeys(next);
      scheduleProgressiveEventRender();
    }
  }, getProgressiveBatchDelayMs());
};

const markVisibleEventRowsHeavy = () => {
  if (isFullEventRenderMode.value) return;
  if (isProgressiveRenderPaused()) return;
  const container = ports.navigation.historyContainer.value;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const top = containerRect.top - PROGRESSIVE_RENDER_VIEWPORT_BUFFER_PX;
  const bottom = containerRect.bottom + PROGRESSIVE_RENDER_VIEWPORT_BUFFER_PX;
  const keys = new Set();
  const anchor = ports.viewport.getViewportAnchor();

  getHistoryRowsInBounds(ports.navigation.listRef.value, top, bottom).forEach(({ element: node, rect }) => {
    if (!node.classList.contains('event-item')) return;
    if (rect.bottom < top || rect.top > bottom) return;
    const idKey = ports.captureRange.parseEventIdFromDomId(node.id);
    if (idKey) keys.add(`event-${idKey}`);
  });

  if (anchor && !ports.navigation.viewportFocus.isPreserving()) ports.viewport.viewportAnchor.value = anchor;
  if (addProgressiveEventRenderKeys(keys)) {
    const restoreToken = ports.viewport.viewportStabilizationToken;
    const activationToken = ports.viewport.activationRestoreToken;
    nextTick(() => {
      if (!ports.lifecycle.isHistoryPageActive || restoreToken !== ports.viewport.viewportStabilizationToken
        || activationToken !== ports.viewport.activationRestoreToken || ports.navigation.historyNavigator.isNavigating()) return;
      ports.navigation.viewportFocus.refresh();
      if (anchor && !ports.navigation.viewportFocus.isPreserving()) ports.viewport.restoreViewportAnchor(anchor);
    });
    if (!isProgressiveRenderPaused()) {
      scheduleProgressiveEventRender();
    }
  }
};

const scheduleVisibleEventRowsHeavy = () => {
  if (progressiveVisibleRaf) return;
  progressiveVisibleRaf = requestAnimationFrame(() => {
    progressiveVisibleRaf = 0;
    markVisibleEventRowsHeavy();
  });
};

const resetProgressiveEventRender = () => {
  cancelProgressiveEventRender();
  const rows = getProgressiveEventRows();
  if (isFullEventRenderMode.value) {
    setProgressiveEventRenderKeys(new Set(rows.map((row) => row.key)));
    return;
  }
  const rowKeys = new Set(rows.map((row) => row.key));
  const next = getForceHeavyEventKeys();
  progressiveEventRenderKeys.value.forEach((key) => {
    if (rowKeys.has(key)) next.add(key);
  });
  const initialKeys = selectInitialHeavyEventKeys(rows, {
    count: getProgressiveInitialRowCount(),
    targetId: resolveInitialHistoryTargetId(ports.navigation.pendingJumpEventId.value, ports.props.jumpEventId)
  });
  initialKeys.forEach((key) => next.add(key));
  setProgressiveEventRenderKeys(next);
  nextTick(() => {
    scheduleVisibleEventRowsHeavy();
    if (!shouldRunProgressiveBackgroundRender()) {
      return;
    }
    if (isProgressiveRenderPaused()) {
      scheduleProgressiveResume();
    } else {
      scheduleProgressiveEventRender();
    }
  });
};

const shouldRenderEventHeavy = (row) => {
  if (!row || row.kind !== 'event') return true;
  if (isFullEventRenderMode.value) return true;
  const forceKeys = forcedHeavyEventKeys.value;
  return forceKeys.has(row.key) || progressiveEventRenderKeys.value.has(row.key);
};

const getEventPlaceholderMemberCount = (event, group = 'normal') => {
  const cards = Array.isArray(event?.memberCards) ? event.memberCards : [];
  const targetCards = group === 'fes' ? ports.presentation.getFesCards(cards) : ports.presentation.getNormalCards(cards);
  return Math.max(0, Math.min(targetCards.length, 5));
};

const getEventPlaceholderVsCount = (event) => {
  const singers = ports.presentation.parseVS(event?.virtual_singer);
  return Math.max(0, Math.min(singers.length, 3));
};

const getDisplayRowsStructureSignature = (rows) => (
  (Array.isArray(rows) ? rows : [])
    .map((row) => `${row?.kind || ''}:${row?.key || ''}`)
    .join('|')
);

let lastDisplayRowsStructureSignature = '';

function initializeFullRenderPreference() {
isFullEventRenderMode.value = readFullEventRenderPreference();
}

function watchDisplayRows() {
watch(ports.rows.displayRows, (rows) => {
  const nextSignature = getDisplayRowsStructureSignature(rows);
  if (nextSignature === lastDisplayRowsStructureSignature) {
    return;
  }
  lastDisplayRowsStructureSignature = nextSignature;
  resetProgressiveEventRender();
}, { immediate: true, flush: 'post' });
}
return {
  isFullEventRenderMode,
  setFullEventRenderMode,
  shouldRenderEventHeavy,
  getEventPlaceholderMemberCount,
  getEventPlaceholderVsCount,
  forceRenderEventRow,
  forceRenderEventNeighborhood,
  pauseProgressiveRenderForManualScroll,
  pauseProgressiveRenderForEditorTransition,
  get progressiveRenderTimer() { return progressiveRenderTimer; },
  set progressiveRenderTimer(value) { progressiveRenderTimer = value; },
  get progressiveVisibleRaf() { return progressiveVisibleRaf; },
  set progressiveVisibleRaf(value) { progressiveVisibleRaf = value; },
  getProgressiveEventRows,
  scheduleVisibleEventRowsHeavy,
  cancelProgressiveEventRender,
  progressiveEventRenderKeys,
  addProgressiveEventRenderKeys,
  setProgressiveEventRenderKeys,
  initializeFullRenderPreference,
  watchDisplayRows,
};
}
