import { watch } from "vue";
import { createDefaultCreditTextStyle, createDefaultEventNote, COVER_TEXT_STORAGE_KEY, ALL_PAGE_CONFIG_KEY, GLOBAL_COVER_TEXT_ID } from './specialPredictionTextDefaults.js';
import { clampNumber, normalizeId } from './specialPredictionFormatters.js';

/** Owns special prediction settings persistence with explicit instance dependencies. */
export function useSpecialSettingsPersistence(ports = {}) {
let coverTextSettingsReady = false;

const normalizeCreditTextStyle = (value) => {
  const defaults = createDefaultCreditTextStyle();
  const source = value && typeof value === 'object' ? value : {};
  return {
    fontFamily: String(source.fontFamily || defaults.fontFamily),
    fontSize: clampNumber(source.fontSize, defaults.fontSize, 8, 96),
    color: String(source.color || defaults.color),
    shadowColor: String(source.shadowColor || ''),
    align: ['left', 'center', 'right'].includes(source.align) ? source.align : defaults.align,
    weight: Math.round(clampNumber(source.weight, defaults.weight, 100, 900) / 100) * 100,
    italic: !!source.italic,
    underline: !!source.underline,
    lineHeight: clampNumber(source.lineHeight, defaults.lineHeight, 0.8, 3),
    letterSpacing: clampNumber(source.letterSpacing, defaults.letterSpacing, -4, 20),
    opacity: clampNumber(source.opacity, defaults.opacity, 10, 100),
    shadowEnabled: source.shadowEnabled !== false
  };
};

const normalizeEventNote = (value, eventId) => {
  const defaults = createDefaultEventNote(eventId);
  const source = value && typeof value === 'object' ? value : {};
  return {
    id: defaults.id,
    name: defaults.name,
    text: String(source.text ?? ''),
    fontFamily: String(source.fontFamily || defaults.fontFamily),
    fontSize: clampNumber(source.fontSize, defaults.fontSize, 8, 96),
    color: String(source.color || defaults.color),
    shadowColor: String(source.shadowColor || ''),
    align: ['left', 'center', 'right'].includes(source.align) ? source.align : defaults.align,
    weight: Math.round(clampNumber(source.weight, defaults.weight, 100, 900) / 100) * 100,
    italic: !!source.italic,
    underline: !!source.underline,
    lineHeight: clampNumber(source.lineHeight, defaults.lineHeight, 0.8, 3),
    letterSpacing: clampNumber(source.letterSpacing, defaults.letterSpacing, -4, 20),
    opacity: clampNumber(source.opacity, defaults.opacity, 10, 100),
    shadowEnabled: source.shadowEnabled === true
  };
};

const removeLegacyNoteIconTriggerSpaces = (notesByMode) => {
  Object.values(notesByMode && typeof notesByMode === 'object' ? notesByMode : {}).forEach((notesBySource) => {
    Object.values(notesBySource && typeof notesBySource === 'object' ? notesBySource : {}).forEach((notes) => {
      Object.values(notes && typeof notes === 'object' ? notes : {}).forEach((note) => {
        if (typeof note?.text !== 'string') return;
        note.text = note.text.replace(/(\[\[sp-icon:(?:attr|char|unit):[^\]]+\]\])[ \t]/gu, '$1');
      });
    });
  });
};

