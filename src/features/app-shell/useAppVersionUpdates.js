import { ref, computed, watch } from "vue";
import { UI_BREAKPOINTS, toMaxWidthMediaQuery } from "../../ui/breakpoints.js";

/** Owns application version updates with per-instance state and explicit peer interfaces. */
export function useAppVersionUpdates(ports = {}) {
const currentAppBuildId = String(__APP_BUILD_ID__ || '').trim();

const isLocalDev = import.meta.env.DEV;

const currentAppReleaseNotes = Array.isArray(__APP_RELEASE_NOTES__) ? __APP_RELEASE_NOTES__ : [];

const currentAppUpdateKind = String(__APP_UPDATE_KIND__ || 'code').trim() === 'resource' ? 'resource' : 'code';

const currentPublicDataVersion = String(__PUBLIC_DATA_VERSION__ || currentAppBuildId || '').trim();

const remoteAppBuildId = ref('');

const remoteAppReleaseNotes = ref([]);

const remoteAppUpdateKind = ref('code');

const hasAppUpdate = ref(false);

const appUpdateDismissed = ref(false);

const showAppUpdatePromptModal = ref(false);

const showAppReleaseLogModal = ref(false);

const showReleaseLogImage = ref(false);

const releaseLogSkipBuildId = ref('');

const releaseLogSkipChecked = ref(false);

const hasAutoShownReleaseLogThisVisit = ref(false);

let appVersionCheckTimer = null;

let appVersionCheckDelayTimer = null;

let releaseLogImageDelayTimer = null;

let cancelInitialAppVersionCheck = null;

const APP_VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

const APP_RELEASE_LOG_SKIP_KEY = 'pjsk_skip_release_log_build_id_v1';

const APP_UPDATE_DEBUG_REMOTE_KEY = 'pjsk_debug_remote_build_id_v1';

const ENABLE_RELEASE_LOG_IMAGE = false;

const appUpdateReleaseNotes = computed(() => {
  const list = Array.isArray(remoteAppReleaseNotes.value)
    ? remoteAppReleaseNotes.value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (list.length > 0) return list;
  if (remoteAppUpdateKind.value === 'resource') return ['更新资源'];
  return ['修复若干已知问题并优化交互体验。'];
});

const currentBuildReleaseNotes = computed(() => {
  const list = Array.isArray(currentAppReleaseNotes)
    ? currentAppReleaseNotes.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (list.length > 0) return list;
  if (currentAppUpdateKind === 'resource') return ['更新资源'];
  return ['修复若干已知问题并优化交互体验。'];
});

const appUpdateBannerText = computed(() => (
  remoteAppUpdateKind.value === 'resource'
    ? '检测到资源已更新，刷新后可获取最新数据。'
    : '检测到新版本已发布，刷新后可获取最新内容。'
));

const appUpdatePromptTitle = computed(() => (
  remoteAppUpdateKind.value === 'resource' ? '更新资源' : '新版本已发布'
));

const appUpdatePromptSubtitle = computed(() => (
  `${remoteAppUpdateKind.value === 'resource' ? '资源构建号' : '构建号'}：${remoteAppBuildId.value || '未知'}`
));

const currentReleaseLogTitle = computed(() => (
  currentAppUpdateKind === 'resource' ? '更新资源' : '新版内容'
));

const releaseLogImageSrc = computed(() => (
  currentAppBuildId ? `/hello.jpg?v=${encodeURIComponent(currentAppBuildId)}` : '/hello.jpg'
));

const shouldRenderReleaseLogImage = computed(() => (
  ENABLE_RELEASE_LOG_IMAGE && showReleaseLogImage.value
));

const clearReleaseLogImageDelay = () => {
  if (releaseLogImageDelayTimer) {
    clearTimeout(releaseLogImageDelayTimer);
    releaseLogImageDelayTimer = null;
  }
};

const scheduleReleaseLogImage = () => {
  clearReleaseLogImageDelay();
  showReleaseLogImage.value = false;

  if (!ENABLE_RELEASE_LOG_IMAGE || typeof window === 'undefined') return;
  releaseLogImageDelayTimer = window.setTimeout(() => {
    releaseLogImageDelayTimer = null;
    showReleaseLogImage.value = true;
  }, 1400);
};

const showAppUpdateBanner = computed(() => {
  return hasAppUpdate.value && !appUpdateDismissed.value;
});

const showAppUpdatePromptDialog = computed(() => {
  return showAppUpdateBanner.value && showAppUpdatePromptModal.value;
});

const isCurrentReleaseLogSkipped = computed(() => {
  const current = String(currentAppBuildId || '').trim();
  const skipped = String(releaseLogSkipBuildId.value || '').trim();
  return !!current && !!skipped && current === skipped;
});

const syncReleaseLogSkipChecked = () => {
  releaseLogSkipChecked.value = isCurrentReleaseLogSkipped.value;
};

const persistReleaseLogSkipChoice = () => {
  const current = String(currentAppBuildId || '').trim();
  if (!current) return;

  if (releaseLogSkipChecked.value) {
    releaseLogSkipBuildId.value = current;
    localStorage.setItem(APP_RELEASE_LOG_SKIP_KEY, current);
    return;
  }

  if (String(releaseLogSkipBuildId.value || '').trim() === current) {
    releaseLogSkipBuildId.value = '';
    localStorage.removeItem(APP_RELEASE_LOG_SKIP_KEY);
  }
};

const dismissAppUpdateBanner = () => {
  appUpdateDismissed.value = true;
  showAppUpdatePromptModal.value = false;
};

const openAppUpdatePromptModal = () => {
  if (!showAppUpdateBanner.value) return;
  showAppUpdatePromptModal.value = true;
};

const closeAppReleaseLogModal = () => {
  persistReleaseLogSkipChoice();
  showAppReleaseLogModal.value = false;
};

const openCurrentReleaseLogModal = () => {
  syncReleaseLogSkipChecked();
  showAppReleaseLogModal.value = true;
};

const reloadForAppUpdate = () => {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set('_update', String(Date.now()));
    window.location.replace(url.toString());
  }
};

