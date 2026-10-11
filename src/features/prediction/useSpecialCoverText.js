import { nextTick, watch } from "vue";
import { clampPercent, clampNumber, rgbaFromHex, normalizeId } from './specialPredictionFormatters.js';
import { createDefaultEventNote, createDefaultCreditTextStyle, createDefaultCoverTextBlocks, ALL_PAGE_CONFIG_KEY, GLOBAL_COVER_TEXT_ID } from './specialPredictionTextDefaults.js';

/** Owns special prediction cover text with explicit instance dependencies. */
export function useSpecialCoverText(ports = {}) {
const coverTextElementMap = new Map();

const getCoverTextFrameStyle = (block) => ({
  left: `${clampPercent(block.x, 0, 0, Math.max(0, 100 - clampPercent(block.w, 30, 6, 100)))}%`,
  top: `${clampPercent(block.y, 0, 0, Math.max(0, 100 - clampPercent(block.h, 20, 6, 100)))}%`,
  width: `${clampPercent(block.w, 30, 6, 100)}%`,
  height: `${clampPercent(block.h, 20, 6, 100)}%`,
  zIndex: Math.round(clampNumber(block.zIndex, 2, 2, 99)),
  opacity: clampNumber(block.opacity, 100, 10, 100) / 100
});

const getCoverTextContentStyle = (block, monthColor = ports.presentation.selectedMonthColor.value) => {
  const shadowColor = block.shadowColor || monthColor;
  return {
    color: block.color || '#ffffff',
    fontFamily: String(block.fontFamily || 'inherit'),
    fontSize: `${clampNumber(block.fontSize, 24, 8, 96)}px`,
    textAlign: ['left', 'center', 'right'].includes(block.align) ? block.align : 'left',
    fontWeight: Math.round(clampNumber(block.weight, 900, 100, 900) / 100) * 100,
    fontStyle: 'normal',
    textDecoration: block.underline ? 'underline' : 'none',
    lineHeight: clampNumber(block.lineHeight, 1.28, 0.8, 3),
    letterSpacing: `${clampNumber(block.letterSpacing, 0, -4, 20)}px`,
    justifyContent: block.verticalAlign === 'center'
      ? 'center'
      : (block.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'),
    padding: `${clampNumber(block.padding, 4, 0, 40)}px`,
    textShadow: block.shadowEnabled === false
      ? 'none'
      : `0 2px 0 ${rgbaFromHex(shadowColor, 0.92)}, 0 0 6px ${rgbaFromHex(shadowColor, 0.9)}, 0 0 12px rgba(255, 255, 255, 0.58)`
  };
};

const getPageCoverTextContentStyle = (block, pageKey) => (
  getCoverTextContentStyle(block, ports.presentation.getAppearanceMonthColor(ports.pageAppearance.resolvePageAppearance(pageKey)))
);

const addCoverTextBlock = () => {
  const id = `text-${Date.now()}`;
  ports.textSettings.coverTextBlocks.value.push({
    id,
    name: `文本${ports.textSettings.coverTextBlocks.value.length + 1}`,
    text: '新文本',
    x: 12,
    y: 18,
    w: 34,
    h: 18,
    fontSize: 22,
    color: '#ffffff',
    shadowColor: '',
    align: 'left',
    weight: 900,
    fontFamily: 'inherit',
    italic: false,
    underline: false,
    lineHeight: 1.28,
    letterSpacing: 0,
    verticalAlign: 'top',
    padding: 4,
    backgroundEnabled: false,
    backgroundColor: '#ffffff',
    backgroundOpacity: 32,
    borderEnabled: false,
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 6,
    opacity: 100,
    shadowEnabled: true,
    zIndex: Math.min(99, Math.max(2, ...ports.textSettings.coverTextBlocks.value.map((block) => Number(block.zIndex) || 2)) + 1)
  });
  ports.textSettings.selectedCoverTextId.value = id;
};

const duplicateSelectedCoverTextBlock = () => {
  const source = ports.textSettings.selectedCoverTextBlock.value;
  if (!source) return;
  const id = `text-${Date.now()}`;
  const w = clampPercent(source.w, 30, 6, 100);
  const h = clampPercent(source.h, 20, 6, 100);
  const clone = {
    ...source,
    id,
    name: `${source.name || '文本'}副本`,
    text: String(source.text ?? ''),
    x: clampPercent(Number(source.x || 0) + 3, 3, 0, Math.max(0, 100 - w)),
    y: clampPercent(Number(source.y || 0) + 3, 3, 0, Math.max(0, 100 - h)),
    zIndex: Math.min(99, Math.max(2, ...ports.textSettings.coverTextBlocks.value.map((block) => Number(block.zIndex) || 2)) + 1)
  };
  ports.textSettings.coverTextBlocks.value.push(clone);
  ports.textSettings.selectedCoverTextId.value = id;
  syncCoverTextElements();
};

const moveSelectedCoverTextLayer = (direction) => {
  const block = ports.textSettings.selectedCoverTextBlock.value;
  if (!block) return;
  const originalOrder = new Map(ports.textSettings.coverTextBlocks.value.map((item, index) => [item.id, index]));
  const ordered = [...ports.textSettings.coverTextBlocks.value].sort((a, b) => (
    (Number(a.zIndex) || 2) - (Number(b.zIndex) || 2)
    || (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0)
  ));
  const otherBlocks = ordered.filter((item) => item.id !== block.id);
  const reordered = direction > 0
    ? [...otherBlocks, block]
    : [block, ...otherBlocks];
  reordered.forEach((item, index) => {
    item.zIndex = index + 2;
  });
  ports.settingsPersistence.saveCoverTextSettings();
};

const removeSelectedCoverTextBlock = () => {
  if (ports.textSettings.coverTextBlocks.value.length <= 1) return;
  const index = ports.textSettings.coverTextBlocks.value.findIndex((block) => block.id === ports.textSettings.selectedCoverTextId.value);
  if (index < 0) return;
  ports.textSettings.coverTextBlocks.value.splice(index, 1);
  ports.textSettings.selectedCoverTextId.value = ports.textSettings.coverTextBlocks.value[Math.max(0, index - 1)]?.id || ports.textSettings.coverTextBlocks.value[0]?.id || '';
};

const resetEventNoteStyles = () => {
  if (ports.textSettings.isAllEventNotesMode.value) {
    ports.eventNotes.bulkEditableEventNotes.value.forEach((note) => {
      Object.assign(note, {
        ...createDefaultEventNote(note.id),
        text: String(note?.text ?? '')
      });
    });
    ports.textSettings.allEventNotesDraft.value = {};
  } else if (ports.textSettings.isEventNoteMode.value) {
    const id = ports.textSettings.selectedEventNoteId.value;
    Object.assign(ports.textSettings.selectedEventNote.value, {
      ...createDefaultEventNote(id),
      text: String(ports.textSettings.selectedEventNote.value?.text ?? '')
    });
  }
  ports.eventNotes.syncEventNoteElements();
  ports.settingsPersistence.saveCoverTextSettings();
};

const clearEventNoteText = () => {
  if (ports.textSettings.isAllEventNotesMode.value) {
    ports.eventNotes.bulkEditableEventNotes.value.forEach((note) => {
      note.text = '';
    });
  } else if (ports.textSettings.isEventNoteMode.value) {
    ports.textSettings.selectedEventNote.value.text = '';
  }
  ports.eventNotes.syncEventNoteElements();
  ports.settingsPersistence.saveCoverTextSettings();
};

const resetSelectedCoverTextBlock = () => {
  if (ports.textSettings.isPredictorTextMode.value) {
    ports.credit.creditManuallyEdited.value = false;
    ports.credit.creditText.value = ports.credit.defaultCreditText.value;
    ports.credit.creditTextStyle.value = createDefaultCreditTextStyle();
    ports.credit.syncCreditElement();
    ports.settingsPersistence.saveCoverTextSettings();
    return;
  }
  if (ports.textSettings.isAllEventNotesMode.value) {
    ports.eventNotes.bulkEditableEventNotes.value.forEach((note) => {
      Object.assign(note, createDefaultEventNote(note.id));
    });
    ports.textSettings.allEventNotesDraft.value = {};
    ports.eventNotes.syncEventNoteElements();
    ports.settingsPersistence.saveCoverTextSettings();
    return;
  }
  if (ports.textSettings.isEventNoteMode.value) {
    const id = ports.textSettings.selectedEventNoteId.value;
    Object.assign(ports.textSettings.selectedEventNote.value, createDefaultEventNote(id));
    ports.eventNotes.syncEventNoteElements();
    ports.settingsPersistence.saveCoverTextSettings();
    return;
  }
  const index = ports.textSettings.coverTextBlocks.value.findIndex((block) => block.id === ports.textSettings.selectedCoverTextId.value);
  if (index < 0) return;
  const current = ports.textSettings.coverTextBlocks.value[index];
  const builtInDefault = createDefaultCoverTextBlocks().find((block) => block.id === current.id);
  const replacement = builtInDefault || {
    ...createDefaultCoverTextBlocks()[0],
    id: current.id,
    name: current.name || `文本${index + 1}`,
    text: String(current.text ?? '新文本'),
    x: 12,
    y: 18,
    w: 34,
    h: 18,
    fontSize: 22,
    align: 'left',
    zIndex: Number(current.zIndex) || 2
  };
  ports.textSettings.coverTextBlocks.value.splice(index, 1, replacement);
  syncCoverTextElements();
  ports.settingsPersistence.saveCoverTextSettings();
};

const normalizeCoverTextBlock = (block, fallback) => ({
  ...fallback,
  ...(block || {}),
  id: String(block?.id || fallback.id || `text-${Date.now()}`),
  name: String(block?.name || fallback.name || '文本'),
  text: String(block?.text ?? fallback.text ?? ''),
  x: clampPercent(block?.x, fallback.x ?? 0),
  y: clampPercent(block?.y, fallback.y ?? 0),
  w: clampPercent(block?.w, fallback.w ?? 30, 6, 100),
  h: clampPercent(block?.h, fallback.h ?? 20, 6, 100),
  fontSize: clampNumber(block?.fontSize, fallback.fontSize || 24, 8, 96),
  color: String(block?.color || fallback.color || '#ffffff'),
  shadowColor: String(block?.shadowColor || ''),
  align: ['left', 'center', 'right'].includes(block?.align) ? block.align : (fallback.align || 'left'),
  weight: Math.round(clampNumber(block?.weight, fallback.weight || 900, 100, 900) / 100) * 100,
  fontFamily: String(block?.fontFamily || fallback.fontFamily || 'inherit'),
  italic: !!block?.italic,
  underline: !!block?.underline,
  lineHeight: clampNumber(block?.lineHeight, fallback.lineHeight || 1.28, 0.8, 3),
  letterSpacing: clampNumber(block?.letterSpacing, fallback.letterSpacing || 0, -4, 20),
  verticalAlign: ['top', 'center', 'bottom'].includes(block?.verticalAlign)
    ? block.verticalAlign
    : (fallback.verticalAlign || 'top'),
  padding: clampNumber(block?.padding, fallback.padding || 4, 0, 40),
  backgroundEnabled: !!block?.backgroundEnabled,
  backgroundColor: String(block?.backgroundColor || fallback.backgroundColor || '#ffffff'),
  backgroundOpacity: clampNumber(block?.backgroundOpacity, fallback.backgroundOpacity || 32, 0, 100),
  borderEnabled: !!block?.borderEnabled,
  borderColor: String(block?.borderColor || fallback.borderColor || '#ffffff'),
  borderWidth: clampNumber(block?.borderWidth, fallback.borderWidth || 1, 0, 12),
  borderRadius: clampNumber(block?.borderRadius, fallback.borderRadius || 6, 0, 80),
  opacity: clampNumber(block?.opacity, fallback.opacity || 100, 10, 100),
  shadowEnabled: block?.shadowEnabled !== false,
  zIndex: Math.round(clampNumber(block?.zIndex, fallback.zIndex || 2, 2, 99))
});

const restoreDefaultCoverTextBlocks = () => {
  ports.history.commitPendingEditorHistory();
  const mode = ports.sourceSelection.isMultiCaseMode.value ? 'multi' : 'single';
  const defaultAppearance = ports.pageAppearance.createDefaultPageAppearance();
  if (mode === 'multi') {
    ports.pageAppearance.selectedPageConfigKey.value = ALL_PAGE_CONFIG_KEY;
    ports.pageAppearance.allPageAppearance.value = ports.history.cloneEditorHistoryData(defaultAppearance);
    ports.pageAppearance.pageAppearances.value = Object.fromEntries(
      ports.caseRows.monthlyMultiPages.value.map((page) => [page.key, ports.history.cloneEditorHistoryData(defaultAppearance)])
    );
    ports.eventNotes.eventNotesByMode.value.multi = {};
    ports.manualCases.manualCaseEditsByEvent.value = {};
    ports.manualCases.activeCaseControlKey.value = '';
  } else {
    ports.pageAppearance.singlePageAppearance.value = ports.history.cloneEditorHistoryData(defaultAppearance);
    ports.eventNotes.eventNotesByMode.value.single = {};
  }
  ports.textSettings.selectedCoverTextId.value = GLOBAL_COVER_TEXT_ID;
  ports.textSettings.selectedEventNoteSourceId.value = '';
  ports.textSettings.globalTextDraft.value = {};
  ports.textSettings.allEventNotesDraft.value = {};
  ports.eventNotes.syncEventNotesWithSources(mode);
  ports.pageAppearance.applyPageAppearance(defaultAppearance);
  syncCoverTextElements();
  ports.credit.syncCreditElement();
  ports.eventNotes.syncEventNoteElements();
  ports.settingsPersistence.saveCoverTextSettings();
};

const getEditableCoverTextBlock = (block, pageKey = '') => {
  if (normalizeId(pageKey) && ports.pageAppearance.selectedPageConfigKey.value === ALL_PAGE_CONFIG_KEY) {
    return ports.textSettings.coverTextBlocks.value.find((item) => item.id === block?.id) || block;
  }
  return block;
};

const onCoverTextInput = (block, event, pageKey = '') => {
  const editableBlock = getEditableCoverTextBlock(block, pageKey);
  editableBlock.text = event?.currentTarget?.innerText ?? '';
  ports.settingsPersistence.saveCoverTextSettings();
};

const renderCoverTextLines = (element, text) => {
  if (!element) return;
  const fragment = document.createDocumentFragment();
  String(text ?? '').split('\n').forEach((line) => {
    const lineElement = document.createElement('span');
    lineElement.className = 'special-cover-text-line';
    lineElement.textContent = line;
    fragment.appendChild(lineElement);
  });
  element.replaceChildren(fragment);
};

const onCoverTextBlur = (block, event, pageKey = '') => {
  const element = event?.currentTarget;
  const editableBlock = getEditableCoverTextBlock(block, pageKey);
  editableBlock.text = element?.innerText ?? editableBlock.text ?? '';
  renderCoverTextLines(element, editableBlock.text);
  ports.settingsPersistence.saveCoverTextSettings();
};

const setCoverTextElement = (block, element, pageKey = 'single') => {
  const id = String(block?.id || '');
  if (!id) return;
  const mapKey = `${normalizeId(pageKey) || 'single'}|${id}`;
  if (!element) {
    coverTextElementMap.delete(mapKey);
    return;
  }
  coverTextElementMap.set(mapKey, element);
  const text = String(block?.text ?? '');
  if (element.innerText !== text || !element.querySelector('.special-cover-text-line')) {
    renderCoverTextLines(element, text);
  }
};

const syncCoverTextElements = async () => {
  await nextTick();
  coverTextElementMap.forEach((element, key) => {
    const separator = key.indexOf('|');
    const pageKey = key.slice(0, separator);
    const blockId = key.slice(separator + 1);
    const blocks = pageKey === 'single' ? ports.textSettings.coverTextBlocks.value : ports.presentation.getPageCoverTextBlocks(pageKey);
    const block = blocks.find((item) => item.id === blockId);
    if (!block) return;
    const text = String(block.text ?? '');
    if (element.innerText !== text) renderCoverTextLines(element, text);
  });
};
const connectSpecialEditableText = () => {
watch(
  () => [
    ports.unlock.isUnlocked.value,
    ports.textSettings.coverTextBlocks.value.map((block) => `${block.id}:${block.text}`).join('\u0001'),
    Object.values(ports.eventNotes.eventNotes.value).map((note) => `${note.id}:${note.text}`).join('\u0001')
  ],
  () => {
    syncCoverTextElements();
    ports.credit.syncCreditElement();
    ports.eventNotes.syncEventNoteElements();
  },
  { flush: 'post' }
);
};
return { coverTextElementMap,
getCoverTextFrameStyle,
getCoverTextContentStyle,
getPageCoverTextContentStyle,
addCoverTextBlock,
duplicateSelectedCoverTextBlock,
moveSelectedCoverTextLayer,
removeSelectedCoverTextBlock,
resetEventNoteStyles,
clearEventNoteText,
resetSelectedCoverTextBlock,
normalizeCoverTextBlock,
restoreDefaultCoverTextBlocks,
getEditableCoverTextBlock,
onCoverTextInput,
renderCoverTextLines,
onCoverTextBlur,
setCoverTextElement,
syncCoverTextElements,
connectSpecialEditableText };
}
