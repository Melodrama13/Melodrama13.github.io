<template>
  <div ref="desktopTabSwitcherRef" class="ui-glass-tabs desktop-tab-switcher"
    :class="{ 'is-tab-dragging': isDesktopTabDragging }" :data-ui-glass-contained="contained ? 'true' : undefined" role="group" :aria-label="label"
    @pointerdown="onPrimaryTabPointerDown" @pointermove="onPrimaryTabPointerMove"
    @pointerup="onPrimaryTabPointerUp" @pointercancel="onPrimaryTabPointerCancel"
    @lostpointercapture="onPrimaryTabPointerCancel">
    <span v-liquid-glass="!contained" class="desktop-tab-track mobile-tab-track ui-liquid-glass ui-liquid-glass--refractive"
      data-ui-glass-profile="lens" aria-hidden="true"></span>
    <button v-for="(item, index) in items" :key="item.value" type="button" class="pjsk-ui-action primary-tab-button"
      :class="{ active: modelValue === item.value }"
      :data-ui-control-pressed="isDesktopTabPressed && primaryTabPressedIndex === index ? 'true' : undefined"
      :aria-current="currentPage && modelValue === item.value ? 'page' : undefined"
      :aria-pressed="currentPage ? undefined : modelValue === item.value"
      @click="selectPrimaryTab(item.value, $event)">
      <span class="btn-with-icon"><img v-if="item.icon" :src="item.icon" class="btn-icon" alt="" draggable="false" /><span>{{ item.label }}</span></span>
    </button>
    <span v-if="mobileTabIndex >= 0 && desktopTabGliderRect.width > 0" v-liquid-glass="!contained"
      class="desktop-tab-glider mobile-tab-glider ui-liquid-glass ui-liquid-glass--refractive"
      data-ui-glass-profile="lens" data-ui-glass-lens-role="selector"
      :data-ui-glass-pressed="isDesktopTabPressed" :data-ui-glass-active="isTabGliderActive"
      :style="desktopTabGliderStyle" aria-hidden="true"></span>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useGlassTabGestures } from '../../ui/useGlassTabGestures.js';

const props = defineProps({
  modelValue: { type: String, required: true },
  items: { type: Array, required: true },
  label: { type: String, default: '页面切换' },
  currentPage: Boolean,
  contained: Boolean,
  controller: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue']);
const gestures = props.controller || useGlassTabGestures({
  currentTab: computed(() => props.modelValue), primaryTabs: props.items.map(item => item.value),
  isMobileViewport: ref(false), isCompact: ref(false), selectTab: value => emit('update:modelValue', value),
});
const { desktopTabSwitcherRef, isDesktopTabDragging, isDesktopTabPressed, primaryTabPressedIndex,
  mobileTabIndex, desktopTabGliderRect, desktopTabGliderStyle, isTabGliderActive,
  selectPrimaryTab, onPrimaryTabPointerDown, onPrimaryTabPointerMove, onPrimaryTabPointerUp,
  onPrimaryTabPointerCancel } = gestures;

if (!props.controller) {
  gestures.connectTabGliderLayout();
  onMounted(() => {
    gestures.updateDesktopTabGlider();
    gestures.desktopTabResizeObserver = new ResizeObserver(() => {
      gestures.clearPrimaryTabDrag();
      gestures.updateDesktopTabGlider();
    });
    gestures.desktopTabResizeObserver.observe(desktopTabSwitcherRef.value);
  });
  onBeforeUnmount(() => {
    gestures.clearPrimaryTabDrag();
    gestures.desktopTabResizeObserver?.disconnect();
    if (gestures.suppressPrimaryTabClickTimer !== null) clearTimeout(gestures.suppressPrimaryTabClickTimer);
  });
}
</script>

<style scoped>
.ui-glass-tabs { position: relative; display: inline-flex; align-items: center; gap: 15px; flex: 0 0 auto; isolation: isolate; }
.ui-glass-tabs > .desktop-tab-track { position: absolute; inset: -3px -6px; z-index: 0; border: 1px solid var(--ui-glass-mobile-track-border); border-radius: 999px; pointer-events: none; }
.ui-glass-tabs > .primary-tab-button { display: inline-flex; position: relative; z-index: 1; align-items: center; justify-content: center; min-height: 42px; box-sizing: border-box; border: 0; border-radius: 999px; background: transparent; box-shadow: none; color: var(--ui-control-label); font-size: 0.86rem; white-space: nowrap; touch-action: pan-y; cursor: pointer; }
.ui-glass-tabs > .primary-tab-button.active { color: var(--ui-control-focus-color); }
.ui-glass-tabs > .desktop-tab-glider { display: block; position: absolute; z-index: 2; left: 0; box-sizing: border-box; border: 1px solid transparent; border-radius: 999px; pointer-events: none; translate: calc(var(--desktop-tab-left) + var(--desktop-tab-drag-x)) 0; scale: 1; transition: translate var(--ui-motion-navigation), scale var(--ui-motion-release); }
.ui-glass-tabs.is-tab-dragging > .desktop-tab-glider { transition: scale var(--ui-motion-release); }
.ui-glass-tabs > .desktop-tab-glider[data-ui-glass-pressed='true'] { scale: var(--ui-motion-selector-press-scale); }
:global(:root[data-ui-glass-motion='reduced']) .ui-glass-tabs > .desktop-tab-glider { transition: none; scale: 1; }
</style>
