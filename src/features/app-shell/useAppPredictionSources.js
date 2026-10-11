import { usePredictionSources } from "../prediction/usePredictionSources.js";
import { ref, watch } from "vue";

/** Owns application prediction sources with per-instance state and explicit peer interfaces. */
export function useAppPredictionSources(ports = {}) {
const {
  predictionUserName: predictUserName,
  predictionEvents: predictiveEvents,
  predictionSources: predictSources,
  activePredictionSourceId: activePredictSourceId,
  activePredictionSource: activePredictSource,
  activePredictionSourceName: activePredictSourceName,
  activePredictionSourceEventCount: activePredictSourcePredictCount,
  canCloneActivePredictionSource: canCloneActivePredictSource,
  clonePredictionEvents: clonePredictList,
  buildPredictionSourceId: buildPredictSourceId,
  normalizePredictionUserName: normalizeUserName,
  detectPredictionSourceKind: detectSourceKind,
  buildAutoPredictionSourceName: buildAutoSourceName,
  makeUniquePredictionSourceName: makeUniqueSourceName,
  relabelLocalPredictionSourcesByUser: relabelLocalSourcesByUser,
  syncPredictionEventsToActiveSource: syncCurrentPredictsToActiveSource,
  persistPredictionSources: persistPredictSources,
  loadPredictionSources,
  persistPredictionUserName
} = usePredictionSources();

let cleanupNoticeTimer = null;

const PREDICT_SOURCE_LIMIT = 30;

const cleanedPatchNoticeCount = ref(0);

const setCleanedPatchNoticeCount = (count, autoHideMs = 0) => {
  cleanedPatchNoticeCount.value = Math.max(0, Number(count) || 0);
  if (cleanupNoticeTimer) {
    clearTimeout(cleanupNoticeTimer);
    cleanupNoticeTimer = null;
  }
  if (cleanedPatchNoticeCount.value > 0 && autoHideMs > 0) {
    cleanupNoticeTimer = setTimeout(() => {
      cleanedPatchNoticeCount.value = 0;
      cleanupNoticeTimer = null;
    }, autoHideMs);
  }
};

const switchPredictSource = (sourceId) => {
  const next = (predictSources.value || []).find((s) => s.id === sourceId);
  if (!next) return;
  syncCurrentPredictsToActiveSource();
  activePredictSourceId.value = next.id;
  if ((ports.resourceLoading.historyData.value || []).length) {
    const canonical = ports.predictionSchedule.sanitizeCanonicalPredictiveEvents(next.predictiveEvents);
    next.predictiveEvents = clonePredictList(canonical);
    next.updatedAt = new Date().toISOString();
  }
  predictiveEvents.value = clonePredictList(next.predictiveEvents);
  setCleanedPatchNoticeCount(0);
  persistPredictSources();
};

const createPredictSource = ({ name, predictiveList = [], kind = 'local', ownerName = '', switchTo = true }) => {
  if ((predictSources.value || []).length >= PREDICT_SOURCE_LIMIT) {
    alert(`数据源数量已达到上限（${PREDICT_SOURCE_LIMIT}）。请先删除不需要的数据源。`);
    return null;
  }

  const normalizedKind = detectSourceKind(kind, name);
  const normalizedOwner = normalizeUserName(ownerName || predictUserName.value);
  const nowIso = new Date().toISOString();
  const source = {
    id: buildPredictSourceId(),
    name: makeUniqueSourceName(name || buildAutoSourceName(normalizedKind, normalizedOwner)),
    kind: normalizedKind,
    ownerName: normalizedOwner,
    predictiveEvents: clonePredictList(predictiveList),
    createdAt: nowIso,
    updatedAt: nowIso
  };
  predictSources.value = [...predictSources.value, source];
  if (switchTo) {
    activePredictSourceId.value = source.id;
    predictiveEvents.value = clonePredictList(source.predictiveEvents);
  }
  persistPredictSources();
  return source;
};

const sanitizeLoadedPredictSources = () => {
  if (!(ports.resourceLoading.historyData.value || []).length) return;

  let activeCleanedCount = 0;
  predictSources.value = (predictSources.value || []).map((source) => {
    const beforeList = Array.isArray(source?.predictiveEvents) ? source.predictiveEvents : [];
    const canonical = ports.predictionSchedule.sanitizeCanonicalPredictiveEvents(beforeList);
    if (source.id === activePredictSourceId.value) {
      activeCleanedCount = Math.max(0, beforeList.length - canonical.length);
    }
    return {
      ...source,
      predictiveEvents: clonePredictList(canonical)
    };
  });

  const activeSourceAfterMigration = activePredictSource.value || predictSources.value[0] || null;
  if (activeSourceAfterMigration) {
    activePredictSourceId.value = activeSourceAfterMigration.id;
    predictiveEvents.value = clonePredictList(activeSourceAfterMigration.predictiveEvents);
  } else {
    predictiveEvents.value = [];
  }
  persistPredictSources();
  setCleanedPatchNoticeCount(activeCleanedCount, 4200);
};
const connectAppPredictionPersistence = () => {
watch(predictiveEvents, (newVal) => {
  void newVal;
  syncCurrentPredictsToActiveSource();
}, { deep: true });
};
const connectAppPredictionUserName = () => {
watch(predictUserName, (newVal) => {
  const compact = String(newVal || '').replace(/\s+/g, '');
  persistPredictionUserName(compact);
  if (!compact || ports.sourceMenu.isEditingPredictUserName.value) return;
  relabelLocalSourcesByUser(compact);
  persistPredictSources();
});
};
return {
predictUserName,
predictiveEvents,
predictSources,
activePredictSourceId,
activePredictSource,
activePredictSourceName,
activePredictSourcePredictCount,
canCloneActivePredictSource,
clonePredictList,
buildPredictSourceId,
normalizeUserName,
detectSourceKind,
buildAutoSourceName,
makeUniqueSourceName,
relabelLocalSourcesByUser,
syncCurrentPredictsToActiveSource,
persistPredictSources,
loadPredictionSources,
persistPredictionUserName,
get cleanupNoticeTimer() { return cleanupNoticeTimer; }, set cleanupNoticeTimer(value) { cleanupNoticeTimer = value; },
PREDICT_SOURCE_LIMIT,
cleanedPatchNoticeCount,
setCleanedPatchNoticeCount,
switchPredictSource,
createPredictSource,
sanitizeLoadedPredictSources,
connectAppPredictionPersistence,
connectAppPredictionUserName
};
}
