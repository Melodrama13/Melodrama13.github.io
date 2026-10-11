import { UI_BREAKPOINTS, isViewportAtMost } from '../../ui/breakpoints.js';

/** Owns card capture rendering behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardCaptureRendering(inputs) {
  let pendingCardCaptureRenderTask = null;

  const getCaptureDeviceTier = () => {
    const width = Number(window?.innerWidth || 0);
    const height = Number(window?.innerHeight || 0);
    const minSide = Math.min(width || Number.MAX_SAFE_INTEGER, height || Number.MAX_SAFE_INTEGER);
    if (isViewportAtMost(width, UI_BREAKPOINTS.tabletMax)) {
      if (minSide >= 680) return 'tablet';
      return 'phone';
    }
    return 'desktop';
  };

  const countHeavyMediaNodes = (rootEl) => {
    if (!(rootEl instanceof HTMLElement)) return 0;
    const mediaNodes = rootEl.querySelectorAll('img');
    let heavy = 0;
    mediaNodes.forEach((img) => {
      const src = String(img?.getAttribute('src') || img?.currentSrc || '').toLowerCase();
      const cls = String(img?.className || '').toLowerCase();
      const isIconLike = src.includes('/icon/') || cls.includes('icon') || cls.includes('badge') || cls.includes('chip');
      if (isIconLike) return;
      if (src.includes('/cards/') || (src.includes('/songs/') && !src.includes('/icon/')) || cls.includes('card') || cls.includes('jacket')) {
        heavy += 1;
      }
    });
    return heavy;
  };

  const computeRenderTimeoutMs = ({ deviceTier, heavyMediaCount, width, height, scale }) => {
    const totalMegaPixels = (Math.max(1, width) * Math.max(1, height) * Math.max(1, scale) * Math.max(1, scale)) / 1000000;
    const heavyBoost = heavyMediaCount >= 18 ? 1200 : 0;
    if (totalMegaPixels <= 4) return 4200 + heavyBoost;
    if (totalMegaPixels <= 8) return 5600 + heavyBoost;
    if (totalMegaPixels <= 14) return 7200 + heavyBoost;
    if (totalMegaPixels <= 22) return 9000 + heavyBoost;
    if (totalMegaPixels <= 32) return 10800 + heavyBoost;
    const tierCap = deviceTier === 'phone' ? 14000 : (deviceTier === 'tablet' ? 15500 : 14500);
    return tierCap + heavyBoost;
  };

  const withRenderTimeout = async (promise, timeoutMs, cancelPromise = null) => {
    let timer = 0;
    try {
      const raceTasks = [
        promise,
        new Promise((_, reject) => {
          timer = window.setTimeout(() => {
            reject(new Error(`render-timeout-${timeoutMs}`));
          }, timeoutMs);
        })
      ];
      if (cancelPromise) {
        raceTasks.push(cancelPromise.then(() => {
          throw new Error('export-cancelled');
        }));
      }
      return await Promise.race(raceTasks);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  };

  const waitPendingCardCaptureRenderTask = async (maxWaitMs = 0) => {
    const pending = pendingCardCaptureRenderTask;
    if (!pending) return true;
    if (!(maxWaitMs > 0)) {
      try {
        await pending;
        return true;
      } catch (_) {
        // Ignore previous render failure; caller handles current retry policy.
        return true;
      }
    }
    try {
      const settled = await Promise.race([
        pending.then(() => true).catch(() => true),
        new Promise((resolve) => {
          window.setTimeout(() => resolve(false), maxWaitMs);
        })
      ]);
      return !!settled;
    } catch (_) {
      // Ignore previous render failure; caller handles current retry policy.
      return true;
    }
  };

  const trackCardCaptureRenderTask = (taskPromise) => {
    const tracked = Promise.resolve(taskPromise).finally(() => {
      if (pendingCardCaptureRenderTask === tracked) {
        pendingCardCaptureRenderTask = null;
      }
    });
    pendingCardCaptureRenderTask = tracked;
    return tracked;
  };

  const forceReleaseCardCaptureRenderTask = () => {
    pendingCardCaptureRenderTask = null;
  };

  const preloadSingleImageUrlForCapture = (url, timeoutMs = 7000) => new Promise((resolve) => {
    const src = String(url || '').trim();
    if (!src) {
      resolve(false);
      return;
    }
    let done = false;
    let timer = 0;
    const img = new Image();
    const finish = (ok) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
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
    timer = window.setTimeout(() => finish(false), timeoutMs);
    img.src = src;
  });

  const preloadImageUrlsForCapture = async (rootEl, options = {}) => {
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

    let cursor = 0;
    const workers = Array.from({ length: Math.max(1, Math.min(concurrency, uniq.length)) }).map(async () => {
      while (cursor < uniq.length) {
        const idx = cursor;
        cursor += 1;
        await preloadSingleImageUrlForCapture(uniq[idx], timeoutMs);
      }
    });
    await Promise.allSettled(workers);
  };

  const buildCapturePixelRatioPlan = (deviceTier) => {
    const target = 2;
    const ladder = deviceTier === 'desktop'
      ? [target, 1]
      : [target, 1];
    const seen = new Set();
    return ladder.filter((value) => {
      const key = String(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const CAPTURE_IMAGE_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

  const isEventLikeCaptureError = (error) => {
    if (typeof Event !== 'undefined' && error instanceof Event) return true;
    const raw = String(error?.message || error || '').trim().toLowerCase();
    return raw === '[object event]' || raw.includes('event');
  };

  const getCaptureErrorText = (error) => {
    if (typeof Event !== 'undefined' && error instanceof Event) {
      const eventType = String(error.type || 'unknown');
      return { text: `资源事件异常（${eventType}）`, retryable: true };
    }
    const message = String(error?.message || error || '').trim();
    const lower = message.toLowerCase();
    if (lower === '[object event]') {
      return { text: '资源事件异常（Event）', retryable: true };
    }
    const timeoutMatch = message.match(/render-timeout-(\d+)/);
    if (timeoutMatch) {
      return { text: `渲染超时（>${timeoutMatch[1]}ms）`, retryable: true };
    }
    if (lower.includes('export-cancelled')) {
      return { text: '已取消截图', retryable: false };
    }
    if (lower.includes('tainted') || lower.includes('securityerror')) {
      return { text: '画布被跨域资源污染（tainted canvas）', retryable: false };
    }
    if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
      return { text: '资源加载失败（网络或跨域）', retryable: true };
    }
    if (lower.includes('toblob failed') || lower.includes('无法生成 png')) {
      return { text: 'PNG 编码失败（toBlob）', retryable: true };
    }
    if (lower.includes('html-to-image failed') || lower.includes('tocanvas failed')) {
      return { text: '渲染失败（html-to-image 无返回）', retryable: true };
    }
    if (lower.includes('previous-render-still-running')) {
      return { text: '上一轮渲染任务仍未结束（疑似卡死）', retryable: false };
    }
    if (!message) {
      return { text: '未知错误（无错误消息）', retryable: true };
    }
    return { text: `异常：${message}`, retryable: true };
  };

  return {
    get pendingCardCaptureRenderTask() { return pendingCardCaptureRenderTask; },
    set pendingCardCaptureRenderTask(value) { pendingCardCaptureRenderTask = value; },
    waitPendingCardCaptureRenderTask,
    forceReleaseCardCaptureRenderTask,
    getCaptureDeviceTier,
    preloadImageUrlsForCapture,
    countHeavyMediaNodes,
    buildCapturePixelRatioPlan,
    computeRenderTimeoutMs,
    trackCardCaptureRenderTask,
    CAPTURE_IMAGE_PLACEHOLDER,
    withRenderTimeout,
    isEventLikeCaptureError,
    getCaptureErrorText,
  };
}
