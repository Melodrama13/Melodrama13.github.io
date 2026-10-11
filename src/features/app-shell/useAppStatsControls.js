import { ref, watch, nextTick } from "vue";

/** Owns application stats controls with per-instance state and explicit peer interfaces. */
export function useAppStatsControls(ports = {}) {
const statsTopDisplayEventIdDraft = ref('');

const isEditingStatsTopDisplayEventId = ref(false);

const statsTopNavCollapsed = ref(true);

const statsTopNavAvailable = ref(false);

const statsTopAutoCurrentId = ref('');

let statsTopControlSyncRaf = 0;

const getStatsTabInstance = () => {
  if (ports.tabCatalog.currentTab.value !== 'stats') return null;
  return ports.tabNavigation.tabComponentRef.value;
};

const syncStatsTopControlState = () => {
  if (!ports.tabNavigation.showStatsTopControlInNav.value) return;
  const instance = getStatsTabInstance();
  if (!instance || typeof instance.getTopBarState !== 'function') {
    statsTopNavAvailable.value = false;
    statsTopNavCollapsed.value = true;
    return;
  }

  const state = instance.getTopBarState() || {};
  const nextDraft = String(state.displayEventIdDraft ?? state.displayEventId ?? '');
  if (!isEditingStatsTopDisplayEventId.value) {
    statsTopDisplayEventIdDraft.value = nextDraft;
  }
  statsTopNavAvailable.value = !!state.isNavTopLayout;
  statsTopNavCollapsed.value = !!state.navCollapsed;
  statsTopAutoCurrentId.value = String(state.autoCurrentId ?? '');
};

const scheduleStatsTopControlStateSync = () => {
  if (statsTopControlSyncRaf) {
    cancelAnimationFrame(statsTopControlSyncRaf);
  }
  statsTopControlSyncRaf = requestAnimationFrame(async () => {
    statsTopControlSyncRaf = 0;
    await nextTick();
    syncStatsTopControlState();
  });
};

const onStatsTopDisplayIdFocus = () => {
  isEditingStatsTopDisplayEventId.value = true;
};

const onStatsTopDisplayIdInput = (rawValue) => {
  statsTopDisplayEventIdDraft.value = String(rawValue ?? '');
  const instance = getStatsTabInstance();
  if (instance && typeof instance.setTopBarDisplayEventIdDraft === 'function') {
    instance.setTopBarDisplayEventIdDraft(statsTopDisplayEventIdDraft.value);
  }
};

const onStatsTopDisplayIdBlur = () => {
  isEditingStatsTopDisplayEventId.value = false;
  const instance = getStatsTabInstance();
  if (instance && typeof instance.applyTopBarDisplayEventId === 'function') {
    instance.applyTopBarDisplayEventId(statsTopDisplayEventIdDraft.value);
  }
  syncStatsTopControlState();
};

const adjustStatsTopDisplayEventId = (delta) => {
  const instance = getStatsTabInstance();
  if (instance && typeof instance.adjustTopBarDisplayEventId === 'function') {
    instance.adjustTopBarDisplayEventId(delta);
  }
  syncStatsTopControlState();
};

const resetStatsTopDisplayEventId = () => {
  isEditingStatsTopDisplayEventId.value = false;
  const instance = getStatsTabInstance();
  if (instance && typeof instance.resetTopBarDisplayEventId === 'function') {
    instance.resetTopBarDisplayEventId();
  }
  syncStatsTopControlState();
};
const connectAppStatsComponent = () => {
watch(() => ports.tabNavigation.tabComponentRef.value, async () => {
  if (ports.tabCatalog.currentTab.value !== 'stats') return;
  await nextTick();
  scheduleStatsTopControlStateSync();
});
};
const connectAppStatsTopControls = () => {
watch(ports.tabNavigation.showStatsTopControlInNav, async (show) => {
  if (!show) {
    isEditingStatsTopDisplayEventId.value = false;
    return;
  }
  await nextTick();
  scheduleStatsTopControlStateSync();
});
};
return {
statsTopDisplayEventIdDraft,
isEditingStatsTopDisplayEventId,
statsTopNavCollapsed,
statsTopNavAvailable,
statsTopAutoCurrentId,
get statsTopControlSyncRaf() { return statsTopControlSyncRaf; }, set statsTopControlSyncRaf(value) { statsTopControlSyncRaf = value; },
getStatsTabInstance,
syncStatsTopControlState,
scheduleStatsTopControlStateSync,
onStatsTopDisplayIdFocus,
onStatsTopDisplayIdInput,
onStatsTopDisplayIdBlur,
adjustStatsTopDisplayEventId,
resetStatsTopDisplayEventId,
connectAppStatsComponent,
connectAppStatsTopControls
};
}
