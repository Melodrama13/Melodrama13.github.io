<template>
  <div ref="historyWrapperRef" class="event-history-wrapper" :class="{ 'with-editor': isEditorOpen && !isBottomPredictEditorMode, 'with-editor-space': navigation.isEditorSpaceReserved.value && !isBottomPredictEditorMode, 'is-editor-open': isEditorOpen, 'is-editor-layout-transitioning': navigation.isEditorLayoutTransitioning.value }">
    <UiSurfaceTransition kind="popover">
      <div
        v-if="isEditorOpen"
        class="predict-preview-floating"
        aria-live="polite"
      >
        <HistoryPreviewConfig
  :preview-layout="previewLayout"
  :preview-selections="previewSelections"
  :presentation="presentation"
/>
        <HistoryPreviewPanel :key="panel.id" v-show="!previewFloatingCollapsed" v-for="panel in previewFloatingPanels"
  :preview-layout="previewLayout"
  :preview-selections="previewSelections"
  :preview-cutoff="previewCutoff"
  :vs-preview="vsPreview"
  :preview-statistics="previewStatistics"
  :daily-lineup="dailyLineup"
  :character-attribute-preview="characterAttributePreview"
  :presentation="presentation"
  :panel="panel"
/>
      </div>
    </UiSurfaceTransition>
    <div
      class="event-history"
      ref="historyContainer"
      @scroll.passive="handleHistoryScroll"
      @wheel.passive="handleHistoryManualScrollIntent"
      @touchmove.passive="handleHistoryManualScrollIntent"
      @pointerdown="handleHistoryPointerIntent"
    >
      <div ref="filterStickyRef" class="filter-sticky">
        <EventHistoryFilterToolbar
            :is-compact="isCompactFilterBar"
            :is-editor-tight="isEditorFilterTight"
            :is-editor-mobile="isEditorFilterMobile"
            :is-sort-descending="sortDesc"
            :are-birthday-rows-hidden="hideBirthdayRows"
            :are-preview-rows-hidden="hidePreviewRows"
            :are-collab-pools-hidden="hideCollabPools"
            :is-filter-panel-visible="showFilter"
            :is-precedent-panel-visible="precedents.isOpen.value"
            :has-active-filters="hasActiveFilters"
            :filter-hit-event-count="filterHitEventCount"
            :register-filter-bar-element="registerFilterBarElement"
            @toggle-sort-order="sortDesc = !sortDesc"
            @toggle-birthday-rows="toggleBirthdayRowsVisibility"
            @toggle-preview-rows="togglePreviewRowsVisibility"
            @toggle-collab-pools="toggleCollabPoolsVisibility"
            @navigate="scrollTo"
            @toggle-filter-panel="precedents.close(false); showFilter = !showFilter"
            @toggle-precedents="precedents.toggle"
          />
        <UiSurfaceTransition kind="popover">
          <HistoryFilterPanel v-if="showFilter"
  :filtering="filtering"
  :rows="rows"
  :preview-selections="previewSelections"
  :filter-layout="filterLayout"
  :presentation="presentation"
/>
        </UiSurfaceTransition>
        <UiSurfaceTransition kind="popover">
          <HistoryPrecedentPanel v-if="precedents.isOpen.value" :precedents="precedents" :presentation="presentation" :card-media="cardMedia" />
        </UiSurfaceTransition>
      </div>
      <div class="history-list" ref="listRef">
        <template v-for="row in displayRows" :key="row.key">
        <div
            v-if="row.kind === 'event'"
            :id="'event-' + row.event.id"
            data-feature-view="event-item" data-feature-page="history" class="event-item"
            :class="{
              'is-tooltip-raised': tooltipRaisedEventKey === row.key,
              'is-active': currentActiveId === normalizeEventId(row.event.id),
              'is-heavy-ready': shouldRenderEventHeavy(row)
            }"
            :data-predict-state="getPredictStatus(row.event)"
            @click="handleEventRowClick(row.event, $event)"
            :style="[
              isUnitRelated(row.event)
                ? { backgroundColor: getUnitColor(row.event.unit) + '20' }
                : { background: 'linear-gradient(45deg, rgba(253, 124, 193, 0.20) 0%, rgba(135, 192, 255, 0.20) 50%, rgba(248, 255, 135, 0.20) 100%)' },
              row.event.gacha_type === '普通限定'
                ? { border: '3px solid #ff4d4f' }
                : (row.event.gacha_type === 'UE限定' ? { border: '3px solid #f59e0b' } : {})
              ]">
          <HistoryEventRowContent
  :history-now="clock.spoilerNow.value"
  @open-precedents="precedents.open($event, row.event.id)"
  :formatting="formatting"
  :tooltips="tooltips"
  :song-media="songMedia"
  :prediction-eligibility="predictionEligibility"
  :prediction-editor="predictionEditor"
  :event-ordering="eventOrdering"
  :progressive-render="progressiveRender"
  :presentation="presentation"
  :card-media="cardMedia"
  :row="row"
