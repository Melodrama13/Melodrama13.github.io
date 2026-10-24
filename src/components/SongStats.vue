<template>
  <div
    ref="songStatsRootRef"
    class="pjsk-song-stats"
    :class="{ 'is-exporting': isExportingPng, 'is-anvo-fill-mode': isAnvoFillModeActive }"
    :style="songStatsRootStyle"
  >
    <div class="stats-layout" :class="{ 'nav-collapsed': navCollapsed, 'mobile-nav-overlay': isNavTopLayout, 'mobile-nav-open': !navCollapsed }">
      <button
        v-if="navCollapsed"
        v-liquid-glass
        class="pjsk-ui-action floating-menu-btn ui-liquid-glass ui-liquid-glass--prominent ui-glass-optical-detail"
        title="展开统计菜单"
        @click="setNavCollapsed(false)"
      >
        <img src="/data/icon/menu.png" class="floating-menu-icon" alt="菜单" />
      </button>

      <SongNavigationPanel
  :isNavTopLayout="isNavTopLayout"
  :navCollapsed="navCollapsed"
  :setNavCollapsed="setNavCollapsed"
  :navGroups="navGroups"
  :isGroupActive="isGroupActive"
  :handleParentNavClick="handleParentNavClick"
  :isGroupExpanded="isGroupExpanded"
  :activeNavId="activeNavId"
  :isNestedNavChild="isNestedNavChild"
  :handleChildNavClick="handleChildNavClick"
  :shouldShowNavChild="shouldShowNavChild"

/>

      <div class="stats-main">
        <div class="stats-main-head">
          <h1>乐曲统计</h1>
        </div>

        <section class="song-disclaimer" aria-label="素材声明">
          <p>
            本网站为非官方、非商业的个人研究与交流项目，不拥有所展示素材的版权。
            相关版权归其合法权利人所有，包括但不限于 Sega、Colorful Palette、Crypton 等。
          </p>
          <p>
            如有版权或使用问题，请通过
            <a
              :href="PROJECT_GITHUB_ISSUES_URL"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Issues
            </a>
            联系维护者处理。
          </p>
        </section>

        <section id="panel-song-stats" class="stats-section card-panel section-main" data-scroll-anchor="panel-song-stats">
          <div class="section-head">
            <div class="section-head-left">
              <h2>{{ getSongSectionTitle('panel-song-stats') }}</h2>
            </div>
          </div>

          <div class="stats-grid">
            <SongUniqueStatsPanel
  :isExportingPng="isExportingPng"
  :exportSongPanelPng="exportSongPanelPng"
  :ocUniqueStats="ocUniqueStats"
  v-model:includeDeletedSongsInStats="includeDeletedSongsInStats"
/>

            <VsCommissionedSongStatsPanel
              :title="getSongSectionTitle('panel-vs-song-stats')"
              :stats-by-singer="virtualSingerSongStats"
              :is-image-mode="vsSongImageMode"
              :global-toggle-label="vsSongGlobalToggleLabel"
              :is-exporting-png="isExportingPng"
              :unit-order="VS_UNIT_ORDER"
              :unit-icon-by-key="UNIT_TAG_ICON_MAP"
              :unit-color-by-key="unitColorMap"
              :color-to-rgba="hexToRgba"
              :get-singer-anchor-id="getVsSingerNavAnchorId"
              :register-singer-card-element="setVsSongCardRef"
              :get-singer-display-mode="getVsSongCardMode"
              :is-singer-collapsed="isVsSongCardCollapsed"
              :get-singer-image-groups="getVsSongImageGroups"
              @change-image-mode="onVsSongImageModeChange"
              @toggle-all="toggleAllVsSongExpandCollapse"
              @toggle-singer="toggleVsSongCardExpandCollapse"
              @export-panel="exportSongPanelPng"
              @show-song-title="showSongImageTitle"
              @clear-song-title="clearSongImageTitleToast"
              @jacket-load="onSongJacketLoad"
              @jacket-error="onSongJacketError"
            />

            <OcCommissionedSongStatsPanel
              :title="getSongSectionTitle('panel-oc-book-stats')"
              :stats-by-unit="ocBookStatsByUnit"
              :is-image-mode="ocBookImageMode"
              :global-toggle-label="ocBookGlobalToggleLabel"
              :is-exporting-png="isExportingPng"
              :unit-logo-by-key="UNIT_TITLE_LOGO_MAP"
              :unit-color-by-key="unitColorMap"
              :color-to-rgba="hexToRgba"
              :get-unit-anchor-id="getOcBookUnitNavAnchorId"
              :register-unit-card-element="setOcBookUnitCardRef"
              :is-unit-expanded="isOcBookUnitExpanded"
              @change-image-mode="onOcBookImageModeChange"
              @toggle-all="toggleAllOcBookExpandCollapse"
              @toggle-unit="toggleOcBookUnitExpandCollapse"
              @export-panel="exportSongPanelPng"
              @show-song-title="showSongImageTitle"
              @clear-song-title="clearSongImageTitleToast"
              @jacket-load="onSongJacketLoad"
              @jacket-error="onSongJacketError"
            />

            <SongBookRoundStatsPanel
  :isExportingPng="isExportingPng"
  :exportSongPanelPng="exportSongPanelPng"
  :bookRoundStats="bookRoundStats"

