import { useViewportFocus } from '../../composables/useViewportFocus.js';
import { getScrollContainer } from './songFormatters.js';
import { ref } from 'vue';

/** Per-instance state owned by SongReadingPosition. */
export function createSongReadingPositionState() {
const statsMainInteractionHost = ref(null);

const lastInteractiveAnchorEl = ref(null);

const lastInteractiveAt = ref(0);
return { statsMainInteractionHost, lastInteractiveAnchorEl, lastInteractiveAt };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongReadingPosition({
  statsMainInteractionHost,
  lastInteractiveAnchorEl,
  lastInteractiveAt,
  songStatsRootRef,
  scheduleNavSync
}) {
const SCROLL_SNAPSHOT_ANCHOR_SELECTOR = '[data-scroll-anchor]';

const getAnchorNodesInStatsMain = () => {
  const statsMain = songStatsRootRef.value?.querySelector('.stats-main');
  if (!(statsMain instanceof HTMLElement)) return [];
  return Array.from(statsMain.querySelectorAll(SCROLL_SNAPSHOT_ANCHOR_SELECTOR)).filter((el) => el instanceof HTMLElement);
};

const findAnchorElementByKey = (key) => {
  const wanted = String(key || '');
  if (!wanted) return null;
  const nodes = getAnchorNodesInStatsMain();
  for (const el of nodes) {
    if (el instanceof HTMLElement && el.dataset.scrollAnchor === wanted) return el;
  }
  return null;
};

const viewportFocus = useViewportFocus({
  getHost: getScrollContainer,
  getRoot: () => songStatsRootRef.value?.querySelector('.stats-main'),
  onRestore: scheduleNavSync
});

const withPinnedElementPosition = (targetEl, applyChange) => viewportFocus.preserve(applyChange, targetEl);

const rememberInteractiveAnchorFromEvent = (event) => {
  const target = event?.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest('.stats-nav')) return;

  const interactive = target.closest('button, input[type="checkbox"], input[type="radio"], select');
  if (!(interactive instanceof HTMLElement)) return;

  lastInteractiveAnchorEl.value = interactive;
  lastInteractiveAt.value = Date.now();
};

const consumeRecentInteractiveAnchor = (maxAgeMs = 1200) => {
  if (!(lastInteractiveAnchorEl.value instanceof HTMLElement)) return null;
  if (!lastInteractiveAnchorEl.value.isConnected) {
    lastInteractiveAnchorEl.value = null;
    return null;
  }
  if (Date.now() - lastInteractiveAt.value > maxAgeMs) {
    lastInteractiveAnchorEl.value = null;
    return null;
  }
  return lastInteractiveAnchorEl.value;
};

const withInteractionPinnedPosition = async (applyChange, explicitTarget = null) => {
  const target = explicitTarget instanceof HTMLElement ? explicitTarget : consumeRecentInteractiveAnchor();
  if (target instanceof HTMLElement) {
    await withPinnedElementPosition(target, applyChange);
    return;
  }
  await viewportFocus.preserve(applyChange);
};

const withReadingPosition = applyChange => viewportFocus.preserve(applyChange);

return { SCROLL_SNAPSHOT_ANCHOR_SELECTOR, getAnchorNodesInStatsMain, findAnchorElementByKey, viewportFocus, withPinnedElementPosition, rememberInteractiveAnchorFromEvent, consumeRecentInteractiveAnchor, withInteractionPinnedPosition, withReadingPosition };
}
