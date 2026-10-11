<template>
<div data-feature-view="card-last-limited-record" data-feature-page="cards" id="rel-last-limited" data-scroll-anchor="rel-last-limited" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-last-limited') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input class="pjsk-ui-choice" :checked="relatedLastRecordShowCardImages" type="checkbox" @change="onRelatedLastRecordShowCardImagesChange" />
                    显示卡面
                  </label>
                  <label class="reward-collab-toggle stats-checkbox" title="勾选后，限定统计会计入WL3卡。">
                    <input class="pjsk-ui-choice" v-model="limitedIncludeWl3" type="checkbox" />
                    <span>{{ isMobileNav ? 'WL3' : '统计WL3' }}</span>
                  </label>
                  <label class="reward-collab-toggle stats-checkbox" title="勾选后，限定统计会计入歌限卡。">
                    <input class="pjsk-ui-choice" v-model="limitedIncludeSongLimited" type="checkbox" />
                    <span>{{ isMobileNav ? '歌限' : '统计歌限' }}</span>
                  </label>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-last-limited', '间隔记录_上一次限定')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-last', { 'last-record-table-card-mode': relatedLastRecordShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="relatedLastRecordShowCardImages">卡面</th>
                    <th>活动</th>
                    <th>日期</th>
                    <th>距今</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in lastLimitedDisplayRecords" :key="`last-limited-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'related-last-avatar-large': relatedLastRecordShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!relatedLastRecordShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="relatedLastRecordShowCardImages" class="related-last-card-cell">
                      <div v-if="row.cardImageSrc" class="lineup-slot-card related-last-card-thumb">
                        <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                        <img crossorigin="anonymous"
                          :src="row.cardImageSrc"
                          :alt="`${row.name} 卡面`"
                          class="lineup-slot-card-img media-load-shimmer"
                          loading="lazy"
                          decoding="async"
                          @load="onMediaImageLoad"
                          @error="onMediaImageError"
                        />
                        <img
                          v-if="ATTRS.includes(row.cardAttr)"
                          :src="`/elements/${String(row.cardAttr).toLowerCase()}.png`"
                          :alt="ATTR_LABELS[row.cardAttr]"
                          :title="ATTR_LABELS[row.cardAttr]"
                          class="related-last-card-attr"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                    <td>
                      <button class="pjsk-ui-action jump-link" @click.stop="jumpToHistoryByEventRef(row.eventRef)" :data-event-id="row.eventRef?.id">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                    </td>
                    <td>{{ row.date }}</td>
                    <td>{{ row.months }}个月 | {{ row.periods }}期</td>
                  </tr>
                </tbody>
              </table>
            </div>
</template>

<script setup>
defineProps(["getRelatedRecordTitle","relatedLastRecordShowCardImages","onRelatedLastRecordShowCardImagesChange","isMobileNav","isExportingPng","exportElementPng","lastLimitedDisplayRecords","getRecordTint","getCharAbbr","getCharColor","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS","jumpToHistoryByEventRef","getJumpLinkLabel"]);
const limitedIncludeWl3 = defineModel('limitedIncludeWl3');
const limitedIncludeSongLimited = defineModel('limitedIncludeSongLimited');
</script>
