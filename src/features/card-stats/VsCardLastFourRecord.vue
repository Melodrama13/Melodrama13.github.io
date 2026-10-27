<template>
<div data-feature-view="vs-card-last-four-record" data-feature-page="cards" id="rel-vs-unit-last-four" data-scroll-anchor="rel-vs-unit-last-four" class="record-block">
              <div class="record-head-row">
                <div class="record-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-vs-unit-last-four') }}</h3>
                  <div class="record-head-controls">
                    <label class="record-compact-toggle stats-checkbox">
                      <input class="pjsk-ui-choice" :checked="vsUnitLastFourCompact" type="checkbox" @change="onVsUnitLastFourCompactChange" />
                      简略版本
                    </label>
                    <label v-if="!vsUnitLastFourCompact" class="fes-card-mode-toggle stats-checkbox">
                      <input class="pjsk-ui-choice" :checked="vsUnitLastFourShowCardImages" type="checkbox" @change="onVsUnitLastFourShowCardImagesChange" />
                      显示卡面
                    </label>
                    <button
                      v-if="!vsUnitLastFourCompact"
                      class="pjsk-ui-action record-sort-btn"
                      :class="{ active: vsUnitLastFourSort !== 'char' }"
                      @click="onToggleVsUnitLastFourSort"
                    >
                      {{ vsUnitLastFourSortLabel }}
                    </button>
                  </div>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-vs-unit-last-four', '特殊统计_各团虚拟歌手上次四星')">PNG</button>
              </div>

              <table v-if="!vsUnitLastFourCompact" :class="['record-table', 'related-table', 'related-table-vs-last', { 'vs-last-four-card-mode': vsUnitLastFourShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="vsUnitLastFourShowCardImages">卡面</th>
                    <th>活动</th>
                    <th>日期</th>
                    <th>距今</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitLastFourDisplayRecords" :key="`vs-unit-last-four-${row.key}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <span class="record-avatar-stack">
                        <img
                          :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                          class="record-avatar"
                          :class="{ 'vs-last-four-avatar-large': vsUnitLastFourShowCardImages }"
                          :style="{ borderColor: getCharColor(row.name) }"
                        />
                        <span v-if="getVsUnitLogoByKey(row.key)" class="record-avatar-corner-badge" :class="{ 'is-large': vsUnitLastFourShowCardImages }">
                          <img :src="getVsUnitLogoByKey(row.key)" class="record-avatar-corner-logo" :alt="row.label" />
                        </span>
                      </span>
                      <span v-if="!vsUnitLastFourShowCardImages">{{ row.label }}</span>
                    </td>
                    <td v-if="vsUnitLastFourShowCardImages" class="related-last-card-cell">
                      <div v-if="row.cardImageSrc" class="lineup-slot-card related-last-card-thumb">
                        <CardArtwork
                          :src="row.cardImageSrc"
                          :alt="`${row.label} 卡面`"
                          :attribute="row.cardAttr"
                          :show-attribute="ATTRS.includes(row.cardAttr)"
                          @load="onMediaImageLoad"
                          @error="onMediaImageError"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                    <td>
                      <button class="pjsk-ui-action jump-link" :disabled="!row.eventRef" @click.stop="jumpToHistoryByEventRef(row.eventRef)" :data-event-id="row.eventRef?.id">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                    </td>
                    <td>{{ row.date }}</td>
                    <td>{{ row.days }}天 | {{ row.periods }}期</td>
                  </tr>
                </tbody>
              </table>

              <table v-else class="record-table vs-unit-score-table vs-unit-last-four-mini-table">
                <thead>
                  <tr>
                    <th>团体</th>
                    <th v-for="name in VS_NAMES" :key="`mini-head-${name}`" :style="getVsMiniVsHeadStyle(name)">
                      <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(name) }" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitLastFourCompactUnitRows" :key="`mini-row-${row.unit}`">
                    <td class="record-char vs-score-char-cell" :style="getVsMiniUnitHeadStyle(row.unit)">
                      <img :src="unitLogoMap[row.unit]" class="mini-unit-logo" :alt="row.unit" />
                    </td>
                    <td v-for="name in VS_NAMES" :key="`mini-cell-${row.unit}-${name}`" class="vs-mini-days-cell" :style="getVsMiniDataCellStyle(row.daysByVs[name])">{{ row.daysByVs[name] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
</template>

<script setup>
import CardArtwork from '../../components/ui/CardArtwork.vue';
defineProps(["getRelatedRecordTitle","vsUnitLastFourCompact","onVsUnitLastFourCompactChange","vsUnitLastFourShowCardImages","onVsUnitLastFourShowCardImagesChange","vsUnitLastFourSort","onToggleVsUnitLastFourSort","vsUnitLastFourSortLabel","isExportingPng","exportElementPng","vsUnitLastFourDisplayRecords","getRecordTint","getCharAbbr","getCharColor","getVsUnitLogoByKey","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS","jumpToHistoryByEventRef","getJumpLinkLabel","VS_NAMES","getVsMiniVsHeadStyle","vsUnitLastFourCompactUnitRows","getVsMiniUnitHeadStyle","unitLogoMap","getVsMiniDataCellStyle"]);
</script>
