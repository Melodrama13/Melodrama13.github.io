const rawAssetBaseUrl = String(import.meta.env.VITE_ASSET_BASE_URL || '').trim();
const assetBaseUrl = rawAssetBaseUrl.replace(/\/+$/, '');

const ABSOLUTE_URL_RE = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;
const SMALL_STATIC_IMAGE_PATH_RE = /^\/(?:chibi_s|chars|elements|data\/icon|specialized)\//;

const COMMON_STATIC_IMAGE_PATHS = Object.freeze([
  '/data/icon/statistics.png',
  '/data/icon/event.png',
  '/data/icon/music.png',
  '/data/icon/reset.png',
  '/data/icon/import.png',
  '/data/icon/export.png',
  '/data/icon/camera.png',
  '/data/icon/circle_add.png',
  '/data/icon/delete.png',
  '/data/icon/menu.png',
  '/data/icon/menu_open.png',
  '/data/icon/filter.png',
  '/data/icon/top.png',
  '/data/icon/bottom.png',
  '/data/icon/expand.png',
  '/data/icon/collapse.png',
  '/data/icon/circle_arrow_up_down.png',
  '/data/icon/circle_arrow_up.png',
  '/data/icon/circle_arrow_down.png',
  '/data/icon/circle_arrow_right.png',
  '/data/icon/circle_arrow_left.png',
  '/data/icon/circle_arrow_left_right.png',
  '/data/icon/collaboration.png',
  '/data/icon/live.png',
  '/elements/ln.png',
  '/elements/mmj.png',
  '/elements/vbs.png',
  '/elements/ws.png',
  '/elements/nc.png',
  '/elements/vs.png',
  '/elements/pure.png',
  '/elements/cool.png',
  '/elements/cute.png',
  '/elements/happy.png',
  '/elements/mysterious.png',
  '/elements/rstar.png',
  '/elements/ystar.png',
  '/elements/birthday.png',
  '/elements/card_frame_1.png',
  '/elements/card_frame_2.png',
  '/elements/card_frame_3.png',
  '/elements/card_frame_4.png',
  '/elements/card_frame_birth.png',
  '/elements/cfes.webp',
  '/elements/bfes.webp',
  '/elements/Leo_need.png',
  '/elements/MORE_MORE_JUMP!.png',
  '/elements/Vivid_BAD_SQUAD.png',
  '/elements/virtual_singer.png'
]);

const VS_VARIANT_UNITS = Object.freeze(['ln', 'mmj', 'vbs', 'ws', 'nc']);
const VS_VARIANT_ABBRS = Object.freeze(['miku', 'rin', 'len', 'luka', 'meiko', 'kaito']);
const DEFAULT_CHAR_ABBRS = Object.freeze([
  'ICK',
  'SAKI',
  'HNM',
  'SHIHO',
  'MNR',
  'HRK',
  'AIRI',
  'SZK',
  'KHN',
  'AN',
  'AKT',
  'TOYA',
  'TKS',
  'EMU',
  'NENE',
  'RUI',
  'KND',
  'MFY',
  'ENA',
  'MZK',
  'MIKU',
  'RIN',
  'LEN',
  'LUKA',
  'MEIKO',
  'KAITO'
]);
const warmedImageUrls = new Map();

export const buildAssetUrl = (assetPath) => {
  const rawPath = String(assetPath || '').trim();
  if (!rawPath) return '';
  if (ABSOLUTE_URL_RE.test(rawPath) || rawPath.startsWith('data:') || rawPath.startsWith('blob:')) {
    return rawPath;
  }

  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  if (!assetBaseUrl) return normalizedPath;

  // R2 media used to be loaded without CORS. Keep one stable URL variant for
  // canvas-safe responses so old opaque browser-cache entries cannot poison
  // html-to-image, while normal page loads and later exports still share cache.
  const url = new URL(`${assetBaseUrl}${normalizedPath}`);
  url.searchParams.set('_cors', '1');
  return url.toString();
};

const getUrlPathname = (url) => {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) return '';
  try {
    const base = typeof window !== 'undefined' && window.location ? window.location.href : 'http://localhost/';
    return new URL(rawUrl, base).pathname;
  } catch {
    return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  }
};

