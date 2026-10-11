import { ref } from 'vue';
import { createExportLifecycle } from '../../utils/songCapturePolicy.js';

/** Per-instance state owned by SongCaptureModal. */
export function createSongCaptureModalState() {
const isExportingPng = ref(false);

const screenshotModalVisible = ref(false);

const screenshotModalState = ref('idle');

const screenshotModalTitle = ref('');

const screenshotModalMessage = ref('');

const screenshotModalRetryTask = ref(null);

const screenshotModalCancelTask = ref(null);

const screenshotModalAutoCloseTimer = ref(0);

const songExportLifecycle = createExportLifecycle();

const activeSongExportToken = ref(null);
return { isExportingPng, screenshotModalVisible, screenshotModalState, screenshotModalTitle, screenshotModalMessage, screenshotModalRetryTask, screenshotModalCancelTask, screenshotModalAutoCloseTimer, songExportLifecycle, activeSongExportToken };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongCaptureModal({
  isExportingPng,
  screenshotModalVisible,
  screenshotModalState,
  screenshotModalTitle,
  screenshotModalMessage,
  screenshotModalRetryTask,
  screenshotModalCancelTask,
  screenshotModalAutoCloseTimer,
  songExportLifecycle,
  activeSongExportToken
}) {
const clearScreenshotModalAutoClose = () => {
  if (!screenshotModalAutoCloseTimer.value) return;
  clearTimeout(screenshotModalAutoCloseTimer.value);
  screenshotModalAutoCloseTimer.value = 0;
};

const resetScreenshotModalState = () => {
  clearScreenshotModalAutoClose();
  screenshotModalVisible.value = false;
  screenshotModalState.value = 'idle';
  screenshotModalTitle.value = '';
  screenshotModalMessage.value = '';
  screenshotModalRetryTask.value = null;
  screenshotModalCancelTask.value = null;
};

const setScreenshotModalState = ({ state = 'capturing', title = '', message = '', retryTask = null, cancelTask = null, autoCloseMs = 0 } = {}) => {
  clearScreenshotModalAutoClose();
  if (state === 'idle') {
    resetScreenshotModalState();
    return;
  }
  screenshotModalVisible.value = true;
  screenshotModalState.value = state;
  screenshotModalTitle.value = title;
  screenshotModalMessage.value = message;
  screenshotModalRetryTask.value = typeof retryTask === 'function' ? retryTask : null;
  screenshotModalCancelTask.value = typeof cancelTask === 'function' ? cancelTask : null;
  if (autoCloseMs > 0) {
    screenshotModalAutoCloseTimer.value = setTimeout(() => {
      if (!isExportingPng.value) {
        screenshotModalVisible.value = false;
      }
      screenshotModalAutoCloseTimer.value = 0;
    }, autoCloseMs);
  }
};

const setSongExportModalState = (token, payload = {}) => {
  if (!songExportLifecycle.isLive(token)) return false;
  setScreenshotModalState(payload);
  return true;
};

const closeScreenshotModal = () => {
  if (isExportingPng.value && screenshotModalState.value !== 'failed') return;
  resetScreenshotModalState();
};

const forceCancelScreenshotExport = () => {
  const task = screenshotModalCancelTask.value;
  songExportLifecycle.cancel(activeSongExportToken.value);
  if (typeof task === 'function') {
    task();
  }
  resetScreenshotModalState();
};

const retryScreenshotExport = async () => {
  if (isExportingPng.value) return;
  const task = screenshotModalRetryTask.value;
  if (typeof task !== 'function') return;
  screenshotModalRetryTask.value = null;
  await task();
};

return { clearScreenshotModalAutoClose, resetScreenshotModalState, setScreenshotModalState, setSongExportModalState, closeScreenshotModal, forceCancelScreenshotExport, retryScreenshotExport };
}
