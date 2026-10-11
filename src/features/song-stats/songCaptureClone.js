import { isViewportAtMost, UI_BREAKPOINTS } from '../../ui/breakpoints.js';

export const syncCloneImagesWithSource = (sourceRoot, cloneRoot) => {
  if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
  const sourceImages = Array.from(sourceRoot.querySelectorAll('img'));
  const cloneImages = Array.from(cloneRoot.querySelectorAll('img'));
  const pairCount = Math.min(sourceImages.length, cloneImages.length);

  for (let idx = 0; idx < pairCount; idx += 1) {
    const sourceImg = sourceImages[idx];
    const cloneImg = cloneImages[idx];
    const sourceUrl = String(sourceImg?.currentSrc || sourceImg?.getAttribute('src') || sourceImg?.src || '').trim();
    const isBroken = sourceImg?.dataset?.failed === '1' || (sourceImg?.complete && sourceImg?.naturalWidth === 0);

    cloneImg.setAttribute('loading', 'eager');
    cloneImg.setAttribute('decoding', 'sync');
    if ('fetchPriority' in cloneImg) {
      cloneImg.fetchPriority = 'high';
    }

    if (isBroken) {
      cloneImg.dataset.failed = '1';
      cloneImg.style.display = 'none';
      cloneImg.setAttribute('src', CAPTURE_IMAGE_PLACEHOLDER);
    } else if (sourceUrl) {
      cloneImg.setAttribute('src', sourceUrl);
    }
    if (sourceImg?.dataset?.loaded === '1') {
      cloneImg.dataset.loaded = '1';
    }
  }

  for (let idx = pairCount; idx < cloneImages.length; idx += 1) {
    const cloneImg = cloneImages[idx];
    cloneImg.setAttribute('loading', 'eager');
    cloneImg.setAttribute('decoding', 'sync');
    if ('fetchPriority' in cloneImg) {
      cloneImg.fetchPriority = 'high';
    }
  }
};

export const isRenderableSameOriginUrl = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return true;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return true;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.origin === window.location.origin;
  } catch (_) {
    return true;
  }
};

export const sanitizeSongCloneForExport = (cloneRoot) => {
  if (!(cloneRoot instanceof HTMLElement)) return;

  // html-to-image in static deployment is more fragile with sticky cells.
  cloneRoot.querySelectorAll('.song-table thead th, .song-list-wrap.is-h-scroll .song-table th:nth-child(2), .song-list-wrap.is-h-scroll .song-table td:nth-child(2)').forEach((cell) => {
    if (!(cell instanceof HTMLElement)) return;
    cell.style.position = 'static';
    cell.style.top = 'auto';
    cell.style.left = 'auto';
    cell.style.boxShadow = 'none';
  });

  // Disable shimmer animation in clone to avoid timing-related empty paints.
  cloneRoot.querySelectorAll('.media-load-shimmer').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.style.animation = 'none';
    node.style.backgroundImage = 'none';
  });

  // Compact mobile toggles render "曲绘" through ::after; html-to-image may
  // clone both the real text and pseudo text, so export uses one real label.
  cloneRoot.querySelectorAll('.song-duo-image-toggle.is-image-toggle > span').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const compact = typeof window !== 'undefined'
      && isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.compactMax);
    node.textContent = compact ? '曲绘' : '曲绘显示';
    node.classList.add('song-export-no-pseudo-label');
  });

  // Keep explicitly CORS-enabled R2 jackets. Other off-origin images remain
  // excluded so an unrelated external resource cannot taint the canvas.
  cloneRoot.querySelectorAll('img').forEach((imgEl) => {
    const src = String(imgEl?.getAttribute('src') || imgEl?.currentSrc || '').trim();
    if (!src) return;
    if (isRenderableSameOriginUrl(src)) return;
    if (String(imgEl.crossOrigin || imgEl.getAttribute('crossorigin') || '').toLowerCase() === 'anonymous') return;
    imgEl.dataset.failed = '1';
    imgEl.style.display = 'none';
  });
};

export const syncCloneBackgroundStylesWithSource = (sourceRoot, cloneRoot) => {
  if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
  const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll('*'))];
  const cloneNodes = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll('*'))];
  const pairCount = Math.min(sourceNodes.length, cloneNodes.length);
  for (let idx = 0; idx < pairCount; idx += 1) {
    const sourceEl = sourceNodes[idx];
    const cloneEl = cloneNodes[idx];
    if (!(sourceEl instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) continue;
    const computed = window.getComputedStyle(sourceEl);
    const background = String(computed.background || '').trim();
    const bgColor = String(computed.backgroundColor || '').trim();
    const bgImage = String(computed.backgroundImage || '').trim();
    const border = String(computed.border || '').trim();
    const borderColor = String(computed.borderColor || '').trim();
    if (background && background !== 'none') {
      cloneEl.style.background = background;
    }
    if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
      cloneEl.style.backgroundColor = bgColor;
    }
    if (bgImage && bgImage !== 'none') {
      cloneEl.style.backgroundImage = bgImage;
    }
    if (border && border !== '0px none rgb(0, 0, 0)') {
      cloneEl.style.border = border;
    } else if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
      cloneEl.style.borderColor = borderColor;
    }
  }
};

export const CAPTURE_IMAGE_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
