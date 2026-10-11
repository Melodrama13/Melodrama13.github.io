import { ref, h, defineAsyncComponent } from "vue";

/** Owns application tab catalog with per-instance state and explicit peer interfaces. */
export function useAppTabCatalog(ports = {}) {
const TabLoadingIndicator = {
  name: 'TabLoadingIndicator',
  render() {
    return h('div', {
      class: 'app-data-loading app-tab-loading',
      role: 'status',
      'aria-label': '页面加载中'
    }, [
      h('div', { class: 'app-data-loader', 'aria-hidden': 'true' }, [
        h('span'),
        h('span'),
        h('span'),
        h('span'),
        h('span')
      ])
    ]);
  }
};

const createAsyncTab = (loader) => defineAsyncComponent({
  loader,
  delay: 0,
  timeout: 30000,
  loadingComponent: TabLoadingIndicator
});

const tabs = {
  stats: createAsyncTab(() => import("../../components/CardStats.vue")),
  history: createAsyncTab(() => import("../../components/EventHistory.vue")),
  songs: createAsyncTab(() => import("../../components/SongStats.vue")),
  specialPredict: createAsyncTab(() => import("../../components/SpecialPredictGenerator.vue"))
};

const APP_CURRENT_TAB_KEY = 'pjsk_planner_current_tab_v1';

const getInitialTab = () => {
  try {
    const saved = String(localStorage.getItem(APP_CURRENT_TAB_KEY) || '').trim();
    if (Object.prototype.hasOwnProperty.call(tabs, saved)) return saved;
  } catch {
    // Ignore storage failures and fall back to the original default page.
  }
  return 'history';
};

const persistCurrentTab = (tab) => {
  try {
    localStorage.setItem(APP_CURRENT_TAB_KEY, tab);
  } catch {
    // localStorage may be unavailable in restrictive browsing modes.
  }
};

const currentTab = ref(getInitialTab());

return {
TabLoadingIndicator,
createAsyncTab,
tabs,
APP_CURRENT_TAB_KEY,
getInitialTab,
persistCurrentTab,
currentTab
};
}
