import { ref, computed, nextTick } from 'vue';
import { createStatsNavigationHandlers, getDefaultScrollContainer } from '../../composables/useStatsNavigation.js';
import { useViewportFocus } from '../../composables/useViewportFocus.js';
import { UI_BREAKPOINTS, isViewportAtMost } from '../../ui/breakpoints.js';

/** Owns card navigation behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardNavigation(inputs) {
  const navCollapsed = ref(false);

  const activeNavId = ref('panel-dist');

  const isMobileNav = ref(false);

  const isNavTopLayout = ref(false);

  const navTopLayoutPrev = ref(null);

  let sectionObserver = null;

  let navSyncRaf = 0;

  let viewportScrollHost = null;

  let viewportPreserveLock = 0;

  let statsMainInteractionHost = null;

  let lastInteractiveAnchorEl = null;

  let lastInteractiveAt = 0;

  const mobileNavExpandedGroups = ref({});

  const jumpToHistoryByEventRef = (eventRef) => {
    const id = String(eventRef?.id ?? '').trim();
    if (!id) return;
    inputs.emit('jump-to-event', id);
  };

  const showDesktopNameControls = computed(() => !isNavTopLayout.value);

  const isMiniFloatingNav = computed(() => isNavTopLayout.value && navCollapsed.value);

  const getScrollContainer = getDefaultScrollContainer;

  const pickActiveNavTargetIdByViewport = () => {
    const host = getScrollContainer();
    const hostRect = host.getBoundingClientRect();
    const anchorY = hostRect.top + Math.min(140, Math.max(72, hostRect.height * 0.2));
    const ids = inputs.navigationCatalog.navTargetIds.value;
    const topLevelGroupIds = new Set(inputs.navigationCatalog.navGroups.value.map((group) => String(group?.id || '').trim()));
    const isChildNavId = (id) => !topLevelGroupIds.has(String(id || '').trim());

    const containing = [];
    const passed = [];
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
      if (rect.top <= anchorY) {
        passed.push({ id, top: rect.top });
        return;
      }
      if (rect.top > anchorY) {
        upcoming.push({ id, top: rect.top });
      }
    });

    if (containing.length > 0) {
      const containingChildren = containing.filter((item) => isChildNavId(item.id));
      if (containingChildren.length > 0) {
        containingChildren.sort((a, b) => {
          if (b.top !== a.top) return b.top - a.top;
          return a.height - b.height;
        });
        return containingChildren[0].id;
      }

      containing.sort((a, b) => {
        if (b.top !== a.top) return b.top - a.top;
        return a.height - b.height;
      });
      return containing[0].id;
    }

    if (passed.length > 0) {
      passed.sort((a, b) => b.top - a.top);
      return passed[0].id;
    }

    if (upcoming.length > 0) {
      upcoming.sort((a, b) => a.top - b.top);
      return upcoming[0].id;
    }

    return ids[ids.length - 1] || ids[0] || '';
  };

  const syncActiveNavByViewport = () => {
    if (viewportPreserveLock > 0 || isStatsNavigationPending()) return;
    try {
      const nextId = pickActiveNavTargetIdByViewport();
      if (nextId && activeNavId.value !== nextId) {
        activeNavId.value = nextId;
      }
    } catch (_) {
      // Guard against DOM timing races.
    }
  };

  const scheduleNavSync = () => {
    if (navSyncRaf) return;
    navSyncRaf = requestAnimationFrame(() => {
      navSyncRaf = 0;
      syncActiveNavByViewport();
    });
  };

  const getStatsMainElement = () => {
    const localRoot = inputs.cardStatsRootRef.value;
    const localStatsMain = localRoot instanceof HTMLElement
      ? localRoot.querySelector('.stats-main')
      : null;
    if (localStatsMain instanceof HTMLElement) return localStatsMain;
    const fallbackStatsMain = document.querySelector('.pjsk-stats .stats-main');
    return fallbackStatsMain instanceof HTMLElement ? fallbackStatsMain : null;
  };

  const findAnchorElementByKey = (key) => {
    const wanted = String(key || '').trim();
    if (!wanted) return null;
    const statsMain = getStatsMainElement();
    if (!(statsMain instanceof HTMLElement)) return null;
    const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(wanted)
      : wanted.replace(/"/g, '\\"');
    const el = statsMain.querySelector(`[data-scroll-anchor="${escaped}"]`);
    if (!(el instanceof HTMLElement)) return null;
    return el;
  };

  const viewportFocus = useViewportFocus({
    getHost: getScrollContainer,
    getRoot: getStatsMainElement,
    onRestore: scheduleNavSync
  });

  const rememberInteractiveAnchorFromEvent = (event) => {
    const target = event?.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('.stats-nav')) return;

    const interactive = target.closest('button, input[type="checkbox"], input[type="radio"], select');
    if (!(interactive instanceof HTMLElement)) return;

    lastInteractiveAnchorEl = interactive;
    lastInteractiveAt = Date.now();
  };

  const consumeRecentInteractiveAnchor = (maxAgeMs = 1200) => {
    if (!(lastInteractiveAnchorEl instanceof HTMLElement)) return null;
    if (!lastInteractiveAnchorEl.isConnected) {
      lastInteractiveAnchorEl = null;
      return null;
    }
    if (Date.now() - lastInteractiveAt > maxAgeMs) {
      lastInteractiveAnchorEl = null;
      return null;
    }
    return lastInteractiveAnchorEl;
  };

  const withPinnedElementPosition = (targetEl, applyChange) => viewportFocus.preserve(applyChange, targetEl);

  const withInteractionPinnedPosition = async (applyChange, explicitTarget = null) => {
    const target = explicitTarget instanceof HTMLElement ? explicitTarget : consumeRecentInteractiveAnchor();
    if (target instanceof HTMLElement) {
      await withPinnedElementPosition(target, applyChange);
      return;
    }
    await viewportFocus.preserve(applyChange);
  };

  const withReadingPosition = applyChange => viewportFocus.preserve(applyChange);

  const handleViewportScroll = () => {
    scheduleNavSync();
  };

  const bindViewportScrollTracking = () => {
    const host = getScrollContainer();
    if (viewportScrollHost && viewportScrollHost !== host) {
      viewportScrollHost.removeEventListener('scroll', handleViewportScroll);
    }
    viewportScrollHost = host;
    viewportScrollHost.addEventListener('scroll', handleViewportScroll, { passive: true });
  };

  function setNavCollapsed(nextCollapsed, preserveReadingPosition = true) {
    const next = !!nextCollapsed;
    if (navCollapsed.value === next) return;
    if (!next) {
      resetMobileNavGroupExpansion();
    }
    if (!preserveReadingPosition) {
      navCollapsed.value = next;
      void nextTick(() => {
        inputs.responsiveLayout.triggerLineupCardModeRowLayoutSyncBurst();
      });
      return;
    }
    void withReadingPosition(() => {
      navCollapsed.value = next;
      void nextTick(() => {
        inputs.responsiveLayout.triggerLineupCardModeRowLayoutSyncBurst();
      });
    });
  }

  const updateMobileNavState = () => {
    if (typeof window === 'undefined') return;
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
      void nextTick(() => {
        inputs.responsiveLayout.triggerLineupCardModeRowLayoutSyncBurst();
      });
    };

    applyState();
    bindViewportScrollTracking();
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
    navGroups: inputs.navigationCatalog.navGroups,
    getScrollContainer,
    findAnchorElementByKey,
    scheduleNavSync,
    setNavCollapsed
  });

  const bindSectionObserver = async () => {
    if (sectionObserver) {
      sectionObserver.disconnect();
      sectionObserver = null;
    }

    await nextTick();
    const ids = inputs.navigationCatalog.navTargetIds.value;
    const host = getScrollContainer();
    const observerRoot = host instanceof HTMLElement && host !== document.documentElement ? host : null;

    if (typeof IntersectionObserver === 'undefined') {
      scheduleNavSync();
      return;
    }

    try {
      sectionObserver = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          scheduleNavSync();
        }
      }, {
        root: observerRoot,
        rootMargin: '-10% 0px -75% 0px',
        threshold: [0, 0.01, 0.1]
      });
    } catch (_) {
      sectionObserver = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          scheduleNavSync();
        }
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
      sectionObserver.observe(el);
    });

    scheduleNavSync();
  };

  return {
    navCollapsed,
    isNavTopLayout,
    setNavCollapsed,
    withInteractionPinnedPosition,
    isMobileNav,
    viewportFocus,
    updateMobileNavState,
    bindViewportScrollTracking,
    get statsMainInteractionHost() { return statsMainInteractionHost; },
    set statsMainInteractionHost(value) { statsMainInteractionHost = value; },
    rememberInteractiveAnchorFromEvent,
    scheduleNavSync,
    bindSectionObserver,
    get lastInteractiveAnchorEl() { return lastInteractiveAnchorEl; },
    set lastInteractiveAnchorEl(value) { lastInteractiveAnchorEl = value; },
    get lastInteractiveAt() { return lastInteractiveAt; },
    set lastInteractiveAt(value) { lastInteractiveAt = value; },
    get viewportScrollHost() { return viewportScrollHost; },
    set viewportScrollHost(value) { viewportScrollHost = value; },
    handleViewportScroll,
    get navSyncRaf() { return navSyncRaf; },
    set navSyncRaf(value) { navSyncRaf = value; },
    get sectionObserver() { return sectionObserver; },
    set sectionObserver(value) { sectionObserver = value; },
    showDesktopNameControls,
    jumpToHistoryByEventRef,
    isMiniFloatingNav,
    isGroupActive,
    handleParentNavClick,
    isGroupExpanded,
    activeNavId,
    handleChildNavClick,
  };
}
