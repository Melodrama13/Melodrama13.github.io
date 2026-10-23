import { ref, nextTick, watch } from 'vue';
import { getScrollContainer } from './songFormatters.js';
import { isViewportAtMost, UI_BREAKPOINTS } from '../../ui/breakpoints.js';
import { createStatsNavigationHandlers } from '../../composables/useStatsNavigation.js';

/** Per-instance state owned by SongViewportNavigation. */
export function createSongViewportNavigationState() {
const viewportScrollHost = ref(null);

const navSyncRaf = ref(0);

const navCollapsed = ref(false);

const activeNavId = ref('panel-oc-stats');

const isMobileNav = ref(false);

const isNavTopLayout = ref(false);

const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280);

const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 720);

const navTopLayoutPrev = ref(null);

const mobileNavExpandedGroups = ref({});

const sectionObserver = ref(null);
return { viewportScrollHost, navSyncRaf, navCollapsed, activeNavId, isMobileNav, isNavTopLayout, viewportWidth, viewportHeight, navTopLayoutPrev, mobileNavExpandedGroups, sectionObserver };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongViewportNavigation({
  viewportScrollHost,
  navSyncRaf,
  navCollapsed,
  activeNavId,
  isMobileNav,
  isNavTopLayout,
  viewportWidth,
  viewportHeight,
  navTopLayoutPrev,
  mobileNavExpandedGroups,
  sectionObserver,
  navTargetIds,
  updateAnvoFillContentWidth,
  anvoFillDisplay,
  withReadingPosition,
  recalcSongTableOverflow,
  navGroups,
  findAnchorElementByKey
}) {
const pickActiveNavTargetIdByViewport = () => {
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const anchorY = hostRect.top + Math.min(140, Math.max(72, hostRect.height * 0.2));
  const ids = navTargetIds.value;

  const containing = [];
  const upcoming = [];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLElement)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    if (rect.top <= anchorY && rect.bottom > anchorY) {
      containing.push({ id, top: rect.top, height: rect.height });
      return;
    }
    if (rect.top > anchorY) {
      upcoming.push({ id, top: rect.top });
    }
  });

  if (containing.length > 0) {
    containing.sort((a, b) => {
      if (b.top !== a.top) return b.top - a.top;
      return a.height - b.height;
    });
    // Several unit cards can share one grid row. Keep the selected card while
    // that row is being read, rather than switching to its shortest neighbour.
    const current = containing.find((item) => item.id === activeNavId.value
      && Math.abs(item.top - containing[0].top) < 1);
    return current?.id || containing[0].id;
  }

  if (upcoming.length > 0) {
    upcoming.sort((a, b) => a.top - b.top);
    return upcoming[0].id;
  }

  return ids[ids.length - 1] || '';
};

const syncActiveNavByViewport = () => {
  if (isStatsNavigationPending()) return;
  try {
    const nextId = pickActiveNavTargetIdByViewport();
    if (nextId && activeNavId.value !== nextId) {
      activeNavId.value = nextId;
    }
  } catch (_) {
    // Guard against observer/DOM race to avoid crashing the whole page.
  }
};

const scheduleNavSync = () => {
  if (navSyncRaf.value) return;
  navSyncRaf.value = requestAnimationFrame(() => {
    navSyncRaf.value = 0;
    syncActiveNavByViewport();
  });
};

const handleViewportScroll = () => scheduleNavSync();

const bindViewportScrollTracking = () => {
  const host = getScrollContainer();
  if (viewportScrollHost.value && viewportScrollHost.value !== host) viewportScrollHost.value.removeEventListener('scroll', handleViewportScroll);
  viewportScrollHost.value = host;
  host.addEventListener('scroll', handleViewportScroll, { passive: true });
};

const handleWindowResize = () => {
  updateMobileNavState();
  void nextTick().then(() => {
    updateAnvoFillContentWidth();
    scheduleNavSync();
  });
};

function setNavCollapsed(nextCollapsed, preserveReadingPosition = true) {
  const next = !!nextCollapsed;
  if (navCollapsed.value === next) return;
  if (!next) {
    anvoFillDisplay.value = false;
    resetMobileNavGroupExpansion();
  }
  if (!preserveReadingPosition) {
    navCollapsed.value = next;
    return;
  }
  void withReadingPosition(() => {
    navCollapsed.value = next;
  });
}

const updateMobileNavState = () => {
  if (typeof window === 'undefined') return;
  viewportWidth.value = window.innerWidth;
  viewportHeight.value = window.innerHeight;
  const isTopLayout = isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.compactMax);
  const prev = navTopLayoutPrev.value;
  const nextCollapsed = prev === null
    ? isTopLayout
    : (prev !== isTopLayout ? isTopLayout : navCollapsed.value);
  const applyState = () => {
    isNavTopLayout.value = isTopLayout;
    isMobileNav.value = isTopLayout;
    navCollapsed.value = nextCollapsed;
    navTopLayoutPrev.value = isTopLayout;
    if (isTopLayout) {
      resetMobileNavGroupExpansion();
    }
  };

  applyState();
  recalcSongTableOverflow();
};

const {
  isNavigating: isStatsNavigationPending,
  isGroupActive,
  isGroupExpanded,
  resetMobileNavGroupExpansion,
  scrollToSection,
  handleParentNavClick,
  handleChildNavClick
} = createStatsNavigationHandlers({
  activeNavId,
  isMobileNav,
  isNavTopLayout,
  mobileNavExpandedGroups,
  navGroups,
  getScrollContainer,
  findAnchorElementByKey,
  scheduleNavSync,
  setNavCollapsed
});

const bindSectionObserver = async () => {
  if (sectionObserver.value) {
    sectionObserver.value.disconnect();
    sectionObserver.value = null;
  }

  await nextTick();
  const ids = navTargetIds.value;
  const host = getScrollContainer();
  const observerRoot = host instanceof HTMLElement && host !== document.documentElement ? host : null;

  if (typeof IntersectionObserver === 'undefined') {
    scheduleNavSync();
    return;
  }

  try {
    sectionObserver.value = new IntersectionObserver(() => {
      scheduleNavSync();
    }, {
      root: observerRoot,
      rootMargin: '-10% 0px -75% 0px',
      threshold: [0, 0.01, 0.1]
    });
  } catch (_) {
    sectionObserver.value = new IntersectionObserver(() => {
      scheduleNavSync();
    }, {
      root: null,
      rootMargin: '-10% 0px -75% 0px',
      threshold: [0, 0.01, 0.1]
    });
  }

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLElement)) return;
    if (observerRoot instanceof HTMLElement && !observerRoot.contains(el)) return;
    sectionObserver.value.observe(el);
  });

  scheduleNavSync();
};

const connectSongViewportNavigationEffects = () => {
watch(() => navTargetIds.value.join('|'), () => {
  void bindSectionObserver();
});
};

return { pickActiveNavTargetIdByViewport, syncActiveNavByViewport, scheduleNavSync, handleViewportScroll, bindViewportScrollTracking, handleWindowResize, setNavCollapsed, updateMobileNavState, isStatsNavigationPending, isGroupActive, isGroupExpanded, resetMobileNavGroupExpansion, scrollToSection, handleParentNavClick, handleChildNavClick, bindSectionObserver, connectSongViewportNavigationEffects };
}
