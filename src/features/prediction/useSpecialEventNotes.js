import { computed, nextTick, ref, watch } from "vue";
import { ALL_PAGE_CONFIG_KEY, createDefaultEventNote, ALL_EVENT_NOTES_ID, EVENT_NOTE_ID_PREFIX } from './specialPredictionTextDefaults.js';
import { normalizeId, rgbaFromHex } from './specialPredictionFormatters.js';

/** Owns special prediction event notes with explicit instance dependencies. */
export function useSpecialEventNotes(ports = {}) {
const eventNotesByMode = ref({ single: {}, multi: {} });

const eventNotesBySource = computed({
  get: () => eventNotesByMode.value[ports.sourceSelection.predictionMode.value === 'multi' ? 'multi' : 'single'],
  set: (value) => {
    const mode = ports.sourceSelection.predictionMode.value === 'multi' ? 'multi' : 'single';
    eventNotesByMode.value[mode] = value && typeof value === 'object' ? value : {};
  }
});

const eventNoteElementMap = new Map();

const eventNotes = computed(() => (
  eventNotesBySource.value[ports.sourceSelection.selectedSource.value?.id] || {}
));

const collectScopedMultiEventNotes = (pages, pageKey, notesBySource) => {
  const scopedPages = pageKey === ALL_PAGE_CONFIG_KEY
    ? pages
    : pages.filter((page) => page.key === pageKey);
  const notes = [];
  const seen = new Set();
  scopedPages.forEach((page) => {
    page.rows.forEach((row) => {
      if (row.isCompilation) return;
      row.cases.forEach((caseItem) => {
        if (!caseItem.hasPrediction) return;
        const sourceId = normalizeId(caseItem.noteSourceId);
        const eventId = normalizeId(row.id);
        const key = `${sourceId}|${eventId}`;
        const note = notesBySource[sourceId]?.[eventId];
        if (!note || seen.has(key)) return;
        seen.add(key);
        notes.push(note);
      });
    });
  });
  return notes;
};

const bulkEditableEventNotes = computed(() => {
  if (!ports.sourceSelection.isMultiCaseMode.value) return Object.values(eventNotes.value);
  return collectScopedMultiEventNotes(
    ports.caseRows.monthlyMultiPages.value,
    ports.pageAppearance.selectedPageConfigKey.value,
    eventNotesBySource.value
  );
});

const getManualCaseNoteSourceId = (manualCaseId) => `__manual_case__:${normalizeId(manualCaseId)}`;

const hasManualCaseNoteSource = (eventId, sourceId) => {
  const prefix = '__manual_case__:';
  const normalizedSourceId = normalizeId(sourceId);
  if (!normalizedSourceId.startsWith(prefix)) return false;
  const manualId = normalizedSourceId.slice(prefix.length);
  return !!ports.manualCases.manualCaseEditsByEvent.value[normalizeId(eventId)]?.manualCases?.some((item) => item.id === manualId);
};

const getEventNote = (eventId, sourceId = ports.sourceSelection.selectedSource.value?.id) => {
  const id = normalizeId(eventId);
  const sourceNotes = eventNotesBySource.value[normalizeId(sourceId)] || {};
  return sourceNotes[id] || createDefaultEventNote(id);
};

const ensureEventNote = (eventId, sourceId = ports.sourceSelection.selectedSource.value?.id) => {
  const id = normalizeId(eventId);
  const normalizedSourceId = normalizeId(sourceId);
  const source = ports.sourceSelection.normalizedSources.value.find((item) => item.id === normalizedSourceId);
  const hasPrediction = source?.predictiveEvents?.some((event) => normalizeId(event?.id) === id);
  const isManualCase = hasManualCaseNoteSource(id, normalizedSourceId);
  if (!id || !normalizedSourceId || (!hasPrediction && !isManualCase)) return null;
  if (!eventNotesBySource.value[normalizedSourceId]) eventNotesBySource.value[normalizedSourceId] = {};
  if (!eventNotesBySource.value[normalizedSourceId][id]) {
    eventNotesBySource.value[normalizedSourceId][id] = createDefaultEventNote(id);
  }
  return eventNotesBySource.value[normalizedSourceId][id];
};

const syncEventNotesWithSources = (modeKey = ports.sourceSelection.predictionMode.value === 'multi' ? 'multi' : 'single') => {
  const mode = modeKey === 'multi' ? 'multi' : 'single';
  const existingBySource = eventNotesByMode.value[mode] || {};
  const nextBySource = {};
  ports.sourceSelection.normalizedSources.value.forEach((source) => {
    const existingNotes = existingBySource[source.id] || {};
    const nextNotes = {};
    source.predictiveEvents.forEach((event) => {
      const id = normalizeId(event?.id);
      if (!id || nextNotes[id]) return;
      nextNotes[id] = ports.settingsPersistence.normalizeEventNote(existingNotes[id], id);
    });
    nextBySource[source.id] = nextNotes;
  });
  if (mode === 'multi') {
    Object.entries(ports.manualCases.manualCaseEditsByEvent.value).forEach(([eventId, edit]) => {
      edit.manualCases.forEach((manualCase) => {
        const sourceId = getManualCaseNoteSourceId(manualCase.id);
        const existing = existingBySource[sourceId]?.[eventId];
        nextBySource[sourceId] = {
          [eventId]: ports.settingsPersistence.normalizeEventNote(existing, eventId)
        };
      });
    });
  }
  eventNotesByMode.value[mode] = nextBySource;
  if (mode !== (ports.sourceSelection.predictionMode.value === 'multi' ? 'multi' : 'single')) return;
  const activeSourceNotes = nextBySource[ports.textSettings.selectedEventNoteSourceId.value || ports.sourceSelection.selectedSource.value?.id] || {};
  if (ports.textSettings.selectedEventNoteId.value && !activeSourceNotes[ports.textSettings.selectedEventNoteId.value]) {
    ports.textSettings.selectedCoverTextId.value = ALL_EVENT_NOTES_ID;
  }
};

const getEventNoteRenderStyle = (eventId, sourceId = ports.sourceSelection.selectedSource.value?.id) => {
  const style = ports.settingsPersistence.normalizeEventNote(getEventNote(eventId, sourceId), eventId);
  const shadowColor = style.shadowColor || style.color;
  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    textAlign: style.align,
    fontWeight: style.weight,
    fontStyle: style.italic ? 'oblique 12deg' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing}px`,
    opacity: style.opacity / 100,
    textShadow: style.shadowEnabled
      ? `0 1px 2px ${rgbaFromHex(shadowColor, 0.72)}, 0 0 5px ${rgbaFromHex(shadowColor, 0.34)}`
      : 'none'
  };
};

const getEventNoteElementKey = (eventId, sourceId = ports.sourceSelection.selectedSource.value?.id) => (
  `${normalizeId(sourceId)}|${normalizeId(eventId)}`
);

const isEventNoteElementBeingEdited = (element) => (
  !ports.history.editorHistoryApplying
  && typeof document !== 'undefined'
  && document.activeElement === element
);

const setEventNoteElement = (eventId, element, sourceId = ports.sourceSelection.selectedSource.value?.id) => {
  const id = normalizeId(eventId);
  if (!id) return;
  const mapKey = getEventNoteElementKey(id, sourceId);
  if (!element) {
    eventNoteElementMap.delete(mapKey);
    return;
  }
  eventNoteElementMap.set(mapKey, element);
  if (isEventNoteElementBeingEdited(element)) return;
  const text = String(getEventNote(id, sourceId).text ?? '');
  if (ports.noteTokens.serializeEventNoteElement(element) !== text) ports.noteTokens.renderEventNoteContent(element, text);
};

const syncEventNoteElements = async () => {
  await nextTick();
  eventNoteElementMap.forEach((element, key) => {
    if (isEventNoteElementBeingEdited(element)) return;
    const separator = key.indexOf('|');
    const sourceId = key.slice(0, separator);
    const eventId = key.slice(separator + 1);
    const text = String(getEventNote(eventId, sourceId).text ?? '');
    if (ports.noteTokens.serializeEventNoteElement(element) !== text) ports.noteTokens.renderEventNoteContent(element, text);
  });
};

const onEventNoteInput = (eventId, event, sourceId = ports.sourceSelection.selectedSource.value?.id) => {
  const note = ensureEventNote(eventId, sourceId);
  if (!note) return;
  note.text = ports.noteTokens.serializeEventNoteElement(event?.currentTarget);
  ports.settingsPersistence.saveCoverTextSettings();
};

const onEventNoteBlur = (eventId, event, sourceId = ports.sourceSelection.selectedSource.value?.id) => {
  const note = ensureEventNote(eventId, sourceId);
  if (!note) return;
  note.text = ports.noteTokens.serializeEventNoteElement(event?.currentTarget);
  ports.noteTokens.renderEventNoteContent(event?.currentTarget, note.text);
  ports.settingsPersistence.saveCoverTextSettings();
};
const connectSpecialEventNoteSources = () => {
watch(
  () => ports.sourceSelection.normalizedSources.value.map((source) => (
    `${source.id}:${source.predictiveEvents.map((event) => normalizeId(event?.id)).filter(Boolean).join(',')}`
  )).join('|'),
  () => {
    syncEventNotesWithSources('single');
    syncEventNotesWithSources('multi');
    syncEventNoteElements();
    if (ports.history.editorHistoryReady) nextTick(ports.history.resetEditorHistory);
  },
  { immediate: true, flush: 'post' }
);
};
const connectSpecialEventNoteSelection = () => {
watch(
  ports.sourceSelection.selectedSourceId,
  () => {
    if (ports.textSettings.selectedCoverTextId.value.startsWith(EVENT_NOTE_ID_PREFIX)) {
      ports.textSettings.selectedEventNoteSourceId.value = ports.sourceSelection.selectedSourceId.value;
      if (!eventNotes.value[ports.textSettings.selectedEventNoteId.value]) {
        ports.textSettings.selectedCoverTextId.value = ALL_EVENT_NOTES_ID;
      }
    }
    ports.textSettings.allEventNotesDraft.value = {};
    syncEventNoteElements();
  },
  { flush: 'post' }
);
};
return { eventNotesByMode,
eventNotesBySource,
eventNoteElementMap,
eventNotes,
collectScopedMultiEventNotes,
bulkEditableEventNotes,
getManualCaseNoteSourceId,
hasManualCaseNoteSource,
getEventNote,
ensureEventNote,
syncEventNotesWithSources,
getEventNoteRenderStyle,
getEventNoteElementKey,
isEventNoteElementBeingEdited,
setEventNoteElement,
syncEventNoteElements,
onEventNoteInput,
onEventNoteBlur,
connectSpecialEventNoteSources,
connectSpecialEventNoteSelection };
}
