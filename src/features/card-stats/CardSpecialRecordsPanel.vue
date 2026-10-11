<template>
<div data-feature-view="card-special-records-panel" data-feature-page="cards" id="panel-special" data-scroll-anchor="panel-special" class="stats-section card-panel related-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>特殊统计</h2>
              <label class="fes-card-mode-toggle stats-checkbox" title="统一控制特殊统计中可切换卡面的子模块。">
                <input class="pjsk-ui-choice"
                  :checked="specialPanelShowCardImagesAll"
                  :indeterminate="specialPanelShowCardImagesIndeterminate"
                  type="checkbox"
                  @change="onSpecialPanelShowAllCardImagesChange"
                />
                显示卡面
              </label>
            </div>
            <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-special', '特殊统计')">PNG</button>
          </div>

          <div class="record-grid">

            <VsCardLastFourRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :vsUnitLastFourCompact="vsUnitLastFourCompact"
          :onVsUnitLastFourCompactChange="onVsUnitLastFourCompactChange"
          :vsUnitLastFourShowCardImages="vsUnitLastFourShowCardImages"
          :onVsUnitLastFourShowCardImagesChange="onVsUnitLastFourShowCardImagesChange"
          :vsUnitLastFourSort="vsUnitLastFourSort"
          :onToggleVsUnitLastFourSort="onToggleVsUnitLastFourSort"
          :vsUnitLastFourSortLabel="vsUnitLastFourSortLabel"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
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
        />

            <VsCardFourCountRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :vsUnitFourCountCompact="vsUnitFourCountCompact"
          :onVsUnitFourCountCompactChange="onVsUnitFourCountCompactChange"
          :vsUnitFourCountShowCardImages="vsUnitFourCountShowCardImages"
          :onVsUnitFourCountShowCardImagesChange="onVsUnitFourCountShowCardImagesChange"
          :vsUnitFourCountSort="vsUnitFourCountSort"
          :onToggleVsUnitFourCountSort="onToggleVsUnitFourCountSort"
          :vsUnitFourCountSortLabel="vsUnitFourCountSortLabel"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :vsUnitFourCountDisplayRecords="vsUnitFourCountDisplayRecords"
          :getRecordTint="getRecordTint"
          :getVsUnitVariantAvatarSrc="getVsUnitVariantAvatarSrc"
          :getCharColor="getCharColor"
          :onVsUnitVariantAvatarError="onVsUnitVariantAvatarError"
          :getVsUnitLogoByKey="getVsUnitLogoByKey"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :VS_NAMES="VS_NAMES"
          :getVsScoreVsHeadStyle="getVsScoreVsHeadStyle"
          :getCharAbbr="getCharAbbr"
          :vsUnitFourCountRows="vsUnitFourCountRows"
          :getVsScoreUnitHeadStyle="getVsScoreUnitHeadStyle"
          :unitLogoMap="unitLogoMap"
          :getVsFourCountMiniCellClass="getVsFourCountMiniCellClass"
          :getVsScoreCellStyle="getVsScoreCellStyle"
        />

            <VsCardUnitScoreRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :vsUnitScoreShowCardImages="vsUnitScoreShowCardImages"
          :onVsUnitScoreShowCardImagesChange="onVsUnitScoreShowCardImagesChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :VS_NAMES="VS_NAMES"
          :getVsScoreVsHeadStyle="getVsScoreVsHeadStyle"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :vsUnitScoreAttrByUnitRows="vsUnitScoreAttrByUnitRows"
          :getVsScoreUnitHeadStyle="getVsScoreUnitHeadStyle"
          :unitLogoMap="unitLogoMap"
          :getVsScoreCellStyle="getVsScoreCellStyle"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
        />

            <VsOriginalCardRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :vsOriginalStatShowCardImages="vsOriginalStatShowCardImages"
          :onVsOriginalStatShowCardImagesChange="onVsOriginalStatShowCardImagesChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :VS_NAMES="VS_NAMES"
          :getVsScoreVsHeadStyle="getVsScoreVsHeadStyle"
          :getCharAbbr="getCharAbbr"
          :getCharColor="getCharColor"
          :vsOriginalStatRows="vsOriginalStatRows"
          :getVsOriginalStatCellStyle="getVsOriginalStatCellStyle"
          :getVsOriginalOtherRowCards="getVsOriginalOtherRowCards"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
          :getVsOriginalOtherRowAttrs="getVsOriginalOtherRowAttrs"
        />

            <CardCfesRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :fesRecordShowCardImages="fesRecordShowCardImages"
          :onFesRecordShowCardImagesChange="onFesRecordShowCardImagesChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :ATTRS="ATTRS"
          :getFesMatrixAttrHeadStyle="getFesMatrixAttrHeadStyle"
          :ATTR_LABELS="ATTR_LABELS"
          :RELATED_FES_UNITS="RELATED_FES_UNITS"
          :getFesMatrixUnitHeadStyle="getFesMatrixUnitHeadStyle"
          :unitLogoMap="unitLogoMap"
          :getFesMatrixCellStyle="getFesMatrixCellStyle"
          :cfesRecordMatrix="cfesRecordMatrix"
          :getCharColor="getCharColor"
          :getFesMatrixUnitStripCellStyle="getFesMatrixUnitStripCellStyle"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :getFesMatrixTotalCellStyle="getFesMatrixTotalCellStyle"
          :getFesMatrixTotalChipStyle="getFesMatrixTotalChipStyle"
        />

            <CardBfesRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :fesRecordShowCardImages="fesRecordShowCardImages"
          :onFesRecordShowCardImagesChange="onFesRecordShowCardImagesChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :ATTRS="ATTRS"
          :getFesMatrixAttrHeadStyle="getFesMatrixAttrHeadStyle"
          :ATTR_LABELS="ATTR_LABELS"
          :RELATED_FES_UNITS="RELATED_FES_UNITS"
          :getFesMatrixUnitHeadStyle="getFesMatrixUnitHeadStyle"
          :unitLogoMap="unitLogoMap"
          :getFesMatrixCellStyle="getFesMatrixCellStyle"
          :bfesRecordMatrix="bfesRecordMatrix"
          :getCharColor="getCharColor"
          :getFesMatrixUnitStripCellStyle="getFesMatrixUnitStripCellStyle"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :getFesMatrixTotalCellStyle="getFesMatrixTotalCellStyle"
          :getFesMatrixTotalChipStyle="getFesMatrixTotalChipStyle"
        />

            <CardSpecialLimitedRecord
          :getRelatedRecordTitle="getRelatedRecordTitle"
          :specialLimitedShowCardImages="specialLimitedShowCardImages"
          :onSpecialLimitedShowCardImagesChange="onSpecialLimitedShowCardImagesChange"
          :isExportingPng="isExportingPng"
          :exportElementPng="exportElementPng"
          :specialLimitedHasDoubleCfes="specialLimitedHasDoubleCfes"
          :specialLimitedUnitGroups="specialLimitedUnitGroups"
          :hasSpecialLimitedDoubleCfes="hasSpecialLimitedDoubleCfes"
          :unitLogoMap="unitLogoMap"
          :getCharAbbr="getCharAbbr"
          :specialLimitedRows="specialLimitedRows"
          :specialLimitedMatrix="specialLimitedMatrix"
          :onMediaImageLoad="onMediaImageLoad"
          :onMediaImageError="onMediaImageError"
          :getCharSingleMark="getCharSingleMark"
          :ATTRS="ATTRS"
          :ATTR_LABELS="ATTR_LABELS"
        />
          </div>
        </div>
