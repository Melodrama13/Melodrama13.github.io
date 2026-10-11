<template>
<div data-feature-view="app-desktop-source-trigger" data-feature-page="app" v-if="showSourceDropdownInNav" class="source-dropdown" ref="sourceDropdownRef">
        <button
          ref="sourceTriggerRef"
          v-liquid-glass
          class="pjsk-ui-action io-btn source-trigger top-nav-glass-capsule ui-liquid-glass ui-liquid-glass--refractive"
          data-ui-glass-profile="lens"
          :class="{ active: sourceMenuOpen, 'is-disabled': isHistoryPredictEditorOpen }"
          :disabled="isHistoryPredictEditorOpen"
          @pointerdown.stop
          @click.stop="toggleSourceMenu"
          :title="isHistoryPredictEditorOpen ? '预测面板打开时不可操作数据源' : `当前数据源：${activePredictSourceName}`"
        >
          {{ isCompactTopNav ? '数据源' : `数据源：${activePredictSourceName}` }}
        </button>
      </div>
</template>

<script setup>
const props = defineProps({
  tabNavigation: { type: Object, required: true },
  sourceMenu: { type: Object, required: true },
  predictionSources: { type: Object, required: true },
  responsiveNavigation: { type: Object, required: true },
});
const { showSourceDropdownInNav, isHistoryPredictEditorOpen } = props.tabNavigation;
const { sourceMenuOpen, toggleSourceMenu, sourceDropdownRef, sourceTriggerRef } = props.sourceMenu;
const { activePredictSourceName } = props.predictionSources;
const { isCompactTopNav } = props.responsiveNavigation;
</script>
