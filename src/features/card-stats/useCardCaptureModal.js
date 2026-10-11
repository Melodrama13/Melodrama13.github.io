import { ref } from 'vue';

/** Owns card capture modal behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardCaptureModal(inputs) {
  const isExportingPng = ref(false);

  const screenshotModalVisible = ref(false);

  const screenshotModalState = ref('idle');

  const screenshotModalTitle = ref('');

  const screenshotModalMessage = ref('');

  const screenshotModalRetryTask = ref(null);

  const screenshotModalCancelTask = ref(null);

  let screenshotModalAutoCloseTimer = 0;

  const clearScreenshotModalAutoClose = () => {
    if (!screenshotModalAutoCloseTimer) return;
    clearTimeout(screenshotModalAutoCloseTimer);
    screenshotModalAutoCloseTimer = 0;
  };

  const setScreenshotModalState = ({ state = 'capturing', title = '', message = '', retryTask = null, cancelTask = null, autoCloseMs = 0 } = {}) => {
    clearScreenshotModalAutoClose();
    screenshotModalVisible.value = true;
    screenshotModalState.value = state;
    screenshotModalTitle.value = title;
    screenshotModalMessage.value = message;
    screenshotModalRetryTask.value = typeof retryTask === 'function' ? retryTask : null;
    screenshotModalCancelTask.value = typeof cancelTask === 'function' ? cancelTask : null;
    if (autoCloseMs > 0) {
      screenshotModalAutoCloseTimer = setTimeout(() => {
        if (!isExportingPng.value) {
          screenshotModalVisible.value = false;
        }
        screenshotModalAutoCloseTimer = 0;
      }, autoCloseMs);
    }
  };

  const closeScreenshotModal = () => {
    if (isExportingPng.value && screenshotModalState.value !== 'failed') return;
    clearScreenshotModalAutoClose();
    screenshotModalVisible.value = false;
    screenshotModalState.value = 'idle';
    screenshotModalTitle.value = '';
    screenshotModalMessage.value = '';
    screenshotModalRetryTask.value = null;
    screenshotModalCancelTask.value = null;
  };

  const forceCancelScreenshotExport = () => {
    const task = screenshotModalCancelTask.value;
    if (typeof task === 'function') {
      task();
    }
    inputs.captureRendering.pendingCardCaptureRenderTask = null;
    isExportingPng.value = false;
    clearScreenshotModalAutoClose();
    screenshotModalVisible.value = false;
    screenshotModalState.value = 'idle';
    screenshotModalTitle.value = '';
    screenshotModalMessage.value = '';
    screenshotModalRetryTask.value = null;
    screenshotModalCancelTask.value = null;
  };

  const retryScreenshotExport = async () => {
    if (isExportingPng.value) return;
    const task = screenshotModalRetryTask.value;
    if (typeof task !== 'function') return;
    screenshotModalRetryTask.value = null;
    await task();
  };

  return {
    setScreenshotModalState,
    screenshotModalCancelTask,
    clearScreenshotModalAutoClose,
    screenshotModalRetryTask,
    isExportingPng,
    screenshotModalVisible,
    closeScreenshotModal,
    screenshotModalState,
    screenshotModalTitle,
    forceCancelScreenshotExport,
    screenshotModalMessage,
    retryScreenshotExport,
  };
}
