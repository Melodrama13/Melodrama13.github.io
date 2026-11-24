export function shouldSplitCapture(element) {
  const agent = element.ownerDocument.defaultView.navigator.userAgent;
  return /AppleWebKit/.test(agent) && (/iPhone|iPad|iPod/.test(agent) || !/Chrome|Chromium|Edg/.test(agent));
}

/** Render independently positioned sections without serializing their assets together. */
export async function renderCaptureSections(element, options, sections, renderToCanvas, isCancelled) {
  const checkCancelled = () => {
    if (isCancelled()) throw new Error('export-cancelled');
  };
  checkCancelled();
  if (!sections.length) {
    const canvas = await renderToCanvas(element, options);
    if (!isCancelled()) return canvas;
    if (canvas) canvas.width = canvas.height = 0;
    checkCancelled();
  }

  const rootRect = element.getBoundingClientRect();
  const sectionRects = sections.map(section => section.getBoundingClientRect());
  const excluded = new Set(sections);
  const canvas = await renderToCanvas(element, {
    ...options,
    filter: node => !excluded.has(node) && (!options.filter || options.filter(node))
  });
  try {
    checkCancelled();
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Export canvas context is unavailable');
    const scaleX = canvas.width / options.width;
    const scaleY = canvas.height / options.height;
    for (let index = 0; index < sections.length; index += 1) {
      const rect = sectionRects[index];
      if (!rect.width || !rect.height) continue;
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      const left = Math.round((rect.left - rootRect.left) * scaleX);
      const top = Math.round((rect.top - rootRect.top) * scaleY);
      const targetWidth = Math.max(1, Math.round((rect.right - rootRect.left) * scaleX) - left);
      const targetHeight = Math.max(1, Math.round((rect.bottom - rootRect.top) * scaleY) - top);
      const sectionCanvas = await renderToCanvas(sections[index], {
        ...options,
        backgroundColor: undefined,
        width,
        height,
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        pixelRatio: 1
      });
      try {
        checkCancelled();
        context.drawImage(sectionCanvas, left, top, targetWidth, targetHeight);
      } finally {
        sectionCanvas.width = sectionCanvas.height = 0;
      }
    }
    return canvas;
  } catch (error) {
    canvas.width = canvas.height = 0;
    throw error;
  }
}
