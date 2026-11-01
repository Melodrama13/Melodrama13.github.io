<template>
  <div class="gap-evidence">
    <div class="gap-endpoints">
      <section v-for="(point, index) in endpoints" :key="index" class="gap-endpoint">
        <header><span>{{ index ? record.recovery ? record.recovered ? '恢复点' : '条件中断' : record.milestoneAction === 'duration' ? '纪录当期' : '最后一期' : '异常开始' }}</span><time>{{ point.event.start_date }}</time></header>
        <div class="gap-comparison">
          <div v-for="(rows, side) in [point.high, point.low]" :key="side" class="gap-side" :aria-label="holderLabel(rows)">
            <small>{{ side ? record.gapComparison === 'personal' ? '本人' : '最低' : '最高' }}</small>
            <span class="gap-avatars" :title="holderLabel(rows)"><img v-for="holder in rows" :key="holder.name" :src="`/chars/${presentation.getCharAbbr(holder.name)}.png`" :alt="holder.name" loading="lazy" /></span>
            <strong>{{ rows[0]?.count ?? 0 }}</strong>
          </div>
        </div>
        <button type="button" class="pjsk-ui-action gap-event precedent-surface ui-liquid-glass ui-liquid-glass--chip" :title="eventTitle(point.event)" :aria-label="`定位活动 ${point.event.id}`" @click="jumpToEvent(point.event.id)">{{ shortLabel(point.event) }}<ArrowUpRight :size="10" aria-hidden="true" /></button>
      </section>
    </div>
    <section v-if="record.gapChanges?.length" class="gap-key-changes" aria-label="关键变化">
      <h4>关键变化</h4>
      <ol class="gap-changes">
        <li v-for="point in record.gapChanges" :key="`${point.kind}:${point.event.id}`" class="gap-change" :data-gap-change-kind="point.kind" :data-gap-change-event="point.event.id">
          <header><strong>{{ changeLabels[point.kind] }}</strong><span>极差 <b>{{ point.beforeGap }}</b><span class="gap-change-arrow" aria-hidden="true"> → </span><b>{{ point.afterGap }}</b></span></header>
          <div v-for="person in point.contributions" :key="person.name" class="gap-change-contribution">
            <HistoryPrecedentCardGallery :cards="person.cards" :presentation="presentation" :card-media="cardMedia" :attribute-labels="attributeLabels" :event-for-card="eventForCard" :jump-to-event="jumpToEvent" />
            <div class="gap-change-copy"><span>{{ person.name }}</span><span class="gap-change-counts"><strong>{{ person.before }}</strong> → <strong>{{ person.after }}</strong> {{ record.gapMetric === 'limited' ? '限定' : '四星' }}</span></div>
          </div>
          <div v-if="!point.contributions.length" class="gap-change-fallback"><button type="button" class="pjsk-ui-action gap-event precedent-surface ui-liquid-glass ui-liquid-glass--chip" :aria-label="`定位活动 ${point.event.id}`" @click="jumpToEvent(point.event.id)">{{ shortLabel(point.event) }}<ArrowUpRight :size="10" aria-hidden="true" /></button><time>{{ point.event.start_date }}</time></div>
        </li>
      </ol>
    </section>
    <div class="gap-period-heading"><span>持续 {{ record.after }} 期</span><small>最高 / {{ record.gapComparison === 'personal' ? '本人' : '最低' }} · 差值</small></div>
    <ol class="gap-periods" aria-label="逐期数量差距">
      <li v-for="point in periodSnapshots" :key="point.periodKey || point.event.id" :data-gap-event="point.event.id">
        <span class="gap-period-events"><button v-for="event in point.events" :key="event.id" type="button" class="pjsk-ui-action gap-event precedent-surface ui-liquid-glass ui-liquid-glass--chip" :title="eventTitle(event)" :aria-label="`定位活动 ${event.id}`" @click="jumpToEvent(event.id)">{{ shortLabel(event) }}<ArrowUpRight :size="10" aria-hidden="true" /></button><small v-if="point.events.length > 1">合计 1 期</small></span>
        <span class="gap-period-counts" :title="`${holderLabel(point.high)} / ${holderLabel(point.low)}`">{{ point.max }} / {{ point.low[0]?.count ?? 0 }}</span><strong class="gap-value">{{ point.gap }}</strong>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { ArrowUpRight } from 'lucide-vue-next';
import HistoryPrecedentCardGallery from './HistoryPrecedentCardGallery.vue';
const props = defineProps({ record: { type: Object, required: true }, presentation: { type: Object, required: true },
  cardMedia: { type: Object, required: true }, attributeLabels: { type: Object, required: true },
  eventForCard: { type: Function, required: true }, jumpToEvent: { type: Function, required: true } });
