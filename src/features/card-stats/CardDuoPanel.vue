<template>
<div data-feature-view="card-duo-panel" data-feature-page="cards" id="panel-duo" data-scroll-anchor="panel-duo" class="stats-section card-panel related-panel duo-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>双人统计</h2>
            </div>
            <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-duo', '双人统计')">PNG</button>
          </div>

          <div class="record-grid duo-record-grid">
            <div id="duo-unit-pool" data-scroll-anchor="duo-unit-pool" class="record-block duo-record-block duo-wide-block duo-unit-section">
              <div class="block-head duo-block-head">
                <div class="block-head-left">
                  <div class="duo-block-title-row">
                    <h3>{{ getRelatedRecordTitle('duo-unit-pool') }}</h3>
                    <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('duo-unit-pool', '双人统计_各团同池统计')">PNG</button>
                  </div>
                  <div class="duo-filter-row">
                    <label
                      v-for="option in DUO_FILTER_OPTIONS"
                      :key="`unit-filter-${option.value}`"
                      class="head-filter-toggle stats-checkbox"
                      :title="option.title"
                    >
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="isDuoUnitGlobalFilterChecked(option.value)"
                        :indeterminate="isDuoUnitGlobalFilterIndeterminate(option.value)"
                        @change="onDuoFilterChange('unit', option.value, $event)"
                      />
                      {{ option.label }}
                    </label>
                    <label class="head-filter-toggle stats-checkbox" title="勾选后显示上次同池组合二人的当期卡面。">
                      <input class="pjsk-ui-choice"
                        :checked="duoLastPoolShowCardImagesAll"
                        :indeterminate="duoLastPoolShowCardImagesIndeterminate"
                        type="checkbox"
                        @change="onDuoLastPoolShowCardImagesChange"
                      />
                      显示卡面
                    </label>
                  </div>
                </div>
              </div>
              <div class="duo-unit-row-list">
                <div
                  v-for="unitRow in duoUnitRows"
                  :key="unitRow.id"
                  :id="unitRow.id"
                  class="duo-unit-row duo-unit-combined-card"
                  :style="{ '--duo-unit-color': getUnitAccentColor(unitRow.unit) }"
                >
                  <div class="duo-unit-combined-head">
                    <span class="duo-unit-combined-title">
                      <img v-if="unitLogoMap[unitRow.unit]" :src="unitLogoMap[unitRow.unit]" class="duo-unit-logo" :alt="unitRow.title" />
                      {{ unitRow.title }}
                    </span>
                    <button class="pjsk-ui-action card-export-btn duo-unit-export-btn" :disabled="isExportingPng" @click="exportElementPng(unitRow.id, `双人统计_${unitRow.title}_同池统计`)">PNG</button>
                  </div>
                  <div class="duo-unit-pair-grid">
                  <div class="duo-unit-card duo-unit-card-matrix">
                    <div class="duo-unit-title duo-unit-subhead">
                      <span class="duo-unit-title-main">
                        <img v-if="unitLogoMap[unitRow.unit]" :src="unitLogoMap[unitRow.unit]" class="duo-unit-logo" :alt="unitRow.title" />
                        <span>同池次数</span>
                      </span>
                      <button class="pjsk-ui-action card-export-btn duo-unit-export-btn duo-unit-export-btn-matrix-mobile" :disabled="isExportingPng" @click="exportElementPng(unitRow.id, `双人统计_${unitRow.title}_同池统计`)">PNG</button>
                      <div class="duo-unit-title-actions duo-unit-filter-row">
                        <label
                          v-for="option in DUO_FILTER_OPTIONS"
                          :key="`${unitRow.unit}-filter-${option.value}`"
                          class="head-filter-toggle stats-checkbox"
                          :title="option.title"
                        >
                          <input class="pjsk-ui-choice"
                            type="checkbox"
                            :checked="unitRow.filters.includes(option.value)"
                            @change="onDuoUnitFilterChange(unitRow.unit, option.value, $event)"
                          />
                          {{ option.label }}
                        </label>
                      </div>
                    </div>
                    <div class="matrix-wrap duo-matrix-wrap duo-unit-wrap">
                      <table :class="['matrix-table', 'duo-table', 'duo-unit-table', { 'duo-unit-limited-table': unitRow.isLimitedOnly }]">
                        <thead>
                          <tr>
                            <th class="duo-corner-cell"></th>
                            <th v-for="col in unitRow.matrix.columns" :key="col.key" class="duo-char-head" :style="getDuoHeadCellStyle(col)">
                              <img :src="col.avatarSrc" class="duo-head-avatar" :title="col.title || col.name" :style="{ borderColor: col.color }" />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="row in unitRow.matrix.rows"
                            :key="row.key"
                            :class="{ 'duo-vs-row': row.isVs }"
                            :style="{ backgroundColor: row.tint }"
                          >
                            <td class="row-char duo-row-char" :style="{ backgroundColor: row.unitTint }">
                              <img :src="row.avatarSrc" class="mini-avatar" :title="row.title || row.name" :style="{ borderColor: row.color }" />
                            </td>
                            <td
                              v-for="cell in row.cells"
                              :key="cell.key"
                              class="matrix-num duo-num"
                              :class="getDuoMatrixCellClass(cell)"
                              :style="getDuoMatrixCellStyle(cell)"
                            >
                              {{ formatDuoCount(cell.value) }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div class="duo-unit-card duo-unit-card-last">
                    <div class="duo-unit-title duo-unit-subhead duo-unit-last-subhead">
                      <span class="duo-unit-title-main">
                        <img v-if="unitLogoMap[unitRow.unit]" :src="unitLogoMap[unitRow.unit]" class="duo-unit-logo" :alt="unitRow.title" />
                        <span>上次同池</span>
                      </span>
                      <div class="duo-unit-title-actions">
                        <label class="head-filter-toggle stats-checkbox" title="勾选后显示上次同池组合二人的当期卡面。">
                          <input class="pjsk-ui-choice" :checked="unitRow.showCardImages" type="checkbox" @change="onDuoUnitLastPoolShowCardImagesChange(unitRow.unit, $event)" />
                          显示卡面
                        </label>
                        <button class="pjsk-ui-action card-export-btn duo-unit-export-btn duo-unit-export-btn-inline" :disabled="isExportingPng" @click="exportElementPng(unitRow.id, `双人统计_${unitRow.title}_同池统计`)">PNG</button>
                      </div>
                    </div>
                    <table :class="['record-table', 'related-table', 'related-table-last', 'duo-last-table', { 'duo-last-card-mode': unitRow.showCardImages }]">
                      <thead>
                        <tr>
                          <th>组合</th>
                          <th v-if="unitRow.showCardImages">卡面</th>
                          <template v-if="unitRow.showCardImages">
                            <th class="duo-last-event-date-head">活动/日期</th>
                            <th class="duo-last-info-head">时间</th>
                            <th class="duo-last-gap-head">距今</th>
                          </template>
                          <template v-else>
                            <th>活动</th>
                            <th>日期</th>
                            <th>距今</th>
                          </template>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in unitRow.lastRows" :key="row.key" :style="{ backgroundColor: row.tint, '--record-tint': row.tint }">
                          <td class="duo-pair-cell">
                            <img
                              v-for="member in row.members"
                              :key="member.key"
                              :src="member.avatarSrc"
                              class="duo-pair-avatar"
                              :title="member.name"
                              :style="{ borderColor: member.color }"
                            />
                          </td>
                          <td v-if="unitRow.showCardImages" class="duo-last-card-cell">
                            <div class="duo-last-card-pair">
                              <div
                                v-for="card in row.cards"
                                :key="card.key"
                                class="duo-last-card-item"
                              >
                                <div v-if="card.imageSrc" class="lineup-slot-card related-last-card-thumb duo-last-card-thumb">
                                  <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                                  <img crossorigin="anonymous"
                                    :src="card.imageSrc"
                                    class="lineup-slot-card-img media-load-shimmer"
                                    :alt="`${card.name} 卡面`"
                                    loading="lazy"
                                    decoding="async"
                                    @load="onMediaImageLoad"
                                    @error="onMediaImageError"
                                  />
                                  <img
                                    v-if="ATTRS.includes(card.attr)"
                                    :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                                    :alt="ATTR_LABELS[card.attr]"
                                    :title="ATTR_LABELS[card.attr]"
                                    class="related-last-card-attr"
                                  />
                                </div>
                                <span v-else class="score-empty">-</span>
                              </div>
                            </div>
                          </td>
                          <template v-if="unitRow.showCardImages">
                            <td class="duo-last-event-date-cell">
                              <div class="duo-last-info-stack">
                                <button class="pjsk-ui-action jump-link" :disabled="!row.eventRef" @click.stop="jumpToHistoryByEventRef(row.eventRef)" :data-event-id="row.eventRef?.id">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                                <span class="duo-last-date-text">{{ row.date }}</span>
                              </div>
                            </td>
                            <td class="duo-last-info-cell">
                              <div class="duo-last-info-stack">
                                <button class="pjsk-ui-action jump-link" :disabled="!row.eventRef" @click.stop="jumpToHistoryByEventRef(row.eventRef)" :data-event-id="row.eventRef?.id">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                                <span class="duo-last-date-text">{{ row.date }}</span>
                                <span class="duo-last-gap-text">{{ row.gapText }}</span>
                              </div>
                            </td>
                            <td class="duo-last-gap-cell">{{ row.gapText }}</td>
                          </template>
                          <template v-else>
                            <td>
                            <button class="pjsk-ui-action jump-link" :disabled="!row.eventRef" @click.stop="jumpToHistoryByEventRef(row.eventRef)" :data-event-id="row.eventRef?.id">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                            </td>
                            <td>{{ row.date }}</td>
                            <td>{{ row.gapText }}</td>
                          </template>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  </div>
                </div>
              </div>
            </div>

            <div id="duo-pool" data-scroll-anchor="duo-pool" class="record-block duo-record-block duo-wide-block">
              <div class="block-head duo-block-head">
                <div class="block-head-left">
                  <div class="duo-block-title-row">
                    <h3>{{ getRelatedRecordTitle('duo-pool') }}</h3>
                    <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('duo-pool', '双人统计_同池统计')">PNG</button>
                  </div>
                  <div class="duo-filter-row">
                    <label
                      v-for="option in DUO_FILTER_OPTIONS"
                      :key="`pool-filter-${option.value}`"
                      class="head-filter-toggle stats-checkbox"
                      :title="option.title"
                    >
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="duoPoolFilters.includes(option.value)"
                        @change="onDuoFilterChange('pool', option.value, $event)"
                      />
                      {{ option.label }}
                    </label>
                  </div>
                </div>
              </div>
              <div class="matrix-wrap duo-matrix-wrap duo-full-wrap">
                <table class="matrix-table duo-table duo-full-table">
                  <thead>
                    <tr>
                      <th class="duo-corner-cell">角色</th>
                      <th v-for="col in duoPoolMatrix.columns" :key="col.key" class="duo-char-head" :style="getDuoHeadCellStyle(col)">
                        <img :src="col.avatarSrc" class="duo-head-avatar" :title="col.title || col.name" :style="{ borderColor: col.color }" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in duoPoolMatrix.rows"
                      :key="row.key"
                      :class="{ 'duo-vs-row': row.isVs }"
                      :style="{ backgroundColor: row.tint }"
                    >
                      <td class="row-char duo-row-char" :style="{ backgroundColor: row.unitTint }">
                        <img :src="row.avatarSrc" class="mini-avatar" :title="row.title || row.name" :style="{ borderColor: row.color }" />
                      </td>
                      <td
                        v-for="cell in row.cells"
                        :key="cell.key"
                        class="matrix-num duo-num"
                        :class="getDuoMatrixCellClass(cell)"
                        :style="getDuoMatrixCellStyle(cell)"
                      >
                        {{ formatDuoCount(cell.value) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div id="duo-event" data-scroll-anchor="duo-event" class="record-block duo-record-block duo-wide-block">
              <div class="block-head duo-block-head">
                <div class="block-head-left">
                  <div class="duo-block-title-row">
                    <h3>{{ getRelatedRecordTitle('duo-event') }}</h3>
                    <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('duo-event', '双人统计_同活统计')">PNG</button>
                  </div>
                  <div class="duo-filter-row">
                    <label
                      v-for="option in DUO_FILTER_OPTIONS"
                      :key="`event-filter-${option.value}`"
                      class="head-filter-toggle stats-checkbox"
                      :title="option.title"
                    >
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="duoEventFilters.includes(option.value)"
                        @change="onDuoFilterChange('event', option.value, $event)"
                      />
                      {{ option.label }}
                    </label>
                  </div>
                </div>
              </div>
              <div class="matrix-wrap duo-matrix-wrap duo-full-wrap">
                <table class="matrix-table duo-table duo-full-table">
                  <thead>
                    <tr>
                      <th class="duo-corner-cell">角色</th>
                      <th v-for="col in duoEventMatrix.columns" :key="col.key" class="duo-char-head" :style="getDuoHeadCellStyle(col)">
                        <img :src="col.avatarSrc" class="duo-head-avatar" :title="col.title || col.name" :style="{ borderColor: col.color }" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in duoEventMatrix.rows"
                      :key="row.key"
                      :class="{ 'duo-vs-row': row.isVs }"
                      :style="{ backgroundColor: row.tint }"
                    >
                      <td class="row-char duo-row-char" :style="{ backgroundColor: row.unitTint }">
                        <img :src="row.avatarSrc" class="mini-avatar" :title="row.title || row.name" :style="{ borderColor: row.color }" />
                      </td>
                      <td
                        v-for="cell in row.cells"
                        :key="cell.key"
                        class="matrix-num duo-num"
                        :class="getDuoMatrixCellClass(cell)"
                        :style="getDuoMatrixCellStyle(cell)"
                      >
                        {{ formatDuoCount(cell.value) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
</template>

<script setup>
defineProps(["isExportingPng","exportElementPng","getRelatedRecordTitle","DUO_FILTER_OPTIONS","isDuoUnitGlobalFilterChecked","isDuoUnitGlobalFilterIndeterminate","onDuoFilterChange","duoLastPoolShowCardImagesAll","duoLastPoolShowCardImagesIndeterminate","onDuoLastPoolShowCardImagesChange","duoUnitRows","getUnitAccentColor","unitLogoMap","onDuoUnitFilterChange","getDuoHeadCellStyle","getDuoMatrixCellClass","getDuoMatrixCellStyle","formatDuoCount","onDuoUnitLastPoolShowCardImagesChange","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS","jumpToHistoryByEventRef","getJumpLinkLabel","duoPoolFilters","duoPoolMatrix","duoEventFilters","duoEventMatrix"]);
</script>
