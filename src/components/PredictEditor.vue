<template>
  <Teleport to="body">
    <UiSurfaceTransition kind="drawer" :edge="isMobileViewport ? 'bottom' : 'right'" appear>
      <div
        ref="drawerRef"
        v-show="isOpen"
        v-liquid-glass
        :data-ui-glass-defer-rebuild="isLayoutTransitioning ? 'true' : null"
        data-feature-view="predict-drawer" data-feature-page="prediction-editor" class="predict-drawer ui-liquid-glass ui-glass-optical-detail"
        :class="{
          'is-sheet-dragging': sheetDragState.dragging,
          'is-mobile-sheet': isMobileViewport,
          'ui-liquid-glass--prominent': isMobileViewport,
          'ui-liquid-glass--refractive': !isMobileViewport
        }"
        :style="drawerStyle"
      >
      <PredictionEditorHeader
  :isMobileViewport="isMobileViewport"
  :startSheetDragMouse="startSheetDragMouse"
  :startSheetDrag="startSheetDrag"
  :event="event"
  :isFixedRosterMode="isFixedRosterMode"
  :form="form"
  :applyGlobalAttr="applyGlobalAttr"
  :ATTRS="ATTRS"
  :getAttrLabel="getAttrLabel"
  :bannerCandidates="bannerCandidates"
  @close="emit('close')"
/>

      <PredictionEditorRoster
  :form="form"
  :fixedRosterTip="fixedRosterTip"
  :selectedRenderKey="selectedRenderKey"
  :shouldMarkBannerCard="shouldMarkBannerCard"
  :charMap="charMap"
  :VS_NAMES="VS_NAMES"
  :isVSUnitLocked="isVSUnitLocked"
  :UNITS="UNITS"
  :getDisplayUnit="getDisplayUnit"
  :isRarityLocked="isRarityLocked"
  :isAttrLocked="isAttrLocked"
  :isVsFesSkillMode="isVsFesSkillMode"
  :ACTIVE_FES_SKILL_KEY="ACTIVE_FES_SKILL_KEY"
  :ACTIVE_FES_SKILL_LABEL="ACTIVE_FES_SKILL_LABEL"
  :isSkillLocked="isSkillLocked"
  :isPScoreAvailable="isPScoreAvailable"
  :isUnitScoreLocked="isUnitScoreLocked"
  :isBfesSkillAvailable="isBfesSkillAvailable"
  :isFixedRosterCollabMode="isFixedRosterCollabMode"
/>

      <PredictionEditorCharacterPool
  :isFixedRosterMode="isFixedRosterMode"
  :charMap="charMap"
  :isCharInList="isCharInList"
  :getCharDisableReason="getCharDisableReason"
  :handlePoolItemMouseEnter="handlePoolItemMouseEnter"
  :handlePoolItemMouseLeave="handlePoolItemMouseLeave"
  :handlePoolItemClick="handlePoolItemClick"
  :shouldShowDisableReasonPopover="shouldShowDisableReasonPopover"
  :isFixedRosterCollabMode="isFixedRosterCollabMode"
/>

      <PredictionEditorFooter
  :submit="submit"
/>
      </div>
    </UiSurfaceTransition>
  </Teleport>
</template>

<script setup>
import UiSurfaceTransition from './ui/UiSurfaceTransition.vue';
import PredictionEditorHeader from '../features/prediction/PredictionEditorHeader.vue';
import PredictionEditorRoster from '../features/prediction/PredictionEditorRoster.vue';
import PredictionEditorCharacterPool from '../features/prediction/PredictionEditorCharacterPool.vue';
import PredictionEditorFooter from '../features/prediction/PredictionEditorFooter.vue';
import { usePredictionCharacterMetadata } from '../features/prediction/usePredictionCharacterMetadata.js';
import { usePredictionEditorSheet } from '../features/prediction/usePredictionEditorSheet.js';
import { usePredictionDisableReasonPopover } from '../features/prediction/usePredictionDisableReasonPopover.js';
import { usePredictionRosterRules } from '../features/prediction/usePredictionRosterRules.js';
import { usePredictionDraftBaseline } from '../features/prediction/usePredictionDraftBaseline.js';
import { usePredictionEditorInitialization } from '../features/prediction/usePredictionEditorInitialization.js';
import { usePredictionEditorLifecycle } from '../features/prediction/usePredictionEditorLifecycle.js';
import { usePredictionRuleSynchronization } from '../features/prediction/usePredictionRuleSynchronization.js';
import { usePredictionEditorActions } from '../features/prediction/usePredictionEditorActions.js';


