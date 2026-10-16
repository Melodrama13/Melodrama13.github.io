const RETRY_DELAYS = [600, 1800];
const MAX_ACTIVE_REQUESTS = 4;
const REQUEST_TIMEOUT_MS = 15000;

/** Bounds year-thumbnail loading and failed-image recovery with one request queue. */
export function createCardMediaRecovery(getRoot) {
  const failures = new Map();
  const recoveredImages = new Map();
  const captureTargets = new Set();
  const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let running = false;
  let timer = 0;
  let observer = null;
  let sourceObserver = null;
  let active = 0;
  let requestId = 0;

  const canRun = () => running && document.visibilityState !== 'hidden' && navigator.onLine !== false;
  const isNearViewport = image => {
    const rect = image.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom >= -160 && rect.top <= innerHeight + 160
      && rect.right >= -160 && rect.left <= innerWidth + 160;
  };
  const isRequested = image => isNearViewport(image) || [...captureTargets].some(root => root.contains(image));
  const maxAttempts = state => RETRY_DELAYS.length + (state.initial ? 1 : 0);
  const retryDelay = state => RETRY_DELAYS[Math.max(0, state.attempts - (state.initial ? 1 : 0))] || 0;
  const releaseRequest = state => {
    clearTimeout(state.timeout);
    state.timeout = 0;
    state.controller?.abort();
    state.controller = null;
    if (state.active) active -= 1;
    state.active = false;
  };
  const releaseRecoveredImage = image => {
    const recovered = recoveredImages.get(image);
    if (recovered) URL.revokeObjectURL(recovered.url);
    recoveredImages.delete(image);
  };
  const collectRecoveredImages = () => {
    recoveredImages.forEach((recovered, image) => {
      if (!getRoot()?.contains(image) || image.getAttribute('src') !== recovered.url) releaseRecoveredImage(image);
    });
  };
  const forget = image => {
    const state = failures.get(image);
    if (state) releaseRequest(state);
    failures.delete(image);
    observer?.unobserve(image);
  };
  const isCurrent = (image, state) => image.isConnected && getRoot()?.contains(image)
    && image.getAttribute('src') === state.requestedSrc;

  const schedule = () => {
    clearTimeout(timer);
    timer = 0;
    failures.forEach((state, image) => { if (!isCurrent(image, state)) forget(image); });
    if (!canRun() || active >= MAX_ACTIVE_REQUESTS) return;
    let next = Infinity;
    failures.forEach((state, image) => {
      if (!isCurrent(image, state)) { forget(image); return; }
      if (!state.active && state.attempts < maxAttempts(state) && isRequested(image)) {
        next = Math.min(next, state.retryAt);
      }
    });
    if (Number.isFinite(next)) timer = window.setTimeout(pump, Math.max(0, next - performance.now()));
  };

  const handleError = image => {
    if (!(image instanceof HTMLImageElement) || !getRoot()?.contains(image)) return;
    image.dataset.failed = '1';
    if (!running) return;
    const src = image.getAttribute('src');
    if (!src) return;
    const recovered = recoveredImages.get(image);
    const originalSrc = recovered?.url === src ? recovered.originalSrc : src;
    let url;
    try { url = new URL(originalSrc, document.baseURI); } catch { return; }
    if (!/^\/cards\//.test(url.pathname)) return;
    let state = failures.get(image);
    if (state && src !== state.requestedSrc) { forget(image); state = null; }
    if (!state) {
      state = { originalSrc: url.href, requestedSrc: src, attempts: 0, active: false, timeout: 0, controller: null };
      failures.set(image, state);
      observer?.observe(image);
    }
    releaseRequest(state);
    state.retryAt = performance.now() + retryDelay(state);
    schedule();
  };

  const registerDeferredImage = image => {
    if (!(image instanceof HTMLImageElement) || !getRoot()?.contains(image)) return;
    const rawSource = image.getAttribute('data-card-src');
    if (!rawSource) return;
    let originalSrc;
    try { originalSrc = new URL(rawSource, document.baseURI).href; } catch { return; }
    const currentSrc = image.getAttribute('src');
    const recovered = recoveredImages.get(image);
    if (recovered?.originalSrc === originalSrc && recovered.url === currentSrc) return;
    const previous = failures.get(image);
    if (previous?.originalSrc === originalSrc && previous.requestedSrc === currentSrc) return;
    const previousOriginal = previous?.originalSrc || recovered?.originalSrc;
    const wasFailed = image.dataset.failed === '1' && (!previousOriginal || previousOriginal === originalSrc);
    forget(image);
    image.removeAttribute('src');
    releaseRecoveredImage(image);
    delete image.dataset.loaded;
    if (!wasFailed) delete image.dataset.failed;
    image.style.visibility = '';
    failures.set(image, {
      originalSrc, requestedSrc: null, initial: true,
      attempts: wasFailed ? 1 : 0,
      active: false, timeout: 0, controller: null, retryAt: performance.now()
    });
    observer?.observe(image);
    schedule();
  };
  const registerDeferredNode = node => {
    if (!(node instanceof Element)) return;
    if (node.matches('img[data-card-src]')) registerDeferredImage(node);
    node.querySelectorAll('img[data-card-src]').forEach(registerDeferredImage);
  };

  function pump() {
    timer = 0;
    if (!canRun()) return;
    for (const [image, state] of failures) {
      if (!isCurrent(image, state)) { forget(image); continue; }
      if (active >= MAX_ACTIVE_REQUESTS) break;
      if (state.active || state.attempts >= maxAttempts(state) || state.retryAt > performance.now() || !isRequested(image)) continue;
      const url = new URL(state.originalSrc);
      const firstLoad = state.initial && state.attempts === 0;
      state.attempts += 1;
      if (!firstLoad) url.searchParams.set('mediaRetry', `${nonce}-${++requestId}`);
      const controller = new AbortController();
      state.controller = controller;
      state.active = true;
      active += 1;
      delete image.dataset.loaded;
      image.style.visibility = '';
      image.loading = 'eager';
      state.timeout = window.setTimeout(() => {
        if (!isCurrent(image, state)) { forget(image); schedule(); return; }
        image.dataset.loaded = '1';
        image.dataset.failed = '1';
        image.style.visibility = 'hidden';
        releaseRequest(state);
        state.retryAt = performance.now() + retryDelay(state);
        schedule();
      }, REQUEST_TIMEOUT_MS);
      // WebKit may keep native img requests alive after src is removed. Fetch
      // provides real cancellation; the resulting local image also stays canvas-safe.
      void fetch(url.href, { mode: 'cors', credentials: 'omit', cache: firstLoad ? 'default' : 'reload', signal: controller.signal })
        .then(response => {
          if (!response.ok || !/^image\//i.test(response.headers.get('content-type') || '')) throw new Error('card-image-response');
          return response.blob();
        })
        .then(blob => {
          if (failures.get(image) !== state || state.controller !== controller) return;
          if (!isCurrent(image, state)) { forget(image); schedule(); return; }
          releaseRecoveredImage(image);
          const objectUrl = URL.createObjectURL(blob);
          recoveredImages.set(image, { url: objectUrl, originalSrc: state.originalSrc });
          state.requestedSrc = objectUrl;
          image.src = objectUrl;
        })
        .catch(() => {
          if (failures.get(image) !== state || state.controller !== controller) return;
          if (!isCurrent(image, state)) { forget(image); schedule(); return; }
          image.dataset.loaded = '1';
          image.dataset.failed = '1';
          image.style.visibility = 'hidden';
          releaseRequest(state);
          state.retryAt = performance.now() + retryDelay(state);
          schedule();
        });
    }
    schedule();
  }

  const handleLoad = image => {
    if (!(image instanceof HTMLImageElement)) return;
    delete image.dataset.failed;
    forget(image);
    collectRecoveredImages();
    schedule();
  };
  const resume = event => {
    if (!canRun() || (event?.type === 'pageshow' && !event.persisted)) return;
    failures.forEach(state => {
      if (!state.active && state.attempts >= maxAttempts(state)) {
        state.attempts = state.initial ? 1 : 0;
        state.retryAt = performance.now() + RETRY_DELAYS[0];
      }
    });
    schedule();
  };
  const start = () => {
    if (running) return;
    running = true;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(schedule, { rootMargin: '160px' });
    }
    if (typeof MutationObserver !== 'undefined' && getRoot()) {
      sourceObserver = new MutationObserver(mutations => {
        collectRecoveredImages();
        mutations.forEach(mutation => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-card-src') registerDeferredImage(mutation.target);
          if (mutation.type === 'childList') mutation.addedNodes.forEach(registerDeferredNode);
        });
        schedule();
      });
      sourceObserver.observe(getRoot(), { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'data-card-src'] });
    }
    collectRecoveredImages();
    window.addEventListener('online', resume);
    window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', resume);
    registerDeferredNode(getRoot());
    getRoot()?.querySelectorAll('img[data-failed="1"]:not([data-card-src])').forEach(handleError);
  };
  const prepareForCapture = async (root, cancelContext) => {
    const images = [...root.querySelectorAll('img[data-card-src]')];
    if (!images.length) return;
    captureTargets.add(root);
    const startedAt = performance.now();
    try {
      images.forEach(registerDeferredImage);
      schedule();
      while (images.some(image => {
        const state = failures.get(image);
        return root.contains(image) && state && (state.active || state.attempts < maxAttempts(state));
      })) {
        if (cancelContext?.isCancelled() || !running) throw new Error('export-cancelled');
        if (performance.now() - startedAt > 45000) throw new Error('卡面加载超时，请稍后重试');
        await new Promise(resolve => window.setTimeout(resolve, 80));
      }
    } finally {
      captureTargets.delete(root);
      failures.forEach((state, image) => {
        if (state.active && !isRequested(image)) {
          releaseRequest(state);
          state.attempts = Math.max(0, state.attempts - 1);
          state.retryAt = performance.now();
        }
      });
      schedule();
    }
  };
  const stop = () => {
    running = false;
    clearTimeout(timer);
    timer = 0;
    failures.forEach((state, image) => forget(image));
    observer?.disconnect();
    observer = null;
    sourceObserver?.disconnect();
    sourceObserver = null;
    window.removeEventListener('online', resume);
    window.removeEventListener('pageshow', resume);
    document.removeEventListener('visibilitychange', resume);
  };
  const dispose = () => {
    stop();
    recoveredImages.forEach((recovered, image) => releaseRecoveredImage(image));
  };
  return { handleLoad, handleError, start, stop, dispose, prepareForCapture };
}
