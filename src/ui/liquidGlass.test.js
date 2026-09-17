import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GLASS_PRESET,
  LIQUID_GLASS_MODES,
  buildLiquidGlassDisplacement,
  installLiquidGlassEnvironment,
  isChromiumEngine,
  liquidGlassDirective,
  liquidGlassPlugin,
  resolveLiquidGlassMode
} from './liquidGlass.js';

function createMediaQueryList(matches = false, legacy = false) {
  const listeners = new Set();
  return {
    matches,
    addEventListener: legacy ? undefined : (type, listener) => listeners.add(listener),
    removeEventListener: legacy ? undefined : (type, listener) => listeners.delete(listener),
    addListener: legacy ? (listener) => listeners.add(listener) : undefined,
    removeListener: legacy ? (listener) => listeners.delete(listener) : undefined,
    emit(nextMatches) {
      this.matches = nextMatches;
      for (const listener of listeners) listener({ matches: nextMatches });
    },
    listenerCount() {
      return listeners.size;
    }
  };
}

function createEnvironment({ legacy = false } = {}) {
  const mediaQueries = new Map([
    ['(prefers-reduced-transparency: reduce)', createMediaQueryList(false, legacy)],
    ['(forced-colors: active)', createMediaQueryList(false, legacy)],
    ['(prefers-reduced-motion: reduce)', createMediaQueryList(false, legacy)]
  ]);
  const document = { documentElement: { dataset: {} } };
  const window = {
    CSS: { supports: (property) => property === 'backdrop-filter' },
    navigator: { userAgentData: { brands: [{ brand: 'Chromium' }] } },
    matchMedia: (query) => mediaQueries.get(query)
  };

  return { document, mediaQueries, window };
}

function decodeDisplacement(byte, scale) {
  return scale * (byte / 255 - 0.5);
}

function maxEdgeDisplacement({ mapHeight, mapWidth, rgba, scale }) {
  let maximum = 0;
  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      if (x !== 0 && y !== 0 && x !== mapWidth - 1 && y !== mapHeight - 1) continue;
      const offset = (y * mapWidth + x) * 4;
      maximum = Math.max(
        maximum,
        Math.abs(decodeDisplacement(rgba[offset], scale)),
        Math.abs(decodeDisplacement(rgba[offset + 1], scale))
      );
    }
  }
  return maximum;
}

