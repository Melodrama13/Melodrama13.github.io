import { ref, computed } from 'vue';
import { isEventStarted } from '../../utils/spoilerGuard.js';

/** Owns card cutoff behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardCutoff(inputs) {
  const SPOILER_CLOCK_INTERVAL_MS = 60 * 1000;

  const spoilerNow = ref(new Date());

  let spoilerClockTimer = 0;

  const refreshSpoilerClock = () => {
    spoilerNow.value = new Date();
  };

  const manualEventId = ref(null);

  const displayEventIdDraft = ref('');

  const isEditingDisplayEventId = ref(false);

  let topBarStateChangeRaf = 0;

  const toFiniteEventId = (value) => {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n > 0 ? n : null;
  };

  const autoCurrentId = computed(() => {
    const now = spoilerNow.value;
    const numericIds = (inputs.props.allEvents || [])
      .filter((ev) => {
        if (ev?.isPredict) return false;
        if (!inputs.eventCatalog.isNumericEventId(ev?.id)) return false;
        return isEventStarted(ev, now);
      })
      .map((e) => Number(e.id));

    return numericIds.length > 0 ? Math.max(...numericIds) : 0;
  });

  const displayEventId = computed({
    get: () => {
      const syncId = toFiniteEventId(inputs.props.previewSyncEventId);
      const preferred = syncId ?? manualEventId.value ?? autoCurrentId.value;
      const n = toFiniteEventId(preferred);
      return n ?? 0;
    },
    set: (val) => {
      const n = toFiniteEventId(val);
      manualEventId.value = n ?? null;
    }
  });

  const updateDisplayEventIdDraft = () => {
    if (isEditingDisplayEventId.value) return;
    const n = toFiniteEventId(displayEventId.value);
    displayEventIdDraft.value = n == null ? '' : String(n);
  };

  const onDisplayEventIdFocus = () => {
    isEditingDisplayEventId.value = true;
  };

  const onDisplayEventIdInput = (rawVal) => {
    displayEventIdDraft.value = String(rawVal ?? '');
    const n = toFiniteEventId(displayEventIdDraft.value);
    manualEventId.value = n ?? null;
  };

  const adjustDisplayEventId = (delta) => {
    const cur = toFiniteEventId(displayEventIdDraft.value)
      ?? toFiniteEventId(displayEventId.value)
      ?? toFiniteEventId(autoCurrentId.value)
      ?? 1;
    const next = Math.max(1, Number(cur) + Number(delta || 0));
    manualEventId.value = next;
    displayEventIdDraft.value = String(next);
    isEditingDisplayEventId.value = false;
  };

  const onDisplayEventIdBlur = () => {
    isEditingDisplayEventId.value = false;
    const n = toFiniteEventId(displayEventIdDraft.value);
    manualEventId.value = n ?? null;
    updateDisplayEventIdDraft();
  };

  const getTopBarState = () => ({
    displayEventId: Number(displayEventId.value || 0),
    displayEventIdDraft: String(displayEventIdDraft.value || ''),
    autoCurrentId: Number(autoCurrentId.value || 0),
    navCollapsed: !!inputs.navigation.navCollapsed.value,
    isNavTopLayout: !!inputs.navigation.isNavTopLayout.value
  });

  const scheduleTopBarStateChange = () => {
    if (topBarStateChangeRaf) return;
    topBarStateChangeRaf = requestAnimationFrame(() => {
      topBarStateChangeRaf = 0;
      inputs.emit('stats-top-state-change');
    });
  };

  const setTopBarDisplayEventIdDraft = (rawVal) => {
    displayEventIdDraft.value = String(rawVal ?? '');
    const n = toFiniteEventId(displayEventIdDraft.value);
    manualEventId.value = n ?? null;
  };

  const applyTopBarDisplayEventId = (rawVal) => {
    if (rawVal !== undefined) {
      displayEventIdDraft.value = String(rawVal ?? '');
    }
    const n = toFiniteEventId(displayEventIdDraft.value);
    manualEventId.value = n ?? null;
    isEditingDisplayEventId.value = false;
    updateDisplayEventIdDraft();
    return Number(displayEventId.value || 0);
  };

  const adjustTopBarDisplayEventId = (delta) => {
    adjustDisplayEventId(delta);
    return Number(displayEventId.value || 0);
  };

  const resetTopBarDisplayEventId = () => {
    manualEventId.value = null;
    isEditingDisplayEventId.value = false;
    updateDisplayEventIdDraft();
    return Number(displayEventId.value || 0);
  };

  const toggleTopBarNavCollapsed = () => {
    inputs.navigation.setNavCollapsed(!inputs.navigation.navCollapsed.value);
    return !!inputs.navigation.navCollapsed.value;
  };

  return {
    toFiniteEventId,
    displayEventId,
    autoCurrentId,
    spoilerNow,
    refreshSpoilerClock,
    get spoilerClockTimer() { return spoilerClockTimer; },
    set spoilerClockTimer(value) { spoilerClockTimer = value; },
    SPOILER_CLOCK_INTERVAL_MS,
    scheduleTopBarStateChange,
    get topBarStateChangeRaf() { return topBarStateChangeRaf; },
    set topBarStateChangeRaf(value) { topBarStateChangeRaf = value; },
    updateDisplayEventIdDraft,
    displayEventIdDraft,
    adjustDisplayEventId,
    onDisplayEventIdFocus,
    onDisplayEventIdInput,
    onDisplayEventIdBlur,
    resetTopBarDisplayEventId,
    getTopBarState,
    setTopBarDisplayEventIdDraft,
    applyTopBarDisplayEventId,
    adjustTopBarDisplayEventId,
    toggleTopBarNavCollapsed,
  };
}
