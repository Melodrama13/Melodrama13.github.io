import { onMounted, onBeforeUnmount, onActivated, onDeactivated, nextTick, watch } from 'vue';

/** Owns card effects behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardEffects(inputs) {
  watch(
    () => inputs.props.allCharacters,
    (characters) => {
      inputs.metadata.applyCharacterMetaSource(characters);
    },
    { immediate: true }
  );

  onMounted(() => {
    inputs.media.startMediaRecovery();
    inputs.cutoff.refreshSpoilerClock();
    inputs.cutoff.spoilerClockTimer = window.setInterval(inputs.cutoff.refreshSpoilerClock, inputs.cutoff.SPOILER_CLOCK_INTERVAL_MS);
    inputs.navigation.updateMobileNavState();
    window.addEventListener('resize', inputs.navigation.updateMobileNavState);
    inputs.navigation.bindViewportScrollTracking();
    inputs.cutoff.scheduleTopBarStateChange();
    const localRoot = inputs.cardStatsRootRef.value;
    const statsMain = localRoot instanceof HTMLElement ? localRoot.querySelector('.stats-main') : null;
    if (statsMain instanceof HTMLElement) {
      inputs.navigation.statsMainInteractionHost = statsMain;
      inputs.navigation.statsMainInteractionHost.addEventListener('pointerdown', inputs.navigation.rememberInteractiveAnchorFromEvent, true);
      inputs.navigation.statsMainInteractionHost.addEventListener('keydown', inputs.navigation.rememberInteractiveAnchorFromEvent, true);
    }
    inputs.navigation.scheduleNavSync();
    inputs.navigation.bindSectionObserver();
    nextTick(() => {
      inputs.responsiveLayout.bindRelatedJumpChipObservers();
      inputs.responsiveLayout.bindLineupCardModeLayoutObserver();
      inputs.responsiveLayout.triggerLineupCardModeRowLayoutSyncBurst();
      inputs.cutoff.scheduleTopBarStateChange();
    });
  });

  onBeforeUnmount(() => {
    inputs.media.disposeMediaRecovery();
    if (inputs.cutoff.spoilerClockTimer) {
      clearInterval(inputs.cutoff.spoilerClockTimer);
      inputs.cutoff.spoilerClockTimer = 0;
    }
    if (inputs.cutoff.topBarStateChangeRaf) {
      cancelAnimationFrame(inputs.cutoff.topBarStateChangeRaf);
      inputs.cutoff.topBarStateChangeRaf = 0;
    }
    window.removeEventListener('resize', inputs.navigation.updateMobileNavState);
    if (typeof inputs.captureModal.screenshotModalCancelTask.value === 'function') {
      inputs.captureModal.screenshotModalCancelTask.value();
    }
    if (inputs.navigation.statsMainInteractionHost instanceof HTMLElement) {
      inputs.navigation.statsMainInteractionHost.removeEventListener('pointerdown', inputs.navigation.rememberInteractiveAnchorFromEvent, true);
      inputs.navigation.statsMainInteractionHost.removeEventListener('keydown', inputs.navigation.rememberInteractiveAnchorFromEvent, true);
      inputs.navigation.statsMainInteractionHost = null;
    }
    inputs.navigation.lastInteractiveAnchorEl = null;
    inputs.navigation.lastInteractiveAt = 0;
    if (inputs.navigation.viewportScrollHost) {
      inputs.navigation.viewportScrollHost.removeEventListener('scroll', inputs.navigation.handleViewportScroll);
      inputs.navigation.viewportScrollHost = null;
    }
    if (inputs.navigation.navSyncRaf) {
      cancelAnimationFrame(inputs.navigation.navSyncRaf);
      inputs.navigation.navSyncRaf = 0;
    }
    if (inputs.responsiveLayout.relatedJumpChipSyncRaf) {
      cancelAnimationFrame(inputs.responsiveLayout.relatedJumpChipSyncRaf);
      inputs.responsiveLayout.relatedJumpChipSyncRaf = 0;
    }
    if (inputs.responsiveLayout.lineupCardLayoutSyncRaf) {
      cancelAnimationFrame(inputs.responsiveLayout.lineupCardLayoutSyncRaf);
      inputs.responsiveLayout.lineupCardLayoutSyncRaf = 0;
    }
    if (inputs.responsiveLayout.lineupCardLayoutSyncTimer) {
      clearTimeout(inputs.responsiveLayout.lineupCardLayoutSyncTimer);
      inputs.responsiveLayout.lineupCardLayoutSyncTimer = 0;
    }
    if (inputs.responsiveLayout.lineupCardLayoutResizeObserver) {
      inputs.responsiveLayout.lineupCardLayoutResizeObserver.disconnect();
      inputs.responsiveLayout.lineupCardLayoutResizeObserver = null;
    }
    if (inputs.responsiveLayout.lineupCardLayoutMutationObserver) {
      inputs.responsiveLayout.lineupCardLayoutMutationObserver.disconnect();
      inputs.responsiveLayout.lineupCardLayoutMutationObserver = null;
    }
    if (inputs.responsiveLayout.relatedJumpResizeObserver) {
      inputs.responsiveLayout.relatedJumpResizeObserver.disconnect();
      inputs.responsiveLayout.relatedJumpResizeObserver = null;
    }
    if (inputs.responsiveLayout.relatedJumpMutationObserver) {
      inputs.responsiveLayout.relatedJumpMutationObserver.disconnect();
      inputs.responsiveLayout.relatedJumpMutationObserver = null;
    }
    if (inputs.navigation.sectionObserver) inputs.navigation.sectionObserver.disconnect();
    inputs.captureModal.clearScreenshotModalAutoClose();
    inputs.captureModal.screenshotModalRetryTask.value = null;
    inputs.captureModal.screenshotModalCancelTask.value = null;
    if (inputs.attributeMatrices.matrixSortAnchorTimer) {
      clearTimeout(inputs.attributeMatrices.matrixSortAnchorTimer);
      inputs.attributeMatrices.matrixSortAnchorTimer = 0;
    }
  });

  onActivated(() => inputs.media.startMediaRecovery());
  onDeactivated(() => inputs.media.stopMediaRecovery());

  watch(inputs.cutoff.displayEventId, () => {
    inputs.cutoff.updateDisplayEventIdDraft();
    inputs.cutoff.scheduleTopBarStateChange();
  }, { immediate: true });

  watch(inputs.navigation.navCollapsed, () => {
    inputs.responsiveLayout.triggerLineupCardModeRowLayoutSyncBurst();
    inputs.cutoff.scheduleTopBarStateChange();
  });

  watch([inputs.cutoff.autoCurrentId, inputs.navigation.isNavTopLayout, inputs.cutoff.displayEventIdDraft], () => {
    inputs.cutoff.scheduleTopBarStateChange();
  });

  watch(() => inputs.props.allEvents, async () => {
    inputs.cutoff.updateDisplayEventIdDraft();
    await nextTick();
    inputs.cutoff.scheduleTopBarStateChange();
  }, { deep: false });

  watch(inputs.preview.statsPreviewPayload, (payload) => {
    inputs.emit('stats-preview-update', payload);
  }, { immediate: true });
}