function createFakeNode(tagName) {
  const node = {
    tagName,
    attributes: new Map(),
    children: [],
    dataset: {},
    parentNode: null,
    connected: false,
    append(...children) {
      for (const child of children) this.appendChild(child);
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    remove() {
      const siblings = this.parentNode?.children;
      if (siblings) siblings.splice(siblings.indexOf(this), 1);
      this.parentNode = null;
      this.connected = false;
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    },
    get isConnected() {
      return this.connected || Boolean(this.parentNode?.isConnected);
    }
  };

  return node;
}

function createFakeGlassElement({ left, top, width, height, radius = '8px', refractionBlur = '' }) {
  const listeners = new Map();
  const attributes = new Map();
  const style = {
    values: new Map(),
    calls: [],
    backdropFilter: '',
    webkitBackdropFilter: '',
    setProperty(name, value) {
      this.values.set(name, String(value));
      this.calls.push([name, String(value)]);
    },
    removeProperty(name) {
      this.values.delete(name);
    }
  };

  return {
    dataset: {},
    style,
    _radius: radius,
    _refractionBlur: refractionBlur,
    connected: true,
    addEventListener(type, listener) {
      const handlers = listeners.get(type) || new Set();
      handlers.add(listener);
      listeners.set(type, handlers);
    },
    removeEventListener(type, listener) {
      const handlers = listeners.get(type);
      handlers?.delete(listener);
      if (handlers?.size === 0) listeners.delete(type);
    },
    dispatch(type, event = {}) {
      for (const listener of listeners.get(type) || []) listener(event);
    },
    getBoundingClientRect() {
      return { left, top, width, height };
    },
    listenerCount() {
      return [...listeners.values()].reduce((total, handlers) => total + handlers.size, 0);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    get isConnected() {
      return this.connected;
    }
  };
}

function withFakeGlassRuntime(run) {
  const originals = new Map();
  const replaceGlobal = (name, value) => {
    originals.set(name, {
      exists: Object.prototype.hasOwnProperty.call(globalThis, name),
      value: globalThis[name]
    });
    globalThis[name] = value;
  };
  const windowListeners = new Map();
  const frames = new Map();
  const timers = new Map();
  const observers = new Set();
  let nextFrame = 0;
  let nextTimer = 0;
  const defs = createFakeNode('defs');
  const host = createFakeNode('svg');
  host.connected = true;
  host.appendChild(defs);
  host.querySelector = (selector) => (selector === 'defs' ? defs : null);
  const document = {
    documentElement: { dataset: { uiGlassMode: LIQUID_GLASS_MODES.refractive } },
    createElement(tagName) {
      if (tagName !== 'canvas') return createFakeNode(tagName);
      return {
        width: 0,
        height: 0,
        getContext() {
          return {
            createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
            putImageData() {}
          };
        },
        toDataURL() {
          return 'data:image/png;base64,test-map';
        }
      };
    },
    createElementNS(namespace, tagName) {
      return createFakeNode(tagName);
    },
    getElementById(id) {
      return id === 'ui-liquid-glass-filter-host' ? host : null;
    }
  };
  const window = {
    CSS: { supports: () => true },
    innerWidth: 1440,
    innerHeight: 1000,
    navigator: { userAgentData: { brands: [{ brand: 'Chromium' }] } },
    addEventListener(type, listener) {
      const handlers = windowListeners.get(type) || new Set();
      handlers.add(listener);
      windowListeners.set(type, handlers);
    },
    removeEventListener(type, listener) {
      const handlers = windowListeners.get(type);
      handlers?.delete(listener);
      if (handlers?.size === 0) windowListeners.delete(type);
    },
    dispatch(type) {
      for (const listener of windowListeners.get(type) || []) listener();
    },
    getComputedStyle(element) {
      return {
        borderTopLeftRadius: element._radius,
        getPropertyValue(name) {
          return name === '--ui-glass-refraction-blur-radius' ? element._refractionBlur : '';
        }
      };
    }
  };

  class FakeResizeObserver {
    constructor(callback) {
      this.callback = callback;
      observers.add(this);
    }

    observe(element) {
      this.element = element;
    }

    disconnect() {
      observers.delete(this);
    }
  }

  replaceGlobal('window', window);
  replaceGlobal('document', document);
  replaceGlobal('ResizeObserver', FakeResizeObserver);
  replaceGlobal('requestAnimationFrame', (callback) => {
    const frame = ++nextFrame;
    frames.set(frame, callback);
    return frame;
  });
  replaceGlobal('cancelAnimationFrame', (frame) => frames.delete(frame));
  replaceGlobal('setTimeout', (callback, delay) => {
    const timer = ++nextTimer;
    timers.set(timer, { callback, delay });
    return timer;
  });
  replaceGlobal('clearTimeout', (timer) => timers.delete(timer));

  const runtime = {
    defs,
    document,
    window,
    activeResizeObservers: () => observers.size,
    pendingAnimationFrames: () => frames.size,
    windowListenerCount: () => [...windowListeners.values()].reduce((total, handlers) => total + handlers.size, 0),
    flushAnimationFrame() {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback();
    },
    flushTimers(elapsed) {
      const due = [];
      for (const [timer, entry] of timers) {
        entry.delay -= elapsed;
        if (entry.delay <= 0) {
          timers.delete(timer);
          due.push(entry.callback);
        }
      }
      for (const callback of due) callback();
    }
  };

  try {
    return run(runtime);
  } finally {
    for (const [name, original] of originals) {
      if (original.exists) globalThis[name] = original.value;
      else delete globalThis[name];
    }
  }
}

test('detects Chromium and Edge brands without treating Safari as Chromium', () => {
  assert.equal(isChromiumEngine({ userAgentData: { brands: [{ brand: 'Chromium' }] } }), true);
  assert.equal(isChromiumEngine({ userAgent: 'Mozilla/5.0 Edg/140.0.0.0' }), true);
  assert.equal(isChromiumEngine({ userAgent: 'Mozilla/5.0 Version/18.0 Safari/605.1.15' }), false);
});

test('selects refraction only for Chromium with ordinary backdrop filtering', () => {
  assert.equal(resolveLiquidGlassMode({ isChromium: true, supportsBackdropFilter: true }), LIQUID_GLASS_MODES.refractive);
  assert.equal(resolveLiquidGlassMode({ isChromium: false, supportsBackdropFilter: true }), LIQUID_GLASS_MODES.frosted);
  assert.equal(resolveLiquidGlassMode({ isChromium: true, supportsBackdropFilter: false }), LIQUID_GLASS_MODES.frosted);
});

test('forced colors and reduced transparency always select opaque mode', () => {
  assert.equal(resolveLiquidGlassMode({ isChromium: true, supportsBackdropFilter: true, forcedColors: true }), LIQUID_GLASS_MODES.opaque);
  assert.equal(resolveLiquidGlassMode({ isChromium: true, supportsBackdropFilter: true, reducedTransparency: true }), LIQUID_GLASS_MODES.opaque);
});

test('installs, updates, and cleans root glass state through modern media listeners', () => {
  const { document, mediaQueries, window } = createEnvironment();
  const cleanup = installLiquidGlassEnvironment({ window, document });
  const root = document.documentElement;

  assert.equal(root.dataset.uiGlassMode, LIQUID_GLASS_MODES.refractive);
  assert.equal(root.dataset.uiGlassMotion, 'full');

  mediaQueries.get('(forced-colors: active)').emit(true);
  assert.equal(root.dataset.uiGlassMode, LIQUID_GLASS_MODES.opaque);

  mediaQueries.get('(forced-colors: active)').emit(false);
  mediaQueries.get('(prefers-reduced-motion: reduce)').emit(true);
  assert.equal(root.dataset.uiGlassMode, LIQUID_GLASS_MODES.refractive);
  assert.equal(root.dataset.uiGlassMotion, 'reduced');

  cleanup();
  cleanup();
  assert.equal(root.dataset.uiGlassMode, undefined);
  assert.equal(root.dataset.uiGlassMotion, undefined);
  assert.equal([...mediaQueries.values()].every((query) => query.listenerCount() === 0), true);
});

test('uses legacy media listeners when change events are unavailable', () => {
  const { document, mediaQueries, window } = createEnvironment({ legacy: true });
  const cleanup = installLiquidGlassEnvironment({ window, document });

  mediaQueries.get('(prefers-reduced-transparency: reduce)').emit(true);
  assert.equal(document.documentElement.dataset.uiGlassMode, LIQUID_GLASS_MODES.opaque);

  cleanup();
  assert.equal([...mediaQueries.values()].every((query) => query.listenerCount() === 0), true);
});

test('bakes a neutral center and visible rounded-rect edge refraction', () => {
  const field = buildLiquidGlassDisplacement({
    width: 40,
    height: 24,
    radius: 8,
    viewportWidth: 1440,
    viewportHeight: 1000,
    config: GLASS_PRESET
  });
  const centerSamples = [
    [field.mapWidth / 2 - 1, field.mapHeight / 2 - 1],
    [field.mapWidth / 2, field.mapHeight / 2 - 1],
    [field.mapWidth / 2 - 1, field.mapHeight / 2],
    [field.mapWidth / 2, field.mapHeight / 2]
  ].map(([x, y]) => {
    const offset = (y * field.mapWidth + x) * 4;
    return [
      decodeDisplacement(field.rgba[offset], field.scale),
      decodeDisplacement(field.rgba[offset + 1], field.scale)
    ];
  });
  const centerX = centerSamples.reduce((total, [value]) => total + value, 0) / centerSamples.length;
  const centerY = centerSamples.reduce((total, [, value]) => total + value, 0) / centerSamples.length;

  assert.equal(field.rgba.length, field.mapWidth * field.mapHeight * 4);
  assert.ok(Math.abs(centerX) <= 0.5);
  assert.ok(Math.abs(centerY) <= 0.5);
  assert.ok(maxEdgeDisplacement(field) > 1);
  assert.ok(field.scale > 0);
});

test('bounds wide displacement maps and derives a stable geometry cache key', () => {
  const input = {
    width: 2000,
    height: 100,
    radius: 8,
    viewportWidth: 1440,
    viewportHeight: 1000
  };
  const bounded = buildLiquidGlassDisplacement(input);
  const repeated = buildLiquidGlassDisplacement(input);

  assert.ok(Math.max(bounded.mapWidth, bounded.mapHeight) <= 1400);
  assert.equal(bounded.cacheKey, repeated.cacheKey);
});

test('rejects surfaces whose minimum sampling factor still exceeds the map edge cap', () => {
  assert.throws(() => buildLiquidGlassDisplacement({
    width: 6000,
    height: 100,
    radius: 8,
    viewportWidth: 1440,
    viewportHeight: 1000
  }), RangeError);
});

test('tracks pointer coordinates from DOMRect geometry with non-enumerable fields', () => {
  withFakeGlassRuntime(({ flushAnimationFrame }) => {
    const element = createFakeGlassElement({ left: 10, top: 20, width: 200, height: 100 });
    const browserRect = {};
    Object.defineProperties(browserRect, {
      left: { value: 10 },
      top: { value: 20 },
      width: { value: 200 },
      height: { value: 100 }
    });
    element.getBoundingClientRect = () => browserRect;
    liquidGlassDirective.mounted(element);

    try {
      element.dispatch('pointermove', { clientX: 160, clientY: 45 });
      flushAnimationFrame();

      assert.equal(element.style.values.get('--ui-glass-pointer-x'), '75%');
      assert.equal(element.style.values.get('--ui-glass-pointer-y'), '25%');
    } finally {
      liquidGlassDirective.unmounted(element);
    }
  });
});

test('tracks glass pointer state, debounces viewport rebuilds, and disposes resources', () => {
  withFakeGlassRuntime(({ activeResizeObservers, defs, flushAnimationFrame, flushTimers, window }) => {
    const element = createFakeGlassElement({ left: 10, top: 20, width: 200, height: 100 });
    liquidGlassDirective.mounted(element);

    element.dispatch('pointermove', { clientX: 160, clientY: 45 });
    flushAnimationFrame();
    assert.equal(element.style.values.get('--ui-glass-pointer-x'), '75%');
    assert.equal(element.style.values.get('--ui-glass-pointer-y'), '25%');
    assert.equal(element.style.values.get('--ui-glass-surface-width'), '200px');
    assert.equal(element.style.values.get('--ui-glass-surface-height'), '100px');
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), true);

    element.style.calls = [];
    element.dispatch('pointermove', { clientX: 30, clientY: 30 });
    element.dispatch('pointermove', { clientX: 50, clientY: 40 });
    element.dispatch('pointermove', { clientX: 70, clientY: 50 });
    flushAnimationFrame();
    assert.deepEqual(element.style.calls, [
      ['--ui-glass-pointer-x', '30%'],
      ['--ui-glass-pointer-y', '30%']
    ]);

    const initialFilter = element.style.backdropFilter;
    window.innerWidth = 1600;
    window.dispatch('resize');
    flushTimers(179);
    assert.equal(element.style.backdropFilter, initialFilter);
    flushTimers(1);
    flushAnimationFrame();
    assert.notEqual(element.style.backdropFilter, initialFilter);
    assert.equal(defs.children.length, 1);

    element.dispatch('pointerleave');
    assert.equal(element.style.values.get('--ui-glass-pointer-x'), '50%');
    assert.equal(element.style.values.get('--ui-glass-pointer-y'), '0%');

    liquidGlassDirective.unmounted(element);
    assert.equal(element.listenerCount(), 0);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(element.style.backdropFilter, '');
    assert.equal(element.style.values.size, 0);
    assert.equal(defs.children.length, 0);
  });
});

