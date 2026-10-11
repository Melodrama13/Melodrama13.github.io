<template>
<div data-feature-view="app-stats-top-controls" data-feature-page="app"
        v-if="showStatsTopControlInNav"
        v-liquid-glass
        class="stats-top-nav-wrap top-nav-glass-capsule ui-liquid-glass ui-liquid-glass--refractive"
        data-ui-glass-profile="lens"
        title="统计页：快速调整截止活动ID与展开菜单"
      >
        <button class="pjsk-ui-action pjsk-ui-btn-circle stats-top-mini-btn" title="减少 1" @click="adjustStatsTopDisplayEventId(-1)">－</button>
        <input
          v-model="statsTopDisplayEventIdDraft"
          class="pjsk-ui-field stats-top-id-input"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="8"
          placeholder="ID"
          @focus="onStatsTopDisplayIdFocus"
          @input="onStatsTopDisplayIdInput($event.target.value)"
          @blur="onStatsTopDisplayIdBlur"
        />
        <button class="pjsk-ui-action pjsk-ui-btn-circle stats-top-mini-btn" title="增加 1" @click="adjustStatsTopDisplayEventId(1)">＋</button>
        <button class="pjsk-ui-action pjsk-ui-btn-circle stats-top-mini-btn stats-top-reset-btn" :title="`恢复到当前参考活动 ID：${statsTopAutoCurrentId || '-'}`" @click="resetStatsTopDisplayEventId">
          <img src="/data/icon/reset.png" class="stats-top-reset-icon" alt="复位" />
        </button>
      </div>
</template>

<script setup>
const props = defineProps({
  tabNavigation: { type: Object, required: true },
  statsControls: { type: Object, required: true },
});
const { showStatsTopControlInNav } = props.tabNavigation;
const { adjustStatsTopDisplayEventId, statsTopDisplayEventIdDraft, onStatsTopDisplayIdFocus, onStatsTopDisplayIdInput, onStatsTopDisplayIdBlur, statsTopAutoCurrentId, resetStatsTopDisplayEventId } = props.statsControls;
</script>
