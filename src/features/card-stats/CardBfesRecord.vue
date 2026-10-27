<template>
<div data-feature-view="card-bfes-record" data-feature-page="cards" id="rel-bfes-stat" data-scroll-anchor="rel-bfes-stat" class="record-block fes-record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-bfes-stat') }}</h3>
                  <label class="support-wl-toggle fes-card-mode-toggle stats-checkbox export-hide">
                    <input class="pjsk-ui-choice" :checked="fesRecordShowCardImages" type="checkbox" @change="onFesRecordShowCardImagesChange" />
                    <span>显示卡面</span>
                  </label>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-bfes-stat', '特殊统计_BFES统计')">PNG</button>
              </div>
              <table class="record-table fes-record-table" :class="{ 'is-card-mode': fesRecordShowCardImages }">
                <thead>
                  <tr>
                    <th class="fes-row-head" aria-label="团体"></th>
                    <th v-if="!fesRecordShowCardImages" v-for="attr in ATTRS" :key="`bfes-head-${attr}`" :style="getFesMatrixAttrHeadStyle(attr)">
                      <img :src="`/elements/attr_${String(attr).toLowerCase()}_v1.png`" class="fes-attr-icon" :alt="ATTR_LABELS[attr]" :title="ATTR_LABELS[attr]" />
                    </th>
                    <th v-else class="fes-cards-head">卡面</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="unit in RELATED_FES_UNITS" :key="`bfes-row-${unit}`">
                    <td class="fes-unit-head" :style="getFesMatrixUnitHeadStyle(unit)">
                      <img :src="unitLogoMap[unit]" class="mini-unit-logo" :alt="unit" :title="unit.toUpperCase()" />
                    </td>
                    <td
                      v-if="!fesRecordShowCardImages"
                      v-for="attr in ATTRS"
                      :key="`bfes-cell-${unit}-${attr}`"
                      :style="getFesMatrixCellStyle(unit, attr)"
                    >
                      <div v-if="bfesRecordMatrix.iconRows[unit][attr]?.length" class="fes-cell-icons">
                        <img
                          v-for="icon in bfesRecordMatrix.iconRows[unit][attr]"
                          :key="`bfes-icon-${unit}-${attr}-${icon.iconKey}`"
                          :src="`/chibi_s/${icon.iconKey}.webp`"
                          class="fes-cell-avatar"
                          :title="icon.name"
                          :alt="icon.name"
                          :style="{ borderColor: getCharColor(icon.name) }"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                    <td v-else class="fes-card-strip-cell" :style="getFesMatrixUnitStripCellStyle(unit)">
                      <div class="fes-card-strip">
                        <div
                          v-for="(card, cardIdx) in bfesRecordMatrix.cardsByUnit[unit]"
                          :key="`bfes-card-${unit}-${card.cardId || 'na'}-${card.name}-${cardIdx}`"
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
                        <span v-if="!bfesRecordMatrix.cardsByUnit[unit]?.length" class="score-empty">-</span>
                      </div>
                    </td>
                  </tr>
                  <tr class="fes-total-row">
                    <td class="fes-total-head">总计</td>
                    <td v-if="!fesRecordShowCardImages" v-for="attr in ATTRS" :key="`bfes-total-${attr}`" class="fes-total-num" :style="getFesMatrixTotalCellStyle(attr)">
                      {{ bfesRecordMatrix.totals[attr] }}
                    </td>
                    <td v-else class="fes-total-attr-wrap-cell">
                      <div class="fes-total-attr-wrap">
                        <span v-for="attr in ATTRS" :key="`bfes-total-card-${attr}`" class="fes-total-attr-item" :style="getFesMatrixTotalChipStyle(attr)">
                          <img :src="`/elements/attr_${String(attr).toLowerCase()}_v1.png`" class="fes-total-attr-icon" :alt="ATTR_LABELS[attr]" :title="ATTR_LABELS[attr]" />
                          <span class="fes-total-attr-num">{{ bfesRecordMatrix.totals[attr] }}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
</template>

<script setup>
import CardArtwork from '../../components/ui/CardArtwork.vue';
defineProps(["getRelatedRecordTitle","fesRecordShowCardImages","onFesRecordShowCardImagesChange","isExportingPng","exportElementPng","ATTRS","getFesMatrixAttrHeadStyle","ATTR_LABELS","RELATED_FES_UNITS","getFesMatrixUnitHeadStyle","unitLogoMap","getFesMatrixCellStyle","bfesRecordMatrix","getCharColor","getFesMatrixUnitStripCellStyle","onMediaImageLoad","onMediaImageError","getFesMatrixTotalCellStyle","getFesMatrixTotalChipStyle"]);
</script>
