<template>
  <div class="main-app">
    <LiquidGlassFilters />
    <div
      class="nav-tabs"
      :class="{
        'is-stats-top-compact': isStatsTopNavCompact
      }"
      role="navigation"
      :aria-label="isSmallTabletViewport ? '页面工具' : '页面切换'"
    >
      <span v-if="!isSmallTabletViewport" v-liquid-glass class="nav-tabs-glass ui-liquid-glass ui-liquid-glass--refractive" aria-hidden="true"></span>
      <AppDesktopTabSwitcher
  :tab-gestures="tabGestures"
  :tab-catalog="tabCatalog"
  :responsive-navigation="responsiveNavigation"
/>
      <AppStatsTopControls
  :tab-navigation="tabNavigation"
  :stats-controls="statsControls"
/>
      <div class="nav-tabs-spacer"></div>
      <div v-if="showPredictInfoInNav" v-liquid-glass class="predict-info top-nav-glass-capsule ui-liquid-glass ui-liquid-glass--refractive" data-ui-glass-profile="lens">
        {{ `${predictiveEvents.length}条预测` }}
      </div>
      <div v-if="cleanedPatchNoticeCount > 0" v-liquid-glass class="predict-cleanup-info top-nav-glass-capsule ui-liquid-glass ui-liquid-glass--refractive" data-ui-glass-profile="lens">
        {{ isCompactTopNav ? `已清理 ${cleanedPatchNoticeCount} 条` : `已自动清理 ${cleanedPatchNoticeCount} 条过期/冲突预测` }}
      </div>
      <AppDesktopSourceTrigger
  :tab-navigation="tabNavigation"
  :source-menu="sourceMenu"
  :prediction-sources="predictionSources"
  :responsive-navigation="responsiveNavigation"
/>
      <Teleport to="body">
        <UiSurfaceTransition kind="popover">
        <div
          v-if="sourceMenuOpen && showSourceDropdownInNav"
          ref="sourceMenuPanelRef"
          v-liquid-glass
          class="source-menu source-menu-floating ui-liquid-glass ui-liquid-glass--prominent"
          :style="sourceMenuStyle"
          @pointerdown.stop
        >
          <AppSourceMenuContents
  :prediction-sources="predictionSources"
  :source-menu="sourceMenu"
  :tab-navigation="tabNavigation"
  :responsive-navigation="responsiveNavigation"
  :prediction-files="predictionFiles"
  :history-capture="historyCapture"
/>
        </div>
      </UiSurfaceTransition>
      </Teleport>
      <input
        ref="predictImportInputRef"
        type="file"
        accept="application/json,.json"
        class="predict-import-input"
        @change="handleImportPredictsFile"
      />
    </div>

    <AppMobileNavigationDock
  :tab-gestures="tabGestures"
  :tab-catalog="tabCatalog"
  :tab-navigation="tabNavigation"
  :source-menu="sourceMenu"
  :prediction-sources="predictionSources"
/>

    <AppUpdateBanner
  :version-updates="versionUpdates"
/>

    <UiSurfaceTransition kind="dialog">
    <div v-if="showAppUpdatePromptDialog" class="app-update-modal-mask" @click.self="dismissAppUpdateBanner" @keydown.esc.stop="shellLifecycle.handleGlobalKeyDown">
      <AppUpdatePromptContent
  :version-updates="versionUpdates"
/>
    </div>

    </UiSurfaceTransition>
    <UiSurfaceTransition kind="dialog">
    <div v-if="showAppReleaseLogModal" class="app-update-modal-mask" @click.self="closeAppReleaseLogModal" @keydown.esc.stop="shellLifecycle.handleGlobalKeyDown">
      <AppReleaseLogContent
  :version-updates="versionUpdates"
/>
    </div>

    </UiSurfaceTransition>
    <UiSurfaceTransition kind="dialog">
    <div
      v-if="screenshotExportModalVisible"
      class="app-screenshot-modal-mask"
      @click.self="closeScreenshotExportModal"
      @keydown.esc.stop="shellLifecycle.handleGlobalKeyDown"
    >
      <AppCaptureStatusContent
  :history-capture="historyCapture"
/>
    </div>

    </UiSurfaceTransition>
    <div
      ref="contentAreaRef"
      class="content-area"
      :class="{ 'history-mode': currentTab === 'history' }"
      @scroll.passive="handleContentScroll"
    >
      <keep-alive v-if="isAppDataReady">
        <component 
          ref="tabComponentRef"
          :key="currentTab"
          :is="tabs[currentTab]" 
          :all-events="currentTab === 'specialPredict' ? historyData : totalEventData" 
          :all-cards="totalCardsData"
          :all-songs="songsData"
          :all-characters="charactersData"
          :nuigurumi-data="nuigurumiData"
          :all-base-cards="baseCards"
          :prediction-schedule-order="predictionScheduleOrder"
          :predict-sources="predictSources"
          :active-predict-source-id="activePredictSourceId"
          :predict-user-name="predictUserName"
          :stats-preview-data="statsPreviewData"
          :preview-sync-event-id="previewSyncEventId"
          :jump-event-id="historyJumpEventId"
          :jump-event-seq="historyJumpSeq"
          @jump-to-event="handleStatsJumpToEvent"
          @stats-preview-update="handleStatsPreviewUpdate"
          @stats-top-state-change="scheduleStatsTopControlStateSync"
          @sync-preview-event-id="handlePreviewSyncEventId"
        />
      </keep-alive>
      <AppDataLoadingIndicator
  :resource-loading="resourceLoading"