const toImageCacheKey = (url) => {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) return '';
  try {
    const base = typeof window !== 'undefined' && window.location ? window.location.href : 'http://localhost/';
    const parsed = new URL(rawUrl, base);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl.split(/[?#]/, 1)[0];
  }
};

const uniqueImageUrls = (urls) => {
  const seen = new Set();
  return (Array.isArray(urls) ? urls : [])
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .filter((url) => {
      const key = toImageCacheKey(url);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const scheduleIdleTask = (callback, timeout = 1200) => {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(idleId);
  }
  const timerId = setTimeout(callback, 120);
  return () => clearTimeout(timerId);
};

export const isSmallStaticImageUrl = (url) => SMALL_STATIC_IMAGE_PATH_RE.test(getUrlPathname(url));

export const preloadImageUrl = (url, options = {}) => {
  const rawUrl = String(url || '').trim();
  const cacheKey = toImageCacheKey(rawUrl);
  if (!cacheKey) return Promise.resolve(false);
  if (warmedImageUrls.has(cacheKey)) return warmedImageUrls.get(cacheKey);

  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 8000;
  const promise = new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(false);
      return;
    }

    const image = new Image();
    let settled = false;
    let timerId = 0;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (timerId) clearTimeout(timerId);
      resolve(ok);
    };

    image.decoding = 'async';
    image.loading = 'eager';
    image.onload = () => {
      if (typeof image.decode === 'function') {
        image.decode().then(() => finish(true), () => finish(true));
        return;
      }
      finish(true);
    };
    image.onerror = () => finish(false);
    timerId = setTimeout(() => finish(false), Math.max(1000, timeoutMs));
    image.src = rawUrl;
  });

  const trackedPromise = promise.then((ok) => {
    if (!ok) warmedImageUrls.delete(cacheKey);
    return ok;
  });
  warmedImageUrls.set(cacheKey, trackedPromise);
  return trackedPromise;
};

export const scheduleImageWarmup = (urls, options = {}) => {
  const queue = uniqueImageUrls(urls).filter((url) => !options.smallOnly || isSmallStaticImageUrl(url));
  if (!queue.length) return () => {};

  const concurrency = Math.max(1, Math.min(8, Number(options.concurrency) || 4));
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 8000;
  let active = 0;
  let index = 0;
  let cancelled = false;
  let cancelIdle = null;

  const pump = () => {
    if (cancelled) return;
    cancelIdle = null;
    while (active < concurrency && index < queue.length) {
      active += 1;
      const url = queue[index];
      index += 1;
      preloadImageUrl(url, { timeoutMs }).finally(() => {
        active -= 1;
        if (!cancelled && index < queue.length) {
          cancelIdle = scheduleIdleTask(pump);
        }
      });
    }
  };

  cancelIdle = scheduleIdleTask(pump, options.idleTimeoutMs || 1600);
  return () => {
    cancelled = true;
    if (typeof cancelIdle === 'function') cancelIdle();
  };
};

export const collectSmallStaticImageUrls = (root) => {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.from(root.querySelectorAll('img'))
    .map((image) => image.currentSrc || image.getAttribute('src') || image.src || '')
    .filter(isSmallStaticImageUrl);
};

export const installSmallStaticImageWarmupObserver = (root, options = {}) => {
  if (!root || typeof MutationObserver === 'undefined') return () => {};

  let cancelQueuedWarmup = null;
  let queuedUrls = [];
  let scheduleCancel = null;

  const flush = () => {
    scheduleCancel = null;
    if (cancelQueuedWarmup) cancelQueuedWarmup();
    cancelQueuedWarmup = scheduleImageWarmup(queuedUrls, {
      concurrency: options.concurrency || 2,
      timeoutMs: options.timeoutMs || 8000,
      smallOnly: true
    });
    queuedUrls = [];
  };

  const queueImage = (image) => {
    if (!(image instanceof HTMLImageElement)) return;
    const src = image.currentSrc || image.getAttribute('src') || image.src || '';
    if (!isSmallStaticImageUrl(src)) return;
    if (!image.hasAttribute('decoding')) image.decoding = 'async';
    if (!image.hasAttribute('loading')) image.loading = 'eager';
    queuedUrls.push(src);
    if (!scheduleCancel) scheduleCancel = scheduleIdleTask(flush, 600);
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        queueImage(mutation.target);
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement) {
          queueImage(node);
          return;
        }
        if (node instanceof Element) {
          node.querySelectorAll('img').forEach(queueImage);
        }
      });
    });
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });

  root.querySelectorAll?.('img').forEach(queueImage);

  return () => {
    observer.disconnect();
    if (typeof scheduleCancel === 'function') scheduleCancel();
    if (typeof cancelQueuedWarmup === 'function') cancelQueuedWarmup();
  };
};

export const getCommonSmallStaticImageUrls = (options = {}) => {
  const urls = [...COMMON_STATIC_IMAGE_PATHS];
  const characters = Array.isArray(options.characters) ? options.characters : [];
  const abbrs = [...DEFAULT_CHAR_ABBRS, ...characters.map((character) => String(character?.en_abbr || '').trim())]
    .map((abbr) => String(abbr || '').trim())
    .filter(Boolean);

  abbrs.forEach((abbr) => {
    urls.push(`/chibi_s/${abbr}.webp`);
    urls.push(`/chars/${abbr}.png`);
  });

  VS_VARIANT_ABBRS.forEach((abbr) => {
    VS_VARIANT_UNITS.forEach((unit) => {
      urls.push(`/chibi_s/${abbr}_${unit}.webp`);
    });
  });

  return uniqueImageUrls(urls);
};
