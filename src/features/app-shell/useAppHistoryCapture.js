import { ref, computed, nextTick } from "vue";

/** Owns application history capture with per-instance state and explicit peer interfaces. */
export function useAppHistoryCapture(ports = {}) {
const exportBirthdayRowsInPng = ref(true);

const isScreenshotExporting = ref(false);

const screenshotStatusText = ref('');

const screenshotExportModalVisible = ref(false);

const screenshotExportModalState = ref('idle');

const screenshotExportModalTitle = ref('');

const screenshotExportModalMessage = ref('');

const screenshotExportModalRetryTask = ref(null);

const screenshotExportModalCancelTask = ref(null);

const showScreenshotConfirmPanel = ref(false);

const screenshotExportFileName = ref('');

const screenshotConfirmRange = ref({ firstId: '', lastId: '' });

const screenshotRangeStartId = ref('');

const screenshotRangeEndId = ref('');

let screenshotExportModalAutoCloseTimer = null;
let activeScreenshotExportContext = null;

const screenshotConfirmRangeText = computed(() => {
  const firstId = String(screenshotRangeStartId.value || screenshotConfirmRange.value.firstId || '').trim();
  const lastId = String(screenshotRangeEndId.value || screenshotConfirmRange.value.lastId || '').trim();
  if (!firstId || !lastId) return '';
  return `${firstId}~${lastId}`;
});

const normalizeRangeEventIdInput = (value) => String(value || '').replace(/\D+/g, '').trim();

const clearScreenshotExportModalAutoClose = () => {
  if (!screenshotExportModalAutoCloseTimer) return;
  clearTimeout(screenshotExportModalAutoCloseTimer);
  screenshotExportModalAutoCloseTimer = null;
};

const setScreenshotExportModalState = ({ state = 'capturing', title = '', message = '', retryTask = null, cancelTask = null, autoCloseMs = 0 } = {}) => {
  clearScreenshotExportModalAutoClose();
  screenshotExportModalVisible.value = true;
  screenshotExportModalState.value = state;
  screenshotExportModalTitle.value = title;
  screenshotExportModalMessage.value = message;
  screenshotExportModalRetryTask.value = typeof retryTask === 'function' ? retryTask : null;
  screenshotExportModalCancelTask.value = typeof cancelTask === 'function' ? cancelTask : null;
  if (autoCloseMs > 0) {
    screenshotExportModalAutoCloseTimer = setTimeout(() => {
      screenshotExportModalVisible.value = false;
      screenshotExportModalAutoCloseTimer = null;
    }, autoCloseMs);
  }
};

const closeScreenshotExportModal = () => {
  if (isScreenshotExporting.value && screenshotExportModalState.value !== 'failed') return;
  clearScreenshotExportModalAutoClose();
  screenshotExportModalVisible.value = false;
  screenshotExportModalState.value = 'idle';
  screenshotExportModalTitle.value = '';
  screenshotExportModalMessage.value = '';
  screenshotExportModalRetryTask.value = null;
  screenshotExportModalCancelTask.value = null;
};

const forceCancelScreenshotExport = () => {
  const task = screenshotExportModalCancelTask.value;
  if (typeof task === 'function') {
    task();
  }
  isScreenshotExporting.value = false;
  clearScreenshotExportModalAutoClose();
  screenshotExportModalVisible.value = false;
  screenshotExportModalState.value = 'idle';
  screenshotExportModalTitle.value = '';
  screenshotExportModalMessage.value = '';
  screenshotExportModalRetryTask.value = null;
  screenshotExportModalCancelTask.value = null;
};

const retryScreenshotExport = async () => {
  if (isScreenshotExporting.value) return;
  const task = screenshotExportModalRetryTask.value;
  if (typeof task !== 'function') return;
  screenshotExportModalRetryTask.value = null;
  await task();
};

const applyHistoryCaptureProgress = (status, options = {}) => {
  const stage = String(status?.stage || status?.state || '').trim();
  const message = String(status?.message || '').trim();
  if (stage === 'retrying') {
    setScreenshotExportModalState({
      state: 'retrying',
      title: '失败降级重试中',
      message: message || '截图失败，正在降级重试...',
      cancelTask: options?.cancelTask || null
    });
    return;
  }
  if (stage === 'capturing') {
    setScreenshotExportModalState({
      state: options?.fromRetry ? 'retrying' : 'capturing',
      title: options?.fromRetry ? '重新截图中' : '截图中',
      message: message || '正在导出「预测活动」...',
      cancelTask: options?.cancelTask || null
    });
    return;
  }
  if (stage === 'success') {
    setScreenshotExportModalState({
      state: 'success',
      title: '截图完成',
      message: message || '预测截图导出成功。',
      cancelTask: null,
      autoCloseMs: 1400
    });
  }
};

const createScreenshotExportCancelContext = () => {
  let resolveCancel = null;
  let cancelled = false;
  const cancelPromise = new Promise((resolve) => {
    resolveCancel = resolve;
  });
  return {
    cancelPromise,
    isCancelled: () => cancelled,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      if (typeof resolveCancel === 'function') {
        resolveCancel(true);
      }
    }
  };
};

