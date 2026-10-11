/**
 * Public JSON transport and versioned browser cache. This service never owns
 * Vue state, prediction storage, idle scheduling or UI callbacks. Constructing
 * a repository does not touch browser APIs; each instance keeps its fixed
 * release context and operations retain the existing optional-cache failures.
 *
 * @param {object} configuration
 * @param {string} configuration.dataVersion Exact deployed resource version.
 * @param {boolean} configuration.isDevelopment Use uncached development fetches.
 * @param {'code'|'resource'} configuration.updateKind Controls stale-cache fallback.
 * @returns {object} Named raw-text, cache, fetch and parse operations. Raw JSON
 * values and ID types are preserved; array validation belongs to the caller.
 */
export function createPublicDataRepository({ dataVersion, isDevelopment, updateKind }) {
  const currentPublicDataVersion = dataVersion;
  const isLocalDev = isDevelopment;
  const currentAppUpdateKind = updateKind;

  const LEGACY_DATA_LOCAL_STORAGE_CACHE_PREFIX = 'pjsk_public_data_cache_v1';

  const DATA_CACHE_PREFIX = 'pjsk_public_data_cache_v2';

  const DATA_CACHE_META_KEY = 'pjsk_public_data_cache_meta_v2';

  const DATA_RESOURCE_DEFS = Object.freeze([
    { key: 'events', url: '/data/pjsk_events.json' },
    { key: 'predictionOrder', url: '/data/pjsk_prediction_order.json' },
    { key: 'cards', url: '/data/pjsk_cards.json' },
    { key: 'songs', url: '/data/pjsk_songs.json' },
    { key: 'characters', url: '/data/pjsk_characters.json' },
    { key: 'nuigurumi', url: '/data/pjsk_nuigurumi.json' }
  ]);

  const buildPublicDataCacheName = (dataVersion = currentPublicDataVersion) => (
    `${DATA_CACHE_PREFIX}:${String(dataVersion || 'dev')}`
  );

  const buildVersionedPublicDataUrl = (resourceUrl) => (
    currentPublicDataVersion
      ? `${resourceUrl}?v=${encodeURIComponent(currentPublicDataVersion)}`
      : resourceUrl
  );

  const readPublicDataCacheMeta = () => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const parsed = JSON.parse(localStorage.getItem(DATA_CACHE_META_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  const writePublicDataCacheMeta = () => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(DATA_CACHE_META_KEY, JSON.stringify({
        dataVersion: currentPublicDataVersion,
        cacheName: buildPublicDataCacheName()
      }));
    } catch {
      // Cache metadata is only an optimization; prediction data must never depend on it.
    }
  };

  const getPublicDataCache = async () => {
    if (isLocalDev || typeof window === 'undefined' || !currentPublicDataVersion || !('caches' in window)) return null;
    try {
      return await window.caches.open(buildPublicDataCacheName());
    } catch {
      return null;
    }
  };

  const readPublicDataTextsFromCache = async (cache, allowLooseMatch = false) => {
    if (!cache) return null;
    const cachedRequests = allowLooseMatch ? await cache.keys() : [];
    const resourceTexts = {};
    for (const resource of DATA_RESOURCE_DEFS) {
      let response = await cache.match(buildVersionedPublicDataUrl(resource.url));
      if (!response && allowLooseMatch) {
        const looseRequest = cachedRequests.find((request) => {
          try {
            return new URL(request.url).pathname === resource.url;
          } catch {
            return false;
          }
        });
        response = looseRequest ? await cache.match(looseRequest) : null;
      }
      if (!response) return null;
      resourceTexts[resource.key] = await response.text();
    }
    return resourceTexts;
  };

  const readCachedPublicDataTexts = async () => {
    if (isLocalDev) return null;
    const cache = await getPublicDataCache();
    try {
      // Only an exact versioned match can skip network revalidation. Loose matches
      // are still useful for first paint during a cache migration, but may be stale.
      const currentTexts = await readPublicDataTextsFromCache(cache);
      if (currentTexts) return { texts: currentTexts, isCurrentVersion: true };

      const looseCurrentTexts = await readPublicDataTextsFromCache(cache, true);
      if (looseCurrentTexts) return { texts: looseCurrentTexts, isCurrentVersion: false };

      if (typeof window === 'undefined' || !('caches' in window)) return null;
      const currentName = buildPublicDataCacheName();
      const meta = readPublicDataCacheMeta();
      if (meta?.dataVersion === currentPublicDataVersion && meta?.cacheName && meta.cacheName !== currentName) {
        const matchingOldCache = await window.caches.open(meta.cacheName);
        const matchingOldTexts = await readPublicDataTextsFromCache(matchingOldCache, true);
        if (matchingOldTexts) return { texts: matchingOldTexts, isCurrentVersion: false };
      }

      if (currentAppUpdateKind === 'resource') return null;

      const cacheNames = await window.caches.keys();
      const oldDataCacheNames = cacheNames
        .filter((name) => name.startsWith(`${DATA_CACHE_PREFIX}:`) && name !== currentName)
        .reverse();
      for (const cacheName of oldDataCacheNames) {
        const oldCache = await window.caches.open(cacheName);
        const oldTexts = await readPublicDataTextsFromCache(oldCache, true);
        if (oldTexts) return { texts: oldTexts, isCurrentVersion: false };
      }
    } catch {
      return null;
    }
    return null;
  };

  const arePublicDataTextsEqual = (leftTexts, rightTexts) => (
    !!leftTexts
    && !!rightTexts
    && DATA_RESOURCE_DEFS.every((resource) => leftTexts[resource.key] === rightTexts[resource.key])
  );

  const cleanupLegacyPublicDataLocalStorageCache = () => {
    if (typeof localStorage === 'undefined') return;
    try {
      for (let idx = localStorage.length - 1; idx >= 0; idx -= 1) {
        const key = localStorage.key(idx);
        if (key && key.startsWith(`${LEGACY_DATA_LOCAL_STORAGE_CACHE_PREFIX}:`)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Cleanup is opportunistic; prediction data must never depend on it.
    }
  };

  const cleanupOldPublicDataCaches = async () => {
    if (typeof window === 'undefined' || !currentPublicDataVersion || !('caches' in window)) return;
    const currentName = buildPublicDataCacheName();
    try {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames
        .filter((name) => name.startsWith(`${DATA_CACHE_PREFIX}:`) && name !== currentName)
        .map((name) => window.caches.delete(name)));
    } catch {
      // Cache cleanup is opportunistic; data loading must never depend on it.
    }
  };

  const writePublicDataCache = async (resourceTexts) => {
    if (!resourceTexts) return;
    const cache = await getPublicDataCache();
    if (!cache) return;
    try {
      await Promise.all(DATA_RESOURCE_DEFS.map((resource) => {
        const raw = resourceTexts[resource.key];
        if (typeof raw === 'string' && raw) {
          return cache.put(buildVersionedPublicDataUrl(resource.url), new Response(raw, {
            headers: { 'content-type': 'application/json; charset=utf-8' }
          }));
        }
        return Promise.resolve();
      }));
      writePublicDataCacheMeta();
      await cleanupOldPublicDataCaches();
    } catch {
      // Quota pressure should not block the app; the network data is already loaded.
    }
  };

  const fetchPublicDataTexts = async () => {
    const pairs = await Promise.all(DATA_RESOURCE_DEFS.map(async (resource) => {
      const requestUrl = isLocalDev
        ? `${resource.url}?dev=${Date.now()}`
        : buildVersionedPublicDataUrl(resource.url);
      const response = await fetch(requestUrl, isLocalDev ? { cache: 'no-store' } : undefined);
      if (!response.ok) throw new Error(`Failed to load ${resource.url}`);
      return [resource.key, await response.text()];
    }));
    return Object.fromEntries(pairs);
  };

  const parsePublicDataTexts = (resourceTexts) => {
    const loaded = {};
    DATA_RESOURCE_DEFS.forEach((resource) => {
      loaded[resource.key] = JSON.parse(resourceTexts[resource.key] || (resource.key === 'predictionOrder' ? 'null' : '[]'));
    });
    return loaded;
  };

  return {
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
  };
}
