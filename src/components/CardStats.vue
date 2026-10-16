<template>
  <div ref="cardStatsRootRef" class="pjsk-stats" :class="{ 'matrix-sort-anchor-suppressed': suppressMatrixViewportAnchor }">
    <div class="stats-layout" :class="{ 'nav-collapsed': navCollapsed, 'mobile-nav-overlay': isNavTopLayout, 'mobile-nav-open': !navCollapsed }">
      <button
        v-if="navCollapsed"
        v-liquid-glass
        class="pjsk-ui-action floating-menu-btn export-hide ui-liquid-glass ui-liquid-glass--prominent ui-glass-optical-detail"
        title="展开统计菜单"
        @click="setNavCollapsed(false)"
      >
        <img src="/data/icon/menu.png" class="floating-menu-icon" alt="菜单" />
      </button>
      <CardStatsNavigation
          :isNavTopLayout="isNavTopLayout"
          :navCollapsed="navCollapsed"
          :setNavCollapsed="setNavCollapsed"
          :isMiniFloatingNav="isMiniFloatingNav"
          :safeMaxEventId="safeMaxEventId"
          :adjustDisplayEventId="adjustDisplayEventId"
          v-model:displayEventIdDraft="displayEventIdDraft"
          :onDisplayEventIdFocus="onDisplayEventIdFocus"
          :onDisplayEventIdInput="onDisplayEventIdInput"
          :onDisplayEventIdBlur="onDisplayEventIdBlur"
          :resetTopBarDisplayEventId="resetTopBarDisplayEventId"
          :isMobileNav="isMobileNav"
          v-model:navNameFormat="navNameFormat"
          v-model:navCardImageMode="navCardImageMode"
          :navGroups="navGroups"
          :isGroupActive="isGroupActive"
          :handleParentNavClick="handleParentNavClick"
          :isGroupExpanded="isGroupExpanded"
          :activeNavId="activeNavId"
          :handleChildNavClick="handleChildNavClick"
        />

      <div class="stats-main">
        <div class="stats-main-head">
          <h1>角色卡片统计</h1>
        </div>

        <CardDistributionPanel
          :showDesktopNameControls="showDesktopNameControls"
          v-model:hideDistCharNames="hideDistCharNames"
          :includeVsInDistUnitSummary="includeVsInDistUnitSummary"
          :includeVsInDistUnitSummaryIndeterminate="includeVsInDistUnitSummaryIndeterminate"
          :onIncludeVsInDistUnitSummaryChange="onIncludeVsInDistUnitSummaryChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :groupPanels="groupPanels"
          :distVsUnitSummaryToggles="distVsUnitSummaryToggles"
          v-model:limitedIncludeWl3="limitedIncludeWl3"
          :isMobileNav="isMobileNav"
          v-model:limitedIncludeSongLimited="limitedIncludeSongLimited"
          v-model:includeCollabRewardCards="includeCollabRewardCards"
          v-model:useRewardCountForThreeStar="useRewardCountForThreeStar"
          v-model:useRewardCountForTwoStar="useRewardCountForTwoStar"
          :includeUnitScoreInPureScore="includeUnitScoreInPureScore"
          :onIncludeUnitScoreInPureScoreChange="onIncludeUnitScoreInPureScoreChange"
          v-model:fesLimitedIncludeFes="fesLimitedIncludeFes"
          :limitedBanEventTypeFilter="limitedBanEventTypeFilter"
          :setLimitedBanEventTypeFilter="setLimitedBanEventTypeFilter"
          :bannerEventTypeFilter="bannerEventTypeFilter"
          :setBannerEventTypeFilter="setBannerEventTypeFilter"
          :fesLimitedBanEventTypeFilter="fesLimitedBanEventTypeFilter"
          :setFesLimitedBanEventTypeFilter="setFesLimitedBanEventTypeFilter"
          :getCharAbbr="getCharAbbr"
          :getStepFestivalAvatarStyle="getStepFestivalAvatarStyle"
          :getDistNameLabel="getDistNameLabel"
          :getDistUnitSummaryChipStyle="getDistUnitSummaryChipStyle"
          :unitLogoMap="unitLogoMap"
        />

        <CardFestivalPanel
          v-model:festivalShowCardImages="festivalShowCardImages"
          :showDesktopNameControls="showDesktopNameControls"
          v-model:hideFestivalCharNames="hideFestivalCharNames"
          :festivalMergeHigherRanks="festivalMergeHigherRanks"
          :festivalMergeHigherRanksIndeterminate="festivalMergeHigherRanksIndeterminate"
          :onFestivalMergeHigherRanksChange="onFestivalMergeHigherRanksChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :festivalCharStats="festivalCharStats"
          :festivalMergeToggles="festivalMergeToggles"
          :canToggleFestivalFes="canToggleFestivalFes"
          :festivalFesEnabled="festivalFesEnabled"
          :festivalFesEnabledIndeterminate="festivalFesEnabledIndeterminate"
          :onFestivalFesEnabledChange="onFestivalFesEnabledChange"
          :getFestivalTierCount="getFestivalTierCount"
          :getFestivalTierIcon="getFestivalTierIcon"
          :getCharAbbr="getCharAbbr"
          :getStepFestivalAvatarStyle="getStepFestivalAvatarStyle"
          :getFestivalUnitLogoByName="getFestivalUnitLogoByName"
          :getFestivalDisplayNameLabel="getFestivalDisplayNameLabel"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
        />

        <CardRelatedRecordsPanel
          :intervalPanelShowCardImagesAll="intervalPanelShowCardImagesAll"
          :intervalPanelShowCardImagesIndeterminate="intervalPanelShowCardImagesIndeterminate"
          :onIntervalPanelShowAllCardImagesChange="onIntervalPanelShowAllCardImagesChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :relatedLastRecordShowCardImages="relatedLastRecordShowCardImages"
          :onRelatedLastRecordShowCardImagesChange="onRelatedLastRecordShowCardImagesChange"
          :lastFourStarDisplayRecords="lastFourStarDisplayRecords"
          :getRecordTint="getRecordTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          v-model:limitedIncludeWl3="limitedIncludeWl3"
          :isMobileNav="isMobileNav"
          v-model:limitedIncludeSongLimited="limitedIncludeSongLimited"
          :lastLimitedDisplayRecords="lastLimitedDisplayRecords"
          :intervalFourShowCardImages="intervalFourShowCardImages"
          :onIntervalFourShowCardImagesChange="onIntervalFourShowCardImagesChange"
          :fourStarLongestDisplayRecords="fourStarLongestDisplayRecords"
          :formatGapValue="formatGapValue"
          :fourStarShortestDisplayRecords="fourStarShortestDisplayRecords"
          :intervalLimitedShowCardImages="intervalLimitedShowCardImages"
          :onIntervalLimitedShowCardImagesChange="onIntervalLimitedShowCardImagesChange"
          :limitedLongestDisplayRecords="limitedLongestDisplayRecords"
          :limitedShortestDisplayRecords="limitedShortestDisplayRecords"
          :intervalBanShowCardImages="intervalBanShowCardImages"
          :onIntervalBanShowCardImagesChange="onIntervalBanShowCardImagesChange"
          :banEventTypeFilter="banEventTypeFilter"
          :setBanEventTypeFilter="setBanEventTypeFilter"
          :banLongestDisplayRecords="banLongestDisplayRecords"
          :banShortestDisplayRecords="banShortestDisplayRecords"
        />

        <CardDuoPanel
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :DUO_FILTER_OPTIONS="DUO_FILTER_OPTIONS"
          :isDuoUnitGlobalFilterChecked="isDuoUnitGlobalFilterChecked"
          :isDuoUnitGlobalFilterIndeterminate="isDuoUnitGlobalFilterIndeterminate"
          :onDuoFilterChange="onDuoFilterChange"
          :duoLastPoolShowCardImagesAll="duoLastPoolShowCardImagesAll"
          :duoLastPoolShowCardImagesIndeterminate="duoLastPoolShowCardImagesIndeterminate"
          :onDuoLastPoolShowCardImagesChange="onDuoLastPoolShowCardImagesChange"
          :duoUnitRows="duoUnitRows"
          :getUnitAccentColor="getUnitAccentColor"
          :unitLogoMap="unitLogoMap"
          :onDuoUnitFilterChange="onDuoUnitFilterChange"
          :getDuoHeadCellStyle="getDuoHeadCellStyle"
          :getDuoMatrixCellClass="getDuoMatrixCellClass"
          :getDuoMatrixCellStyle="getDuoMatrixCellStyle"
          :formatDuoCount="formatDuoCount"
          :onDuoUnitLastPoolShowCardImagesChange="onDuoUnitLastPoolShowCardImagesChange"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          :duoPoolFilters="duoPoolFilters"
          :duoPoolMatrix="duoPoolMatrix"
          :duoEventFilters="duoEventFilters"
          :duoEventMatrix="duoEventMatrix"
        />

        <CardSpecialRecordsPanel
          :specialPanelShowCardImagesAll="specialPanelShowCardImagesAll"
          :specialPanelShowCardImagesIndeterminate="specialPanelShowCardImagesIndeterminate"
          :onSpecialPanelShowAllCardImagesChange="onSpecialPanelShowAllCardImagesChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :vsUnitLastFourCompact="vsUnitLastFourCompact"
          :onVsUnitLastFourCompactChange="onVsUnitLastFourCompactChange"
          :vsUnitLastFourShowCardImages="vsUnitLastFourShowCardImages"
          :onVsUnitLastFourShowCardImagesChange="onVsUnitLastFourShowCardImagesChange"
          :vsUnitLastFourSort="vsUnitLastFourSort"
          :onToggleVsUnitLastFourSort="onToggleVsUnitLastFourSort"
          :vsUnitLastFourSortLabel="vsUnitLastFourSortLabel"
          :vsUnitLastFourDisplayRecords="vsUnitLastFourDisplayRecords"
          :getRecordTint="getRecordTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :getVsUnitLogoByKey="getVsUnitLogoByKey"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          :VS_NAMES="VS_NAMES"
          :getVsMiniVsHeadStyle="getVsMiniVsHeadStyle"
          :vsUnitLastFourCompactUnitRows="vsUnitLastFourCompactUnitRows"
          :getVsMiniUnitHeadStyle="getVsMiniUnitHeadStyle"
          :unitLogoMap="unitLogoMap"
          :getVsMiniDataCellStyle="getVsMiniDataCellStyle"
          :vsUnitFourCountCompact="vsUnitFourCountCompact"
          :onVsUnitFourCountCompactChange="onVsUnitFourCountCompactChange"
          :vsUnitFourCountShowCardImages="vsUnitFourCountShowCardImages"
          :onVsUnitFourCountShowCardImagesChange="onVsUnitFourCountShowCardImagesChange"
          :vsUnitFourCountSort="vsUnitFourCountSort"
          :onToggleVsUnitFourCountSort="onToggleVsUnitFourCountSort"
          :vsUnitFourCountSortLabel="vsUnitFourCountSortLabel"
          :vsUnitFourCountDisplayRecords="vsUnitFourCountDisplayRecords"
          :getVsUnitVariantAvatarSrc="getVsUnitVariantAvatarSrc"
          :onVsUnitVariantAvatarError="onVsUnitVariantAvatarError"
          :getVsScoreVsHeadStyle="getVsScoreVsHeadStyle"
          :vsUnitFourCountRows="vsUnitFourCountRows"
          :getVsScoreUnitHeadStyle="getVsScoreUnitHeadStyle"
          :getVsFourCountMiniCellClass="getVsFourCountMiniCellClass"
          :getVsScoreCellStyle="getVsScoreCellStyle"
          :vsUnitScoreShowCardImages="vsUnitScoreShowCardImages"
          :onVsUnitScoreShowCardImagesChange="onVsUnitScoreShowCardImagesChange"
          :vsUnitScoreAttrByUnitRows="vsUnitScoreAttrByUnitRows"
          :vsOriginalStatShowCardImages="vsOriginalStatShowCardImages"
          :onVsOriginalStatShowCardImagesChange="onVsOriginalStatShowCardImagesChange"
          :vsOriginalStatRows="vsOriginalStatRows"
          :getVsOriginalStatCellStyle="getVsOriginalStatCellStyle"
          :getVsOriginalOtherRowCards="getVsOriginalOtherRowCards"
          :getVsOriginalOtherRowAttrs="getVsOriginalOtherRowAttrs"
          :fesRecordShowCardImages="fesRecordShowCardImages"
          :onFesRecordShowCardImagesChange="onFesRecordShowCardImagesChange"
          :getFesMatrixAttrHeadStyle="getFesMatrixAttrHeadStyle"
          :RELATED_FES_UNITS="RELATED_FES_UNITS"
          :getFesMatrixUnitHeadStyle="getFesMatrixUnitHeadStyle"
          :getFesMatrixCellStyle="getFesMatrixCellStyle"
          :cfesRecordMatrix="cfesRecordMatrix"
          :getFesMatrixUnitStripCellStyle="getFesMatrixUnitStripCellStyle"
          :getFesMatrixTotalCellStyle="getFesMatrixTotalCellStyle"
          :getFesMatrixTotalChipStyle="getFesMatrixTotalChipStyle"
          :bfesRecordMatrix="bfesRecordMatrix"
          :specialLimitedShowCardImages="specialLimitedShowCardImages"
          :onSpecialLimitedShowCardImagesChange="onSpecialLimitedShowCardImagesChange"
          :specialLimitedHasDoubleCfes="specialLimitedHasDoubleCfes"
          :specialLimitedUnitGroups="specialLimitedUnitGroups"
          :hasSpecialLimitedDoubleCfes="hasSpecialLimitedDoubleCfes"
          :specialLimitedRows="specialLimitedRows"
          :specialLimitedMatrix="specialLimitedMatrix"
          :getCharSingleMark="getCharSingleMark"
        />

        <CardLineupPanel
          :lineupShowCardImages="lineupShowCardImages"
          :onLineupShowCardImagesChange="onLineupShowCardImagesChange"
          :toggleLineupExpandedAll="toggleLineupExpandedAll"
          :getLineupGlobalToggleLabel="getLineupGlobalToggleLabel"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :characterLineupRows="characterLineupRows"
          :getLineupCardId="getLineupCardId"
          :getCharColor="getCharColor"
          :getMatrixUnitColor="getMatrixUnitColor"
          :getRecordTint="getRecordTint"
          :getCharAbbr="getCharAbbr"
          :ATTR_LABELS="ATTR_LABELS"
          :toggleLineupExpanded="toggleLineupExpanded"
          :getLineupToggleLabel="getLineupToggleLabel"
          :getLineupRowStyle="getLineupRowStyle"
          :getLineupMemberCellStyle="getLineupMemberCellStyle"
          :getLineupSlotCardImageSrc="getLineupSlotCardImageSrc"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          :isLineupExpanded="isLineupExpanded"
        />

        <CardSupportPanel
          :supportShowCardImages="supportShowCardImages"
          :onSupportShowCardImagesChange="onSupportShowCardImagesChange"
          :supportEnableWlLineup="supportEnableWlLineup"
          :onSupportEnableWlLineupChange="onSupportEnableWlLineupChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :supportLineupRows="supportLineupRows"
          :getSupportCardId="getSupportCardId"
          :getUnitAccentColor="getUnitAccentColor"
          :hexToRgba="hexToRgba"
          :supportUnitTitleLogoMap="supportUnitTitleLogoMap"
          :unitLogoMap="unitLogoMap"
          :supportUseOriginalVsTeam="supportUseOriginalVsTeam"
          :onSupportUseOriginalVsTeamChange="onSupportUseOriginalVsTeamChange"
          :getLineupRowStyle="getLineupRowStyle"
          :isSupportAttrIcon="isSupportAttrIcon"
          :ATTR_LABELS="ATTR_LABELS"
          :getLineupMemberCellStyle="getLineupMemberCellStyle"
          :getLineupSlotCardImageSrc="getLineupSlotCardImageSrc"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :SUPPORT_WL_ATTR="SUPPORT_WL_ATTR"
          :getSupportMemberIconKey="getSupportMemberIconKey"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          :formatSupportTotal="formatSupportTotal"
        />
        
        <CardAttributeSummaryPanel
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :attrSummaryCards="attrSummaryCards"
          :getCharTint="getCharTint"
          :getMatrixUnitColor="getMatrixUnitColor"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :getAttrSummaryAttrRowStyle="getAttrSummaryAttrRowStyle"
          :ATTR_LABELS="ATTR_LABELS"
        />

        <CardYearStatsPanel
          :yearPanels="yearPanels"
          :yearRarityOptions="yearRarityOptions"
          :yearCardTypeOptions="yearCardTypeOptions"
          v-model:yearRarities="yearRarities"
          v-model:yearCardTypes="yearCardTypes"
          v-model:yearShowCardImages="yearShowCardImages"
          v-model:yearShowCardDates="yearShowCardDates"
          v-model:yearUseOperatingYear="yearUseOperatingYear"
          v-model:yearNewYearNextYear="yearNewYearNextYear"
          :includeVsInYearUnitSummary="includeVsInYearUnitSummary"
          :includeVsInYearUnitSummaryIndeterminate="includeVsInYearUnitSummaryIndeterminate"
          :onIncludeVsInYearUnitSummaryChange="onIncludeVsInYearUnitSummaryChange"
          :onYearVsUnitSummaryChange="onYearVsUnitSummaryChange"
          :getDistUnitSummaryChipStyle="getDistUnitSummaryChipStyle"
          :unitLogoMap="unitLogoMap"
          v-model:hideYearCharNames="hideYearCharNames"
          :showDesktopNameControls="showDesktopNameControls"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :getCharAbbr="getCharAbbr"
          :getStepFestivalAvatarStyle="getStepFestivalAvatarStyle"
          :getDistNameLabel="getDistNameLabel"
          :getCharTint="getCharTint"
          :buildCardImageSrc="buildCardImageSrc"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTR_LABELS="ATTR_LABELS"
        />

        <CharacterCardAttributeMatrixPanel
          :includeUnitScoreInPureScore="includeUnitScoreInPureScore"
          :onIncludeUnitScoreInPureScoreChange="onIncludeUnitScoreInPureScoreChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :ATTRS="ATTRS"
          :matrixGroupClass="matrixGroupClass"
          :toggleMatrixSort="toggleMatrixSort"
          :ATTR_LABELS="ATTR_LABELS"
          :getMatrixSortIconSrc="getMatrixSortIconSrc"
          :attrMatrixRows="attrMatrixRows"
          :getMatrixUnitFrameClass="getMatrixUnitFrameClass"
          :getCharTint="getCharTint"
          :getMatrixUnitColor="getMatrixUnitColor"
          :getUnitMatrixTint="getUnitMatrixTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :getAttrExtremeClass="getAttrExtremeClass"
          :attrMatrixTotalRow="attrMatrixTotalRow"
        />

        <AffiliatedVsCardAttributeMatrixPanel
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :ATTRS="ATTRS"
          :matrixGroupClass="matrixGroupClass"
          :toggleMatrixSort="toggleMatrixSort"
          :ATTR_LABELS="ATTR_LABELS"
          :getMatrixSortIconSrc="getMatrixSortIconSrc"
          :virtualSingerMatrixRows="virtualSingerMatrixRows"
          :getMatrixUnitFrameClass="getMatrixUnitFrameClass"
          :getCharTint="getCharTint"
          :getMatrixUnitColor="getMatrixUnitColor"
          :getUnitMatrixTint="getUnitMatrixTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :getVsUnitLogoByKey="getVsUnitLogoByKey"
          :parseVsMatrixRowName="parseVsMatrixRowName"
          :getVsMatrixValueClass="getVsMatrixValueClass"
          :virtualSingerUnitTotalRows="virtualSingerUnitTotalRows"
          :getVsUnitTotalTint="getVsUnitTotalTint"
          :UNIT_COLORS="UNIT_COLORS"
          :unitLogoMap="unitLogoMap"
        />

        <NuigurumiStatsPanel
            :rows="nuigurumiRows"
            :are-character-names-hidden="nuigurumiHideCharNames"
            :is-card-image-mode="nuigurumiShowCardImages"
            :are-name-controls-visible="showDesktopNameControls"
            :are-character-names-visible="showNuigurumiCharNames"
            :is-exporting-png="isExportingPng"
            :get-nuigurumi-mobile-date-label="getNuigurumiMobileDateLabel"
            :get-nuigurumi-mobile-type-label="getNuigurumiMobileTypeLabel"
            :get-nuigurumi-date-cell-label="getNuigurumiDateCellLabel"
            :get-nuigurumi-type-label="getNuigurumiTypeLabel"
            :get-nuigurumi-member-label="getNuigurumiMemberLabel"
            :get-char-color="getCharColor"
            @change-hide-character-names="nuigurumiHideCharNames = $event.target.checked"
            @change-card-image-mode="nuigurumiShowCardImages = $event.target.checked"
            @export-panel="exportElementPng"
            @media-load="onMediaImageLoad"
            @media-error="onMediaImageError"
          />

      </div>
    </div>

    <CardCaptureStatus
          :screenshotModalVisible="screenshotModalVisible"
          :closeScreenshotModal="closeScreenshotModal"
          :screenshotModalState="screenshotModalState"
          :screenshotModalTitle="screenshotModalTitle"
          :forceCancelScreenshotExport="forceCancelScreenshotExport"
          :screenshotModalMessage="screenshotModalMessage"
          :isExportingPng="isExportingPng"
          :retryScreenshotExport="retryScreenshotExport"
        />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import NuigurumiStatsPanel from '../features/card-stats/NuigurumiStatsPanel.vue';