/>

            <SongAnotherVocalPanel
  :anotherImageMode="anotherImageMode"
  :onAnotherImageModeChange="onAnotherImageModeChange"
  :canShowAnvoFillToggle="canShowAnvoFillToggle"
  :anvoFillDisplay="anvoFillDisplay"
  :onAnvoFillDisplayChange="onAnvoFillDisplayChange"
  :toggleAllAnotherExpandCollapse="toggleAllAnotherExpandCollapse"
  :anotherGlobalToggleLabel="anotherGlobalToggleLabel"
  :anotherAllFixed="anotherAllFixed"
  :setAllAnotherFixedMode="setAllAnotherFixedMode"
  :isExportingPng="isExportingPng"
  :exportSongPanelPng="exportSongPanelPng"
  :anotherVocalCards="anotherVocalCards"
  :getAnvoNavAnchorId="getAnvoNavAnchorId"
  :isAnvoFillModeActive="isAnvoFillModeActive"
  :getAnotherCardStyle="getAnotherCardStyle"
  :showSongImageTitle="showSongImageTitle"
  :clearSongImageTitleToast="clearSongImageTitleToast"
  :onSongJacketLoad="onSongJacketLoad"
  :onSongJacketError="onSongJacketError"
  :toggleAnotherCardExpandCollapse="toggleAnotherCardExpandCollapse"
  :getAnotherCardMode="getAnotherCardMode"
  v-model:anvoCoverOnly="anvoCoverOnly"
  v-model:anvoThreeDOnly="anvoThreeDOnly"
  v-model:anvoTwoDOnly="anvoTwoDOnly"
/>

            <SongPairStatsPanel
  :duoImageMode="duoImageMode"
  :onDuoImageModeChange="onDuoImageModeChange"
  :toggleAllDuoExpandCollapse="toggleAllDuoExpandCollapse"
  :duoGlobalToggleLabel="duoGlobalToggleLabel"
  :isExportingPng="isExportingPng"
  :exportSongPanelPng="exportSongPanelPng"
  :sameUnitPairUnitCards="sameUnitPairUnitCards"
  :setDuoPairGridRef="setDuoPairGridRef"
  :unitColorMap="unitColorMap"
  :getCharacterAvatarSrc="getCharacterAvatarSrc"
  :showSongImageTitle="showSongImageTitle"
  :clearSongImageTitleToast="clearSongImageTitleToast"
  :onSongJacketLoad="onSongJacketLoad"
  :onSongJacketError="onSongJacketError"
  :setDuoNameRef="setDuoNameRef"
  :isDuoNameCompact="isDuoNameCompact"
  :getCharacterSingleMark="getCharacterSingleMark"
  :toggleDuoCardExpandCollapse="toggleDuoCardExpandCollapse"
  :isDuoCardExpanded="isDuoCardExpanded"

/>

            <SongThreeDmvStatsPanel
  :threeDmvImageMode="threeDmvImageMode"
  :onThreeDmvImageModeChange="onThreeDmvImageModeChange"
  :threeDmvCoverOnly="threeDmvCoverOnly"
  :onThreeDmvCoverOnlyChange="onThreeDmvCoverOnlyChange"
  :isExportingPng="isExportingPng"
  :exportSongPanelPng="exportSongPanelPng"
  :threeDmvStatsByUnit="threeDmvStatsByUnit"
  :unitColorMap="unitColorMap"
  :showSongImageTitle="showSongImageTitle"
  :clearSongImageTitleToast="clearSongImageTitleToast"
  :onSongJacketLoad="onSongJacketLoad"
  :onSongJacketError="onSongJacketError"

