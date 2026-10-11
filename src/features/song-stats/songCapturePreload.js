import { preloadUrlsWithDeadline, PRELOAD_PHASE_TIMEOUT_MS } from '../../utils/songCapturePolicy.js';

export const preloadSingleImageUrlForCapture = (url, timeoutMs = 7000, signal = null) => new Promise((resolve) => {
  const src = String(url || '').trim();
  if (!src) {
    resolve(false);
    return;
  }
  let done = false;
  let timer = 0;
  let abortHandler = null;
  const img = new Image();
  const finish = (ok, aborted = false) => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    img.onload = null;
    img.onerror = null;
    if (signal && abortHandler) {
      signal.removeEventListener('abort', abortHandler);
    }
    if (aborted) {
      try {
        img.src = '';
      } catch (_) {
        // Ignore a browser-specific Image reset failure during abort cleanup.
      }
    }
    resolve(!!ok);
  };
  img.onload = () => finish(true);
  img.onerror = () => finish(false);
  try {
    img.decoding = 'async';
    img.loading = 'eager';
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
  } catch (_) {
    // Ignore unsupported attributes.
  }
  abortHandler = () => finish(false, true);
  if (signal) {
    if (signal.aborted) {
      abortHandler();
      return;
    }
    signal.addEventListener('abort', abortHandler, { once: true });
  }
  timer = window.setTimeout(() => finish(false), timeoutMs);
  img.src = src;
});

export const preloadImageUrlsForCapture = async (rootEl, options = {}) => {
  if (!(rootEl instanceof HTMLElement)) return;
  const maxImages = Number(options?.maxImages || 0) > 0 ? Number(options.maxImages) : 260;
  const concurrency = Number(options?.concurrency || 0) > 0 ? Number(options.concurrency) : 8;
  const timeoutMs = Number(options?.timeoutMs || 0) > 0 ? Number(options.timeoutMs) : 7000;
  const srcList = Array.from(rootEl.querySelectorAll('img'))
    .map((imgEl) => String(imgEl?.currentSrc || imgEl?.getAttribute('src') || '').trim())
    .filter(Boolean)
    .slice(0, maxImages);
  const uniq = [...new Set(srcList)];
  if (!uniq.length) return;

  return preloadUrlsWithDeadline({
    urls: uniq,
    concurrency,
    timeoutMs,
    phaseTimeoutMs: PRELOAD_PHASE_TIMEOUT_MS,
    loadOne: (url, { signal, timeoutMs: singleTimeoutMs }) => (
      preloadSingleImageUrlForCapture(url, singleTimeoutMs, signal)
    )
  });
};