test('directive binding suspends hidden surfaces and resumes one lifecycle when visible again', () => {
  withFakeGlassRuntime(({ activeResizeObservers, defs, flushAnimationFrame, windowListenerCount }) => {
    const element = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });

    liquidGlassDirective.mounted(element, { value: false });
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), false);
    assert.equal(element.listenerCount(), 0);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
    assert.equal(element.style.backdropFilter, '');
    assert.equal(element.style.webkitBackdropFilter, '');
    assert.equal(element.style.values.size, 0);
    assert.equal(defs.children.length, 0);

    liquidGlassDirective.updated(element, { value: false });
    assert.equal(element.listenerCount(), 0);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
    assert.equal(defs.children.length, 0);

    liquidGlassDirective.updated(element, {});
    flushAnimationFrame();
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), true);
    assert.equal(element.listenerCount(), 2);
    assert.equal(activeResizeObservers(), 1);
    assert.equal(windowListenerCount(), 1);
    assert.match(element.style.backdropFilter, /^url\(#ui-liquid-glass-\d+\)$/);
    assert.equal(element.style.webkitBackdropFilter, element.style.backdropFilter);
    assert.equal(defs.children.length, 1);

    const restoredFilter = element.style.backdropFilter;
    liquidGlassDirective.updated(element, { value: true });
    flushAnimationFrame();
    assert.equal(element.listenerCount(), 2);
    assert.equal(activeResizeObservers(), 1);
    assert.equal(windowListenerCount(), 1);
    assert.equal(element.style.backdropFilter, restoredFilter);
    assert.equal(defs.children.length, 1);

    liquidGlassDirective.updated(element, { value: false });
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), false);
    assert.equal(element.listenerCount(), 0);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
    assert.equal(element.style.backdropFilter, '');
    assert.equal(element.style.webkitBackdropFilter, '');
    assert.equal(element.style.values.size, 0);
    assert.equal(defs.children.length, 0);

    liquidGlassDirective.unmounted(element);
    assert.equal(element.listenerCount(), 0);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
  });
});

