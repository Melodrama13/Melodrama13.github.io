<template>
<div data-feature-view="card-support-panel" data-feature-page="cards" id="panel-support" data-scroll-anchor="panel-support" class="stats-section card-panel support-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>支援配队</h2>
              <label class="support-wl-toggle fes-card-mode-toggle stats-checkbox export-hide">
                <input class="pjsk-ui-choice" :checked="supportShowCardImages" type="checkbox" @change="onSupportShowCardImagesChange" />
                <span>显示卡面</span>
              </label>
              <label class="support-wl-toggle stats-checkbox export-hide" title="勾选后才计算并显示 WL 配队（更耗时）。">
                <input class="pjsk-ui-choice" :checked="supportEnableWlLineup" type="checkbox" @change="onSupportEnableWlLineupChange" />
                <span>WL配队</span>
              </label>
              <label class="support-wl-toggle stats-checkbox export-hide" title="OC团按四位OC加一位本团V配队；WL行仍由WL配队开关控制。">
                <input class="pjsk-ui-choice" :checked="supportUseCompilationRules" type="checkbox" @change="onSupportCompilationRulesChange" />
                <span>总集篇</span>
              </label>
            </div>
            <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-support', '支援配队')">PNG</button>
          </div>
          <div class="lineup-tip">注意：仅从技能分值角度考虑最佳配队，不考虑其他影响（如综合力、歌曲、难度等）。配队不唯一，同分卡会优先取OC，再取VS，且新卡优先显示。</div>
          <div v-if="supportUseCompilationRules" class="lineup-tip">总集篇：OC团固定四位OC加一位本团V，各花色分别计算；WL为五种花色各一张。</div>
          <div class="support-grid">
            <div
              v-for="unitRow in supportLineupRows"
              :key="`support-${unitRow.unit}`"
              :id="getSupportCardId(unitRow.unit)"
              :data-scroll-anchor="getSupportCardId(unitRow.unit)"
              class="support-card"
              :style="{ '--unit-card-accent-color': getUnitAccentColor(unitRow.unit), backgroundColor: hexToRgba(getUnitAccentColor(unitRow.unit), 0.12) }"
            >
              <div class="support-head">
                <img :src="supportUnitTitleLogoMap[unitRow.unit] || unitLogoMap[unitRow.unit]" class="support-unit-title-logo" :title="unitRow.unit.toUpperCase()" />
                <div class="support-head-actions">
                  <label v-if="unitRow.unit === 'vs'" class="support-vs-toggle stats-checkbox export-hide">
                    <input class="pjsk-ui-choice" :checked="supportUseOriginalVsTeam" type="checkbox" @change="onSupportUseOriginalVsTeamChange" />
                    <span>原v队</span>
                  </label>
                  <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng(getSupportCardId(unitRow.unit), `支援配队_${unitRow.unit.toUpperCase()}`)">PNG</button>
                </div>
              </div>

              <div
                v-for="plan in unitRow.plans"
                :key="`support-${unitRow.unit}-${plan.attr}`"
                class="lineup-plan-row support-plan-row"
                :style="getLineupRowStyle(plan.attr)"
              >
                <div class="lineup-attr-cell">
                  <img v-if="isSupportAttrIcon(plan.attr)" :src="`/elements/attr_${String(plan.attr).toLowerCase()}_v1.png`" class="lineup-attr-icon" :title="ATTR_LABELS[plan.attr]" />
                  <span v-else class="lineup-attr-text">WL</span>
                </div>
                <div
                  v-for="(slot, idx) in plan.memberSlots"
                  :key="`support-slot-${unitRow.unit}-${plan.attr}-${idx}`"
                  class="lineup-member-cell"
                  :class="{ 'is-empty': !slot, 'support-member-cell': !!slot, 'is-cfes': slot?.fesKind === 'cfes', 'is-bfes': slot?.fesKind === 'bfes', 'is-card-mode': supportShowCardImages && !!slot }"
                  :style="getLineupMemberCellStyle(slot, plan.attr)"
                >
                  <template v-if="slot">
                    <template v-if="supportShowCardImages">
                      <div class="lineup-slot-card">
                        <CardArtwork
                          :src="getLineupSlotCardImageSrc(slot)"
                          :alt="`${slot.name} 卡面`"
                          :attribute="slot.attr"
                          :show-attribute="plan.attr === SUPPORT_WL_ATTR && isSupportAttrIcon(slot.attr)"
                          @load="onMediaImageLoad"
                          @error="onMediaImageError"
                        />
                      </div>
                      <div class="lineup-member-score">{{ slot.score }}</div>
                    </template>
                    <template v-else>
                      <img :src="`/chibi_s/${getSupportMemberIconKey(slot)}.webp`" class="support-member-avatar" :title="slot.name" :alt="slot.name" />
                      <img
                        v-if="plan.attr === SUPPORT_WL_ATTR && isSupportAttrIcon(slot.attr)"
                        :src="`/elements/attr_${String(slot.attr).toLowerCase()}_v1.png`"
                        class="support-member-attr-icon"
                        :title="ATTR_LABELS[slot.attr]"
                        :alt="ATTR_LABELS[slot.attr]"
                      />
                      <div class="lineup-member-score">{{ slot.score }}</div>
                      <button class="pjsk-ui-action jump-link lineup-jump" :disabled="!slot.eventRef" @click.stop="jumpToHistoryByEventRef(slot.eventRef)" :data-event-id="slot.eventRef?.id">{{ getJumpLinkLabel(slot.eventRef, slot.eventLabel) }}</button>
                    </template>
                  </template>
                  <span v-else class="lineup-empty">-</span>
                </div>
                <div class="lineup-total-cell">{{ formatSupportTotal(plan.total) }}</div>
              </div>
            </div>
          </div>
        </div>
</template>

<script setup>
import CardArtwork from '../../components/ui/CardArtwork.vue';
defineProps(["supportShowCardImages","onSupportShowCardImagesChange","supportEnableWlLineup","onSupportEnableWlLineupChange","supportUseCompilationRules","onSupportCompilationRulesChange","isExportingPng","exportElementPng","supportLineupRows","getSupportCardId","getUnitAccentColor","hexToRgba","supportUnitTitleLogoMap","unitLogoMap","supportUseOriginalVsTeam","onSupportUseOriginalVsTeamChange","getLineupRowStyle","isSupportAttrIcon","ATTR_LABELS","getLineupMemberCellStyle","getLineupSlotCardImageSrc","onMediaImageLoad","onMediaImageError","SUPPORT_WL_ATTR","getSupportMemberIconKey","jumpToHistoryByEventRef","getJumpLinkLabel","formatSupportTotal"]);
</script>
