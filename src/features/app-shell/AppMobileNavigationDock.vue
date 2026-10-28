<template>
<div data-feature-view="app-mobile-navigation-dock" data-feature-page="app" class="mobile-bottom-controls">
      <nav
        ref="primaryTabSwitcherRef"
        class="mobile-tab-switcher"
        :class="{ 'is-mobile-tab-dragging': isMobileTabDragging }"
        :style="mobileTabSwitcherStyle"
        aria-label="页面切换"
        @pointerdown="onPrimaryTabPointerDown"
        @pointermove="onPrimaryTabPointerMove"
        @pointerup="onPrimaryTabPointerUp"
        @pointercancel="onPrimaryTabPointerCancel"
        @lostpointercapture="onPrimaryTabPointerCancel"
      >
        <span
          v-liquid-glass
          class="mobile-tab-track ui-liquid-glass ui-liquid-glass--refractive"
          data-ui-glass-profile="lens"
          aria-hidden="true"
        ></span>
        <button
          v-for="(tab, index) in PRIMARY_TABS"
          :key="tab"
          type="button"
          class="pjsk-ui-action primary-tab-button"
          :class="{ active: currentTab === tab }"
          :data-ui-control-pressed="isMobileTabPressed && primaryTabPressedIndex === index ? 'true' : undefined"
          :aria-current="currentTab === tab ? 'page' : undefined"
          @click="selectPrimaryTab(tab, $event)"
        >
          <span class="btn-with-icon">
            <img :src="MOBILE_TAB_ICONS[index]" class="btn-icon" alt="" draggable="false" />
            <span>{{ MOBILE_TAB_LABELS[index] }}</span>
          </span>
        </button>
        <span
          v-if="mobileTabIndex >= 0"
          v-liquid-glass
          class="mobile-tab-glider ui-liquid-glass ui-liquid-glass--refractive"
          data-ui-glass-profile="lens"
          data-ui-glass-lens-role="selector"
          :data-ui-glass-pressed="isMobileTabPressed"
          :data-ui-glass-active="isTabGliderActive"
          aria-hidden="true"
        ></span>
      </nav>
      <button
        v-if="showSourceDropdownInNav"
        ref="mobileSourceTriggerRef"
        v-liquid-glass
        type="button"
        class="pjsk-ui-action mobile-source-trigger ui-liquid-glass ui-liquid-glass--refractive"
        :class="{ 'is-open': sourceMenuOpen }"
        aria-haspopup="dialog"
        aria-controls="app-settings-panel"
        :aria-expanded="sourceMenuOpen"
        aria-label="设置"
        title="设置"
        @pointerdown.stop
        @click.stop="toggleSourceMenu"
      >
        <Settings :size="20" aria-hidden="true" />
      </button>
    </div>
</template>

<script setup>
import { Settings } from 'lucide-vue-next';
const props = defineProps({
  tabGestures: { type: Object, required: true },
  tabCatalog: { type: Object, required: true },
  tabNavigation: { type: Object, required: true },
  sourceMenu: { type: Object, required: true },
  predictionSources: { type: Object, required: true },
});
const { isMobileTabDragging, mobileTabSwitcherStyle, onPrimaryTabPointerDown, onPrimaryTabPointerMove, onPrimaryTabPointerUp, onPrimaryTabPointerCancel, PRIMARY_TABS, selectPrimaryTab, MOBILE_TAB_ICONS, MOBILE_TAB_LABELS, mobileTabIndex, isMobileTabPressed, isTabGliderActive, primaryTabPressedIndex, primaryTabSwitcherRef } = props.tabGestures;
const { currentTab } = props.tabCatalog;
const { showSourceDropdownInNav } = props.tabNavigation;
const { sourceMenuOpen, toggleSourceMenu, mobileSourceTriggerRef } = props.sourceMenu;
</script>
