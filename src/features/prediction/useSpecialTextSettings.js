import { computed, ref, watch } from "vue";
import { GLOBAL_COVER_TEXT_ID, createDefaultCoverTextBlocks, PREDICTOR_TEXT_ID, ALL_EVENT_NOTES_ID, EVENT_NOTE_ID_PREFIX, GLOBAL_TEXT_STYLE_KEYS, createDefaultEventNote, EVENT_NOTE_STYLE_KEYS } from './specialPredictionTextDefaults.js';

/** Owns special prediction text settings with explicit instance dependencies. */
export function useSpecialTextSettings(ports = {}) {
const selectedCoverTextId = ref(GLOBAL_COVER_TEXT_ID);

const selectedEventNoteSourceId = ref('');

const coverTextBlocks = ref(createDefaultCoverTextBlocks());

const globalTextDraft = ref({});

const allEventNotesDraft = ref({});

const selectedCoverTextBlock = computed(() => (
  coverTextBlocks.value.find((block) => block.id === selectedCoverTextId.value)
  || null
));

const isGlobalTextMode = computed(() => selectedCoverTextId.value === GLOBAL_COVER_TEXT_ID);

const isPredictorTextMode = computed(() => selectedCoverTextId.value === PREDICTOR_TEXT_ID);

const isAllEventNotesMode = computed(() => selectedCoverTextId.value === ALL_EVENT_NOTES_ID);

const selectedEventNoteId = computed(() => (
  selectedCoverTextId.value.startsWith(EVENT_NOTE_ID_PREFIX)
    ? selectedCoverTextId.value.slice(EVENT_NOTE_ID_PREFIX.length)
    : ''
));

const selectedEventNote = computed(() => (
  selectedEventNoteId.value
    ? (ports.eventNotes.eventNotesBySource.value[selectedEventNoteSourceId.value || ports.sourceSelection.selectedSource.value?.id]?.[selectedEventNoteId.value] || null)
    : null
));

const isEventNoteMode = computed(() => !!selectedEventNote.value);

const isAnyEventNoteMode = computed(() => isAllEventNotesMode.value || isEventNoteMode.value);

const isFixedTextMode = computed(() => isPredictorTextMode.value || isAnyEventNoteMode.value);

const getCommonCoverTextProperty = (property) => {
  const blocks = coverTextBlocks.value;
  if (blocks.length === 0) return '';
  const firstValue = blocks[0]?.[property];
  return blocks.every((block) => Object.is(block?.[property], firstValue)) ? firstValue : '';
};

const isGlobalTextPropertyMixed = (property) => {
  if (isAllEventNotesMode.value) {
    const notes = ports.eventNotes.bulkEditableEventNotes.value;
    if (notes.length <= 1) return false;
    const firstValue = notes[0]?.[property];
    return notes.some((note) => !Object.is(note?.[property], firstValue));
  }
  if (!isGlobalTextMode.value || coverTextBlocks.value.length <= 1) return false;
  const firstValue = coverTextBlocks.value[0]?.[property];
  return coverTextBlocks.value.some((block) => !Object.is(block?.[property], firstValue));
};

const applyGlobalTextProperty = (property, value) => {
  if (!GLOBAL_TEXT_STYLE_KEYS.includes(property)) return;
  coverTextBlocks.value.forEach((block) => {
    block[property] = value;
  });
  if (property === 'fontFamily') ports.presentation.monthFontFamily.value = value;
  if (Object.prototype.hasOwnProperty.call(ports.credit.creditTextStyle.value, property)) {
    ports.credit.creditTextStyle.value[property] = value;
  }
};

const globalTextSettingsProxy = new Proxy({}, {
  get: (_target, property) => {
    if (typeof property !== 'string') return undefined;
    if (Object.prototype.hasOwnProperty.call(globalTextDraft.value, property)) {
      return globalTextDraft.value[property];
    }
    return getCommonCoverTextProperty(property);
  },
  set: (_target, property, value) => {
    if (typeof property !== 'string' || !GLOBAL_TEXT_STYLE_KEYS.includes(property)) return true;
    if (value === '' && property !== 'shadowColor') {
      globalTextDraft.value[property] = '';
      return true;
    }
    delete globalTextDraft.value[property];
    applyGlobalTextProperty(property, value);
    return true;
  }
});

const getCommonEventNoteProperty = (property) => {
  const notes = ports.eventNotes.bulkEditableEventNotes.value;
  if (notes.length === 0) return createDefaultEventNote('')[property] ?? '';
  const firstValue = notes[0]?.[property];
  return notes.every((note) => Object.is(note?.[property], firstValue)) ? firstValue : '';
};

const allEventNotesSettingsProxy = new Proxy({}, {
  get: (_target, property) => {
    if (typeof property !== 'string') return undefined;
    if (Object.prototype.hasOwnProperty.call(allEventNotesDraft.value, property)) {
      return allEventNotesDraft.value[property];
    }
    return getCommonEventNoteProperty(property);
  },
  set: (_target, property, value) => {
    if (typeof property !== 'string' || !EVENT_NOTE_STYLE_KEYS.includes(property)) return true;
    if (value === '' && property !== 'shadowColor') {
      allEventNotesDraft.value[property] = '';
      return true;
    }
    delete allEventNotesDraft.value[property];
    ports.eventNotes.bulkEditableEventNotes.value.forEach((note) => {
      note[property] = value;
    });
    return true;
  }
});

const editorCoverTextSettings = computed(() => {
  if (isGlobalTextMode.value) return globalTextSettingsProxy;
  if (isPredictorTextMode.value) return ports.credit.creditTextStyle.value;
  if (isAllEventNotesMode.value) return allEventNotesSettingsProxy;
  if (isEventNoteMode.value) return selectedEventNote.value;
  return selectedCoverTextBlock.value;
});

const editorShadowColorFallback = computed(() => (
  isAnyEventNoteMode.value
    ? String(editorCoverTextSettings.value?.color || '#334155')
    : ports.presentation.selectedMonthColor.value
));
const connectSpecialTextSelection = () => {
watch(
  selectedCoverTextId,
  () => {
    globalTextDraft.value = {};
    allEventNotesDraft.value = {};
  }
);
};
return { selectedCoverTextId,
selectedEventNoteSourceId,
coverTextBlocks,
globalTextDraft,
allEventNotesDraft,
selectedCoverTextBlock,
isGlobalTextMode,
isPredictorTextMode,
isAllEventNotesMode,
selectedEventNoteId,
selectedEventNote,
isEventNoteMode,
isAnyEventNoteMode,
isFixedTextMode,
getCommonCoverTextProperty,
isGlobalTextPropertyMixed,
applyGlobalTextProperty,
globalTextSettingsProxy,
getCommonEventNoteProperty,
allEventNotesSettingsProxy,
editorCoverTextSettings,
editorShadowColorFallback,
connectSpecialTextSelection };
}