const prepareScreenshotExport = async () => {
  const sourceName = String(ports.predictionSources.activePredictSourceName.value || '').trim() || '预测数据源';
  const userName = ports.predictionFiles.sanitizeExportFileName(ports.predictionSources.normalizeUserName(ports.predictionSources.predictUserName.value));
  const defaultBaseName = ports.predictionFiles.sanitizeExportFileName(`pjsk-${userName}-${sourceName}-预测截图`);
  const switchedToHistory = ports.tabCatalog.currentTab.value !== 'history';

  if (switchedToHistory) {
    ports.tabNavigation.setCurrentTab('history');
    await nextTick();
  }

  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (switchedToHistory) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  const instance = ports.tabNavigation.tabComponentRef.value;
  if (!instance || typeof instance.exportPredictedRangePng !== 'function') {
    return { ok: false, message: '历史页面尚未准备完成，请稍后重试。' };
  }
  if (typeof instance.getPredictedExportRangeInfo !== 'function') {
    return { ok: false, message: '历史页面尚未准备完成，请稍后重试。' };
  }

  const rangeInfo = instance.getPredictedExportRangeInfo(!!exportBirthdayRowsInPng.value);
  if (!rangeInfo?.ok) {
    return { ok: false, message: rangeInfo?.message || '导出失败，请稍后重试。' };
  }

  return {
    ok: true,
    defaultBaseName,
    firstId: String(rangeInfo.firstEventId || '').trim(),
    lastId: String(rangeInfo.lastEventId || '').trim()
  };
};

const openScreenshotExportConfirm = async () => {
  if (isScreenshotExporting.value) return;
  ports.sourceMenu.renameSourceTargetId.value = '';
  ports.sourceMenu.renameSourceDraftName.value = '';
  ports.sourceMenu.showCreateSourceConfirmPanel.value = false;
  screenshotStatusText.value = '正在准备截图范围...';
  try {
    const prepared = await prepareScreenshotExport();
    if (!prepared.ok) {
      alert(prepared.message || '导出失败，请稍后重试。');
      showScreenshotConfirmPanel.value = false;
      screenshotStatusText.value = '';
      return;
    }
    screenshotConfirmRange.value = { firstId: prepared.firstId, lastId: prepared.lastId };
    screenshotRangeStartId.value = prepared.firstId;
    screenshotRangeEndId.value = prepared.lastId;
    screenshotExportFileName.value = prepared.defaultBaseName;
    showScreenshotConfirmPanel.value = true;
    screenshotStatusText.value = '';
  } catch (error) {
    console.error('准备截图导出失败', error);
    alert('导出失败，请稍后重试。');
    showScreenshotConfirmPanel.value = false;
    screenshotStatusText.value = '';
  }
};

const cancelScreenshotExport = () => {
  if (isScreenshotExporting.value) return;
  showScreenshotConfirmPanel.value = false;
  screenshotRangeStartId.value = '';
  screenshotRangeEndId.value = '';
};

const buildScreenshotExportRequest = () => {
  const sourceName = String(ports.predictionSources.activePredictSourceName.value || '').trim() || '预测数据源';
  const userName = ports.predictionFiles.sanitizeExportFileName(ports.predictionSources.normalizeUserName(ports.predictionSources.predictUserName.value));
  const defaultBaseName = ports.predictionFiles.sanitizeExportFileName(`pjsk-${userName}-${sourceName}-预测截图`);
  const fileBaseName = ports.predictionFiles.sanitizeExportFileName(String(screenshotExportFileName.value || '').trim() || defaultBaseName);
  const rangeStartId = normalizeRangeEventIdInput(screenshotRangeStartId.value || screenshotConfirmRange.value.firstId);
  const rangeEndId = normalizeRangeEventIdInput(screenshotRangeEndId.value || screenshotConfirmRange.value.lastId);

  if (!rangeStartId || !rangeEndId) {
    return { ok: false, message: '请输入有效的起止活动ID。', payload: null };
  }

  const predictableRange = ports.predictionSchedule.getPredictableEventIdRange();
  if (!predictableRange.ok) {
    return { ok: false, message: '当前没有可预测活动，无法导出截图。', payload: null };
  }

  const startNum = Number(rangeStartId);
  const endNum = Number(rangeEndId);
  const minSelected = Math.min(startNum, endNum);
  const maxSelected = Math.max(startNum, endNum);
  if (minSelected < predictableRange.minId || maxSelected > predictableRange.maxId) {
    return {
      ok: false,
      message: `活动ID需在可预测范围内：${predictableRange.minId}~${predictableRange.maxId}`,
      payload: null
    };
  }

  return {
    ok: true,
    message: '',
    payload: {
      includeBirthdayRows: !!exportBirthdayRowsInPng.value,
      fileBaseName,
      experimentalHQ: false,
      rangeStartId,
      rangeEndId
    }
  };
};