/>
        </div>
        <div
          v-else-if="row.kind === 'preview'"
          :id="row.id"
          data-feature-view="preview-row" data-feature-page="history" class="preview-row"
        >
          <HistoryPreviewRowContent
  :presentation="presentation"
  :row="row"
/>
        </div>
        <div
          v-else
          :id="row.id"
          data-feature-view="birthday-row" data-feature-page="history" class="birthday-row"
          :class="{ 'is-open': isBirthdayInfoOpen(row) }"
          :style="{ backgroundColor: getBirthdayRowTint(row.name) }"
          @click.stop="toggleBirthdayInfo(row)"
        >
          <HistoryBirthdayRowContent
  :formatting="formatting"
  :tooltips="tooltips"
  :presentation="presentation"
  :card-media="cardMedia"
  :row="row"
/>
        </div>
        </template>
      </div>
      <component :is="editorComponent"
        ref="predictEditorRef"
        v-if="editorComponent && currentEditingEvent"
        :is-open="isEditorOpen" 
        :is-layout-transitioning="navigation.isEditorLayoutTransitioning.value"
        :event="currentEditingEvent"
        :char-map="CHAR_MAP"
        :all-characters="props.allCharacters"
        :box-locked-units="currentEditingBoxLockedUnits"
        @selection-change="handlePredictSelectionChange"
        @close="handleCloseEditor"
      />
    </div>
  </div>
  <div v-if="isEditorLoading || editorLoadError" class="history-editor-load-status" role="status" aria-live="polite">
    <span>{{ isEditorLoading ? '正在加载预测编辑器…' : editorLoadError }}</span>
    <button v-if="editorLoadError" class="pjsk-ui-action control-pill" @click="retryPredictEditor">重试</button>
    <button v-if="editorLoadError" class="pjsk-ui-action control-pill" @click="cancelPendingEditorOpen">关闭</button>
  </div>
  <HistoryPredictSwitchDialog
  :prediction-editor="predictionEditor"
/>
</template>

<script setup>
import UiSurfaceTransition from './ui/UiSurfaceTransition.vue';
import HistoryPreviewConfig from '../features/event-history/HistoryPreviewConfig.vue';
import HistoryPreviewPanel from '../features/event-history/HistoryPreviewPanel.vue';
import HistoryFilterPanel from '../features/event-history/HistoryFilterPanel.vue';
import HistoryPrecedentPanel from '../features/event-history/HistoryPrecedentPanel.vue';
import { useHistoryPrecedents } from '../features/event-history/useHistoryPrecedents.js';
import HistoryEventRowContent from '../features/event-history/HistoryEventRowContent.vue';
import HistoryPreviewRowContent from '../features/event-history/HistoryPreviewRowContent.vue';
import HistoryBirthdayRowContent from '../features/event-history/HistoryBirthdayRowContent.vue';
import HistoryPredictSwitchDialog from '../features/event-history/HistoryPredictSwitchDialog.vue';