const getDebugRemoteBuildId = () => {
  if (typeof window === 'undefined') return '';
  const host = String(window.location.hostname || '').trim().toLowerCase();
  const canDebug = host === 'localhost' || host === '127.0.0.1';
  if (!canDebug) return '';
  return String(localStorage.getItem(APP_UPDATE_DEBUG_REMOTE_KEY) || '').trim();
};

const fetchRemoteVersionMeta = async () => {
  try {
    const response = await fetch(`/version.json?ts=${Date.now()}`, {
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      buildId: String(data?.buildId || '').trim(),
      publicDataVersion: String(data?.publicDataVersion || '').trim(),
      releaseNotes: Array.isArray(data?.releaseNotes) ? data.releaseNotes : [],
      updateKind: String(data?.updateKind || '').trim() === 'resource' ? 'resource' : 'code'
    };
  } catch {
    return null;
  }
};

const checkForAppUpdate = async () => {
  if (!currentAppBuildId) return;
  const remoteMeta = await fetchRemoteVersionMeta();
  const debugRemoteBuildId = getDebugRemoteBuildId();
  const remoteBuildId = String(debugRemoteBuildId || remoteMeta?.buildId || '').trim();
  if (!remoteBuildId) return;

  remoteAppBuildId.value = remoteBuildId;
  remoteAppReleaseNotes.value = Array.isArray(remoteMeta?.releaseNotes) ? remoteMeta.releaseNotes : [];
  remoteAppUpdateKind.value = remoteMeta?.updateKind === 'resource' ? 'resource' : 'code';

  if (remoteBuildId !== currentAppBuildId) {
    hasAppUpdate.value = true;
    appUpdateDismissed.value = false;
    showAppUpdatePromptModal.value = true;
    return;
  }

  hasAppUpdate.value = false;
  showAppUpdatePromptModal.value = false;

  if (!hasAutoShownReleaseLogThisVisit.value && !isCurrentReleaseLogSkipped.value) {
    hasAutoShownReleaseLogThisVisit.value = true;
    openCurrentReleaseLogModal();
  }
};

const isMobileLikeViewport = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(`${toMaxWidthMediaQuery(UI_BREAKPOINTS.compactMax)}, (pointer: coarse)`).matches;
};

