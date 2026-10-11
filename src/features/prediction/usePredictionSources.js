import { ref, computed } from 'vue';
import { createPredictionSourceStorage } from '../../services/predictionStorage/predictionSourceStorage.js';

/**
 * One prediction-source state per application instance. App owns UI prompts,
 * canonical event migration and watch timing; it consumes these exact refs.
 * Record helpers retain deep copying, source serials and existing fallbacks.
 * @returns {object} Writable refs, derived source views and named record/storage actions.
 */
export function usePredictionSources() {
  const predictionUserName = ref('user');

  const predictionEvents = ref([]);

  const predictionSources = ref([]);

  const activePredictionSourceId = ref('');

  const clonePredictionEvents = (list) => JSON.parse(JSON.stringify(Array.isArray(list) ? list : []));

  const buildPredictionSourceId = () => {
    const rand = Math.random().toString(36).slice(2, 8);
    return `src_${Date.now()}_${rand}`;
  };

  const normalizePredictionUserName = (name) => {
    const compact = String(name || '').trim().replace(/\s+/g, '');
    return compact || 'user';
  };

  const escapeRegExp = (text) => String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const detectPredictionSourceKind = (kindRaw, nameRaw) => {
    const kind = String(kindRaw || '').trim();
    if (kind === 'import' || kind === 'local') return kind;
    const name = String(nameRaw || '').trim();
    if (name.startsWith('导入预测-')) return 'import';
    return 'local';
  };

  const PREDICTION_SOURCE_NAME_PREFIX_BY_KIND = {
    local: '我的预测',
    import: '导入预测'
  };

  const getPredictionSourceNamePrefix = (kind) => PREDICTION_SOURCE_NAME_PREFIX_BY_KIND[kind] || PREDICTION_SOURCE_NAME_PREFIX_BY_KIND.local;

  const getNextPredictionSourceSerial = (kind, ownerName) => {
    const prefix = getPredictionSourceNamePrefix(kind);
    const owner = normalizePredictionUserName(ownerName);
    const pattern = new RegExp(`^${escapeRegExp(prefix)}-${escapeRegExp(owner)}-(\\d+)$`);
    let maxNo = 0;
    for (const source of (predictionSources.value || [])) {
      const match = String(source?.name || '').trim().match(pattern);
      if (!match) continue;
      const seq = Number(match[1]);
      if (Number.isFinite(seq)) maxNo = Math.max(maxNo, seq);
    }
    return maxNo + 1;
  };

  const buildAutoPredictionSourceName = (kind, ownerName) => {
    const prefix = getPredictionSourceNamePrefix(kind);
    const owner = normalizePredictionUserName(ownerName);
    const serial = getNextPredictionSourceSerial(kind, owner);
    return `${prefix}-${owner}-${serial}`;
  };

  const normalizePredictionSourceName = (name) => String(name || '').trim() || '我的预测';

  const makeUniquePredictionSourceName = (desiredName) => {
    const base = normalizePredictionSourceName(desiredName);
    const existing = new Set((predictionSources.value || []).map((s) => String(s?.name || '').trim()));
    if (!existing.has(base)) return base;
    for (let i = 2; i <= 999; i += 1) {
      const nextName = `${base} ${i}`;
      if (!existing.has(nextName)) return nextName;
    }
    return `${base} ${Date.now()}`;
  };

  const normalizePredictionSource = (source, index = 0) => {
    const id = String(source?.id || '').trim() || buildPredictionSourceId();
    const kind = detectPredictionSourceKind(source?.kind, source?.name);
    const ownerName = normalizePredictionUserName(source?.ownerName || predictionUserName.value);
    const fallbackName = `${getPredictionSourceNamePrefix(kind)}-${ownerName}-${index + 1}`;
    const nameRaw = normalizePredictionSourceName(source?.name || fallbackName);
    return {
      id,
      name: nameRaw,
      kind,
      ownerName,
      predictiveEvents: clonePredictionEvents(source?.predictiveEvents),
      createdAt: String(source?.createdAt || new Date().toISOString()),
      updatedAt: String(source?.updatedAt || new Date().toISOString())
    };
  };

  const isLocalPredictionSource = (source) => detectPredictionSourceKind(source?.kind, source?.name) === 'local';

  const relabelLocalPredictionSourcesByUser = (userName) => {
    const normalizedUser = normalizePredictionUserName(userName);
    let localSeq = 0;
    predictionSources.value = (predictionSources.value || []).map((source) => {
      if (!isLocalPredictionSource(source)) return source;
      localSeq += 1;
      return {
        ...source,
        ownerName: normalizedUser,
        name: `${PREDICTION_SOURCE_NAME_PREFIX_BY_KIND.local}-${normalizedUser}-${localSeq}`,
        updatedAt: new Date().toISOString()
      };
    });
  };

  const syncPredictionEventsToActiveSource = () => {
    const target = activePredictionSource.value;
    if (!target) return;
    target.predictiveEvents = clonePredictionEvents(predictionEvents.value);
    target.updatedAt = new Date().toISOString();
    persistPredictionSources();
  };

  const activePredictionSource = computed(() => {
    return (predictionSources.value || []).find((s) => s.id === activePredictionSourceId.value) || null;
  });

  const activePredictionSourceName = computed(() => activePredictionSource.value?.name || '未命名数据源');

  const activePredictionSourceEventCount = computed(() => {
    const list = activePredictionSource.value?.predictiveEvents;
    return Array.isArray(list) ? list.length : 0;
  });

  const canCloneActivePredictionSource = computed(() => activePredictionSourceEventCount.value > 0);

  const { loadPredictionSources, persistPredictionSources, persistPredictionUserName } = createPredictionSourceStorage({
    predictionUserName,
    predictionEvents,
    predictionSources,
    activePredictionSourceId,
    normalizePredictionUserName,
    normalizePredictionSource,
    normalizePredictionSourceName,
    clonePredictionEvents,
    buildPredictionSourceId,
  });

  return {
    predictionUserName,
    predictionEvents,
    predictionSources,
    activePredictionSourceId,
    activePredictionSource,
    activePredictionSourceName,
    activePredictionSourceEventCount,
    canCloneActivePredictionSource,
    clonePredictionEvents,
    buildPredictionSourceId,
    normalizePredictionUserName,
    detectPredictionSourceKind,
    buildAutoPredictionSourceName,
    makeUniquePredictionSourceName,
    relabelLocalPredictionSourcesByUser,
    syncPredictionEventsToActiveSource,
    persistPredictionSources,
    loadPredictionSources,
    persistPredictionUserName,
  };
}
