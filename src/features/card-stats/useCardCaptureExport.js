import { createCaptureCancelContext, isCaptureCancelledError, isCaptureRenderTimeoutError } from '../../services/capture/captureTaskControl.js';
import { waitForCaptureAssetsReady } from '../../services/capture/captureAssetReadiness.js';
import { freezeCaptureCssVariables, hideUnreadyCaptureImages } from '../../services/capture/captureElementState.js';
import { runCaptureRenderAttempts } from '../../services/capture/captureRenderAttempts.js';
import { renderCaptureToCanvas as toCanvas } from '../../services/capture/captureEngineLoader.js';

/** Owns card capture export behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardCaptureExport(inputs) {
  const sanitizeExportFileName = (name) => {
    const raw = String(name || '').trim();
    const cleaned = raw
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/[.\s]+$/g, '')
      .trim();
    return cleaned || 'pjsk_stats';
  };

  const formatExportTimestamp = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${y}${m}${d}_${hh}${mm}`;
  };

  const triggerDownloadPng = async (canvas, fileName, isCancelled) => {
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
    if (isCancelled()) throw new Error('export-cancelled');
    if (!blob) {
      throw new Error('toBlob failed');
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const waitNextPaint = () => new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

  const resolveExportElementById = (id) => {
    const targetId = String(id || '').trim();
    if (!targetId) return null;

    const exact = document.getElementById(targetId);
    if (!exact) return null;
    if (exact.classList.contains('card-panel') || exact.classList.contains('record-block') || exact.classList.contains('duo-unit-row') || exact.classList.contains('festival-card') || exact.classList.contains('lineup-card') || exact.classList.contains('support-card') || exact.classList.contains('attr-summary-card')) {
      return exact;
    }
    return exact.closest('.duo-unit-row, .record-block, .festival-card, .lineup-card, .support-card, .attr-summary-card, .card-panel');
  };

  const hideExportControlsForLiveCapture = (rootEl) => {
    if (!(rootEl instanceof HTMLElement)) {
      return () => {};
    }
    const selectors = [
      '.card-export-btn',
      '.lineup-toggle-btn',
      '.song-mini-icon-btn',
      '.floating-menu-btn',
      '.nav-collapse-fab'
    ].join(', ');
    const nodes = Array.from(rootEl.querySelectorAll(selectors));
    const touched = [];
    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      touched.push({ node, display: node.style.display });
      node.style.display = 'none';
    });
    return () => {
      touched.forEach((entry) => {
        if (!(entry?.node instanceof HTMLElement)) return;
        entry.node.style.display = entry.display || '';
      });
    };
  };

  const shouldCaptureLiveElementForExport = (targetEl, options = {}) => {
    if (options?.captureLiveElement === true) return true;
    return false;
  };

  const runExportElementPng = async (id, title, options = {}) => {
    const previousIdle = await inputs.captureRendering.waitPendingCardCaptureRenderTask(1200);
    if (!previousIdle) {
      inputs.captureRendering.forceReleaseCardCaptureRenderTask();
    }

    const targetEl = typeof id === 'string' ? (resolveExportElementById(id) || document.getElementById(id)) : id;
    if (!targetEl) return inputs.captureModal.setScreenshotModalState({ state: 'error', title: '错误', message: '未找到元素', cancelTask: null });

    const exportLabel = String(options?.taskLabel || title || '当前模块');
    const deviceTier = inputs.captureRendering.getCaptureDeviceTier();
    const captureLiveElement = shouldCaptureLiveElementForExport(targetEl, options);
    const cancelContext = createCaptureCancelContext();
    const exportStartAt = performance.now();
    const formatElapsed = () => `${Math.max(0, Math.round(performance.now() - exportStartAt))}ms`;

    inputs.captureModal.setScreenshotModalState({
      state: 'capturing',
      title: '截图中',
      message: '[初始化] 正在准备捕获 ' + exportLabel,
      cancelTask: cancelContext.cancel
    });

    let cloneEl = null;
    let restoreFrozenCssVars = () => {};
    let restoreHiddenLiveControls = () => {};
    try {
      const sourceImages = Array.from(targetEl.querySelectorAll('img'));
      sourceImages.forEach((imgEl) => {
        if (!(imgEl instanceof HTMLImageElement)) return;
        imgEl.setAttribute('loading', 'eager');
        imgEl.setAttribute('decoding', 'sync');
        if ('fetchPriority' in imgEl) {
          imgEl.fetchPriority = 'high';
        }
      });

      await waitForCaptureAssetsReady(targetEl, {
        maxWaitMs: deviceTier === 'phone' ? 3600 : 3000,
        maxImages: Math.max(120, Math.min(1200, sourceImages.length + 80))
      });
      await inputs.captureRendering.preloadImageUrlsForCapture(targetEl, {
        maxImages: Math.max(120, Math.min(900, sourceImages.length + 60)),
        concurrency: deviceTier === 'desktop' ? 12 : 6,
        timeoutMs: deviceTier === 'phone' ? 9000 : 7000
      });

      if (cancelContext.isCancelled()) {
        throw new Error('export-cancelled');
      }

      inputs.captureModal.setScreenshotModalState({
        state: 'capturing',
        title: '截图中',
        message: captureLiveElement ? '[布局中] 正在使用页面实时布局...' : '[克隆中] 正在准备导出布局...',
        cancelTask: cancelContext.cancel
      });

      if (!captureLiveElement) {
        cloneEl = await inputs.captureClone.prepareExportClone(targetEl);
      }
      const renderEl = cloneEl || targetEl;
      if (captureLiveElement) {
        restoreFrozenCssVars = freezeCaptureCssVariables(renderEl);
        restoreHiddenLiveControls = hideExportControlsForLiveCapture(renderEl);
      }

      const cloneImages = Array.from(renderEl.querySelectorAll('img'));
      cloneImages.forEach((imgEl) => {
        if (!(imgEl instanceof HTMLImageElement)) return;
        imgEl.setAttribute('loading', 'eager');
        imgEl.setAttribute('decoding', 'sync');
        if ('fetchPriority' in imgEl) {
          imgEl.fetchPriority = 'high';
        }
      });

      await waitForCaptureAssetsReady(renderEl, {
        maxWaitMs: deviceTier === 'phone' ? 4200 : 3400,
        maxImages: Math.max(180, Math.min(1400, cloneImages.length + 120))
      });
      await inputs.captureRendering.preloadImageUrlsForCapture(renderEl, {
        maxImages: Math.max(180, Math.min(1200, cloneImages.length + 100)),
        concurrency: deviceTier === 'desktop' ? 12 : 6,
        timeoutMs: deviceTier === 'phone' ? 9000 : 7000
      });

      await waitNextPaint();

      if (cancelContext.isCancelled()) {
        throw new Error('export-cancelled');
      }

      const width = Math.max(1, Math.ceil(renderEl.scrollWidth || renderEl.clientWidth || 0));
      const height = Math.max(1, Math.ceil(renderEl.scrollHeight || renderEl.clientHeight || 0));
      const heavyMediaCount = inputs.captureRendering.countHeavyMediaNodes(renderEl);
      const pixelRatioPlan = inputs.captureRendering.buildCapturePixelRatioPlan(deviceTier);
      const canvas = await runCaptureRenderAttempts({
        attemptCount: pixelRatioPlan.length,
        prepareAttempt: (attemptIdx) => {
          const pixelRatio = pixelRatioPlan[attemptIdx];
          const canvasWidth = Math.max(1, Math.round(width * pixelRatio));
          const canvasHeight = Math.max(1, Math.round(height * pixelRatio));
          const renderTimeoutMs = Math.min(
            56000,
            Math.max(12000, Math.round(inputs.captureRendering.computeRenderTimeoutMs({
              deviceTier,
              heavyMediaCount,
              width,
              height,
              scale: pixelRatio
            }) * (1.35 + (attemptIdx * 0.25))))
          );

          inputs.captureModal.setScreenshotModalState({
            state: 'capturing',
            title: '截图中',
            message: `[渲染中] ${exportLabel}（${width}x${height}，像素比 x${pixelRatio.toFixed(2)}，尝试 ${attemptIdx + 1}/${pixelRatioPlan.length}）`,
            cancelTask: cancelContext.cancel
          });
          return { canvasWidth, canvasHeight, renderTimeoutMs };
        },
        renderAttempt: async ({ canvasWidth, canvasHeight, renderTimeoutMs }) => {
          const renderTask = inputs.captureRendering.trackCardCaptureRenderTask(toCanvas(renderEl, {
            backgroundColor: '#ffffff',
            width,
            height,
            canvasWidth,
            canvasHeight,
            pixelRatio: 1,
            skipFonts: false,
            cacheBust: false,
            skipAutoScale: true,
            imagePlaceholder: inputs.captureRendering.CAPTURE_IMAGE_PLACEHOLDER,
            filter: (node) => {
              if (node.classList && node.classList.contains('nav-cutoff-controls')) {
                return false;
              }
              return true;
            }
          }));
          return await inputs.captureRendering.withRenderTimeout(renderTask, renderTimeoutMs, cancelContext.cancelPromise);
        },
        handleAttemptError: async (renderError) => {
          if (isCaptureRenderTimeoutError(renderError)) {
            inputs.captureRendering.forceReleaseCardCaptureRenderTask();
          }
          if (inputs.captureRendering.isEventLikeCaptureError(renderError)) {
            hideUnreadyCaptureImages(renderEl);
            await inputs.captureRendering.preloadImageUrlsForCapture(renderEl, {
              maxImages: 520,
              concurrency: 4,
              timeoutMs: 9000
            });
            await waitNextPaint();
          }
        }
      });

      inputs.captureModal.setScreenshotModalState({
        state: 'exporting',
        title: '导出图片',
        message: '[编码中] 正在生成 PNG 文件...',
        cancelTask: cancelContext.cancel
      });

      const ts = typeof formatExportTimestamp === 'function' ? formatExportTimestamp() : Date.now();
      const safeTitle = typeof sanitizeExportFileName === 'function' ? sanitizeExportFileName(`${title}_${ts}`) : `${title}_${ts}`;

      await triggerDownloadPng(canvas, safeTitle, cancelContext.isCancelled);
      if (cancelContext.isCancelled()) throw new Error('export-cancelled');

      inputs.captureModal.setScreenshotModalState({
        state: 'success',
        title: '导出成功',
        message: `【${exportLabel}】已导出 PNG（耗时 ${formatElapsed()}）`,
        cancelTask: null,
        autoCloseMs: 1400
      });
    } catch (error) {
      if (cancelContext.isCancelled() || isCaptureCancelledError(error)) {
        // The cancellation owner has already reset the modal. Late work must
        // neither reopen it nor overwrite a newer export's status.
        return;
      }
      if (isCaptureRenderTimeoutError(error)) {
        inputs.captureRendering.forceReleaseCardCaptureRenderTask();
      }
      const detail = inputs.captureRendering.getCaptureErrorText(error);
      console.error('导出失败:', error);
      inputs.captureModal.setScreenshotModalState({
        state: 'failed',
        title: '截图失败',
        message: '[失败] 导出发生错误: ' + detail.text,
        retryTask: typeof options?.retryTask === 'function' ? options.retryTask : null,
        cancelTask: null
      });
    } finally {
      restoreFrozenCssVars();
      restoreHiddenLiveControls();
      if (inputs.captureModal.screenshotModalCancelTask.value === cancelContext.cancel) {
        inputs.captureModal.screenshotModalCancelTask.value = null;
      }
      if (cloneEl) {
        const cloneHost = cloneEl.parentNode;
        if (cloneHost instanceof HTMLElement && cloneHost.classList.contains('export-clone-host')) {
          cloneHost.remove();
        } else if (cloneEl.parentNode) {
          cloneEl.parentNode.removeChild(cloneEl);
        }
      }
    }
  };

  const exportElementPng = async (id, title) => {
    await runExportElementPng(id, title, {
      retryTask: () => exportElementPng(id, title)
    });
  };

  return {
    waitNextPaint,
    exportElementPng,
  };
}
