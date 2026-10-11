import { ref, nextTick } from 'vue';

/** Prediction Editor owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: emit, deletePredictEvent, Tooltips, ProgressiveRender, PreviewSelections, Formatting, Navigation, PredictionEligibility.
 */
export function useHistoryPredictionEditor(ports) {
const isEditorOpen = ref(false);
let editorOpenRequest = 0;
let lastRequestedEditorEvent = null;

const cancelPendingEditorOpen = () => {
  editorOpenRequest += 1;
  lastRequestedEditorEvent = null;
  ports.editorLoading.cancelEditorLoadRequest();
};

const retryPredictEditor = () => {
  if (lastRequestedEditorEvent) void openPredictEditor(lastRequestedEditorEvent);
};

const currentEditingEvent = ref(null);

const lastFocusedEventId = ref(null);

const predictEditorRef = ref(null);

const predictSwitchSaveBtnRef = ref(null);

const predictSwitchDialog = ref({
  visible: false,
  currentEventKey: '',
  nextEventKey: ''
});

let pendingPredictSwitchResolve = null;

const setPredictEditorEvent = (event) => {
  const wasOpen = isEditorOpen.value;
  ports.tooltips.closeInlineTooltips();
  ports.progressiveRender.forceRenderEventRow(event.id);
  lastFocusedEventId.value = event.id;
  currentEditingEvent.value = event;
  ports.previewSelections.currentEditingSelectionNames.value = Array.isArray(event?.memberCards)
    ? [...new Set(event.memberCards.map((card) => ports.previewSelections.normalizeCharName(card?.Name)).filter((name) => !!ports.previewSelections.CHAR_MAP.value[name]))]
    : [];
  ports.previewSelections.currentEditingSelectionCards.value = Array.isArray(event?.memberCards)
    ? event.memberCards.map((card) => ({
      name: ports.previewSelections.normalizeCharName(card?.Name),
      rarity: String(card?.Rarity || '').trim(),
      attr: ports.formatting.normalizeEventHistoryAttribute(card?.Attribute),
      skillType: String(card?.Skill || '').trim().toLowerCase(),
      selectedUnit: String(card?.Affiliation || '').trim().toLowerCase()
    })).filter((card) => card.name && !!ports.previewSelections.CHAR_MAP.value[card.name])
    : [];
  const numericEventId = Number(event.id);
  ports.emit('sync-preview-event-id', Number.isFinite(numericEventId) ? numericEventId : null);
  if (wasOpen) return;
  ports.navigation.preserveAnchorWhileLayoutChanges(event.id, () => { isEditorOpen.value = true; }, true);
};

const resolvePredictSwitchDialog = (decision = 'cancel') => {
  const resolve = pendingPredictSwitchResolve;
  pendingPredictSwitchResolve = null;
  predictSwitchDialog.value = {
    visible: false,
    currentEventKey: '',
    nextEventKey: ''
  };
  if (typeof resolve === 'function') resolve(decision);
};

const requestPredictSwitchDecision = (currentEventKey, nextEventKey) => new Promise((resolve) => {
  if (pendingPredictSwitchResolve) pendingPredictSwitchResolve('cancel');
  pendingPredictSwitchResolve = resolve;
  predictSwitchDialog.value = {
    visible: true,
    currentEventKey,
    nextEventKey
  };
  nextTick(() => {
    predictSwitchSaveBtnRef.value?.focus?.();
  });
});

const openPredictEditor = async (event) => {
  if (!ports.predictionEligibility.canOpenPredictEditor(event)) return false;

  const request = ++editorOpenRequest;
  lastRequestedEditorEvent = event;
  try {
    await ports.editorLoading.ensureEditorLoaded();
  } catch (_) {
    return false;
  }
  if (request !== editorOpenRequest) return false;

  const nextEventKey = ports.formatting.normalizeEventId(event?.id);
  const currentEventKey = ports.formatting.normalizeEventId(currentEditingEvent.value?.id);
  if (isEditorOpen.value && nextEventKey === currentEventKey) return true;

  if (isEditorOpen.value) {
    const editor = predictEditorRef.value;
    const hasChanges = editor?.hasUnsavedChanges?.() === true;
    if (hasChanges) {
      const decision = await requestPredictSwitchDecision(currentEventKey, nextEventKey);
      if (decision === 'cancel') return false;
      if (decision === 'save') {
        const saved = editor?.saveForEventSwitch?.();
        if (saved !== true) return false;
      } else if (decision === 'discard') {
        editor?.discardDraftForEventSwitch?.();
      }
    } else {
      editor?.discardDraftForEventSwitch?.();
    }
  }

  setPredictEditorEvent(event);
  return true;
};

const openPredictEditorAfterTooltipClose = async (event) => {
  ports.tooltips.closeInlineTooltips();
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (!ports.predictionEligibility.canOpenPredictEditor(event)) return;
  await openPredictEditor(event);
};

const handleEventRowClick = (event, domEvent = null) => {
  const target = domEvent?.target;
  if (target instanceof HTMLElement && target.closest('.avatar-container, .song-tooltip, .predict-delete-btn')) {
    return;
  }
  if (!ports.predictionEligibility.canOpenPredictEditor(event)) {
    ports.tooltips.closeInlineTooltips();
    return;
  }
  if (ports.tooltips.hasAnyInlineTooltipOpen()) {
    void openPredictEditorAfterTooltipClose(event);
    return;
  }
  void openPredictEditor(event);
};

const handleCloseEditor = () => {
  cancelPendingEditorOpen();
  const anchorId = currentEditingEvent.value?.id || lastFocusedEventId.value;
  if (!anchorId) {
    isEditorOpen.value = false;
    ports.previewSelections.currentEditingSelectionNames.value = [];
    ports.previewSelections.currentEditingSelectionCards.value = [];
    return;
  }

  ports.navigation.preserveAnchorWhileLayoutChanges(anchorId, () => {
    isEditorOpen.value = false;
  }, false);
  ports.previewSelections.currentEditingSelectionNames.value = [];
  ports.previewSelections.currentEditingSelectionCards.value = [];
  ports.emit('sync-preview-event-id', null);
};

const removePredict = (event) => {
  if (!event || ports.predictionEligibility.getPredictStatus(event) !== 'predicted') return;
  const ok = confirm(`确定删除活动 #${event.id} 的预测吗？`);
  if (!ok) return;
  if (typeof ports.deletePredictEvent === 'function') {
    ports.deletePredictEvent(event.id);
  }
};


return {
  cancelPendingEditorOpen,
  retryPredictEditor,
  isEditorOpen,
  currentEditingEvent,
  predictEditorRef,
  predictSwitchSaveBtnRef,
  predictSwitchDialog,
  resolvePredictSwitchDialog,
  handleEventRowClick,
  handleCloseEditor,
  removePredict,
};
}
