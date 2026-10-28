<template>
<div data-feature-view="card-limited-longest-interval-record" data-feature-page="cards" id="rel-limited-long" data-scroll-anchor="rel-limited-long" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-limited-long') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input class="pjsk-ui-choice" :checked="intervalLimitedShowCardImages" type="checkbox" @change="onIntervalLimitedShowCardImagesChange" />
                    显示卡面
                  </label>
                  <label class="reward-collab-toggle stats-checkbox" title="勾选后，限定统计会计入发限WL卡。">
                    <input class="pjsk-ui-choice" v-model="limitedIncludeWl3" type="checkbox" />
                    <span>{{ isMobileNav ? '发限WL' : '统计发限WL' }}</span>
                  </label>
                  <label class="reward-collab-toggle stats-checkbox" title="勾选后，限定统计会计入歌限卡。">
                    <input class="pjsk-ui-choice" v-model="limitedIncludeSongLimited" type="checkbox" />
                    <span>{{ isMobileNav ? '歌限' : '统计歌限' }}</span>
                  </label>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-limited-long', '间隔记录_限定最长间隔')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-interval', { 'interval-record-table-card-mode': intervalLimitedShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="intervalLimitedShowCardImages">卡面</th>
                    <th>活动始末</th>
                    <th>最长</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in limitedLongestDisplayRecords" :key="`lim-long-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'interval-avatar-large': intervalLimitedShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!intervalLimitedShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="intervalLimitedShowCardImages" class="range-card-cell">
                      <template v-if="intervalLimitedShowCardImages">
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
                    <td class="range-cell" :class="{ 'is-card-mode': intervalLimitedShowCardImages }">
                      <template v-if="intervalLimitedShowCardImages">
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
defineProps(["getRelatedRecordTitle","intervalLimitedShowCardImages","onIntervalLimitedShowCardImagesChange","isMobileNav","isExportingPng","exportElementPng","limitedLongestDisplayRecords","getRecordTint","getCharAbbr","getCharColor","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS","jumpToHistoryByEventRef","getJumpLinkLabel","formatGapValue"]);
const limitedIncludeWl3 = defineModel('limitedIncludeWl3');
const limitedIncludeSongLimited = defineModel('limitedIncludeSongLimited');
</script>
