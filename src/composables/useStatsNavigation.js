import { nextTick, onBeforeUnmount, onDeactivated } from 'vue';
import { createScrollNavigator, clampScrollTop } from './scrollNavigation.js';

export const getDefaultScrollContainer = () => {
  const content = document.querySelector('.content-area');
  if (content instanceof HTMLElement) return content;
  if (document.scrollingElement instanceof HTMLElement) return document.scrollingElement;
  return document.documentElement;
};

export const clampHostScrollTop = (host, top) => {
  if (!(host instanceof HTMLElement)) return 0;
  return clampScrollTop(host, top);
};

export const createStatsNavigationHandlers = ({
  activeNavId,
  isMobileNav,
  isNavTopLayout,
  mobileNavExpandedGroups,
  navGroups,
  getScrollContainer = getDefaultScrollContainer,
  findAnchorElementByKey = null,
  scheduleNavSync = () => {},
  setNavCollapsed = () => {}
}) => {
  const navigator = createScrollNavigator({ getHost: getScrollContainer });
  onDeactivated(navigator.cancel);
  onBeforeUnmount(navigator.cancel);
  const isGroupActive = (group) => {
    if (activeNavId.value === group.id) return true;
    return (group.children || []).some((c) => c.id === activeNavId.value);
  };

  const isGroupExpanded = (group) => {
    if (!isMobileNav.value) return isGroupActive(group);
    return !!mobileNavExpandedGroups.value[String(group?.id || '')];
  };

  const resetMobileNavGroupExpansion = () => {
    mobileNavExpandedGroups.value = {};
  };

  const findNavAnchor = (id) => {
    const key = String(id || '').trim();
    if (!key) return null;
    const byKey = typeof findAnchorElementByKey === 'function' ? findAnchorElementByKey(key) : null;
    if (byKey instanceof HTMLElement) return byKey;
    const byId = document.getElementById(key);
    return byId instanceof HTMLElement ? byId : null;
  };

  const scrollToSection = (id, options = {}) => {
    const sectionId = String(id || '').trim();
    const collapseOnMobile = options?.collapseOnMobile !== false;
    if (!findNavAnchor(sectionId)) return Promise.resolve(false);
    activeNavId.value = sectionId;
    return navigator.navigate({
      target: () => findNavAnchor(sectionId),
      offset: () => 8,
      prepare: async () => {
        if (isNavTopLayout.value && collapseOnMobile) setNavCollapsed(true, false);
        await nextTick();
      }
    }).then(ok => {
      if (ok) scheduleNavSync();
      return ok;
    });
  };

  const handleParentNavClick = (group) => {
    const groupId = String(group?.id || '').trim();
    if (!groupId) return;
    const hasChildren = Array.isArray(group?.children) && group.children.length > 0;

    if (isNavTopLayout.value) {
      if (hasChildren) {
        mobileNavExpandedGroups.value = {
          [groupId]: true
        };
        scrollToSection(groupId, { collapseOnMobile: false });
        return;
      }

      resetMobileNavGroupExpansion();
      scrollToSection(groupId, { collapseOnMobile: true });
      return;
    }

    scrollToSection(groupId);
  };

  const handleChildNavClick = (_group, item) => {
    const itemId = String(item?.id || '').trim();
    if (!itemId) return;
    scrollToSection(itemId, { collapseOnMobile: true });
    if (isNavTopLayout.value) {
      resetMobileNavGroupExpansion();
    }
  };

  return {
    isNavigating: navigator.isNavigating,
    isGroupActive,
    isGroupExpanded,
    resetMobileNavGroupExpansion,
    scrollToSection,
    handleParentNavClick,
    handleChildNavClick
  };
};
