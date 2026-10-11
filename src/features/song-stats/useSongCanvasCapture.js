import { createCaptureCancelContext, isCaptureCancelledError } from '../../services/capture/captureTaskControl.js';
import { formatExportTimestamp, sanitizeExportFileName, triggerDownloadPng } from './songCaptureFiles.js';

/** Per-instance state owned by SongCanvasCapture. */
export function createSongCanvasCaptureState() {
const canvasExportImageCache = new Map();
return { canvasExportImageCache };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongCanvasCapture({
  canvasExportImageCache,
  setSongExportModalState,
  anotherVocalCards,
  getAnvoFillExportWidth,
  getAnvoFillMetricsForWidth,
  anvoMaxSongCount,
  getCaptureErrorText,
  screenshotModalCancelTask
}) {
const loadImageForCanvasExport = (src, timeoutMs = 8000) => {
  const url = String(src || '').trim();
  if (!url) return Promise.resolve(null);
  if (canvasExportImageCache.has(url)) return canvasExportImageCache.get(url);

  const task = new Promise((resolve) => {
    const img = new Image();
    let timer = 0;
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(value);
    };
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    try {
      // Anvo's fill export draws these images directly onto a canvas.  They
      // must be fetched in CORS mode even when an equivalent image is already
      // visible in the page, otherwise toBlob() can fail with a tainted canvas
      // on the deployed site.
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.decoding = 'async';
      img.loading = 'eager';
    } catch (_) {
      // Ignore unsupported image hints.
    }
    timer = window.setTimeout(() => finish(null), timeoutMs);
    img.src = url;
  });
  canvasExportImageCache.set(url, task);
  void task.then((image) => {
    // A transient network failure must not poison every later export in the
    // same tab. Successful decoded images remain reusable.
    if (!image && canvasExportImageCache.get(url) === task) {
      canvasExportImageCache.delete(url);
    }
  });
  return task;
};

const getDisplayedCanvasExportImages = () => {
  const images = new Map();
  const root = document.getElementById('panel-another-vocal');
  if (!(root instanceof HTMLElement)) return images;
  root.querySelectorAll('img').forEach((img) => {
    if (!(img instanceof HTMLImageElement) || !img.complete || img.naturalWidth <= 0) return;
    const url = String(img.currentSrc || img.getAttribute('src') || '').trim();
    if (!url) return;
    let isSameOrigin = true;
    try {
      const parsed = new URL(url, window.location.href);
      isSameOrigin = parsed.origin === window.location.origin
        || ['data:', 'blob:'].includes(parsed.protocol);
    } catch (_) {
      isSameOrigin = true;
    }
    if (isSameOrigin || img.crossOrigin === 'anonymous') images.set(url, img);
  });
  return images;
};

const drawCanvasRoundRectPath = (ctx, x, y, width, height, radius) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const drawCanvasRoundedImage = (ctx, img, x, y, size, radius) => {
  if (!img) {
    drawCanvasRoundRectPath(ctx, x, y, size, size, radius);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('-', x + size / 2, y + size / 2);
    return;
  }

  const iw = img.naturalWidth || img.width || size;
  const ih = img.naturalHeight || img.height || size;
  const scale = Math.max(size / iw, size / ih);
  const sw = size / scale;
  const sh = size / scale;
  const sx = Math.max(0, (iw - sw) / 2);
  const sy = Math.max(0, (ih - sh) / 2);
  ctx.save();
  drawCanvasRoundRectPath(ctx, x, y, size, size, radius);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, size, size);
  ctx.restore();
};

const drawCanvasCircleImage = (ctx, img, cx, cy, radius) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
};

