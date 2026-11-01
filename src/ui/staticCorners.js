import { splitCssWords, staticBorderPaint, staticShadowPresence } from './staticCornerPaint.js';

const states = new WeakMap();
const isPaint = name => /^(background(?:-|$)|(?:-webkit-)?backdrop-filter$)/.test(name);
const isBorder = name => name.startsWith('border') && !name.includes('radius');

// Capture callers need the visible declared material, rather than the transparent
// fallback host. Selecting the known paint child performs no layout/style reads.
export function getStaticCornerPaintElement(element) {
  if (!element.hasAttribute('data-ui-static-fallback') || element.matches('.preview-config-panel.is-collapsed,.preview-panel.is-collapsed,.special-toolbar-actions:not(.has-cover)')) return element;
  return [...element.children].find(child => child.classList.contains('ui-static-corner-skin')) || element;
}

// Presets and paint rules are compiled into CSS. Only declared inline paint is
// forwarded here: no computed styles, layout reads, DOM observers or frame loops.
export function ensureStaticCornerSkin(element) {
  let skin = [...element.children].find(child => child.classList.contains('ui-static-corner-skin'));
  if (!skin) {
    skin = element.ownerDocument.createElement(element.tagName === 'TABLE' ? 'caption' : 'span');
    skin.className = 'ui-static-corner-skin';
    skin.setAttribute('aria-hidden', 'true');
    for (const attribute of element.attributes) if (attribute.name.startsWith('data-v-')) skin.setAttribute(attribute.name, '');
    element.appendChild(skin);
  }
  return skin;
}

function updatePaint(element) {
  const state = states.get(element);
  if (!state) return;
  const skin = state.fallback ? ensureStaticCornerSkin(element) : null;
  const properties = {};
  const paint = {};
  const uniform = new Set();
  const declaredSides = ['top', 'right', 'bottom', 'left'].map(side => [side, element.style.getPropertyValue(`border-${side}`)]);
  const counts = new Map();
  for (const [, value] of declaredSides) if (value) counts.set(value, (counts.get(value) || 0) + 1);
  const common = [...counts].find(([, count]) => count >= 3);
  if (common && declaredSides.every(([, value]) => value)) {
    Object.assign(properties, staticBorderPaint('border', common[0]));
    for (const [side, value] of declaredSides) if (value !== common[0]) Object.assign(properties, staticBorderPaint(`border-${side}`, value));
    uniform.add('');
  }
  for (const name of ['border', 'border-width', 'border-style', 'border-color']) {
    if (uniform.has('')) break;
    const value = element.style.getPropertyValue(name);
    if (!value || (name !== 'border' && splitCssWords(value).length > 1)) continue;
    Object.assign(properties, staticBorderPaint(name, value));
    uniform.add(name.slice('border'.length));
  }
  for (const name of element.style) {
    if (name === 'box-shadow') properties['--ui-static-shadow-enabled'] = staticShadowPresence(element.style.getPropertyValue(name));
    if (isPaint(name)) paint[name] = [element.style.getPropertyValue(name), element.style.getPropertyPriority(name)];
    if (isBorder(name) && !uniform.has('') && ![...uniform].some(suffix => suffix && name.endsWith(suffix))) Object.assign(properties, staticBorderPaint(name, element.style.getPropertyValue(name)));
  }
  for (const name of state.properties) if (!(name in properties)) element.style.removeProperty(name);
  for (const [name, value] of Object.entries(properties)) if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
  state.properties = new Set(Object.keys(properties));
  if (skin) {
    for (const name of state.paint) if (!(name in paint)) skin.style.removeProperty(name);
    for (const [name, [value, priority]] of Object.entries(paint)) if (skin.style.getPropertyValue(name) !== value || skin.style.getPropertyPriority(name) !== priority) skin.style.setProperty(name, value, priority);
    state.paint = new Set(Object.keys(paint));
  }
}

export const staticCornersDirective = {
  mounted(element) {
    const fallback = element.hasAttribute('data-ui-static-paint') || !element.ownerDocument.defaultView.CSS?.supports?.('corner-shape', 'superellipse(1.5)');
    states.set(element, { fallback, properties: new Set(), paint: new Set() });
    if (fallback) element.setAttribute('data-ui-static-fallback', '');
    updatePaint(element);
  },
  updated: updatePaint,
  beforeUnmount(element) { states.delete(element); }
};

export const staticCornersPlugin = {
  install(app) { app.directive('static-corners', staticCornersDirective); }
};