/>

            <SongTwoDmvStatsPanel
  :twoDmvImageMode="twoDmvImageMode"
  :onTwoDmvImageModeChange="onTwoDmvImageModeChange"
  :twoDmvCoverOnly="twoDmvCoverOnly"
  :onTwoDmvCoverOnlyChange="onTwoDmvCoverOnlyChange"
  :isExportingPng="isExportingPng"
  :exportSongPanelPng="exportSongPanelPng"
  :twoDmvStatsByUnit="twoDmvStatsByUnit"
  :unitColorMap="unitColorMap"
  :showSongImageTitle="showSongImageTitle"
  :clearSongImageTitleToast="clearSongImageTitleToast"
  :onSongJacketLoad="onSongJacketLoad"
  :onSongJacketError="onSongJacketError"

/>

            <SongCoverAlbumStatsPanel
              :stats-by-unit="coverAlbumStats"
              :get-unit-nav-anchor-id="getCoverAlbumUnitNavAnchorId"
              :only-predicted="coverAlbumOnlyPredicted"
              :display-mode="coverAlbumDisplayMode"
              :unit-color-by-key="unitColorMap"
              :is-exporting-png="isExportingPng"
              :export-song-panel-png="exportSongPanelPng"
              :get-character-avatar-src="getCharacterAvatarSrc"
              :show-song-image-title="showSongImageTitle"
              :clear-song-image-title-toast="clearSongImageTitleToast"
              :on-song-jacket-load="onSongJacketLoad"
              :on-song-jacket-error="onSongJacketError"
              @only-predicted-change="onCoverAlbumOnlyPredictedChange"
              @display-mode-change="onCoverAlbumDisplayModeChange"
            />

            <SongAprilFoolStatsPanel
  :isExportingPng="isExportingPng"
  :exportSongPanelPng="exportSongPanelPng"
  :aprilFoolSongStatsByYear="aprilFoolSongStatsByYear"
  :showSongImageTitle="showSongImageTitle"
  :clearSongImageTitleToast="clearSongImageTitleToast"
  :onSongJacketLoad="onSongJacketLoad"
  :onSongJacketError="onSongJacketError"

/>
          </div>
        </section>

        <SongSearchPanel
  :registerSongListWrap="el => songListWrapRef = el"
  :isSongTableOverflowing="isSongTableOverflowing"
  :difficultySortMode="difficultySortMode"
  :difficultySortModeTitle="difficultySortModeTitle"
  :cycleDifficultySortMode="cycleDifficultySortMode"
  :difficultySortModeIconSrc="difficultySortModeIconSrc"
  :pagedSongs="pagedSongs"
  :showSongImageTitle="showSongImageTitle"
  :clearSongImageTitleToast="clearSongImageTitleToast"
  :onSongJacketLoad="onSongJacketLoad"
  :onSongJacketError="onSongJacketError"
  :filteredSongs="filteredSongs"
  :emptyPagedRowCount="emptyPagedRowCount"
  :currentSongPage="currentSongPage"
  :changeSongPage="changeSongPage"
  :totalSongPages="totalSongPages"
  :backToSongHome="backToSongHome"
  :onSongPageSizeChange="onSongPageSizeChange"
  v-model:keyword="keyword"
  v-model:groupFilter="groupFilter"
  v-model:mvFilter="mvFilter"
  v-model:difficultySortKey="difficultySortKey"
  :songPageSize="songPageSize"
/>

        <SongTitleToast
  :songImageTitleToast="songImageTitleToast"

/>
      </div>
    </div>

    <SongCaptureModal
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
import { useSongLifecycle } from '../features/song-stats/useSongLifecycle.js';

