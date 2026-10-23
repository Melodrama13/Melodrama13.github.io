<template>
  <div class="precedent-filter-grid" :class="{ 'is-secondary': secondary }" :style="columns" role="group" :aria-label="label">
    <label v-for="field in fields" :key="field.key" :data-query-field="field.key">
      <span>{{ field.label }}</span>
      <span class="precedent-field-surface precedent-surface ui-liquid-glass ui-liquid-glass--chip">
        <input v-if="field.kind === 'number'" v-model.number="draft[field.key]" type="number" min="1" step="1" class="pjsk-ui-field" :aria-label="field.ariaLabel" />
        <select v-else :value="field.key === 'project' ? project : draft[field.key]" class="pjsk-ui-field" :aria-label="field.ariaLabel" @change="change(field, $event.target.value)">
          <template v-for="(group, index) in field.groups || [{ options: field.options }]" :key="index">
            <optgroup v-if="group.label" :label="group.label"><option v-for="option in group.options" :key="option.value" :value="option.value">{{ option.label }}</option></optgroup>
            <template v-else><option v-for="option in group.options" :key="option.value" :value="option.value">{{ option.label }}</option></template>
          </template>
        </select>
        <ChevronDown v-if="field.kind !== 'number'" class="precedent-field-chevron" :size="12" aria-hidden="true" />
      </span>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
const props = defineProps({ fields: { type: Array, required: true }, draft: { type: Object, required: true }, project: { type: String, default: '' }, label: { type: String, required: true }, secondary: Boolean });
const emit = defineEmits(['project']);
const columns = computed(() => {
  const count = Math.max(1, props.fields.length);
  const balanced = max => Math.ceil(count / Math.ceil(count / max));
  return { '--query-narrow-columns': balanced(3), '--query-medium-columns': balanced(4), '--query-wide-columns': balanced(6) };
});
function change(field, raw) {
  const selected = (field.options || field.groups.flatMap(group => group.options)).find(option => String(option.value) === raw);
  if (field.key === 'project') emit('project', selected.value);
  else props.draft[field.key] = selected?.value ?? raw;
}
</script>

<style scoped>
.precedent-filter-grid { display: grid; grid-template-columns: repeat(var(--query-narrow-columns), minmax(0, 1fr)); gap: 10px; }
.precedent-filter-grid.is-secondary { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--precedent-divider); }
label { display: flex; flex-direction: column; gap: 6px; min-width: 0; color: var(--precedent-muted); font-size: 0.72rem; }
select, input { box-sizing: border-box; min-width: 0; width: 100%; height: 36px; padding: 0 11px; font-family: inherit; font-size: 0.8rem; color: var(--precedent-ink); border: 1px solid var(--ui-control-border); background: transparent; }
select { padding-right: 28px; text-overflow: ellipsis; }
@media (max-width: 520px) {
  .precedent-filter-grid { gap: 7px 6px; }
  .precedent-filter-grid.is-secondary { margin-top: 9px; padding-top: 9px; }
  label { gap: 4px; }
  select, input { width: calc(100% / var(--precedent-field-scale)); height: calc(var(--precedent-field-height) / var(--precedent-field-scale)); margin-block: calc((var(--precedent-field-height) - var(--precedent-field-height) / var(--precedent-field-scale)) / 2); font-size: 16px; transform: scale(var(--precedent-field-scale)); transform-origin: left center; }
}
@container history-precedent (min-width: 540px) { .precedent-filter-grid { grid-template-columns: repeat(var(--query-medium-columns), minmax(0, 1fr)); } }
@container history-precedent (min-width: 760px) { .precedent-filter-grid { grid-template-columns: repeat(var(--query-wide-columns), minmax(0, 1fr)); gap: 10px 12px; } }
</style>
