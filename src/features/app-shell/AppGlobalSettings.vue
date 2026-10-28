<template>
  <section class="global-settings" aria-label="全局显示设置" @click="dismissHelp">
    <div class="settings-card-block">
      <div class="settings-card-options">
        <div class="settings-row" role="group" aria-label="卡面样式">
          <span class="settings-label">卡面样式<button type="button" class="pjsk-ui-action settings-help" aria-label="卡面样式说明" aria-controls="global-settings-help" :aria-describedby="activeHelp === 'style' ? 'global-settings-help' : undefined" :aria-expanded="activeHelp === 'style'" @pointerenter="hoverHelp('style', $event)" @pointerleave="scheduleHelpDismiss" @focus="focusHelp('style', $event)" @blur="dismissHelp" @click.stop="toggleHelp('style', $event)"><CircleHelp :size="14" aria-hidden="true" /></button></span>
          <UiGlassTabs v-model="cardArtworkVersion" class="settings-choice-switch" :items="versions" label="卡面样式选项" contained />
        </div>
        <div class="settings-row" role="group" aria-label="单张卡面">
          <span class="settings-label">单张卡面<button type="button" class="pjsk-ui-action settings-help" aria-label="单张卡面说明" aria-controls="global-settings-help" :aria-describedby="activeHelp === 'face' ? 'global-settings-help' : undefined" :aria-expanded="activeHelp === 'face'" @pointerenter="hoverHelp('face', $event)" @pointerleave="scheduleHelpDismiss" @focus="focusHelp('face', $event)" @blur="dismissHelp" @click.stop="toggleHelp('face', $event)"><CircleHelp :size="14" aria-hidden="true" /></button></span>
          <UiGlassTabs v-model="singleCardFace" class="settings-choice-switch" :items="faces" label="单张卡面选项" contained />
        </div>
      </div>
      <CardArtwork class="settings-card-preview" :size="64" :src="preview.src" :rarity="preview.card?.Rarity || 4"
        :attribute="preview.card?.Attribute || 'Pure'" :unit="preview.card?.Affiliation || 'ln'"
        :trained="preview.variant === 'after_training'" show-stars show-unit show-ribbon show-permanent-ribbon
        :ribbon-label="preview.typeInfo.limitedLabel" :is-permanent="Boolean(preview.card) && preview.typeInfo.cardTypeGroup === 'perm'"
        fallback-text="卡面预览" alt="卡面样式预览" />
    </div>
    <div v-for="row in generalRows" :key="row.key" class="settings-row" role="group" :aria-label="row.label">
      <span class="settings-label">{{ row.label }}<button type="button" class="pjsk-ui-action settings-help" :aria-label="`${row.label}说明`" aria-controls="global-settings-help" :aria-describedby="activeHelp === row.key ? 'global-settings-help' : undefined" :aria-expanded="activeHelp === row.key" @pointerenter="hoverHelp(row.key, $event)" @pointerleave="scheduleHelpDismiss" @focus="focusHelp(row.key, $event)" @blur="dismissHelp" @click.stop="toggleHelp(row.key, $event)"><CircleHelp :size="14" aria-hidden="true" /></button></span>
      <UiGlassTabs :model-value="row.model.value" class="settings-choice-switch" :items="row.items" :label="`${row.label}选项`" contained @update:model-value="row.model.value = $event" />
    </div>
    <div ref="helpPopup" id="global-settings-help" class="settings-help-popover" role="tooltip" popover="manual" :style="helpPosition" @pointerenter="cancelHelpDismiss" @pointerleave="scheduleHelpDismiss" @click.stop>{{ helpMessages[activeHelp] }}</div>
  </section>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { CircleHelp } from 'lucide-vue-next';
import CardArtwork from '../../components/ui/CardArtwork.vue';
import UiGlassTabs from '../../components/ui/UiGlassTabs.vue';
import { APP_SETTINGS_KEY } from '../../services/appSettings.js';
import { getCardImageVariantForMode } from '../../utils/cardImageVariants.js';
import { buildAssetUrl } from '../../utils/assets.js';
import { getCardYearTypeInfo } from '../card-stats/cardYearCardTypes.js';

