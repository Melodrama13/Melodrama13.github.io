import { createRenderTaskTracker, PENDING_RENDER_BUSY_WAIT_MS, getCaptureReadyTimeoutMs, buildRenderAttemptTimeouts, withRenderTimeout, waitForRenderTimeoutOutcome, RENDER_TASK_SETTLE_GRACE_MS, shouldRunCaptureRecoveryPreload } from '../../utils/songCapturePolicy.js';
import { getCaptureDeviceTier, countHeavyMediaNodes, buildCapturePixelRatioPlan, isEventLikeCaptureError } from './songCapturePolicy.js';
import { createCaptureCancelContext, isCaptureRenderTimeoutError, isCaptureCancelledError } from '../../services/capture/captureTaskControl.js';
import { waitForCaptureAssetsReady } from '../../services/capture/captureAssetReadiness.js';
import { preloadImageUrlsForCapture } from './songCapturePreload.js';
import { freezeCaptureCssVariables, hideUnreadyCaptureImages } from '../../services/capture/captureElementState.js';
import { waitNextPaint } from './songFormatters.js';
import { runCaptureRenderAttempts } from '../../services/capture/captureRenderAttempts.js';
import { renderCaptureToCanvas as toCanvas, renderHtmlCapture } from '../../services/capture/captureEngineLoader.js';
import { CAPTURE_IMAGE_PLACEHOLDER } from './songCaptureClone.js';
import { formatExportTimestamp, sanitizeExportFileName, triggerDownloadPng } from './songCaptureFiles.js';
import { getSiteMediaRecovery } from '../../utils/mediaImageRecovery.js';
import { getCaptureBackgroundColor } from '../../services/capture/captureStyleContext.js';