test('plugin activation leaves directive-binding-suspended surfaces inactive', () => {
  withFakeGlassRuntime(({ activeResizeObservers, defs, flushAnimationFrame, windowListenerCount }) => {
    let registeredDirective;
    let lifecycleBridge;
    liquidGlassPlugin.install({
      directive(name, directive) {
        assert.equal(name, 'liquid-glass');
        registeredDirective = directive;
      },
      mixin(bridge) {
        lifecycleBridge = bridge;
      },
      onUnmount() {}
    });

    const element = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    const keptAliveRoot = { contains: (candidate) => candidate === element };
    registeredDirective.mounted(element, { value: false });
    lifecycleBridge.activated.call({ $el: keptAliveRoot });
    flushAnimationFrame();

    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), false);
    assert.equal(element.listenerCount(), 0);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
    assert.equal(defs.children.length, 0);

    registeredDirective.unmounted(element);
  });
});

test('shares one connected filter between equal glass surfaces until the final release', () => {
  withFakeGlassRuntime(({ defs, flushAnimationFrame }) => {
    const first = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    const second = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    liquidGlassDirective.mounted(first);
    liquidGlassDirective.mounted(second);
    flushAnimationFrame();

    assert.equal(defs.children.length, 1);
    assert.equal(first.style.backdropFilter, second.style.backdropFilter);

    liquidGlassDirective.unmounted(first);
    assert.equal(defs.children.length, 1);
    liquidGlassDirective.unmounted(second);
    assert.equal(defs.children.length, 0);
  });
});

