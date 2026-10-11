const documentMotionLeases = new WeakMap();
const DEFERRED_ATTRIBUTE = 'data-ui-glass-motion-deferred';

/** Keep existing CSS frost during large backdrop motion; retain the SVG maps. */
export function deferLiquidGlassRefraction(element) {
  const root = element?.ownerDocument?.documentElement;
  if (!root) return () => {};
  let lease = documentMotionLeases.get(root);
  if (!lease) {
    lease = { count: 0, previous: root.getAttribute(DEFERRED_ATTRIBUTE) };
    documentMotionLeases.set(root, lease);
    root.setAttribute(DEFERRED_ATTRIBUTE, 'true');
  }
  lease.count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lease.count -= 1;
    if (lease.count) return;
    documentMotionLeases.delete(root);
    if (lease.previous === null) root.removeAttribute(DEFERRED_ATTRIBUTE);
    else root.setAttribute(DEFERRED_ATTRIBUTE, lease.previous);
  };
}