import { reactive, inject, computed, ref } from "vue";


const props = defineProps({
  isOpen: { type: Boolean, default: false },
  isLayoutTransitioning: { type: Boolean, default: false },
  event: { type: Object, default: null },
  charMap: { type: Object, default: () => ({}) },
  boxLockedUnits: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] }
});
const emit = defineEmits(['close', 'selection-change']);
const savePredictEvent = inject('savePredictEvent');
const updateDraftPredictEvent = inject('updateDraftPredictEvent', null);
const drawerRef = ref(null);

const { ATTRS, ATTR_LABELS, UNITS, BOX_UNITS, FES_FESTIVALS, FES_SKILL_CONFIG, ACTIVE_FES_SKILL, ACTIVE_FES_SKILL_KEY, ACTIVE_FES_SKILL_LABEL, VS_NAMES, CHAR_UNIT_MAP, replaceObject, replaceArray, applyCharacterMetaSource } = usePredictionCharacterMetadata({
  get props() { return props; }
});

const form = reactive({
  eventType: '混活',
  gachaType: 'perm',
  predictAttr: '',
  bannerName: '',
  selectedChars: [],
  isGachaLocked: false,
  isTypeLocked: false
});

const isWorldLinkTeamSeries = (eventLike) => {
  const type = String(eventLike?.event_type || eventLike?.source_event_type || '').trim();
  if (type !== 'World Link') return false;
  const sid = Number(eventLike?.type_series_id);
  return Number.isFinite(sid) && sid > 0 && sid <= 3;
};

const { MOBILE_BREAKPOINT, SHEET_MIN_VH, SHEET_MID_VH, SHEET_MAX_VH, isMobileViewport, sheetHeightVh, sheetDragState, clamp, setSheetDragStart, applySheetDragMove, moveSheetDragMouse, endSheetDragMouse, moveSheetDragTouch, endSheetDragTouch, detachSheetPointerListeners, attachSheetTouchListeners, updateMobileViewport, drawerStyle, endSheetDrag, startSheetDragMouse, startSheetDrag } = usePredictionEditorSheet({

});

const renderTick = ref(0);
const bumpRender = () => {
  renderTick.value += 1;
};

const selectedRenderKey = computed(() => form.selectedChars
  .map(c => `${c.name}|${c.rarity}|${c.skillType}|${c.selectedUnit}|${c.attr}`)
  .join('||') + `::${renderTick.value}`);

const { disableReasonPopoverName, disableReasonPopoverPinned, disableReasonHoverTimer, disableReasonAutoHideTimer, clearDisableReasonTimers, hideDisableReasonPopover, showDisableReasonPopover, shouldShowDisableReasonPopover, handlePoolItemMouseEnter, handlePoolItemMouseLeave, handlePoolItemClick } = usePredictionDisableReasonPopover({
  get getCharDisableReason() { return getCharDisableReason; },
  get isCharInList() { return isCharInList; },
  get toggleChar() { return toggleChar; }
});

