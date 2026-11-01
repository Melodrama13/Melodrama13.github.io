import { ensureStaticCornerSkin } from './staticCorners.js';

const leases = new WeakMap();
const masks = new Map();
const paintProperties = ['background-color', 'background-image', 'background-position', 'background-size', 'background-repeat', 'background-origin', 'background-clip', 'background-attachment', 'background-blend-mode', 'opacity', '-webkit-mask-box-image-source', '-webkit-mask-box-image-slice', '-webkit-mask-box-image-width', '-webkit-mask-box-image-repeat'];

async function paintImage(document, root, width, height, positioning) {
  const xml = new document.defaultView.XMLSerializer().serializeToString(root);
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;
  const image = document.createElement('img');
  image.className = 'ui-static-corner-capture';
  image.setAttribute('aria-hidden', 'true');
  image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(source)))}`;
  image.style.cssText = `position:absolute;${positioning};width:${width}px;height:${height}px;max-width:none;pointer-events:none;`;
  await image.decode();
  return image;
}

async function embedMask(value, document) {
  const matches = [...value.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
  for (const [raw, path] of matches) {
    if (path.startsWith('data:')) continue;
    const url = new URL(path, document.baseURI);
    const fragment = url.hash;
    url.hash = '';
    if (!masks.has(url.href)) masks.set(url.href, document.defaultView.fetch(url.href).then(async response => {
      if (!response.ok) throw new Error(`Corner mask ${response.status}: ${url.pathname}`);
      return `data:image/svg+xml;base64,${btoa(await response.text())}`;
    }).catch(error => { masks.delete(url.href); throw error; }));
    value = value.replace(raw, `url('${await masks.get(url.href)}${fragment}')`);
  }
  return value;
}

async function paintLayer(document, computed, width, height) {
  const node = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
  node.style.cssText = `position:absolute;inset:0;width:${width}px;height:${height}px;pointer-events:none;`;
  for (const name of paintProperties) {
    let value = computed.getPropertyValue(name);
    if (name === '-webkit-mask-box-image-source') value = await embedMask(value, document);
    if (value) node.style.setProperty(name, value);
  }
  return node;
}

async function clippedChildPaint(host, width, height, hostStyle) {
  const scroll = host.querySelector(':scope > .ui-static-corner-scroll');
  const source = hostStyle.getPropertyValue(scroll ? '--ui-static-inner-fill-mask' : '-webkit-mask-box-image-source');
  if (!source || source === 'none') return { root: null, hidden: [] };
  const document = host.ownerDocument, window = document.defaultView;
  const box = host.getBoundingClientRect(), scaleX = width / box.width, scaleY = height / box.height;
  const radius = Math.max(...hostStyle.getPropertyValue('--ui-corner-radii').trim().split(/\s+/).map(Number.parseFloat));
  const root = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
  root.style.cssText = `position:absolute;inset:0;width:${width}px;height:${height}px;`;
  for (const property of paintProperties.filter(name => name.startsWith('-webkit-mask-box'))) {
    let value = scroll ? ({
      '-webkit-mask-box-image-source': source,
      '-webkit-mask-box-image-slice': `${hostStyle.getPropertyValue('--ui-static-mask-slice')} fill`,
      '-webkit-mask-box-image-width': hostStyle.getPropertyValue('--ui-static-mask-width'),
      '-webkit-mask-box-image-repeat': 'stretch'
    }[property] || '') : hostStyle.getPropertyValue(property);
    if (property.endsWith('source')) value = await embedMask(value, document);
    root.style.setProperty(property, value);
  }
  const hidden = [];
  for (const child of host.querySelectorAll('*')) {
    if (child.closest('.ui-static-corner-skin,.ui-static-corner-capture') || child.closest('[data-ui-static-corner]') !== host || /^(IMG|SVG|PATH|INPUT|SELECT|TEXTAREA|BUTTON|CANVAS)$/.test(child.tagName)) continue;
    const rect = child.getBoundingClientRect(), x = (rect.x - box.x) * scaleX, y = (rect.y - box.y) * scaleY;
    const w = rect.width * scaleX, h = rect.height * scaleY;
    if (!(w > 0 && h > 0) || !(x < radius || x + w > width - radius) || !(y < radius || y + h > height - radius)) continue;
    const style = window.getComputedStyle(child);
    const nearCorner = (value, length) => value >= 0 && value <= length && (value < radius || value > length - radius);
    const cornerSides = [
      ['top', nearCorner(y, height) && (x < radius || x + w > width - radius)],
      ['bottom', nearCorner(y + h, height) && (x < radius || x + w > width - radius)],
      ['left', nearCorner(x, width) && (y < radius || y + h > height - radius)],
      ['right', nearCorner(x + w, width) && (y < radius || y + h > height - radius)]
    ].filter(([side, touches]) => touches && Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 && style.getPropertyValue(`border-${side}-style`) !== 'none').map(([side]) => side);
    if (!cornerSides.length && style.backgroundImage === 'none' && /^(transparent|rgba\(0, 0, 0, 0\))$/.test(style.backgroundColor)) continue;
    const paint = await paintLayer(document, style, w, h);
    paint.style.boxSizing = 'border-box';
    for (const side of cornerSides) for (const part of ['width', 'style', 'color']) paint.style.setProperty(`border-${side}-${part}`, style.getPropertyValue(`border-${side}-${part}`));
    paint.style.setProperty('inset', 'auto');
    paint.style.left = `${x}px`; paint.style.top = `${y}px`;
    root.append(paint);
    const saved = prefix => [...child.style].filter(name => name === prefix || name.startsWith(`${prefix}-`)).map(name => [name, child.style.getPropertyValue(name), child.style.getPropertyPriority(name)]);
    hidden.push([child, saved('background'), cornerSides, cornerSides.length ? saved('border') : []]);
  }
  return { root: hidden.length ? root : null, hidden };
}

async function renderSkin(host, skin) {
  const document = host.ownerDocument, window = document.defaultView;
  const style = window.getComputedStyle(skin);
  if (style.display === 'none') return () => {};
  // Raster output dimensions are read only during export. The contour always
  // comes from the same baked nine-slice mask; no paths or radii are derived.
  const width = Number.parseFloat(style.width), height = Number.parseFloat(style.height);
  if (!(width > 0 && height > 0)) return () => {};
  const root = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
  root.style.cssText = `position:relative;width:${width}px;height:${height}px;`;
  root.append(await paintLayer(document, style, width, height));
  for (const pseudo of ['::before', '::after']) {
    const paint = window.getComputedStyle(skin, pseudo);
    if (paint.display !== 'none' && paint.content !== 'none') root.append(await paintLayer(document, paint, width, height));
  }
  const clipped = await clippedChildPaint(host, width, height, window.getComputedStyle(host));
  if (clipped.root) root.append(clipped.root);
  let output = root, outputWidth = width, outputHeight = height, top = style.top, left = style.left, active = false;
  if (host.matches('.event-item.is-active')) {
    const paint = window.getComputedStyle(host, '::before');
    const w = Number.parseFloat(paint.width), h = Number.parseFloat(paint.height);
    if (w > 0 && h > 0) {
      output = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      output.style.cssText = `position:relative;width:${w}px;height:${h}px;`;
      root.style.position = 'absolute'; root.style.top = '3px'; root.style.left = '3px';
      output.append(root, await paintLayer(document, paint, w, h));
      outputWidth = w; outputHeight = h; top = paint.top; left = paint.left; active = true;
    }
  }
  // One composited image avoids html2canvas's reversed ordering of separate
  // negative-z-index children. Text and interactive children remain real DOM.
  const image = await paintImage(document, output, outputWidth, outputHeight, `top:${top};left:${left};z-index:-2`);
  const visibility = skin.style.getPropertyValue('visibility'), priority = skin.style.getPropertyPriority('visibility');
  host.appendChild(image);
  for (const [child, , sides] of clipped.hidden) {
    child.style.setProperty('background', 'none', 'important');
    for (const side of sides) child.style.setProperty(`border-${side}-color`, 'transparent', 'important');
  }
  if (active) host.setAttribute('data-ui-static-capture-active', '');
  skin.style.setProperty('visibility', 'hidden', 'important');
  return () => {
    image.remove(); host.removeAttribute('data-ui-static-capture-active');
    for (const [child, paint, sides, border] of clipped.hidden) {
      child.style.removeProperty('background'); for (const [name, value, important] of paint) child.style.setProperty(name, value, important);
      if (sides.length) {
        for (const name of [...child.style]) if (name === 'border' || name.startsWith('border-')) child.style.removeProperty(name);
        for (const [name, value, important] of border) child.style.setProperty(name, value, important);
      }
    }
    if (visibility) skin.style.setProperty('visibility', visibility, priority); else skin.style.removeProperty('visibility');
  };
}

function acquire(host) {
  const existing = leases.get(host);
  if (existing) { existing.count++; return existing; }
  const fallback = host.hasAttribute('data-ui-static-fallback');
  const previousSkin = [...host.children].find(child => child.classList.contains('ui-static-corner-skin'));
  const skin = ensureStaticCornerSkin(host);
  const previousPaint = skin.style.cssText;
  const captureSources = ['-webkit-mask-box-image-source', 'border-image-source'];
  const previousSources = captureSources.map(name => [name, host.style.getPropertyValue(name), host.style.getPropertyPriority(name)]);
  // Clones can receive export paint after cloneNode, including fallback clones.
  for (const name of host.style) if (/^(background(?:-|$)|(?:-webkit-)?backdrop-filter$)/.test(name)) skin.style.setProperty(name, host.style.getPropertyValue(name), host.style.getPropertyPriority(name));
  if (!fallback) host.setAttribute('data-ui-static-fallback', '');
  host.setAttribute('data-ui-static-capture', '');
  const lease = { count: 1 };
  lease.promise = (async () => {
    const computed = host.ownerDocument.defaultView.getComputedStyle(host);
    for (const name of captureSources) {
      const source = computed.getPropertyValue(name);
      if (source && source !== 'none') host.style.setProperty(name, await embedMask(source, host.ownerDocument), 'important');
    }
    lease.restore = await renderSkin(host, skin);
  })();
  lease.release = () => {
    if (--lease.count) return;
    lease.restore?.();
    skin.style.cssText = previousPaint;
    for (const [name, value, priority] of previousSources) { if (value) host.style.setProperty(name, value, priority); else host.style.removeProperty(name); }
    if (!previousSkin) skin.remove();
    if (!fallback) host.removeAttribute('data-ui-static-fallback');
    host.removeAttribute('data-ui-static-capture');
    leases.delete(host);
  };
  leases.set(host, lease);
  return lease;
}

export async function prepareStaticCornerRender(root) {
  const hosts = [...(root?.matches?.('[data-ui-static-corner]') ? [root] : []), ...(root?.querySelectorAll?.('[data-ui-static-corner]') || [])];
  const acquired = hosts.map(acquire);
  try { await Promise.all(acquired.map(lease => lease.promise)); }
  catch (error) { await Promise.allSettled(acquired.map(lease => lease.promise)); acquired.forEach(lease => lease.release()); throw error; }
  let released = false;
  return () => { if (!released) { released = true; acquired.forEach(lease => lease.release()); } };
}
