import { createRetryableModuleImporter } from '../lazyModuleRecovery.js';
import { freezeImageLoadingPresentation } from '../../utils/imageLoadingPresentation.js';
import { prepareStaticCornerRender } from '../../ui/staticCornerCapture.js';

// html-to-image loads the complete cloned export as a detached SVG image.
// WebKit can reject this resource even when the individual images are ready.
const getFailedExportImage = error => {
  const image = error?.target;
  if (error?.type !== 'error' || image?.isConnected || typeof image?.src !== 'string') return null;
  return image.src.startsWith('data:image/svg+xml;charset=utf-8,')
    && image.src.slice(0, 1024).includes('%3CforeignObject') ? image : null;
};

const createFallbackCanvas = (element, width, height, scale) => {
  const canvas = element.ownerDocument.createElement('canvas');
  for (const candidate of [scale, scale / 2]) {
    canvas.width = Math.max(1, Math.floor(width * candidate));
    canvas.height = Math.max(1, Math.floor(height * candidate));
    if (canvas.getContext('2d')) return { canvas, scale: candidate };
  }
  canvas.width = canvas.height = 0;
  throw new Error('浏览器无法分配长图画布');
};

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
        const filter = node => !node.classList?.contains('media-image-retry-overlay')
          && !node.classList?.contains('ui-static-corner-skin') && (!options?.filter || options.filter(node));
        const renderOptions = element.querySelector?.('.ui-static-corner-skin,.media-image-retry-overlay')
          ? { ...options, filter }
          : options;
        try {
          return await render(element, renderOptions);
        } catch (error) {
          const failedImage = getFailedExportImage(error);
          if (!failedImage) throw error;
          failedImage.removeAttribute?.('src');
          const htmlRender = await getHtmlCapture();
          const width = options?.width || element.offsetWidth;
          const height = options?.height || element.offsetHeight;
          const scale = (options?.pixelRatio || globalThis.devicePixelRatio || 1)
            * Math.min((options?.canvasWidth || width) / width, (options?.canvasHeight || height) / height);
          // Check the final backing store before html2canvas acquires its context.
          const surface = createFallbackCanvas(element, width, height,
            options?.skipAutoScale ? scale : Math.min(scale, 16384 / Math.max(width, height)));
          return await htmlRender(element, {
            width, height,
            ...surface,
            backgroundColor: options?.backgroundColor ?? null,
            useCORS: true,
            allowTaint: false,
            logging: false,
            ignoreElements: node => !filter(node)
          });
        }
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
