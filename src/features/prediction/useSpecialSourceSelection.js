import { computed, ref, watch } from "vue";
import { normalizeId } from './specialPredictionFormatters.js';
import { GLOBAL_COVER_TEXT_ID, ALL_PAGE_CONFIG_KEY } from './specialPredictionTextDefaults.js';

/** Owns special prediction source selection with explicit instance dependencies. */
export function useSpecialSourceSelection(ports = {}) {
const predictionMode = ref('single');

const selectedSourceId = ref('');

const multiSourceIds = ref([]);

const multiSourceListOpen = ref(false);

const normalizedSources = computed(() => (Array.isArray(ports.props.predictSources) ? ports.props.predictSources : [])
  .map((source, index) => ({
    id: normalizeId(source?.id) || `source-${index}`,
    name: String(source?.name || `数据源 ${index + 1}`).trim() || `数据源 ${index + 1}`,
    predictiveEvents: Array.isArray(source?.predictiveEvents) ? source.predictiveEvents : []
  })));

const selectedSource = computed(() => normalizedSources.value.find((source) => source.id === selectedSourceId.value) || normalizedSources.value[0] || null);

const isMultiCaseMode = computed(() => predictionMode.value === 'multi');

const selectedMultiSources = computed(() => multiSourceIds.value
  .map((id) => normalizedSources.value.find((source) => source.id === id))
  .filter(Boolean));

const activeCaseSources = computed(() => (
  isMultiCaseMode.value
    ? selectedMultiSources.value
    : (selectedSource.value ? [selectedSource.value] : [])
));

const setPredictionMode = async (mode) => {
  const nextMode = mode === 'multi' ? 'multi' : 'single';
  if (nextMode === predictionMode.value) return;
  ports.history.commitPendingEditorHistory();
  ports.pageAppearance.commitCurrentPageAppearance();
  predictionMode.value = nextMode;
  if (nextMode === 'multi' && multiSourceIds.value.length === 0) {
    const preferred = selectedSource.value?.id || normalizedSources.value[0]?.id;
    const second = normalizedSources.value.find((source) => source.id !== preferred)?.id;
    multiSourceIds.value = [preferred, second].filter(Boolean);
  }
  if (nextMode === 'multi') multiSourceListOpen.value = true;
  ports.textSettings.selectedCoverTextId.value = GLOBAL_COVER_TEXT_ID;
  ports.textSettings.selectedEventNoteSourceId.value = '';
  ports.textSettings.globalTextDraft.value = {};
  ports.textSettings.allEventNotesDraft.value = {};
  ports.eventNotes.syncEventNotesWithSources(nextMode);
  const nextAppearance = nextMode === 'single'
    ? ports.pageAppearance.singlePageAppearance.value
    : (ports.pageAppearance.selectedPageConfigKey.value === ALL_PAGE_CONFIG_KEY
      ? ports.pageAppearance.allPageAppearance.value
      : (ports.pageAppearance.pageAppearances.value[ports.pageAppearance.selectedPageConfigKey.value] || ports.pageAppearance.allPageAppearance.value));
  ports.pageAppearance.applyPageAppearance(nextAppearance || ports.pageAppearance.createDefaultPageAppearance());
  await Promise.all([
    ports.coverText.syncCoverTextElements(),
    ports.credit.syncCreditElement(),
    ports.eventNotes.syncEventNoteElements()
  ]);
  ports.preview.updatePreviewScale();
  ports.settingsPersistence.saveCoverTextSettings();
};

const getMultiSourceOrder = (sourceId) => {
  const index = multiSourceIds.value.indexOf(normalizeId(sourceId));
  return index >= 0 ? index + 1 : 0;
};

const toggleMultiCaseSource = (sourceId) => {
  const id = normalizeId(sourceId);
  if (!id) return;
  if (multiSourceIds.value.includes(id)) {
    multiSourceIds.value = multiSourceIds.value.filter((item) => item !== id);
  } else if (normalizedSources.value.some((source) => source.id === id)) {
    multiSourceIds.value = [...multiSourceIds.value, id];
  }
};

const selectedSourceName = computed(() => String(selectedSource.value?.name || '').trim() || '未知用户');
const connectSpecialSourceSelection = () => {
watch(
  () => [ports.props.activePredictSourceId, normalizedSources.value.map((source) => source.id).join('|')],
  () => {
    const activeId = normalizeId(ports.props.activePredictSourceId);
    const exists = normalizedSources.value.some((source) => source.id === selectedSourceId.value);
    if (!exists) {
      selectedSourceId.value = normalizedSources.value.some((source) => source.id === activeId)
        ? activeId
        : (normalizedSources.value[0]?.id || '');
    }
    const validIds = new Set(normalizedSources.value.map((source) => source.id));
    multiSourceIds.value = multiSourceIds.value.filter((id) => validIds.has(id));
  },
  { immediate: true }
);
};
return { predictionMode,
selectedSourceId,
multiSourceIds,
multiSourceListOpen,
normalizedSources,
selectedSource,
isMultiCaseMode,
selectedMultiSources,
activeCaseSources,
setPredictionMode,
getMultiSourceOrder,
toggleMultiCaseSource,
selectedSourceName,
connectSpecialSourceSelection };
}