const scheduleInitialAppVersionCheck = () => {
  if (typeof window === 'undefined') return;

  const run = () => {
    cancelInitialAppVersionCheck = null;
    appVersionCheckDelayTimer = null;
    void checkForAppUpdate();
  };

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(run, { timeout: 3500 });
    cancelInitialAppVersionCheck = () => window.cancelIdleCallback?.(idleId);
    return;
  }

  appVersionCheckDelayTimer = window.setTimeout(run, 1800);
  cancelInitialAppVersionCheck = () => {
    if (appVersionCheckDelayTimer) window.clearTimeout(appVersionCheckDelayTimer);
    appVersionCheckDelayTimer = null;
  };
};
const connectAppReleaseLogImage = () => {
watch(showAppReleaseLogModal, (open) => {
  if (open) {
    scheduleReleaseLogImage();
    return;
  }
  clearReleaseLogImageDelay();
  showReleaseLogImage.value = false;
});
};
return {
currentAppBuildId,
isLocalDev,
currentAppReleaseNotes,
currentAppUpdateKind,
currentPublicDataVersion,
remoteAppBuildId,
remoteAppReleaseNotes,
remoteAppUpdateKind,
hasAppUpdate,
appUpdateDismissed,
showAppUpdatePromptModal,
showAppReleaseLogModal,
showReleaseLogImage,
releaseLogSkipBuildId,
releaseLogSkipChecked,
hasAutoShownReleaseLogThisVisit,
get appVersionCheckTimer() { return appVersionCheckTimer; }, set appVersionCheckTimer(value) { appVersionCheckTimer = value; },
get appVersionCheckDelayTimer() { return appVersionCheckDelayTimer; }, set appVersionCheckDelayTimer(value) { appVersionCheckDelayTimer = value; },
get releaseLogImageDelayTimer() { return releaseLogImageDelayTimer; }, set releaseLogImageDelayTimer(value) { releaseLogImageDelayTimer = value; },
get cancelInitialAppVersionCheck() { return cancelInitialAppVersionCheck; }, set cancelInitialAppVersionCheck(value) { cancelInitialAppVersionCheck = value; },
APP_VERSION_CHECK_INTERVAL_MS,
APP_RELEASE_LOG_SKIP_KEY,
APP_UPDATE_DEBUG_REMOTE_KEY,
ENABLE_RELEASE_LOG_IMAGE,
appUpdateReleaseNotes,
currentBuildReleaseNotes,
appUpdateBannerText,
appUpdatePromptTitle,
appUpdatePromptSubtitle,
currentReleaseLogTitle,
releaseLogImageSrc,
shouldRenderReleaseLogImage,
clearReleaseLogImageDelay,
scheduleReleaseLogImage,
showAppUpdateBanner,
showAppUpdatePromptDialog,
isCurrentReleaseLogSkipped,
syncReleaseLogSkipChecked,
persistReleaseLogSkipChoice,
dismissAppUpdateBanner,
openAppUpdatePromptModal,
closeAppReleaseLogModal,
openCurrentReleaseLogModal,
reloadForAppUpdate,
getDebugRemoteBuildId,
fetchRemoteVersionMeta,
checkForAppUpdate,
isMobileLikeViewport,
scheduleInitialAppVersionCheck,
connectAppReleaseLogImage
};
}
