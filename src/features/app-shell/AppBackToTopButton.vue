<template>
<UiSurfaceTransition kind="feedback">
<button data-feature-view="app-back-to-top-button" data-feature-page="app"
      v-if="showBackToTopBtn"
      v-liquid-glass
      class="pjsk-ui-action floating-top-btn ui-liquid-glass ui-liquid-glass--refractive"
      :class="{ 'is-dock-aligned': currentTab === 'stats' || currentTab === 'songs' }"
      title="回到顶部"
      aria-label="回到顶部"
      @click="scrollContentToTop"
    >
      <span class="floating-top-btn-icon">↑</span>
    </button>
</UiSurfaceTransition>
</template>

<script setup>
import UiSurfaceTransition from '../../components/ui/UiSurfaceTransition.vue';
const props = defineProps({
  tabNavigation: { type: Object, required: true },
  tabCatalog: { type: Object, required: true },
});
const { showBackToTopBtn, scrollContentToTop } = props.tabNavigation;
const { currentTab } = props.tabCatalog;
</script>
