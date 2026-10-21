<template>
  <div ref="pickerElement" class="history-record-picker" data-history-record-picker
    :class="{ 'is-open': isOpen }" @focusout="onFocusOut" @keydown="onKeyDown">
    <div class="history-record-picker-control">
      <input ref="inputElement" class="pjsk-ui-field history-record-picker-input" type="text"
        role="combobox" aria-label="查看活动纪录" aria-autocomplete="list" aria-haspopup="listbox"
        :aria-expanded="isOpen" :aria-controls="listId" :aria-activedescendant="activeOptionId"
        :aria-describedby="hintId" :value="draftText" :title="committedLabel"
        placeholder="输入 #ID 或活动简称" autocomplete="off" :spellcheck="false"
        @input="onInput" @focus="openDropdown" @click="onInputClick"
        @compositionstart="isComposing = true" @compositionend="onCompositionEnd" />
      <button type="button" class="pjsk-ui-action history-record-picker-toggle" tabindex="-1"
        :aria-label="isOpen ? '收起活动列表' : '展开活动列表'" :aria-expanded="isOpen" :aria-controls="listId"
        @mousedown.prevent @click="toggleDropdown">
        <ChevronDown :size="16" aria-hidden="true" />
      </button>
    </div>
    <div v-if="isOpen" class="history-record-picker-menu">
      <ul :id="listId" ref="listElement" class="history-record-picker-list" role="listbox" aria-label="活动列表"
        @mousedown.prevent>
        <li v-for="(option, index) in matchingOptions" :id="optionId(index)" :key="option.value"
          class="history-record-picker-option" :class="{ 'is-active': activeIndex === index }"
          role="option" :aria-selected="option.value === modelValue" @click="commitOption(option)">
          <span>{{ option.label }}</span>
          <Check v-if="option.value === modelValue" :size="15" aria-hidden="true" />
        </li>
      </ul>
      <p v-if="!matchingOptions.length" class="history-record-picker-empty">未找到活动，请输入 #ID 或活动简称。</p>
    </div>
    <span :id="hintId" class="history-record-picker-sr">输入活动编号或简称，上下键选择，回车确认，Esc 收起列表。</span>
    <span class="history-record-picker-sr" role="status">{{ isOpen ? `${matchingOptions.length} 个匹配活动` : '' }}</span>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { Check, ChevronDown } from 'lucide-vue-next';
import { filterPrecedentEventOptions, resolvePrecedentEventOption } from './precedentEventOptions.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);
const pickerElement = ref(null);
const inputElement = ref(null);
const listElement = ref(null);
const instanceId = useId();
const listId = `history-record-events-${instanceId}`;
const hintId = `${listId}-hint`;
const draftText = ref('');
const isOpen = ref(false);
const isEditing = ref(false);
const isComposing = ref(false);
const activeIndex = ref(-1);
const committedLabel = computed(() => props.options.find(option => option.value === props.modelValue)?.label || '');
const matchingOptions = computed(() => filterPrecedentEventOptions(props.options, isEditing.value ? draftText.value : ''));
const optionId = index => `${listId}-option-${index}`;
const activeOptionId = computed(() => isOpen.value && matchingOptions.value[activeIndex.value] ? optionId(activeIndex.value) : undefined);

function closeDropdown() {
  isOpen.value = false;
  isEditing.value = false;
  activeIndex.value = -1;
  draftText.value = committedLabel.value;
}

function openDropdown() {
  if (isOpen.value) return;
  isOpen.value = true;
  activeIndex.value = matchingOptions.value.findIndex(option => option.value === props.modelValue);
}

function toggleDropdown() {
  if (isOpen.value) {
    closeDropdown();
  } else {
    openDropdown();
    inputElement.value?.focus({ preventScroll: true });
    inputElement.value?.select();
  }
}

function onInputClick() {
  openDropdown();
  if (!isEditing.value) inputElement.value?.select();
}

function onInput(event) {
  draftText.value = event.target.value;
  isEditing.value = true;
  isOpen.value = true;
  // A partial match is never selected merely because it appears first in the list.
  activeIndex.value = -1;
}

function onCompositionEnd(event) {
  isComposing.value = false;
  onInput(event);
}

function commitOption(candidate) {
  const option = props.options.find(entry => entry.value === candidate?.value);
  if (!option) return;
  draftText.value = option.label;
  isEditing.value = false;
  isOpen.value = false;
  activeIndex.value = -1;
  if (option.value !== props.modelValue) emit('update:modelValue', option.value);
}

