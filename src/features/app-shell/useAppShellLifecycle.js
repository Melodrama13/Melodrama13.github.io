import { onMounted, onBeforeUnmount, nextTick } from "vue";
import { registerTransientOverlayDismissal } from "../../ui/transientOverlays.js";

/** Owns application shell lifecycle with per-instance state and explicit peer interfaces. */
export function useAppShellLifecycle(ports = {}) {
let unregisterSourceMenuDismissal = null;

const handleGlobalKeyDown = (event) => {
  if (event.defaultPrevented || event.key !== 'Escape') return;
  if (ports.historyCapture.screenshotExportModalVisible.value) {
    // Escape never cancels a running export; its explicit Cancel button owns that action.
    ports.historyCapture.closeScreenshotExportModal();
    event.preventDefault();
  } else if (ports.versionUpdates.showAppUpdatePromptDialog.value) {
    ports.versionUpdates.dismissAppUpdateBanner();
    event.preventDefault();
  } else if (ports.versionUpdates.showAppReleaseLogModal.value) {
    ports.versionUpdates.closeAppReleaseLogModal();
    event.preventDefault();
  } else ports.sourceMenu.handleGlobalKeyDown(event);
};

const connectAppShellMount = () => {
onMounted(() => {
  unregisterSourceMenuDismissal = registerTransientOverlayDismissal(ports.sourceMenu.closeSourceMenu);
  ports.responsiveNavigation.updateCompactTopNav();
  void nextTick(() => {
    ports.tabGestures.updateDesktopTabGlider();
    if (typeof ResizeObserver === 'function' && ports.tabGestures.desktopTabSwitcherRef.value) {
      ports.tabGestures.desktopTabResizeObserver = new ResizeObserver(ports.tabGestures.updateDesktopTabGlider);
      ports.tabGestures.desktopTabResizeObserver.observe(ports.tabGestures.desktopTabSwitcherRef.value);
    }
  });
  void ports.resourceLoading.scheduleSmallStaticImageWarmup();
  ports.versionUpdates.releaseLogSkipBuildId.value = String(localStorage.getItem(ports.versionUpdates.APP_RELEASE_LOG_SKIP_KEY) || '').trim();
  ports.versionUpdates.syncReleaseLogSkipChecked();
  ports.versionUpdates.scheduleInitialAppVersionCheck();
  if (typeof window !== 'undefined') {
    ports.versionUpdates.appVersionCheckTimer = window.setInterval(() => {
      void ports.versionUpdates.checkForAppUpdate();
    }, ports.versionUpdates.APP_VERSION_CHECK_INTERVAL_MS);
  }
  document.addEventListener('pointerdown', ports.sourceMenu.handleGlobalPointerDown);
  document.addEventListener('keydown', handleGlobalKeyDown);
  window.addEventListener('resize', ports.responsiveNavigation.updateCompactTopNav);
  window.addEventListener('resize', ports.sourceMenu.updateSourceMenuPosition);
  window.addEventListener('scroll', ports.sourceMenu.updateSourceMenuPosition, true);
});
};
const connectAppShellUnmount = () => {
onBeforeUnmount(() => {
  unregisterSourceMenuDismissal?.();
  unregisterSourceMenuDismissal = null;
  ports.historyCapture.cancelScreenshotExport();
  ports.tabNavigation.contentNavigator.cancel();
  ports.tabGestures.desktopTabResizeObserver?.disconnect();
  ports.tabGestures.desktopTabResizeObserver = null;
  if (ports.statsControls.statsTopControlSyncRaf) {
    cancelAnimationFrame(ports.statsControls.statsTopControlSyncRaf);
    ports.statsControls.statsTopControlSyncRaf = 0;
  }
  document.removeEventListener('pointerdown', ports.sourceMenu.handleGlobalPointerDown);
  document.removeEventListener('keydown', handleGlobalKeyDown);
  window.removeEventListener('resize', ports.responsiveNavigation.updateCompactTopNav);
  window.removeEventListener('resize', ports.sourceMenu.updateSourceMenuPosition);
  window.removeEventListener('scroll', ports.sourceMenu.updateSourceMenuPosition, true);
  if (ports.tabGestures.suppressPrimaryTabClickTimer) {
    window.clearTimeout(ports.tabGestures.suppressPrimaryTabClickTimer);
    ports.tabGestures.suppressPrimaryTabClickTimer = null;
  }
  if (typeof ports.historyCapture.screenshotExportModalCancelTask.value === 'function') {
    ports.historyCapture.screenshotExportModalCancelTask.value();
  }
  ports.historyCapture.screenshotExportModalCancelTask.value = null;
  if (ports.predictionSources.cleanupNoticeTimer) {
    clearTimeout(ports.predictionSources.cleanupNoticeTimer);
    ports.predictionSources.cleanupNoticeTimer = null;
  }
  if (ports.historyCapture.screenshotExportModalAutoCloseTimer) {
    clearTimeout(ports.historyCapture.screenshotExportModalAutoCloseTimer);
    ports.historyCapture.screenshotExportModalAutoCloseTimer = null;
  }
  if (ports.versionUpdates.appVersionCheckTimer) {
    clearInterval(ports.versionUpdates.appVersionCheckTimer);
    ports.versionUpdates.appVersionCheckTimer = null;
  }
  if (typeof ports.versionUpdates.cancelInitialAppVersionCheck === 'function') {
    ports.versionUpdates.cancelInitialAppVersionCheck();
    ports.versionUpdates.cancelInitialAppVersionCheck = null;
  }
  if (ports.versionUpdates.appVersionCheckDelayTimer) {
    clearTimeout(ports.versionUpdates.appVersionCheckDelayTimer);
    ports.versionUpdates.appVersionCheckDelayTimer = null;
  }
  ports.versionUpdates.clearReleaseLogImageDelay();
  if (typeof ports.resourceLoading.cancelSmallImageWarmup === 'function') {
    ports.resourceLoading.cancelSmallImageWarmup();
    ports.resourceLoading.cancelSmallImageWarmup = null;
  }
  if (typeof ports.resourceLoading.cancelScheduledPublicDataCacheWrite === 'function') {
    ports.resourceLoading.cancelScheduledPublicDataCacheWrite();
    ports.resourceLoading.cancelScheduledPublicDataCacheWrite = null;
  }
  if (typeof ports.resourceLoading.stopSmallImageWarmupObserver === 'function') {
    ports.resourceLoading.stopSmallImageWarmupObserver();
    ports.resourceLoading.stopSmallImageWarmupObserver = null;
  }
});
};
return {
handleGlobalKeyDown,
connectAppShellMount,
connectAppShellUnmount
};
}