import EventHistoryFilterToolbar from '../features/event-history/EventHistoryFilterToolbar.vue';
import { useHistoryEditorLoading } from '../features/event-history/useHistoryEditorLoading.js';
import { inject } from 'vue';
import { useHistoryClock } from '../features/event-history/useHistoryClock.js';
import { useHistoryFormatting } from '../features/event-history/useHistoryFormatting.js';
import { useHistoryFiltering } from '../features/event-history/useHistoryFiltering.js';
import { useHistoryRows } from '../features/event-history/useHistoryRows.js';
import { useHistoryTooltips } from '../features/event-history/useHistoryTooltips.js';
import { useHistorySongMedia } from '../features/event-history/useHistorySongMedia.js';
import { useHistorySourceDates } from '../features/event-history/useHistorySourceDates.js';
import { useHistoryPredictionEligibility } from '../features/event-history/useHistoryPredictionEligibility.js';
import { useHistoryPredictionEditor } from '../features/event-history/useHistoryPredictionEditor.js';
import { useHistoryNavigation } from '../features/event-history/useHistoryNavigation.js';
import { useHistoryPreviewLayout } from '../features/event-history/useHistoryPreviewLayout.js';
import { useHistoryPreviewSelections } from '../features/event-history/useHistoryPreviewSelections.js';
import { useHistoryFestivalPreview } from '../features/event-history/useHistoryFestivalPreview.js';
import { useHistoryEventOrdering } from '../features/event-history/useHistoryEventOrdering.js';
import { useHistoryPreviewCutoff } from '../features/event-history/useHistoryPreviewCutoff.js';
import { useHistoryVsPreview } from '../features/event-history/useHistoryVsPreview.js';
import { useHistoryPreviewStatistics } from '../features/event-history/useHistoryPreviewStatistics.js';
import { useHistoryDailyLineup } from '../features/event-history/useHistoryDailyLineup.js';
import { useHistoryCharacterAttributePreview } from '../features/event-history/useHistoryCharacterAttributePreview.js';
import { useHistoryPreviewPanels } from '../features/event-history/useHistoryPreviewPanels.js';
import { useHistoryProgressiveRender } from '../features/event-history/useHistoryProgressiveRender.js';
import { useHistoryViewport } from '../features/event-history/useHistoryViewport.js';
import { useHistoryFilterLayout } from '../features/event-history/useHistoryFilterLayout.js';
import { useHistoryLifecycle } from '../features/event-history/useHistoryLifecycle.js';
import { useHistoryCaptureRange } from '../features/event-history/useHistoryCaptureRange.js';
import { useHistoryCaptureAssets } from '../features/event-history/useHistoryCaptureAssets.js';
import { useHistoryCapturePolicy } from '../features/event-history/useHistoryCapturePolicy.js';
import { useHistoryCapture } from '../features/event-history/useHistoryCapture.js';
import { useHistoryPresentation } from '../features/event-history/useHistoryPresentation.js';
import { useHistoryCardMedia } from '../features/event-history/useHistoryCardMedia.js';

const props = defineProps({
  allEvents: { type: Array, default: () => [] },
  allCards: { type: Array, default: () => [] },
  allSongs: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] },
  allBaseCards: { type: Array, default: () => [] },
  predictionScheduleOrder: { type: Object, default: null },
  statsPreviewData: { type: Object, default: null },
  jumpEventId: { type: [Number, String], default: null },
  jumpEventSeq: { type: Number, default: 0 }
});
const emit = defineEmits(['sync-preview-event-id']);
const deletePredictEvent = inject('deletePredictEvent');

const clock = useHistoryClock({

});

const precedents = useHistoryPrecedents({
  props,
  clock,
  get filtering() { return filtering; },
  get navigation() { return navigation; },
});

const formatting = useHistoryFormatting({
  get presentation() { return presentation; },
});
const { normalizeEventId, hasAttributeIcon, formatEventDatePadded, getBirthdayRowTint } = formatting;

const filtering = useHistoryFiltering({
  props,
  get eventOrdering() { return eventOrdering; },
  get rows() { return rows; },
  get formatting() { return formatting; },
  get presentation() { return presentation; },
  get previewSelections() { return previewSelections; },
});
const { hideCollabPools, hideBirthdayRows, hidePreviewRows, sortDesc, showFilter, filterMode, EVENT_TYPE_FILTER_OPTIONS, EVENT_SPECIAL_RULE_OPTIONS, EVENT_GACHA_FILTER_OPTIONS, filterCriteria, eventFilterCriteria, canUseEventBanFilter, canUseMultiPersonRule, canUseFourNoVsRule, hasActiveFilters, isEventUnitFilterDisabledByMix, eventFestivalOptions, toggleChar, toggleEventFilterCharacter, setEventMultiPersonRule, toggleDetailFilterArray, setEventBanFilter, toggleEventFilterArray, toggleEventSpecialRule, switchFilterMode, resetFilters } = filtering;

