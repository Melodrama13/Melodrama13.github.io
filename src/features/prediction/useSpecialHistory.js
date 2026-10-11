import { computed, nextTick, ref } from "vue";
import { normalizeId } from './specialPredictionFormatters.js';
import { ALL_PAGE_CONFIG_KEY } from './specialPredictionTextDefaults.js';

/** Owns special prediction history with explicit instance dependencies. */
export function useSpecialHistory(ports = {}) {
const editorUndoStack = ref([]);

const editorRedoStack = ref([]);

const editorHistoryPending = ref(false);

const EDITOR_HISTORY_LIMIT = 80;

const EDITOR_HISTORY_CAPTURE_DELAY = 360;

let editorHistoryReady = false;

let editorHistoryApplying = false;

let editorHistoryTimer = null;

let lastEditorHistoryState = null;

let editorCompositionActive = false;

const cloneEditorHistoryData = (value) => JSON.parse(JSON.stringify(value));

const captureEditorHistoryState = () => {
  ports.pageAppearance.commitCurrentPageAppearance();
  return cloneEditorHistoryData({
    predictionMode: ports.sourceSelection.predictionMode.value,
    multiSourceIds: ports.sourceSelection.multiSourceIds.value,
    selectedPageConfigKey: ports.pageAppearance.selectedPageConfigKey.value,
    singlePageAppearance: ports.pageAppearance.singlePageAppearance.value,
    allPageAppearance: ports.pageAppearance.allPageAppearance.value,
    pageAppearances: ports.pageAppearance.pageAppearances.value,
    blocks: ports.textSettings.coverTextBlocks.value,
    creditText: ports.credit.creditText.value,
    creditManuallyEdited: ports.credit.creditManuallyEdited.value,
    monthFontFamily: ports.presentation.monthFontFamily.value,
    creditTextStyle: ports.credit.creditTextStyle.value,
    eventNotesByMode: ports.eventNotes.eventNotesByMode.value,
    eventNotesBySource: ports.eventNotes.eventNotesBySource.value,
    manualCaseEditsByEvent: ports.manualCases.manualCaseEditsByEvent.value,
    monthColorName: ports.presentation.monthColorName.value,
    backgroundColorName: ports.presentation.backgroundColorName.value,
    customMonthColor: ports.presentation.customMonthColor.value,
    customBackgroundColor: ports.presentation.customBackgroundColor.value,
    coverBgAssetId: ports.background.coverBgAssetId.value,
    coverBgFileName: ports.background.coverBgFileName.value,
    coverBgOpacity: ports.background.coverBgOpacity.value
  });
};

const resetEditorHistory = () => {
  if (editorHistoryTimer) {
    window.clearTimeout(editorHistoryTimer);
    editorHistoryTimer = null;
  }
  editorUndoStack.value = [];
  editorRedoStack.value = [];
  editorHistoryPending.value = false;
  editorCompositionActive = false;
  lastEditorHistoryState = captureEditorHistoryState();
  editorHistoryReady = true;
};

const pushEditorHistoryTransition = (previousState, nextState) => {
  if (!previousState || JSON.stringify(nextState) === JSON.stringify(previousState)) {
    lastEditorHistoryState = nextState;
    return false;
  }
  editorUndoStack.value.push(previousState);
  if (editorUndoStack.value.length > EDITOR_HISTORY_LIMIT) editorUndoStack.value.shift();
  editorRedoStack.value = [];
  lastEditorHistoryState = nextState;
  return true;
};

const commitPendingEditorHistory = () => {
  if (!editorHistoryReady || editorHistoryApplying || editorCompositionActive) return;
  if (editorHistoryTimer) {
    window.clearTimeout(editorHistoryTimer);
    editorHistoryTimer = null;
  }
  editorHistoryPending.value = false;
  const nextState = captureEditorHistoryState();
  if (!lastEditorHistoryState) {
    lastEditorHistoryState = nextState;
    return;
  }
  pushEditorHistoryTransition(lastEditorHistoryState, nextState);
};

const scheduleEditorHistoryCapture = () => {
  if (!editorHistoryReady || editorHistoryApplying) return;
  const nextState = captureEditorHistoryState();
  const hasChange = !!lastEditorHistoryState
    && JSON.stringify(nextState) !== JSON.stringify(lastEditorHistoryState);
  if (editorHistoryTimer) window.clearTimeout(editorHistoryTimer);
  editorHistoryTimer = null;
  editorHistoryPending.value = hasChange && !editorCompositionActive;
  if (!hasChange || editorCompositionActive) return;
  editorHistoryTimer = window.setTimeout(commitPendingEditorHistory, EDITOR_HISTORY_CAPTURE_DELAY);
};

const isEditorHistoryInputTarget = (target) => (
  target instanceof Element
  && target.matches('input:not([type="file"]), textarea, select, [contenteditable="true"]')
);

const onEditorCompositionStart = (event) => {
  if (!isEditorHistoryInputTarget(event?.target)) return;
  commitPendingEditorHistory();
  editorCompositionActive = true;
  editorHistoryPending.value = false;
};

const onEditorCompositionEnd = (event) => {
  if (!isEditorHistoryInputTarget(event?.target)) return;
  editorCompositionActive = false;
  nextTick(scheduleEditorHistoryCapture);
};

const applyEditorHistoryState = async (state) => {
  if (!state) return;
  editorHistoryApplying = true;
  try {
    ports.sourceSelection.predictionMode.value = state.predictionMode === 'multi' ? 'multi' : 'single';
    ports.sourceSelection.multiSourceIds.value = Array.isArray(state.multiSourceIds)
      ? state.multiSourceIds.map(normalizeId).filter(Boolean)
      : [];
    ports.pageAppearance.selectedPageConfigKey.value = normalizeId(state.selectedPageConfigKey) || ALL_PAGE_CONFIG_KEY;
    const legacyAppearance = ports.pageAppearance.normalizePageAppearance(state);
    ports.pageAppearance.singlePageAppearance.value = ports.pageAppearance.normalizePageAppearance(
      state.singlePageAppearance || legacyAppearance,
      legacyAppearance
    );
    ports.pageAppearance.allPageAppearance.value = ports.pageAppearance.normalizePageAppearance(
      state.allPageAppearance || legacyAppearance,
      legacyAppearance
    );
    ports.pageAppearance.pageAppearances.value = Object.fromEntries(
      Object.entries(state.pageAppearances && typeof state.pageAppearances === 'object' ? state.pageAppearances : {})
        .map(([key, appearance]) => [normalizeId(key), ports.pageAppearance.normalizePageAppearance(appearance, ports.pageAppearance.allPageAppearance.value)])
        .filter(([key]) => key)
    );
    ports.manualCases.manualCaseEditsByEvent.value = ports.manualCases.normalizeManualCaseEdits(state.manualCaseEditsByEvent);
    if (state.eventNotesByMode && typeof state.eventNotesByMode === 'object') {
      ports.eventNotes.eventNotesByMode.value = {
        single: cloneEditorHistoryData(state.eventNotesByMode.single || {}),
        multi: cloneEditorHistoryData(state.eventNotesByMode.multi || {})
      };
    } else {
      const legacyNotes = cloneEditorHistoryData(state.eventNotesBySource || {});
      ports.eventNotes.eventNotesByMode.value = {
        single: cloneEditorHistoryData(legacyNotes),
        multi: cloneEditorHistoryData(legacyNotes)
      };
    }
    ports.eventNotes.syncEventNotesWithSources('single');
    ports.eventNotes.syncEventNotesWithSources('multi');
    const activeAppearance = ports.sourceSelection.isMultiCaseMode.value
      ? (ports.pageAppearance.selectedPageConfigKey.value === ALL_PAGE_CONFIG_KEY
        ? ports.pageAppearance.allPageAppearance.value
        : (ports.pageAppearance.pageAppearances.value[ports.pageAppearance.selectedPageConfigKey.value] || ports.pageAppearance.allPageAppearance.value))
      : ports.pageAppearance.singlePageAppearance.value;
    ports.pageAppearance.applyPageAppearance(activeAppearance);
    await Promise.all([
      ports.coverText.syncCoverTextElements(),
      ports.credit.syncCreditElement(),
      ports.eventNotes.syncEventNoteElements()
    ]);
    ports.preview.updatePreviewScale();
    ports.settingsPersistence.saveCoverTextSettings();
    await nextTick();
    lastEditorHistoryState = captureEditorHistoryState();
  } finally {
    editorHistoryApplying = false;
  }
};

const canUndoEditor = computed(() => editorHistoryPending.value || editorUndoStack.value.length > 0);

const canRedoEditor = computed(() => !editorHistoryPending.value && editorRedoStack.value.length > 0);

const undoEditorChange = async () => {
  if (editorHistoryApplying) return;
  commitPendingEditorHistory();
  const target = editorUndoStack.value.pop();
  if (!target) return;
  editorRedoStack.value.push(captureEditorHistoryState());
  await applyEditorHistoryState(target);
};

const redoEditorChange = async () => {
  if (editorHistoryApplying) return;
  commitPendingEditorHistory();
  const target = editorRedoStack.value.pop();
  if (!target) return;
  editorUndoStack.value.push(captureEditorHistoryState());
  await applyEditorHistoryState(target);
};

const onGlobalEditorKeydown = (event) => {
  const pageElement = ports.preview.canvasWrapRef.value?.closest('.special-predict-page');
  if (!ports.unlock.isUnlocked.value || !pageElement?.isConnected || ports.capture.isExporting.value) return;
  const modifierPressed = event.ctrlKey || event.metaKey;
  const key = String(event.key || '').toLowerCase();
  if (modifierPressed && !event.altKey && (key === 'z' || key === 'y')) {
    event.preventDefault();
    event.stopPropagation();
    if (key === 'y' || (key === 'z' && event.shiftKey)) {
      void redoEditorChange();
    } else {
      void undoEditorChange();
    }
    return;
  }
  ports.textTransform.onGlobalTextNudgeKeydown(event);
};

return { editorUndoStack,
editorRedoStack,
editorHistoryPending,
EDITOR_HISTORY_LIMIT,
EDITOR_HISTORY_CAPTURE_DELAY,
get editorHistoryReady() { return editorHistoryReady; }, set editorHistoryReady(value) { editorHistoryReady = value; },
get editorHistoryApplying() { return editorHistoryApplying; }, set editorHistoryApplying(value) { editorHistoryApplying = value; },
get editorHistoryTimer() { return editorHistoryTimer; }, set editorHistoryTimer(value) { editorHistoryTimer = value; },
get lastEditorHistoryState() { return lastEditorHistoryState; }, set lastEditorHistoryState(value) { lastEditorHistoryState = value; },
get editorCompositionActive() { return editorCompositionActive; }, set editorCompositionActive(value) { editorCompositionActive = value; },
cloneEditorHistoryData,
captureEditorHistoryState,
resetEditorHistory,
pushEditorHistoryTransition,
commitPendingEditorHistory,
scheduleEditorHistoryCapture,
isEditorHistoryInputTarget,
onEditorCompositionStart,
onEditorCompositionEnd,
applyEditorHistoryState,
canUndoEditor,
canRedoEditor,
undoEditorChange,
redoEditorChange,
onGlobalEditorKeydown };
}