test('resolves CSS refraction blur per surface for SVG blur and filter sharing', () => {
  withFakeGlassRuntime(({ defs, flushAnimationFrame }) => {
    const defaultSurface = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    const prominentSurface = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100, refractionBlur: '16' });
    const matchingProminentSurface = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100, refractionBlur: '16' });
    const invalidSurface = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100, refractionBlur: 'invalid' });
    const negativeSurface = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100, refractionBlur: '-2' });
    const cappedSurface = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100, refractionBlur: '128' });
    const surfaces = [
      defaultSurface,
      prominentSurface,
      matchingProminentSurface,
      invalidSurface,
      negativeSurface,
      cappedSurface
    ];

    for (const surface of surfaces) liquidGlassDirective.mounted(surface);
    flushAnimationFrame();

    try {
      assert.equal(defs.children.length, 3);
      assert.deepEqual(
        defs.children.map((filter) => filter.children.find((node) => node.tagName === 'feGaussianBlur')?.getAttribute('stdDeviation')).sort(),
        ['0.7', '5.6', '22.4'].sort()
      );
      assert.notEqual(defaultSurface.style.backdropFilter, prominentSurface.style.backdropFilter);
      assert.equal(prominentSurface.style.backdropFilter, matchingProminentSurface.style.backdropFilter);
      assert.equal(defaultSurface.style.backdropFilter, invalidSurface.style.backdropFilter);
      assert.equal(defaultSurface.style.backdropFilter, negativeSurface.style.backdropFilter);
      assert.notEqual(defaultSurface.style.backdropFilter, cappedSurface.style.backdropFilter);
    } finally {
      for (const surface of surfaces) liquidGlassDirective.unmounted(surface);
    }
  });
});

