import { ref, nextTick, watch } from 'vue';

/** Tooltips owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: Navigation.
 */
export function useHistoryTooltips(ports) {
const tooltipRaisedEventKey = ref(null);

const openedCardTooltipKey = ref('');

const openedSongTooltipEventKey = ref('');

// Mount details on first open; retain them for closing transitions and reuse.
const renderedCardTooltipKeys = ref(new Set());
const renderedSongTooltipEventKeys = ref(new Set());
watch(openedCardTooltipKey, (key) => {
  if (key) renderedCardTooltipKeys.value.add(key);
}, { flush: 'sync' });
watch(openedSongTooltipEventKey, (key) => {
  if (key) renderedSongTooltipEventKeys.value.add(key);
}, { flush: 'sync' });

const pinnedCardTooltipKey = ref('');

const pinnedSongTooltipEventKey = ref('');

const openedBirthdayInfoKey = ref('');

const cardTooltipOffsetMap = ref({});

const songTooltipOffsetMap = ref({});

const TOOLTIP_HOVER_DELAY_MS = 300;

let tooltipHoverTimer = 0;

const cancelPendingTooltipOpen = () => {
  if (!tooltipHoverTimer) return;
  clearTimeout(tooltipHoverTimer);
  tooltipHoverTimer = 0;
};

const makeCardTooltipKey = (eventKey, card, slotKey = '') => {
  const eventPart = String(eventKey || '').trim();
  const cardIdPart = String(card?.CardID || '').trim();
  const namePart = String(card?.Name || '').trim();
  const slotPart = String(slotKey || '').trim();
  return `${eventPart}::${slotPart}::${cardIdPart || namePart}`;
};

const hasOpenTooltipForEventKey = (eventKey) => {
  const key = String(eventKey || '').trim();
  if (!key) return false;
  if (openedSongTooltipEventKey.value === key) return true;
  return openedCardTooltipKey.value.startsWith(`${key}::`);
};

const closeCardAndSongTooltips = () => {
  cancelPendingTooltipOpen();
  openedCardTooltipKey.value = '';
  openedSongTooltipEventKey.value = '';
  pinnedCardTooltipKey.value = '';
  pinnedSongTooltipEventKey.value = '';
  tooltipRaisedEventKey.value = null;
  cardTooltipOffsetMap.value = {};
  songTooltipOffsetMap.value = {};
};
const closeInlineTooltips = () => {
  closeCardAndSongTooltips();
  openedBirthdayInfoKey.value = '';
};

const hasAnyInlineTooltipOpen = () => (
  !!openedCardTooltipKey.value
  || !!openedSongTooltipEventKey.value
  || !!pinnedCardTooltipKey.value
  || !!pinnedSongTooltipEventKey.value
  || tooltipRaisedEventKey.value !== null
  || !!openedBirthdayInfoKey.value
);

const setCardTooltipOffset = (tooltipKey, offsetX = 0, offsetY = 0) => {
  if (!tooltipKey) return;
  cardTooltipOffsetMap.value = {
    ...cardTooltipOffsetMap.value,
    [tooltipKey]: {
      '--card-tooltip-shift-x': `${Math.round(offsetX)}px`,
      '--card-tooltip-shift-y': `${Math.round(offsetY)}px`
    }
  };
};

const clearCardTooltipOffset = (tooltipKey) => {
  if (!tooltipKey || !cardTooltipOffsetMap.value[tooltipKey]) return;
  const next = { ...cardTooltipOffsetMap.value };
  delete next[tooltipKey];
  cardTooltipOffsetMap.value = next;
};

const getCardTooltipStyle = (eventKey, card, slotKey = '') => {
  const key = makeCardTooltipKey(eventKey, card, slotKey);
  return cardTooltipOffsetMap.value[key] || null;
};

const getTooltipViewportEdges = () => {
  const container = ports.navigation.historyContainer.value;
  const containerRect = container instanceof HTMLElement ? container.getBoundingClientRect() : null;
  const stickyRect = ports.navigation.filterStickyRef?.value?.getBoundingClientRect();
  return {
    left: 8,
    right: window.innerWidth - 8,
    top: Math.max(58, containerRect ? containerRect.top + 8 : 8, stickyRect ? stickyRect.bottom + 8 : 8),
    bottom: Math.min(window.innerHeight - 8, containerRect ? containerRect.bottom - 8 : window.innerHeight - 8)
  };
};

const adjustCardTooltipViewport = (eventKey, card, slotKey = '', hostEl = null) => {
  const tooltipKey = makeCardTooltipKey(eventKey, card, slotKey);
  const host = hostEl instanceof HTMLElement ? hostEl : null;
  if (!tooltipKey || !host || !host.isConnected) return;

  const tooltipEl = host.querySelector('.card-detail-tooltip');
  if (!(tooltipEl instanceof HTMLElement)) return;

  const rect = tooltipEl.getBoundingClientRect();
  const edges = getTooltipViewportEdges();
  // Focus and click can schedule two passes in one frame. Measure and extend
  // the applied DOM offset rather than clearing reactive state before it paints.
  let shiftX = parseFloat(tooltipEl.style.getPropertyValue('--card-tooltip-shift-x')) || 0;
  let shiftY = parseFloat(tooltipEl.style.getPropertyValue('--card-tooltip-shift-y')) || 0;

  if (rect.left < edges.left) {
    shiftX += edges.left - rect.left;
  }
  if (rect.right > edges.right) {
    shiftX -= rect.right - edges.right;
  }
  if (rect.top < edges.top) {
    shiftY += edges.top - rect.top;
  }
  if (rect.bottom > edges.bottom) {
    shiftY -= rect.bottom - edges.bottom;
  }

  setCardTooltipOffset(tooltipKey, shiftX, shiftY);
};

const adjustCardTooltipViewportAfterOpen = async (eventKey, card, slotKey = '', hostEl = null) => {
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (!(hostEl instanceof HTMLElement) || !hostEl.isConnected) return;
  if (!isCardTooltipOpen(eventKey, card, slotKey)) return;
  adjustCardTooltipViewport(eventKey, card, slotKey, hostEl);
};

const handleCardTooltipEnter = (eventKey, card, slotKey = '', event) => {
  cancelPendingTooltipOpen();
  if (ports.isOverlayOpen?.()) return;
  if (pinnedCardTooltipKey.value || pinnedSongTooltipEventKey.value) return;
  const key = makeCardTooltipKey(eventKey, card, slotKey);
  const host = event?.currentTarget;
  if (!(host instanceof HTMLElement)) return;
  const openTooltip = () => {
    if (ports.isOverlayOpen?.()) return;
    closeBirthdayInfo();
    setTooltipRaisedEvent(eventKey);
    openedCardTooltipKey.value = key;
    openedSongTooltipEventKey.value = '';
    void adjustCardTooltipViewportAfterOpen(eventKey, card, slotKey, host);
  };
  if (event?.type === 'mouseenter') {
    tooltipHoverTimer = window.setTimeout(() => {
      tooltipHoverTimer = 0;
      if (!host.matches(':hover')) return;
      openTooltip();
    }, TOOLTIP_HOVER_DELAY_MS);
    return;
  }
  openTooltip();
};

const setSongTooltipOffset = (eventKey, offsetX = 0, offsetY = 0) => {
  const key = String(eventKey || '').trim();
  if (!key) return;
  songTooltipOffsetMap.value = {
    ...songTooltipOffsetMap.value,
    [key]: {
      '--song-tooltip-shift-x': `${Math.round(offsetX)}px`,
      '--song-tooltip-shift-y': `${Math.round(offsetY)}px`
    }
  };
};

const clearSongTooltipOffset = (eventKey) => {
  const key = String(eventKey || '').trim();
  if (!key || !songTooltipOffsetMap.value[key]) return;
  const next = { ...songTooltipOffsetMap.value };
  delete next[key];
  songTooltipOffsetMap.value = next;
};

const getSongTooltipStyle = (eventKey) => {
  const key = String(eventKey || '').trim();
  return songTooltipOffsetMap.value[key] || null;
};

const adjustSongTooltipViewport = (eventKey, hostEl = null) => {
  const key = String(eventKey || '').trim();
  const host = hostEl instanceof HTMLElement ? hostEl : null;
  if (!key || !host) return;

  const tooltipEl = host.querySelector('.tooltip-content');
  if (!(tooltipEl instanceof HTMLElement)) return;

  const rect = tooltipEl.getBoundingClientRect();
  const edges = getTooltipViewportEdges();
  let shiftX = parseFloat(tooltipEl.style.getPropertyValue('--song-tooltip-shift-x')) || 0;
  let shiftY = parseFloat(tooltipEl.style.getPropertyValue('--song-tooltip-shift-y')) || 0;

  if (rect.left < edges.left) {
    shiftX += edges.left - rect.left;
  }
  if (rect.right > edges.right) {
    shiftX -= rect.right - edges.right;
  }
  if (rect.top < edges.top) {
    shiftY += edges.top - rect.top;
  }
  if (rect.bottom > edges.bottom) {
    shiftY -= rect.bottom - edges.bottom;
  }

  setSongTooltipOffset(key, shiftX, shiftY);
};

const adjustSongTooltipViewportAfterOpen = async (eventKey, hostEl = null) => {
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (!(hostEl instanceof HTMLElement) || !hostEl.isConnected) return;
  if (!isSongTooltipOpen(eventKey)) return;
  adjustSongTooltipViewport(eventKey, hostEl);
};

const handleSongTooltipEnter = (eventKey, event) => {
  cancelPendingTooltipOpen();
  if (ports.isOverlayOpen?.()) return;
  if (pinnedCardTooltipKey.value || pinnedSongTooltipEventKey.value) return;
  const key = String(eventKey || '').trim();
  if (!key) return;
  const host = event?.currentTarget;
  if (!(host instanceof HTMLElement)) return;
  const openTooltip = () => {
    if (ports.isOverlayOpen?.()) return;
    closeBirthdayInfo();
    setTooltipRaisedEvent(eventKey);
    openedSongTooltipEventKey.value = key;
    openedCardTooltipKey.value = '';
    void adjustSongTooltipViewportAfterOpen(eventKey, host);
  };
  if (event?.type === 'mouseenter') {
    tooltipHoverTimer = window.setTimeout(() => {
      tooltipHoverTimer = 0;
      if (!host.matches(':hover')) return;
      openTooltip();
    }, TOOLTIP_HOVER_DELAY_MS);
    return;
  }
  openTooltip();
};

const makeBirthdayInfoKey = (row) => String(row?.key || row?.id || '').trim();

const closeBirthdayInfo = () => {
  openedBirthdayInfoKey.value = '';
};

const toggleBirthdayInfo = (row) => {
  if (ports.isOverlayOpen?.()) return;
  const key = makeBirthdayInfoKey(row);
  if (!key) return;
  const next = openedBirthdayInfoKey.value === key ? '' : key;
  closeInlineTooltips();
  openedBirthdayInfoKey.value = next;
};

const isBirthdayInfoOpen = (row) => openedBirthdayInfoKey.value === makeBirthdayInfoKey(row);

const handleTooltipGlobalPointerDown = (event) => {
  const target = event?.target;
  if (!(target instanceof Element)) {
    closeInlineTooltips();
    closeBirthdayInfo();
    return;
  }
  if (target.closest('.birthday-row')) {
    closeCardAndSongTooltips();
    return;
  }
  closeBirthdayInfo();
  if (target.closest('.avatar-container, .song-tooltip')) return;
  closeInlineTooltips();
};

const setTooltipRaisedEvent = (eventKey) => {
  tooltipRaisedEventKey.value = eventKey;
};

const clearTooltipRaisedEvent = (eventKey) => {
  cancelPendingTooltipOpen();
  const key = String(eventKey || '').trim();
  if (openedCardTooltipKey.value.startsWith(`${key}::`) && openedCardTooltipKey.value !== pinnedCardTooltipKey.value) {
    clearCardTooltipOffset(openedCardTooltipKey.value);
    openedCardTooltipKey.value = '';
  }
  if (openedSongTooltipEventKey.value === key && openedSongTooltipEventKey.value !== pinnedSongTooltipEventKey.value) {
    openedSongTooltipEventKey.value = '';
    clearSongTooltipOffset(key);
  }
  if (tooltipRaisedEventKey.value === eventKey && !hasOpenTooltipForEventKey(eventKey)) {
    tooltipRaisedEventKey.value = null;
    clearSongTooltipOffset(eventKey);
  }
};

const toggleCardTooltip = (eventKey, card, slotKey = '', event = null) => {
  cancelPendingTooltipOpen();
  if (ports.isOverlayOpen?.()) return;
  closeBirthdayInfo();
  const key = makeCardTooltipKey(eventKey, card, slotKey);
  const host = event?.currentTarget;

  if (pinnedCardTooltipKey.value === key) {
    openedCardTooltipKey.value = '';
    pinnedCardTooltipKey.value = '';
    clearCardTooltipOffset(key);
    if (openedSongTooltipEventKey.value !== String(eventKey || '').trim()) {
      clearTooltipRaisedEvent(eventKey);
    }
    return;
  }

  if (openedCardTooltipKey.value && openedCardTooltipKey.value !== key) {
    cardTooltipOffsetMap.value = {};
  }

  openedCardTooltipKey.value = key;
  openedSongTooltipEventKey.value = '';
  clearSongTooltipOffset(eventKey);
  pinnedCardTooltipKey.value = key;
  pinnedSongTooltipEventKey.value = '';
  setTooltipRaisedEvent(eventKey);
  if (host instanceof HTMLElement) {
    void adjustCardTooltipViewportAfterOpen(eventKey, card, slotKey, host);
  }
};

const isCardTooltipOpen = (eventKey, card, slotKey = '') => openedCardTooltipKey.value === makeCardTooltipKey(eventKey, card, slotKey);

const shouldRenderCardTooltipContent = (eventKey, card, slotKey = '') => renderedCardTooltipKeys.value.has(makeCardTooltipKey(eventKey, card, slotKey));

const toggleSongTooltip = (eventKey, event = null) => {
  cancelPendingTooltipOpen();
  if (ports.isOverlayOpen?.()) return;
  closeBirthdayInfo();
  const key = String(eventKey || '').trim();
  if (!key) return;
  if (pinnedSongTooltipEventKey.value === key) {
    openedSongTooltipEventKey.value = '';
    pinnedSongTooltipEventKey.value = '';
    clearSongTooltipOffset(key);
    clearTooltipRaisedEvent(key);
    return;
  }
  openedSongTooltipEventKey.value = key;
  openedCardTooltipKey.value = '';
  if (pinnedCardTooltipKey.value) clearCardTooltipOffset(pinnedCardTooltipKey.value);
  pinnedSongTooltipEventKey.value = key;
  pinnedCardTooltipKey.value = '';
  if (event?.currentTarget instanceof HTMLElement) {
    void adjustSongTooltipViewportAfterOpen(key, event.currentTarget);
  }
  setTooltipRaisedEvent(key);
};

const isSongTooltipOpen = (eventKey) => openedSongTooltipEventKey.value === String(eventKey || '').trim();

const shouldRenderSongTooltipContent = (eventKey) => renderedSongTooltipEventKeys.value.has(String(eventKey || '').trim());


return {
  tooltipRaisedEventKey,
  getCardTooltipStyle,
  handleCardTooltipEnter,
  getSongTooltipStyle,
  handleSongTooltipEnter,
  toggleBirthdayInfo,
  isBirthdayInfoOpen,
  clearTooltipRaisedEvent,
  toggleCardTooltip,
  isCardTooltipOpen,
  shouldRenderCardTooltipContent,
  toggleSongTooltip,
  isSongTooltipOpen,
  shouldRenderSongTooltipContent,
  closeInlineTooltips,
  hasAnyInlineTooltipOpen,
  handleTooltipGlobalPointerDown,
  makeBirthdayInfoKey,
};
}
