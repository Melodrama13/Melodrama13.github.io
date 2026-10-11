import { computed, nextTick, ref } from "vue";
import { renderHtmlCapture as html2canvas } from '../../services/capture/captureEngineLoader.js';
import { ALL_PAGE_CONFIG_KEY } from './specialPredictionTextDefaults.js';

/** Owns special prediction capture with explicit instance dependencies. */
export function useSpecialCapture(ports = {}) {
const isExporting = ref(false);

const exportStatus = ref('');

let exportStatusTimer = null;

const hasRenderableRows = computed(() => (
  ports.sourceSelection.isMultiCaseMode.value ? ports.caseRows.monthlyMultiPages.value.length > 0 : ports.caseRows.renderedRows.value.length > 0
));

const sanitizeFileName = (value) => {
  const cleaned = String(value || '').trim().replace(/[\\/:*?"<>|]/g, '_').replace(/[.\s]+$/g, '');
  return cleaned || 'pjsk-predict';
};

const buildSpecialExportFileName = (sourceName, page, stamp) => [
  sanitizeFileName(sourceName),
  page ? sanitizeFileName(page.label) : '',
  stamp
].filter(Boolean).join('-') + '.png';

const captureSpecialCanvas = async (target) => {
  const exportWidth = Math.ceil(target.scrollWidth || target.getBoundingClientRect().width);
  const exportHeight = Math.ceil(target.scrollHeight || target.getBoundingClientRect().height);
  const canvas = await html2canvas(target, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
    imageTimeout: 12000,
    width: exportWidth,
    height: exportHeight,
    windowWidth: Math.max(document.documentElement.clientWidth, exportWidth),
    windowHeight: Math.max(document.documentElement.clientHeight, exportHeight)
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('toBlob failed'));
    }, 'image/png');
  });
};

const downloadSpecialBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const resolveMultiExportPages = (
  pages = ports.caseRows.monthlyMultiPages.value,
  pageKey = ports.pageAppearance.selectedPageConfigKey.value
) => (
  pageKey === ALL_PAGE_CONFIG_KEY
    ? pages
    : pages.filter((page) => page.key === pageKey)
);

const exportPng = async () => {
  const exportTargets = ports.sourceSelection.isMultiCaseMode.value
    ? resolveMultiExportPages()
      .map((page) => ({ page, target: ports.preview.multiCanvasElementMap.get(page.key) }))
      .filter((item) => !!item.target)
    : (ports.preview.canvasRef.value ? [{ page: null, target: ports.preview.canvasRef.value }] : []);
  if (exportTargets.length === 0 || !hasRenderableRows.value || isExporting.value) return;

  isExporting.value = true;
  exportStatus.value = ports.sourceSelection.isMultiCaseMode.value ? '正在生成月度 PNG...' : '正在生成 PNG...';
  const savedPreviewScale = ports.preview.previewScale.value;
  const clearExportStatusLater = () => {
    if (exportStatusTimer) window.clearTimeout(exportStatusTimer);
    exportStatusTimer = window.setTimeout(() => {
      exportStatus.value = '';
      exportStatusTimer = null;
    }, 10000);
  };
  try {
    ports.preview.previewScale.value = 1;
    await nextTick();
    if (document?.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const sourceName = sanitizeFileName(ports.sourceSelection.isMultiCaseMode.value
      ? `多分支-${ports.sourceSelection.selectedMultiSources.value.length}源`
      : (ports.sourceSelection.selectedSource.value?.name || 'source'));
    for (let index = 0; index < exportTargets.length; index += 1) {
      const { page, target } = exportTargets[index];
      if (ports.sourceSelection.isMultiCaseMode.value) {
        exportStatus.value = `正在生成 ${index + 1}/${exportTargets.length}：${page.label}`;
      }
      const blob = await captureSpecialCanvas(target);
      downloadSpecialBlob(blob, buildSpecialExportFileName(sourceName, page, stamp));
      if (index < exportTargets.length - 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
    exportStatus.value = ports.sourceSelection.isMultiCaseMode.value
      ? `已导出 ${exportTargets.length} 张月度 PNG。`
      : 'PNG 已导出。';
    clearExportStatusLater();
  } catch (error) {
    console.error('[special-predict] export failed', error);
    exportStatus.value = '导出失败，请稍后重试。';
    clearExportStatusLater();
  } finally {
    ports.preview.previewScale.value = savedPreviewScale;
    ports.preview.updatePreviewScale();
    isExporting.value = false;
  }
};

return { isExporting,
exportStatus,
get exportStatusTimer() { return exportStatusTimer; }, set exportStatusTimer(value) { exportStatusTimer = value; },
hasRenderableRows,
sanitizeFileName,
buildSpecialExportFileName,
captureSpecialCanvas,
downloadSpecialBlob,
resolveMultiExportPages,
exportPng };
}
