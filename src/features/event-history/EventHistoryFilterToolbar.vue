<template>
<div
          :ref="registerFilterBarElement"
          v-liquid-glass
          class="filter-bar ui-liquid-glass ui-liquid-glass--prominent ui-glass-optical-detail"
          :class="{
            'is-compact': isCompact,
            'is-editor-tight': isEditorTight,
            'is-editor-mobile': isEditorMobile
          }"
        >
          <button @click="$emit('toggle-sort-order', $event)" class="pjsk-ui-action sort-btn" :title="isSortDescending ? '最新在前' : '最早在前'">
            {{ isSortDescending ? '最新在前' : '最早在前' }}
          </button>
          <button class="pjsk-ui-action"
            @click="$emit('toggle-birthday-rows', $event)"
            :class="['nav-btn', { 'compact-tip': isCompact, 'is-icon-only': isCompact, 'active-highlight': !areBirthdayRowsHidden }]"
            :title="areBirthdayRowsHidden ? '已隐藏生日行' : '显示生日行'"
            :data-tip="isCompact ? '生日行' : null"
          >
            <img src="/elements/rarity_birthday.png" class="compact-btn-icon birthday-toggle-icon" alt="生日" />
            <span v-if="!isCompact">生日行：{{ areBirthdayRowsHidden ? '隐藏' : '显示' }}</span>
          </button>
          <button class="pjsk-ui-action"
            @click="$emit('toggle-preview-rows', $event)"
            :class="['nav-btn', { 'compact-tip': isCompact, 'is-icon-only': isCompact, 'active-highlight': !arePreviewRowsHidden }]"
            :title="arePreviewRowsHidden ? '已隐藏生放送行' : '显示生放送行'"
            :data-tip="isCompact ? '生放送' : null"
          >
            <img src="/data/icon/live.png" class="compact-btn-icon" alt="生放送" />
            <span v-if="!isCompact">生放送：{{ arePreviewRowsHidden ? '隐藏' : '显示' }}</span>
          </button>
          <button class="pjsk-ui-action"
            @click="$emit('toggle-collab-pools', $event)"
            :class="['nav-btn', { 'compact-tip': isCompact, 'is-icon-only': isCompact, 'active-highlight': !areCollabPoolsHidden }]"
            :title="areCollabPoolsHidden ? '已隐藏联动卡池' : '显示联动卡池'"
            :data-tip="isCompact ? '联动卡池' : null"
          >
            <img src="/data/icon/collaboration.png" class="compact-btn-icon" alt="联动" />
            <span v-if="!isCompact">联动卡池：{{ areCollabPoolsHidden ? '隐藏' : '显示' }}</span>
          </button>
          <button class="pjsk-ui-action" @click="$emit('navigate', 'top')" :class="['nav-btn', 'compact-tip', { 'is-icon-only': isCompact }]" title="顶部" data-tip="回到顶部">
            <img src="/data/icon/top.png" class="compact-btn-icon" alt="顶部" />
            <span v-if="!isCompact">顶部</span>
          </button>
          <button @click="$emit('navigate', 'current')" class="pjsk-ui-action nav-btn current-btn compact-tip" title="当前活动" data-tip="当前活动">
            当期
          </button>
          <button class="pjsk-ui-action" @click="$emit('navigate', 'bottom')" :class="['nav-btn', 'compact-tip', { 'is-icon-only': isCompact }]" title="底部" data-tip="前往底部">
            <img src="/data/icon/bottom.png" class="compact-btn-icon" alt="底部" />
            <span v-if="!isCompact">底部</span>
          </button>
          <button class="pjsk-ui-action"
            @click="$emit('toggle-precedents', $event)"
            title="活动详情、查先例与本期纪录"
            aria-controls="history-precedent-panel"
            :aria-expanded="isPrecedentPanelVisible"
            :class="['nav-btn', 'compact-tip', { 'is-icon-only': isCompact, 'active-highlight': isPrecedentPanelVisible }]"
            data-tip="活动详情与先例"
          >
            <History class="compact-btn-icon" aria-hidden="true" />
            <span v-if="!isCompact">先例</span>
          </button>
          <button class="pjsk-ui-action"
            @click="$emit('toggle-filter-panel', $event)"
            :title="hasActiveFilters ? '已启用筛选' : '筛选面板'"
            :class="['nav-btn', 'compact-tip', { 'is-icon-only': isCompact && !hasActiveFilters, 'has-count': isCompact && hasActiveFilters, 'active-highlight': hasActiveFilters || isFilterPanelVisible }]"
            data-tip="筛选面板"
          >
            <img src="/data/icon/filter.png" class="compact-btn-icon" alt="筛选" />
            <span v-if="!isCompact">{{ hasActiveFilters ? `筛选：${filterHitEventCount}个活动` : '筛选' }}</span>
            <span v-else-if="hasActiveFilters" class="compact-filter-count">{{ filterHitEventCount }}</span>
          </button>
        </div>
</template>

<script setup>
import { History } from 'lucide-vue-next';
/** Display-only panel; state and capture/navigation actions belong to the page. */
defineProps({
  isCompact: { type: Boolean, required: true },
  isEditorTight: { type: Boolean, required: true },
  isEditorMobile: { type: Boolean, required: true },
  isSortDescending: { type: Boolean, required: true },
  areBirthdayRowsHidden: { type: Boolean, required: true },
  arePreviewRowsHidden: { type: Boolean, required: true },
  areCollabPoolsHidden: { type: Boolean, required: true },
  isFilterPanelVisible: { type: Boolean, required: true },
  isPrecedentPanelVisible: { type: Boolean, default: false },
  hasActiveFilters: { type: Boolean, required: true },
  filterHitEventCount: { type: Number, required: true },
  registerFilterBarElement: { type: Function, required: true },
});

defineEmits(["toggle-sort-order","toggle-birthday-rows","toggle-preview-rows","toggle-collab-pools","navigate","toggle-filter-panel","toggle-precedents"]);
</script>

<style scoped src="./styles/eventHistoryFilterToolbarFoundation.css"></style>
<style scoped src="./styles/eventHistoryFilterToolbarContent.css"></style>