/>
    </div>

    <AppBackToTopButton
  :tab-navigation="tabNavigation"
  :tab-catalog="tabCatalog"
/>
  </div>
</template>

<script setup>
import UiSurfaceTransition from './components/ui/UiSurfaceTransition.vue';
import AppDesktopTabSwitcher from './features/app-shell/AppDesktopTabSwitcher.vue';
import AppStatsTopControls from './features/app-shell/AppStatsTopControls.vue';
import AppDesktopSourceTrigger from './features/app-shell/AppDesktopSourceTrigger.vue';
import AppSourceMenuContents from './features/app-shell/AppSourceMenuContents.vue';
import AppMobileNavigationDock from './features/app-shell/AppMobileNavigationDock.vue';
import AppUpdateBanner from './features/app-shell/AppUpdateBanner.vue';
import AppUpdatePromptContent from './features/app-shell/AppUpdatePromptContent.vue';
import AppReleaseLogContent from './features/app-shell/AppReleaseLogContent.vue';
import AppCaptureStatusContent from './features/app-shell/AppCaptureStatusContent.vue';
import AppDataLoadingIndicator from './features/app-shell/AppDataLoadingIndicator.vue';
import AppBackToTopButton from './features/app-shell/AppBackToTopButton.vue';
import { provide } from "vue";
import LiquidGlassFilters from "./components/ui/LiquidGlassFilters.vue";
import { useAppTabCatalog } from './features/app-shell/useAppTabCatalog.js';
import { useAppTabNavigation } from './features/app-shell/useAppTabNavigation.js';
import { useAppPredictionFiles } from './features/app-shell/useAppPredictionFiles.js';
import { useAppSourceMenu } from './features/app-shell/useAppSourceMenu.js';
import { useAppPredictionSources } from './features/app-shell/useAppPredictionSources.js';
import { useAppResponsiveNavigation } from './features/app-shell/useAppResponsiveNavigation.js';
import { useAppTabGestures } from './features/app-shell/useAppTabGestures.js';
import { useAppHistoryCapture } from './features/app-shell/useAppHistoryCapture.js';
import { useAppStatsControls } from './features/app-shell/useAppStatsControls.js';
import { useAppVersionUpdates } from './features/app-shell/useAppVersionUpdates.js';
import { useAppResourceLoading } from './features/app-shell/useAppResourceLoading.js';
import { useAppPredictionOverlay } from './features/app-shell/useAppPredictionOverlay.js';
import { useAppPredictionSchedule } from './features/app-shell/useAppPredictionSchedule.js';
import { useAppPredictionPayload } from './features/app-shell/useAppPredictionPayload.js';
import { useAppShellLifecycle } from './features/app-shell/useAppShellLifecycle.js';

const tabCatalog = useAppTabCatalog({

});

const tabNavigation = useAppTabNavigation({
  get tabCatalog() { return tabCatalog; },
  get predictionSources() { return predictionSources; },
  get sourceMenu() { return sourceMenu; },
  get statsControls() { return statsControls; }
});

const predictionFiles = useAppPredictionFiles({
  get predictionSchedule() { return predictionSchedule; },
  get predictionSources() { return predictionSources; }
});

const sourceMenu = useAppSourceMenu({
  get predictionSources() { return predictionSources; },
  get historyCapture() { return historyCapture; },
  get tabNavigation() { return tabNavigation; },
  get responsiveNavigation() { return responsiveNavigation; },
  get statsControls() { return statsControls; }
});

const predictionSources = useAppPredictionSources({
  get resourceLoading() { return resourceLoading; },
  get predictionSchedule() { return predictionSchedule; },
  get sourceMenu() { return sourceMenu; }
});

const responsiveNavigation = useAppResponsiveNavigation({
  get tabGestures() { return tabGestures; },
  get statsControls() { return statsControls; }
});

const tabGestures = useAppTabGestures({
  get tabCatalog() { return tabCatalog; },
  get tabNavigation() { return tabNavigation; },
  get responsiveNavigation() { return responsiveNavigation; }
});

const historyCapture = useAppHistoryCapture({
  get predictionSources() { return predictionSources; },
  get predictionFiles() { return predictionFiles; },
  get tabCatalog() { return tabCatalog; },
  get tabNavigation() { return tabNavigation; },
  get sourceMenu() { return sourceMenu; },
  get predictionSchedule() { return predictionSchedule; }
});

const statsControls = useAppStatsControls({
  get tabCatalog() { return tabCatalog; },
  get tabNavigation() { return tabNavigation; }
});

const versionUpdates = useAppVersionUpdates({
  get historyCapture() { return historyCapture; },
  get tabNavigation() { return tabNavigation; }
});