test('keeps CSS frost when an oversized directive surface cannot meet the map cap', () => {
  withFakeGlassRuntime(({ activeResizeObservers, defs, flushAnimationFrame }) => {
    const element = createFakeGlassElement({ left: 0, top: 0, width: 6000, height: 100 });
    liquidGlassDirective.mounted(element);

    try {
      assert.doesNotThrow(() => flushAnimationFrame());
      assert.equal(element.style.backdropFilter, '');
      assert.equal(defs.children.length, 0);
    } finally {
      liquidGlassDirective.unmounted(element);
      assert.equal(activeResizeObservers(), 0);
    }
  });
});

test('immediately clears mounted refraction when forced colors changes the environment mode', () => {
  withFakeGlassRuntime(({ defs, document, flushAnimationFrame, window }) => {
    const mediaQueries = new Map([
      ['(prefers-reduced-transparency: reduce)', createMediaQueryList()],
      ['(forced-colors: active)', createMediaQueryList()],
      ['(prefers-reduced-motion: reduce)', createMediaQueryList()]
    ]);
    window.matchMedia = (query) => mediaQueries.get(query);
    const cleanupEnvironment = installLiquidGlassEnvironment();
    const element = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    liquidGlassDirective.mounted(element);
    try {
      flushAnimationFrame();
      assert.match(element.style.backdropFilter, /^url\(#ui-liquid-glass-\d+\)$/);
      assert.equal(defs.children.length, 1);

      mediaQueries.get('(forced-colors: active)').emit(true);
      assert.equal(document.documentElement.dataset.uiGlassMode, LIQUID_GLASS_MODES.opaque);
      assert.equal(element.style.backdropFilter, '');
      assert.equal(defs.children.length, 0);
    } finally {
      liquidGlassDirective.unmounted(element);
      cleanupEnvironment();
    }
  });
});

test('cleans partial directive setup when observing immediately throws', () => {
  withFakeGlassRuntime(({ activeResizeObservers, defs, pendingAnimationFrames }) => {
    const element = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    let disconnected = false;
    globalThis.ResizeObserver = class {
      observe() {
        throw new Error('observe failed');
      }

      disconnect() {
        disconnected = true;
      }
    };

    assert.doesNotThrow(() => liquidGlassDirective.mounted(element));
    assert.equal(disconnected, true);
    assert.equal(element.listenerCount(), 0);
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), false);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(pendingAnimationFrames(), 0);
    assert.equal(defs.children.length, 0);
  });
});

