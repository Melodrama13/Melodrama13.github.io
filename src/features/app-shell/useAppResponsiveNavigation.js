import { ref } from "vue";
import { UI_BREAKPOINTS, isViewportAtMost } from "../../ui/breakpoints.js";

/** Owns application responsive navigation with per-instance state and explicit peer interfaces. */
export function useAppResponsiveNavigation(ports = {}) {
const isCompactTopNav = ref(false);

const isStatsTopNavCompact = ref(false);

const isSmallTabletViewport = ref(
  typeof window !== 'undefined'
    && isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.smallTabletMax)
);

const updateCompactTopNav = () => {
  if (typeof window === 'undefined') return;
  isCompactTopNav.value = isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.compactMax);
  isStatsTopNavCompact.value = isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.compactMax);
  isSmallTabletViewport.value = isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.smallTabletMax);
  if (ports.tabGestures.primaryTabDragState && ports.tabGestures.primaryTabDragState.desktop === isSmallTabletViewport.value) ports.tabGestures.clearPrimaryTabDrag();
  ports.statsControls.scheduleStatsTopControlStateSync();
};

return {
isCompactTopNav,
isStatsTopNavCompact,
isSmallTabletViewport,
updateCompactTopNav
};
}
