import { onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue';
import { getUiMotionTiming } from './motion.js';
import { deferLiquidGlassRefraction } from './liquidGlassMotion.js';
import { createNavigationUnfoldFrames, createNavigationContentFrames, createNavigationUnfoldOutline } from './navigationUnfoldMotion.js';

/** Vue owns visibility; this owner prepares and cancels transient surface motion. */
export function useUiSurfaceMotion(getKind, getEdge = () => 'right') {
  const operations = new Map();
  const interruptedStyles = new WeakMap();
  const navigationOrigins = new WeakMap();
  let preference;
  let watching = false;

  const cancel = element => {
    const operation = operations.get(element);
    if (!operation) return;
    // v-show hides a cancelled leave before calling our hook. A hidden element
    // reports transform:none, so briefly restore its previous inline display
    // while taking the snapshot; this synchronous read never paints a frame.
    const display = element.style.display;
    if (display === 'none') element.style.display = operation.display;
    let styles;
    try {
      styles = new Map(operation.actors.map(actor => {
        const style = getComputedStyle(actor);
        return [actor, { opacity: style.opacity, translate: style.translate, scale: style.scale, transform: style.transform, clipPath: style.clipPath }];
      }));
    } finally {
      if (display === 'none') element.style.display = display;
    }
    interruptedStyles.set(element, styles);
    operations.delete(element);
    cancelAnimationFrame(operation.frame);
    for (const animation of operation.animations) animation.cancel();
    operation.outline?.cancel();
    operation.releaseBackdrop();
    if (operation.kind === 'drawer') element.removeAttribute('data-ui-surface-motion');
  };

  const settleOperations = kind => {
    for (const [element, operation] of [...operations]) {
      if (kind && operation.kind !== kind) continue;
      cancel(element);
      interruptedStyles.delete(element);
      operation.done();
    }
  };
  const settleAll = () => settleOperations();

  const start = (element, opening, done) => {
    cancel(element);
    const kind = getKind();
    const timingRole = kind === 'navigation' ? (opening ? 'navigation-panel' : 'navigation-panel-dismiss') : kind;
    const timing = getUiMotionTiming(opening || kind === 'drawer' || kind === 'navigation' ? timingRole : 'dismiss', element);
    if (!timing.duration || typeof element.animate !== 'function') {
      interruptedStyles.delete(element);
      done();
      return;
    }
    const interrupted = interruptedStyles.get(element);
    interruptedStyles.delete(element);
    const panel = kind === 'dialog' ? element.querySelector('.ui-motion-dialog-panel') : null;
    const unfolding = kind === 'navigation' && globalThis.CSS?.supports('clip-path', 'path("M0 0 L1 0 L1 1 Z")');
    const actors = unfolding ? [element, ...element.children] : panel ? [element, panel] : [element];
    if (kind === 'drawer') element.setAttribute('data-ui-surface-motion', opening ? 'enter' : 'leave');
    const releaseBackdrop = kind === 'drawer' || kind === 'navigation' ? deferLiquidGlassRefraction(element) : () => {};
    // Batch styles and the menu's resting geometry before writing animations.
    // Native timelines play the precomputed curve without per-frame layout reads.
    const resting = new Map(actors.map(actor => {
      const style = getComputedStyle(actor);
      return [actor, { opacity: style.opacity, translate: style.translate === 'none' ? '0px 0px' : style.translate,
        scale: style.scale === 'none' ? '1' : style.scale,
        transform: style.transform,
        clipPath: style.clipPath, radius: parseFloat(style.borderTopLeftRadius),
        borderLeft: parseFloat(style.borderLeftWidth), borderTop: parseFloat(style.borderTopWidth),
        borderColor: style.borderLeftColor, contourColor: style.getPropertyValue('--stats-nav-glass-line').trim() || style.borderLeftColor,
        foldedSize: parseFloat(style.getPropertyValue('--ui-motion-navigation-folded-size')),
        fallbackScale: style.getPropertyValue('--ui-motion-navigation-fallback-scale').trim() }];
    }));
    const bounds = unfolding ? element.getBoundingClientRect() : null;
    const layout = unfolding ? element.closest('.stats-layout') : null;
    const trigger = layout?.querySelector('.floating-menu-btn');
    if (trigger) navigationOrigins.set(layout, trigger.getBoundingClientRect());
    const origin = layout && navigationOrigins.get(layout);
    let surfaceFrames;
    const animations = actors.map(actor => {
      const normal = resting.get(actor);
      const previous = interrupted?.get(actor);
      if (unfolding) {
        const frames = actor === element
          ? createNavigationUnfoldFrames({ width: bounds.width, height: bounds.height, radius: normal.radius,
            foldedSize: origin ? Math.min(normal.foldedSize, origin.width, origin.height) : normal.foldedSize,
            origin: origin ? { x: origin.x - bounds.x, y: origin.y - bounds.y } : undefined,
            opening, opacity: normal.opacity, previous })
          : createNavigationContentFrames({ opening, opacity: normal.opacity, previous });
        if (actor === element) surfaceFrames = frames;
        const animation = actor.animate(frames, { ...timing, fill: 'both' });
        animation.pause();
        animation.currentTime = 0;
        return animation;
      }
      let hidden = actor === element ? { opacity: '0' } : {};
      // A large moving backdrop needs a composited transform prepared in the
      // paused pose. Individual translate repaints it slowly in Chromium.
      if (kind === 'drawer') {
        const base = normal.transform === 'none' ? '' : `${normal.transform} `;
        hidden = { transform: `${base}translate3d(${getEdge() === 'bottom' ? '0px, 100%' : '100%, 0px'}, 0px)` };
        normal.transform = `${base}translate3d(0px, 0px, 0px)`;
      }
      else if (kind === 'navigation') {
        // Pin the upper-left corner and scale uniformly: no stretching text,
        // horizontal sliding, or dense-list layout work on animation frames.
        const base = normal.transform === 'none' ? '' : `${normal.transform} `;
        hidden = { ...hidden, transform: `${base}scale(${normal.fallbackScale}) translateZ(0px)` };
        normal.transform = `${base}scale(1) translateZ(0px)`;
      }
      else if (kind !== 'dialog') hidden = { ...hidden, translate: '0px 6px' };
      if (actor === panel) hidden = { translate: '0px 8px', scale: '0.98' };
      const properties = Object.keys(hidden);
      const final = Object.fromEntries(properties.map(property => [property, normal[property]]));
      const initial = previous ? Object.fromEntries(properties.map(property => [property,
        previous[property] === 'none' ? final[property] : previous[property]])) : opening ? hidden : final;
      const animation = actor.animate([initial, opening ? final : hidden], { ...timing, fill: 'both' });
      animation.pause();
      animation.currentTime = 0;
      return animation;
    });
    const outline = unfolding ? createNavigationUnfoldOutline(element, bounds, surfaceFrames, animations[0], resting.get(element)) : null;
    const operation = { kind, actors, animations, outline, done, releaseBackdrop, display: element.style.display, frame: 0 };
    operations.set(element, operation);
    // Paint the paused start pose before the native timeline begins. Completion
    // comes from finished, so a slow first paint cannot expire a Vue CSS timer.
    operation.frame = requestAnimationFrame(() => {
      operation.frame = requestAnimationFrame(() => {
        operation.frame = 0;
        if (operations.get(element) !== operation) return;
        for (const animation of animations) animation.play();
        outline?.play();
      });
    });
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (operations.get(element) !== operation) return;
      operations.delete(element);
      for (const animation of animations) animation.cancel();
      outline?.cancel();
      releaseBackdrop();
      if (kind === 'drawer') element.removeAttribute('data-ui-surface-motion');
      done();
    }).catch(() => {
      // Vue normally owns cancellation. If the native animation is cancelled
      // externally, settle visibility instead of leaving an inert surface stuck.
      if (operations.get(element) !== operation) return;
      operations.delete(element);
      cancelAnimationFrame(operation.frame);
      for (const animation of animations) animation.cancel();
      outline?.cancel();
      releaseBackdrop();
      if (kind === 'drawer') element.removeAttribute('data-ui-surface-motion');
      done();
    });
  };

  const onPreferenceChange = event => { if (event.matches) settleAll(); };
  // Capture the actual button before Vue removes it on an opening click.
  // One navigation owner handles pointer, keyboard and programmatic activation.
  const onNavigationTriggerClick = event => {
    const trigger = event.target?.closest?.('.floating-menu-btn');
    const layout = trigger?.closest('.stats-layout');
    if (layout) navigationOrigins.set(layout, trigger.getBoundingClientRect());
  };
  // Paths are prepared for the resting geometry. Resize settles them before
  // responsive CSS can leave a menu clipped to its previous dimensions.
  const onViewportChange = () => settleOperations('navigation');
  const attach = () => {
    if (watching) return;
    preference ??= window.matchMedia('(prefers-reduced-motion: reduce)');
    preference.addEventListener('change', onPreferenceChange);
    if (getKind() === 'navigation') {
      window.addEventListener('resize', onViewportChange);
      document.addEventListener('click', onNavigationTriggerClick, true);
    }
    watching = true;
  };
  const detach = () => {
    settleAll();
    preference?.removeEventListener('change', onPreferenceChange);
    window.removeEventListener('resize', onViewportChange);
    document.removeEventListener('click', onNavigationTriggerClick, true);
    watching = false;
  };
  onMounted(attach);
  onActivated(attach);
  onDeactivated(detach);
  onBeforeUnmount(detach);
  return { enter: (element, done) => start(element, true, done), leave: (element, done) => start(element, false, done), cancel, finish: settleAll };
}