test('continues directive cleanup after one removal API throws', () => {
  withFakeGlassRuntime(({ activeResizeObservers, defs, flushAnimationFrame, pendingAnimationFrames, windowListenerCount }) => {
    const element = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    liquidGlassDirective.mounted(element);
    flushAnimationFrame();
    assert.equal(defs.children.length, 1);
    const removeListener = element.removeEventListener;
    let shouldThrow = true;
    element.removeEventListener = (...args) => {
      removeListener(...args);
      if (shouldThrow) {
        shouldThrow = false;
        throw new Error('remove listener failed');
      }
    };

    assert.doesNotThrow(() => liquidGlassDirective.unmounted(element));
    assert.equal(element.listenerCount(), 0);
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), false);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
    assert.equal(pendingAnimationFrames(), 0);
    assert.equal(element.style.values.size, 0);
    assert.equal(element.style.backdropFilter, '');
    assert.equal(defs.children.length, 0);
  });
});

test('plugin bridge suspends kept-alive glass surfaces and resumes them once on activation', () => {
  withFakeGlassRuntime(({ activeResizeObservers, defs, flushAnimationFrame, windowListenerCount }) => {
    let registeredDirective;
    let lifecycleBridge;
    const app = {
      directive(name, directive) {
        assert.equal(name, 'liquid-glass');
        registeredDirective = directive;
      },
      mixin(bridge) {
        lifecycleBridge = bridge;
      },
      onUnmount() {}
    };
    liquidGlassPlugin.install(app);

    const element = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    const keptAliveRoot = { contains: (candidate) => candidate === element };
    registeredDirective.mounted(element);
    flushAnimationFrame();
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), true);
    assert.equal(activeResizeObservers(), 1);
    assert.equal(windowListenerCount(), 1);
    assert.equal(defs.children.length, 1);

    lifecycleBridge.deactivated.call({ $el: keptAliveRoot });
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), false);
    assert.equal(element.style.backdropFilter, '');
    assert.equal(element.style.values.size, 0);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
    assert.equal(defs.children.length, 0);

    lifecycleBridge.activated.call({ $el: keptAliveRoot });
    lifecycleBridge.activated.call({ $el: keptAliveRoot });
    flushAnimationFrame();
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), true);
    assert.match(element.style.backdropFilter, /^url\(#ui-liquid-glass-\d+\)$/);
    assert.equal(activeResizeObservers(), 1);
    assert.equal(windowListenerCount(), 1);
    assert.equal(defs.children.length, 1);

    registeredDirective.unmounted(element);
    lifecycleBridge.activated.call({ $el: keptAliveRoot });
    flushAnimationFrame();
    assert.equal(defs.children.length, 0);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
  });
});

test('plugin bridge suspends and restores a disconnected surface behind a Fragment root', () => {
  withFakeGlassRuntime(({ activeResizeObservers, defs, flushAnimationFrame, windowListenerCount }) => {
    let registeredDirective;
    let lifecycleBridge;
    liquidGlassPlugin.install({
      directive(name, directive) {
        assert.equal(name, 'liquid-glass');
        registeredDirective = directive;
      },
      mixin(bridge) {
        lifecycleBridge = bridge;
      },
      onUnmount() {}
    });

    const element = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    const fragmentAnchor = { contains: () => false };
    const component = { $el: fragmentAnchor };
    registeredDirective.mounted(element, { instance: component });
    flushAnimationFrame();

    element.connected = false;
    lifecycleBridge.deactivated.call(component);
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), false);
    assert.equal(element.style.backdropFilter, '');
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
    assert.equal(defs.children.length, 0);

    registeredDirective.updated(element, {});
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), false);
    assert.equal(element.style.backdropFilter, '');
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
    assert.equal(defs.children.length, 0);

    element.connected = true;
    lifecycleBridge.activated.call(component);
    flushAnimationFrame();
    assert.equal(element.hasAttribute('data-liquid-glass-interactive'), true);
    assert.match(element.style.backdropFilter, /^url\(#ui-liquid-glass-\d+\)$/);
    assert.equal(activeResizeObservers(), 1);
    assert.equal(windowListenerCount(), 1);
    assert.equal(defs.children.length, 1);

    registeredDirective.unmounted(element);
  });
});

