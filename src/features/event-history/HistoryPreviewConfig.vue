<template>
<div data-feature-view="history-preview-config" data-feature-page="history" class="preview-config-panel ui-liquid-glass ui-liquid-glass--prominent ui-glass-optical-detail" :class="{ 'is-collapsed': previewFloatingCollapsed || previewConfigBodyCollapsed }" :style="previewConfigPanelStyle" @mousedown="bringPreviewConfigToFront" @touchstart="bringPreviewConfigToFront">
          <div class="preview-config-head" @mousedown.prevent="startDragPreviewConfig($event)" @touchstart.prevent="startDragPreviewConfigTouch($event)">
            <span>悬浮统计（最多6个）</span>
            <div class="preview-config-actions">
              <button v-if="!previewConfigBodyCollapsed" class="pjsk-ui-action preview-config-reset" @mousedown.stop @touchstart.stop @click="resetPreviewPanelLayout">重置布局</button>
              <button class="pjsk-ui-action preview-config-reset" @mousedown.stop @touchstart.stop @click="previewConfigBodyCollapsed = !previewConfigBodyCollapsed">{{ previewConfigBodyCollapsed ? '展开' : '收起' }}</button>
            </div>
          </div>
          <div v-show="!previewFloatingCollapsed && !previewConfigBodyCollapsed" class="preview-config-options">
            <button
              v-for="opt in previewPanelOptions"
              :key="`opt-${opt.id}`"
              class="pjsk-ui-action preview-config-btn"
              :class="{ 'is-active': opt.selected }"
              :disabled="opt.disabled || (!opt.selected && selectedPreviewPanelIds.length >= 6)"
              :title="opt.tip || ''"
              @click="togglePreviewPanelType(opt.id)"
            >
              {{ opt.title }}
            </button>
          </div>
          <div v-if="!previewFloatingCollapsed && !previewConfigBodyCollapsed && selectedPreviewPanelIds.includes('attr-five')" class="preview-char-select" :class="{ 'is-collapsed': !isPreviewCharSelectExpanded('attr-five') }">
            <div class="preview-char-select-title">
              <span>属性统计人选（最多8人）</span>
              <div class="preview-char-select-actions">
                <button
                  class="pjsk-ui-action preview-char-select-toggle"
                  @click="appendPreviewAttrCharsFromCurrentLineup"
                  :disabled="!canAppendCurrentLineupToPreviewAttr"
                >获取列表</button>
                <button class="pjsk-ui-action preview-char-select-toggle" @click="clearPreviewAttrChars" :disabled="selectedPreviewAttrChars.length === 0">清空</button>
                <button class="pjsk-ui-action preview-char-select-toggle" @click="togglePreviewCharSelectExpanded('attr-five')">{{ isPreviewCharSelectExpanded('attr-five') ? '收起' : '展开' }}</button>
              </div>
            </div>
            <div v-show="isPreviewCharSelectExpanded('attr-five')" class="preview-char-chips">
              <button
                v-for="name in previewSelectableChars"
                :key="`pick-${name}`"
                class="pjsk-ui-action preview-char-chip"
                :class="{ 'is-active': selectedPreviewAttrChars.includes(name) }"
                :disabled="!selectedPreviewAttrChars.includes(name) && selectedPreviewAttrChars.length >= 8"
                @click="togglePreviewAttrChar(name)"
                :title="name"
              >
                <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="preview-char-chip-avatar" />
              </button>
            </div>
          </div>
          <div v-if="!previewFloatingCollapsed && !previewConfigBodyCollapsed && selectedPreviewPanelIds.includes('daily-lineup')" class="preview-char-select" :class="{ 'is-collapsed': !isPreviewCharSelectExpanded('daily-lineup') }">
            <div class="preview-char-select-title">
              <span>日挑配队人选（最多6人）</span>
              <div class="preview-char-select-actions">
                <button
                  class="pjsk-ui-action preview-char-select-toggle"
                  @click="appendPreviewDailyLineupCharsFromCurrentLineup"
                  :disabled="!canAppendCurrentLineupToPreviewDailyLineup"
                >读取列表</button>
                <button class="pjsk-ui-action preview-char-select-toggle" @click="clearPreviewDailyLineupChars" :disabled="selectedPreviewDailyLineupChars.length === 0">清空</button>
                <button class="pjsk-ui-action preview-char-select-toggle" @click="togglePreviewCharSelectExpanded('daily-lineup')">{{ isPreviewCharSelectExpanded('daily-lineup') ? '收起' : '展开' }}</button>
              </div>
            </div>
            <div v-show="isPreviewCharSelectExpanded('daily-lineup')" class="preview-char-chips">
              <button
                v-for="name in previewSelectableChars"
                :key="`pick-daily-${name}`"
                class="pjsk-ui-action preview-char-chip"
                :class="{ 'is-active': selectedPreviewDailyLineupChars.includes(name) }"
                :disabled="!selectedPreviewDailyLineupChars.includes(name) && selectedPreviewDailyLineupChars.length >= 6"
                @click="togglePreviewDailyLineupChar(name)"
                :title="name"
              >
                <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="preview-char-chip-avatar" />
              </button>
            </div>
          </div>
          <div v-if="!previewFloatingCollapsed && !previewConfigBodyCollapsed && selectedPreviewPanelIds.includes('char-attr')" class="preview-char-select" :class="{ 'is-collapsed': !isPreviewCharSelectExpanded('char-attr') }">
            <div class="preview-char-select-title">
              <span>角色花色人选（最多6人）</span>
              <div class="preview-char-select-actions">
                <button
                  class="pjsk-ui-action preview-char-select-toggle"
                  @click="appendPreviewCharAttrCharsFromCurrentLineup"
                  :disabled="!canAppendCurrentLineupToPreviewCharAttr"
                >读取列表</button>
                <button class="pjsk-ui-action preview-char-select-toggle" @click="clearPreviewCharAttrChars" :disabled="selectedPreviewCharAttrChars.length === 0">清空</button>
                <button class="pjsk-ui-action preview-char-select-toggle" @click="togglePreviewCharSelectExpanded('char-attr')">{{ isPreviewCharSelectExpanded('char-attr') ? '收起' : '展开' }}</button>
              </div>
            </div>
            <div v-show="isPreviewCharSelectExpanded('char-attr')" class="preview-char-chips">
              <button
                v-for="name in previewSelectableChars"
                :key="`pick-char-attr-${name}`"
                class="pjsk-ui-action preview-char-chip"
                :class="{ 'is-active': selectedPreviewCharAttrChars.includes(name) }"
                :disabled="!selectedPreviewCharAttrChars.includes(name) && selectedPreviewCharAttrChars.length >= 6"
                @click="togglePreviewCharAttrChar(name)"
                :title="name"
              >
                <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="preview-char-chip-avatar" />
              </button>
            </div>
          </div>
          <div v-if="!previewFloatingCollapsed && !previewConfigBodyCollapsed && selectedPreviewPanelIds.includes('festival')" class="preview-char-select preview-festival-select">
            <div class="preview-char-select-title">
              <span>节日（单选）</span>
            </div>
            <div class="preview-festival-chips">
              <button
                v-for="fest in PREVIEW_FESTIVAL_TYPES"
                :key="`preview-festival-${fest}`"
                class="pjsk-ui-action preview-festival-chip"
                :class="{ 'is-active': selectedPreviewFestival === fest }"
                @click="setSelectedPreviewFestival(fest)"
              >
                {{ fest }}
              </button>
            </div>
          </div>
        </div>