import SongNavigationPanel from '../features/song-stats/SongNavigationPanel.vue';
import SongUniqueStatsPanel from '../features/song-stats/SongUniqueStatsPanel.vue';
import SongBookRoundStatsPanel from '../features/song-stats/SongBookRoundStatsPanel.vue';
import SongAnotherVocalPanel from '../features/song-stats/SongAnotherVocalPanel.vue';
import SongPairStatsPanel from '../features/song-stats/SongPairStatsPanel.vue';
import SongThreeDmvStatsPanel from '../features/song-stats/SongThreeDmvStatsPanel.vue';
import SongTwoDmvStatsPanel from '../features/song-stats/SongTwoDmvStatsPanel.vue';
import SongAprilFoolStatsPanel from '../features/song-stats/SongAprilFoolStatsPanel.vue';
import SongCoverAlbumStatsPanel from '../features/song-stats/SongCoverAlbumStatsPanel.vue';
import { buildCoverAlbumStats } from '../features/song-stats/coverAlbumStats.js';
import SongSearchPanel from '../features/song-stats/SongSearchPanel.vue';
import SongTitleToast from '../features/song-stats/SongTitleToast.vue';
import SongCaptureModal from '../features/song-stats/SongCaptureModal.vue';import { ref, computed } from "vue";
import { useSongCatalog, createSongCatalogState } from '../features/song-stats/useSongCatalog.js';
import { useSongSearch, createSongSearchState } from '../features/song-stats/useSongSearch.js';
import { useSongCaptureModal, createSongCaptureModalState } from '../features/song-stats/useSongCaptureModal.js';
import { useSongAnotherVocal, createSongAnotherVocalState } from '../features/song-stats/useSongAnotherVocal.js';
import { useSongPairStats, createSongPairStatsState } from '../features/song-stats/useSongPairStats.js';
import { useSongPairLayout, createSongPairLayoutState } from '../features/song-stats/useSongPairLayout.js';
import { useSongMvStats, createSongMvStatsState } from '../features/song-stats/useSongMvStats.js';
import { useSongMedia, createSongMediaState } from '../features/song-stats/useSongMedia.js';
import { useSongCommissionedDisplay, createSongCommissionedDisplayState } from '../features/song-stats/useSongCommissionedDisplay.js';
import { useSongViewportNavigation, createSongViewportNavigationState } from '../features/song-stats/useSongViewportNavigation.js';
import { useSongReadingPosition, createSongReadingPositionState } from '../features/song-stats/useSongReadingPosition.js';
import { useSongElementCapture, createSongElementCaptureState } from '../features/song-stats/useSongElementCapture.js';
import { useSongCharacters } from '../features/song-stats/useSongCharacters.js';
import { useSongNavigationModel } from '../features/song-stats/useSongNavigationModel.js';
import { useSongCommissionedStats } from '../features/song-stats/useSongCommissionedStats.js';
import { useSongUniqueStats } from '../features/song-stats/useSongUniqueStats.js';
import { useSongAprilFoolStats } from '../features/song-stats/useSongAprilFoolStats.js';
import { useSongCanvasCapture, createSongCanvasCaptureState } from '../features/song-stats/useSongCanvasCapture.js';
import { useSongCaptureClone } from '../features/song-stats/useSongCaptureClone.js';
import { useSongPanelCapture } from '../features/song-stats/useSongPanelCapture.js';
import { UNIT_TAG_ICON_MAP, PROJECT_GITHUB_ISSUES_URL, UNIT_TITLE_LOGO_MAP, VS_UNIT_ORDER, getSongSectionTitle } from "../features/song-stats/songDisplayConstants.js";
import { hexToRgba } from "../features/song-stats/songFormatters.js";




import OcCommissionedSongStatsPanel from '../features/song-stats/OcCommissionedSongStatsPanel.vue';
import VsCommissionedSongStatsPanel from '../features/song-stats/VsCommissionedSongStatsPanel.vue';

const props = defineProps({
  allEvents: { type: Array, default: () => [] },
  allSongs: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] }
});

const songStatsRootRef = ref(null);

const { spoilerNow, spoilerClockTimer, includeDeletedSongsInStats } = createSongCatalogState();
const { keyword, mvFilter, groupFilter, difficultySortKey, difficultySortMode, currentSongPage, songPageSize, songListWrapRef, isSongTableOverflowing, songTableResizeObserver } = createSongSearchState();
const { isExportingPng, screenshotModalVisible, screenshotModalState, screenshotModalTitle, screenshotModalMessage, screenshotModalRetryTask, screenshotModalCancelTask, screenshotModalAutoCloseTimer, songExportLifecycle, activeSongExportToken } = createSongCaptureModalState();
const { anotherCardModeMap, anotherImageMode, anvoFillDisplay, anvoCoverOnly, anvoThreeDOnly, anvoTwoDOnly, anvoFillContentWidth } = createSongAnotherVocalState();
const { duoCardExpandedMap, duoImageMode } = createSongPairStatsState();
const { duoNameCompactMap, duoNameRefMap, duoPairGridRefMap, duoPairGridColumnMap, duoNameRaf, duoPairGridRaf, duoPairGridResizeObserver } = createSongPairLayoutState();
const { threeDmvImageMode, twoDmvImageMode, threeDmvCoverOnly, twoDmvCoverOnly } = createSongMvStatsState();
const { songImageTitleToast, songImageTitleToastTimer } = createSongMediaState();
const { vsSongCardModeMap, vsSongImageMode, ocBookImageMode, ocBookUnitExpandedMap, vsSongCardRefMap, ocBookUnitCardRefMap } = createSongCommissionedDisplayState();
const { viewportScrollHost, navSyncRaf, navCollapsed, activeNavId, isMobileNav, isNavTopLayout, viewportWidth, viewportHeight, navTopLayoutPrev, mobileNavExpandedGroups, sectionObserver } = createSongViewportNavigationState();
const { statsMainInteractionHost, lastInteractiveAnchorEl, lastInteractiveAt } = createSongReadingPositionState();
const { songCaptureRenderTracker } = createSongElementCaptureState();
const { canvasExportImageCache } = createSongCanvasCaptureState();

