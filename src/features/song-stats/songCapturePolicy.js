import { isViewportAtMost, UI_BREAKPOINTS } from '../../ui/breakpoints.js';

export const getCaptureDeviceTier = () => {
  const width = Number(window?.innerWidth || 0);
  const height = Number(window?.innerHeight || 0);
  const minSide = Math.min(width || Number.MAX_SAFE_INTEGER, height || Number.MAX_SAFE_INTEGER);
  if (isViewportAtMost(width, UI_BREAKPOINTS.tabletMax)) {
    if (minSide >= 680) return 'tablet';
    return 'phone';
  }
  return 'desktop';
};

export const countHeavyMediaNodes = (rootEl) => {
  if (!(rootEl instanceof HTMLElement)) return 0;
  const mediaNodes = rootEl.querySelectorAll('img');
  let heavy = 0;
  mediaNodes.forEach((img) => {
    const src = String(img?.getAttribute('src') || img?.currentSrc || '').toLowerCase();
    const cls = String(img?.className || '').toLowerCase();
    const isIconLike = src.includes('/icon/') || cls.includes('icon') || cls.includes('badge') || cls.includes('chip');
    if (isIconLike) return;
    if (src.includes('/cards/') || (src.includes('/songs/') && !src.includes('/icon/')) || cls.includes('card') || cls.includes('jacket')) {
      heavy += 1;
    }
  });
  return heavy;
};

export const buildCapturePixelRatioPlan = (deviceTier) => {
  const target = 2;
  const ladder = deviceTier === 'desktop'
    ? [target, 1]
    : [target, 1];
  const seen = new Set();
  return ladder.filter((value) => {
    const key = String(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const isEventLikeCaptureError = (error) => {
  if (typeof Event !== 'undefined' && error instanceof Event) return true;
  const raw = String(error?.message || error || '').trim().toLowerCase();
  return raw === '[object event]' || raw.includes('event');
};
