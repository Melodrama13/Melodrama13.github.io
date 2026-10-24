import { ref, watch, nextTick } from 'vue';
import { createScrollNavigator, isScrollKeyIntent } from '../../composables/scrollNavigation.js';
import { useViewportFocus } from '../../composables/useViewportFocus.js';
import { getHistoryRowsInBounds } from './historyVisibleRows.js';
import { useHistoryEditorTransition } from './useHistoryEditorTransition.js';

/** Navigation owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Formatting, Viewport, ProgressiveRender, Lifecycle, Filtering, PredictionEligibility.
 */
export function useHistoryNavigation(ports) {
const historyWrapperRef = ref(null);

const filterStickyRef = ref(null);

const filterBarRef = ref(null);

function registerFilterBarElement(element) {
  filterBarRef.value = element;
}

const findEventElementInContainer = (eventId) => {
  const container = historyContainer.value;
  if (!container) return null;
  const id = `event-${ports.formatting.normalizeEventId(eventId)}`;
  const element = document.getElementById(id);
  return element?.classList.contains('event-item') && container.contains(element) ? element : null;
};

const findRowElementInContainer = (rowId) => {
  const container = historyContainer.value;
  if (!container || !rowId) return null;
  const element = document.getElementById(String(rowId));
  if (!element || !container.contains(element)) return null;
  return element.matches('.event-item, .birthday-row, .preview-row') ? element : null;
};

const preserveAnchorWhileLayoutChanges = (eventId, mutator, reserveEditorSpace) => {
  const row = findEventElementInContainer(eventId);
  const target = row && ports.viewport.getVisibleRowAnchorById(row.id) ? row : null;
  ports.viewport.cancelActivationRestore();
  ports.viewport.cancelViewportStabilization();
  ports.progressiveRender.pauseProgressiveRenderForEditorTransition();
  editorTransition.begin();
  void viewportFocus.preserve(() => {
    mutator();
    void editorTransition.reserveSpaceAfterLayout(reserveEditorSpace);
  }, target);
};

const listRef = ref(null);

const currentActiveId = ref(null);

const setActiveEventItem = (eventId) => {
  const idKey = ports.formatting.normalizeEventId(eventId);
  if (!idKey) return;
  currentActiveId.value = idKey;
  ports.progressiveRender.forceRenderEventNeighborhood(idKey);

  const container = historyContainer.value;
  if (!container) return;
  container.querySelectorAll('.event-item').forEach((item) => item.classList.remove('is-active'));
  const target = findEventElementInContainer(idKey);
  if (target) target.classList.add('is-active');
};

const clearActiveEventItem = () => {
  currentActiveId.value = null;
  const container = historyContainer.value;
  if (!container) return;
  container.querySelectorAll('.event-item.is-active').forEach((item) => item.classList.remove('is-active'));
};

const lastHandledJumpSeq = ref(0);

const pendingJumpSeq = ref(0);

const queueJumpRequest = (seqValue, idValue) => {
  const seq = Number(seqValue || 0);
  if (!Number.isFinite(seq) || seq <= 0) return false;
  if (seq === lastHandledJumpSeq.value) return false;

  const idKey = resolveJumpEventId(idValue);
  if (!idKey) return false;
  if (pendingJumpSeq.value === seq && pendingJumpEventId.value === idKey) return false;

  pendingJumpEventId.value = idKey;
  pendingJumpSeq.value = seq;
  return true;
};

const queueJumpFromProps = () => queueJumpRequest(ports.props.jumpEventSeq, ports.props.jumpEventId);

const hasUnhandledJumpFromProps = () => {
  const seq = Number(ports.props.jumpEventSeq || 0);
  if (!Number.isFinite(seq) || seq <= 0) return false;
  if (seq === lastHandledJumpSeq.value) return false;
  return !!ports.formatting.normalizeEventId(ports.props.jumpEventId);
};

const historyContainer = ref(null);

const pendingJumpEventId = ref('');

let activeJumpRequest = null;

const historyNavigator = createScrollNavigator({
  getHost: () => historyContainer.value,
  onPosition: () => ports.viewport.saveHistoryScroll()
});

const viewportFocus = useViewportFocus({
  getHost: () => historyContainer.value,
  getRoot: () => listRef.value,
  getReadingCandidates: ({ top, bottom }) => getHistoryRowsInBounds(listRef.value, top, bottom).map(row => row.element),
  onRestore: () => { ports.viewport.saveHistoryScroll(); ports.viewport.updateViewportAnchor(); },
  deferObservedLayout: true
});

const editorTransition = useHistoryEditorTransition({
  getHost: () => historyContainer.value,
  onRestore: () => viewportFocus.refresh()
});
const { isEditorLayoutTransitioning, isEditorSpaceReserved } = editorTransition;

const cancelScrollCorrections = () => {
  editorTransition.finish();
  historyNavigator.cancel();
  activeJumpRequest = null;
  pendingJumpEventId.value = '';
  pendingJumpSeq.value = 0;
  ports.viewport.cancelViewportStabilization();
};

const handleHistoryManualScrollIntent = () => {
  ports.tooltips?.closeInlineTooltips();
  ports.viewport.cancelActivationRestore();
  cancelScrollCorrections();
  clearActiveEventItem();
  ports.progressiveRender.pauseProgressiveRenderForManualScroll();
};

const handleHistoryPointerIntent = () => {
  ports.viewport.cancelActivationRestore();
  cancelScrollCorrections();
};

const handleHistoryKeydown = event => {
  if (ports.lifecycle.isHistoryPageActive && isScrollKeyIntent(event)) handleHistoryManualScrollIntent();
};

const resolveJumpEventId = (eventId) => {
  const key = ports.formatting.normalizeEventId(eventId);
  const canonical = key === '0' ? 'ori' : key;
  return (ports.props.allEvents || []).some(event => ports.formatting.normalizeEventId(event?.id) === canonical) ? canonical : '';
};

const consumePendingJump = (behavior = 'auto') => {
  const idKey = resolveJumpEventId(pendingJumpEventId.value);
  if (!idKey || !ports.lifecycle.isHistoryPageActive || !ports.viewport.isHistoryContainerVisible()) return false;
  if (activeJumpRequest?.id === idKey && activeJumpRequest.seq === pendingJumpSeq.value) return true;
  const seq = pendingJumpSeq.value;
  ports.viewport.cancelActivationRestore();
  cancelScrollCorrections();
  pendingJumpEventId.value = idKey;
  pendingJumpSeq.value = seq;
  const request = { id: idKey, seq };
  activeJumpRequest = request;
  // A consumed prop must never resurrect after the user supersedes this jump.
  if (seq > 0) {
    lastHandledJumpSeq.value = seq;
  }
  void historyNavigator.navigate({
    target: () => findEventElementInContainer(idKey),
    offset: () => (filterStickyRef.value?.getBoundingClientRect().height || 0) + 10,
    behavior,
    prepare: async () => {
      ports.filtering.relaxFiltersForJump(idKey);
      ports.filtering.showFilter.value = false;
      setActiveEventItem(idKey);
      ports.progressiveRender.forceRenderEventNeighborhood(idKey);
      await nextTick();
    },
    isLayoutReady: () => !ports.progressiveRender.progressiveRenderTimer && !ports.progressiveRender.progressiveVisibleRaf
  }).then(() => {
    if (activeJumpRequest !== request) return;
    activeJumpRequest = null;
    pendingJumpEventId.value = '';
    pendingJumpSeq.value = 0;
    ports.viewport.updateViewportAnchor();
    ports.viewport.saveHistoryScroll();
  });
  return true;
};

const jumpToEventById = (eventId, behavior = 'auto') => {
  const idKey = resolveJumpEventId(eventId);
  if (!idKey) return false;
  pendingJumpEventId.value = idKey;
  pendingJumpSeq.value = 0;
  return consumePendingJump(behavior);
};

const scrollTo = (target) => {
  if (!historyContainer.value) return;
  if (target === 'current') {
    const current = ports.predictionEligibility.getCurrentEvent();
    if (current) jumpToEventById(current.id);
    return;
  }
  if (target !== 'top' && target !== 'bottom') return;
  ports.viewport.cancelActivationRestore();
  cancelScrollCorrections();
  clearActiveEventItem();
  void historyNavigator.navigate({
    target,
    prepare: async () => {
      const rows = ports.progressiveRender.getProgressiveEventRows();
      const boundary = target === 'top' ? rows[0] : rows.at(-1);
      if (boundary) ports.progressiveRender.forceRenderEventNeighborhood(boundary.event.id);
      await nextTick();
    },
    isLayoutReady: () => !ports.progressiveRender.progressiveRenderTimer && !ports.progressiveRender.progressiveVisibleRaf
  }).then(ok => {
    if (ok) {
      ports.viewport.updateViewportAnchor();
      ports.viewport.saveHistoryScroll();
    }
  });
};

function watchJumpRequests() {
watch(() => [ports.props.jumpEventSeq, ports.props.jumpEventId], ([seqValue, idValue]) => {
  const queued = queueJumpRequest(seqValue, idValue);
  if (!queued || !ports.lifecycle.isHistoryPageActive) return;
  nextTick(() => {
    requestAnimationFrame(() => {
      consumePendingJump('auto');
    });
  });
}, { flush: 'post' });
}
return {
  historyWrapperRef,
  filterStickyRef,
  registerFilterBarElement,
  listRef,
  currentActiveId,
  historyContainer,
  handleHistoryManualScrollIntent,
  handleHistoryPointerIntent,
  jumpToEventById,
  scrollTo,
  preserveAnchorWhileLayoutChanges,
  isEditorLayoutTransitioning,
  isEditorSpaceReserved,
  finishEditorLayoutTransition: editorTransition.finish,
  pendingJumpEventId,
  viewportFocus,
  historyNavigator,
  findRowElementInContainer,
  hasUnhandledJumpFromProps,
  cancelScrollCorrections,
  filterBarRef,
  queueJumpFromProps,
  consumePendingJump,
  pendingJumpSeq,
  handleHistoryKeydown,
  watchJumpRequests,
};
}
