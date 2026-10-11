<template>
<div data-feature-view="card-related-records-panel" data-feature-page="cards" id="panel-related" data-scroll-anchor="panel-related" class="stats-section card-panel related-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>间隔记录</h2>
              <label class="fes-card-mode-toggle stats-checkbox" title="统一控制间隔记录中可切换卡面的子模块。">
                <input class="pjsk-ui-choice"
                  :checked="intervalPanelShowCardImagesAll"
                  :indeterminate="intervalPanelShowCardImagesIndeterminate"
                  type="checkbox"
                  @change="onIntervalPanelShowAllCardImagesChange"
                />
                显示卡面
              </label>
            </div>
            <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-related', '间隔记录')">PNG</button>
          </div>

          <div class="record-grid">
            <CardLastFourRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :relatedLastRecordShowCardImages="relatedLastRecordShowCardImages"
          :onRelatedLastRecordShowCardImagesChange="onRelatedLastRecordShowCardImagesChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
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
        />

            <CardLastLimitedRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :relatedLastRecordShowCardImages="relatedLastRecordShowCardImages"
          :onRelatedLastRecordShowCardImagesChange="onRelatedLastRecordShowCardImagesChange"
          v-model:limitedIncludeWl3="limitedIncludeWl3"
          :isMobileNav="isMobileNav"
          v-model:limitedIncludeSongLimited="limitedIncludeSongLimited"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :lastLimitedDisplayRecords="lastLimitedDisplayRecords"
          :getRecordTint="getRecordTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
        />

            <CardFourLongestIntervalRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :intervalFourShowCardImages="intervalFourShowCardImages"
          :onIntervalFourShowCardImagesChange="onIntervalFourShowCardImagesChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :fourStarLongestDisplayRecords="fourStarLongestDisplayRecords"
          :getRecordTint="getRecordTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          :formatGapValue="formatGapValue"
        />

            <CardFourShortestIntervalRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :intervalFourShowCardImages="intervalFourShowCardImages"
          :onIntervalFourShowCardImagesChange="onIntervalFourShowCardImagesChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :fourStarShortestDisplayRecords="fourStarShortestDisplayRecords"
          :getRecordTint="getRecordTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          :formatGapValue="formatGapValue"
        />

            <CardLimitedLongestIntervalRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :intervalLimitedShowCardImages="intervalLimitedShowCardImages"
          :onIntervalLimitedShowCardImagesChange="onIntervalLimitedShowCardImagesChange"
          v-model:limitedIncludeWl3="limitedIncludeWl3"
          :isMobileNav="isMobileNav"
          v-model:limitedIncludeSongLimited="limitedIncludeSongLimited"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :limitedLongestDisplayRecords="limitedLongestDisplayRecords"
          :getRecordTint="getRecordTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          :formatGapValue="formatGapValue"
        />

            <CardLimitedShortestIntervalRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :intervalLimitedShowCardImages="intervalLimitedShowCardImages"
          :onIntervalLimitedShowCardImagesChange="onIntervalLimitedShowCardImagesChange"
          v-model:limitedIncludeWl3="limitedIncludeWl3"
          :isMobileNav="isMobileNav"
          v-model:limitedIncludeSongLimited="limitedIncludeSongLimited"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :limitedShortestDisplayRecords="limitedShortestDisplayRecords"
          :getRecordTint="getRecordTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          :formatGapValue="formatGapValue"
        />

            <CardBanLongestIntervalRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :intervalBanShowCardImages="intervalBanShowCardImages"
          :onIntervalBanShowCardImagesChange="onIntervalBanShowCardImagesChange"
          :banEventTypeFilter="banEventTypeFilter"
          :setBanEventTypeFilter="setBanEventTypeFilter"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :banLongestDisplayRecords="banLongestDisplayRecords"
          :getRecordTint="getRecordTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          :formatGapValue="formatGapValue"
        />

            <CardBanShortestIntervalRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :intervalBanShowCardImages="intervalBanShowCardImages"
          :onIntervalBanShowCardImagesChange="onIntervalBanShowCardImagesChange"
          :banEventTypeFilter="banEventTypeFilter"
          :setBanEventTypeFilter="setBanEventTypeFilter"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :banShortestDisplayRecords="banShortestDisplayRecords"
          :getRecordTint="getRecordTint"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :jumpToHistoryByEventRef="jumpToHistoryByEventRef"
          :getJumpLinkLabel="getJumpLinkLabel"
          :formatGapValue="formatGapValue"
        />
          </div>
        </div>
</template>

<script setup>
import CardLastFourRecord from './CardLastFourRecord.vue';
import CardLastLimitedRecord from './CardLastLimitedRecord.vue';
import CardFourLongestIntervalRecord from './CardFourLongestIntervalRecord.vue';
import CardFourShortestIntervalRecord from './CardFourShortestIntervalRecord.vue';
import CardLimitedLongestIntervalRecord from './CardLimitedLongestIntervalRecord.vue';
import CardLimitedShortestIntervalRecord from './CardLimitedShortestIntervalRecord.vue';
import CardBanLongestIntervalRecord from './CardBanLongestIntervalRecord.vue';
import CardBanShortestIntervalRecord from './CardBanShortestIntervalRecord.vue';
defineProps(["intervalPanelShowCardImagesAll","intervalPanelShowCardImagesIndeterminate","onIntervalPanelShowAllCardImagesChange","isExportingPng","exportElementPng","getRelatedRecordTitle","relatedLastRecordShowCardImages","onRelatedLastRecordShowCardImagesChange","lastFourStarDisplayRecords","getRecordTint","getCharAbbr","getCharColor","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS","jumpToHistoryByEventRef","getJumpLinkLabel","isMobileNav","lastLimitedDisplayRecords","intervalFourShowCardImages","onIntervalFourShowCardImagesChange","fourStarLongestDisplayRecords","formatGapValue","fourStarShortestDisplayRecords","intervalLimitedShowCardImages","onIntervalLimitedShowCardImagesChange","limitedLongestDisplayRecords","limitedShortestDisplayRecords","intervalBanShowCardImages","onIntervalBanShowCardImagesChange","banEventTypeFilter","setBanEventTypeFilter","banLongestDisplayRecords","banShortestDisplayRecords"]);
const limitedIncludeWl3 = defineModel('limitedIncludeWl3');
const limitedIncludeSongLimited = defineModel('limitedIncludeSongLimited');
</script>
