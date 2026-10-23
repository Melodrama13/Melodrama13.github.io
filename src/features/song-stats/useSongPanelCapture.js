import { nextTick } from 'vue';
import { waitNextPaint } from './songFormatters.js';
import { isViewportAtMost, UI_BREAKPOINTS } from '../../ui/breakpoints.js';

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongPanelCapture({
  isExportingPng,
  songExportLifecycle,
  activeSongExportToken,
  snapshotAnotherCardModes,
  snapshotDuoExpandedMap,
  snapshotVsSongCardModes,
  snapshotOcBookExpandedMap,
  setSongExportModalState,
  expandAnotherCardsForExport,
  expandVsSongCardsForExport,
  expandOcBookUnitsForExport,
  expandAllDuoCardsForExport,
  anotherImageMode,
  isAnvoFillModeActive,
  exportAnvoFillCanvasPng,
  exportElementPng,
  anotherCardModeMap,
  duoCardExpandedMap,
  vsSongCardModeMap,
  ocBookUnitExpandedMap
}) {
const exportSongPanelPng = async (panelId, title) => {
  if (isExportingPng.value) return;
  const exportToken = songExportLifecycle.begin();
  if (exportToken === null) return;
  activeSongExportToken.value = exportToken;
  isExportingPng.value = true;

  const prevAnotherModes = snapshotAnotherCardModes();
  const prevDuoExpanded = snapshotDuoExpandedMap();
  const prevVsSongModes = snapshotVsSongCardModes();
  const prevOcBookExpanded = snapshotOcBookExpandedMap();

  try {
    const targetEl = document.getElementById(panelId);
    if (!targetEl) {
      setSongExportModalState(exportToken, {
        state: 'failed',
        title: '截图失败',
        message: '未找到可导出的区域。'
      });
      return;
    }
    if (panelId === 'panel-another-vocal') {
      expandAnotherCardsForExport();
    } else if (panelId === 'panel-vs-song-stats') {
      expandVsSongCardsForExport();
    } else if (panelId === 'panel-oc-book-stats') {
      expandOcBookUnitsForExport();
    } else if (panelId === 'panel-duo-stats') {
      expandAllDuoCardsForExport();
    }

    await nextTick();
    await waitNextPaint();
    const useAnvoFillCanvasMode = panelId === 'panel-another-vocal'
      && !!anotherImageMode.value
      && (
        isViewportAtMost(Number(window?.innerWidth || 0), UI_BREAKPOINTS.tabletMax)
        || isAnvoFillModeActive.value
      );
    if (useAnvoFillCanvasMode) {
      await exportAnvoFillCanvasPng(title, {
        taskLabel: title,
        exportToken,
        retryTask: () => exportSongPanelPng(panelId, title)
      });
    } else {
      await exportElementPng(targetEl, title, {
        taskLabel: title,
        exportToken,
        // Keep both display modes consistent, including WebKit's large overviews.
        useHtmlCanvas: panelId === 'panel-cover-album-stats',
        retryTask: () => exportSongPanelPng(panelId, title)
      });
    }
  } catch (error) {
    console.error('导出乐曲统计 PNG 失败', error);
  } finally {
    anotherCardModeMap.value = prevAnotherModes;
    duoCardExpandedMap.value = prevDuoExpanded;
    vsSongCardModeMap.value = prevVsSongModes;
    ocBookUnitExpandedMap.value = prevOcBookExpanded;
    await nextTick();
    songExportLifecycle.finish(exportToken);
    if (activeSongExportToken.value === exportToken) {
      activeSongExportToken.value = null;
    }
    isExportingPng.value = false;
  }
};

return { exportSongPanelPng };
}