function onKeyDown(event) {
  if (event.isComposing || isComposing.value || event.keyCode === 229) {
    if (event.key === 'Escape') event.stopPropagation();
    return;
  }
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault();
    event.stopPropagation();
    closeDropdown();
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!isOpen.value) {
      openDropdown();
      if (activeIndex.value < 0 && matchingOptions.value.length) activeIndex.value = event.key === 'ArrowDown' ? 0 : matchingOptions.value.length - 1;
      return;
    }
    const count = matchingOptions.value.length;
    if (!count) return;
    if (activeIndex.value < 0) activeIndex.value = event.key === 'ArrowDown' ? 0 : count - 1;
    else activeIndex.value = (activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
  } else if (event.key === 'Enter' && isOpen.value) {
    event.preventDefault();
    const option = matchingOptions.value[activeIndex.value] || resolvePrecedentEventOption(props.options, draftText.value);
    if (option) commitOption(option);
  }
}

function onFocusOut(event) {
  if (!pickerElement.value?.contains(event.relatedTarget)) closeDropdown();
}

function onOutsidePointerDown(event) {
  if (isOpen.value && !pickerElement.value?.contains(event.target)) closeDropdown();
}

watch(() => props.modelValue, closeDropdown, { immediate: true });
watch(() => props.options, (_, previousOptions) => {
  // The history clock rebuilds these options every minute. Preserve an open
  // query and keyboard selection across refreshes, using stable event IDs.
  const previousMatches = filterPrecedentEventOptions(previousOptions, isEditing.value ? draftText.value : '');
  const activeValue = previousMatches[activeIndex.value]?.value;
  if (!isEditing.value) draftText.value = committedLabel.value;
  activeIndex.value = matchingOptions.value.findIndex(option => option.value === activeValue);
});
watch([isOpen, activeIndex], async () => {
  await nextTick();
  const list = listElement.value;
  const option = list?.children[activeIndex.value];
  if (!isOpen.value || !option) return;
  // Scroll only the list, without moving the containing panel or history page.
  if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
  else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
    list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }
}, { flush: 'post' });
onMounted(() => document.addEventListener('pointerdown', onOutsidePointerDown));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutsidePointerDown));
</script>

<style scoped>
.history-record-picker { position: relative; min-width: 0; width: 100%; }
.history-record-picker.is-open { z-index: 8; }
.history-record-picker-control { position: relative; min-width: 0; height: 36px; border-radius: 999px; }
[data-history-record-picker] input.history-record-picker-input {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 36px;
  margin: 0;
  padding: 0 38px 0 11px;
  border: 1px solid var(--ui-control-border);
  border-radius: 999px;
  background: var(--ui-glass-optical-control-bg);
  color: var(--ui-control-label);
  font-family: inherit;
  font-size: 0.8rem;
  line-height: normal;
  text-overflow: ellipsis;
  transform: none;
}
[data-history-record-picker] input.history-record-picker-input:focus {
  outline: 2px solid var(--ui-control-focus-color);
  outline-offset: 2px;
}
.history-record-picker-toggle {
  position: absolute;
  inset: 0 2px 0 auto;
  display: grid;
  place-items: center;
  width: 32px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ui-control-label-muted);
  cursor: pointer;
  transition: background-color var(--ui-motion-state);
}
.history-record-picker-toggle:active { background: color-mix(in srgb, var(--ui-control-label) 12%, transparent); }
.history-record-picker-menu {
  position: absolute;
  inset: calc(100% + 6px) 0 auto;
  overflow: hidden;
  border: 1px solid var(--ui-control-border);
  border-radius: 15px;
  background: var(--ui-glass-fallback-bg);
  color: var(--ui-control-label);
  box-shadow: 0 8px 24px rgb(0 0 0 / 16%);
}
.history-record-picker-list {
  position: relative;
  max-height: min(260px, 38dvh);
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  list-style: none;
  scrollbar-width: thin;
}
.history-record-picker-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  box-sizing: border-box;
  min-height: 38px;
  padding: 8px 10px;
  border-radius: 11px;
  font-size: 0.78rem;
  line-height: 1.45;
  cursor: pointer;
  transition: background-color var(--ui-motion-state);
}
.history-record-picker-option > span { min-width: 0; overflow-wrap: anywhere; }
.history-record-picker-option > svg { flex: 0 0 auto; color: var(--ui-control-focus-color); }
.history-record-picker-option.is-active { outline: 1px solid var(--ui-control-focus-color); outline-offset: -1px; }
.history-record-picker-option.is-active, .history-record-picker-option:hover { background: color-mix(in srgb, var(--ui-control-focus-color) 12%, transparent); }
.history-record-picker-option:active { background: color-mix(in srgb, var(--ui-control-focus-color) 22%, transparent); }
.history-record-picker-empty { margin: 0; padding: 12px; color: var(--ui-control-label-muted); font-size: 0.75rem; line-height: 1.5; }
.history-record-picker-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
@media (max-width: 520px) {
  .history-record-picker-control { height: 30px; }
  [data-history-record-picker] input.history-record-picker-input { height: 30px; margin: 0; font-size: 16px; transform: none; }
  .history-record-picker-option { min-height: 44px; }
}
@media (prefers-reduced-motion: reduce) {
  .history-record-picker-toggle, .history-record-picker-option { transition: none; }
}
</style>
