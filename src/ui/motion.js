const MOTION_ROLES = new Set(['press', 'release', 'state', 'feedback', 'popover', 'dialog', 'drawer', 'navigation', 'navigation-panel', 'navigation-panel-dismiss', 'dismiss']);

/** Read the CSS timing source once per interaction, never on animation frames. */
export function getUiMotionTiming(role, element = globalThis.document?.documentElement) {
  if (!MOTION_ROLES.has(role)) throw new RangeError(`Unknown UI motion role: ${role}`);
  if (!element || typeof globalThis.getComputedStyle !== 'function'
    || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return { duration: 0, easing: 'linear' };
  }
  const style = globalThis.getComputedStyle(element);
  const time = style.getPropertyValue(`--ui-motion-duration-${role}`).trim().match(/^(\d*\.?\d+)(ms|s)$/);
  const duration = time ? Number(time[1]) * (time[2] === 's' ? 1000 : 1) : 0;
  return {
    duration: Math.min(600, duration),
    easing: style.getPropertyValue(`--ui-motion-ease-${role}`).trim() || 'linear',
  };
}
