<template>
  <details class="precedent-evidence">
    <summary class="pjsk-ui-action">依据<span v-if="evidenceCount"> {{ evidenceCount }}</span></summary>
    <div v-if="record.type === 'interval'" class="precedent-interval-evidence">
      <template v-for="section in intervalSections" :key="section.key">
      <section v-for="range in section.ranges" :key="range.key" class="precedent-evidence-section" :data-evidence-section="section.key" :aria-label="`${section.label} · ${range.name}`">
        <h4>{{ section.key === 'previous' && range.metrics.length === 1 ? `此前${range.metrics[0].unit === 'days' ? '天数' : '期数'}纪录` : section.label }}</h4>
        <div class="precedent-evidence-range">
          <div class="precedent-range-heading">
            <span class="precedent-evidence-holder" :title="range.name"><img :src="`/chars/${presentation.getCharAbbr(range.name)}.png`" :alt="range.name" /><span>{{ range.name }}</span></span>
            <div class="precedent-range-metrics"><span v-for="metric in range.metrics" :key="metric.unit"><strong>{{ metric.value }}</strong>{{ metric.unit === 'days' ? '天' : '期' }}</span></div>
          </div>
          <div class="precedent-evidence-range-track">
            <template v-for="(endpoint, index) in range.endpoints" :key="index">
              <span v-if="index" class="precedent-evidence-connector" aria-hidden="true"></span>
              <div class="precedent-evidence-endpoint" :aria-label="index ? '终点' : '起点'">
                <HistoryPrecedentCardGallery v-if="endpoint.cards.length" :cards="endpoint.cards" :presentation="presentation" :card-media="cardMedia" :attribute-labels="attributeLabels" :event-for-card="eventForCard" :jump-to-event="jumpToEvent" :date-label="new Date(endpoint.timestamp).toLocaleDateString('zh-CN')" />
                <template v-else>
                  <div class="precedent-endpoint-fallback"><img :src="`/chars/${presentation.getCharAbbr(range.name)}.png`" :alt="range.name" /></div>
                  <button type="button" class="pjsk-ui-action precedent-endpoint-jump precedent-surface ui-liquid-glass ui-liquid-glass--chip" :title="`#${endpoint.event.id} · ${endpoint.event.event_title || endpoint.event.event_type || ''}`" :aria-label="`定位活动 ${endpoint.event.id}`" @click="jumpToEvent(endpoint.event.id)">{{ eventShortLabel(endpoint.event) }}<ArrowUpRight :size="10" aria-hidden="true" /></button>
                  <time>{{ new Date(endpoint.timestamp).toLocaleDateString('zh-CN') }}</time>
                </template>
              </div>
            </template>
          </div>
        </div>
      </section>
      </template>
    </div>
    <template v-else>
      <div v-if="record.breakdown" class="precedent-reward-breakdown" aria-label="报酬组成"><span class="precedent-surface ui-liquid-glass ui-liquid-glass--chip">三星<strong>{{ record.breakdown.three }}</strong></span><span class="precedent-surface ui-liquid-glass ui-liquid-glass--chip">二星<strong>{{ record.breakdown.two }}</strong></span></div>
      <div v-if="record.ceilingFirsts?.length || record.scopeFirsts?.some(scope => scope !== 'all')" class="precedent-evidence-scopes">
        <template v-if="record.ceilingFirsts?.length"><span v-for="first in record.ceilingFirsts" :key="first.attribute" class="precedent-surface ui-liquid-glass ui-liquid-glass--chip">{{ record.cohort.toUpperCase() }} · {{ first.attribute === 'any' ? '任意花色' : attributeLabels[first.attribute] }}新上限</span></template>
        <template v-else><span v-for="scope in record.scopeFirsts.filter(scope => scope !== 'all')" :key="scope" class="precedent-surface ui-liquid-glass ui-liquid-glass--chip">{{ scopeLabel(scope) }}首次</span></template>
      </div>
      <p v-for="first in alternateCeilings" :key="first.attribute" class="precedent-detail-note">{{ attributeLabels[first.attribute] }}首次 {{ first.advancement.fromThreshold }} → {{ first.advancement.toThreshold }} 四星 · 用时 {{ first.advancement.days }} 天</p>
      <p v-for="advance in alternateAdvancements" :key="advance.scope" class="precedent-detail-note">{{ scopeLabel(advance.scope) }} · 上一阶 {{ new Date(advance.previous.timestamp).toLocaleDateString('zh-CN') }} · {{ [...new Set(advance.previous.holders.map(holder => holder.name))].join('、') }} · 用时 {{ advance.days }} 天</p>
      <p v-if="record.type === 'pairFirst'" class="precedent-detail-note">{{ record.rules.poolIncludeFes ? '计入 FES' : '不计入 FES' }} · {{ record.rules.poolOwnVsOnly ? '仅计入本团V' : '不限VS归属' }}；限定同池计入 WL 和联动，FES依上方选项。</p>
      <p v-if="record.attainment && record.attainment.timestamp !== record.timestamp" class="precedent-detail-note">首次达到 {{ record.attainment.count }} 次 · {{ new Date(record.attainment.timestamp).toLocaleDateString('zh-CN') }} <button type="button" class="pjsk-ui-action precedent-endpoint-jump precedent-surface ui-liquid-glass ui-liquid-glass--chip" @click="jumpToEvent(record.attainment.event.id)">{{ presentation.formatSeriesCompact(record.attainment.event) || `#${record.attainment.event.id}` }}<ArrowUpRight :size="10" aria-hidden="true" /></button></p>
      <HistoryPrecedentSongGallery v-if="record.songEvidence" :items="record.songEvidence" :presentation="presentation" :jump-to-event="jumpToEvent" />
      <HistoryPrecedentEventGallery v-else-if="record.eventEvidence" :items="record.eventEvidence" :presentation="presentation" :card-media="cardMedia" :attribute-labels="attributeLabels" :jump-to-event="jumpToEvent" />
      <p v-else-if="record.type === 'period' && !record.evidence.length" class="precedent-detail-note">{{ record.value === 0 ? '本期间没有符合条件的记录。' : '活动依据见上方时间线。' }}</p>
      <HistoryPrecedentCardGallery v-else :cards="record.evidence" :matched-cards="record.matchedCards || []" :presentation="presentation" :card-media="cardMedia" :attribute-labels="attributeLabels" :event-for-card="eventForCard" :jump-to-event="jumpToEvent" />
    </template>
  </details>