test('plugin bridge keeps disconnected surfaces scoped to their owning component instance', () => {
  withFakeGlassRuntime(({ activeResizeObservers, defs, flushAnimationFrame, windowListenerCount }) => {
    let registeredDirective;
    let lifecycleBridge;
    liquidGlassPlugin.install({
      directive(name, directive) {
        assert.equal(name, 'liquid-glass');
        registeredDirective = directive;
      },
      mixin(bridge) {
        lifecycleBridge = bridge;
      },
      onUnmount() {}
    });

    const ownerA = {};
    const ownerB = {};
    const elementA = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    const elementB = createFakeGlassElement({ left: 0, top: 0, width: 200, height: 100 });
    const rootA = { contains: () => false };
    const rootB = { contains: () => false };
    ownerA.$el = rootA;
    ownerB.$el = rootB;
    registeredDirective.mounted(elementA, { instance: ownerA });
    registeredDirective.mounted(elementB, { instance: ownerB });
    flushAnimationFrame();
    assert.equal(activeResizeObservers(), 2);
    assert.equal(defs.children.length, 1);

    elementB.connected = false;
    lifecycleBridge.deactivated.call(ownerB);
    assert.equal(elementA.hasAttribute('data-liquid-glass-interactive'), true);
    assert.equal(elementB.hasAttribute('data-liquid-glass-interactive'), false);
    assert.equal(activeResizeObservers(), 1);
    assert.equal(windowListenerCount(), 1);
    assert.equal(defs.children.length, 1);

    elementA.connected = false;
    lifecycleBridge.deactivated.call(ownerA);
    assert.equal(activeResizeObservers(), 0);
    assert.equal(windowListenerCount(), 0);
    assert.equal(defs.children.length, 0);

    elementB.connected = true;
    elementA.connected = true;
    lifecycleBridge.activated.call(ownerA);
    flushAnimationFrame();
    assert.equal(elementA.hasAttribute('data-liquid-glass-interactive'), true);
    assert.equal(elementB.hasAttribute('data-liquid-glass-interactive'), false);
    assert.equal(activeResizeObservers(), 1);
    assert.equal(windowListenerCount(), 1);
    assert.equal(defs.children.length, 1);

    lifecycleBridge.activated.call(ownerB);
    flushAnimationFrame();
    assert.equal(elementB.hasAttribute('data-liquid-glass-interactive'), true);
    assert.equal(activeResizeObservers(), 2);
    assert.equal(windowListenerCount(), 2);
    assert.equal(defs.children.length, 1);

    registeredDirective.unmounted(elementA);
    registeredDirective.unmounted(elementB);
  });
});

test('registers the directive and environment cleanup through the Vue plugin', () => {
  withFakeGlassRuntime(({ document }) => {
    let registeredDirective;
    let cleanup;
    liquidGlassPlugin.install({
      directive(name, directive) {
        assert.equal(name, 'liquid-glass');
        registeredDirective = directive;
      },
      onUnmount(callback) {
        cleanup = callback;
      }
    });

    assert.equal(registeredDirective, liquidGlassDirective);
    assert.equal(document.documentElement.dataset.uiGlassMode, LIQUID_GLASS_MODES.refractive);
    cleanup();
    assert.equal(document.documentElement.dataset.uiGlassMode, undefined);
  });
});
