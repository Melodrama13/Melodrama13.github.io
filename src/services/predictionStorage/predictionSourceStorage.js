/**
 * Browser persistence for the application-owned prediction source refs.
 * Construction has no storage effects. Loading retains legacy migration and
 * assignment order; source writes are optional, username writes retain their
 * caller's original exception boundary. Raw prediction keys are never renamed.
 * @param {object} context Value refs and record normalization callbacks.
 * @returns {{loadPredictionSources: Function, persistPredictionSources: Function, persistPredictionUserName: Function}}
 */
export function createPredictionSourceStorage({
  predictionUserName,
  predictionEvents,
  predictionSources,
  activePredictionSourceId,
  normalizePredictionUserName,
  normalizePredictionSource,
  normalizePredictionSourceName,
  clonePredictionEvents,
  buildPredictionSourceId,
}) {
  const PREDICTION_SOURCES_STORAGE_KEY = 'pjsk_predict_sources_v1';

  const ACTIVE_PREDICTION_SOURCE_STORAGE_KEY = 'pjsk_predict_active_source_v1';

  const LEGACY_PREDICTION_EVENTS_STORAGE_KEY = 'pjsk_predict_data';

  const PREDICTION_USER_NAME_STORAGE_KEY = 'pjsk_predict_user_name_v1';

  const persistPredictionSources = () => {
    try {
      localStorage.setItem(PREDICTION_SOURCES_STORAGE_KEY, JSON.stringify(predictionSources.value));
      localStorage.setItem(ACTIVE_PREDICTION_SOURCE_STORAGE_KEY, String(activePredictionSourceId.value || ''));
    } catch {
      // Keep the in-memory prediction state even if storage is temporarily unavailable.
    }
  };

  const loadPredictionSources = () => {
    predictionUserName.value = normalizePredictionUserName(localStorage.getItem(PREDICTION_USER_NAME_STORAGE_KEY) || 'user');
    const rawSources = localStorage.getItem(PREDICTION_SOURCES_STORAGE_KEY);
    const rawActive = localStorage.getItem(ACTIVE_PREDICTION_SOURCE_STORAGE_KEY);
    let loadedSources = [];

    if (rawSources) {
      const parsed = JSON.parse(rawSources);
      if (Array.isArray(parsed)) {
        loadedSources = parsed.map((item, idx) => normalizePredictionSource(item, idx));
      }
    }

    // 兼容旧版单数据源缓存
    if (!loadedSources.length) {
      const legacyRaw = localStorage.getItem(LEGACY_PREDICTION_EVENTS_STORAGE_KEY);
      let legacyList = [];
      if (legacyRaw) {
        try {
          const parsedLegacy = JSON.parse(legacyRaw);
          legacyList = Array.isArray(parsedLegacy) ? parsedLegacy : [];
        } catch {
          legacyList = [];
        }
      }
      const nowIso = new Date().toISOString();
      loadedSources = [{
        id: buildPredictionSourceId(),
        name: `我的预测-${predictionUserName.value}-1`,
        kind: 'local',
        ownerName: predictionUserName.value,
        predictiveEvents: clonePredictionEvents(legacyList),
        createdAt: nowIso,
        updatedAt: nowIso
      }];
    }

    // 名称去重
    const dedupNameSet = new Set();
    loadedSources = loadedSources.map((source, idx) => {
      let name = normalizePredictionSourceName(source.name || `我的预测 ${idx + 1}`);
      if (dedupNameSet.has(name)) {
        let i = 2;
        while (dedupNameSet.has(`${name} ${i}`)) i += 1;
        name = `${name} ${i}`;
      }
      dedupNameSet.add(name);
      return { ...source, name };
    });

    predictionSources.value = loadedSources;
    const activeId = loadedSources.some((s) => s.id === rawActive) ? rawActive : loadedSources[0].id;
    activePredictionSourceId.value = activeId;
    predictionEvents.value = clonePredictionEvents((loadedSources.find((s) => s.id === activeId) || loadedSources[0]).predictiveEvents);
    persistPredictionSources();
  };

  const persistPredictionUserName = (userName) => {
    localStorage.setItem(PREDICTION_USER_NAME_STORAGE_KEY, userName);
  };

  return { loadPredictionSources, persistPredictionSources, persistPredictionUserName };
}