const { SPOILER_CLOCK_INTERVAL_MS, refreshSpoilerClock, normalizeSongRow, songs, songsForStats, songsById } = useSongCatalog({
  spoilerNow,
  spoilerClockTimer,
  includeDeletedSongsInStats,
  props
});

const { clearScreenshotModalAutoClose, resetScreenshotModalState, setScreenshotModalState, setSongExportModalState, closeScreenshotModal, forceCancelScreenshotExport, retryScreenshotExport } = useSongCaptureModal({
  isExportingPng,
  screenshotModalVisible,
  screenshotModalState,
  screenshotModalTitle,
  screenshotModalMessage,
  screenshotModalRetryTask,
  screenshotModalCancelTask,
  screenshotModalAutoCloseTimer,
  songExportLifecycle,
  activeSongExportToken
});

const { scheduleRecalcDuoNameCompact, setDuoNameRef, parseCssPx, resolveGridGapPx, resolveGridMinCardWidthPx, getBaseGridColumnCount, recalcDuoPairGridColumns, scheduleRecalcDuoPairGridColumns, setDuoPairGridRef, isDuoNameCompact } = useSongPairLayout({
  duoNameCompactMap,
  duoNameRefMap,
  duoPairGridRefMap,
  duoPairGridColumnMap,
  duoNameRaf,
  duoPairGridRaf,
  duoPairGridResizeObserver
});

const { SCROLL_SNAPSHOT_ANCHOR_SELECTOR, getAnchorNodesInStatsMain, findAnchorElementByKey, viewportFocus, withPinnedElementPosition, rememberInteractiveAnchorFromEvent, consumeRecentInteractiveAnchor, withInteractionPinnedPosition, withReadingPosition } = useSongReadingPosition({
  statsMainInteractionHost,
  lastInteractiveAnchorEl,
  lastInteractiveAt,
  songStatsRootRef,
  scheduleNavSync: (...args) => scheduleNavSync(...args)
});

const { waitPendingSongCaptureRenderTask, startSongCaptureRenderTask, getCaptureErrorText, hideExportControlsForLiveCapture, shouldCaptureLiveElementForExport, exportElementPng } = useSongElementCapture({
  songCaptureRenderTracker,
  setSongExportModalState: (...args) => setSongExportModalState(...args),
  prepareSongExportClone: (...args) => prepareSongExportClone(...args),
  screenshotModalCancelTask
});

const { getNavAbbrFromName, getVsSingerBookSubtitle, characters, characterByName, charactersByUnit, unitColorMap, getAnotherCharacterSortOrder, normalizeCharacterName, getCharacterAvatarSrc, getAprilFoolCharacterIcon, getCharacterColor, getCharacterSingleMark, getCharacterAbbr, VS_ALIAS_MAP, VS_NAMES, parseVS, getUnitByChar, buildVsIconsFromNames, getUnitVsAvatarSrc, buildBookRoundVsIcons, getKnownCharacters } = useSongCharacters({
  props
});

const { prepareSongExportClone } = useSongCaptureClone({
  songStatsRootRef
});

const { difficultySortModeIconSrc, difficultySortModeTitle, cycleDifficultySortMode, backToSongHome, recalcSongTableOverflow, filteredSongs, totalSongPages, pagedSongs, emptyPagedRowCount, changeSongPage, onSongPageSizeChange, connectSongSearchEffects } = useSongSearch({
  keyword,
  mvFilter,
  groupFilter,
  difficultySortKey,
  difficultySortMode,
  currentSongPage,
  songPageSize,
  songListWrapRef,
  isSongTableOverflowing,
  songTableResizeObserver,
  withInteractionPinnedPosition: (...args) => withInteractionPinnedPosition(...args),
  songs
});

