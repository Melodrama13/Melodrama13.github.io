<template>
<div data-feature-view="card-lineup-panel" data-feature-page="cards" id="panel-lineup" data-scroll-anchor="panel-lineup" class="stats-section card-panel lineup-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>日挑配队</h2>
              <label class="support-wl-toggle fes-card-mode-toggle stats-checkbox export-hide">
                <input class="pjsk-ui-choice" :checked="lineupShowCardImages" type="checkbox" @change="onLineupShowCardImagesChange" />
                <span>显示卡面</span>
              </label>
            </div>
            <div class="lineup-section-actions">
              <button class="pjsk-ui-action lineup-toggle-btn lineup-toggle-btn-global" @click="toggleLineupExpandedAll($event)">{{ getLineupGlobalToggleLabel() }}</button>
              <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-lineup', '日挑配队')">PNG</button>
            </div>
          </div>
          <div class="lineup-tip">注意：仅从技能分值角度考虑最佳配队，不考虑其他影响（如综合力、歌曲、难度等）。配队不唯一，新卡优先显示。</div>
          <div class="lineup-grid">
            <div
              v-for="row in characterLineupRows"
              :key="`lineup-${row.name}`"
              :id="getLineupCardId(row.name)"
              :data-scroll-anchor="getLineupCardId(row.name)"
              class="lineup-card"
              :style="{ '--lineup-accent': getCharColor(row.name), '--unit-card-accent-color': getMatrixUnitColor(row.name), backgroundColor: getRecordTint(row.name, 0.2) }"
            >
              <div class="lineup-char-head">
                <div class="lineup-char-main">
                  <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="lineup-char-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                  <div class="lineup-char-text">
                    <div class="lineup-char-name">{{ row.name }}</div>
                    <div class="lineup-char-sub">最优属性：{{ ATTR_LABELS[row.bestPlan.attr] }} {{ row.bestPlan.total }}</div>
                  </div>
                </div>
                <div class="lineup-head-actions">
                  <button
                    v-if="row.otherPlans.length"
                    class="pjsk-ui-action lineup-toggle-btn"
                    @click="toggleLineupExpanded(row.name, $event)"
                  >
                    {{ getLineupToggleLabel(row.name, row.otherPlans.length) }}
                  </button>
                  <button
                    class="pjsk-ui-action card-export-btn"
                    :disabled="isExportingPng"
                    @click="exportElementPng(getLineupCardId(row.name), `日挑配队_${row.name}`)"
                  >PNG</button>
                </div>
              </div>

              <div class="lineup-plan-row lineup-plan-main" :style="getLineupRowStyle(row.bestPlan.attr)">
                <div class="lineup-attr-cell">
                  <img :src="`/elements/${String(row.bestPlan.attr).toLowerCase()}.png`" class="lineup-attr-icon" :title="ATTR_LABELS[row.bestPlan.attr]" />
                </div>
                <div
                  v-for="(slot, idx) in row.bestPlan.memberSlots"
                  :key="`main-${row.name}-${row.bestPlan.attr}-${idx}`"
                  class="lineup-member-cell"
                  :class="{ 'is-empty': !slot, 'is-cfes': slot?.fesKind === 'cfes', 'is-bfes': slot?.fesKind === 'bfes', 'is-card-mode': lineupShowCardImages && !!slot }"
                  :style="getLineupMemberCellStyle(slot, row.bestPlan.attr)"
                >
                  <template v-if="slot">
                    <template v-if="lineupShowCardImages">
                      <div class="lineup-slot-card">
                        <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                        <img crossorigin="anonymous"
                          v-if="getLineupSlotCardImageSrc(slot)"
                          :src="getLineupSlotCardImageSrc(slot)"
                          :alt="`${slot.name} 卡面`"
                          class="lineup-slot-card-img media-load-shimmer"
                          loading="lazy"
                          decoding="async"
                          @load="onMediaImageLoad"
                          @error="onMediaImageError"
                        />
                      </div>
                      <div class="lineup-member-score">{{ slot.score }}</div>
                    </template>
                    <template v-else>
                      <div class="lineup-member-score">{{ slot.score }}</div>
                      <button class="pjsk-ui-action jump-link lineup-jump" :disabled="!slot.eventRef" @click.stop="jumpToHistoryByEventRef(slot.eventRef)" :data-event-id="slot.eventRef?.id">{{ getJumpLinkLabel(slot.eventRef, slot.eventLabel) }}</button>
                    </template>
                  </template>
                  <span v-else class="lineup-empty">-</span>
                </div>
                <div class="lineup-total-cell">{{ row.bestPlan.total }}</div>
              </div>

              <div v-if="row.otherPlans.length && isLineupExpanded(row.name)" class="lineup-more-list">
                <div
                  v-for="plan in row.otherPlans"
                  :key="`other-${row.name}-${plan.attr}`"
                  class="lineup-plan-row"
                  :style="getLineupRowStyle(plan.attr)"
                >
                  <div class="lineup-attr-cell">
                    <img :src="`/elements/${String(plan.attr).toLowerCase()}.png`" class="lineup-attr-icon" :title="ATTR_LABELS[plan.attr]" />
                  </div>
                  <div
                    v-for="(slot, idx) in plan.memberSlots"
                    :key="`slot-${row.name}-${plan.attr}-${idx}`"
                    class="lineup-member-cell"
                    :class="{ 'is-empty': !slot, 'is-cfes': slot?.fesKind === 'cfes', 'is-bfes': slot?.fesKind === 'bfes', 'is-card-mode': lineupShowCardImages && !!slot }"
                    :style="getLineupMemberCellStyle(slot, plan.attr)"
                  >
                    <template v-if="slot">
                      <template v-if="lineupShowCardImages">
                        <div class="lineup-slot-card">
                          <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                          <img crossorigin="anonymous"
                            v-if="getLineupSlotCardImageSrc(slot)"
                            :src="getLineupSlotCardImageSrc(slot)"
                            :alt="`${slot.name} 卡面`"
                            class="lineup-slot-card-img media-load-shimmer"
                            loading="lazy"
                            decoding="async"
                            @load="onMediaImageLoad"
                            @error="onMediaImageError"
                          />
                        </div>
                        <div class="lineup-member-score">{{ slot.score }}</div>
                      </template>
                      <template v-else>
                        <div class="lineup-member-score">{{ slot.score }}</div>
                        <button class="pjsk-ui-action jump-link lineup-jump" :disabled="!slot.eventRef" @click.stop="jumpToHistoryByEventRef(slot.eventRef)" :data-event-id="slot.eventRef?.id">{{ getJumpLinkLabel(slot.eventRef, slot.eventLabel) }}</button>
                      </template>
                    </template>
                    <span v-else class="lineup-empty">-</span>
                  </div>
                  <div class="lineup-total-cell">{{ plan.total }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
</template>

<script setup>
defineProps(["lineupShowCardImages","onLineupShowCardImagesChange","toggleLineupExpandedAll","getLineupGlobalToggleLabel","isExportingPng","exportElementPng","characterLineupRows","getLineupCardId","getCharColor","getMatrixUnitColor","getRecordTint","getCharAbbr","ATTR_LABELS","toggleLineupExpanded","getLineupToggleLabel","getLineupRowStyle","getLineupMemberCellStyle","getLineupSlotCardImageSrc","onMediaImageLoad","onMediaImageError","jumpToHistoryByEventRef","getJumpLinkLabel","isLineupExpanded"]);
</script>