const rows = useHistoryRows({
  props,
  get filtering() { return filtering; },
  get eventOrdering() { return eventOrdering; },
  get formatting() { return formatting; },
  get previewSelections() { return previewSelections; },
  get sourceDates() { return sourceDates; },
});
const { filterHitEventCount, activeFilteredEventCount, displayRows } = rows;

const tooltips = useHistoryTooltips({
  get navigation() { return navigation; },
});
const { tooltipRaisedEventKey, getCardTooltipStyle, handleCardTooltipEnter, getSongTooltipStyle, handleSongTooltipEnter, toggleBirthdayInfo, isBirthdayInfoOpen, clearTooltipRaisedEvent, toggleCardTooltip, isCardTooltipOpen, toggleSongTooltip, isSongTooltipOpen } = tooltips;

const songMedia = useHistorySongMedia({
  props,
  get clock() { return clock; },
});
const { hasSong3DMV, hasSong2DMV, getSongIdText, getSongTooltipImageSrc, onCardTooltipImageLoad, onSongTooltipImageError, onSongTooltipImageLoad, getSongTitleText, getSongComposerText, getSongLyricistText, getSongArrangerText, hasSongTooltip } = songMedia;

const sourceDates = useHistorySourceDates({
  props,
  get formatting() { return formatting; },
});

const predictionEligibility = useHistoryPredictionEligibility({
  props,
  get clock() { return clock; },
  get formatting() { return formatting; },
  get sourceDates() { return sourceDates; },
});
const { getPredictStatus } = predictionEligibility;

const editorLoading = useHistoryEditorLoading();
const { editorComponent, isEditorLoading, editorLoadError } = editorLoading;
const predictionEditor = useHistoryPredictionEditor({
  editorLoading,
  emit,
  deletePredictEvent,
  get tooltips() { return tooltips; },
  get progressiveRender() { return progressiveRender; },
  get previewSelections() { return previewSelections; },
  get formatting() { return formatting; },
  get navigation() { return navigation; },
  get predictionEligibility() { return predictionEligibility; },
});
const { cancelPendingEditorOpen, retryPredictEditor, isEditorOpen, currentEditingEvent, predictEditorRef, predictSwitchSaveBtnRef, predictSwitchDialog, resolvePredictSwitchDialog, handleEventRowClick, handleCloseEditor, removePredict } = predictionEditor;

const navigation = useHistoryNavigation({
  props,
  get formatting() { return formatting; },
  get viewport() { return viewport; },
  get progressiveRender() { return progressiveRender; },
  get lifecycle() { return lifecycle; },
  get filtering() { return filtering; },
  get predictionEligibility() { return predictionEligibility; },
});
const { historyWrapperRef, filterStickyRef, registerFilterBarElement, listRef, currentActiveId, historyContainer, handleHistoryManualScrollIntent, handleHistoryPointerIntent, jumpToEventById, scrollTo } = navigation;

const previewLayout = useHistoryPreviewLayout({
  get navigation() { return navigation; },
  get predictionEditor() { return predictionEditor; },
  get previewSelections() { return previewSelections; },
  get previewPanels() { return previewPanels; },
});
const { previewFloatingCollapsed, previewConfigBodyCollapsed, isPreviewCharSelectExpanded, togglePreviewCharSelectExpanded, previewConfigPanelStyle, startDragPreviewConfig, startDragPreviewConfigTouch, resetPreviewPanelLayout, bringPreviewConfigToFront, bringPreviewPanelToFront, isPreviewPanelCollapsed, togglePreviewPanelCollapsed, getPreviewPanelStyle, getPreviewStepsStyle, startDragPreview, startDragPreviewTouch, startResizePreview, startResizePreviewTouch } = previewLayout;

