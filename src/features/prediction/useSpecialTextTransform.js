import { ref } from "vue";
import { GLOBAL_COVER_TEXT_ID, PREDICTOR_TEXT_ID, EVENT_NOTE_ID_PREFIX } from './specialPredictionTextDefaults.js';
import { normalizeId, clampPercent } from './specialPredictionFormatters.js';

/** Owns special prediction text transform with explicit instance dependencies. */
export function useSpecialTextTransform(ports = {}) {
const activeTextTransformMode = ref('');

let activeTextTransform = null;

const selectCoverTextBlock = (block) => {
  const id = String(block?.id || '');
  if (id) ports.textSettings.selectedCoverTextId.value = id;
};

const selectGlobalTextMode = () => {
  ports.textSettings.selectedCoverTextId.value = GLOBAL_COVER_TEXT_ID;
  ports.textSettings.globalTextDraft.value = {};
};

const selectPredictorText = () => {
  if (ports.capture.isExporting.value) return;
  ports.textSettings.selectedCoverTextId.value = PREDICTOR_TEXT_ID;
};

const selectEventNote = (eventId, sourceId = ports.sourceSelection.selectedSource.value?.id) => {
  if (ports.capture.isExporting.value) return;
  const normalizedSourceId = normalizeId(sourceId);
  if (
    !ports.sourceSelection.isMultiCaseMode.value
    &&
    normalizedSourceId
    && normalizedSourceId !== ports.sourceSelection.selectedSourceId.value
    && ports.sourceSelection.normalizedSources.value.some((source) => source.id === normalizedSourceId)
  ) {
    ports.sourceSelection.selectedSourceId.value = normalizedSourceId;
  }
  const note = ports.eventNotes.ensureEventNote(eventId, normalizedSourceId);
  if (note) {
    ports.textSettings.selectedEventNoteSourceId.value = normalizedSourceId;
    ports.textSettings.selectedCoverTextId.value = `${EVENT_NOTE_ID_PREFIX}${note.id}`;
  }
};

const onCanvasTextSelectionPointerDown = (event) => {
  if (ports.capture.isExporting.value) return;
  const target = event?.target;
  if (target instanceof Element && target.closest('.special-cover-text-frame, .special-credit-box, .special-event-note, .special-case-note')) return;
  selectGlobalTextMode();
};

const endCoverTextTransform = (event) => {
  if (!activeTextTransform) return;
  if (event && event.pointerId !== activeTextTransform.pointerId) return;
  activeTextTransform = null;
  activeTextTransformMode.value = '';
  window.removeEventListener('pointermove', onCoverTextTransformMove);
  window.removeEventListener('pointerup', endCoverTextTransform);
  window.removeEventListener('pointercancel', endCoverTextTransform);
  ports.settingsPersistence.saveCoverTextSettings();
};

const onCoverTextTransformMove = (event) => {
  const state = activeTextTransform;
  if (!state || event.pointerId !== state.pointerId) return;
  const block = ports.textSettings.coverTextBlocks.value.find((item) => item.id === state.blockId);
  if (!block) {
    endCoverTextTransform(event);
    return;
  }
  event.preventDefault();
  const dx = ((event.clientX - state.startClientX) / state.panelWidth) * 100;
  const dy = ((event.clientY - state.startClientY) / state.panelHeight) * 100;
  if (state.mode === 'move') {
    block.x = clampPercent(state.startX + dx, state.startX, 0, Math.max(0, 100 - state.startW));
    block.y = clampPercent(state.startY + dy, state.startY, 0, Math.max(0, 100 - state.startH));
  } else {
    block.w = clampPercent(state.startW + dx, state.startW, 6, Math.max(6, 100 - state.startX));
    block.h = clampPercent(state.startH + dy, state.startH, 6, Math.max(6, 100 - state.startY));
  }
};

const startCoverTextTransform = (block, mode, event, pageKey = '') => {
  const panel = pageKey
    ? ports.preview.multiCoverPanelElementMap.get(normalizeId(pageKey))
    : ports.preview.coverPanelRef.value;
  if (!panel || !block || ports.capture.isExporting.value) return;
  const rect = panel.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  event.preventDefault();
  event.stopPropagation();
  selectCoverTextBlock(block);
  endCoverTextTransform();
  const startW = clampPercent(block.w, 30, 6, 100);
  const startH = clampPercent(block.h, 20, 6, 100);
  activeTextTransform = {
    blockId: block.id,
    mode,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    panelWidth: rect.width,
    panelHeight: rect.height,
    startX: clampPercent(block.x, 0, 0, Math.max(0, 100 - startW)),
    startY: clampPercent(block.y, 0, 0, Math.max(0, 100 - startH)),
    startW,
    startH
  };
  activeTextTransformMode.value = mode;
  window.addEventListener('pointermove', onCoverTextTransformMove, { passive: false });
  window.addEventListener('pointerup', endCoverTextTransform);
  window.addEventListener('pointercancel', endCoverTextTransform);
};

const onGlobalTextNudgeKeydown = (event) => {
  if (!ports.unlock.isUnlocked.value || !ports.textSettings.selectedCoverTextBlock.value || ports.capture.isExporting.value) return;
  const target = event.target;
  if (target instanceof HTMLElement && (
    target.isContentEditable
    || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
  )) return;
  const deltaByKey = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  };
  const direction = deltaByKey[event.key];
  if (!direction) return;
  event.preventDefault();
  const step = event.shiftKey ? 1 : 0.25;
  const block = ports.textSettings.selectedCoverTextBlock.value;
  const w = clampPercent(block.w, 30, 6, 100);
  const h = clampPercent(block.h, 20, 6, 100);
  block.x = clampPercent(Number(block.x || 0) + direction[0] * step, 0, 0, Math.max(0, 100 - w));
  block.y = clampPercent(Number(block.y || 0) + direction[1] * step, 0, 0, Math.max(0, 100 - h));
};

return { activeTextTransformMode,
get activeTextTransform() { return activeTextTransform; }, set activeTextTransform(value) { activeTextTransform = value; },
selectCoverTextBlock,
selectGlobalTextMode,
selectPredictorText,
selectEventNote,
onCanvasTextSelectionPointerDown,
endCoverTextTransform,
onCoverTextTransformMove,
startCoverTextTransform,
onGlobalTextNudgeKeydown };
}