const { onAnotherImageModeChange, canShowAnvoFillToggle, isAnvoFillModeActive, anvoMaxSongCount, getAnvoFillMetricsForWidth, getAnvoFillExportWidth, updateAnvoFillContentWidth, anvoFillMetrics, songStatsRootStyle, onAnvoFillDisplayChange, anotherVocalCards, getAnotherCardMode, anotherGlobalToggleLabel, anotherAllFixed, toggleAllAnotherExpandCollapse, setAllAnotherFixedMode, toggleAnotherCardExpandCollapse, getAnotherCardStyle, snapshotAnotherCardModes, expandAnotherCardsForExport, connectSongAnotherVocalEffects } = useSongAnotherVocal({
  anotherCardModeMap,
  anotherImageMode,
  anvoFillDisplay,
  anvoCoverOnly,
  anvoThreeDOnly,
  anvoTwoDOnly,
  anvoFillContentWidth,
  withInteractionPinnedPosition: (...args) => withInteractionPinnedPosition(...args),
  viewportWidth,
  navCollapsed,
  songsForStats,
  getKnownCharacters: (...args) => getKnownCharacters(...args),
  getCharacterAvatarSrc: (...args) => getCharacterAvatarSrc(...args),
  getAnotherCharacterSortOrder: (...args) => getAnotherCharacterSortOrder(...args),
  scheduleRecalcDuoPairGridColumns: (...args) => scheduleRecalcDuoPairGridColumns(...args),
  scheduleRecalcDuoNameCompact: (...args) => scheduleRecalcDuoNameCompact(...args),
  viewportHeight
});

const { onDuoImageModeChange, songPairVocalsByMemberKey, sameUnitPairUnitCardsRaw, sameUnitPairUnitCards, isDuoCardExpanded, duoGlobalToggleLabel, toggleAllDuoExpandCollapse, toggleDuoCardExpandCollapse, snapshotDuoExpandedMap, expandAllDuoCardsForExport, connectSongPairStatsEffects } = useSongPairStats({
  duoCardExpandedMap,
  duoImageMode,
  withInteractionPinnedPosition: (...args) => withInteractionPinnedPosition(...args),
  songsForStats,
  getKnownCharacters: (...args) => getKnownCharacters(...args),
  charactersByUnit,
  buildVsIconsFromNames: (...args) => buildVsIconsFromNames(...args),
  getCharacterColor: (...args) => getCharacterColor(...args),
  unitColorMap,
  duoPairGridColumnMap,
  scheduleRecalcDuoPairGridColumns: (...args) => scheduleRecalcDuoPairGridColumns(...args),
  scheduleRecalcDuoNameCompact: (...args) => scheduleRecalcDuoNameCompact(...args)
});

const { onThreeDmvImageModeChange, onTwoDmvImageModeChange, onThreeDmvCoverOnlyChange, onTwoDmvCoverOnlyChange, buildThreeDmvVocalMatch, buildDetailMvStatsByUnit, threeDmvStatsByUnit, twoDmvStatsByUnit } = useSongMvStats({
  threeDmvImageMode,
  twoDmvImageMode,
  threeDmvCoverOnly,
  twoDmvCoverOnly,
  withInteractionPinnedPosition: (...args) => withInteractionPinnedPosition(...args),
  getKnownCharacters: (...args) => getKnownCharacters(...args),
  buildVsIconsFromNames: (...args) => buildVsIconsFromNames(...args),
  songsForStats,
  isCoreUniqueSongForUnit: (...args) => isCoreUniqueSongForUnit(...args),
  VS_NAMES,
  getCharacterAvatarSrc: (...args) => getCharacterAvatarSrc(...args),
  getCharacterColor: (...args) => getCharacterColor(...args),
  unitColorMap,
  makeThreeDmvUnitNavAnchorId: (...args) => makeThreeDmvUnitNavAnchorId(...args),
  makeTwoDmvUnitNavAnchorId: (...args) => makeTwoDmvUnitNavAnchorId(...args)
});

const { onSongJacketError, onSongJacketLoad, closeSongImageTitleToast, clearSongImageTitleToast, handleDocumentPointerDownForSongToast, handleDocumentKeydownForSongToast, showSongImageTitle } = useSongMedia({
  songImageTitleToast,
  songImageTitleToastTimer,
  songsById,
  songStatsRootRef
});