/** Per-instance state owned by SongElementCapture. */
export function createSongElementCaptureState() {
const songCaptureRenderTracker = createRenderTaskTracker();
return { songCaptureRenderTracker };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongElementCapture({
  songCaptureRenderTracker,
  setSongExportModalState,
  prepareSongExportClone,
  screenshotModalCancelTask
}) {
const waitPendingSongCaptureRenderTask = (maxWaitMs = 0) => songCaptureRenderTracker.wait(maxWaitMs);

const startSongCaptureRenderTask = (createTask) => songCaptureRenderTracker.start(createTask);

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

const hideExportControlsForLiveCapture = (rootEl) => {
  if (!(rootEl instanceof HTMLElement)) {
    return () => {};
  }
  const selectors = [
    '.song-export-btn',
    '.song-role-card-tools',
    '.song-oc-event-unit-tools',
    '.anvo-mode-switch',
    '.song-mini-icon-btn'
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
  if (!(targetEl instanceof HTMLElement)) return false;
  return targetEl.classList.contains('song-role-card')
    || targetEl.classList.contains('song-oc-event-unit-card');
};

const exportElementPng = async (targetEl, title, options = {}) => {
  const exportToken = options?.exportToken;
  const setModal = (payload) => setSongExportModalState(exportToken, payload);
  const previousIdle = await waitPendingSongCaptureRenderTask(PENDING_RENDER_BUSY_WAIT_MS);
  if (!previousIdle) {
    setModal({
      state: 'failed',
      title: '截图暂不可用',
      message: '上一轮渲染仍在收尾，请稍后重试。',
      retryTask: typeof options?.retryTask === 'function' ? options.retryTask : null,
      cancelTask: null
    });
    return;
  }
  const exportLabel = String(options?.taskLabel || title || '当前模块');
  const deviceTier = getCaptureDeviceTier();
  const captureLiveElement = shouldCaptureLiveElementForExport(targetEl, options);
  const cancelContext = createCaptureCancelContext();
  const exportStartAt = performance.now();
  const formatElapsed = () => `${Math.max(0, Math.round(performance.now() - exportStartAt))}ms`;

  setModal({
    state: 'capturing',
    title: '截图中',
    message: '[初始化] 正在准备捕获 ' + exportLabel,
    cancelTask: cancelContext.cancel
  });

  let cloneEl = null;
  let restoreFrozenCssVars = () => {};
  let restoreHiddenLiveControls = () => {};
  const sourceImageHints = new Map();
  try {
    await getSiteMediaRecovery().prepareForCapture(targetEl, cancelContext);
    const sourceImages = Array.from(targetEl.querySelectorAll('img'));
    sourceImages.forEach((imgEl) => {
      if (!(imgEl instanceof HTMLImageElement)) return;
      sourceImageHints.set(imgEl, ['loading', 'decoding', 'fetchpriority'].map(name => [name, imgEl.getAttribute(name)]));
      imgEl.setAttribute('loading', 'eager');
      imgEl.setAttribute('decoding', 'sync');
      if ('fetchPriority' in imgEl) {
        imgEl.fetchPriority = 'high';
      }
    });

    await waitForCaptureAssetsReady(targetEl, {
      maxWaitMs: getCaptureReadyTimeoutMs({ deviceTier, phase: 'source' }),
      maxImages: Math.max(120, Math.min(1200, sourceImages.length + 80))
    });
    await preloadImageUrlsForCapture(targetEl, {
      maxImages: Math.max(120, Math.min(900, sourceImages.length + 60)),
      concurrency: deviceTier === 'desktop' ? 12 : 6,
      timeoutMs: deviceTier === 'phone' ? 9000 : 7000
    });

    if (cancelContext.isCancelled()) {
      throw new Error('export-cancelled');
    }

    setModal({
      state: 'capturing',
      title: '截图中',
      message: captureLiveElement ? '[布局中] 正在使用页面实时布局...' : '[克隆中] 正在准备导出布局...',
      cancelTask: cancelContext.cancel
    });

    if (!captureLiveElement) {
      cloneEl = await prepareSongExportClone(targetEl);
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
      maxWaitMs: getCaptureReadyTimeoutMs({ deviceTier, phase: 'clone' }),
      maxImages: Math.max(180, Math.min(1400, cloneImages.length + 120))
    });
    await preloadImageUrlsForCapture(renderEl, {
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
    const heavyMediaCount = countHeavyMediaNodes(renderEl);
    const pixelRatioPlan = buildCapturePixelRatioPlan(deviceTier);
    const renderAttemptBudgets = buildRenderAttemptTimeouts({
      deviceTier,
      heavyMediaCount,
      width,
      height,
      pixelRatioPlan
    });

    const canvas = await runCaptureRenderAttempts({
      attemptCount: renderAttemptBudgets.length,
      prepareAttempt: (attemptIdx) => {
        const { pixelRatio, timeoutMs: renderTimeoutMs } = renderAttemptBudgets[attemptIdx];
        const canvasWidth = Math.max(1, Math.round(width * pixelRatio));
        const canvasHeight = Math.max(1, Math.round(height * pixelRatio));

        setModal({
          state: 'capturing',
          title: '截图中',
          message: `[渲染中] ${exportLabel}（${width}x${height}，像素比 x${pixelRatio.toFixed(2)}，尝试 ${attemptIdx + 1}/${renderAttemptBudgets.length}）`,
          cancelTask: cancelContext.cancel
        });
        return { canvasWidth, canvasHeight, renderTimeoutMs };
      },
      renderAttempt: async ({ canvasWidth, canvasHeight, renderTimeoutMs }) => {
        const renderTask = startSongCaptureRenderTask(() => options?.useHtmlCanvas
          ? renderHtmlCapture(renderEl, {
            backgroundColor: getCaptureBackgroundColor(renderEl),
            width,
            height,
            scale: canvasWidth / width,
            useCORS: true,
            allowTaint: false,
            logging: false
          })
          : toCanvas(renderEl, {
          backgroundColor: getCaptureBackgroundColor(renderEl),
          width,
          height,
          canvasWidth,
          canvasHeight,
          pixelRatio: 1,
          skipFonts: false,
          cacheBust: false,
          skipAutoScale: true,
          imagePlaceholder: CAPTURE_IMAGE_PLACEHOLDER,
          filter: (node) => {
            if (node.classList && node.classList.contains('nav-cutoff-controls')) {
              return false;
            }
            return true;
          }
        }));
        return await withRenderTimeout(renderTask, renderTimeoutMs, cancelContext.cancelPromise);
      },
      handleAttemptError: async (renderError, _attemptContext, attemptIdx) => {
        if (isCaptureRenderTimeoutError(renderError)) {
          const timeoutOutcome = await waitForRenderTimeoutOutcome({
            isCancelled: cancelContext.isCancelled,
            waitForSettle: waitPendingSongCaptureRenderTask,
            maxWaitMs: RENDER_TASK_SETTLE_GRACE_MS
          });
          if (timeoutOutcome === 'cancelled') {
            throw new Error('export-cancelled');
          }
          if (timeoutOutcome === 'timed-out') {
            throw renderError;
          }
        }
        if (shouldRunCaptureRecoveryPreload({
          eventLike: isEventLikeCaptureError(renderError),
          attemptIndex: attemptIdx,
          attemptCount: renderAttemptBudgets.length
        })) {
          hideUnreadyCaptureImages(renderEl);
          await preloadImageUrlsForCapture(renderEl, {
            maxImages: 520,
            concurrency: 4,
            timeoutMs: 9000
          });
          await waitNextPaint();
        }
      }
    });

    setModal({
      state: 'exporting',
      title: '导出图片',
      message: '[编码中] 正在生成 PNG 文件...',
      cancelTask: cancelContext.cancel
    });

    const ts = typeof formatExportTimestamp === 'function' ? formatExportTimestamp() : Date.now();
    const safeTitle = typeof sanitizeExportFileName === 'function' ? sanitizeExportFileName(`${title}_${ts}`) : `${title}_${ts}`;

    await triggerDownloadPng(canvas, safeTitle, cancelContext.isCancelled);
    if (cancelContext.isCancelled()) throw new Error('export-cancelled');

    setModal({
      state: 'success',
      title: '导出成功',
      message: `【${exportLabel}】已导出 PNG（耗时 ${formatElapsed()}）`,
      cancelTask: null,
      autoCloseMs: 1400
    });
  } catch (error) {
    if (isCaptureCancelledError(error)) {
      setModal({
        state: 'idle',
        title: '',
        message: '',
        cancelTask: null
      });
      return;
    }
    const detail = getCaptureErrorText(error);
    console.error('导出失败:', error);
    setModal({
      state: 'failed',
      title: '截图失败',
      message: '[失败] 导出发生错误: ' + detail.text,
      retryTask: typeof options?.retryTask === 'function' ? options.retryTask : null,
      cancelTask: null
    });
  } finally {
    for (const [image, hints] of sourceImageHints) for (const [name, value] of hints) {
      if (value === null) image.removeAttribute(name); else image.setAttribute(name, value);
    }
    restoreFrozenCssVars();
    restoreHiddenLiveControls();
    if (screenshotModalCancelTask.value === cancelContext.cancel) {
      screenshotModalCancelTask.value = null;
    }
    if (cloneEl) {
      const cloneHost = cloneEl.parentNode;
      if (cloneHost instanceof HTMLElement && cloneHost.classList.contains('song-export-clone-host')) {
        cloneHost.remove();
      } else if (cloneEl.parentNode) {
        cloneEl.parentNode.removeChild(cloneEl);
      }
    }
  }
};

return { waitPendingSongCaptureRenderTask, startSongCaptureRenderTask, getCaptureErrorText, hideExportControlsForLiveCapture, shouldCaptureLiveElementForExport, exportElementPng };
}