const { isWorldLinkMode, isFixedRosterCollabMode, isFixedRosterMode, fixedRosterTip, isWorldLinkFinalChapter, normalizedBoxLockedUnits, isApplyingRules, getOCUnit, isUnitLockedInCurrentRound, isFesFestival, isBfesSkillAvailable, isPScoreAvailable, isVsFesSkillMode, isActiveFesSkill, isFesSkillTag, isBannerEligibleChar, bannerCandidates, activeBannerName, syncBannerName, shouldMarkBannerCard, getBannerUnit, getDisplayUnit, isVSUnitLocked, isBfesLocked, isForcedBfesInBox, isBfesVsUnitLocked, isUnitScoreLocked, isConfirmedSkillLocked, isSkillLocked, isRarityLocked, isAttrLocked, isCharSelectable, getCharDisableReason, clearInvalidBoxBanner, applyBoxPoolRestriction, applyGlobalAttrToFourStars, applyFesRules, applyAutoSkillRules, lockVSUnitToBanner, applyAllRules } = usePredictionRosterRules({
  get form() { return form; },
  get isWorldLinkTeamSeries() { return isWorldLinkTeamSeries; },
  get props() { return props; },
  get BOX_UNITS() { return BOX_UNITS; },
  get CHAR_UNIT_MAP() { return CHAR_UNIT_MAP; },
  get FES_FESTIVALS() { return FES_FESTIVALS; },
  get ACTIVE_FES_SKILL_KEY() { return ACTIVE_FES_SKILL_KEY; },
  get VS_NAMES() { return VS_NAMES; },
  get bumpRender() { return bumpRender; }
});

const { normalizePredictionAttribute, getAttrLabel, initialPredictionSnapshot, serializePredictionForm, capturePredictionBaseline, hasUnsavedChanges } = usePredictionDraftBaseline({
  get ATTR_LABELS() { return ATTR_LABELS; },
  get form() { return form; },
  get props() { return props; }
});

usePredictionEditorInitialization({
  get props() { return props; },
  get isWorldLinkTeamSeries() { return isWorldLinkTeamSeries; },
  get form() { return form; },
  get normalizePredictionAttribute() { return normalizePredictionAttribute; },
  get isFixedRosterMode() { return isFixedRosterMode; },
  get applyAllRules() { return applyAllRules; },
  get capturePredictionBaseline() { return capturePredictionBaseline; }
});

const { setDrawerPageVisibility } = usePredictionEditorLifecycle({
  get props() { return props; },
  get isMobileViewport() { return isMobileViewport; },
  get sheetHeightVh() { return sheetHeightVh; },
  get SHEET_MID_VH() { return SHEET_MID_VH; },
  get updateMobileViewport() { return updateMobileViewport; },
  get drawerRef() { return drawerRef; },
  get clearDisableReasonTimers() { return clearDisableReasonTimers; },
  get disableReasonPopoverName() { return disableReasonPopoverName; },
  get hideDisableReasonPopover() { return hideDisableReasonPopover; },
  get endSheetDrag() { return endSheetDrag; },
  get detachSheetPointerListeners() { return detachSheetPointerListeners; }
});

usePredictionRuleSynchronization({
  get form() { return form; },
  get applyAllRules() { return applyAllRules; },
  get normalizedBoxLockedUnits() { return normalizedBoxLockedUnits; },
  get syncBannerName() { return syncBannerName; },
  get props() { return props; },
  get emit() { return emit; }
});

const { isCharInList, toggleChar, applyGlobalAttr, buildProcessedChars, buildPredictPayload, buildDraftPredictPayload, emitDraftPredictEvent, saveCurrentPrediction, submit, saveForEventSwitch, discardDraftForEventSwitch } = usePredictionEditorActions({
  get form() { return form; },
  get isFixedRosterMode() { return isFixedRosterMode; },
  get isCharSelectable() { return isCharSelectable; },
  get VS_NAMES() { return VS_NAMES; },
  get getBannerUnit() { return getBannerUnit; },
  get getOCUnit() { return getOCUnit; },
  get applyAllRules() { return applyAllRules; },
  get isVsFesSkillMode() { return isVsFesSkillMode; },
  get ACTIVE_FES_SKILL_KEY() { return ACTIVE_FES_SKILL_KEY; },
  get isBfesVsUnitLocked() { return isBfesVsUnitLocked; },
  get props() { return props; },
  get activeBannerName() { return activeBannerName; },
  get updateDraftPredictEvent() { return updateDraftPredictEvent; },
  get savePredictEvent() { return savePredictEvent; },
  get capturePredictionBaseline() { return capturePredictionBaseline; },
  get emit() { return emit; }
});

defineExpose({
  hasUnsavedChanges,
  saveForEventSwitch,
  discardDraftForEventSwitch
});
</script>

<style scoped src="../features/prediction/styles/predictionEditor.css"></style>