</template>

<script setup>
import { computed } from 'vue';
import { ArrowUpRight } from 'lucide-vue-next';
import HistoryPrecedentCardGallery from './HistoryPrecedentCardGallery.vue';
import HistoryPrecedentSongGallery from './HistoryPrecedentSongGallery.vue';
import HistoryPrecedentEventGallery from './HistoryPrecedentEventGallery.vue';
import { buildIntervalEvidenceSections } from './precedentEvidence.js';
const props = defineProps({ record: { type: Object, required: true }, presentation: { type: Object, required: true },
  cardMedia: { type: Object, required: true }, attributeLabels: { type: Object, required: true },
  scopeOptions: { type: Array, required: true }, eventForCard: { type: Function, required: true }, jumpToEvent: { type: Function, required: true } });
const intervalSections = computed(() => buildIntervalEvidenceSections(props.record, props.eventForCard));
const evidenceCount = computed(() => props.record.songEvidence?.length ?? props.record.eventEvidence?.length ?? props.record.evidence.length);
const scopeLabel = scope => props.scopeOptions.find(option => option.value === scope)?.label || scope;
const alternateCeilings = computed(() => (props.record.ceilingFirsts || []).filter(first => first.advancement
  && first.advancement !== props.record.advancement && first.advancement.days !== props.record.advancement?.days));
const alternateAdvancements = computed(() => Object.values(props.record.advancementsByScope || {}).filter(advance => advance
  && advance.scope !== props.record.advancement?.scope && advance.days !== props.record.advancement?.days && ['all', 'oc', 'vs'].includes(advance.scope)));
const eventShortLabel = event => props.presentation.formatSeriesCompact(event).trim() || event.event_type || `#${event.id}`;
</script>

