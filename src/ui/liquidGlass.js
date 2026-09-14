/*!
 * Liquid Glass refraction field derived from liquid-glass-js
 * (https://github.com/dashersw/liquid-glass-js), Copyright (c) 2025
 * Armagan Amcalar, MIT License. The web port samples the live backdrop.
 */

export const LIQUID_GLASS_MODES = Object.freeze({
  refractive: 'refractive',
  frosted: 'frosted',
  opaque: 'opaque'
});

export const GLASS_PRESET = Object.freeze({
  edgeIntensity: 0.015,
  rimIntensity: 0.028,
  baseIntensity: 0.05,
  edgeDistance: 0.5,
  rimDistance: 1.7,
  baseDistance: 0.2,
  cornerBoost: 0.06,
  rippleEffect: 0.26,
  blurRadius: 2,
  warp: false
});

const SUPERSAMPLE = 2;
const MAX_MAP_EDGE = 1400;
const BLUR_STD_PER_RADIUS = 0.35;
const FILTER_HOST_ID = 'ui-liquid-glass-filter-host';
const elementCleanup = new WeakMap();
const filterRegistry = new Map();
let nextFilterId = 0;

export function isChromiumEngine(navigatorLike = {}) {
  const brands = navigatorLike?.userAgentData?.brands;
  if (Array.isArray(brands)) {
    return brands.some(({ brand }) => /Chromium|Google Chrome|Microsoft Edge/i.test(brand));
  }

  return /(?:Chrome|Chromium|Edg|Edge)\//.test(navigatorLike?.userAgent || '');
}

export function resolveLiquidGlassMode({
  isChromium = false,
  supportsBackdropFilter = false,
  reducedTransparency = false,
  forcedColors = false
} = {}) {
  if (reducedTransparency || forcedColors) {
    return LIQUID_GLASS_MODES.opaque;
  }

  return isChromium && supportsBackdropFilter
    ? LIQUID_GLASS_MODES.refractive
    : LIQUID_GLASS_MODES.frosted;
}

export function installLiquidGlassEnvironment({
  window: windowLike = globalThis.window,
  document: documentLike = globalThis.document
} = {}) {
  const root = documentLike?.documentElement;
  if (!root?.dataset) {
    return () => {};
  }

  const reducedTransparencyQuery = getMediaQuery(windowLike, '(prefers-reduced-transparency: reduce)');
  const forcedColorsQuery = getMediaQuery(windowLike, '(forced-colors: active)');
  const reducedMotionQuery = getMediaQuery(windowLike, '(prefers-reduced-motion: reduce)');

  const update = () => {
    try {
      root.dataset.uiGlassMode = resolveLiquidGlassMode({
        isChromium: isChromiumEngine(windowLike?.navigator),
        supportsBackdropFilter: supportsBackdropFilter(windowLike),
        reducedTransparency: Boolean(reducedTransparencyQuery?.matches),
        forcedColors: Boolean(forcedColorsQuery?.matches)
      });
      root.dataset.uiGlassMotion = reducedMotionQuery?.matches ? 'reduced' : 'full';
    } catch {
      root.dataset.uiGlassMode = LIQUID_GLASS_MODES.frosted;
      root.dataset.uiGlassMotion = 'full';
    }
  };

  const removeListeners = [
    addMediaListener(reducedTransparencyQuery, update),
    addMediaListener(forcedColorsQuery, update),
    addMediaListener(reducedMotionQuery, update)
  ];
  let cleanedUp = false;

  update();

  return () => {
    if (cleanedUp) return;
    cleanedUp = true;
    for (const removeListener of removeListeners) removeListener();
    delete root.dataset.uiGlassMode;
    delete root.dataset.uiGlassMotion;
  };
}