const runScreenshotExport = async (payload, options = {}) => {
  const requestPayload = payload && typeof payload === 'object' ? payload : null;
  if (!requestPayload) return { ok: false, message: '导出参数无效。' };

  isScreenshotExporting.value = true;
  const cancelContext = createScreenshotExportCancelContext();
  activeScreenshotExportContext = cancelContext;
  const isCurrentCapture = () => activeScreenshotExportContext === cancelContext && !cancelContext.isCancelled();
  setScreenshotExportModalState({
    state: options?.fromRetry ? 'retrying' : 'capturing',
    title: options?.fromRetry ? '重新截图中' : '截图中',
    message: '正在准备导出范围...',
    cancelTask: cancelContext.cancel
  });

  try {
    const switchedToHistory = ports.tabCatalog.currentTab.value !== 'history';
    if (switchedToHistory) {
      ports.tabNavigation.setCurrentTab('history');
      await nextTick();
    }

    await nextTick();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (switchedToHistory) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    if (!isCurrentCapture()) return { ok: false, message: '已取消截图。' };
    const instance = ports.tabNavigation.tabComponentRef.value;
    if (!instance || typeof instance.exportPredictedRangePng !== 'function') {
      setScreenshotExportModalState({
        state: 'failed',
        title: '截图失败',
        message: '历史页面尚未准备完成，请稍后重试。可能是渲染问题，再试一次没准行，这次你一定要成功。',
        retryTask: () => runScreenshotExport(requestPayload, { fromRetry: true }),
        cancelTask: null
      });
      return { ok: false, message: '历史页面尚未准备完成，请稍后重试。' };
    }

    const result = await instance.exportPredictedRangePng({
      ...requestPayload,
      cancelPromise: cancelContext.cancelPromise,
      isCancelled: cancelContext.isCancelled,
      onStatus: (status) => {
        if (isCurrentCapture()) applyHistoryCaptureProgress(status, { fromRetry: !!options?.fromRetry, cancelTask: cancelContext.cancel });
      }
    });

    if (!isCurrentCapture() || result?.cancelled) {
      return { ok: false, message: '已取消截图。' };
    }

    if (!result?.ok) {
      const failedMessage = result?.message || '导出失败，可能是渲染问题，再试一次没准行，这次你一定要成功。';
      setScreenshotExportModalState({
        state: 'failed',
        title: '截图失败',
        message: failedMessage,
        retryTask: () => runScreenshotExport(requestPayload, { fromRetry: true }),
        cancelTask: null
      });
      return { ok: false, message: failedMessage };
    }

    showScreenshotConfirmPanel.value = false;
    screenshotRangeStartId.value = '';
    screenshotRangeEndId.value = '';
    setScreenshotExportModalState({
      state: 'success',
      title: '截图完成',
      message: '预测截图导出成功。',
      cancelTask: null,
      autoCloseMs: 1400
    });
    return { ok: true, message: '' };
  } catch (error) {
    if (!isCurrentCapture()) return { ok: false, message: '已取消截图。' };
    console.error('导出预测截图失败', error);
    const failedMessage = '导出失败，可能是渲染问题，再试一次没准行，这次你一定要成功。';
    setScreenshotExportModalState({
      state: 'failed',
      title: '截图失败',
      message: failedMessage,
      retryTask: () => runScreenshotExport(requestPayload, { fromRetry: true }),
      cancelTask: null
    });
    return { ok: false, message: failedMessage };
  } finally {
    if (activeScreenshotExportContext === cancelContext) {
      activeScreenshotExportContext = null;
      if (screenshotExportModalCancelTask.value === cancelContext.cancel) {
        screenshotExportModalCancelTask.value = null;
      }
      isScreenshotExporting.value = false;
    }
  }
};

const confirmScreenshotExport = async () => {
  if (isScreenshotExporting.value) return;
  const request = buildScreenshotExportRequest();
  if (!request.ok) {
    alert(request.message || '导出参数不正确，请检查后重试。');
    return;
  }
  await runScreenshotExport(request.payload, { fromRetry: false });
};

return {
exportBirthdayRowsInPng,
isScreenshotExporting,
screenshotStatusText,
screenshotExportModalVisible,
screenshotExportModalState,
screenshotExportModalTitle,
screenshotExportModalMessage,
screenshotExportModalRetryTask,
screenshotExportModalCancelTask,
showScreenshotConfirmPanel,
screenshotExportFileName,
screenshotConfirmRange,
screenshotRangeStartId,
screenshotRangeEndId,
get screenshotExportModalAutoCloseTimer() { return screenshotExportModalAutoCloseTimer; }, set screenshotExportModalAutoCloseTimer(value) { screenshotExportModalAutoCloseTimer = value; },
screenshotConfirmRangeText,
normalizeRangeEventIdInput,
clearScreenshotExportModalAutoClose,
setScreenshotExportModalState,
closeScreenshotExportModal,
forceCancelScreenshotExport,
retryScreenshotExport,
applyHistoryCaptureProgress,
createScreenshotExportCancelContext,
prepareScreenshotExport,
openScreenshotExportConfirm,
cancelScreenshotExport,
buildScreenshotExportRequest,
runScreenshotExport,
confirmScreenshotExport
};
}
