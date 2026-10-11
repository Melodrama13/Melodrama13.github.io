<template>
<div v-if="!isFixedRosterMode" data-feature-view="prediction-editor-character-pool" data-feature-page="prediction-editor" class="pool-section">
        <div class="char-pool-grid">
          <div v-for="(abbr, name) in charMap" :key="name"
               class="pjsk-ui-action pool-item"
               role="checkbox"
               :tabindex="getCharDisableReason(name) && !isCharInList(name) ? -1 : 0"
               :aria-label="name"
               :aria-checked="isCharInList(name)"
               :aria-disabled="!!getCharDisableReason(name) && !isCharInList(name)"
               :class="{ is_selected: isCharInList(name), is_disabled: !!getCharDisableReason(name) && !isCharInList(name) }"
               :title="''"
               @mouseenter="handlePoolItemMouseEnter(name)"
               @mouseleave="handlePoolItemMouseLeave(name)"
               @click="handlePoolItemClick(name)"
               @keydown.enter.prevent="$event.currentTarget.click()"
               @keydown.space.prevent="$event.currentTarget.click()">
            <img :src="`/chars/${abbr}.png`" />
            <div v-if="isCharInList(name)" class="check-mark">✓</div>
            <div v-if="shouldShowDisableReasonPopover(name)" class="pool-disable-popover">{{ getCharDisableReason(name) }}</div>
          </div>
        </div>
      </div>
      <div v-else data-feature-view="prediction-editor-character-pool" data-feature-page="prediction-editor" class="pool-section wl-lock-note">
        {{ isFixedRosterCollabMode ? '联动人选、人数、星级与组合以官方公布为准，仅可预测花色和技能。' : 'World Link 人选已固定，当前仅可调整属性。' }}
      </div>
</template>

<script setup>
/** Native controls share the editor's per-instance form and explicit actions. */
defineProps(["isFixedRosterMode","charMap","isCharInList","getCharDisableReason","handlePoolItemMouseEnter","handlePoolItemMouseLeave","handlePoolItemClick","shouldShowDisableReasonPopover","isFixedRosterCollabMode"]);
</script>