const props = defineProps({ allCards: { type: Array, default: () => [] }, allCharacters: { type: Array, default: () => [] } });
const { cardArtworkVersion, singleCardFace, nameFormat, appearance, allowSpoilers } = inject(APP_SETTINGS_KEY);
const versions = [{ value: 'v1', label: 'V1' }, { value: 'v2', label: 'V2' }];
const faces = [{ value: 'before', label: '花前' }, { value: 'after', label: '花后' }];
const nameFormats = [{ value: 'abbr', label: '缩写' }, { value: 'single', label: '单字' }];
const spoilerMode = computed({ get: () => allowSpoilers.value ? 'on' : 'off', set: value => { allowSpoilers.value = value === 'on'; } });
const generalRows = [
  { key: 'name', label: '名称格式', model: nameFormat, items: nameFormats },
  { key: 'appearance', label: '外观模式', model: appearance, items: [{ value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }, { value: 'system', label: '系统' }] },
  { key: 'spoilers', label: '显示剧透', model: spoilerMode, items: [{ value: 'off', label: '关闭' }, { value: 'on', label: '开启' }] },
];
const activeHelp = ref('');
const helpPopup = ref(null);
const helpPosition = ref({});
let helpTrigger = null;
let helpPinned = false;
let helpDismissTimer = null;
const helpMessages = {
  style: '切换卡框与卡面上的属性图标样式。',
  face: '用于单张卡面，双卡面详情不变；缺少对应卡面时自动回退。',
  name: '用于卡片统计的角色简称与相关标记。',
  appearance: '系统模式会随设备的深浅外观切换。',
  spoilers: '允许提前查看尚未到展示时间的卡面、歌曲等内容。',
};
const cancelHelpDismiss = () => {
  clearTimeout(helpDismissTimer);
  helpDismissTimer = null;
};
const dismissHelp = () => {
  cancelHelpDismiss();
  activeHelp.value = '';
  helpPinned = false;
  if (helpPopup.value?.matches(':popover-open')) helpPopup.value.hidePopover();
};
const scheduleHelpDismiss = () => {
  cancelHelpDismiss();
  if (!helpPinned) helpDismissTimer = setTimeout(dismissHelp, 120);
};
const showHelp = async (key, event) => {
  cancelHelpDismiss();
  activeHelp.value = key;
  helpTrigger = event.currentTarget;
  const trigger = helpTrigger;
  await nextTick();
  const popup = helpPopup.value;
  if (!popup?.isConnected || activeHelp.value !== key || helpTrigger !== trigger) return;
  // The top layer keeps help outside the scrolling settings panel's clipping.
  popup.showPopover();
  const anchor = trigger.getBoundingClientRect();
  const box = popup.getBoundingClientRect();
  const left = Math.max(8, Math.min(anchor.left - 8, window.innerWidth - box.width - 8));
  const below = anchor.bottom + 6;
  const top = below + box.height <= window.innerHeight - 8 ? below : Math.max(8, anchor.top - box.height - 6);
  helpPosition.value = { left: `${left}px`, top: `${top}px` };
};
const hoverHelp = (key, event) => {
  if (event.pointerType !== 'mouse') return;
  if (activeHelp.value !== key) helpPinned = false;
  showHelp(key, event);
};
const focusHelp = (key, event) => {
  if (event.currentTarget.matches(':focus-visible')) showHelp(key, event);
};
const toggleHelp = (key, event) => {
  if (activeHelp.value === key && helpPinned) return dismissHelp();
  helpPinned = true;
  showHelp(key, event);
};
const closeHelp = event => {
  if (event.key !== 'Escape' || event.defaultPrevented || !activeHelp.value) return;
  event.preventDefault();
  event.stopPropagation();
  helpTrigger?.focus({ preventScroll: true });
  dismissHelp();
};
onMounted(() => {
  window.addEventListener('keydown', closeHelp, true);
  window.addEventListener('resize', dismissHelp);
  window.addEventListener('scroll', dismissHelp, true);
});
onBeforeUnmount(() => {
  dismissHelp();
  window.removeEventListener('keydown', closeHelp, true);
  window.removeEventListener('resize', dismissHelp);
  window.removeEventListener('scroll', dismissHelp, true);
});
const preview = computed(() => {
  const card = props.allCards.find(item => String(item.CardID) === '289');
  const character = props.allCharacters.find(item => item.zh_name === String(card?.Name || '').split(/\s+/)[0]);
  const variant = getCardImageVariantForMode(card?.CardID, singleCardFace.value, card?.Rarity, card?.Type);
  const folder = character ? `${String(character.id).padStart(3, '0')}${String(character.en_abbr).toLowerCase()}` : '';
  return { card, variant, typeInfo: getCardYearTypeInfo(card), src: folder ? buildAssetUrl(`/cards/${folder}/card${card.CardID}${variant === 'after_training' ? '_t' : ''}.webp`) : '' };
});
</script>

<style scoped>
.global-settings { display: grid; gap: 9px; padding: 2px; color: var(--ui-control-label); }
.settings-card-block { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.settings-card-options { display: grid; flex: 1 0 auto; gap: 5px; min-width: 0; }
.settings-card-preview { margin-left: auto; }
.settings-row { display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 28px; }
.settings-label { display: inline-flex; align-items: center; gap: 3px; flex: 0 0 76px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
.settings-choice-switch { --settings-choice-base: color-mix(in srgb, var(--ui-control-label) 8%, transparent); flex: 0 0 160px; width: 160px; min-width: 0; gap: 0; padding: 2px; box-sizing: border-box; border-radius: 999px; }
.settings-choice-switch :deep(.desktop-tab-track) { inset: 0; }
.settings-choice-switch :deep(.primary-tab-button) { z-index: 3; flex: 1; min-width: 0; min-height: 24px; padding: 3px 6px; font-size: 0.72rem; font-weight: 600; line-height: 1; }
.settings-choice-switch :deep(.primary-tab-button.active) { color: var(--ui-control-focus-color); }
/* Keep the selected surface transparent enough to share the panel's backdrop. */
.settings-choice-switch[data-ui-glass-contained='true'] :deep(.desktop-tab-glider[data-ui-glass-lens-role='selector'][data-ui-glass-active]) { --ui-glass-surface-bg: var(--ui-glass-optical-lens-bg); background: var(--ui-glass-surface-bg), var(--settings-choice-base) !important; border-color: var(--ui-glass-optical-micro-border); box-shadow: var(--ui-glass-lens-bevel-shadow) !important; }
.settings-help { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 20px; width: 20px; height: 22px; padding: 0; border: 0; border-radius: 999px; background: transparent; color: var(--ui-control-label-muted); cursor: pointer; }
.settings-help[aria-expanded='true'] { color: var(--ui-control-focus-color); }
.settings-help-popover { position: fixed; inset: auto; box-sizing: border-box; width: max-content; max-width: min(240px, calc(100vw - 16px)); margin: 0; padding: 8px 10px; border: 1px solid var(--ui-control-border); border-radius: 12px; background: var(--ui-glass-fallback-bg); color: var(--ui-control-label); box-shadow: var(--ui-shell-glass-shadow-soft); font-family: inherit; font-size: 0.72rem; line-height: 1.6; overflow-wrap: anywhere; }
</style>
