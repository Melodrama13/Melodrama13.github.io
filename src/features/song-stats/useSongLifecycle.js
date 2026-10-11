import { onMounted, onBeforeUnmount, nextTick } from 'vue';

/** Coordinates mount/unmount ownership after all song features are connected. */
export function useSongLifecycle({
  refreshSpoilerClock,
  spoilerClockTimer,
  SPOILER_CLOCK_INTERVAL_MS,
  updateMobileNavState,
  handleWindowResize,
  handleDocumentPointerDownForSongToast,
  bindViewportScrollTracking,
  songStatsRootRef,
  statsMainInteractionHost,
  rememberInteractiveAnchorFromEvent,
  scheduleNavSync,
  duoPairGridResizeObserver,
  scheduleRecalcDuoPairGridColumns,
  duoPairGridRefMap,
  songTableResizeObserver,
  recalcSongTableOverflow,
  songListWrapRef,
  bindSectionObserver,
  lastInteractiveAnchorEl,
  lastInteractiveAt,
  viewportScrollHost,
  handleViewportScroll,
  songImageTitleToastTimer,
  screenshotModalCancelTask,
  clearScreenshotModalAutoClose,
  screenshotModalRetryTask,
  navSyncRaf,
  duoPairGridRaf,
  sectionObserver
}) {
onMounted(() => {
  refreshSpoilerClock();
  spoilerClockTimer.value = window.setInterval(refreshSpoilerClock, SPOILER_CLOCK_INTERVAL_MS);
  updateMobileNavState();
  window.addEventListener('resize', handleWindowResize);
  document.addEventListener('pointerdown', handleDocumentPointerDownForSongToast, true);
  bindViewportScrollTracking();
  const localRoot = songStatsRootRef.value;
  const statsMain = localRoot instanceof HTMLElement ? localRoot.querySelector('.stats-main') : null;
  if (statsMain instanceof HTMLElement) {
    statsMainInteractionHost.value = statsMain;
    statsMainInteractionHost.value.addEventListener('pointerdown', rememberInteractiveAnchorFromEvent, true);
    statsMainInteractionHost.value.addEventListener('keydown', rememberInteractiveAnchorFromEvent, true);
  }
  scheduleNavSync();
  if (typeof ResizeObserver !== 'undefined') {
    duoPairGridResizeObserver.value = new ResizeObserver(() => {
      scheduleRecalcDuoPairGridColumns();
    });
    duoPairGridRefMap.forEach((el) => {
      if (el instanceof HTMLElement) duoPairGridResizeObserver.value.observe(el);
    });
    songTableResizeObserver.value = new ResizeObserver(() => {
      recalcSongTableOverflow();
    });
    if (songListWrapRef.value instanceof HTMLElement) {
      songTableResizeObserver.value.observe(songListWrapRef.value);
    }
  }
  nextTick(() => {
    scheduleRecalcDuoPairGridColumns();
    recalcSongTableOverflow();
  });
  bindSectionObserver();
});

onBeforeUnmount(() => {
  if (spoilerClockTimer.value) {
    clearInterval(spoilerClockTimer.value);
    spoilerClockTimer.value = 0;
  }
  window.removeEventListener('resize', handleWindowResize);
  document.removeEventListener('pointerdown', handleDocumentPointerDownForSongToast, true);
  if (statsMainInteractionHost.value instanceof HTMLElement) {
    statsMainInteractionHost.value.removeEventListener('pointerdown', rememberInteractiveAnchorFromEvent, true);
    statsMainInteractionHost.value.removeEventListener('keydown', rememberInteractiveAnchorFromEvent, true);
    statsMainInteractionHost.value = null;
  }
  lastInteractiveAnchorEl.value = null;
  lastInteractiveAt.value = 0;
  if (viewportScrollHost.value) {
    viewportScrollHost.value.removeEventListener('scroll', handleViewportScroll);
    viewportScrollHost.value = null;
  }
  if (songImageTitleToastTimer.value) {
    clearTimeout(songImageTitleToastTimer.value);
    songImageTitleToastTimer.value = 0;
  }
  if (typeof screenshotModalCancelTask.value === 'function') {
    screenshotModalCancelTask.value();
  }
  clearScreenshotModalAutoClose();
  screenshotModalRetryTask.value = null;
  screenshotModalCancelTask.value = null;
  if (navSyncRaf.value) {
    cancelAnimationFrame(navSyncRaf.value);
    navSyncRaf.value = 0;
  }
  if (duoPairGridResizeObserver.value) {
    duoPairGridResizeObserver.value.disconnect();
    duoPairGridResizeObserver.value = null;
  }
  if (songTableResizeObserver.value) {
    songTableResizeObserver.value.disconnect();
    songTableResizeObserver.value = null;
  }
  if (duoPairGridRaf.value) cancelAnimationFrame(duoPairGridRaf.value);
  if (sectionObserver.value) sectionObserver.value.disconnect();
});
}