export function buildLiquidGlassDisplacement({
  width,
  height,
  radius,
  viewportWidth,
  viewportHeight,
  config = GLASS_PRESET
}) {
  const surfaceWidth = Math.max(1, Number(width) || 0);
  const surfaceHeight = Math.max(1, Number(height) || 0);
  const surfaceRadius = Math.max(0, Math.min(Number(radius) || 0, Math.min(surfaceWidth, surfaceHeight) / 2));
  const pageWidth = Math.max(1, Number(viewportWidth) || 0);
  const pageHeight = Math.max(1, Number(viewportHeight) || 0);
  const fieldConfig = { ...GLASS_PRESET, ...config };
  const supersample = Math.max(
    0.25,
    Math.min(SUPERSAMPLE, MAX_MAP_EDGE / Math.max(surfaceWidth, surfaceHeight))
  );
  const mapWidth = Math.max(1, Math.round(surfaceWidth * supersample));
  const mapHeight = Math.max(1, Math.round(surfaceHeight * supersample));
  const sampledRadius = surfaceRadius * supersample;
  const minDimension = Math.min(surfaceWidth, surfaceHeight);
  const horizontal = new Float32Array(mapWidth * mapHeight);
  const vertical = new Float32Array(mapWidth * mapHeight);
  let maxAbsoluteOffset = 0;

  for (let py = 0; py < mapHeight; py += 1) {
    for (let px = 0; px < mapWidth; px += 1) {
      const cx = (px + 0.5) / mapWidth;
      const cy = (py + 0.5) / mapHeight;
      const tx = Math.abs(px + 0.5 - mapWidth / 2) - (mapWidth / 2 - sampledRadius);
      const ty = Math.abs(py + 0.5 - mapHeight / 2) - (mapHeight / 2 - sampledRadius);
      const outside = Math.hypot(Math.max(tx, 0), Math.max(ty, 0));
      const inside = Math.min(Math.max(tx, ty), 0);
      const distPx = Math.max(-(outside + inside - sampledRadius), 0) / supersample;
      const edgeFall = Math.exp(-distPx * fieldConfig.edgeDistance);
      const rimFall = Math.exp(-distPx * fieldConfig.rimDistance);
      const baseFall = 1 - Math.exp(-distPx * fieldConfig.baseDistance);
      const total = (fieldConfig.warp ? baseFall * fieldConfig.baseIntensity : 0)
        + edgeFall * fieldConfig.edgeIntensity
        + rimFall * fieldConfig.rimIntensity;
      let normalX = cx - 0.5;
      let normalY = cy - 0.5;
      const normalLength = Math.hypot(normalX, normalY);
      if (normalLength > 0) {
        normalX /= normalLength;
        normalY /= normalLength;
      }
      const corner = Math.exp(
        -(Math.max(Math.min(cx, 1 - cx), Math.min(cy, 1 - cy)) * minDimension) * 0.3
      ) * fieldConfig.cornerBoost;
      const ripple = Math.sin((distPx / minDimension) * 25) * fieldConfig.rippleEffect * rimFall;
      const horizontalOffset = (normalX * (total + corner) - normalY * ripple) * pageWidth;
      const verticalOffset = (normalY * (total + corner) + normalX * ripple) * pageHeight;
      const index = py * mapWidth + px;

      horizontal[index] = horizontalOffset;
      vertical[index] = verticalOffset;
      maxAbsoluteOffset = Math.max(maxAbsoluteOffset, Math.abs(horizontalOffset), Math.abs(verticalOffset));
    }
  }

  const scale = Math.max(maxAbsoluteOffset * 2, 1e-4);
  const bias = scale * (128 / 255 - 0.5);
  const rgba = new Uint8ClampedArray(mapWidth * mapHeight * 4);
  for (let index = 0; index < horizontal.length; index += 1) {
    const rgbaOffset = index * 4;
    rgba[rgbaOffset] = clampByte(255 * (0.5 + (horizontal[index] - bias) / scale));
    rgba[rgbaOffset + 1] = clampByte(255 * (0.5 + (vertical[index] - bias) / scale));
    rgba[rgbaOffset + 2] = 128;
    rgba[rgbaOffset + 3] = 255;
  }

  return {
    mapWidth,
    mapHeight,
    rgba,
    scale,
    cacheKey: [surfaceWidth, surfaceHeight, surfaceRadius, pageWidth, pageHeight, JSON.stringify(fieldConfig)].join('|')
  };
}

