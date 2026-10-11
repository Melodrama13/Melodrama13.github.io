<template>
<div data-feature-view="app-desktop-tab-switcher" data-feature-page="app"
        ref="desktopTabSwitcherRef"
        class="desktop-tab-switcher"
        :class="{ 'is-tab-dragging': isDesktopTabDragging }"
        @pointerdown="onPrimaryTabPointerDown"
        @pointermove="onPrimaryTabPointerMove"
        @pointerup="onPrimaryTabPointerUp"
        @pointercancel="onPrimaryTabPointerCancel"
        @lostpointercapture="onPrimaryTabPointerCancel"
      >
        <span v-liquid-glass class="desktop-tab-track mobile-tab-track ui-liquid-glass ui-liquid-glass--refractive" data-ui-glass-profile="lens" aria-hidden="true"></span>
        <button
          v-for="(tab, index) in PRIMARY_TABS"
          :key="tab"
          type="button"
          class="pjsk-ui-action primary-tab-button"
          :class="{ active: currentTab === tab }"
          :data-ui-control-pressed="isDesktopTabPressed && primaryTabPressedIndex === index ? 'true' : undefined"
          :aria-current="currentTab === tab ? 'page' : undefined"
          @click="selectPrimaryTab(tab, $event)"
        >
          <span class="btn-with-icon">
            <img :src="MOBILE_TAB_ICONS[index]" class="btn-icon" alt="" draggable="false" />
            <span>{{ isStatsTopNavCompact ? MOBILE_TAB_LABELS[index] : DESKTOP_TAB_LABELS[index] }}</span>
          </span>
        </button>
        <span
          v-if="mobileTabIndex >= 0 && desktopTabGliderRect.width > 0"
          v-liquid-glass
          class="desktop-tab-glider mobile-tab-glider ui-liquid-glass ui-liquid-glass--refractive"
          data-ui-glass-profile="lens"
          data-ui-glass-lens-role="selector"
          :data-ui-glass-pressed="isDesktopTabPressed"
          :data-ui-glass-active="isTabGliderActive"
          :style="desktopTabGliderStyle"
          aria-hidden="true"
        ></span>
      </div>
</template>

<script setup>
const props = defineProps({
  tabGestures: { type: Object, required: true },
  tabCatalog: { type: Object, required: true },
  responsiveNavigation: { type: Object, required: true },
});
const { isDesktopTabDragging, onPrimaryTabPointerDown, onPrimaryTabPointerMove, onPrimaryTabPointerUp, onPrimaryTabPointerCancel, PRIMARY_TABS, selectPrimaryTab, MOBILE_TAB_ICONS, MOBILE_TAB_LABELS, DESKTOP_TAB_LABELS, mobileTabIndex, desktopTabGliderRect, isDesktopTabPressed, isTabGliderActive, primaryTabPressedIndex, desktopTabGliderStyle, desktopTabSwitcherRef } = props.tabGestures;
const { currentTab } = props.tabCatalog;
const { isStatsTopNavCompact } = props.responsiveNavigation;
</script>
