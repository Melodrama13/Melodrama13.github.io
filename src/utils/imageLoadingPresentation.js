const managedRequests = new WeakMap();
const captureRoots = '.export-clone-root, .export-clone-host, .song-export-clone-root, .song-export-clone-host, .history-export-clone-host, [data-media-capture], [data-ui-image-capture]';
const sourceKey = image => {
  const src = image.getAttribute('src') || '';
  const source = image.getAttribute('data-card-src') || image.getAttribute('data-media-src')
    || (src.startsWith('blob:') ? image.getAttribute('data-media-source') || src : src);
  let canonical = source;
  try { if (source) canonical = new URL(source, document.baseURI).href; } catch { /* Invalid native sources still settle through error. */ }
  return [canonical, image.getAttribute('srcset') || '', image.getAttribute('sizes') || ''].join('\n');
};
let sitePresentation;

/** Presentation only: shared fetches report their actual queue/request state. */
export const setImageLoadingState = (image, phase) => {
  managedRequests.set(image, { source: sourceKey(image), phase });
  sitePresentation?.refresh(image);
};

/** One document observer also covers body Teleports; native loading is untouched. */
export const startImageLoadingPresentation = () => {
  if (sitePresentation) return sitePresentation.stop;
  const images = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stopped = false;
  const clearReveal = (image, state) => {
    clearTimeout(state.revealTimer);
    state.revealTimer = 0;
    image.removeAttribute('data-ui-image-reveal');
  };
  const forget = image => {
    const state = images.get(image);
    if (!state) return;
    clearReveal(image, state);
    intersection?.unobserve(image);
    images.delete(image);
    image.removeAttribute('data-ui-image-state');
    image.removeAttribute('data-ui-image-active');
  };
  const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = images.get(entry.target);
      if (!state || entry.target.getAttribute('data-ui-image-state') !== 'loading') continue;
      state.visible = entry.isIntersecting;
      entry.target.toggleAttribute('data-ui-image-active', entry.isIntersecting);
    }
  });
  const refresh = (image, eventPhase) => {
    if (!(image instanceof HTMLImageElement)) return;
    if (!image.isConnected || image.closest(captureRoots)) { forget(image); return; }
    const source = sourceKey(image);
    if (!source.replaceAll('\n', '')) { forget(image); return; }
    let state = images.get(image);
    const previousPhase = image.getAttribute('data-ui-image-state');
    const sameSource = state?.source === source;
    if (!state) { state = { source, revealTimer: 0, visible: !intersection }; images.set(image, state); }
    if (!sameSource) { clearReveal(image, state); state.source = source; }
    const request = managedRequests.get(image);
    let phase = eventPhase || (request?.source === source ? request.phase : null);
    if (!phase) {
      if (image.getAttribute('src') || image.getAttribute('srcset')) phase = image.complete ? (image.naturalWidth > 0 ? 'loaded' : 'error') : 'loading';
      else phase = 'pending';
    }
    image.setAttribute('data-ui-image-state', phase);
    if (phase === 'loading') {
      if (intersection) intersection.observe(image);
      else image.setAttribute('data-ui-image-active', '');
    } else {
      intersection?.unobserve(image);
      image.removeAttribute('data-ui-image-active');
      if (phase !== 'loaded') clearReveal(image, state);
    }
    // Already decoded/cache hits never get a placeholder or an entrance flash.
    // Existing dimmed/pressed states keep their own opacity feedback.
    if (eventPhase === 'loaded' && previousPhase === 'loading' && sameSource && state.visible && !reducedMotion.matches
      && document.visibilityState !== 'hidden' && getComputedStyle(image).opacity === '1') {
      clearReveal(image, state);
      image.setAttribute('data-ui-image-reveal', '');
      state.revealTimer = window.setTimeout(() => clearReveal(image, state), 300);
    }
  };
  const scan = node => {
    if (!(node instanceof Element)) return;
    if (node.matches('img')) refresh(node);
    for (const image of node.querySelectorAll('img')) refresh(image);
  };
  const mutations = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target instanceof HTMLImageElement) refresh(record.target);
        else if (record.target instanceof HTMLSourceElement) scan(record.target.closest('picture'));
      } else {
        for (const node of record.addedNodes) scan(node);
        for (const node of record.removedNodes) if (!node.isConnected) scan(node);
      }
    }
  });
  const onLoad = event => {
    if (!(event.target instanceof HTMLImageElement)) return;
    managedRequests.delete(event.target);
    refresh(event.target, event.target.naturalWidth > 0 ? 'loaded' : 'error');
  };
  const onError = event => {
    if (!(event.target instanceof HTMLImageElement)) return;
    managedRequests.delete(event.target);
    refresh(event.target, 'error');
  };
  const visibility = () => document.documentElement.toggleAttribute('data-ui-image-paused', document.visibilityState === 'hidden');
  const motionChanged = () => { if (reducedMotion.matches) for (const [image, state] of images) clearReveal(image, state); };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    mutations.disconnect(); intersection?.disconnect();
    document.removeEventListener('load', onLoad, true);
    document.removeEventListener('error', onError, true);
    document.removeEventListener('visibilitychange', visibility);
    reducedMotion.removeEventListener('change', motionChanged);
    for (const image of images.keys()) forget(image);
    document.documentElement.removeAttribute('data-ui-image-paused');
    sitePresentation = undefined;
  };
  sitePresentation = { refresh, stop };
  document.addEventListener('load', onLoad, true);
  document.addEventListener('error', onError, true);
  document.addEventListener('visibilitychange', visibility);
  reducedMotion.addEventListener('change', motionChanged);
  mutations.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'srcset', 'sizes', 'data-card-src', 'data-media-src'] });
  visibility(); scan(document.documentElement);
  return stop;
};

/** Inline freeze survives both capture engines' computed-style cloning. */
export const freezeImageLoadingPresentation = root => {
  const images = [...(root?.matches?.('img') ? [root] : []), ...(root?.querySelectorAll?.('img') || [])];
  const saved = [];
  for (const image of images) {
    for (const [property, value] of [['animation', 'none'], ['background-image', 'none'], ['background-color', 'transparent']]) {
      if (property !== 'animation' && !['loading', 'pending'].includes(image.getAttribute('data-ui-image-state'))) continue;
      saved.push([image, property, image.style.getPropertyValue(property), image.style.getPropertyPriority(property)]);
      image.style.setProperty(property, value, 'important');
    }
  }
  return () => {
    for (const [image, property, value, priority] of saved) {
      if (value) image.style.setProperty(property, value, priority);
      else image.style.removeProperty(property);
    }
  };
};

export const imageLoadingPresentationPlugin = {
  install(app) { app.onUnmount(startImageLoadingPresentation()); }
};
