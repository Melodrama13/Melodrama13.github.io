

/** Capture Assets owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: Navigation, CapturePolicy.
 */
export function useHistoryCaptureAssets(ports) {
const waitHistoryNextPaint = () => new Promise((resolve) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  });
});

const HISTORY_CAPTURE_IMAGE_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

const decodeHistoryImageForCapture = async (imgEl, timeoutMs = 1400) => {
  if (!(imgEl instanceof HTMLImageElement) || typeof imgEl.decode !== 'function') return;
  const src = String(imgEl.currentSrc || imgEl.src || imgEl.getAttribute('src') || '').trim();
  if (!src || src === HISTORY_CAPTURE_IMAGE_PLACEHOLDER) return;

  let timer = 0;
  try {
    await Promise.race([
      imgEl.decode().catch(() => undefined),
      new Promise((resolve) => {
        timer = window.setTimeout(resolve, Math.max(400, timeoutMs));
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const copyHistoryCssCustomProperties = (sourceEl, targetEl) => {
  if (!(sourceEl instanceof HTMLElement) || !(targetEl instanceof HTMLElement)) return;
  const style = window.getComputedStyle(sourceEl);
  for (let idx = 0; idx < style.length; idx += 1) {
    const prop = style[idx];
    if (!String(prop || '').startsWith('--')) continue;
    const value = String(style.getPropertyValue(prop) || '').trim();
    if (value) targetEl.style.setProperty(prop, value);
  }
};

const waitHistoryImageReady = (imgEl, timeoutMs = 2200) => new Promise((resolve) => {
  if (!(imgEl instanceof HTMLImageElement)) {
    resolve();
    return;
  }
  let done = false;
  let timer = 0;
  const finish = async () => {
    if (done) return;
    done = true;
    imgEl.removeEventListener('load', finish);
    imgEl.removeEventListener('error', finish);
    if (timer) clearTimeout(timer);
    await decodeHistoryImageForCapture(imgEl, Math.min(1800, Math.max(700, timeoutMs)));
    resolve();
  };

  if (imgEl.complete) {
    finish();
    return;
  }

  imgEl.addEventListener('load', finish, { once: true });
  imgEl.addEventListener('error', finish, { once: true });
  timer = window.setTimeout(finish, timeoutMs);
});

const syncHistoryExportCloneImagesWithSource = (sourceRoot, cloneRoot) => {
  if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
  const sourceImages = Array.from(sourceRoot.querySelectorAll('img'));
  const cloneImages = Array.from(cloneRoot.querySelectorAll('img'));
  const pairCount = Math.min(sourceImages.length, cloneImages.length);

  for (let idx = 0; idx < pairCount; idx += 1) {
    const sourceImg = sourceImages[idx];
    const cloneImg = cloneImages[idx];
    if (!(cloneImg instanceof HTMLImageElement)) continue;
    const sourceUrl = String(sourceImg?.currentSrc || sourceImg?.getAttribute('src') || sourceImg?.src || '').trim();

    cloneImg.setAttribute('loading', 'eager');
    cloneImg.setAttribute('decoding', 'sync');
    if ('fetchPriority' in cloneImg) {
      cloneImg.fetchPriority = 'high';
    }
    if (sourceUrl) {
      cloneImg.setAttribute('src', sourceUrl);
    }
  }

  for (let idx = pairCount; idx < cloneImages.length; idx += 1) {
    const cloneImg = cloneImages[idx];
    if (!(cloneImg instanceof HTMLImageElement)) continue;
    cloneImg.setAttribute('loading', 'eager');
    cloneImg.setAttribute('decoding', 'sync');
    if ('fetchPriority' in cloneImg) {
      cloneImg.fetchPriority = 'high';
    }
  }
};

const preloadSingleHistoryImageUrlForCapture = (url, timeoutMs = 7000) => new Promise((resolve) => {
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
  img.onload = async () => {
    await decodeHistoryImageForCapture(img, Math.min(2600, Math.max(900, timeoutMs)));
    finish(true);
  };
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

const preloadHistoryImageUrlsForCapture = async (rootEl, options = {}) => {
  if (!(rootEl instanceof HTMLElement)) return;
  const maxImages = Number(options?.maxImages || 0) > 0 ? Number(options.maxImages) : 360;
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
      await preloadSingleHistoryImageUrlForCapture(uniq[idx], timeoutMs);
    }
  });
  await Promise.allSettled(workers);
};

const waitForHistoryExportAssets = async (rootEl, options = {}) => {
  if (!(rootEl instanceof HTMLElement)) return;
  const maxWaitMs = Number(options?.maxWaitMs || 0) > 0 ? Number(options.maxWaitMs) : 2600;
  const maxImages = Number(options?.maxImages || 0) > 0 ? Number(options.maxImages) : 360;
  const fontReady = (document?.fonts?.ready && typeof document.fonts.ready.then === 'function')
    ? document.fonts.ready.catch(() => undefined)
    : Promise.resolve();
  const images = Array.from(rootEl.querySelectorAll('img')).slice(0, maxImages);
  images.forEach((imgEl) => {
    if (!(imgEl instanceof HTMLImageElement)) return;
    const currentSrc = String(imgEl.currentSrc || imgEl.getAttribute('src') || '').trim();
    imgEl.setAttribute('loading', 'eager');
    imgEl.setAttribute('decoding', 'sync');
    if ('fetchPriority' in imgEl) {
      imgEl.fetchPriority = 'high';
    }
    if (currentSrc) {
      imgEl.setAttribute('src', currentSrc);
    }
  });

  await Promise.race([
    Promise.allSettled([
      fontReady,
      Promise.allSettled(images.map((imgEl) => waitHistoryImageReady(imgEl, Math.min(2400, maxWaitMs))))
    ]),
    new Promise((resolve) => window.setTimeout(resolve, maxWaitMs))
  ]);
};

const prewarmHistoryExportSourceRows = async (rows, deviceTier) => {
  const rowEls = (Array.isArray(rows) ? rows : []).filter((row) => row instanceof HTMLElement);
  if (rowEls.length === 0) return;

  const maxImagesTotal = deviceTier === 'desktop' ? 1200 : 900;
  const maxWaitMs = deviceTier === 'phone' ? 3800 : (deviceTier === 'tablet' ? 3400 : 3200);
  let imageBudgetUsed = 0;
  const tasks = [];

  for (const rowEl of rowEls) {
    if (imageBudgetUsed >= maxImagesTotal) break;
    const imageCount = rowEl.querySelectorAll('img').length;
    if (imageCount <= 0) continue;
    const maxImages = Math.min(imageCount, maxImagesTotal - imageBudgetUsed);
    imageBudgetUsed += maxImages;
    tasks.push(waitForHistoryExportAssets(rowEl, { maxWaitMs, maxImages }));
  }

  await Promise.allSettled(tasks);
};

const sanitizeHistoryExportClone = (cloneRoot) => {
  if (!(cloneRoot instanceof HTMLElement)) return;
  cloneRoot.querySelectorAll('.predict-delete-btn, .event-precedent-entry, .card-detail-tooltip, .tooltip-content, .birthday-info-popover').forEach((node) => {
    node.remove();
  });
  cloneRoot.querySelectorAll('.is-active, .is-open, .is-tooltip-raised').forEach((node) => {
    node.classList.remove('is-active', 'is-open', 'is-tooltip-raised');
  });
  cloneRoot.querySelectorAll('.media-load-shimmer').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.style.animation = 'none';
    node.style.backgroundImage = 'none';
  });
  cloneRoot.querySelectorAll('.avatar-wrapper').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.querySelector('.banner-avatar')) {
      node.classList.add('is-export-banner-avatar-wrapper');
    }
  });
};