const exportAnvoFillCanvasPng = async (title, options = {}) => {
  const exportToken = options?.exportToken;
  const setModal = (payload) => setSongExportModalState(exportToken, payload);
  const cards = anotherVocalCards.value || [];
  if (!cards.length) {
    setModal({
      state: 'failed',
      title: '截图失败',
      message: '没有可导出的 Anvo 数据。'
    });
    return;
  }

  const cancelContext = createCaptureCancelContext();
  const exportLabel = String(options?.taskLabel || title || 'Anvo');
  const startedAt = performance.now();
  const width = getAnvoFillExportWidth();
  const metrics = getAnvoFillMetricsForWidth(width);
  const maxSongCount = Math.max(1, anvoMaxSongCount.value);
  const outerPad = 12;
  const titleHeight = 34;
  const cardTopPad = 4;
  const headHeight = Math.max(38, Math.min(48, metrics.size + 12));
  const rowHeight = metrics.size + metrics.dateHeight + metrics.gap + 2;
  const gridHeight = cardTopPad + headHeight + maxSongCount * rowHeight + 4;
  const height = outerPad * 2 + titleHeight + gridHeight;
  const pixelScale = 2;

  setModal({
    state: 'capturing',
    title: '截图中',
    message: `正在绘制 ${exportLabel} 铺满导出画布...`,
    cancelTask: cancelContext.cancel
  });

  try {
    const imageUrls = new Set();
    cards.forEach((card) => {
      if (card?.avatar) imageUrls.add(card.avatar);
      (card?.songs || []).forEach((song) => {
        if (song?.jacketUrl) imageUrls.add(song.jacketUrl);
      });
    });

    // Reuse already-decoded, CORS-safe images from the live Anvo panel first.
    // This avoids downloading hundreds of visible jackets for a second time.
    const imageMap = getDisplayedCanvasExportImages();
    const entries = [...imageUrls];
    const missingEntries = entries.filter((src) => !imageMap.has(src));
    let loadedCount = 0;
    let cursor = 0;
    const workerCount = Math.min(12, missingEntries.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (cursor < missingEntries.length) {
        const index = cursor;
        cursor += 1;
        if (cancelContext.isCancelled()) throw new Error('export-cancelled');
        const src = missingEntries[index];
        const img = await loadImageForCanvasExport(src, 10000);
        imageMap.set(src, img);
        loadedCount += 1;
        if (loadedCount % 60 === 0) {
          setModal({
            state: 'capturing',
            title: '截图中',
            message: `正在载入 Anvo 曲绘资源 ${loadedCount}/${missingEntries.length}`,
            cancelTask: cancelContext.cancel
          });
        }
      }
    });
    await Promise.allSettled(workers);

    if (cancelContext.isCancelled()) throw new Error('export-cancelled');

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * pixelScale);
    canvas.height = Math.ceil(height * pixelScale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas context unavailable');
    ctx.scale(pixelScale, pixelScale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title || 'Anvo', outerPad, outerPad + titleHeight / 2);

    const gridX = outerPad;
    const gridY = outerPad + titleHeight;
    const gridWidth = width - outerPad * 2;
    const gap = metrics.columnGap;
    const columnWidth = (gridWidth - gap * Math.max(0, cards.length - 1)) / cards.length;
    const jacketSize = Math.max(10, Math.min(metrics.size, columnWidth - metrics.columnPadding * 2));

    cards.forEach((card, index) => {
      const x = gridX + index * (columnWidth + gap);
      const y = gridY;
      drawCanvasRoundRectPath(ctx, x, y, columnWidth, gridHeight, 5);
      ctx.fillStyle = card?.tint || '#ffffff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const centerX = x + columnWidth / 2;
      const avatarSize = Math.max(16, Math.min(28, jacketSize));
      drawCanvasCircleImage(ctx, imageMap.get(card?.avatar) || null, centerX, y + cardTopPad + avatarSize / 2, avatarSize / 2);

      ctx.fillStyle = '#475569';
      ctx.font = `800 ${Math.max(10, Math.min(16, jacketSize / 2.2))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(card?.count ?? 0), centerX, y + cardTopPad + avatarSize + 12);

      let rowY = y + cardTopPad + headHeight;
      (card?.songs || []).forEach((song) => {
        const imgX = x + (columnWidth - jacketSize) / 2;
        drawCanvasRoundedImage(ctx, imageMap.get(song?.jacketUrl) || null, imgX, rowY, jacketSize, Math.min(6, jacketSize / 5));
        if (song?.releasedAtText) {
          ctx.fillStyle = '#334155';
          ctx.font = `700 ${Math.max(7, Math.min(10, metrics.dateHeight * 0.9))}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(String(song.releasedAtText), centerX, rowY + jacketSize + 1, columnWidth - 2);
        }
        rowY += rowHeight;
      });
    });

    setModal({
      state: 'exporting',
      title: '导出图片',
      message: '正在生成 PNG 文件...',
      cancelTask: cancelContext.cancel
    });

    const ts = typeof formatExportTimestamp === 'function' ? formatExportTimestamp() : Date.now();
    const safeTitle = typeof sanitizeExportFileName === 'function' ? sanitizeExportFileName(`${title || 'Anvo'}_${ts}`) : `${title || 'Anvo'}_${ts}`;
    await triggerDownloadPng(canvas, safeTitle, cancelContext.isCancelled);
    if (cancelContext.isCancelled()) throw new Error('export-cancelled');

    setModal({
      state: 'success',
      title: '导出成功',
      message: `【${exportLabel}】已导出 PNG（耗时 ${Math.max(0, Math.round(performance.now() - startedAt))}ms）`,
      cancelTask: null,
      autoCloseMs: 1400
    });
  } catch (error) {
    if (isCaptureCancelledError(error)) {
      setModal({ state: 'idle', title: '', message: '', cancelTask: null });
      return;
    }
    const detail = getCaptureErrorText(error);
    setModal({
      state: 'failed',
      title: '截图失败',
      message: 'Anvo 铺满导出发生错误：' + detail.text,
      retryTask: typeof options?.retryTask === 'function' ? options.retryTask : null,
      cancelTask: null
    });
  } finally {
    if (screenshotModalCancelTask.value === cancelContext.cancel) {
      screenshotModalCancelTask.value = null;
    }
  }
};

return { loadImageForCanvasExport, getDisplayedCanvasExportImages, drawCanvasRoundRectPath, drawCanvasRoundedImage, drawCanvasCircleImage, exportAnvoFillCanvasPng };
}
