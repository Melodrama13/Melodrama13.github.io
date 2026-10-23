const RETRY_DELAYS = [600, 1800];
const REQUEST_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;
const deferredSource = image => image.getAttribute('data-media-src') || image.getAttribute('data-card-src');

export const getMediaImageSource = image => {
  const source = image.getAttribute('src') || image.currentSrc || '';
  return source.startsWith('blob:') ? image.getAttribute('data-media-source') || source : deferredSource(image) || source;
};

export const isMediaImageUrl = source => {
  try { return /\/(?:cards|songs)\/[^?#]+\.(?:webp|png|jpe?g|avif)$/i.test(new URL(source, document.baseURI).pathname); }
  catch { return false; }
};

/** Shared card/jacket recovery; HTTP remains the cache, blobs only own display bytes. */
export function createMediaImageRecovery(getRoot) {
  const images = new Map(), resources = new Map(), recovered = new Map(), objectUrls = new Map();
  const captureTargets = new Set(), pausedRoots = new Set();
  let running = false, active = 0, timer = 0, observer, mutations;
  const canRun = () => running && document.visibilityState !== 'hidden' && navigator.onLine !== false;
  const limit = () => window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches ? 4 : 16;
  const paused = image => [...pausedRoots].some(root => root.contains(image));
  const current = state => state.image.isConnected && getRoot()?.contains(state.image) && !paused(state.image)
    && state.image.getAttribute('src') === state.requestedSrc;
  const nearViewport = image => {
    let rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) rect = image.parentElement?.getBoundingClientRect() || rect;
    return rect.width > 0 && rect.height > 0 && rect.bottom >= -160 && rect.top <= innerHeight + 160
      && rect.right >= -160 && rect.left <= innerWidth + 160;
  };
  const requested = state => current(state) && (nearViewport(state.image) || [...captureTargets].some(root => root.contains(state.image)));
  const holder = image => image.closest('.song-jacket-media, .song-tooltip-jacket-wrap, .card-tooltip-jacket-item');
  const markFailed = image => {
    image.dataset.loaded = '1'; image.dataset.failed = '1'; image.style.visibility = 'hidden';
    holder(image)?.classList.add('is-failed');
  };
  const markLoaded = image => {
    image.dataset.loaded = '1'; delete image.dataset.failed;
    image.style.visibility = ''; image.style.display = '';
    holder(image)?.classList.remove('is-failed');
  };
  const releaseImage = (image, restoreSource = false) => {
    const asset = recovered.get(image);
    if (!asset) return;
    recovered.delete(image);
    // Detached/KeepAlive nodes must never retain a revoked object URL.
    if (restoreSource && image.getAttribute('src') === asset.url) {
      if (deferredSource(image)) image.removeAttribute('src');
      else image.setAttribute('src', asset.source);
    }
    const refs = (objectUrls.get(asset.url) || 1) - 1;
    if (refs > 0) objectUrls.set(asset.url, refs);
    else { objectUrls.delete(asset.url); URL.revokeObjectURL(asset.url); }
  };
  const releaseRequest = resource => {
    clearTimeout(resource.timeout); resource.timeout = 0;
    resource.controller?.abort(); resource.controller = null;
    if (resource.active) active--;
    resource.active = false;
  };
  const forget = image => {
    const state = images.get(image);
    if (!state) return;
    images.delete(image); observer?.unobserve(image);
    state.resource.images.delete(state);
    if (!state.resource.images.size) {
      releaseRequest(state.resource);
      if (resources.get(state.source) === state.resource) resources.delete(state.source);
    }
  };
  const collect = () => {
    for (const [image, state] of images) if (!current(state)) forget(image);
    for (const [image, asset] of recovered) {
      if (!getRoot()?.contains(image) || image.getAttribute('src') !== asset.url) releaseImage(image, true);
    }
  };
  const schedule = () => {
    clearTimeout(timer); timer = 0; collect();
    if (!canRun() || active >= limit()) return;
    let next = Infinity;
    for (const resource of resources.values()) {
      if (!resource.active && resource.attempts < MAX_ATTEMPTS && [...resource.images].some(requested)) next = Math.min(next, resource.retryAt);
    }
    if (Number.isFinite(next)) timer = window.setTimeout(pump, Math.max(0, next - performance.now()));
  };
  const register = (image, source, failed = false, deferred = false) => {
    if (!(image instanceof HTMLImageElement) || !getRoot()?.contains(image) || paused(image) || !isMediaImageUrl(source)) return;
    source = new URL(source, document.baseURI).href;
    const previous = images.get(image);
    if (previous?.source === source && current(previous)) return;
    forget(image);
    if (deferred) {
      image.removeAttribute('src'); releaseImage(image); delete image.dataset.loaded;
      if (!failed) delete image.dataset.failed;
    }
    let resource = resources.get(source);
    if (!resource) {
      resource = { source, images: new Set(), attempts: failed ? 1 : 0, retryAt: performance.now() + (failed ? RETRY_DELAYS[0] : 0), active: false };
      resources.set(source, resource);
    } else if (resource.attempts >= MAX_ATTEMPTS) {
      // A newly opened view gets a new, bounded opportunity to recover.
      resource.attempts = 1; resource.retryAt = performance.now() + RETRY_DELAYS[0];
    }
    const state = { image, source, resource, requestedSrc: image.getAttribute('src') };
    resource.images.add(state); images.set(image, state); observer?.observe(image);
    schedule();
  };
  const handleError = image => {
    if (!(image instanceof HTMLImageElement)) return;
    const source = recovered.get(image)?.source || image.getAttribute('src');
    if (!isMediaImageUrl(source)) return;
    markFailed(image);
    if (running) register(image, source, true);
  };
  const handleLoad = image => {
    if (!(image instanceof HTMLImageElement) || !isMediaImageUrl(recovered.get(image)?.source || image.getAttribute('src'))) return;
    markLoaded(image); forget(image); schedule();
  };
  const registerNode = node => {
    if (!(node instanceof Element)) return;
    const candidates = node.matches('img') ? [node] : node.querySelectorAll('img');
    for (const image of candidates) {
      const source = deferredSource(image), asset = recovered.get(image);
      if (source) {
        const absolute = new URL(source, document.baseURI).href;
        if (asset?.source === absolute && image.getAttribute('src') === asset.url) continue;
        register(image, source, image.dataset.failed === '1', true);
      } else if (image.complete && image.naturalWidth === 0 && image.getAttribute('src')) handleError(image);
    }
  };
  const failedRequest = (resource, controller) => {
    if (resource.controller !== controller) return;
    for (const state of resource.images) if (current(state)) markFailed(state.image);
    releaseRequest(resource);
    resource.retryAt = performance.now() + RETRY_DELAYS[Math.min(1, resource.attempts - 1)];
    schedule();
  };
  function pump() {
    timer = 0; collect();
    if (!canRun()) return;
    for (const resource of resources.values()) {
      if (active >= limit()) break;
      if (resource.active || resource.attempts >= MAX_ATTEMPTS || resource.retryAt > performance.now() || ![...resource.images].some(requested)) continue;
      const firstLoad = resource.attempts === 0;
      resource.attempts++;
      const controller = new AbortController();
      resource.controller = controller; resource.active = true; active++;
      resource.timeout = window.setTimeout(() => failedRequest(resource, controller), REQUEST_TIMEOUT_MS);
      let objectUrl;
      // Repair the original HTTP cache entry, rather than caching a random retry URL.
      void fetch(resource.source, { mode: 'cors', credentials: 'same-origin', cache: firstLoad ? 'default' : 'reload', signal: controller.signal })
        .then(response => {
          if (!response.ok || !/^image\//i.test(response.headers.get('content-type') || '')) throw new Error('media-image-response');
          return response.blob();
        })
        .then(async blob => {
          objectUrl = URL.createObjectURL(blob);
          const probe = new Image(); probe.decoding = 'async'; probe.src = objectUrl;
          await probe.decode();
          if (resource.controller !== controller) { URL.revokeObjectURL(objectUrl); return; }
          const targets = [...resource.images].filter(current);
          releaseRequest(resource); resources.delete(resource.source);
          if (!targets.length) URL.revokeObjectURL(objectUrl);
          else {
            objectUrls.set(objectUrl, targets.length);
            for (const state of targets) {
              releaseImage(state.image);
              recovered.set(state.image, { url: objectUrl, source: resource.source });
              state.image.setAttribute('data-media-source', resource.source);
              state.requestedSrc = objectUrl; markLoaded(state.image);
              state.image.loading = [...captureTargets].some(root => root.contains(state.image)) ? 'eager' : 'lazy';
              state.image.src = objectUrl;
            }
          }
          schedule();
        })
        .catch(() => {
          if (objectUrl && !objectUrls.has(objectUrl)) URL.revokeObjectURL(objectUrl);
          failedRequest(resource, controller);
        });
    }
    schedule();
  }
  const pauseRoot = root => { if (root) pausedRoots.add(root); collect(); schedule(); };
  const resume = event => {
    if (!canRun()) {
      for (const resource of resources.values()) if (resource.active) {
        releaseRequest(resource); resource.attempts = Math.max(0, resource.attempts - 1);
      }
      return;
    }
    if (event?.type === 'pageshow' && !event.persisted) return;
    for (const resource of resources.values()) if (!resource.active && resource.attempts >= MAX_ATTEMPTS) {
      resource.attempts = 1; resource.retryAt = performance.now() + RETRY_DELAYS[0];
    }
    registerNode(getRoot()); schedule();
  };
  const resumeRoot = root => {
    if (root) pausedRoots.delete(root);
    start(); registerNode(root || getRoot()); schedule();
  };
  const disposeRoot = root => { pauseRoot(root); pausedRoots.delete(root); };
  const onError = event => handleError(event.target), onLoad = event => handleLoad(event.target);
  function start() {
    if (running) return;
    running = true;
    observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(schedule, { rootMargin: '160px' });
    if (typeof MutationObserver !== 'undefined' && getRoot()) {
      mutations = new MutationObserver(records => {
        collect();
        for (const record of records) {
          if (record.type === 'attributes') registerNode(record.target);
          else for (const node of record.addedNodes) registerNode(node);
        }
        schedule();
      });
      mutations.observe(getRoot(), { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'data-card-src', 'data-media-src'] });
    }
    getRoot()?.addEventListener('error', onError, true); getRoot()?.addEventListener('load', onLoad, true);
    window.addEventListener('online', resume); window.addEventListener('offline', resume); window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', resume);
    registerNode(getRoot());
  }
  const prepareForCapture = async (root, cancelContext) => {
    start();
    const candidates = [...root.querySelectorAll('img')].filter(image => isMediaImageUrl(deferredSource(image) || recovered.get(image)?.source || image.getAttribute('src')));
    if (!candidates.length) return;
    captureTargets.add(root);
    const previousLoading = new Map(candidates.map(image => [image, image.getAttribute('loading')]));
    try {
      for (const image of candidates) {
        if (image.complete && image.naturalWidth > 0) continue;
        register(image, deferredSource(image) || recovered.get(image)?.source || image.getAttribute('src'), image.dataset.failed === '1', true);
      }
      schedule();
      const began = performance.now();
      while (candidates.some(image => {
        const state = images.get(image);
        return state && (state.resource.active || state.resource.attempts < MAX_ATTEMPTS || image.getAttribute('src')?.startsWith('blob:'));
      })) {
        if (cancelContext?.isCancelled() || !running) throw new Error('export-cancelled');
        if (performance.now() - began > 45000) throw new Error('图片加载超时，请稍后重试');
        await new Promise(resolve => window.setTimeout(resolve, 80));
      }
    } finally {
      captureTargets.delete(root);
      for (const [image, loading] of previousLoading) image.setAttribute('loading', loading || 'lazy');
      for (const resource of resources.values()) if (resource.active && ![...resource.images].some(requested)) {
        releaseRequest(resource); resource.attempts = Math.max(0, resource.attempts - 1);
      }
      schedule();
    }
  };
  const loadForCanvas = async (source, cancelContext) => {
    if (!isMediaImageUrl(source) || !getRoot()) return null;
    const host = document.createElement('div');
    host.setAttribute('data-media-capture', '');
    host.setAttribute('data-html2canvas-ignore', 'true');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-100000px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;visibility:hidden';
    const image = new Image();
    image.width = image.height = 1;
    image.loading = 'lazy'; image.decoding = 'async'; image.crossOrigin = 'anonymous';
    image.setAttribute('data-media-src', source);
    host.append(image); getRoot().append(host);
    try {
      await prepareForCapture(host, cancelContext);
      if (!image.naturalWidth) return null;
      // A decoded canvas-only copy owns its pixels after the temporary display
      // URL is released. No hidden DOM or persistent blob URL cache is retained.
      const decoded = new Image(); decoded.crossOrigin = 'anonymous'; decoded.src = image.src;
      await decoded.decode();
      return decoded;
    } finally { host.remove(); collect(); }
  };
  const stop = () => {
    running = false; clearTimeout(timer);
    for (const image of [...images.keys()]) forget(image);
    observer?.disconnect(); mutations?.disconnect(); observer = mutations = null;
    getRoot()?.removeEventListener('error', onError, true); getRoot()?.removeEventListener('load', onLoad, true);
    window.removeEventListener('online', resume); window.removeEventListener('offline', resume); window.removeEventListener('pageshow', resume);
    document.removeEventListener('visibilitychange', resume);
  };
  const dispose = () => {
    stop();
    for (const image of [...recovered.keys()]) releaseImage(image, true);
    pausedRoots.clear();
  };
  return { start, stop, dispose, pauseRoot, resumeRoot, disposeRoot, handleLoad, handleError, prepareForCapture, loadForCanvas };
}

let siteRecovery;
export const getSiteMediaRecovery = fallbackRoot => {
  if (!siteRecovery) siteRecovery = createMediaImageRecovery(() => document.getElementById('app') || fallbackRoot?.());
  return siteRecovery;
};
export const mediaImagePlugin = {
  install(app) {
    const recovery = getSiteMediaRecovery(); recovery.start();
    app.onUnmount(() => { recovery.dispose(); siteRecovery = undefined; });
  }
};
