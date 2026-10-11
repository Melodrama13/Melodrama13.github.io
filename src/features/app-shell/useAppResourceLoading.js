import { createPublicDataRepository } from "../../services/publicData/publicDataRepository.js";
import { validatePredictionScheduleOrderEvents } from "../../domain/predictionScheduleKeys.js";
import { ref, shallowRef, onMounted, nextTick } from "vue";
import { collectSmallStaticImageUrls, getCommonSmallStaticImageUrls, installSmallStaticImageWarmupObserver, scheduleImageWarmup } from "../../utils/assets.js";

/** Owns application resource loading with per-instance state and explicit peer interfaces. */
export function useAppResourceLoading(ports = {}) {
let cancelSmallImageWarmup = null;

let stopSmallImageWarmupObserver = null;

let cancelScheduledPublicDataCacheWrite = null;

const scheduleSmallStaticImageWarmup = async () => {
  if (typeof document === 'undefined') return;
  await nextTick();

  const root = document.body;
  const mobileLike = ports.versionUpdates.isMobileLikeViewport();
  const urls = [
    ...getCommonSmallStaticImageUrls({ characters: charactersData.value }),
    ...collectSmallStaticImageUrls(root)
  ];

  if (typeof cancelSmallImageWarmup === 'function') cancelSmallImageWarmup();
  cancelSmallImageWarmup = scheduleImageWarmup(urls, {
    concurrency: mobileLike ? 3 : 5,
    timeoutMs: mobileLike ? 10000 : 7000,
    smallOnly: true
  });

  if (!stopSmallImageWarmupObserver) {
    stopSmallImageWarmupObserver = installSmallStaticImageWarmupObserver(root, {
      concurrency: mobileLike ? 2 : 3,
      timeoutMs: mobileLike ? 10000 : 7000
    });
  }
};

const historyData = shallowRef([]);

const predictionScheduleOrder = shallowRef(null);

const baseCards = shallowRef([]);

const songsData = shallowRef([]);

const charactersData = shallowRef([]);

const nuigurumiData = shallowRef([]);

const isAppDataReady = ref(false);

const appDataLoadFailed = ref(false);

const {
  buildPublicDataCacheName,
  buildVersionedPublicDataUrl,
  readPublicDataCacheMeta,
  writePublicDataCacheMeta,
  getPublicDataCache,
  readPublicDataTextsFromCache,
  readCachedPublicDataTexts,
  arePublicDataTextsEqual,
  cleanupLegacyPublicDataLocalStorageCache,
  cleanupOldPublicDataCaches,
  writePublicDataCache,
  fetchPublicDataTexts,
  parsePublicDataTexts,
} = createPublicDataRepository({
  dataVersion: ports.versionUpdates.currentPublicDataVersion,
  isDevelopment: ports.versionUpdates.isLocalDev,
  updateKind: ports.versionUpdates.currentAppUpdateKind
});

const applyLoadedAppData = (loadedData) => {
  if (!loadedData) return;
  validatePredictionScheduleOrderEvents(loadedData.events, loadedData.predictionOrder);
  predictionScheduleOrder.value = loadedData.predictionOrder;
  historyData.value = Array.isArray(loadedData.events) ? loadedData.events : [];
  baseCards.value = Array.isArray(loadedData.cards) ? loadedData.cards : [];
  songsData.value = Array.isArray(loadedData.songs) ? loadedData.songs : [];
  charactersData.value = Array.isArray(loadedData.characters) ? loadedData.characters : [];
  nuigurumiData.value = Array.isArray(loadedData.nuigurumi) ? loadedData.nuigurumi : [];
  isAppDataReady.value = true;
  appDataLoadFailed.value = false;
  void scheduleSmallStaticImageWarmup();
  ports.statsControls.scheduleStatsTopControlStateSync();
};

const schedulePublicDataCacheWrite = (resourceTexts) => {
  if (ports.versionUpdates.isLocalDev || !resourceTexts || typeof window === 'undefined') return;
  if (typeof cancelScheduledPublicDataCacheWrite === 'function') {
    cancelScheduledPublicDataCacheWrite();
  }

  const writeWhenIdle = () => {
    cancelScheduledPublicDataCacheWrite = null;
    void writePublicDataCache(resourceTexts);
  };

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(writeWhenIdle, { timeout: 1800 });
    cancelScheduledPublicDataCacheWrite = () => window.cancelIdleCallback?.(idleId);
    return;
  }

  const timer = window.setTimeout(writeWhenIdle, 450);
  cancelScheduledPublicDataCacheWrite = () => window.clearTimeout(timer);
};
const connectAppResourceMount = () => {
onMounted(async () => {
  try {
    ports.predictionSources.loadPredictionSources();

    // Resource snapshots include the order and must validate before storage cleanup.
    cleanupLegacyPublicDataLocalStorageCache();

    const cachedPublicData = await readCachedPublicDataTexts();
    let cachedPublicDataTexts = null;
    if (cachedPublicData?.texts) {
      try {
        applyLoadedAppData(parsePublicDataTexts(cachedPublicData.texts));
        cachedPublicDataTexts = cachedPublicData.texts;
      } catch (error) {
        // Old/corrupt cache entries are not evidence that predictions were canceled.
        console.warn('忽略无效资源缓存，重新加载最新资料:', error);
      }
    }

    // A code-only release keeps the same publicDataVersion. Once that exact
    // version is already in Cache API, fetching and writing the same JSON again
    // only delays updates on slower mobile connections.
    if (cachedPublicDataTexts && cachedPublicData.isCurrentVersion) {
      ports.predictionSources.sanitizeLoadedPredictSources();
      console.log("数据从当前版本缓存加载成功:", historyData.value.length, "条活动,", baseCards.value.length, "张卡片");
      return;
    }

    const publicDataTexts = await fetchPublicDataTexts();
    if (!arePublicDataTextsEqual(cachedPublicDataTexts, publicDataTexts)) {
      const loadedPublicData = parsePublicDataTexts(publicDataTexts);
      applyLoadedAppData(loadedPublicData);
    }
    ports.predictionSources.sanitizeLoadedPredictSources();
    schedulePublicDataCacheWrite(publicDataTexts);

    console.log("数据加载成功:", historyData.value.length, "条活动,", baseCards.value.length, "张卡片");
  } catch (e) {
    if (!isAppDataReady.value) {
      appDataLoadFailed.value = true;
    }
    console.error("加载失败:", e);
  }
});
};
return {
get cancelSmallImageWarmup() { return cancelSmallImageWarmup; }, set cancelSmallImageWarmup(value) { cancelSmallImageWarmup = value; },
get stopSmallImageWarmupObserver() { return stopSmallImageWarmupObserver; }, set stopSmallImageWarmupObserver(value) { stopSmallImageWarmupObserver = value; },
get cancelScheduledPublicDataCacheWrite() { return cancelScheduledPublicDataCacheWrite; }, set cancelScheduledPublicDataCacheWrite(value) { cancelScheduledPublicDataCacheWrite = value; },
scheduleSmallStaticImageWarmup,
historyData,
predictionScheduleOrder,
baseCards,
songsData,
charactersData,
nuigurumiData,
isAppDataReady,
appDataLoadFailed,
buildPublicDataCacheName,
buildVersionedPublicDataUrl,
readPublicDataCacheMeta,
writePublicDataCacheMeta,
getPublicDataCache,
readPublicDataTextsFromCache,
readCachedPublicDataTexts,
arePublicDataTextsEqual,
cleanupLegacyPublicDataLocalStorageCache,
cleanupOldPublicDataCaches,
writePublicDataCache,
fetchPublicDataTexts,
parsePublicDataTexts,
applyLoadedAppData,
schedulePublicDataCacheWrite,
connectAppResourceMount
};
}
