<template>
<div data-feature-view="card-ban-shortest-interval-record" data-feature-page="cards" id="rel-ban-short" data-scroll-anchor="rel-ban-short" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-ban-short') }}</h3>
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
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-ban-short', '间隔记录_Ban最短间隔')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-interval', { 'interval-record-table-card-mode': intervalBanShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="intervalBanShowCardImages">卡面</th>
                    <th>活动始末</th>
                    <th>最短 Ban</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in banShortestDisplayRecords" :key="`ban-short-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
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
                            <div v-if="row.shortestStartCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img crossorigin="anonymous"
                                :src="row.shortestStartCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.shortestStartCardAttr)"
                                :src="`/elements/${String(row.shortestStartCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.shortestStartCardAttr]"
                                :title="ATTR_LABELS[row.shortestStartCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                          <span class="interval-stack-arrow">↓</span>
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.shortestEndCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img crossorigin="anonymous"
                                :src="row.shortestEndCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.shortestEndCardAttr)"
                                :src="`/elements/${String(row.shortestEndCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.shortestEndCardAttr]"
                                :title="ATTR_LABELS[row.shortestEndCardAttr]"
                                class="related-last-card-attr"
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
                          <button class="pjsk-ui-action jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)" :data-event-id="row.shortest?.startRef?.id">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                          <span class="interval-stack-arrow">↓</span>
                          <button class="pjsk-ui-action jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)" :data-event-id="row.shortest?.endRef?.id">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                        </div>
                      </template>
                      <template v-else>
                        <button class="pjsk-ui-action jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)" :data-event-id="row.shortest?.startRef?.id">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                        <span>→</span>
                        <button class="pjsk-ui-action jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)" :data-event-id="row.shortest?.endRef?.id">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                      </template>
                    </td>
                    <td>{{ formatGapValue(row.shortest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
</template>

<script setup>
defineProps(["getRelatedRecordTitle","intervalBanShowCardImages","onIntervalBanShowCardImagesChange","banEventTypeFilter","setBanEventTypeFilter","isExportingPng","exportElementPng","banShortestDisplayRecords","getRecordTint","getCharAbbr","getCharColor","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS","jumpToHistoryByEventRef","getJumpLinkLabel","formatGapValue"]);
</script>
