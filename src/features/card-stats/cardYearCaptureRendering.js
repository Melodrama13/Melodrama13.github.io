/** Keeps full year exports below WebKit's single-resource decode limits. */
export async function renderCardYearCaptureToCanvas(element, options, renderToCanvas, isCancelled = () => false) {
  const panels = element.matches('.year-stats-panel')
    ? [...element.querySelectorAll('.year-stats-card')]
    : [];
  if (!panels.length || !element.querySelector('.year-stats-table')) {
    return renderToCanvas(element, options);
  }
  const checkCancelled = () => {
    if (isCancelled()) throw new Error('export-cancelled');
  };
  const rootRect = element.getBoundingClientRect();
  const panelRects = panels.map(panel => panel.getBoundingClientRect());
  checkCancelled();
  // Preserve the outer frame and controls, then paint each complete year at its measured position.
  const canvas = await renderToCanvas(element, {
    ...options,
    filter: node => !node.classList?.contains('year-stats-card') && (!options.filter || options.filter(node))
  });
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Year export canvas context is unavailable');
  const scaleX = canvas.width / options.width;
  const scaleY = canvas.height / options.height;
  for (let index = 0; index < panels.length; index += 1) {
    checkCancelled();
    const rect = panelRects[index];
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);
    const panelCanvas = await renderToCanvas(panels[index], {
      ...options,
      width,
      height,
      canvasWidth: Math.round(width * scaleX),
      canvasHeight: Math.round(height * scaleY),
      pixelRatio: 1
    });
    checkCancelled();
    context.drawImage(panelCanvas,
      Math.round((rect.left - rootRect.left) * scaleX),
      Math.round((rect.top - rootRect.top) * scaleY)
    );
    // Each year is copied into the final canvas before releasing its temporary pixel buffer.
    panelCanvas.width = 0;
    panelCanvas.height = 0;
  }
  return canvas;
}