import CardDistributionPanel from '../features/card-stats/CardDistributionPanel.vue';
import CardFestivalPanel from '../features/card-stats/CardFestivalPanel.vue';
import CardRelatedRecordsPanel from '../features/card-stats/CardRelatedRecordsPanel.vue';
import CardDuoPanel from '../features/card-stats/CardDuoPanel.vue';
import CardSpecialRecordsPanel from '../features/card-stats/CardSpecialRecordsPanel.vue';
import CardLineupPanel from '../features/card-stats/CardLineupPanel.vue';
import CardSupportPanel from '../features/card-stats/CardSupportPanel.vue';
import CardAttributeSummaryPanel from '../features/card-stats/CardAttributeSummaryPanel.vue';
import CardYearStatsPanel from '../features/card-stats/CardYearStatsPanel.vue';
import CharacterCardAttributeMatrixPanel from '../features/card-stats/CharacterCardAttributeMatrixPanel.vue';
import AffiliatedVsCardAttributeMatrixPanel from '../features/card-stats/AffiliatedVsCardAttributeMatrixPanel.vue';
import CardStatsNavigation from '../features/card-stats/CardStatsNavigation.vue';
import CardCaptureStatus from '../features/card-stats/CardCaptureStatus.vue';
import { useCardConstants } from '../features/card-stats/useCardConstants.js';
import { useCardMetadata } from '../features/card-stats/useCardMetadata.js';
import { useCardNavigationCatalog } from '../features/card-stats/useCardNavigationCatalog.js';
import { useCardCutoff } from '../features/card-stats/useCardCutoff.js';
import { useCardNavigation } from '../features/card-stats/useCardNavigation.js';
import { useCardAttributeMatrices } from '../features/card-stats/useCardAttributeMatrices.js';
import { useCardVsRecords } from '../features/card-stats/useCardVsRecords.js';
import { useCardNuigurumi } from '../features/card-stats/useCardNuigurumi.js';
import { useCardDistribution } from '../features/card-stats/useCardDistribution.js';
import { useCardFestivals } from '../features/card-stats/useCardFestivals.js';
import { useCardPresentation } from '../features/card-stats/useCardPresentation.js';
import { useCardSupport } from '../features/card-stats/useCardSupport.js';
import { useCardLineup } from '../features/card-stats/useCardLineup.js';
import { useCardRelatedRecords } from '../features/card-stats/useCardRelatedRecords.js';
import { useCardFesRecords } from '../features/card-stats/useCardFesRecords.js';
import { useCardSpecialLimited } from '../features/card-stats/useCardSpecialLimited.js';
import { useCardDuo } from '../features/card-stats/useCardDuo.js';
import { useCardCaptureModal } from '../features/card-stats/useCardCaptureModal.js';
import { useCardResponsiveLayout } from '../features/card-stats/useCardResponsiveLayout.js';
import { useCardCaptureRendering } from '../features/card-stats/useCardCaptureRendering.js';
import { useCardAttributeSummary } from '../features/card-stats/useCardAttributeSummary.js';
import { useCardYearStats } from '../features/card-stats/useCardYearStats.js';
import { useCardCaptureExport } from '../features/card-stats/useCardCaptureExport.js';
import { useCardCaptureClone } from '../features/card-stats/useCardCaptureClone.js';
import { useCardEventCatalog } from '../features/card-stats/useCardEventCatalog.js';
import { useCardLineupRules } from '../features/card-stats/useCardLineupRules.js';
import { useCardEventLabels } from '../features/card-stats/useCardEventLabels.js';
import { useCardPanelControls } from '../features/card-stats/useCardPanelControls.js';
import { useCardPreview } from '../features/card-stats/useCardPreview.js';
import { useCardMedia } from '../features/card-stats/useCardMedia.js';
import { useCardEffects } from '../features/card-stats/useCardEffects.js';

