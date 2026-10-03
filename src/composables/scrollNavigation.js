// Every scroll host has one owner. A new request supersedes both an animation
// and any layout correction still belonging to the previous request.
const hostRequests = new WeakMap();
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

export const isScrollKeyIntent = event => SCROLL_KEYS.has(event.key)
  && !event.defaultPrevented
  && !event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');

export const clampScrollTop = (host, top) => Math.max(0, Math.min(
  Math.max(0, host.scrollHeight - host.clientHeight), Number.isFinite(top) ? top : 0
));

export const createScrollNavigator = ({ getHost, onPosition = () => {} }) => {
  let current = null;
  const cancel = () => current?.finish(false);

  const navigate = ({ target, offset = () => 0, behavior = 'smooth', prepare = async () => {}, isLayoutReady = () => true }) => {
    cancel();
    const host = getHost();
    if (!(host instanceof HTMLElement) || !host.isConnected) return Promise.resolve(false);
    hostRequests.get(host)?.finish(false);

    return new Promise(resolve => {
      let raf = 0;
      let finished = false;
      const onIntent = () => request.finish(false);
      const onKey = event => {
        if (isScrollKeyIntent(event)) onIntent();
      };
      const request = {
        finish(ok) {
          if (finished) return;
          finished = true;
          cancelAnimationFrame(raf);
          if (!ok && host.isConnected) host.scrollTo({ top: host.scrollTop, behavior: 'instant' });
          for (const type of ['wheel', 'touchstart', 'pointerdown']) host.removeEventListener(type, onIntent);
          document.removeEventListener('keydown', onKey);
          if (hostRequests.get(host) === request) hostRequests.delete(host);
          if (current === request) current = null;
          if (ok) onPosition(host.scrollTop);
          resolve(ok);
        }
      };
      current = request;
      hostRequests.set(host, request);
      for (const type of ['wheel', 'touchstart', 'pointerdown']) host.addEventListener(type, onIntent, { passive: true });
      document.addEventListener('keydown', onKey);

      const measure = () => {
        if (!host.isConnected || host.clientHeight <= 0 || !host.getClientRects().length) return null;
        if (target === 'top') return 0;
        if (target === 'bottom') return Math.max(0, host.scrollHeight - host.clientHeight);
        const el = typeof target === 'function' ? target() : target;
        if (!(el instanceof HTMLElement) || !el.isConnected || !host.contains(el)) return null;
        return clampScrollTop(host, host.scrollTop + el.getBoundingClientRect().top
          - host.getBoundingClientRect().top - host.clientTop - Number(offset() || 0));
      };

      void (async () => {
        try {
          await prepare();
          if (finished) return;
          const initialTop = measure();
          if (initialTop === null) return request.finish(false);
          const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          const smooth = behavior === 'smooth' && !reducedMotion;
          host.scrollTo({ top: initialTop, behavior: smooth ? 'smooth' : 'instant' });
          let previousTop = host.scrollTop;
          let previousTarget = initialTop;
          let stillFrames = 0;
          let stableSince = performance.now();
          const started = stableSince;
          const tick = now => {
            if (finished) return;
            const top = measure();
            if (top === null) return request.finish(false);
            const moving = Math.abs(host.scrollTop - previousTop) > 0.5;
            stillFrames = moving ? 0 : stillFrames + 1;
            const aligned = Math.abs(host.scrollTop - top) <= 1;
            const layoutChanged = Math.abs(top - previousTarget) > 0.5;
            if (!aligned || moving || layoutChanged || !isLayoutReady()) stableSince = now;
            // Let a native smooth animation finish before correcting its geometry.
            if (!aligned && (!smooth || stillFrames >= 3)) {
              host.scrollTo({ top, behavior: 'instant' });
            }
            previousTop = host.scrollTop;
            previousTarget = top;
            onPosition(host.scrollTop);
            if (aligned && now - stableSince >= 220) return request.finish(true);
            if (now - started >= 5000) return request.finish(Math.abs(host.scrollTop - top) <= 1);
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        } catch (error) {
          request.finish(false);
          console.error('Scroll navigation failed', error);
        }
      })();
    });
  };

  return { navigate, cancel, isNavigating: () => current !== null };
};