export const liquidGlassDirective = {
  mounted(element) {
    liquidGlassDirective.unmounted(element);

    const windowLike = globalThis.window;
    const documentLike = globalThis.document;
    let currentEntry = null;
    let pointerFrame = null;
    let rebuildFrame = null;
    let resizeTimer = null;
    let pointer = null;
    let resizeObserver = null;

    const releaseCurrentFilter = () => {
      releaseFilter(currentEntry);
      currentEntry = null;
    };

    const rebuild = () => {
      rebuildFrame = null;
      const bounds = readBounds(element);
      if (!bounds) return;

      setStyleProperty(element, '--ui-glass-surface-width', `${bounds.width}px`);
      setStyleProperty(element, '--ui-glass-surface-height', `${bounds.height}px`);

      if (!canUseRefraction(windowLike, documentLike)) {
        releaseCurrentFilter();
        setBackdropFilter(element, '');
        return;
      }

      try {
        const radius = resolveBorderRadius(element, windowLike, bounds.width, bounds.height);
        const field = buildLiquidGlassDisplacement({
          width: bounds.width,
          height: bounds.height,
          radius,
          viewportWidth: windowLike?.innerWidth,
          viewportHeight: windowLike?.innerHeight,
          config: GLASS_PRESET
        });
        if (currentEntry?.key === field.cacheKey && currentEntry.node?.isConnected) return;

        releaseCurrentFilter();
        currentEntry = acquireFilter(documentLike, field, bounds.width, bounds.height, GLASS_PRESET);
        setBackdropFilter(element, currentEntry ? `url(#${currentEntry.id})` : '');
      } catch {
        releaseCurrentFilter();
        setBackdropFilter(element, '');
      }
    };

    const scheduleRebuild = () => {
      if (rebuildFrame !== null) cancelFrame(rebuildFrame);
      rebuildFrame = requestFrame(rebuild);
    };

    const writePointer = () => {
      pointerFrame = null;
      if (!pointer) return;
      setStyleProperty(element, '--ui-glass-pointer-x', `${pointer.x}%`);
      setStyleProperty(element, '--ui-glass-pointer-y', `${pointer.y}%`);
    };

    const onPointerMove = (event) => {
      const bounds = readBounds(element);
      if (!bounds) return;
      pointer = {
        x: clampPercentage(((event.clientX - bounds.left) / bounds.width) * 100),
        y: clampPercentage(((event.clientY - bounds.top) / bounds.height) * 100)
      };
      if (pointerFrame === null) pointerFrame = requestFrame(writePointer);
    };

    const onPointerLeave = () => {
      pointer = null;
      if (pointerFrame !== null) cancelFrame(pointerFrame);
      pointerFrame = null;
      setStyleProperty(element, '--ui-glass-pointer-x', '50%');
      setStyleProperty(element, '--ui-glass-pointer-y', '0%');
    };

    const onWindowResize = () => {
      if (resizeTimer !== null) globalThis.clearTimeout?.(resizeTimer);
      resizeTimer = globalThis.setTimeout?.(() => {
        resizeTimer = null;
        scheduleRebuild();
      }, 180) ?? null;
    };

    element.setAttribute?.('data-liquid-glass-interactive', '');
    element.addEventListener?.('pointermove', onPointerMove);
    element.addEventListener?.('pointerleave', onPointerLeave);
    if (typeof globalThis.ResizeObserver === 'function') {
      resizeObserver = new globalThis.ResizeObserver(scheduleRebuild);
      resizeObserver.observe(element);
    }
    windowLike?.addEventListener?.('resize', onWindowResize, { passive: true });
    scheduleRebuild();

    elementCleanup.set(element, () => {
      element.removeEventListener?.('pointermove', onPointerMove);
      element.removeEventListener?.('pointerleave', onPointerLeave);
      resizeObserver?.disconnect();
      windowLike?.removeEventListener?.('resize', onWindowResize);
      if (resizeTimer !== null) globalThis.clearTimeout?.(resizeTimer);
      if (pointerFrame !== null) cancelFrame(pointerFrame);
      if (rebuildFrame !== null) cancelFrame(rebuildFrame);
      releaseCurrentFilter();
      element.removeAttribute?.('data-liquid-glass-interactive');
      setBackdropFilter(element, '');
      for (const property of [
        '--ui-glass-pointer-x',
        '--ui-glass-pointer-y',
        '--ui-glass-surface-width',
        '--ui-glass-surface-height'
      ]) element.style?.removeProperty?.(property);
      elementCleanup.delete(element);
    });
  },

  unmounted(element) {
    elementCleanup.get(element)?.();
  }
};

export const liquidGlassPlugin = {
  install(app) {
    const cleanupEnvironment = installLiquidGlassEnvironment();
    app.directive('liquid-glass', liquidGlassDirective);
    app.onUnmount?.(cleanupEnvironment);
  }
};

function canUseRefraction(windowLike, documentLike) {
  return documentLike?.documentElement?.dataset?.uiGlassMode === LIQUID_GLASS_MODES.refractive
    && isChromiumEngine(windowLike?.navigator);
}

function readBounds(element) {
  try {
    const bounds = element.getBoundingClientRect?.();
    const width = Math.round(bounds?.width ?? 0);
    const height = Math.round(bounds?.height ?? 0);
    return width > 1 && height > 1 ? { ...bounds, width, height } : null;
  } catch {
    return null;
  }
}

