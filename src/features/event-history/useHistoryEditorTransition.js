import { ref, nextTick, onMounted, onBeforeUnmount, onDeactivated } from 'vue';
import { isViewportAtMost, UI_BREAKPOINTS } from '../../ui/breakpoints.js';
import { getHistoryRowsInBounds } from './historyVisibleRows.js';
import { getUiMotionTiming } from '../../ui/motion.js';
import { deferLiquidGlassRefraction } from '../../ui/liquidGlassMotion.js';

// Animate peer content groups, never both a group and its children. This
// keeps portraits, badges and their attached decorations moving together.
const EDITOR_MOVING_CONTENT_SELECTOR = [
  ':scope > :not(.event-members, .preview-members, .birthday-info-popover)',
  '.member-card-box', '.member-card-placeholder',
  '.fes-type-icon', '.fes-type-icon-placeholder',
  '.preview-members > img'
].join(', ');

/** Reflow once, then translate visible content without stretching portraits. */
export function useHistoryEditorTransition({ getHost, onRestore }) {
  const isEditorLayoutTransitioning = ref(false);
  const isEditorSpaceReserved = ref(false);
  let initialContentPositions = new Map();
  let contentAnimations = [];
  let prepareFrame = 0;
  let completionTimer = 0;
  let preparationSequence = 0;
  let motionPreference;
  let releaseBackdrop = () => {};

  const finish = (restoreReadingPosition = true) => {
    preparationSequence += 1;
    const wasTransitioning = isEditorLayoutTransitioning.value;
    cancelAnimationFrame(prepareFrame);
    prepareFrame = 0;
    clearTimeout(completionTimer);
    completionTimer = 0;
    for (const animation of contentAnimations) animation.cancel();
    contentAnimations = [];
    releaseBackdrop();
    releaseBackdrop = () => {};
    initialContentPositions.clear();
    isEditorLayoutTransitioning.value = false;
    if (wasTransitioning && restoreReadingPosition) onRestore();
  };

  const begin = () => {
    // Read current painted positions before cancelling a rapid reverse.
    const host = getHost();
    if (!host?.isConnected || !host.clientHeight
      || isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.compactMax)
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish(false);
      return;
    }
    const bounds = host.getBoundingClientRect();
    const positions = new Map();
    for (const { element: row } of getHistoryRowsInBounds(host.querySelector('.history-list'), bounds.top, bounds.bottom)) {
      for (const element of row.querySelectorAll(EDITOR_MOVING_CONTENT_SELECTOR)) {
        const rect = element.getBoundingClientRect();
        if (rect.width && rect.height) positions.set(element, rect.left);
      }
    }
    finish(false);
    releaseBackdrop = deferLiquidGlassRefraction(host);
    initialContentPositions = positions;
    isEditorLayoutTransitioning.value = true;
  };

  const reserveSpaceAfterLayout = async (reserveSpace) => {
    const sequence = ++preparationSequence;
    // Row content, the drawer and its reserved space share one Vue update.
    // Their real final heights remain available to the reading owner.
    isEditorSpaceReserved.value = reserveSpace;
    await nextTick();
    if (sequence !== preparationSequence || !isEditorLayoutTransitioning.value) return;
    const host = getHost();
    if (!host?.isConnected) {
      finish();
      return;
    }
    onRestore();
    const { duration, easing } = getUiMotionTiming('drawer', host);
    if (!duration) {
      finish(false);
      return;
    }
    // Keep real layout sizes and screen Y. Only horizontal positions animate;
    // no host scaling, inverse scaling or per-frame layout reads are needed.
    const movements = [];
    for (const [element, previousLeft] of initialContentPositions) {
      if (!element.isConnected || !host.contains(element)) continue;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const offsetX = previousLeft - rect.left;
      if (Math.abs(offsetX) < 0.5) continue;
      movements.push({ element, offsetX });
    }
    initialContentPositions.clear();
    // Finish all geometry reads before applying any animation styles.
    for (const { element, offsetX } of movements) {
      const animation = element.animate([
        { translate: `${offsetX}px 0px` },
        { translate: '0px 0px' }
      ], { duration, easing, fill: 'both', composite: 'add' });
      animation.pause();
      animation.currentTime = 0;
      contentAnimations.push(animation);
    }
    // Keep the initial translations paused through the first static paint.
    // A single RAF runs before that paint and spends the motion timeline on
    // preparing the new content layers, especially near the 900px boundary.
    prepareFrame = requestAnimationFrame(() => {
      if (sequence !== preparationSequence) return;
      prepareFrame = requestAnimationFrame(() => {
        prepareFrame = 0;
        if (sequence !== preparationSequence) return;
        const animations = [...contentAnimations];
        for (const animation of animations) animation.play();
        const settle = () => { if (sequence === preparationSequence) finish(); };
        if (animations.length) {
          // A delayed first paint must not spend the animation's lifetime on
          // preparation. Settle when its native timeline actually completes.
          Promise.all(animations.map(animation => animation.finished)).then(settle).catch(settle);
        } else {
          // Preserve material deferral even when no visible content moves.
          completionTimer = setTimeout(settle, duration);
        }
      });
    });
  };

  const handleResize = () => finish();
  onMounted(() => {
    window.addEventListener('resize', handleResize, { passive: true });
    motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionPreference.addEventListener('change', handleResize);
  });
  onDeactivated(() => finish(false));
  onBeforeUnmount(() => {
    finish(false);
    window.removeEventListener('resize', handleResize);
    motionPreference?.removeEventListener('change', handleResize);
  });
  return { begin, finish, reserveSpaceAfterLayout, isEditorLayoutTransitioning, isEditorSpaceReserved };
}
