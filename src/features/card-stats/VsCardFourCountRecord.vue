<template>
<div data-feature-view="vs-card-four-count-record" data-feature-page="cards" id="rel-vs-unit-four-count" data-scroll-anchor="rel-vs-unit-four-count" class="record-block">
              <div class="record-head-row">
                <div class="record-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-vs-unit-four-count') }}</h3>
                  <div class="record-head-controls">
                    <label class="record-compact-toggle stats-checkbox">
                      <input class="pjsk-ui-choice" :checked="vsUnitFourCountCompact" type="checkbox" @change="onVsUnitFourCountCompactChange" />
                      简略版本
                    </label>
                    <label v-if="!vsUnitFourCountCompact" class="fes-card-mode-toggle stats-checkbox">
                      <input class="pjsk-ui-choice" :checked="vsUnitFourCountShowCardImages" type="checkbox" @change="onVsUnitFourCountShowCardImagesChange" />
                      显示卡面
                    </label>
                    <button
                      v-if="!vsUnitFourCountCompact"
                      class="pjsk-ui-action record-sort-btn"
                      :class="{ active: vsUnitFourCountSort !== 'char' }"
                      @click="onToggleVsUnitFourCountSort"
                    >
                      {{ vsUnitFourCountSortLabel }}
                    </button>
                  </div>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-vs-unit-four-count', '特殊统计_各团VS四星数')">PNG</button>
              </div>

              <table v-if="!vsUnitFourCountCompact" :class="['record-table', 'related-table', 'related-table-vs-last', 'vs-four-count-detail-table', { 'vs-last-four-card-mode': vsUnitFourCountShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>数量</th>
                    <th>{{ vsUnitFourCountShowCardImages ? '卡面' : '属性' }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitFourCountDisplayRecords" :key="`vs-four-detail-row-${row.key}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <span class="record-avatar-stack">
                        <img
                          :src="getVsUnitVariantAvatarSrc(row.key, row.name)"
                          class="record-avatar"
                          :class="{ 'vs-last-four-avatar-large': vsUnitFourCountShowCardImages }"
                          :style="{ borderColor: getCharColor(row.name) }"
                          @error="onVsUnitVariantAvatarError"
                        />
                        <span v-if="getVsUnitLogoByKey(row.key)" class="record-avatar-corner-badge" :class="{ 'is-large': vsUnitFourCountShowCardImages }">
                          <img :src="getVsUnitLogoByKey(row.key)" class="record-avatar-corner-logo" :alt="row.label" />
                        </span>
                      </span>
                      <span v-if="!vsUnitFourCountShowCardImages">{{ row.label }}</span>
                    </td>
                    <td class="vs-four-count-value-cell"><span class="vs-four-count-value">{{ row.count }}</span></td>
                    <td>
                      <template v-if="vsUnitFourCountShowCardImages">
                        <div v-if="row.cards.length" class="score-card-wrap">
                          <div
                            v-for="(card, idx) in row.cards"
                            :key="`vs-four-card-${row.key}-${card.cardId || 'na'}-${idx}`"
                            class="fes-card-thumb"
                            :title="`${row.label} #${card.cardId || '-'}`"
                          >
                            <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                            <img crossorigin="anonymous"
                              v-if="card.imageSrc"
                              :src="card.imageSrc"
                              :alt="`${row.label} 卡面`"
                              class="fes-card-thumb-img media-load-shimmer"
                              loading="lazy"
                              decoding="async"
                              @load="onMediaImageLoad"
                              @error="onMediaImageError"
                            />
                            <img
                              v-if="ATTRS.includes(card.attr)"
                              :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                              class="fes-card-thumb-attr"
                              :alt="ATTR_LABELS[card.attr]"
                              :title="ATTR_LABELS[card.attr]"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        </div>
                        <span v-else class="score-empty">-</span>
                      </template>
                      <template v-else>
                        <div v-if="row.attrs.length" class="score-attr-wrap">
                          <img
                            v-for="(attr, idx) in row.attrs"
                            :key="`vs-four-attr-${row.key}-${idx}`"
                            :src="`/elements/${String(attr).toLowerCase()}.png`"
                            :title="ATTR_LABELS[attr] || attr"
                            :alt="ATTR_LABELS[attr] || attr"
                            class="score-attr-icon"
                          />
                        </div>
                        <span v-else class="score-empty">-</span>
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table v-else class="record-table vs-unit-score-table vs-unit-last-four-mini-table">
                <thead>
                  <tr>
                    <th>团体</th>
                    <th v-for="name in VS_NAMES" :key="`vs-four-count-head-${name}`" :style="getVsScoreVsHeadStyle(name)">
                      <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(name) }" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitFourCountRows" :key="`vs-four-count-row-${row.unit}`">
                    <td class="record-char vs-score-char-cell" :style="getVsScoreUnitHeadStyle(row.unit)">
                      <img :src="unitLogoMap[row.unit]" class="mini-unit-logo" :alt="row.unit" />
                    </td>
                    <td
                      v-for="name in VS_NAMES"
                      :key="`vs-four-count-cell-${row.unit}-${name}`"
                      :class="['vs-mini-days-cell', getVsFourCountMiniCellClass(row.countByVs[name])]"
                      :style="getVsScoreCellStyle(name, row.unit)"
                    >
                      <span v-if="Number(row.countByVs[name] || 0) > 0">{{ row.countByVs[name] }}</span>
                      <span v-else class="score-empty">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
</template>

<script setup>
defineProps(["getRelatedRecordTitle","vsUnitFourCountCompact","onVsUnitFourCountCompactChange","vsUnitFourCountShowCardImages","onVsUnitFourCountShowCardImagesChange","vsUnitFourCountSort","onToggleVsUnitFourCountSort","vsUnitFourCountSortLabel","isExportingPng","exportElementPng","vsUnitFourCountDisplayRecords","getRecordTint","getVsUnitVariantAvatarSrc","getCharColor","onVsUnitVariantAvatarError","getVsUnitLogoByKey","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS","VS_NAMES","getVsScoreVsHeadStyle","getCharAbbr","vsUnitFourCountRows","getVsScoreUnitHeadStyle","unitLogoMap","getVsFourCountMiniCellClass","getVsScoreCellStyle"]);
</script>