const prepareHistoryExportClone = async (listEl, rows) => {
  if (!(listEl instanceof HTMLElement) || !Array.isArray(rows) || rows.length === 0) return null;

  const listRect = listEl.getBoundingClientRect();
  const cloneWidth = Math.max(320, Math.ceil(listEl.clientWidth || listRect.width || 320));
  const sourceWrapper = ports.navigation.historyWrapperRef.value instanceof HTMLElement
    ? ports.navigation.historyWrapperRef.value
    : listEl.closest('.event-history-wrapper');

  const host = document.createElement('div');
  host.className = 'history-export-clone-host';
  host.style.position = 'fixed';
  host.style.left = '-30000px';
  host.style.top = '0';
  host.style.width = `${cloneWidth}px`;
  host.style.height = 'auto';
  host.style.overflow = 'visible';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';

  const wrapper = document.createElement('div');
  wrapper.className = sourceWrapper instanceof HTMLElement
    ? sourceWrapper.className
    : 'event-history-wrapper';
  copyHistoryCssCustomProperties(sourceWrapper, wrapper);

  const shell = document.createElement('div');
  shell.className = 'event-history history-export-shell';
  shell.style.width = `${cloneWidth}px`;
  shell.style.padding = '0';
  shell.style.margin = '0';
  shell.style.overflow = 'visible';

  const cloneList = listEl.cloneNode(false);
  cloneList.classList.add('history-export-list');
  cloneList.style.width = `${cloneWidth}px`;
  cloneList.style.marginTop = '0';
  cloneList.style.overflow = 'visible';
  cloneList.style.pointerEvents = 'none';
  copyHistoryCssCustomProperties(listEl, cloneList);

  rows.forEach((row) => {
    const clonedRow = row.cloneNode(true);
    syncHistoryExportCloneImagesWithSource(row, clonedRow);
    sanitizeHistoryExportClone(clonedRow);
    cloneList.appendChild(clonedRow);
  });

  shell.appendChild(cloneList);
  wrapper.appendChild(shell);
  host.appendChild(wrapper);
  document.body.appendChild(host);

  await waitHistoryNextPaint();
  await waitForHistoryExportAssets(cloneList, {
    maxWaitMs: ports.capturePolicy.getHistoryCaptureDeviceTier() === 'phone' ? 3600 : 2800,
    maxImages: Math.max(120, Math.min(900, cloneList.querySelectorAll('img').length + 80))
  });
  await preloadHistoryImageUrlsForCapture(cloneList, {
    maxImages: Math.max(160, Math.min(1000, cloneList.querySelectorAll('img').length + 100)),
    concurrency: ports.capturePolicy.getHistoryCaptureDeviceTier() === 'desktop' ? 12 : 6,
    timeoutMs: ports.capturePolicy.getHistoryCaptureDeviceTier() === 'phone' ? 9000 : 7000
  });
  await waitHistoryNextPaint();

  const rect = cloneList.getBoundingClientRect();
  return {
    host,
    target: cloneList,
    width: Math.max(1, Math.ceil(cloneList.scrollWidth || cloneList.clientWidth || rect.width || cloneWidth)),
    height: Math.max(1, Math.ceil(cloneList.scrollHeight || cloneList.clientHeight || rect.height || 1))
  };
};


return {
  waitHistoryNextPaint,
  prewarmHistoryExportSourceRows,
  prepareHistoryExportClone,
  waitForHistoryExportAssets,
  preloadHistoryImageUrlsForCapture,
  HISTORY_CAPTURE_IMAGE_PLACEHOLDER,
};
}
