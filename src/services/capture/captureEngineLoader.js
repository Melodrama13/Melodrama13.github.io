import { createRetryableModuleImporter } from '../lazyModuleRecovery.js';
import { freezeImageLoadingPresentation } from '../../utils/imageLoadingPresentation.js';
import { prepareStaticCornerRender } from '../../ui/staticCornerCapture.js';

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
      let restoreCorners = () => {};
      try {
        restoreCorners = await prepareStaticCornerRender(element);
        if (!element.querySelector?.('.ui-static-corner-skin,.media-image-retry-overlay')) return await render(element, options);
        return await render(element, {
          ...options,
          filter: node => !node.classList?.contains('media-image-retry-overlay') && !node.classList?.contains('ui-static-corner-skin') && (!options?.filter || options.filter(node))
        });
      } finally { restoreCorners(); restore(); }
    },
    renderHtmlCapture: async (element, options) => {
      const render = await getHtmlCapture();
      const restore = freezeImageLoadingPresentation(element);
      let restoreCorners = () => {};
      try {
        restoreCorners = await prepareStaticCornerRender(element);
        if (!element.querySelector?.('.ui-static-corner-skin')) return await render(element, options);
        return await render(element, {
          ...options,
          ignoreElements: node => node.classList?.contains('ui-static-corner-skin') || Boolean(options?.ignoreElements?.(node))
        });
      }
      finally { restoreCorners(); restore(); }
    }
  };
};

// Shared library code is cached; capture jobs and page state stay with callers.
const captureEngineLoader = createCaptureEngineLoader();
export const renderCaptureToCanvas = captureEngineLoader.renderCaptureToCanvas;
export const renderHtmlCapture = captureEngineLoader.renderHtmlCapture;