const resourceLoading = useAppResourceLoading({
  get versionUpdates() { return versionUpdates; },
  get statsControls() { return statsControls; },
  get predictionSources() { return predictionSources; }
});

const predictionOverlay = useAppPredictionOverlay({
  get predictionSchedule() { return predictionSchedule; },
  get predictionSources() { return predictionSources; },
  get predictionPayload() { return predictionPayload; },
  get resourceLoading() { return resourceLoading; }
});

const predictionSchedule = useAppPredictionSchedule({
  get resourceLoading() { return resourceLoading; },
  get predictionSources() { return predictionSources; }
});

const predictionPayload = useAppPredictionPayload({
  get predictionOverlay() { return predictionOverlay; },
  get predictionSchedule() { return predictionSchedule; },
  get resourceLoading() { return resourceLoading; }
});

const shellLifecycle = useAppShellLifecycle({
  get responsiveNavigation() { return responsiveNavigation; },
  get tabGestures() { return tabGestures; },
  get resourceLoading() { return resourceLoading; },
  get versionUpdates() { return versionUpdates; },
  get sourceMenu() { return sourceMenu; },
  get tabNavigation() { return tabNavigation; },
  get statsControls() { return statsControls; },
  get historyCapture() { return historyCapture; },
  get predictionSources() { return predictionSources; }
});

const { tabs, currentTab } = tabCatalog;
const { historyJumpEventId, historyJumpSeq, statsPreviewData, previewSyncEventId, tabComponentRef, contentAreaRef, showSourceDropdownInNav, showPredictInfoInNav, handleStatsPreviewUpdate, handlePreviewSyncEventId, handleContentScroll, handleStatsJumpToEvent } = tabNavigation;
const { predictImportInputRef, handleImportPredictsFile } = predictionFiles;
const { sourceMenuOpen, sourceMenuPanelRef, sourceMenuStyle } = sourceMenu;
const { predictUserName, predictiveEvents, predictSources, activePredictSourceId, cleanedPatchNoticeCount, setCleanedPatchNoticeCount } = predictionSources;
const { isCompactTopNav, isStatsTopNavCompact, isSmallTabletViewport } = responsiveNavigation;

const { screenshotExportModalVisible, closeScreenshotExportModal } = historyCapture;
const { scheduleStatsTopControlStateSync } = statsControls;
const { showAppReleaseLogModal, showAppUpdatePromptDialog, dismissAppUpdateBanner, closeAppReleaseLogModal } = versionUpdates;
const { historyData, baseCards, songsData, charactersData, nuigurumiData, isAppDataReady, predictionScheduleOrder } = resourceLoading;
const { draftPredictiveEvent, totalEventData, totalCardsData } = predictionOverlay;
const { getEventKey, resolvePredictEventIdForCurrentSchedule, sanitizeCanonicalPredictiveEvents } = predictionSchedule;
const { buildPredictEventPatchFromPayload } = predictionPayload;

provide('updateDraftPredictEvent', (payload) => {
  draftPredictiveEvent.value = buildPredictEventPatchFromPayload(payload, { warn: false, alertOnInvalid: false });
});

provide('savePredictEvent', (payload) => {
  const newPredictEvent = buildPredictEventPatchFromPayload(payload, { alertOnInvalid: true });
  if (!newPredictEvent) return;
  const newEventKey = getEventKey(newPredictEvent.id);
  const index = predictiveEvents.value.findIndex((event) => (
    getEventKey(resolvePredictEventIdForCurrentSchedule(event)) === newEventKey
  ));
  const updatedList = [...predictiveEvents.value];

  if (index > -1) {
    updatedList[index] = newPredictEvent;
  } else {
    updatedList.push(newPredictEvent);
  }

  const beforeCount = updatedList.length;
  const canonical = sanitizeCanonicalPredictiveEvents(updatedList);
  predictiveEvents.value = canonical;
  setCleanedPatchNoticeCount(Math.max(0, beforeCount - canonical.length), 4200);
});

provide('deletePredictEvent', (id) => {
  const targetKey = getEventKey(id);
  predictiveEvents.value = predictiveEvents.value.filter((event) => (
    getEventKey(resolvePredictEventIdForCurrentSchedule(event)) !== targetKey
  ));
});

// Register original effects in their original order after explicit feature composition.
tabGestures.connectAppTabGliderLayout();
tabNavigation.connectAppTabNavigation();
statsControls.connectAppStatsComponent();
statsControls.connectAppStatsTopControls();
resourceLoading.connectAppResourceMount();
shellLifecycle.connectAppShellMount();
shellLifecycle.connectAppShellUnmount();
predictionSources.connectAppPredictionPersistence();
predictionSources.connectAppPredictionUserName();
versionUpdates.connectAppReleaseLogImage();
versionUpdates.connectAppShellModalPolicy();
sourceMenu.connectAppSourceMenu();
sourceMenu.connectAppPredictionEditorSourceGuard();
</script>

<style scoped src="./features/app-shell/styles/appShell.css"></style>