const previewSelections = useHistoryPreviewSelections({
  props,
  get predictionEditor() { return predictionEditor; },
  get formatting() { return formatting; },
  get previewCutoff() { return previewCutoff; },
  get previewLayout() { return previewLayout; },
});
const { PREVIEW_FESTIVAL_TYPES, CHAR_MAP, selectedPreviewPanelIds, selectedPreviewAttrChars, selectedPreviewDailyLineupChars, selectedPreviewCharAttrChars, previewIncludeCollabReward, previewThreeUseRewardCount, previewTwoUseRewardCount, previewIncludeUnitScoreInPureScore, previewFestivalMergeHigherRanks, selectedPreviewFestival, previewFestivalFesToggles, previewSelectableChars, togglePreviewAttrChar, clearPreviewAttrChars, togglePreviewDailyLineupChar, clearPreviewDailyLineupChars, togglePreviewCharAttrChar, clearPreviewCharAttrChars, canAppendCurrentLineupToPreviewAttr, appendPreviewAttrCharsFromCurrentLineup, canAppendCurrentLineupToPreviewDailyLineup, appendPreviewDailyLineupCharsFromCurrentLineup, canAppendCurrentLineupToPreviewCharAttr, appendPreviewCharAttrCharsFromCurrentLineup, handlePredictSelectionChange, setSelectedPreviewFestival, cyclePreviewLimitedBanEventTypeFilter, cyclePreviewBannerEventTypeFilter, previewLimitedBanFilterButtonText, previewLimitedBanFilterButtonTitle, previewBannerFilterButtonText, previewBannerFilterButtonTitle, previewPanelOptions, togglePreviewPanelType } = previewSelections;

const festivalPreview = useHistoryFestivalPreview({
  props,
  get presentation() { return presentation; },
  get previewSelections() { return previewSelections; },
  get previewCutoff() { return previewCutoff; },
  get formatting() { return formatting; },
});

const eventOrdering = useHistoryEventOrdering({
  props,
  get formatting() { return formatting; },
  get sourceDates() { return sourceDates; },
  get previewSelections() { return previewSelections; },
  get predictionEditor() { return predictionEditor; },
});
const { getBoxTurnInRound, currentEditingBoxLockedUnits } = eventOrdering;

const previewCutoff = useHistoryPreviewCutoff({
  props,
  get formatting() { return formatting; },
  get predictionEditor() { return predictionEditor; },
  get predictionEligibility() { return predictionEligibility; },
  get eventOrdering() { return eventOrdering; },
  get previewSelections() { return previewSelections; },
  get sourceDates() { return sourceDates; },
});
const { activePreviewFestivalName } = previewCutoff;

const vsPreview = useHistoryVsPreview({
  props,
  get previewSelections() { return previewSelections; },
  get previewCutoff() { return previewCutoff; },
  get formatting() { return formatting; },
  get sourceDates() { return sourceDates; },
});
const { PREVIEW_VS_NAMES, previewVsLastFourUnitRows, previewVsUnitFourCountUnitRows, previewVsUnitScoreUnitRows, previewVsOriginalRows, getPreviewVsMiniDataCellStyle, getPreviewVsFourCountCellStyle } = vsPreview;

const previewStatistics = useHistoryPreviewStatistics({
  props,
  get previewSelections() { return previewSelections; },
  get formatting() { return formatting; },
  get previewCutoff() { return previewCutoff; },
  get presentation() { return presentation; },
  get predictionEditor() { return predictionEditor; },
});
const { previewAttrFiveSummaryRows, previewAttrFiveRows, getPreviewAttrRowStyle } = previewStatistics;

const dailyLineup = useHistoryDailyLineup({
  props,
  get previewSelections() { return previewSelections; },
  get previewCutoff() { return previewCutoff; },
  get predictionEditor() { return predictionEditor; },
  get presentation() { return presentation; },
  get formatting() { return formatting; },
});
const { previewDailyLineupRows, getPreviewDailyPlanStyle, getPreviewDailyCardStyle, getPreviewDailyScoreCellClass } = dailyLineup;

const characterAttributePreview = useHistoryCharacterAttributePreview({
  get previewSelections() { return previewSelections; },
  get previewCutoff() { return previewCutoff; },
  get formatting() { return formatting; },
  get presentation() { return presentation; },
});
const { previewCharAttrRows, getPreviewCharAttrCardStyle, getPreviewCharAttrRowStyle } = characterAttributePreview;

const previewPanels = useHistoryPreviewPanels({
  get predictionEditor() { return predictionEditor; },
  get previewSelections() { return previewSelections; },
  get previewStatistics() { return previewStatistics; },
  get previewCutoff() { return previewCutoff; },
  get festivalPreview() { return festivalPreview; },
});
const { previewFloatingPanels } = previewPanels;