const props = defineProps({
  allEvents: { type: Array, default: () => [] },
  allCards: { type: Array, default: () => [] },
  allBaseCards: { type: Array, default: () => [] },
  allSongs: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] },
  nuigurumiData: { type: Array, default: () => [] },
  jumpEventId: { type: [Number, String], default: null },
  previewSyncEventId: { type: [Number, String], default: null }
});
const emit = defineEmits(['jump-to-event', 'stats-preview-update', 'stats-top-state-change']);
const cardStatsRootRef = ref(null);

const constants = useCardConstants({

});

const metadata = useCardMetadata({
  get presentation() { return presentation; },
  props,
});

const navigationCatalog = useCardNavigationCatalog({
  get lineup() { return lineup; },
  get metadata() { return metadata; },
  get constants() { return constants; },
  get presentation() { return presentation; },
  get support() { return support; },
  get attributeSummary() { return attributeSummary; },
  get yearStats() { return yearStats; },
  get distribution() { return distribution; },
});

const cutoff = useCardCutoff({
  props,
  get eventCatalog() { return eventCatalog; },
  get navigation() { return navigation; },
  emit,
});

const navigation = useCardNavigation({
  emit,
  get navigationCatalog() { return navigationCatalog; },
  cardStatsRootRef,
  get responsiveLayout() { return responsiveLayout; },
});

