<template>
  <div class="precedent-pool-builder">
    <div class="configuration-fields configuration-basics" role="group" aria-label="配置范围">
      <label>UP数<select v-model="draft.threshold" class="pjsk-ui-field" aria-label="数量"><option value="">不限</option><option v-for="option in quantityOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      <label>活动<select v-model="draft.eventType" class="pjsk-ui-field" aria-label="配置活动"><option value="">不限</option><option value="box">箱活</option><option value="mix">混活</option><option value="collab">联动</option></select></label>
      <label>卡池<select v-model="draft.gachaType" class="pjsk-ui-field" aria-label="配置卡池"><option value="">不限</option><option value="perm">常驻</option><option value="limited">限定</option></select></label>
    </div>
    <div class="configuration-cards" role="group" aria-label="卡片条件">
      <section v-for="(slot, index) in draft.cardSlots" :key="index" class="configuration-card" :aria-label="`卡片条件 ${index + 1}`">
        <header><strong>卡片 {{ index + 1 }}</strong><div class="configuration-card-actions">
          <button type="button" class="pjsk-ui-action" :aria-label="`复制卡片条件 ${index + 1}`" title="复制卡片条件" @click="draft.cardSlots.splice(index + 1, 0, { ...slot })"><Copy :size="14" aria-hidden="true" /></button>
          <button type="button" class="pjsk-ui-action" :aria-label="`删除卡片条件 ${index + 1}`" title="删除卡片条件" @click="draft.cardSlots.splice(index, 1)"><X :size="15" aria-hidden="true" /></button>
        </div></header>
        <div class="configuration-fields configuration-card-fields">
          <label>星级<select v-model="slot.rarity" class="pjsk-ui-field" :aria-label="`星级 ${index + 1}`"><option value="4">四星</option><option value="3">三星</option><option value="2">二星</option><option value="">任意</option></select></label>
          <label>技能<select v-model="slot.skill" class="pjsk-ui-field" :aria-label="`技能 ${index + 1}`"><option value="">任意</option><optgroup v-for="group in skillGroups" :key="group.label" :label="group.label"><option v-for="option in group.options" :key="option.value" :value="option.value">{{ option.label }}</option></optgroup></select></label>
          <label>花色<select v-model="slot.attribute" class="pjsk-ui-field" :aria-label="`花色 ${index + 1}`"><option value="">任意</option><option v-for="(label, key) in attributes" :key="key" :value="key">{{ label }}</option></select></label>
          <label>附属组合<select v-model="slot.unit" class="pjsk-ui-field" :aria-label="`附属组合 ${index + 1}`"><option value="">任意</option><option v-for="(label, key) in units" :key="key" :value="key">{{ label }}</option></select></label>
        </div>
      </section>
    </div>
    <button type="button" class="pjsk-ui-action configuration-add" @click="draft.cardSlots.push(createConfigurationCard())"><Plus :size="14" aria-hidden="true" />添加卡片</button>
    <p v-if="usesRewards" class="configuration-hint">三星／二星仅计入当期报酬；UP数只计算四星。</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Plus, Copy, X } from 'lucide-vue-next';
import { CONFIGURATION_SKILLS, CONFIGURATION_UNITS as units, createConfigurationCard } from './precedentPoolQueries.js';
import { PRECEDENT_ATTRIBUTE_LABELS as attributes } from './precedentRecords.js';
const props = defineProps({ draft: { type: Object, required: true }, quantityOptions: { type: Array, required: true } });
const skillGroups = [
  { label: '技能', keys: ['pureScore', 'nonScore', 'p_score', 'score_up', 'unit_score', 'recovery', 'accuracy'] },
  { label: 'FES', keys: ['cfes_l', 'cfes_j', 'bfes_up'] },
  { label: '其他', keys: ['pending'] },
].map(group => ({ label: group.label, options: group.keys.map(value => ({ value, label: CONFIGURATION_SKILLS[value] })) }));
const usesRewards = computed(() => props.draft.cardSlots.some(slot => slot.rarity === '' || ['2', '3'].includes(slot.rarity)));
</script>

<style scoped>
.configuration-fields { display: grid; gap: 10px 12px; }
.configuration-basics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.configuration-fields label { display: flex; flex-direction: column; gap: 6px; min-width: 0; font-size: 0.72rem; color: var(--precedent-muted); }
.configuration-fields select { box-sizing: border-box; width: 100%; min-width: 0; height: 36px; padding: 0 20px 0 11px; font-family: inherit; font-size: 0.8rem; color: var(--precedent-ink); border: 1px solid var(--ui-control-border); background: var(--ui-glass-optical-control-bg); text-overflow: ellipsis; }
.configuration-cards { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; gap: 10px; margin-top: 12px; }
.configuration-card { min-width: 0; padding: 10px; border: 1px solid var(--precedent-divider); border-radius: 14px; background: var(--ui-glass-optical-group-bg); }
.configuration-card header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 7px; }
.configuration-card header strong { color: var(--precedent-ink); font-size: 0.75rem; font-weight: 650; }
.configuration-card-actions { display: flex; gap: 4px; }
.configuration-card-actions button { display: grid; place-items: center; width: 27px; height: 27px; padding: 0; border: 1px solid var(--ui-control-border); border-radius: 999px; background: var(--ui-glass-optical-control-bg); color: var(--precedent-muted); cursor: pointer; }
.configuration-card-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.configuration-add { display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; padding: 5px 9px; border: 1px solid var(--ui-control-border); border-radius: 999px; font-size: 0.72rem; color: var(--precedent-accent); background: var(--ui-glass-optical-group-bg); cursor: pointer; }
.configuration-hint { margin: 8px 0 0; color: var(--precedent-muted); font-size: 0.6875rem; line-height: 1.5; }
@media (max-width: 520px) {
  .configuration-fields { gap: 7px 6px; }
  .configuration-fields label { gap: 4px; }
  .configuration-fields select { width: calc(100% / var(--precedent-field-scale)); height: calc(var(--precedent-field-height) / var(--precedent-field-scale)); margin-block: calc((var(--precedent-field-height) - var(--precedent-field-height) / var(--precedent-field-scale)) / 2); font-size: 16px; transform: scale(var(--precedent-field-scale)); transform-origin: left center; }
  .configuration-cards { gap: 8px; margin-top: 9px; }
  .configuration-card { padding: 8px; border-radius: 12px; }
}
@container history-precedent (min-width: 760px) {
  .configuration-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .configuration-card-fields { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .configuration-card:only-child { grid-column: 1 / -1; }
}
</style>
