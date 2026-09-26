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
const MAX_REFRACTION_BLUR_RADIUS = 64;
const BLUR_STD_PER_RADIUS = 0.35;
const FILTER_HOST_ID = 'ui-liquid-glass-filter-host';
const elementCleanup = new WeakMap();
const elementLifecycle = new WeakMap();
const elementDirectiveActive = new WeakMap();
const elementDirectiveOwner = new WeakMap();
const filterRegistry = new Map();
const mountedSurfaceRefreshers = new Set();
const registeredGlassSurfaces = new Set();
let nextFilterId = 0;
let nextSurfaceId = 0;

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
  forcedColors = false,
  increasedContrast = false
} = {}) {
  if (reducedTransparency || forcedColors || increasedContrast) {
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
  const increasedContrastQuery = getMediaQuery(windowLike, '(prefers-contrast: more)');
  const reducedMotionQuery = getMediaQuery(windowLike, '(prefers-reduced-motion: reduce)');

  const update = () => {
    try {
      root.dataset.uiGlassMode = resolveLiquidGlassMode({
        isChromium: isChromiumEngine(windowLike?.navigator),
        supportsBackdropFilter: supportsBackdropFilter(windowLike),
        reducedTransparency: Boolean(reducedTransparencyQuery?.matches),
        forcedColors: Boolean(forcedColorsQuery?.matches),
        increasedContrast: Boolean(increasedContrastQuery?.matches)
      });
      root.dataset.uiGlassMotion = reducedMotionQuery?.matches ? 'reduced' : 'full';
    } catch {
      runSafely(() => {
        root.dataset.uiGlassMode = LIQUID_GLASS_MODES.frosted;
        root.dataset.uiGlassMotion = 'full';
      });
    } finally {
      refreshMountedSurfaces();
    }
  };

  const removeListeners = [
    addMediaListener(reducedTransparencyQuery, update),
    addMediaListener(forcedColorsQuery, update),
    addMediaListener(increasedContrastQuery, update),
    addMediaListener(reducedMotionQuery, update)
  ];
  let cleanedUp = false;

  update();

  return () => {
    if (cleanedUp) return;
    cleanedUp = true;
    for (const removeListener of removeListeners) runSafely(removeListener);
    runSafely(() => delete root.dataset.uiGlassMode);
    runSafely(() => delete root.dataset.uiGlassMotion);
    refreshMountedSurfaces();
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
  const longestEdge = Math.max(surfaceWidth, surfaceHeight);
  if (longestEdge * 0.25 > MAX_MAP_EDGE) {
    throw new RangeError(`Liquid glass surface exceeds the ${MAX_MAP_EDGE}px displacement-map cap`);
  }
  const supersample = Math.max(
    0.25,
    Math.min(SUPERSAMPLE, MAX_MAP_EDGE / longestEdge)
  );
  const mapWidth = Math.max(1, Math.round(surfaceWidth * supersample));
  const mapHeight = Math.max(1, Math.round(surfaceHeight * supersample));
  const sampledRadius = surfaceRadius * supersample;
  const minDimension = Math.min(surfaceWidth, surfaceHeight);
  const horizontal = new Float32Array(mapWidth * mapHeight);
  const vertical = new Float32Array(mapWidth * mapHeight);
  const scatter = fieldConfig.profile === 'lens' ? new Float32Array(mapWidth * mapHeight) : null;
  const reflectionRgba = fieldConfig.profile === 'lens' ? new Uint8ClampedArray(mapWidth * mapHeight * 4) : null;
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
      let horizontalOffset = (normalX * (total + corner) - normalY * ripple) * pageWidth;
      let verticalOffset = (normalY * (total + corner) + normalX * ripple) * pageHeight;
      if (fieldConfig.profile === 'lens') {
        // Rounded-rectangle surface normals: straight edges bend perpendicularly,
        // while the rounded ends turn continuously. Offsets are local CSS pixels.
        let nx = Math.max(tx, 0);
        let ny = Math.max(ty, 0);
        if (nx === 0 && ny === 0) {
          nx = tx > ty ? 1 : 0;
          ny = tx > ty ? 0 : 1;
        }
        const length = Math.hypot(nx, ny) || 1;
        nx = nx / length * Math.sign(cx - 0.5);
        ny = ny / length * Math.sign(cy - 0.5);
        const selectorLens = fieldConfig.lensRole === 'selector';
        const bevel = Math.min(32, minDimension * (selectorLens ? 0.25 : 0.23));
        const depth = Math.min(1, distPx / bevel);
        const thickness = bevel * (selectorLens ? 0.86 : 0.51);
        const rimWidth = Math.max(0.85, Math.min(1.8, minDimension * 0.022));
        const rimReturn = 4;
        const rim = Math.exp(-distPx / rimWidth);
        const shoulder = 1 - depth * depth * (3 - 2 * depth);
        // Most of the interior stays undistorted. A tightly confined curl folds
        // the backdrop near the rim, creating an inverted edge image; the wider
        // shoulder blends back into the clear center without spreading that fold.
        const curlWidth = bevel * 0.45;
        const curlPhase = Math.min(1, distPx / curlWidth);
        const curl = -bevel * 0.42 * Math.pow(Math.sin(Math.PI * curlPhase), 2);
        const curlSlope = distPx < curlWidth
          ? -bevel * 0.42 * Math.PI / curlWidth * Math.sin(2 * Math.PI * curlPhase)
          : 0;
        let bend = -thickness * shoulder + (thickness + rimReturn) * rim + curl;
        let slope = (distPx < bevel
          ? thickness * 6 * depth * (1 - depth) / bevel - (thickness + rimReturn) * rim / rimWidth
          : 0) + curlSlope;
        if (selectorLens) {
          // Inverse backdrop lookup: outward sampling pulls the track's rim
          // inward in the displayed image. Keep only a small return at the
          // silhouette; the capsule stays convex while the image bows inward.
          bend = -bend + curl * 0.5;
          slope = -slope + curlSlope * 0.5;
        }
        horizontalOffset = nx * bend;
        verticalOffset = ny * bend;
        const index = py * mapWidth + px;
        const curvature = Math.min(1, Math.abs(slope) * 0.3);
        scatter[index] = 0.10 * rim + 0.045 * curvature;
        // Selector highlights should balance across the two top corners;
        // larger track lenses can keep a slight directional glint.
        const light = ny * -0.94 + (selectorLens ? 0 : nx * -0.35);
        const reflection = (0.65 * rim + 0.35 * curvature) * Math.abs(light);
        const offset = index * 4;
        reflectionRgba[offset] = reflectionRgba[offset + 1] = reflectionRgba[offset + 2] = light > 0 ? 255 : 24;
        reflectionRgba[offset + 3] = clampByte(255 * reflection * (light > 0 ? 0.30 : 0.18));
      }
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
    // Blue is unused by displacement: it carries a soft-scattering edge mask.
    rgba[rgbaOffset + 2] = fieldConfig.profile === 'lens'
      ? clampByte(255 * scatter[index])
      : 128;
    rgba[rgbaOffset + 3] = 255;
  }

  return {
    mapWidth,
    mapHeight,
    rgba,
    reflectionRgba,
    scale,
    cacheKey: [surfaceWidth, surfaceHeight, surfaceRadius, pageWidth, pageHeight, JSON.stringify(fieldConfig)].join('|')
  };
}

export const liquidGlassDirective = {
  mounted(element, binding) {
    liquidGlassDirective.unmounted(element);

    const lifecycle = createGlassSurfaceLifecycle(element);
    elementCleanup.set(element, lifecycle.destroy);
    elementLifecycle.set(element, lifecycle);
    elementDirectiveActive.set(element, binding?.value !== false);
    if (binding?.instance != null) elementDirectiveOwner.set(element, getDirectiveOwnerKey(binding.instance));
    registeredGlassSurfaces.add(element);
    if (binding?.value !== false && !lifecycle.resume()) lifecycle.destroy();
  },

  updated(element, binding) {
    const lifecycle = elementLifecycle.get(element);
    if (!lifecycle) return;

    const isActive = binding?.value !== false;
    elementDirectiveActive.set(element, isActive);
    if (isActive) {
      if (!lifecycle.resume()) lifecycle.destroy();
    } else {
      lifecycle.suspend();
    }
  },

  unmounted(element) {
    elementCleanup.get(element)?.();
    elementDirectiveActive.delete(element);
    elementDirectiveOwner.delete(element);
  }
};

function createGlassSurfaceLifecycle(element) {
  const surfaceId = nextSurfaceId++;
  const windowLike = globalThis.window;
  const documentLike = globalThis.document;
  let active = false;
  let destroyed = false;
  let currentEntry = null;
  let pointerFrame = null;
  let rebuildFrame = null;
  let resizeTimer = null;
  let pointer = null;
  let resizeObserver = null;
  let pressureObserver = null;
  let pressureFrame = null;
  let pressure = 0;
  let pressureTarget = 0;
  let pressureTime = 0;

  const animatePressure = (time = 0) => {
    pressureFrame = null;
    if (!active) return;
    const reduced = documentLike?.documentElement?.dataset?.uiGlassMotion === 'reduced';
    const elapsed = pressureTime ? Math.min(64, Math.max(0, time - pressureTime)) : 16;
    pressureTime = time;
    pressure += (pressureTarget - pressure) * (1 - Math.exp(-elapsed / 65));
    if (reduced || Math.abs(pressureTarget - pressure) < 0.002) pressure = pressureTarget;
    for (const node of currentEntry?.node?.querySelectorAll?.('feDisplacementMap') ?? []) {
      const base = Number(node.dataset.baseScale);
      if (Number.isFinite(base)) node.setAttribute('scale', String(base * (1 + pressure * 0.28)));
    }
    currentEntry?.node?.querySelector?.('[data-lens-reflection]')?.setAttribute('slope', String(1 + pressure * 0.18));
    if (pressure !== pressureTarget) pressureFrame = requestFrame(animatePressure);
  };

  const updatePressure = () => {
    pressureTarget = element.getAttribute?.('data-ui-glass-pressed') === 'true' ? 1 : 0;
    if (pressureFrame === null) {
      pressureTime = 0;
      pressureFrame = requestFrame(animatePressure);
    }
  };

  const releaseCurrentFilter = () => {
    const entry = currentEntry;
    currentEntry = null;
    releaseFilter(entry);
  };

  const clearRefraction = () => {
    runSafely(releaseCurrentFilter);
    runSafely(() => setBackdropFilter(element, ''));
  };

  const rebuild = () => {
    rebuildFrame = null;
    if (!active) return;
    try {
      const bounds = readBounds(element);
      if (!bounds) return;
      if (element.getAttribute?.('data-ui-glass-profile') === 'lens') {
        // CSS press scaling must not be baked into the map a second time.
        bounds.width = element.offsetWidth || bounds.width;
        bounds.height = element.offsetHeight || bounds.height;
      }

      setStyleProperty(element, '--ui-glass-surface-width', `${bounds.width}px`);
      setStyleProperty(element, '--ui-glass-surface-height', `${bounds.height}px`);

      if (!canUseRefraction(windowLike, documentLike)) {
        clearRefraction();
        return;
      }

      const radius = resolveBorderRadius(element, windowLike, bounds.width, bounds.height);
      const config = resolveLiquidGlassConfig(element, windowLike);
      const field = buildLiquidGlassDisplacement({
        width: bounds.width,
        height: bounds.height,
        radius,
        viewportWidth: windowLike?.innerWidth,
        viewportHeight: windowLike?.innerHeight,
        config
      });
      // Pressure animates this surface's filter, so do not share its mutable nodes.
      if (config.profile === 'lens') field.cacheKey += `|lens-${surfaceId}`;
      if (currentEntry?.key === field.cacheKey && currentEntry.node?.isConnected) return;

      clearRefraction();
      currentEntry = acquireFilter(documentLike, field, bounds.width, bounds.height, config);
      setBackdropFilter(element, currentEntry ? `url(#${currentEntry.id})` : '');
      if (config.profile === 'lens') updatePressure();
    } catch {
      clearRefraction();
    }
  };

  const scheduleRebuild = () => {
    if (!active) return;
    if (rebuildFrame !== null) runSafely(() => cancelFrame(rebuildFrame));
    rebuildFrame = requestFrame(rebuild);
  };

  const refreshSurface = () => {
    if (!active) return;
    if (rebuildFrame !== null) runSafely(() => cancelFrame(rebuildFrame));
    rebuildFrame = null;
    rebuild();
  };

  const writePointer = () => {
    pointerFrame = null;
    if (!active || !pointer) return;
    setStyleProperty(element, '--ui-glass-pointer-x', `${pointer.x}%`);
    setStyleProperty(element, '--ui-glass-pointer-y', `${pointer.y}%`);
  };

  const onPointerMove = (event) => {
    if (!active) return;
    const bounds = readBounds(element);
    if (!bounds) return;
    pointer = {
      x: clampPercentage(((event.clientX - bounds.left) / bounds.width) * 100),
      y: clampPercentage(((event.clientY - bounds.top) / bounds.height) * 100)
    };
    if (pointerFrame === null) pointerFrame = requestFrame(writePointer);
  };

  const onPointerLeave = () => {
    if (!active) return;
    pointer = null;
    if (pointerFrame !== null) runSafely(() => cancelFrame(pointerFrame));
    pointerFrame = null;
    setStyleProperty(element, '--ui-glass-pointer-x', '50%');
    setStyleProperty(element, '--ui-glass-pointer-y', '0%');
  };

  const onWindowResize = () => {
    if (!active) return;
    if (resizeTimer !== null) globalThis.clearTimeout?.(resizeTimer);
    resizeTimer = globalThis.setTimeout?.(() => {
      resizeTimer = null;
      scheduleRebuild();
    }, 180) ?? null;
  };

  const suspend = () => {
    if (!active) return;
    active = false;
    mountedSurfaceRefreshers.delete(refreshSurface);
    for (const step of [
      () => element.removeEventListener?.('pointermove', onPointerMove),
      () => element.removeEventListener?.('pointerleave', onPointerLeave),
      () => resizeObserver?.disconnect(),
      () => pressureObserver?.disconnect(),
      () => pressureFrame !== null && cancelFrame(pressureFrame),
      () => windowLike?.removeEventListener?.('resize', onWindowResize),
      () => resizeTimer !== null && globalThis.clearTimeout?.(resizeTimer),
      () => pointerFrame !== null && cancelFrame(pointerFrame),
      () => rebuildFrame !== null && cancelFrame(rebuildFrame),
      releaseCurrentFilter,
      () => element.removeAttribute?.('data-liquid-glass-interactive'),
      () => setBackdropFilter(element, ''),
      () => element.style?.removeProperty?.('--ui-glass-pointer-x'),
      () => element.style?.removeProperty?.('--ui-glass-pointer-y'),
      () => element.style?.removeProperty?.('--ui-glass-surface-width'),
      () => element.style?.removeProperty?.('--ui-glass-surface-height')
    ]) runSafely(step);
    pointer = null;
    pointerFrame = null;
    rebuildFrame = null;
    resizeTimer = null;
    resizeObserver = null;
    pressureObserver = null;
    pressureFrame = null;
  };

  const resume = () => {
    if (destroyed) return false;
    if (element?.isConnected === false) return true;
    if (active) return true;
    active = true;
    try {
      element.setAttribute?.('data-liquid-glass-interactive', '');
      element.addEventListener?.('pointermove', onPointerMove);
      element.addEventListener?.('pointerleave', onPointerLeave);
      if (typeof globalThis.ResizeObserver === 'function') {
        resizeObserver = new globalThis.ResizeObserver(scheduleRebuild);
        resizeObserver.observe(element);
      }
      if (element.getAttribute?.('data-ui-glass-profile') === 'lens' && typeof globalThis.MutationObserver === 'function') {
        pressureObserver = new globalThis.MutationObserver(updatePressure);
        pressureObserver.observe(element, { attributes: true, attributeFilter: ['data-ui-glass-pressed'] });
      }
      windowLike?.addEventListener?.('resize', onWindowResize, { passive: true });
      mountedSurfaceRefreshers.add(refreshSurface);
      scheduleRebuild();
      return true;
    } catch {
      suspend();
      return false;
    }
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    suspend();
    registeredGlassSurfaces.delete(element);
    elementCleanup.delete(element);
    elementLifecycle.delete(element);
  };

  return { suspend, resume, destroy };
}

export const liquidGlassPlugin = {
  install(app) {
    const cleanupEnvironment = installLiquidGlassEnvironment();
    app.directive('liquid-glass', liquidGlassDirective);
    app.mixin?.({
      activated() {
        resumeGlassSurfacesWithin(this, this?.$el);
      },
      deactivated() {
        suspendGlassSurfacesWithin(this, this?.$el);
      }
    });
    app.onUnmount?.(cleanupEnvironment);
  }
};

function suspendGlassSurfacesWithin(instance, root) {
  for (const element of registeredGlassSurfaces) {
    if (isGlassSurfaceOwnedBy(instance, root, element)) {
      elementLifecycle.get(element)?.suspend();
    }
  }
}

function resumeGlassSurfacesWithin(instance, root) {
  for (const element of registeredGlassSurfaces) {
    if (isGlassSurfaceOwnedBy(instance, root, element) && elementDirectiveActive.get(element) !== false) {
      elementLifecycle.get(element)?.resume();
    }
  }
}

function isGlassSurfaceOwnedBy(instance, root, element) {
  const owner = elementDirectiveOwner.get(element);
  return owner != null ? owner === getDirectiveOwnerKey(instance) : isGlassSurfaceWithin(root, element);
}

function getDirectiveOwnerKey(instance) {
  return instance?.$ ?? instance;
}

function isGlassSurfaceWithin(root, element) {
  return root === element || Boolean(root?.contains?.(element));
}

function refreshMountedSurfaces() {
  for (const refreshSurface of [...mountedSurfaceRefreshers]) runSafely(refreshSurface);
}

function runSafely(action) {
  try {
    return action();
  } catch {
    return undefined;
  }
}

function canUseRefraction(windowLike, documentLike) {
  return documentLike?.documentElement?.dataset?.uiGlassMode === LIQUID_GLASS_MODES.refractive
    && isChromiumEngine(windowLike?.navigator);
}

function readBounds(element) {
  try {
    const bounds = element.getBoundingClientRect?.();
    const width = Math.round(bounds?.width ?? 0);
    const height = Math.round(bounds?.height ?? 0);
    const left = Number(bounds?.left);
    const top = Number(bounds?.top);
    return width > 1 && height > 1
      ? {
        left: Number.isFinite(left) ? left : 0,
        top: Number.isFinite(top) ? top : 0,
        width,
        height
      }
      : null;
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

function resolveLiquidGlassConfig(element, windowLike) {
  const computed = windowLike?.getComputedStyle?.(element) ?? globalThis.getComputedStyle?.(element);
  const rawBlurRadius = computed?.getPropertyValue?.('--ui-glass-refraction-blur-radius')?.trim?.() ?? '';
  const parsedBlurRadius = rawBlurRadius === '' ? Number.NaN : Number(rawBlurRadius);
  const blurRadius = Number.isFinite(parsedBlurRadius) && parsedBlurRadius >= 0
    ? Math.min(parsedBlurRadius, MAX_REFRACTION_BLUR_RADIUS)
    : GLASS_PRESET.blurRadius;
  const strength = resolveOpticalMultiplier(
    computed?.getPropertyValue?.('--ui-glass-refraction-strength'),
    { maximum: 2 }
  );
  const spread = resolveOpticalMultiplier(
    computed?.getPropertyValue?.('--ui-glass-refraction-spread'),
    { minimum: 0.5, maximum: 2 }
  );
  const rawWarpStrength = computed?.getPropertyValue?.('--ui-glass-refraction-warp-strength')?.trim?.() ?? '';
  const parsedWarpStrength = rawWarpStrength === '' ? Number.NaN : Number(rawWarpStrength);
  const warpStrength = Number.isFinite(parsedWarpStrength) && parsedWarpStrength > 0
    ? Math.min(parsedWarpStrength, 0.2)
    : 0;
  return {
    ...GLASS_PRESET,
    profile: element.getAttribute?.('data-ui-glass-profile') === 'lens' ? 'lens' : 'standard',
    lensRole: element.getAttribute?.('data-ui-glass-lens-role') === 'selector' ? 'selector' : 'surface',
    edgeIntensity: GLASS_PRESET.edgeIntensity * strength,
    rimIntensity: GLASS_PRESET.rimIntensity * strength,
    edgeDistance: GLASS_PRESET.edgeDistance / spread,
    rimDistance: GLASS_PRESET.rimDistance / spread,
    cornerBoost: GLASS_PRESET.cornerBoost * strength,
    rippleEffect: GLASS_PRESET.rippleEffect * strength,
    baseIntensity: GLASS_PRESET.baseIntensity * warpStrength,
    warp: warpStrength > 0,
    blurRadius
  };
}

function resolveOpticalMultiplier(rawValue, { minimum = 0, maximum }) {
  const normalized = rawValue?.trim?.() ?? '';
  const parsed = normalized === '' ? Number.NaN : Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.min(Math.max(parsed, minimum), maximum);
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
  const marginPx = field.scale / 2 * (config.profile === 'lens' ? 1.31 : 1)
    + 3 * (config.profile === 'lens' ? 0.8 : config.blurRadius * BLUR_STD_PER_RADIUS);
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
  if (config.profile === 'lens') {
    filter.append(image);
    // Channel separation follows the same contour field, remaining neutral in
    // the clear center. This is subtle edge dispersion, not a painted rainbow.
    for (const [channel, multiplier] of [['r', 1.055], ['g', 1], ['b', 0.945]]) {
      const warp = displacement.cloneNode();
      const scale = field.scale * multiplier;
      warp.setAttribute('scale', String(scale));
      warp.dataset.baseScale = String(scale);
      warp.setAttribute('result', `lens-${channel}`);
      const isolate = documentLike.createElementNS(svgNamespace, 'feColorMatrix');
      isolate.setAttribute('in', `lens-${channel}`);
      isolate.setAttribute('type', 'matrix');
      isolate.setAttribute('values', `${channel === 'r' ? 1 : 0} 0 0 0 0  0 ${channel === 'g' ? 1 : 0} 0 0 0  0 0 ${channel === 'b' ? 1 : 0} 0 0  0 0 0 1 0`);
      isolate.setAttribute('result', `channel-${channel}`);
      filter.append(warp, isolate);
    }
    for (const [input, other, result] of [['channel-r', 'channel-g', 'lens-rg'], ['lens-rg', 'channel-b', 'displaced']]) {
      const combine = documentLike.createElementNS(svgNamespace, 'feComposite');
      combine.setAttribute('in', input);
      combine.setAttribute('in2', other);
      combine.setAttribute('operator', 'arithmetic');
      combine.setAttribute('k2', '1');
      combine.setAttribute('k3', '1');
      combine.setAttribute('result', result);
      filter.append(combine);
    }
    const mask = documentLike.createElementNS(svgNamespace, 'feColorMatrix');
    mask.setAttribute('in', 'map');
    mask.setAttribute('type', 'matrix');
    mask.setAttribute('values', '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0');
    mask.setAttribute('result', 'edge-scatter-mask');
    blur.setAttribute('stdDeviation', '0.8');
    blur.setAttribute('result', 'soft-scatter');
    filter.append(mask, blur);
    for (const [input, operator, result] of [['soft-scatter', 'in', 'edge-scatter'], ['displaced', 'out', 'clear-lens']]) {
      const maskLayer = documentLike.createElementNS(svgNamespace, 'feComposite');
      maskLayer.setAttribute('in', input);
      maskLayer.setAttribute('in2', 'edge-scatter-mask');
      maskLayer.setAttribute('operator', operator);
      maskLayer.setAttribute('result', result);
      filter.append(maskLayer);
    }
    const finish = documentLike.createElementNS(svgNamespace, 'feComposite');
    finish.setAttribute('in', 'clear-lens');
    finish.setAttribute('in2', 'edge-scatter');
    finish.setAttribute('operator', 'arithmetic');
    finish.setAttribute('k2', '1');
    finish.setAttribute('k3', '1');
    finish.setAttribute('result', 'transmitted-lens');
    filter.append(finish);
    const reflectionUrl = field.reflectionRgba && createMapUrl(documentLike, { ...field, rgba: field.reflectionRgba });
    if (reflectionUrl) {
      const reflection = image.cloneNode();
      reflection.setAttribute('href', reflectionUrl);
      reflection.setAttribute('result', 'surface-reflection');
      const intensity = documentLike.createElementNS(svgNamespace, 'feComponentTransfer');
      intensity.setAttribute('in', 'surface-reflection');
      intensity.setAttribute('result', 'lit-reflection');
      const alpha = documentLike.createElementNS(svgNamespace, 'feFuncA');
      alpha.setAttribute('type', 'linear');
      alpha.setAttribute('slope', '1');
      alpha.setAttribute('data-lens-reflection', '');
      intensity.append(alpha);
      const surface = documentLike.createElementNS(svgNamespace, 'feComposite');
      surface.setAttribute('in', 'lit-reflection');
      surface.setAttribute('in2', 'transmitted-lens');
      surface.setAttribute('operator', 'over');
      filter.append(reflection, intensity, surface);
    }
  } else {
    filter.append(image, displacement, blur);
  }
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
  if (!element.style) return;
  element.style.backdropFilter = value;
  element.style.webkitBackdropFilter = value;
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