const attributeMatrices = useCardAttributeMatrices({
  get navigation() { return navigation; },
  get metadata() { return metadata; },
  get distribution() { return distribution; },
  get constants() { return constants; },
  props,
  get eventCatalog() { return eventCatalog; },
  get presentation() { return presentation; },
});

const vsRecords = useCardVsRecords({
  get navigation() { return navigation; },
  get metadata() { return metadata; },
  get constants() { return constants; },
  get eventCatalog() { return eventCatalog; },
  get presentation() { return presentation; },
  props,
  get distribution() { return distribution; },
  get media() { return media; },
});

const nuigurumi = useCardNuigurumi({
  props,
  get metadata() { return metadata; },
  get presentation() { return presentation; },
  get navigation() { return navigation; },
  get eventCatalog() { return eventCatalog; },
  get constants() { return constants; },
  get media() { return media; },
});

const distribution = useCardDistribution({
  get navigation() { return navigation; },
  get eventCatalog() { return eventCatalog; },
  props,
  get presentation() { return presentation; },
  get metadata() { return metadata; },
  get constants() { return constants; },
  get navigationCatalog() { return navigationCatalog; },
});

const festivals = useCardFestivals({
  get metadata() { return metadata; },
  get constants() { return constants; },
  get presentation() { return presentation; },
  get navigation() { return navigation; },
  get eventCatalog() { return eventCatalog; },
  props,
  get distribution() { return distribution; },
  get media() { return media; },
});