const loadCoverTextSettings = () => {
  try {
    const raw = localStorage.getItem(COVER_TEXT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      ports.sourceSelection.predictionMode.value = parsed?.predictionMode === 'multi' ? 'multi' : 'single';
      if (Array.isArray(parsed?.multiSourceIds)) {
        ports.sourceSelection.multiSourceIds.value = parsed.multiSourceIds.map(normalizeId).filter(Boolean);
      }
      ports.manualCases.manualCaseEditsByEvent.value = ports.manualCases.normalizeManualCaseEdits(parsed?.manualCaseEditsByEvent);

      const legacyAppearance = ports.pageAppearance.normalizePageAppearance({
        blocks: parsed?.blocks,
        creditText: parsed?.creditText,
        creditManuallyEdited: typeof parsed?.creditManuallyEdited === 'boolean'
          ? parsed.creditManuallyEdited
          : !ports.credit.isDefaultCreditText(parsed?.creditText),
        monthFontFamily: parsed?.monthFontFamily,
        creditTextStyle: parsed?.creditTextStyle,
        monthColorName: parsed?.monthColorName,
        backgroundColorName: parsed?.backgroundColorName,
        customMonthColor: parsed?.customMonthColor,
        customBackgroundColor: parsed?.customBackgroundColor,
        coverBgAssetId: parsed?.coverBgAssetId,
        coverBgFileName: parsed?.coverBgFileName,
        coverBgOpacity: parsed?.coverBgOpacity
      });
      const legacyBaseAppearance = ports.pageAppearance.normalizePageAppearance(parsed?.allPageAppearance || legacyAppearance, legacyAppearance);
      ports.pageAppearance.singlePageAppearance.value = ports.pageAppearance.normalizePageAppearance(
        parsed?.singlePageAppearance || (ports.sourceSelection.predictionMode.value === 'single' ? legacyAppearance : legacyBaseAppearance),
        legacyAppearance
      );
      ports.pageAppearance.allPageAppearance.value = ports.pageAppearance.normalizePageAppearance(parsed?.allPageAppearance || legacyBaseAppearance, legacyBaseAppearance);
      ports.pageAppearance.pageAppearances.value = Object.fromEntries(
        Object.entries(parsed?.pageAppearances && typeof parsed.pageAppearances === 'object' ? parsed.pageAppearances : {})
          .map(([key, appearance]) => [normalizeId(key), ports.pageAppearance.normalizePageAppearance(appearance, ports.pageAppearance.allPageAppearance.value)])
          .filter(([key]) => key)
      );
      ports.pageAppearance.selectedPageConfigKey.value = normalizeId(parsed?.selectedPageConfigKey) || ALL_PAGE_CONFIG_KEY;

      const normalizeStoredNotes = (value) => Object.fromEntries(
        Object.entries(value && typeof value === 'object' ? value : {})
          .map(([sourceId, notes]) => [normalizeId(sourceId), notes && typeof notes === 'object' ? notes : {}])
          .filter(([sourceId]) => sourceId)
      );
      const legacyNotes = parsed?.eventNotesBySource && typeof parsed.eventNotesBySource === 'object'
        ? normalizeStoredNotes(parsed.eventNotesBySource)
        : (parsed?.eventNotes && typeof parsed.eventNotes === 'object' && ports.sourceSelection.selectedSource.value?.id
          ? { [ports.sourceSelection.selectedSource.value.id]: parsed.eventNotes }
          : {});
      const storedNotesByMode = parsed?.eventNotesByMode && typeof parsed.eventNotesByMode === 'object'
        ? parsed.eventNotesByMode
        : {};
      ports.eventNotes.eventNotesByMode.value = {
        single: normalizeStoredNotes(storedNotesByMode.single ?? ports.history.cloneEditorHistoryData(legacyNotes)),
        multi: normalizeStoredNotes(storedNotesByMode.multi ?? ports.history.cloneEditorHistoryData(legacyNotes))
      };
      if (parsed?.noteIconTriggerSpaceVersion !== ports.noteTokens.NOTE_ICON_TRIGGER_SPACE_VERSION) {
        removeLegacyNoteIconTriggerSpaces(ports.eventNotes.eventNotesByMode.value);
      }
    }
  } catch (error) {
    console.warn('[special-predict] failed to load cover text settings', error);
  } finally {
    const defaultAppearance = ports.pageAppearance.createDefaultPageAppearance();
    if (!ports.pageAppearance.singlePageAppearance.value) ports.pageAppearance.singlePageAppearance.value = ports.history.cloneEditorHistoryData(defaultAppearance);
    if (!ports.pageAppearance.allPageAppearance.value) ports.pageAppearance.allPageAppearance.value = ports.history.cloneEditorHistoryData(defaultAppearance);
    ports.eventNotes.syncEventNotesWithSources('single');
    ports.eventNotes.syncEventNotesWithSources('multi');
    const activeAppearance = ports.sourceSelection.isMultiCaseMode.value
      ? (ports.pageAppearance.selectedPageConfigKey.value === ALL_PAGE_CONFIG_KEY
        ? ports.pageAppearance.allPageAppearance.value
        : (ports.pageAppearance.pageAppearances.value[ports.pageAppearance.selectedPageConfigKey.value] || ports.pageAppearance.allPageAppearance.value))
      : ports.pageAppearance.singlePageAppearance.value;
    ports.pageAppearance.applyPageAppearance(activeAppearance);
    ports.textSettings.selectedCoverTextId.value = GLOBAL_COVER_TEXT_ID;
    ports.textSettings.selectedEventNoteSourceId.value = '';
    ports.coverText.syncCoverTextElements();
    ports.credit.syncCreditElement();
    ports.eventNotes.syncEventNoteElements();
    coverTextSettingsReady = true;
  }
};