const { makeSongTagSingle, makeSongTagAbbr, makeSongTagNumber, getSongTagColor, getSongTagImageColor, parseSeriesOrder, getBookRoundEventIdText, isBookRoundNumericEventId, compareBookRoundEventOrder, bookRoundStats, ocBookStatsByUnit, vsSongImageGroupOptions, vsSongImageGroupsByRow, getVsSongImageGroups, virtualSingerSongStats } = useSongCommissionedStats({
  getCharacterSingleMark: (...args) => getCharacterSingleMark(...args),
  getCharacterAbbr: (...args) => getCharacterAbbr(...args),
  getUnitByChar: (...args) => getUnitByChar(...args),
  unitColorMap,
  getCharacterColor: (...args) => getCharacterColor(...args),
  props,
  songsById,
  normalizeCharacterName: (...args) => normalizeCharacterName(...args),
  parseVS: (...args) => parseVS(...args),
  getCharacterAvatarSrc: (...args) => getCharacterAvatarSrc(...args),
  buildBookRoundVsIcons: (...args) => buildBookRoundVsIcons(...args),
  VS_NAMES,
  charactersByUnit,
  buildVsIconsFromNames: (...args) => buildVsIconsFromNames(...args)
});

const { isCoreUniqueSongForUnit, ocUniqueStats } = useSongUniqueStats({
  songsForStats
});

const { parseAprilFoolYear, aprilFoolSongStatsByYear } = useSongAprilFoolStats({
  songsForStats,
  getAprilFoolCharacterIcon: (...args) => getAprilFoolCharacterIcon(...args)
});

const coverAlbumStats = computed(() => buildCoverAlbumStats({ songs: songs.value, characters: props.allCharacters }));
const coverAlbumOnlyPredicted = ref(false);
const coverAlbumDisplayMode = ref('text');
const onCoverAlbumOnlyPredictedChange = (event) => {
  const checked = Boolean(event?.target?.checked);
  void withInteractionPinnedPosition(() => {
    clearSongImageTitleToast();
    coverAlbumOnlyPredicted.value = checked;
  }, event?.currentTarget);
};
const onCoverAlbumDisplayModeChange = (event) => {
  const mode = event?.target?.value;
  if (!['text', 'image', 'image-text'].includes(mode)) return;
  void withInteractionPinnedPosition(() => {
    clearSongImageTitleToast();
    coverAlbumDisplayMode.value = mode;
  }, event?.currentTarget);
};

const { onVsSongImageModeChange, onOcBookImageModeChange, getVsSongCardMode, isOcBookUnitExpanded, isVsSongCardCollapsed, vsSongGlobalToggleLabel, ocBookGlobalToggleLabel, toggleAllVsSongExpandCollapse, toggleAllOcBookExpandCollapse, toggleOcBookUnitExpandCollapse, toggleVsSongCardExpandCollapse, setVsSongCardRef, setOcBookUnitCardRef, snapshotVsSongCardModes, snapshotOcBookExpandedMap, expandVsSongCardsForExport, expandOcBookUnitsForExport, connectSongCommissionedDisplayEffects } = useSongCommissionedDisplay({
  vsSongCardModeMap,
  vsSongImageMode,
  ocBookImageMode,
  ocBookUnitExpandedMap,
  vsSongCardRefMap,
  ocBookUnitCardRefMap,
  withInteractionPinnedPosition: (...args) => withInteractionPinnedPosition(...args),
  virtualSingerSongStats,
  ocBookStatsByUnit
});

const { makeVsSingerNavAnchorId, makeOcBookUnitNavAnchorId, makeAnvoUnitNavAnchorId, makeThreeDmvUnitNavAnchorId, makeTwoDmvUnitNavAnchorId, getCoverAlbumUnitNavAnchorId, vsSingerNavChildren, vsSingerAnchorIdByName, getVsSingerNavAnchorId, ocBookUnitNavChildren, getOcBookUnitNavAnchorId, threeDmvUnitNavChildren, twoDmvUnitNavChildren, anvoUnitAnchorIdByName, anvoUnitNavChildren, getAnvoNavAnchorId, navGroups, navTargetIds, duoUnitNavIds, vsSingerNavIds, ocUnitNavIds, anvoUnitNavIds, threeDmvUnitNavIds, twoDmvUnitNavIds, isDuoNavScopeActive, isVsNavScopeActive, isOcBookNavScopeActive, isAnvoNavScopeActive, isThreeDmvNavScopeActive, isTwoDmvNavScopeActive, isNestedNavChild, shouldShowNavChild } = useSongNavigationModel({
  getNavAbbrFromName: (...args) => getNavAbbrFromName(...args),
  virtualSingerSongStats,
  getVsSingerBookSubtitle: (...args) => getVsSingerBookSubtitle(...args),
  ocBookStatsByUnit,
  threeDmvStatsByUnit,
  twoDmvStatsByUnit,
  coverAlbumStats,
  anotherVocalCards,
  sameUnitPairUnitCards,
  activeNavId,
  isMobileNav
});

