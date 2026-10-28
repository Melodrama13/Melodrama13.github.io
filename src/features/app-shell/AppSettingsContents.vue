<template>
  <header class="settings-header">
    <UiGlassTabs class="settings-tabs" :model-value="settingsPage" :items="pages" label="设置页面" contained @update:model-value="sourceMenu.selectSettingsPage" />
    <button type="button" class="pjsk-ui-action settings-close" aria-label="关闭设置" @click="sourceMenu.closeSourceMenu({ restoreFocus: true })"><X :size="16" aria-hidden="true" /></button>
  </header>
  <AppGlobalSettings v-if="settingsPage === 'global'" :all-cards="allCards" :all-characters="allCharacters" />
  <div v-else class="settings-source-page">
    <p class="settings-source-current">当前数据源：{{ predictionSources.activePredictSourceName.value }}</p>
    <AppSourceMenuContents :prediction-sources="predictionSources" :source-menu="sourceMenu" :tab-navigation="tabNavigation"
      :responsive-navigation="responsiveNavigation" :prediction-files="predictionFiles" :history-capture="historyCapture" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import UiGlassTabs from '../../components/ui/UiGlassTabs.vue';
import AppGlobalSettings from './AppGlobalSettings.vue';
import AppSourceMenuContents from './AppSourceMenuContents.vue';
const props = defineProps({
  sourceMenu: { type: Object, required: true }, predictionSources: { type: Object, required: true },
  tabNavigation: { type: Object, required: true }, responsiveNavigation: { type: Object, required: true },
  predictionFiles: { type: Object, required: true }, historyCapture: { type: Object, required: true },
  allCards: { type: Array, default: () => [] }, allCharacters: { type: Array, default: () => [] },
});
const { settingsPage } = props.sourceMenu;
const pages = computed(() => [
  { value: 'global', label: '全局设置' },
  { value: 'sources', label: '数据源', disabled: !props.tabNavigation.canUsePredictionSources.value },
]);
</script>

<style scoped>
.settings-header { display: flex; align-items: center; gap: 8px; margin: 0 2px 10px; }
.settings-tabs { flex: 1; min-width: 0; gap: 0; }
.settings-tabs :deep(.primary-tab-button) { flex: 1; min-width: 0; min-height: 28px; font-size: 0.75rem; line-height: 1.25; padding: 4px 9px; }
.settings-tabs :deep(.primary-tab-button:disabled) { opacity: 0.45; cursor: not-allowed; }
.settings-tabs :deep(.desktop-tab-track) { inset: 0; }
.settings-close { display: grid; place-items: center; flex: 0 0 30px; width: 30px; height: 30px; padding: 0; border: 1px solid var(--ui-control-border); border-radius: 50%; color: var(--ui-control-label); background: var(--ui-glass-optical-group-bg); cursor: pointer; }
.settings-source-current { margin: 0 0 12px; color: var(--ui-control-label); font-size: 0.8rem; overflow-wrap: anywhere; }
</style>
