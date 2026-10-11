import { isCaptureCancelledError } from './captureTaskControl.js';

/**
 * Run the page's render attempts in order, keeping preparation outside the
 * render error boundary. Pages own budgets, render tracking and recovery.
 * @param {Object} options
 * @param {number} options.attemptCount
 * @param {(attemptIndex: number) => unknown} options.prepareAttempt Synchronous preparation.
 * @param {(context: unknown, attemptIndex: number) => Promise<HTMLCanvasElement|null>} options.renderAttempt
 * @param {(error: unknown, context: unknown, attemptIndex: number) => Promise<void>} options.handleAttemptError
 * @returns {Promise<HTMLCanvasElement>}
 */
export const runCaptureRenderAttempts = async ({
  attemptCount,
  prepareAttempt,
  renderAttempt,
  handleAttemptError
}) => {
  let lastRenderError = null;

  for (let attemptIndex = 0; attemptIndex < attemptCount; attemptIndex += 1) {
    const context = prepareAttempt(attemptIndex);
    try {
      const canvas = await renderAttempt(context, attemptIndex);
      if (canvas) return canvas;
    } catch (renderError) {
      lastRenderError = renderError;
      if (isCaptureCancelledError(renderError)) throw renderError;
      await handleAttemptError(renderError, context, attemptIndex);
    }
  }

  throw lastRenderError || new Error('toCanvas returned null');
};
