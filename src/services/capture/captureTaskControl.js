/**
 * Create cancellation state owned by one capture task.
 * Cancel updates state synchronously and resolves all observers with true once.
 * Every call creates an independent context; no capture state is shared.
 * @returns {{ cancelPromise: Promise<true>, isCancelled: () => boolean, cancel: () => void }}
 */
export const createCaptureCancelContext = () => {
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

/**
 * Recognize the existing case-sensitive cancellation marker in error.message.
 * @param {unknown} error
 * @returns {boolean}
 */
export const isCaptureCancelledError = (error) => String(error?.message || '').includes('export-cancelled');

/**
 * Recognize the existing numeric render-timeout marker in error.message.
 * @param {unknown} error
 * @returns {boolean}
 */
export const isCaptureRenderTimeoutError = (error) => /render-timeout-\d+/.test(String(error?.message || ''));
