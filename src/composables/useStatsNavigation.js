export const getDefaultScrollContainer = () => {
  const content = document.querySelector('.content-area');
  if (content instanceof HTMLElement) return content;
  if (document.scrollingElement instanceof HTMLElement) return document.scrollingElement;
  return document.documentElement;
};

export const clampHostScrollTop = (host, top) => {
  if (!(host instanceof HTMLElement)) return 0;
  const maxTop = Math.max(0, host.scrollHeight - host.clientHeight);
  return Math.max(0, Math.min(maxTop, top));
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
    const el = findNavAnchor(sectionId);
    if (!el) return;
    activeNavId.value = sectionId;
    const host = getScrollContainer();
    const hostRect = host.getBoundingClientRect();
    const targetRect = el.getBoundingClientRect();
    const nextTop = host.scrollTop + (targetRect.top - hostRect.top) - 8;
    host.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
    scheduleNavSync();
    if (isNavTopLayout.value && collapseOnMobile) {
      setNavCollapsed(true, false);
    }
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
    isGroupActive,
    isGroupExpanded,
    resetMobileNavGroupExpansion,
    scrollToSection,
    handleParentNavClick,
    handleChildNavClick
  };
};
