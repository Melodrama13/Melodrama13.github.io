import { ref, watch, nextTick, onScopeDispose } from 'vue';
import { getUiMotionTiming } from '../../ui/motion.js';

/** Shows the selector glass only while a press or its native CSS motion owns it. */
export function useAppTabGliderFeedback({ currentTab, primaryTabs, isMobileViewport,
  desktopSwitcherRef, mobileSwitcherRef, isDesktopPressed, isMobilePressed }) {
  const isTabGliderActive = ref(false);
  let revision = 0;
  let frame = 0;
  let fallbackTimer = null;

  const cancelPendingSettlement = () => {
    revision += 1;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (fallbackTimer !== null) clearTimeout(fallbackTimer);
    fallbackTimer = null;
  };
  const resetFeedback = () => {
    cancelPendingSettlement();
    isTabGliderActive.value = false;
  };
  const showUntilSettled = () => {
    cancelPendingSettlement();
    if (!primaryTabs.includes(currentTab.value)) {
      isTabGliderActive.value = false;
      return;
    }
    isTabGliderActive.value = true;
    if (isDesktopPressed.value || isMobilePressed.value) return;
    const owner = revision;
    // Let Vue commit the new position, then read the native transitions once.
    void nextTick(() => {
      if (owner !== revision) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (owner !== revision) return;
        const switcher = isMobileViewport.value ? mobileSwitcherRef.value : desktopSwitcherRef.value;
        const lens = switcher?.querySelector('.mobile-tab-glider');
        const finish = () => {
          if (owner === revision && !isDesktopPressed.value && !isMobilePressed.value) {
            isTabGliderActive.value = false;
          }
        };
        if (!lens) { finish(); return; }
        if (typeof lens.getAnimations === 'function') {
          const waitForNativeMotion = () => {
            if (owner !== revision) return;
            const animations = lens.getAnimations().filter(animation => animation.playState === 'running');
            if (!animations.length) { finish(); return; }
            // Layout may retarget a transition without changing the selected
            // tab. A cancelled segment must hand off to its replacement.
            void Promise.allSettled(animations.map(animation => animation.finished))
              .then(() => { void nextTick(waitForNativeMotion); });
          };
          waitForNativeMotion();
        } else {
          const duration = Math.max(getUiMotionTiming('navigation', lens).duration, getUiMotionTiming('release', lens).duration);
          fallbackTimer = setTimeout(() => { fallbackTimer = null; finish(); }, duration);
        }
      });
    });
  };

  watch([currentTab, isDesktopPressed, isMobilePressed], showUntilSettled, { flush: 'sync' });
  watch(isMobileViewport, resetFeedback, { flush: 'sync' });
  onScopeDispose(resetFeedback);
  return { isTabGliderActive };
}
