import { createRetryableModuleImporter } from '../lazyModuleRecovery.js';

/** Lazily load capture libraries; failed imports can be retried by a new task. */
export const createCaptureEngineLoader = ({
  loadToCanvas = createRetryableModuleImporter('captureCanvas', () => import('html-to-image')),
  loadHtmlCapture = createRetryableModuleImporter('captureHtml', () => import('html2canvas'))
} = {}) => {
  let toCanvasPromise;
  let htmlCapturePromise;

  const getToCanvas = () => {
    if (!toCanvasPromise) {
      toCanvasPromise = Promise.resolve().then(loadToCanvas)
        .then(module => module.toCanvas)
        .catch(error => { toCanvasPromise = undefined; throw error; });
    }
    return toCanvasPromise;
  };

  const getHtmlCapture = () => {
    if (!htmlCapturePromise) {
      htmlCapturePromise = Promise.resolve().then(loadHtmlCapture)
        .then(module => module.default)
        .catch(error => { htmlCapturePromise = undefined; throw error; });
    }
    return htmlCapturePromise;
  };

  return {
    renderCaptureToCanvas: async (element, options) => (await getToCanvas())(element, options),
    renderHtmlCapture: async (element, options) => (await getHtmlCapture())(element, options)
  };
};

// Shared library code is cached; capture jobs and page state stay with callers.
const captureEngineLoader = createCaptureEngineLoader();
export const renderCaptureToCanvas = captureEngineLoader.renderCaptureToCanvas;
export const renderHtmlCapture = captureEngineLoader.renderHtmlCapture;