const progressiveRender = useHistoryProgressiveRender({
  props,
  get rows() { return rows; },
  get formatting() { return formatting; },
  get navigation() { return navigation; },
  get tooltips() { return tooltips; },
  get viewport() { return viewport; },
  get captureRange() { return captureRange; },
  get lifecycle() { return lifecycle; },
  get presentation() { return presentation; },
});
const { isFullEventRenderMode, setFullEventRenderMode, shouldRenderEventHeavy, getEventPlaceholderMemberCount, getEventPlaceholderVsCount } = progressiveRender;

const viewport = useHistoryViewport({
  get navigation() { return navigation; },
  get lifecycle() { return lifecycle; },
  get progressiveRender() { return progressiveRender; },
  get formatting() { return formatting; },
  get filtering() { return filtering; },
});
const { handleHistoryScroll, saveHistoryScrollSnapshot, toggleBirthdayRowsVisibility, togglePreviewRowsVisibility, toggleCollabPoolsVisibility } = viewport;

const filterLayout = useHistoryFilterLayout({
  get predictionEditor() { return predictionEditor; },
  get navigation() { return navigation; },
  get lifecycle() { return lifecycle; },
  get previewLayout() { return previewLayout; },
  get filtering() { return filtering; },
});
const { isCompactFilterBar, isBottomPredictEditorMode, isEditorFilterTight, isEditorFilterMobile } = filterLayout;

const lifecycle = useHistoryLifecycle({
  emit,
  get progressiveRender() { return progressiveRender; },
  get clock() { return clock; },
  get rows() { return rows; },
  get previewLayout() { return previewLayout; },
  get tooltips() { return tooltips; },
  get filterLayout() { return filterLayout; },
  get viewport() { return viewport; },
  get navigation() { return navigation; },
  get predictionEditor() { return predictionEditor; },
});

const captureRange = useHistoryCaptureRange({
  get navigation() { return navigation; },
});
const { getPredictedExportRangeInfo } = captureRange;

const captureAssets = useHistoryCaptureAssets({
  get navigation() { return navigation; },
  get capturePolicy() { return capturePolicy; },
});

const capturePolicy = useHistoryCapturePolicy({

});

const capture = useHistoryCapture({
  get captureRange() { return captureRange; },
  get navigation() { return navigation; },
  get progressiveRender() { return progressiveRender; },
  get capturePolicy() { return capturePolicy; },
  get captureAssets() { return captureAssets; },
});
const { exportPredictedRangePng } = capture;

const presentation = useHistoryPresentation({
  props,
  get formatting() { return formatting; },
  get previewSelections() { return previewSelections; },
});
const { UNIT_COLORS, translateType, translateSkill, translateAttr, getCharAbbr, getUnitColor, getCharColor, isVirtualSinger, isUnitRelated, isSpecialFestival, getNormalCards, getFesCards, getFesType, getMemberRibbonLabel, getTypeTagStyle, formatSeries, formatSeriesCompact, getEditorSeriesStyle, parseVS, getFestivalPreviewUnitLogo } = presentation;

const cardMedia = useHistoryCardMedia({
  props,
  get clock() { return clock; },
  get formatting() { return formatting; },
  get tooltips() { return tooltips; },
  get songMedia() { return songMedia; },
});
const { getBirthdayCardImageSrc, isBirthdayCardImageFailed, onBirthdayCardImageError, onBirthdayCardImageLoad, getVisibleCardTooltipImageList, isCardTooltipImageFailed, onCardTooltipImageError } = cardMedia;

// Register watchers and lifecycle in source order after all feature state exists.
previewLayout.connectSyncPreviewCharSelectExpandedState();
previewSelections.watchSelectedPanels();
previewLayout.watchFloatingPanelLayout();
navigation.watchJumpRequests();
progressiveRender.initializeFullRenderPreference();
progressiveRender.watchDisplayRows();
filterLayout.watchEditorFilterLayout();
lifecycle.registerMounted();
lifecycle.registerDeactivated();
lifecycle.registerActivated();
lifecycle.registerBeforeUnmount();

defineExpose({
  jumpToEventById,
  getPredictedExportRangeInfo,
  exportPredictedRangePng,
  saveHistoryScrollSnapshot,
  setFullEventRenderMode,
  isFullEventRenderMode
});
</script>

<style scoped src="../features/event-history/styles/eventHistoryFoundation.css"></style>
<style scoped src="../styles/scoped/media-load-shimmer.css"></style>
<style scoped src="../features/event-history/styles/eventHistoryContent.css"></style>
