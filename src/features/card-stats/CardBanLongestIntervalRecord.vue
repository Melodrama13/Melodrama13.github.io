<template>
<div data-feature-view="card-ban-longest-interval-record" data-feature-page="cards" id="rel-ban-long" data-scroll-anchor="rel-ban-long" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-ban-long') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input class="pjsk-ui-choice" :checked="intervalBanShowCardImages" type="checkbox" @change="onIntervalBanShowCardImagesChange" />
                    显示卡面
                  </label>
                  <div class="head-inline-filters">
                    <label class="head-filter-toggle stats-checkbox" title="统计箱活的Ban间隔。">
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="banEventTypeFilter.includes('箱活')"
                        @change="setBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      箱活
                    </label>
                    <label class="head-filter-toggle stats-checkbox" title="统计混活的Ban间隔。">
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="banEventTypeFilter.includes('混活')"
                        @change="setBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      混活
                    </label>
                  </div>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-ban-long', '间隔记录_Ban最长间隔')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-interval', { 'interval-record-table-card-mode': intervalBanShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="intervalBanShowCardImages">卡面</th>
                    <th>活动始末</th>
                    <th>最长 Ban</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in banLongestDisplayRecords" :key="`ban-long-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'interval-avatar-large': intervalBanShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!intervalBanShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="intervalBanShowCardImages" class="range-card-cell">
                      <template v-if="intervalBanShowCardImages">
                        <div class="interval-card-column">
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.longestStartCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <CardArtwork
                                :src="row.longestStartCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                :attribute="row.longestStartCardAttr"
                                :show-attribute="ATTRS.includes(row.longestStartCardAttr)"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                          <span class="interval-stack-arrow">↓</span>
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.longestEndCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <CardArtwork
                                :src="row.longestEndCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                :attribute="row.longestEndCardAttr"
                                :show-attribute="ATTRS.includes(row.longestEndCardAttr)"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                        </div>
                      </template>
                    </td>
                    <td class="range-cell" :class="{ 'is-card-mode': intervalBanShowCardImages }">
                      <template v-if="intervalBanShowCardImages">
                        <div class="interval-jump-column">
                          <button class="pjsk-ui-action jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)" :data-event-id="row.longest?.startRef?.id">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                          <span class="interval-stack-arrow">↓</span>
                          <button class="pjsk-ui-action jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)" :data-event-id="row.longest?.endRef?.id">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                        </div>
                      </template>
                      <template v-else>
                        <button class="pjsk-ui-action jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)" :data-event-id="row.longest?.startRef?.id">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                        <span>→</span>
                        <button class="pjsk-ui-action jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)" :data-event-id="row.longest?.endRef?.id">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                      </template>
                    </td>
                    <td>{{ formatGapValue(row.longest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
</template>

<script setup>
import CardArtwork from '../../components/ui/CardArtwork.vue';
defineProps(["getRelatedRecordTitle","intervalBanShowCardImages","onIntervalBanShowCardImagesChange","banEventTypeFilter","setBanEventTypeFilter","isExportingPng","exportElementPng","banLongestDisplayRecords","getRecordTint","getCharAbbr","getCharColor","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS","jumpToHistoryByEventRef","getJumpLinkLabel","formatGapValue"]);
</script>
