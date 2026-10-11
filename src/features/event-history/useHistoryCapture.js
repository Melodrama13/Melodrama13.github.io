import { nextTick } from 'vue';
import { renderCaptureToCanvas as toCanvas } from '../../services/capture/captureEngineLoader.js';

/** Capture owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: CaptureRange, Navigation, ProgressiveRender, CapturePolicy, CaptureAssets.
 */
export function useHistoryCapture(ports) {
const getHistoryEventKeysFromExportRows = (rows) => {
  const keys = new Set();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!(row instanceof HTMLElement)) return;
    if (!row.classList.contains('event-item')) return;
    const idKey = ports.captureRange.parseEventIdFromDomId(row.id);
    if (idKey) keys.add(`event-${idKey}`);
  });
  return keys;
};

const exportPredictedRangePng = async (options = {}) => {
  const includeBirthdayRows = options?.includeBirthdayRows !== false;
  const onStatus = typeof options?.onStatus === 'function' ? options.onStatus : null;
  const cancelPromise = options?.cancelPromise || null;
  const isCancelled = typeof options?.isCancelled === 'function' ? options.isCancelled : (() => false);
  const { rows, error } = ports.captureRange.getExportRowsInRange(includeBirthdayRows, {
    rangeStartId: options?.rangeStartId,
    rangeEndId: options?.rangeEndId
  });
  if (error) return { ok: false, message: error };

  ports.navigation.finishEditorLayoutTransition();
  await nextTick();

  const listEl = ports.navigation.listRef.value;
  if (!listEl) return { ok: false, message: '历史列表尚未渲染完成。' };

  let exportClone = null;
  const previousProgressiveRenderKeys = new Set(ports.progressiveRender.progressiveEventRenderKeys.value);
  try {
    const deviceTier = ports.capturePolicy.getHistoryCaptureDeviceTier();
    ports.progressiveRender.addProgressiveEventRenderKeys(getHistoryEventKeysFromExportRows(rows));
    await nextTick();
    await ports.captureAssets.waitHistoryNextPaint();
    if (isCancelled()) {
      throw new Error('export-cancelled');
    }
    onStatus?.({
      state: 'capturing',
      stage: 'capturing',
      message: '正在预热截图资源...'
    });
    await ports.captureAssets.prewarmHistoryExportSourceRows(rows, deviceTier);
    await ports.captureAssets.waitHistoryNextPaint();
    exportClone = await ports.captureAssets.prepareHistoryExportClone(listEl, rows);
    if (!exportClone?.target) {
      return { ok: false, message: '导出截图准备失败。' };
    }

    const canvas = await (async () => {
      const renderTarget = exportClone.target;
      const bounds = {
        top: 0,
        width: exportClone.width,
        height: exportClone.height
      };
      const deviceScale = Number(window.devicePixelRatio || 1);
      const useExperimentalHQ = !!options?.experimentalHQ;
      const scales = ports.capturePolicy.buildHistoryScaleCandidates({
        bounds,
        deviceTier,
        deviceScale,
        useExperimentalHQ
      });
      if (isCancelled()) {
        throw new Error('export-cancelled');
      }
      const baseScale = Number(scales[0] || 1);
      onStatus?.({
        state: 'capturing',
        stage: 'capturing',
        baseScale,
        deviceTier,
        currentAttempt: 1,
        totalAttempts: scales.length,
        message: `正在导出「预测活动」... 基础清晰度 x${baseScale.toFixed(2)}`
      });

      let lastErr = null;
      for (let idx = 0; idx < scales.length; idx += 1) {
        const scale = scales[idx];
        if (isCancelled()) {
          throw new Error('export-cancelled');
        }
        if (idx > 0) {
          onStatus?.({
            state: 'retrying',
            stage: 'retrying',
            baseScale,
            deviceTier,
            currentAttempt: idx + 1,
            totalAttempts: scales.length,
            message: `截图失败，正在降级到清晰度 x${scale.toFixed(2)} 重试（${idx}/${Math.max(1, scales.length - 1)}）...`
          });
        }

        try {
          const timeoutMs = ports.capturePolicy.computeHistoryCaptureTimeoutMs({
            deviceTier,
            width: bounds.width,
            height: bounds.height,
            scale
          });
          await ports.captureAssets.waitForHistoryExportAssets(renderTarget, {
            maxWaitMs: deviceTier === 'phone' ? 3000 : 2400,
            maxImages: Math.max(120, Math.min(900, renderTarget.querySelectorAll('img').length + 80))
          });
          await ports.captureAssets.preloadHistoryImageUrlsForCapture(renderTarget, {
            maxImages: Math.max(160, Math.min(1000, renderTarget.querySelectorAll('img').length + 100)),
            concurrency: deviceTier === 'desktop' ? 12 : 6,
            timeoutMs: deviceTier === 'phone' ? 9000 : 7000
          });
          await ports.captureAssets.waitHistoryNextPaint();

          const canvasWidth = Math.max(1, Math.round(bounds.width * scale));
          const canvasHeight = Math.max(1, Math.round(bounds.height * scale));
          return await ports.capturePolicy.withCaptureTimeout(toCanvas(renderTarget, {
            backgroundColor: '#f4f7f6',
            width: bounds.width,
            height: bounds.height,
            canvasWidth,
            canvasHeight,
            pixelRatio: 1,
            skipFonts: false,
            cacheBust: false,
            skipAutoScale: true,
            imagePlaceholder: ports.captureAssets.HISTORY_CAPTURE_IMAGE_PLACEHOLDER
          }), timeoutMs, cancelPromise);
        } catch (err) {
          lastErr = err;
        }
      }

      throw lastErr || new Error('capture failed');
    })();

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const fallback = `pjsk-predict-snapshot-${y}${m}${d}`;
    const fileBaseName = ports.captureRange.sanitizeExportBaseName(options?.fileBaseName || fallback);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('toBlob failed'));
      }, 'image/png');
    });

    if (isCancelled()) throw new Error('export-cancelled');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileBaseName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    onStatus?.({
      state: 'success',
      stage: 'success',
      message: '预测截图导出成功。'
    });
    return { ok: true, message: '预测截图导出成功。' };
  } catch (err) {
    if (isCancelled() || String(err?.message || '').includes('export-cancelled')) {
      return { ok: false, cancelled: true, message: '已取消截图。' };
    }
    console.error('导出预测截图失败', err);
    onStatus?.({
      state: 'failed',
      stage: 'failed',
      message: '导出失败，可能是渲染问题，再试一次没准行，这次你一定要成功。'
    });
    return { ok: false, message: '导出失败，可能是渲染问题，再试一次没准行，这次你一定要成功。' };
  } finally {
    if (exportClone?.host instanceof HTMLElement) {
      exportClone.host.remove();
    }
    ports.progressiveRender.setProgressiveEventRenderKeys(previousProgressiveRenderKeys);
  }
};


return {
  exportPredictedRangePng,
};
}