const presentation = useCardPresentation({
  get constants() { return constants; },
  get metadata() { return metadata; },
  get eventCatalog() { return eventCatalog; },
  props,
  get navigation() { return navigation; },
});

const support = useCardSupport({
  get constants() { return constants; },
  get lineupRules() { return lineupRules; },
  get lineup() { return lineup; },
  get metadata() { return metadata; },
  get eventCatalog() { return eventCatalog; },
  props,
  get eventLabels() { return eventLabels; },
  get presentation() { return presentation; },
  get navigation() { return navigation; },
  get responsiveLayout() { return responsiveLayout; },
});

const lineup = useCardLineup({
  get lineupRules() { return lineupRules; },
  get eventCatalog() { return eventCatalog; },
  get constants() { return constants; },
  props,
  get metadata() { return metadata; },
  get eventLabels() { return eventLabels; },
  get presentation() { return presentation; },
  get navigation() { return navigation; },
  get responsiveLayout() { return responsiveLayout; },
});

const relatedRecords = useCardRelatedRecords({
  get presentation() { return presentation; },
  get navigation() { return navigation; },
  get panelControls() { return panelControls; },
  get eventCatalog() { return eventCatalog; },
  props,
  get metadata() { return metadata; },
  get distribution() { return distribution; },
  get constants() { return constants; },
  get media() { return media; },
  get vsRecords() { return vsRecords; },
});

