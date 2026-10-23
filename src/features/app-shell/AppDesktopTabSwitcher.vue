<template>
  <UiGlassTabs data-feature-view="app-desktop-tab-switcher" data-feature-page="app"
    :model-value="tabCatalog.currentTab.value" :items="items" :controller="tabGestures" current-page />
</template>

<script setup>
import { computed } from 'vue';
import UiGlassTabs from '../../components/ui/UiGlassTabs.vue';
const props = defineProps({
  tabGestures: { type: Object, required: true },
  tabCatalog: { type: Object, required: true },
  responsiveNavigation: { type: Object, required: true },
});
const items = computed(() => props.tabGestures.PRIMARY_TABS.map((value, index) => ({
  value, icon: props.tabGestures.MOBILE_TAB_ICONS[index],
  label: (props.responsiveNavigation.isStatsTopNavCompact.value ? props.tabGestures.MOBILE_TAB_LABELS : props.tabGestures.DESKTOP_TAB_LABELS)[index],
})));
</script>