const saveCoverTextSettings = () => {
  if (!coverTextSettingsReady) return;
  try {
    ports.pageAppearance.commitCurrentPageAppearance();
    localStorage.setItem(COVER_TEXT_STORAGE_KEY, JSON.stringify({
      predictionMode: ports.sourceSelection.predictionMode.value,
      multiSourceIds: ports.sourceSelection.multiSourceIds.value,
      selectedPageConfigKey: ports.pageAppearance.selectedPageConfigKey.value,
      singlePageAppearance: ports.pageAppearance.singlePageAppearance.value,
      allPageAppearance: ports.pageAppearance.allPageAppearance.value,
      pageAppearances: ports.pageAppearance.pageAppearances.value,
      selectedId: ports.textSettings.selectedCoverTextId.value,
      blocks: ports.textSettings.coverTextBlocks.value,
      creditText: ports.credit.creditText.value,
      creditManuallyEdited: ports.credit.creditManuallyEdited.value,
      monthColorName: ports.presentation.monthColorName.value,
      backgroundColorName: ports.presentation.backgroundColorName.value,
      customMonthColor: ports.presentation.customMonthColor.value,
      customBackgroundColor: ports.presentation.customBackgroundColor.value,
      monthFontFamily: ports.presentation.monthFontFamily.value,
      creditTextStyle: ports.credit.creditTextStyle.value,
      eventNotesByMode: ports.eventNotes.eventNotesByMode.value,
      eventNotesBySource: ports.eventNotes.eventNotesBySource.value,
      noteIconTriggerSpaceVersion: ports.noteTokens.NOTE_ICON_TRIGGER_SPACE_VERSION,
      manualCaseEditsByEvent: ports.manualCases.manualCaseEditsByEvent.value
    }));
  } catch (error) {
    console.warn('[special-predict] failed to save cover text settings', error);
  }
};
const connectSpecialSettingsPersistence = () => {
watch(
  [
    ports.sourceSelection.predictionMode,
    ports.sourceSelection.multiSourceIds,
    ports.textSettings.coverTextBlocks,
    ports.credit.creditText,
    ports.credit.creditManuallyEdited,
    ports.presentation.monthFontFamily,
    ports.credit.creditTextStyle,
    ports.eventNotes.eventNotesByMode,
    ports.manualCases.manualCaseEditsByEvent,
    ports.presentation.monthColorName,
    ports.presentation.backgroundColorName,
    ports.presentation.customMonthColor,
    ports.presentation.customBackgroundColor,
    ports.background.coverBgAssetId,
    ports.background.coverBgOpacity
  ],
  () => {
    saveCoverTextSettings();
    ports.history.scheduleEditorHistoryCapture();
    ports.preview.updatePreviewScale();
  },
  { deep: true }
);
};
return { get coverTextSettingsReady() { return coverTextSettingsReady; }, set coverTextSettingsReady(value) { coverTextSettingsReady = value; },
normalizeCreditTextStyle,
normalizeEventNote,
removeLegacyNoteIconTriggerSpaces,
loadCoverTextSettings,
saveCoverTextSettings,
connectSpecialSettingsPersistence };
}