const fesRecords = useCardFesRecords({
  get navigation() { return navigation; },
  get presentation() { return presentation; },
  get constants() { return constants; },
  get metadata() { return metadata; },
  get eventCatalog() { return eventCatalog; },
  props,
  get lineupRules() { return lineupRules; },
  get distribution() { return distribution; },
  get media() { return media; },
});

const specialLimited = useCardSpecialLimited({
  get navigation() { return navigation; },
  get constants() { return constants; },
  get metadata() { return metadata; },
  get presentation() { return presentation; },
  get eventCatalog() { return eventCatalog; },
  props,
  get distribution() { return distribution; },
  get media() { return media; },
});

const duo = useCardDuo({
  get eventCatalog() { return eventCatalog; },
  get presentation() { return presentation; },
  get constants() { return constants; },
  props,
  get metadata() { return metadata; },
  get relatedRecords() { return relatedRecords; },
  get navigation() { return navigation; },
  get navigationCatalog() { return navigationCatalog; },
  get panelControls() { return panelControls; },
});

const captureModal = useCardCaptureModal({
  get captureRendering() { return captureRendering; },
});

const responsiveLayout = useCardResponsiveLayout({
  cardStatsRootRef,
  get navigation() { return navigation; },
});

const captureRendering = useCardCaptureRendering({

});

const attributeSummary = useCardAttributeSummary({
  get eventCatalog() { return eventCatalog; },
  get presentation() { return presentation; },
  get metadata() { return metadata; },
  get distribution() { return distribution; },
  props,
  get constants() { return constants; },
});

const yearStats = useCardYearStats({
  props,
  get eventCatalog() { return eventCatalog; },
  get presentation() { return presentation; },
  get metadata() { return metadata; },
  get navigation() { return navigation; },
});

const captureExport = useCardCaptureExport({
  get media() { return media; },
  get captureRendering() { return captureRendering; },
  get captureModal() { return captureModal; },
  get captureClone() { return captureClone; },
});

const captureClone = useCardCaptureClone({
  cardStatsRootRef,
  get captureExport() { return captureExport; },
});

const eventCatalog = useCardEventCatalog({
  props,
  get presentation() { return presentation; },
  get cutoff() { return cutoff; },
  get constants() { return constants; },
});

