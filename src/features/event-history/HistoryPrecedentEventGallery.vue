<template>
  <ul class="precedent-event-gallery" aria-label="活动依据">
    <li v-for="item in items" :key="item.event.id">
      <HistoryPrecedentCardGallery v-if="item.card" :cards="[item.card]" :presentation="presentation" :card-media="cardMedia" :attribute-labels="attributeLabels" :event-for-card="() => item.event" :jump-to-event="jumpToEvent" :date-label="item.event.start_date" />
      <template v-else>
        <div class="precedent-event-unit" :title="item.event.event_title || item.event.event_type" :aria-label="item.units?.length ? item.units.map(unit => unit.toUpperCase()).join('、') : item.event.event_type" role="img"><img v-for="unit in item.units" :key="unit" :src="`/elements/${unit}.png`" :alt="unit.toUpperCase()" /><Layers v-if="!item.units?.length" :size="28" aria-hidden="true" /></div>
        <button type="button" class="pjsk-ui-action precedent-event-jump" :title="`#${item.event.id} · ${item.event.event_title || ''}`" :aria-label="`定位活动 ${item.event.id}`" @click="jumpToEvent(item.event.id)"><span>{{ presentation.formatSeriesCompact(item.event) || item.event.event_type || `#${item.event.id}` }}</span><ArrowUpRight :size="10" aria-hidden="true" /></button>
        <time>{{ item.event.start_date }}</time>
      </template>
    </li>
  </ul>
</template>

<script setup>
import { ArrowUpRight, Layers } from 'lucide-vue-next';
import HistoryPrecedentCardGallery from './HistoryPrecedentCardGallery.vue';
defineProps({ items: { type: Array, required: true }, presentation: { type: Object, required: true }, cardMedia: { type: Object, required: true },
  attributeLabels: { type: Object, required: true }, jumpToEvent: { type: Function, required: true } });
</script>

<style scoped>
.precedent-event-gallery { display: grid; grid-template-columns: repeat(auto-fill, var(--precedent-card-size)); align-items: start; gap: 6px; margin: 7px 0 0; padding: 0; list-style: none; min-width: 0; }
.precedent-event-gallery > li { display: flex; flex-direction: column; align-items: center; min-width: 0; gap: 2px; }
.precedent-event-gallery :deep(.precedent-evidence-gallery) { width: 100%; margin: 0; }
.precedent-event-unit { box-sizing: border-box; width: 100%; aspect-ratio: 1; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; align-content: center; gap: 2px; border-radius: 6px; background: var(--ui-glass-optical-group-bg); color: var(--precedent-muted); }
.precedent-event-unit img { width: 25px; height: 25px; object-fit: contain; }
.precedent-event-unit img:only-child { width: 44px; height: 44px; }
.precedent-event-jump { display: inline-flex; align-items: center; justify-content: center; gap: 3px; max-width: 100%; min-width: 0; min-height: 24px; box-sizing: border-box; padding: 1px 6px; border: 1px solid var(--ui-control-border); border-radius: 999px; background: var(--ui-glass-optical-group-bg); color: var(--precedent-accent); font: inherit; font-size: 0.75rem; cursor: pointer; }
.precedent-event-jump > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.precedent-event-jump > svg { flex-shrink: 0; }
.precedent-event-gallery time { display: block; width: 100%; text-align: center; font-size: 0.6875rem; line-height: 1.25; font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>
