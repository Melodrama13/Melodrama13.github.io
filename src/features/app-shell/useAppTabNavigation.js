import { ref, computed, watch, nextTick } from "vue";
import { createScrollNavigator, notifyScrollPositionChange } from "../../composables/scrollNavigation.js";

/** Owns application tab navigation with per-instance state and explicit peer interfaces. */
export function useAppTabNavigation(ports = {}) {
const historyJumpEventId = ref(null);

const historyJumpSeq = ref(0);

const statsPreviewData = ref(null);

const previewSyncEventId = ref(null);

const tabComponentRef = ref(null);

const contentAreaRef = ref(null);

const statsScrollTop = ref(0);

const songsScrollTop = ref(0);

const showBackToTopBtn = ref(false);

const isHistoryPredictEditorOpen = computed(() => {
  if (ports.tabCatalog.currentTab.value !== 'history') return false;
  const id = Number(previewSyncEventId.value);
  return Number.isFinite(id) && id > 0;
});

const showStatsTopControlInNav = computed(() => ports.tabCatalog.currentTab.value === 'stats');

const showSourceDropdownInNav = computed(() => ports.tabCatalog.currentTab.value === 'history');

const showPredictInfoInNav = computed(() => ports.predictionSources.predictiveEvents.value.length > 0 && ports.tabCatalog.currentTab.value === 'history');

const handleStatsPreviewUpdate = (payload) => {
  statsPreviewData.value = payload || null;
};

const handlePreviewSyncEventId = (eventId) => {
  const n = Number(eventId);
  previewSyncEventId.value = Number.isFinite(n) && n > 0 ? n : null;
};

const saveStatsScroll = () => {
  if (ports.tabCatalog.currentTab.value !== 'stats') return;
  if (!contentAreaRef.value) return;
  statsScrollTop.value = contentAreaRef.value.scrollTop || 0;
};

const saveSongsScroll = () => {
  if (ports.tabCatalog.currentTab.value !== 'songs') return;
  if (!contentAreaRef.value) return;
  songsScrollTop.value = contentAreaRef.value.scrollTop || 0;
};

const handleContentScroll = () => {
  if (contentAreaRef.value) {
    showBackToTopBtn.value = contentAreaRef.value.scrollTop > 260;
  }
  saveStatsScroll();
  saveSongsScroll();
};

const contentNavigator = createScrollNavigator({ getHost: () => contentAreaRef.value });

const scrollContentToTop = () => contentNavigator.navigate({ target: 'top' });

const setCurrentTab = (tab) => {
  if (!Object.prototype.hasOwnProperty.call(ports.tabCatalog.tabs, tab)) return;
  if (tab === ports.tabCatalog.currentTab.value) return;
  if (ports.tabCatalog.currentTab.value === 'stats') {
    saveStatsScroll();
  } else if (ports.tabCatalog.currentTab.value === 'songs') {
    saveSongsScroll();
  } else if (ports.tabCatalog.currentTab.value === 'history') {
    const instance = tabComponentRef.value;
    if (instance && typeof instance.saveHistoryScrollSnapshot === 'function') {
      instance.saveHistoryScrollSnapshot();
    }
  }
  ports.tabCatalog.currentTab.value = tab;
  ports.tabCatalog.persistCurrentTab(tab);
};

const openSpecialPredictGenerator = () => {
  ports.sourceMenu.sourceMenuOpen.value = false;
  setCurrentTab('specialPredict');
};

const handleStatsJumpToEvent = (eventId) => {
  const id = String(eventId ?? '').trim();
  if (!id) return;

  saveStatsScroll();
  historyJumpEventId.value = id;
  historyJumpSeq.value += 1;
  setCurrentTab('history');
};
const connectAppTabNavigation = () => {
watch(ports.tabCatalog.currentTab, async (nextTab, prevTab) => {
  contentNavigator.cancel();
  if (nextTab !== 'history') {
    ports.sourceMenu.sourceMenuOpen.value = false;
  }
  if (nextTab === 'stats') {
    await nextTick();
    if (ports.tabCatalog.currentTab.value !== nextTab) return;
    if (contentAreaRef.value) {
      contentAreaRef.value.scrollTop = statsScrollTop.value;
      notifyScrollPositionChange(contentAreaRef.value);
    }
    ports.statsControls.syncStatsTopControlState();
    return;
  }
  if (nextTab === 'songs') {
    await nextTick();
    if (ports.tabCatalog.currentTab.value !== nextTab) return;
    if (contentAreaRef.value) {
      contentAreaRef.value.scrollTop = songsScrollTop.value;
      notifyScrollPositionChange(contentAreaRef.value);
    }
  }
});
};
return {
historyJumpEventId,
historyJumpSeq,
statsPreviewData,
previewSyncEventId,
tabComponentRef,
contentAreaRef,
statsScrollTop,
songsScrollTop,
showBackToTopBtn,
isHistoryPredictEditorOpen,
showStatsTopControlInNav,
showSourceDropdownInNav,
showPredictInfoInNav,
handleStatsPreviewUpdate,
handlePreviewSyncEventId,
saveStatsScroll,
saveSongsScroll,
handleContentScroll,
contentNavigator,
scrollContentToTop,
setCurrentTab,
openSpecialPredictGenerator,
handleStatsJumpToEvent,
connectAppTabNavigation
};
}