const endpoints = computed(() => [props.record.gapSnapshots[0], props.record.recovery || props.record.gapSnapshots.at(-1)]);
const periodSnapshots = computed(() => {
  const groups = new Map();
  for (const point of props.record.gapSnapshots) {
    const key = point.periodKey || String(point.event.id), previous = groups.get(key);
    groups.set(key, { ...point, events: [...previous?.events || [], point.event] });
  }
  return [...groups.values()];
});
const changeLabels = { onset: '异常开始', peak: '差距扩大', recovery: '恢复正常', exit: '条件中断' };
const holderLabel = rows => rows.map(row => `${row.name} ${row.count} 张`).join('、');
const shortLabel = event => event.event_type === '总集篇' && event.unit ? `${event.unit}总集篇` : props.presentation.formatSeriesCompact(event).trim() || `#${event.id}`;
const eventTitle = event => `#${event.id} · ${event.event_title || event.event_type}`;
</script>

<style scoped>
.gap-evidence { min-width: 0; margin-top: 7px; color: var(--precedent-ink); }
.gap-endpoints { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.gap-endpoint { display: grid; grid-template-rows: auto 1fr auto; min-width: 0; padding: 8px; border: 1px solid var(--precedent-divider); border-radius: 12px; }
.gap-endpoint header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 3px 6px; font-size: 0.6875rem; color: var(--precedent-muted); }
.gap-endpoint header > span { color: var(--precedent-ink); font-weight: 600; }
.gap-endpoint time { font-variant-numeric: tabular-nums; }
.gap-comparison { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 10px 0; }
.gap-side { display: grid; grid-template-rows: auto 1fr auto; justify-items: center; gap: 7px; min-width: 0; }
.gap-side small { font-size: 0.625rem; color: var(--precedent-muted); }
.gap-side strong { font-size: 1.125rem; line-height: 1; font-variant-numeric: tabular-nums; }
.gap-avatars { display: flex; flex-wrap: wrap; align-content: center; align-items: center; justify-content: center; gap: 4px; min-height: 19px; max-width: 100%; }
.gap-avatars img { display: block; width: 18px; height: 18px; object-fit: contain; }
.gap-event { display: inline-flex; align-items: center; justify-content: center; gap: 3px; box-sizing: border-box; max-width: 100%; padding: 2px 6px; min-height: 24px; border: 1px solid var(--ui-control-border); border-radius: 999px; background: var(--precedent-surface-fill); color: var(--precedent-accent); font: inherit; font-size: 0.6875rem; cursor: pointer; }
.gap-event svg { flex-shrink: 0; }
.gap-event:hover, .gap-event:focus-visible { border-color: var(--precedent-accent); }
.gap-endpoint > .gap-event { display: flex; width: fit-content; margin-inline: auto; }
.gap-period-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--precedent-divider); font-size: 0.75rem; font-weight: 600; }
.gap-period-heading small { font-size: 0.625rem; font-weight: 400; color: var(--precedent-muted); }
.gap-periods { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); gap: 0 12px; list-style: none; margin: 4px 0 0; padding: 0; }
.gap-periods li { display: flex; align-items: center; gap: 7px; min-width: 0; padding: 6px 0; border-bottom: 1px solid var(--precedent-divider); }
.gap-period-events { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; min-width: 0; }
.gap-period-events small { color: var(--precedent-muted); font-size: 0.625rem; }
.gap-period-counts { margin-left: auto; color: var(--precedent-muted); white-space: nowrap; font-size: 0.6875rem; font-variant-numeric: tabular-nums; }
.gap-value { min-width: 1ch; font-size: 0.9375rem; color: var(--precedent-accent); font-variant-numeric: tabular-nums; }
.gap-key-changes { margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--precedent-divider); }
.gap-key-changes h4 { margin: 0 0 8px; font-size: 0.75rem; font-weight: 600; }
.gap-changes { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 12px; padding: 0; margin: 0; list-style: none; }
.gap-change { min-width: 0; padding-left: 8px; border-left: 2px solid var(--precedent-divider); }
.gap-change header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 8px; margin-bottom: 7px; font-size: 0.6875rem; }
.gap-change header > strong { font-weight: 600; }
.gap-change header > span { color: var(--precedent-muted); white-space: nowrap; }
.gap-change header b { color: var(--precedent-accent); font-size: 0.9375rem; font-variant-numeric: tabular-nums; }
.gap-change-contribution { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; margin-top: 8px; }
.gap-change-contribution :deep(.precedent-evidence-gallery) { grid-template-columns: repeat(auto-fit, var(--precedent-card-size)); width: fit-content; margin-top: 0; }
.gap-change-copy { display: grid; align-content: center; min-height: var(--precedent-card-size); gap: 4px; font-size: 0.6875rem; }
.gap-change-counts { display: flex; align-items: baseline; gap: 3px; color: var(--precedent-muted); white-space: nowrap; }
.gap-change-counts strong { color: var(--precedent-ink); font-size: 0.8125rem; font-variant-numeric: tabular-nums; }
.gap-change-fallback { display: flex; align-items: center; gap: 8px; font-size: 0.6875rem; color: var(--precedent-muted); }
@media (max-width: 700px) {
  .gap-avatars { gap: 3px; }
  .gap-avatars img { width: 16px; height: 16px; }
}
</style>