const lineupRules = useCardLineupRules({
  get metadata() { return metadata; },
  get presentation() { return presentation; },
  get eventCatalog() { return eventCatalog; },
  get constants() { return constants; },
});

const eventLabels = useCardEventLabels({
  get presentation() { return presentation; },
  get eventCatalog() { return eventCatalog; },
  get constants() { return constants; },
  get metadata() { return metadata; },
});

const panelControls = useCardPanelControls({
  get vsRecords() { return vsRecords; },
  get fesRecords() { return fesRecords; },
  get specialLimited() { return specialLimited; },
  get navigation() { return navigation; },
});

const preview = useCardPreview({
  get lineup() { return lineup; },
  get distribution() { return distribution; },
  get festivals() { return festivals; },
  get eventCatalog() { return eventCatalog; },
});

const media = useCardMedia({
  props,
  cardStatsRootRef,
  get metadata() { return metadata; },
  get cutoff() { return cutoff; },
  get presentation() { return presentation; },
});

// Register original immediate/deep watchers only after every model is connected.
useCardEffects({
  props,
  metadata,
  cutoff,
  navigation,
  cardStatsRootRef,
  responsiveLayout,
  media,
  captureModal,
  attributeMatrices,
  preview,
  emit,
});

const { ATTRS, ATTR_LABELS, DUO_FILTER_OPTIONS, RELATED_FES_UNITS, supportUnitTitleLogoMap, SUPPORT_WL_ATTR } = constants;
const { getCharAbbr, unitLogoMap, getCharColor, VS_NAMES, UNIT_COLORS } = metadata;
const { navGroups, getRelatedRecordTitle } = navigationCatalog;
const { adjustDisplayEventId, displayEventIdDraft, onDisplayEventIdFocus, onDisplayEventIdInput, onDisplayEventIdBlur, resetTopBarDisplayEventId, getTopBarState, setTopBarDisplayEventIdDraft, applyTopBarDisplayEventId, adjustTopBarDisplayEventId, toggleTopBarNavCollapsed } = cutoff;
const { navCollapsed, isNavTopLayout, setNavCollapsed, isMiniFloatingNav, isMobileNav, isGroupActive, handleParentNavClick, isGroupExpanded, activeNavId, handleChildNavClick, showDesktopNameControls, jumpToHistoryByEventRef } = navigation;
const { suppressMatrixViewportAnchor, getAttrSummaryAttrRowStyle, matrixGroupClass, toggleMatrixSort, getMatrixSortIconSrc, attrMatrixRows, getMatrixUnitFrameClass, getAttrExtremeClass, attrMatrixTotalRow, virtualSingerMatrixRows, parseVsMatrixRowName, getVsMatrixValueClass, virtualSingerUnitTotalRows, getVsUnitTotalTint } = attributeMatrices;
const { vsUnitLastFourCompact, onVsUnitLastFourCompactChange, vsUnitLastFourShowCardImages, onVsUnitLastFourShowCardImagesChange, vsUnitLastFourSort, onToggleVsUnitLastFourSort, vsUnitLastFourSortLabel, getVsUnitLogoByKey, getVsMiniVsHeadStyle, vsUnitLastFourCompactUnitRows, getVsMiniUnitHeadStyle, getVsMiniDataCellStyle, vsUnitFourCountCompact, onVsUnitFourCountCompactChange, vsUnitFourCountShowCardImages, onVsUnitFourCountShowCardImagesChange, vsUnitFourCountSort, onToggleVsUnitFourCountSort, vsUnitFourCountSortLabel, vsUnitFourCountDisplayRecords, getVsUnitVariantAvatarSrc, onVsUnitVariantAvatarError, getVsScoreVsHeadStyle, vsUnitFourCountRows, getVsScoreUnitHeadStyle, getVsFourCountMiniCellClass, getVsScoreCellStyle, vsUnitScoreShowCardImages, onVsUnitScoreShowCardImagesChange, vsUnitScoreAttrByUnitRows, vsOriginalStatShowCardImages, onVsOriginalStatShowCardImagesChange, vsOriginalStatRows, getVsOriginalStatCellStyle, getVsOriginalOtherRowCards, getVsOriginalOtherRowAttrs } = vsRecords;
const { nuigurumiRows, nuigurumiHideCharNames, nuigurumiShowCardImages, showNuigurumiCharNames, getNuigurumiMobileDateLabel, getNuigurumiMobileTypeLabel, getNuigurumiDateCellLabel, getNuigurumiTypeLabel, getNuigurumiMemberLabel } = nuigurumi;
const { hideDistCharNames, includeVsInDistUnitSummary, includeVsInDistUnitSummaryIndeterminate, onIncludeVsInDistUnitSummaryChange, groupPanels, distVsUnitSummaryToggles, limitedIncludeWl3, limitedIncludeSongLimited, includeCollabRewardCards, useRewardCountForThreeStar, useRewardCountForTwoStar, includeUnitScoreInPureScore, onIncludeUnitScoreInPureScoreChange, fesLimitedIncludeFes, limitedBanEventTypeFilter, setLimitedBanEventTypeFilter, bannerEventTypeFilter, setBannerEventTypeFilter, fesLimitedBanEventTypeFilter, setFesLimitedBanEventTypeFilter, banEventTypeFilter, setBanEventTypeFilter } = distribution;
const { getStepFestivalAvatarStyle, festivalShowCardImages, hideFestivalCharNames, festivalMergeHigherRanks, festivalMergeHigherRanksIndeterminate, onFestivalMergeHigherRanksChange, festivalCharStats, festivalMergeToggles, canToggleFestivalFes, festivalFesEnabled, festivalFesEnabledIndeterminate, onFestivalFesEnabledChange, getFestivalTierCount, getFestivalTierIcon, getFestivalUnitLogoByName, getFestivalDisplayNameLabel } = festivals;
const { navNameFormat, navCardImageMode, getDistNameLabel, getDistUnitSummaryChipStyle, getRecordTint, formatGapValue, getUnitAccentColor, getCharSingleMark, getLineupCardId, getMatrixUnitColor, getSupportCardId, hexToRgba, getSupportMemberIconKey, getCharTint, getUnitMatrixTint } = presentation;
const { supportShowCardImages, onSupportShowCardImagesChange, supportEnableWlLineup, onSupportEnableWlLineupChange, supportLineupRows, supportUseOriginalVsTeam, onSupportUseOriginalVsTeamChange, isSupportAttrIcon, formatSupportTotal } = support;
const { lineupShowCardImages, onLineupShowCardImagesChange, toggleLineupExpandedAll, getLineupGlobalToggleLabel, characterLineupRows, toggleLineupExpanded, getLineupToggleLabel, isLineupExpanded } = lineup;
const { intervalPanelShowCardImagesAll, intervalPanelShowCardImagesIndeterminate, onIntervalPanelShowAllCardImagesChange, relatedLastRecordShowCardImages, onRelatedLastRecordShowCardImagesChange, lastFourStarDisplayRecords, lastLimitedDisplayRecords, intervalFourShowCardImages, onIntervalFourShowCardImagesChange, fourStarLongestDisplayRecords, fourStarShortestDisplayRecords, intervalLimitedShowCardImages, onIntervalLimitedShowCardImagesChange, limitedLongestDisplayRecords, limitedShortestDisplayRecords, intervalBanShowCardImages, onIntervalBanShowCardImagesChange, banLongestDisplayRecords, banShortestDisplayRecords, vsUnitLastFourDisplayRecords } = relatedRecords;
const { fesRecordShowCardImages, onFesRecordShowCardImagesChange, getFesMatrixAttrHeadStyle, getFesMatrixUnitHeadStyle, getFesMatrixCellStyle, cfesRecordMatrix, getFesMatrixUnitStripCellStyle, getFesMatrixTotalCellStyle, getFesMatrixTotalChipStyle, bfesRecordMatrix } = fesRecords;
const { specialLimitedShowCardImages, onSpecialLimitedShowCardImagesChange, specialLimitedHasDoubleCfes, specialLimitedUnitGroups, hasSpecialLimitedDoubleCfes, specialLimitedRows, specialLimitedMatrix } = specialLimited;
const { isDuoUnitGlobalFilterChecked, isDuoUnitGlobalFilterIndeterminate, onDuoFilterChange, duoLastPoolShowCardImagesAll, duoLastPoolShowCardImagesIndeterminate, onDuoLastPoolShowCardImagesChange, duoUnitRows, onDuoUnitFilterChange, getDuoHeadCellStyle, getDuoMatrixCellClass, getDuoMatrixCellStyle, formatDuoCount, onDuoUnitLastPoolShowCardImagesChange, duoPoolFilters, duoPoolMatrix, duoEventFilters, duoEventMatrix } = duo;
const { isExportingPng, screenshotModalVisible, closeScreenshotModal, screenshotModalState, screenshotModalTitle, forceCancelScreenshotExport, screenshotModalMessage, retryScreenshotExport } = captureModal;
const { attrSummaryCards } = attributeSummary;
const { yearRarityOptions, yearRarities, yearCardTypeOptions, yearCardTypes, yearShowCardImages, yearShowCardDates, yearUseOperatingYear, yearNewYearNextYear, hideYearCharNames, yearPanels } = yearStats;
const { includeVsInYearUnitSummary, includeVsInYearUnitSummaryIndeterminate, onIncludeVsInYearUnitSummaryChange, onYearVsUnitSummaryChange } = yearStats;
const { exportElementPng } = captureExport;
const { safeMaxEventId } = eventCatalog;
const { getLineupRowStyle, getLineupMemberCellStyle } = lineupRules;
const { getJumpLinkLabel } = eventLabels;
const { specialPanelShowCardImagesAll, specialPanelShowCardImagesIndeterminate, onSpecialPanelShowAllCardImagesChange } = panelControls;
const { onMediaImageLoad, onMediaImageError, getLineupSlotCardImageSrc, buildCardImageSrc } = media;

defineExpose({
  getTopBarState,
  setTopBarDisplayEventIdDraft,
  applyTopBarDisplayEventId,
  adjustTopBarDisplayEventId,
  resetTopBarDisplayEventId,
  toggleTopBarNavCollapsed
});
</script>

<style scoped src="../features/card-stats/styles/cardStatsFoundation.css"></style>
<style scoped src="../styles/scoped/stats-navigation-base.css"></style>
<style scoped src="../features/card-stats/styles/cardStatsContent.css"></style>
<style scoped src="../styles/scoped/media-load-shimmer.css"></style>
<style scoped src="../features/card-stats/styles/cardStatsRecordTables.css"></style>
<style scoped src="../styles/scoped/stats-navigation-responsive.css"></style>
<style scoped src="../features/card-stats/styles/cardStatsResponsive.css"></style>