function resolveBorderRadius(element, windowLike, width, height) {
  const computed = windowLike?.getComputedStyle?.(element) ?? globalThis.getComputedStyle?.(element);
  const value = computed?.borderTopLeftRadius ?? '0px';
  const parsed = Number.parseFloat(value) || 0;
  const radius = value.trim?.().endsWith('%') ? (parsed / 100) * Math.min(width, height) : parsed;
  return Math.max(0, Math.min(radius, Math.min(width, height) / 2));
}

function acquireFilter(documentLike, field, width, height, config) {
  const existing = filterRegistry.get(field.cacheKey);
  if (existing?.node?.isConnected) {
    existing.refs += 1;
    return existing;
  }
  if (existing) filterRegistry.delete(field.cacheKey);

  const defs = documentLike?.getElementById?.(FILTER_HOST_ID)?.querySelector?.('defs');
  if (!defs?.isConnected) return null;

  const mapUrl = createMapUrl(documentLike, field);
  if (!mapUrl) return null;

  const svgNamespace = 'http://www.w3.org/2000/svg';
  const filter = documentLike.createElementNS?.(svgNamespace, 'filter');
  const image = documentLike.createElementNS?.(svgNamespace, 'feImage');
  const displacement = documentLike.createElementNS?.(svgNamespace, 'feDisplacementMap');
  const blur = documentLike.createElementNS?.(svgNamespace, 'feGaussianBlur');
  if (!filter || !image || !displacement || !blur) return null;

  const id = `ui-liquid-glass-${nextFilterId++}`;
  const marginPx = field.scale / 2 + 3 * config.blurRadius * BLUR_STD_PER_RADIUS;
  const marginX = (marginPx / width) * 100;
  const marginY = (marginPx / height) * 100;
  filter.setAttribute('id', id);
  filter.setAttribute('x', `${-marginX}%`);
  filter.setAttribute('y', `${-marginY}%`);
  filter.setAttribute('width', `${100 + 2 * marginX}%`);
  filter.setAttribute('height', `${100 + 2 * marginY}%`);
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  filter.dataset.uiLiquidGlassKey = field.cacheKey;

  image.setAttribute('href', mapUrl);
  image.setAttribute('x', '0');
  image.setAttribute('y', '0');
  image.setAttribute('width', String(width));
  image.setAttribute('height', String(height));
  image.setAttribute('preserveAspectRatio', 'none');
  image.setAttribute('result', 'map');

  displacement.setAttribute('in', 'SourceGraphic');
  displacement.setAttribute('in2', 'map');
  displacement.setAttribute('scale', String(field.scale));
  displacement.setAttribute('xChannelSelector', 'R');
  displacement.setAttribute('yChannelSelector', 'G');
  displacement.setAttribute('result', 'displaced');

  blur.setAttribute('in', 'displaced');
  blur.setAttribute('stdDeviation', String(config.blurRadius * BLUR_STD_PER_RADIUS));
  filter.append(image, displacement, blur);
  defs.appendChild(filter);

  const entry = { id, key: field.cacheKey, node: filter, refs: 1 };
  filterRegistry.set(field.cacheKey, entry);
  return entry;
}

function releaseFilter(entry) {
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;
  if (filterRegistry.get(entry.key) === entry) filterRegistry.delete(entry.key);
  entry.node?.remove?.();
}

function createMapUrl(documentLike, field) {
  try {
    const canvas = documentLike?.createElement?.('canvas');
    const context = canvas?.getContext?.('2d');
    if (!context) return null;
    canvas.width = field.mapWidth;
    canvas.height = field.mapHeight;
    const image = context.createImageData(field.mapWidth, field.mapHeight);
    image.data.set(field.rgba);
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function requestFrame(callback) {
  return globalThis.requestAnimationFrame?.(callback) ?? null;
}

function cancelFrame(frame) {
  globalThis.cancelAnimationFrame?.(frame);
}

function setStyleProperty(element, property, value) {
  element.style?.setProperty?.(property, value);
}

function setBackdropFilter(element, value) {
  if (element.style) element.style.backdropFilter = value;
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, value));
}

function supportsBackdropFilter(windowLike) {
  const filterValue = 'blur(1px)';
  try {
    return Boolean(
      windowLike?.CSS?.supports?.('backdrop-filter', filterValue)
      || windowLike?.CSS?.supports?.('-webkit-backdrop-filter', filterValue)
    );
  } catch {
    return false;
  }
}

function getMediaQuery(windowLike, query) {
  try {
    return windowLike?.matchMedia?.(query) || null;
  } catch {
    return null;
  }
}

function addMediaListener(mediaQuery, listener) {
  if (!mediaQuery) return () => {};

  try {
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener?.('change', listener);
    }
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener?.(listener);
    }
  } catch {
    return () => {};
  }

  return () => {};
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