</template>

<script setup>
const props = defineProps({
  previewLayout: { type: Object, required: true },
  previewSelections: { type: Object, required: true },
  presentation: { type: Object, required: true },
});
const { previewFloatingCollapsed, previewConfigBodyCollapsed, isPreviewCharSelectExpanded, togglePreviewCharSelectExpanded, previewConfigPanelStyle, startDragPreviewConfig, startDragPreviewConfigTouch, resetPreviewPanelLayout, bringPreviewConfigToFront } = props.previewLayout;
const { PREVIEW_FESTIVAL_TYPES, selectedPreviewPanelIds, selectedPreviewAttrChars, selectedPreviewDailyLineupChars, selectedPreviewCharAttrChars, selectedPreviewFestival, previewSelectableChars, togglePreviewAttrChar, clearPreviewAttrChars, togglePreviewDailyLineupChar, clearPreviewDailyLineupChars, togglePreviewCharAttrChar, clearPreviewCharAttrChars, canAppendCurrentLineupToPreviewAttr, appendPreviewAttrCharsFromCurrentLineup, canAppendCurrentLineupToPreviewDailyLineup, appendPreviewDailyLineupCharsFromCurrentLineup, canAppendCurrentLineupToPreviewCharAttr, appendPreviewCharAttrCharsFromCurrentLineup, setSelectedPreviewFestival, previewPanelOptions, togglePreviewPanelType } = props.previewSelections;
const { getCharAbbr } = props.presentation;
</script>
