<template>
<div data-feature-view="app-desktop-source-trigger" data-feature-page="app" v-if="showSourceDropdownInNav" class="source-dropdown" ref="sourceDropdownRef">
        <button
          ref="sourceTriggerRef"
          v-liquid-glass
          class="pjsk-ui-action io-btn source-trigger settings-icon-trigger top-nav-glass-capsule ui-liquid-glass ui-liquid-glass--refractive"
          data-ui-glass-profile="lens"
          :class="{ active: sourceMenuOpen }"
          type="button"
          aria-label="设置"
          aria-haspopup="dialog"
          aria-controls="app-settings-panel"
          :aria-expanded="sourceMenuOpen"
          @pointerdown.stop
          @click.stop="toggleSourceMenu"
          title="设置"
        >
          <Settings :size="18" aria-hidden="true" />
        </button>
      </div>
</template>

<script setup>
import { Settings } from 'lucide-vue-next';
const props = defineProps({
  tabNavigation: { type: Object, required: true },
  sourceMenu: { type: Object, required: true },
  predictionSources: { type: Object, required: true },
  responsiveNavigation: { type: Object, required: true },
});
const { showSourceDropdownInNav } = props.tabNavigation;
const { sourceMenuOpen, toggleSourceMenu, sourceDropdownRef, sourceTriggerRef } = props.sourceMenu;
</script>

<style scoped>
.source-dropdown > button.source-trigger.settings-icon-trigger { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; min-height: 36px; padding: 0; border-radius: 50%; }
</style>