<style scoped>
.precedent-evidence { container: precedent-evidence / inline-size; min-width: 0; margin-top: 8px; padding-top: 5px; border-top: 1px solid var(--precedent-divider); color: var(--precedent-muted); font-size: 0.75rem; }
.precedent-evidence > summary { width: fit-content; cursor: pointer; color: var(--precedent-ink); border-radius: 4px; font-size: 0.75rem; font-weight: 600; padding-block: 4px; }
.precedent-evidence > summary > span { margin-left: 3px; color: var(--precedent-muted); font-size: 0.6875rem; font-weight: 400; }
.precedent-interval-evidence { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); align-items: start; gap: 12px 18px; margin-top: 7px; }
.precedent-evidence-section { min-width: 0; }
.precedent-evidence-section + .precedent-evidence-section { border-top: 1px solid var(--precedent-divider); padding-top: 10px; }
.precedent-evidence-section h4 { margin: 0 0 7px; color: var(--precedent-ink); font-size: 0.8125rem; font-weight: 650; }
[data-evidence-section="current"] h4 { color: var(--precedent-accent); }
.precedent-range-heading { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-width: 0; }
.precedent-evidence-holder { display: inline-flex; align-items: center; gap: 5px; min-width: 0; color: var(--precedent-ink); font-size: 0.75rem; }
.precedent-evidence-holder img { width: 22px; height: 22px; object-fit: contain; flex: 0 0 auto; }
.precedent-evidence-holder > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.precedent-range-metrics { display: flex; align-items: baseline; flex-wrap: wrap; justify-content: flex-end; gap: 3px 8px; font-variant-numeric: tabular-nums; }
.precedent-range-metrics > span { display: inline-flex; align-items: baseline; gap: 3px; white-space: nowrap; font-size: 0.6875rem; }
.precedent-range-metrics strong { font-size: 0.875rem; font-weight: 600; color: var(--precedent-muted); }
[data-evidence-section="current"] .precedent-range-metrics strong { color: var(--precedent-accent); font-size: 1.125rem; font-weight: 700; }
.precedent-evidence-range-track { display: grid; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr); gap: 7px; align-items: start; max-width: 190px; margin: 4px auto 0; }
.precedent-evidence-endpoint { display: grid; justify-items: center; min-width: 0; }
.precedent-evidence-endpoint .precedent-evidence-gallery { width: var(--precedent-card-size); max-width: 100%; margin: 0; }
.precedent-evidence-connector { position: relative; height: 1px; margin-top: calc(var(--precedent-card-size) / 2); background: color-mix(in srgb, var(--precedent-accent) 42%, var(--ui-control-border)); }
.precedent-evidence-connector::before, .precedent-evidence-connector::after { content: ''; position: absolute; top: -3px; box-sizing: border-box; width: 7px; height: 7px; border: 1px solid var(--precedent-accent); border-radius: 50%; background: var(--precedent-surface-fill); }
.precedent-evidence-connector::before { left: -1px; }
.precedent-evidence-connector::after { right: -1px; background: var(--precedent-accent); }
.precedent-endpoint-fallback { display: grid; place-items: center; width: var(--precedent-card-size); max-width: 100%; aspect-ratio: 1; }
.precedent-endpoint-fallback img { width: 42px; height: 42px; object-fit: contain; }
.precedent-endpoint-jump { display: inline-flex; align-items: center; justify-content: center; gap: 3px; max-width: 100%; min-height: 24px; padding: 1px 6px; border: 1px solid var(--ui-control-border); border-radius: 999px; color: var(--precedent-accent); background: var(--precedent-surface-fill); font-family: inherit; font-size: 0.75rem; cursor: pointer; }
.precedent-evidence-endpoint > time { margin-top: 2px; font-size: 0.6875rem; line-height: 1.25; font-variant-numeric: tabular-nums; white-space: nowrap; }
.precedent-reward-breakdown, .precedent-evidence-scopes { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
.precedent-reward-breakdown > span, .precedent-evidence-scopes > span { display: inline-flex; align-items: baseline; gap: 6px; padding: 3px 7px; border-radius: 999px; background: var(--precedent-surface-fill); font-size: 0.66rem; }
.precedent-reward-breakdown strong { color: var(--precedent-ink); font-size: 0.78rem; font-variant-numeric: tabular-nums; }
.precedent-detail-note { margin: 7px 0; font-size: 0.69rem; line-height: 1.5; color: var(--precedent-muted); }
@container precedent-evidence (min-width: 458px) {
  .precedent-evidence-section + .precedent-evidence-section { border-top: 0; padding-top: 0; border-left: 1px solid var(--precedent-divider); padding-left: 12px; }
  .precedent-evidence-section:nth-child(2n + 1) { border-left: 0; padding-left: 0; }
}
@container precedent-evidence (min-width: 696px) {
  .precedent-evidence-section + .precedent-evidence-section { border-left: 1px solid var(--precedent-divider); padding-left: 12px; }
  .precedent-evidence-section:nth-child(3n + 1) { border-left: 0; padding-left: 0; }
}
@media (max-width: 520px) {
  [data-evidence-section="current"] .precedent-range-metrics strong { font-size: 1rem; }
}
</style>