const { loadImageForCanvasExport, getDisplayedCanvasExportImages, drawCanvasRoundRectPath, drawCanvasRoundedImage, drawCanvasCircleImage, exportAnvoFillCanvasPng } = useSongCanvasCapture({
  canvasExportImageCache,
  setSongExportModalState: (...args) => setSongExportModalState(...args),
  anotherVocalCards,
  getAnvoFillExportWidth: (...args) => getAnvoFillExportWidth(...args),
  getAnvoFillMetricsForWidth: (...args) => getAnvoFillMetricsForWidth(...args),
  anvoMaxSongCount,
  getCaptureErrorText: (...args) => getCaptureErrorText(...args),
  screenshotModalCancelTask
});

const { exportSongPanelPng } = useSongPanelCapture({
  isExportingPng,
  songExportLifecycle,
  activeSongExportToken,
  snapshotAnotherCardModes: (...args) => snapshotAnotherCardModes(...args),
  snapshotDuoExpandedMap: (...args) => snapshotDuoExpandedMap(...args),
  snapshotVsSongCardModes: (...args) => snapshotVsSongCardModes(...args),
  snapshotOcBookExpandedMap: (...args) => snapshotOcBookExpandedMap(...args),
  setSongExportModalState: (...args) => setSongExportModalState(...args),
  expandAnotherCardsForExport: (...args) => expandAnotherCardsForExport(...args),
  expandVsSongCardsForExport: (...args) => expandVsSongCardsForExport(...args),
  expandOcBookUnitsForExport: (...args) => expandOcBookUnitsForExport(...args),
  expandAllDuoCardsForExport: (...args) => expandAllDuoCardsForExport(...args),
  anotherImageMode,
  isAnvoFillModeActive,
  exportAnvoFillCanvasPng: (...args) => exportAnvoFillCanvasPng(...args),
  exportElementPng: (...args) => exportElementPng(...args),
  anotherCardModeMap,
  duoCardExpandedMap,
  vsSongCardModeMap,
  ocBookUnitExpandedMap
});

const { pickActiveNavTargetIdByViewport, syncActiveNavByViewport, scheduleNavSync, handleViewportScroll, bindViewportScrollTracking, handleWindowResize, setNavCollapsed, updateMobileNavState, isStatsNavigationPending, isGroupActive, isGroupExpanded, resetMobileNavGroupExpansion, scrollToSection, handleParentNavClick, handleChildNavClick, bindSectionObserver, connectSongViewportNavigationEffects } = useSongViewportNavigation({
  viewportScrollHost,
  navSyncRaf,
  navCollapsed,
  activeNavId,
  isMobileNav,
  isNavTopLayout,
  viewportWidth,
  viewportHeight,
  navTopLayoutPrev,
  mobileNavExpandedGroups,
  sectionObserver,
  navTargetIds,
  updateAnvoFillContentWidth: (...args) => updateAnvoFillContentWidth(...args),
  anvoFillDisplay,
  withReadingPosition: (...args) => withReadingPosition(...args),
  recalcSongTableOverflow: (...args) => recalcSongTableOverflow(...args),
  navGroups,
  findAnchorElementByKey: (...args) => findAnchorElementByKey(...args)
});

useSongLifecycle({
  refreshSpoilerClock,
  spoilerClockTimer,
  SPOILER_CLOCK_INTERVAL_MS,
  updateMobileNavState,
  handleWindowResize,
  handleDocumentPointerDownForSongToast,
  handleDocumentKeydownForSongToast,
  closeSongImageTitleToast,
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
});



connectSongSearchEffects();
connectSongAnotherVocalEffects();
connectSongPairStatsEffects();
connectSongCommissionedDisplayEffects();
connectSongViewportNavigationEffects();

defineExpose({
  get isCaptureSurfaceActive() {
    return isExportingPng.value || screenshotModalVisible.value;
  }
});
</script>

<style scoped src="../features/song-stats/styles/songStatsFoundation.css"></style>
<style scoped src="../styles/scoped/stats-navigation-base.css"></style>
<style scoped src="../features/song-stats/styles/songStatsContent.css"></style>
<style scoped src="../styles/scoped/media-load-shimmer.css"></style>
<style scoped src="../features/song-stats/styles/songStatsResponsive.css"></style>
<style scoped src="../styles/scoped/stats-navigation-responsive.css"></style>
<style scoped src="../features/song-stats/styles/songStatsCompactResponsive.css"></style>
