import { useGlassTabGestures } from '../../ui/useGlassTabGestures.js';

const PRIMARY_TABS = Object.freeze(['stats', 'history', 'songs']);
const MOBILE_TAB_LABELS = Object.freeze(['统计', '活动', '乐曲']);
const DESKTOP_TAB_LABELS = Object.freeze(['统计面板', '历史活动一览', '乐曲统计']);
const MOBILE_TAB_ICONS = Object.freeze(['/data/icon/statistics.png', '/data/icon/event.png', '/data/icon/music.png']);

/** Application labels and navigation destinations for the shared glass selector. */
export function useAppTabGestures(ports = {}) {
  const gestures = useGlassTabGestures({
    currentTab: ports.tabCatalog.currentTab,
    primaryTabs: PRIMARY_TABS,
    isMobileViewport: ports.responsiveNavigation.isSmallTabletViewport,
    isCompact: ports.responsiveNavigation.isStatsTopNavCompact,
    selectTab: tab => ports.tabNavigation.setCurrentTab(tab),
  });
  return Object.assign(gestures, {
    MOBILE_TAB_LABELS, DESKTOP_TAB_LABELS, MOBILE_TAB_ICONS,
    connectAppTabGliderLayout: gestures.connectTabGliderLayout,
  });
}
