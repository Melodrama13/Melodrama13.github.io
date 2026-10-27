<template>
<div data-feature-view="vs-original-card-record" data-feature-page="cards" id="rel-vs-original-stat" data-scroll-anchor="rel-vs-original-stat" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-vs-original-stat') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input class="pjsk-ui-choice" :checked="vsOriginalStatShowCardImages" type="checkbox" @change="onVsOriginalStatShowCardImagesChange" />
                    <span>显示卡面</span>
                  </label>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-vs-original-stat', '特殊统计_原V统计')">PNG</button>
              </div>
              <table :class="['record-table', 'vs-unit-score-table', 'vs-original-stat-table', { 'is-card-mode': vsOriginalStatShowCardImages }]">
                <thead>
                  <tr>
                    <th>类型</th>
                    <th v-for="name in VS_NAMES" :key="`vs-original-head-${name}`" :style="getVsScoreVsHeadStyle(name)">
                      <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(name) }" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsOriginalStatRows" :key="`vs-original-row-${row.type}`">
                    <td class="record-char vs-original-type-cell">{{ row.type }}</td>
                    <td
                      v-if="vsOriginalStatShowCardImages && row.type === '其他'"
                      :colspan="VS_NAMES.length"
                      :style="getVsOriginalStatCellStyle(VS_NAMES[0] || '')"
                    >
                      <div v-if="getVsOriginalOtherRowCards(row).length" class="score-card-wrap score-card-wrap-merged-six">
                        <div
                          v-for="(card, idx) in getVsOriginalOtherRowCards(row)"
                          :key="`vs-original-other-card-${card.cardId || 'na'}-${idx}`"
                          class="fes-card-thumb"
                          :title="`${card.name} #${card.cardId || '-'}`"
                        >
                          <CardArtwork
                            :src="card.imageSrc"
                            :alt="`${card.name} 卡面`"
                            :attribute="card.attr"
                            :show-attribute="ATTRS.includes(card.attr)"
                            @load="onMediaImageLoad"
                            @error="onMediaImageError"
                          />
                        </div>
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                    <td
                      v-else-if="!vsOriginalStatShowCardImages && row.type === '其他'"
                      :colspan="VS_NAMES.length"
                      class="vs-original-other-compact-cell"
                    >
                      <div class="score-attr-wrap">
                        <img
                          v-for="(attr, idx) in getVsOriginalOtherRowAttrs(row)"
                          :key="`vs-original-other-compact-attr-${idx}`"
                          :src="`/elements/attr_${String(attr).toLowerCase()}_v1.png`"
                          :title="ATTR_LABELS[attr] || attr"
                          :alt="ATTR_LABELS[attr] || attr"
                          class="score-attr-icon"
                        />
                      </div>
                      <span v-if="!getVsOriginalOtherRowAttrs(row).length" class="score-empty">-</span>
                    </td>
                    <template v-else>
                      <td v-for="name in VS_NAMES" :key="`vs-original-cell-${row.type}-${name}`" :style="getVsOriginalStatCellStyle(name)">
                        <div v-if="vsOriginalStatShowCardImages && row.cardsByVs[name]?.length" class="score-card-wrap">
                          <div
                            v-for="(card, idx) in row.cardsByVs[name]"
                            :key="`vs-original-card-${row.type}-${name}-${card.cardId || 'na'}-${idx}`"
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
                            :key="`vs-original-attr-${row.type}-${name}-${idx}`"
                            :src="`/elements/attr_${String(attr).toLowerCase()}_v1.png`"
                            :title="ATTR_LABELS[attr] || attr"
                            :alt="ATTR_LABELS[attr] || attr"
                            class="score-attr-icon"
                          />
                        </div>
                        <span v-else class="score-empty">-</span>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>
</template>

<script setup>
import CardArtwork from '../../components/ui/CardArtwork.vue';
defineProps(["getRelatedRecordTitle","vsOriginalStatShowCardImages","onVsOriginalStatShowCardImagesChange","isExportingPng","exportElementPng","VS_NAMES","getVsScoreVsHeadStyle","getCharAbbr","getCharColor","vsOriginalStatRows","getVsOriginalStatCellStyle","getVsOriginalOtherRowCards","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS","getVsOriginalOtherRowAttrs"]);
</script>
