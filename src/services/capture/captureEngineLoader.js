import { createRetryableModuleImporter } from '../lazyModuleRecovery.js';
import { freezeImageLoadingPresentation } from '../../utils/imageLoadingPresentation.js';

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
    renderCaptureToCanvas: async (element, options) => {
      const render = await getToCanvas();
      const restore = freezeImageLoadingPresentation(element);
      try {
        if (!element.querySelector?.('.media-image-retry-overlay')) return await render(element, options);
        return await render(element, {
          ...options,
          filter: node => !node.classList?.contains('media-image-retry-overlay') && (!options?.filter || options.filter(node))
        });
      } finally { restore(); }
    },
    renderHtmlCapture: async (element, options) => {
      const render = await getHtmlCapture();
      const restore = freezeImageLoadingPresentation(element);
      try { return await render(element, options); }
      finally { restore(); }
    }
  };
};

// Shared library code is cached; capture jobs and page state stay with callers.
const captureEngineLoader = createCaptureEngineLoader();
export const renderCaptureToCanvas = captureEngineLoader.renderCaptureToCanvas;
export const renderHtmlCapture = captureEngineLoader.renderHtmlCapture;
