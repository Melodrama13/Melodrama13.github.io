import { runCaptureRenderAttempts } from './captureRenderAttempts.js';

/** Encode and release the pixel buffer so a smaller attempt can reuse its memory. */
export async function encodeCapturePng(canvas, isCancelled = () => false) {
  try {
    if (isCancelled()) throw new Error('export-cancelled');
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (isCancelled()) throw new Error('export-cancelled');
    if (!blob) throw new Error('toBlob failed');
    return blob;
  } finally {
    canvas.width = canvas.height = 0;
  }
}

export function downloadCapturePng(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
/** Render full quality first, then retry at 1x if the browser cannot export it. */
export function renderCapturePng(render, isCancelled = () => false) {
  const scales = [2, 1];
  return runCaptureRenderAttempts({
    attemptCount: scales.length,
    prepareAttempt: index => {
      if (isCancelled()) throw new Error('export-cancelled');
      return scales[index];
    },
    renderAttempt: render,
    finishAttempt: canvas => encodeCapturePng(canvas, isCancelled),
    handleAttemptError: error => {
      if (error?.name === 'SecurityError') throw error;
    }
  });
}
