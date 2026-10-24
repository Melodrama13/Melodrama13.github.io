/** Temporary controls on existing media slots, without replacing Vue-owned images. */
export function createMediaImageRetryControls(onRetry) {
  const controls = new Map(), hosts = new Map();
  const setAttribute = (control, element, name, value) => {
    let entry = control.attributes.find(item => item.element === element && item.name === name);
    if (!entry) {
      entry = { element, name, previous: element.getAttribute(name) };
      control.attributes.push(entry);
    }
    entry.value = value;
    element.setAttribute(name, value);
  };
  const clear = image => {
    const control = controls.get(image);
    if (!control) return;
    controls.delete(image); hosts.delete(control.host); control.overlay.remove();
    for (const { element, name, previous, value } of control.attributes) {
      if (element.getAttribute(name) !== value) continue;
      if (previous === null) element.removeAttribute(name);
      else element.setAttribute(name, previous);
    }
    if (!control.hadClass) control.host.classList.remove('media-image-retry-host');
  };
  const update = (control, loading) => {
    const description = loading ? '正在重新加载' : '加载失败，点击重试';
    setAttribute(control, control.host, 'data-media-retry', loading ? 'loading' : 'failed');
    setAttribute(control, control.host, 'title', description);
    setAttribute(control, control.focusTarget, 'aria-label', `${control.image.alt || '图片'}，${description}`);
    setAttribute(control, control.focusTarget, 'aria-busy', String(loading));
    control.caption.textContent = loading ? '加载中' : '重试';
  };
  const show = (image, source) => {
    if (controls.get(image)?.source !== source) clear(image);
    let control = controls.get(image);
    if (!control) {
      const host = image.parentElement;
      if (!host) return;
      const nativeTarget = host.closest('button, a[href]');
      const overlay = document.createElement('span');
      overlay.className = 'media-image-retry-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('data-html2canvas-ignore', 'true');
      const icon = document.createElement('span'); icon.className = 'media-image-retry-icon'; icon.textContent = '↻';
      const caption = document.createElement('span');
      overlay.append(icon, caption);
      control = { image, source, host, focusTarget: nativeTarget || host, overlay, caption, attributes: [], hadClass: host.classList.contains('media-image-retry-host') };
      controls.set(image, control); hosts.set(host, image);
      host.classList.add('media-image-retry-host'); host.append(overlay);
      if (!nativeTarget) {
        setAttribute(control, host, 'role', 'button');
        setAttribute(control, host, 'tabindex', '0');
      }
    }
    update(control, false);
  };
  const setLoading = image => {
    const control = controls.get(image);
    if (control) update(control, true);
  };
  const handleActivation = event => {
    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
    if (!(event.target instanceof Element)) return;
    const host = event.target.closest('[data-media-retry]')
      || (event.target.matches('button, a[href]') ? event.target.querySelector('[data-media-retry]') : null);
    const image = hosts.get(host);
    if (!image) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!event.repeat) onRetry(image);
  };
  const collect = isCurrent => {
    for (const [image, control] of controls) if (!isCurrent(image, control.source)) clear(image);
  };
  const dispose = () => { for (const image of [...controls.keys()]) clear(image); };
  return { show, setLoading, clear, collect, dispose, handleActivation };
}
