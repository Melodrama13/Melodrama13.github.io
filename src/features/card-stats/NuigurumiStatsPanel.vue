<template>
<div id="panel-nuigurumi" data-scroll-anchor="panel-nuigurumi" class="stats-section card-panel nuigurumi-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>烤森娃娃</h2>
              <label v-if="areNameControlsVisible" class="festival-hide-name-toggle stats-checkbox export-hide">
                <input class="pjsk-ui-choice" v-controlled-checkbox="areCharacterNamesHidden" @change="$emit('change-hide-character-names', $event)" type="checkbox" />
                隐藏角色名
              </label>
              <label class="fes-card-mode-toggle stats-checkbox export-hide">
                <input class="pjsk-ui-choice" v-controlled-checkbox="isCardImageMode" @change="$emit('change-card-image-mode', $event)" type="checkbox" />
                <span>显示卡面</span>
              </label>
            </div>
            <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="$emit('export-panel', 'panel-nuigurumi', '烤森娃娃')">PNG</button>
          </div>
          <div class="nuigurumi-table-wrap">
            <table class="record-table nuigurumi-table" :class="{ 'is-card-mode': isCardImageMode }">
              <thead>
                <tr>
                  <th class="nuigurumi-mobile-meta-head">信息</th>
                  <th class="nuigurumi-round-head">轮次</th>
                  <th class="nuigurumi-date-head">年月</th>
                  <th class="nuigurumi-type-head">类型</th>
                  <th>当期人选</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in rows"
                  :key="`nuigurumi-${row.round}-${row.roundIndex}-${row.date}-${row.type}-${row.label || 'row'}`"
                  :class="{
                    'nuigurumi-round-start': row.roundIndex === 1,
                    'nuigurumi-round-end': row.isRoundEnd,
                    'nuigurumi-candidate-row': row.isCandidate
                  }"
                >
                  <td class="nuigurumi-mobile-meta-cell">
                    <span class="nuigurumi-mobile-meta-line nuigurumi-mobile-date">{{ getNuigurumiMobileDateLabel(row) }}</span>
                    <span class="nuigurumi-mobile-meta-line nuigurumi-mobile-type">{{ getNuigurumiMobileTypeLabel(row.type) }}</span>
                  </td>
                  <td class="nuigurumi-round-cell">
                    <span class="nuigurumi-round-badge">R{{ row.round }}</span>
                  </td>
                  <td class="nuigurumi-date-cell">{{ getNuigurumiDateCellLabel(row) }}</td>
                  <td class="nuigurumi-type-cell">
                    <span class="nuigurumi-type-chip" :class="`is-${row.type}`">{{ getNuigurumiTypeLabel(row.type) }}</span>
                  </td>
                  <td class="nuigurumi-members-cell">
                    <div v-if="!isCardImageMode" class="nuigurumi-avatar-strip">
                      <div
                        v-for="member in row.members"
                        :key="`nuigurumi-avatar-${row.date}-${member.abbr}`"
                        class="nuigurumi-avatar-item"
                        :title="member.name"
                      >
                        <img
                          :src="`/chibi_s/${member.iconKey}.webp`"
                          class="nuigurumi-avatar"
                          :alt="member.name"
                          :style="{ borderColor: getCharColor(member.name) }"
                          loading="lazy"
                          decoding="async"
                        />
                        <span v-if="areCharacterNamesVisible" class="nuigurumi-avatar-label">{{ getNuigurumiMemberLabel(member) }}</span>
                      </div>
                    </div>
                    <div v-else class="fes-card-strip nuigurumi-card-strip">
                      <div
                        v-for="member in row.members"
                        :key="`nuigurumi-card-${row.date}-${member.abbr}`"
                        class="fes-card-thumb nuigurumi-card-thumb"
                        :title="member.cardId ? `${member.name} #${member.cardId}` : member.name"
                      >
                        <CardArtwork
                          :src="member.cardImageSrc"
                          :alt="`${member.name} 卡面`"
                          :show-attribute="false"
                          :fallback-text="member.abbr.toUpperCase()"
                          @load="$emit('media-load', $event)"
                          @error="$emit('media-error', $event)"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
</template>

<script setup>
import CardArtwork from '../../components/ui/CardArtwork.vue';
/** Preserve v-model's live checked property without adding a checked attribute. */
function updateControlledCheckboxState(element, { value, oldValue }) {
  if (value !== oldValue) element.checked = Boolean(value);
}

const vControlledCheckbox = {
  mounted: updateControlledCheckboxState,
  beforeUpdate: updateControlledCheckboxState,
};

/** Display-only panel; state and capture/navigation actions belong to the page. */
defineProps({
  rows: { type: Array, required: true },
  areCharacterNamesHidden: { type: Boolean, required: true },
  isCardImageMode: { type: Boolean, required: true },
  areNameControlsVisible: { type: Boolean, required: true },
  areCharacterNamesVisible: { type: Boolean, required: true },
  isExportingPng: { type: Boolean, required: true },
  getNuigurumiMobileDateLabel: { type: Function, required: true },
  getNuigurumiMobileTypeLabel: { type: Function, required: true },
  getNuigurumiDateCellLabel: { type: Function, required: true },
  getNuigurumiTypeLabel: { type: Function, required: true },
  getNuigurumiMemberLabel: { type: Function, required: true },
  getCharColor: { type: Function, required: true },
});

defineEmits(["change-hide-character-names","change-card-image-mode","export-panel","media-load","media-error"]);
</script>

<style scoped src="./styles/nuigurumiStatsPanelFoundation.css"></style>
<style scoped src="./styles/nuigurumiStatsPanelContent.css"></style>
<style scoped src="../../styles/scoped/media-load-shimmer.css"></style>
<style scoped src="./styles/nuigurumiStatsPanelRecordTables.css"></style>
<style scoped src="./styles/nuigurumiStatsPanelCompactResponsive.css"></style>
