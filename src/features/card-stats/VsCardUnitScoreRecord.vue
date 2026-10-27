<template>
<div data-feature-view="vs-card-unit-score-record" data-feature-page="cards" id="rel-vs-unit-score" data-scroll-anchor="rel-vs-unit-score" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-vs-unit-score') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input class="pjsk-ui-choice" :checked="vsUnitScoreShowCardImages" type="checkbox" @change="onVsUnitScoreShowCardImagesChange" />
                    <span>显示卡面</span>
                  </label>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-vs-unit-score', '特殊统计_团分统计')">PNG</button>
              </div>
              <table :class="['record-table', 'vs-unit-score-table', { 'is-card-mode': vsUnitScoreShowCardImages }]">
                <thead>
                  <tr>
                    <th>团体</th>
                    <th v-for="name in VS_NAMES" :key="`score-head-${name}`" :style="getVsScoreVsHeadStyle(name)">
                      <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(name) }" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitScoreAttrByUnitRows" :key="`score-row-${row.unit}`">
                    <td class="record-char vs-score-char-cell" :style="getVsScoreUnitHeadStyle(row.unit)">
                      <img :src="unitLogoMap[row.unit]" class="mini-unit-logo" :alt="row.unit" />
                    </td>
                    <td v-for="name in VS_NAMES" :key="`score-cell-${row.unit}-${name}`" :style="getVsScoreCellStyle(name, row.unit)">
                      <div v-if="vsUnitScoreShowCardImages && row.cardsByVs[name]?.length" class="score-card-wrap">
                        <div
                          v-for="(card, idx) in row.cardsByVs[name]"
                          :key="`score-card-${row.unit}-${name}-${card.cardId || 'na'}-${idx}`"
                          class="fes-card-thumb"
                          :title="`${name} #${card.cardId || '-'}`"
                        >
                          <CardArtwork
                            :src="card.imageSrc"
                            :alt="`${name} 卡面`"
                            :attribute="card.attr"
                            :show-attribute="ATTRS.includes(card.attr)"
                            @load="onMediaImageLoad"
                            @error="onMediaImageError"
                          />
                        </div>
                      </div>
                      <div v-else-if="row.attrsByVs[name]?.length" class="score-attr-wrap">
                        <img
                          v-for="(attr, idx) in row.attrsByVs[name]"
                          :key="`score-attr-${row.unit}-${name}-${idx}`"
                          :src="`/elements/attr_${String(attr).toLowerCase()}_v1.png`"
                          :title="attr"
                          class="score-attr-icon"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
</template>

<script setup>
import CardArtwork from '../../components/ui/CardArtwork.vue';
defineProps(["getRelatedRecordTitle","vsUnitScoreShowCardImages","onVsUnitScoreShowCardImagesChange","isExportingPng","exportElementPng","VS_NAMES","getVsScoreVsHeadStyle","getCharAbbr","getCharColor","vsUnitScoreAttrByUnitRows","getVsScoreUnitHeadStyle","unitLogoMap","getVsScoreCellStyle","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS"]);
</script>