</template>

<script setup>
import VsCardLastFourRecord from './VsCardLastFourRecord.vue';
import VsCardFourCountRecord from './VsCardFourCountRecord.vue';
import VsCardUnitScoreRecord from './VsCardUnitScoreRecord.vue';
import VsOriginalCardRecord from './VsOriginalCardRecord.vue';
import CardCfesRecord from './CardCfesRecord.vue';
import CardBfesRecord from './CardBfesRecord.vue';
import CardSpecialLimitedRecord from './CardSpecialLimitedRecord.vue';
defineProps(["specialPanelShowCardImagesAll","specialPanelShowCardImagesIndeterminate","onSpecialPanelShowAllCardImagesChange","isExportingPng","exportElementPng","getRelatedRecordTitle","vsUnitLastFourCompact","onVsUnitLastFourCompactChange","vsUnitLastFourShowCardImages","onVsUnitLastFourShowCardImagesChange","vsUnitLastFourSort","onToggleVsUnitLastFourSort","vsUnitLastFourSortLabel","vsUnitLastFourDisplayRecords","getRecordTint","getCharAbbr","getCharColor","getVsUnitLogoByKey","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS","jumpToHistoryByEventRef","getJumpLinkLabel","VS_NAMES","getVsMiniVsHeadStyle","vsUnitLastFourCompactUnitRows","getVsMiniUnitHeadStyle","unitLogoMap","getVsMiniDataCellStyle","vsUnitFourCountCompact","onVsUnitFourCountCompactChange","vsUnitFourCountShowCardImages","onVsUnitFourCountShowCardImagesChange","vsUnitFourCountSort","onToggleVsUnitFourCountSort","vsUnitFourCountSortLabel","vsUnitFourCountDisplayRecords","getVsUnitVariantAvatarSrc","onVsUnitVariantAvatarError","getVsScoreVsHeadStyle","vsUnitFourCountRows","getVsScoreUnitHeadStyle","getVsFourCountMiniCellClass","getVsScoreCellStyle","vsUnitScoreShowCardImages","onVsUnitScoreShowCardImagesChange","vsUnitScoreAttrByUnitRows","vsOriginalStatShowCardImages","onVsOriginalStatShowCardImagesChange","vsOriginalStatRows","getVsOriginalStatCellStyle","getVsOriginalOtherRowCards","getVsOriginalOtherRowAttrs","fesRecordShowCardImages","onFesRecordShowCardImagesChange","getFesMatrixAttrHeadStyle","RELATED_FES_UNITS","getFesMatrixUnitHeadStyle","getFesMatrixCellStyle","cfesRecordMatrix","getFesMatrixUnitStripCellStyle","getFesMatrixTotalCellStyle","getFesMatrixTotalChipStyle","bfesRecordMatrix","specialLimitedShowCardImages","onSpecialLimitedShowCardImagesChange","specialLimitedHasDoubleCfes","specialLimitedUnitGroups","hasSpecialLimitedDoubleCfes","specialLimitedRows","specialLimitedMatrix","getCharSingleMark"]);
</script>
