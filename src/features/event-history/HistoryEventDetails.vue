<template>
  <section v-if="details" class="history-event-details" :data-event-id="event.id" :style="{ '--event-detail-tint': themeColor }" aria-label="活动详情">
    <header class="event-detail-overview event-detail-surface ui-liquid-glass ui-liquid-glass--chip" :class="{ 'has-banner': event.banner, 'has-unit-logo': unitLogo }">
        <img v-if="event.banner" class="event-detail-banner" :src="`/${bannerImageFailed ? 'chibi_s' : 'chibi'}/${presentation.getCharAbbr(event.banner)}.webp`" :alt="`Ban 主：${event.banner}`" :title="`Ban 主：${event.banner}`" @error="bannerImageFailed = true" />
        <div class="event-detail-heading-copy"><div class="event-detail-eyebrow"><span>#{{ event.id }}</span><span v-if="event.event_type" class="event-detail-type event-detail-surface ui-liquid-glass ui-liquid-glass--chip" :data-event-type="event.event_type" :style="presentation.getEditorSeriesStyle(event, { glass: true })" :title="classification"><span class="event-detail-type-full">{{ classification }}</span><span class="event-detail-type-compact">{{ compactClassification }}</span></span><span v-if="event.festival" class="event-detail-festival event-detail-surface ui-liquid-glass ui-liquid-glass--chip">{{ event.festival }}</span></div>
          <h3>{{ event.event_title || event.event_type || '活动名称未收录' }}</h3>
        </div>
        <img v-if="unitLogo" class="event-detail-unit-logo" :src="unitLogo" :alt="event.unit" :title="event.unit" />
        <img v-if="unitLogo" class="event-detail-unit-mark" :src="`/elements/${event.unit.toLowerCase()}.png`" :alt="event.unit" :title="event.unit" />
        <img v-if="attributeLabels[event.event_attribute]" class="event-detail-attribute" :src="`/elements/${event.event_attribute.toLowerCase()}.png`" :alt="attributeLabels[event.event_attribute]" :title="attributeLabels[event.event_attribute]" />
        <div class="event-detail-period" aria-label="活动时间（UTC+8）"><CalendarDays :size="14" aria-hidden="true" /><time :datetime="period.start.dateTime">{{ period.start.date || '未收录' }}<span v-if="period.start.time"> {{ period.start.time }}</span></time><span aria-label="至">–</span><time :datetime="period.end.dateTime">{{ period.end.date || '未收录' }}<span v-if="period.end.time"> {{ period.end.time }}</span></time><small>UTC+8</small></div>
    </header>

    <HistoryWorldLinkChapters v-if="isWorldLink" :event-id="event.id" :characters="characters" :presentation="presentation" />

    <section class="event-detail-section" aria-label="卡池信息">
      <div class="event-detail-section-heading"><h3><Layers :size="16" aria-hidden="true" />卡池信息</h3><span>{{ event.memberCards.length }} 张卡片</span></div>
      <div class="event-detail-pool-heading"><h4>{{ event.gacha_title || '卡池名称未收录' }}</h4><span v-if="event.gacha_type" class="event-detail-gacha-type event-detail-surface ui-liquid-glass ui-liquid-glass--chip" :data-gacha-type="event.gacha_type">{{ event.gacha_type === '联动_true' ? '联动限定' : event.gacha_type }}</span></div>
      <section v-for="group in details.groups" :key="group.key" class="event-detail-card-group" :data-card-group="group.key" :aria-label="group.label">
        <h4 class="event-detail-group-heading"><img v-if="group.icon" :src="`/elements/${group.icon}.webp`" :alt="group.label" :title="group.label" loading="lazy" decoding="async" /><template v-else>{{ group.label }}</template><small>{{ group.cards.length }}</small></h4>
        <div class="event-detail-card-grid"><HistoryEventDetailCard v-for="card in group.cards" :key="card.CardID" :card="card" :presentation="presentation" :card-media="cardMedia" :song-media="songMedia" :attribute-labels="attributeLabels" /></div>
      </section>
      <p v-if="!details.groups.length" class="event-detail-empty">暂无已实装卡片资料</p>
    </section>

    <section v-if="showReruns" class="event-detail-section" aria-label="卡池复刻">
      <div class="event-detail-section-heading"><h3><RotateCcw :size="16" aria-hidden="true" />卡池复刻</h3></div>
      <ol v-if="reruns.length" class="event-detail-reruns"><li v-for="rerun in reruns" :key="rerun.key" class="event-detail-surface ui-liquid-glass ui-liquid-glass--chip"><span>{{ rerun.label }}</span><time>{{ rerun.date }}</time></li></ol>
      <p v-else class="event-detail-empty">暂无复刻记录</p>
    </section>

    <HistoryEventSongDetails :key="event.song_id" :event="event" :presentation="presentation" :song-media="songMedia" />
  </section>
  <p v-else class="event-detail-empty">暂无活动资料</p>
</template>

<script setup>
import { computed, ref } from 'vue';
import { CalendarDays, Layers, RotateCcw } from 'lucide-vue-next';
import HistoryEventDetailCard from './HistoryEventDetailCard.vue';
import HistoryEventSongDetails from './HistoryEventSongDetails.vue';
import HistoryWorldLinkChapters from './HistoryWorldLinkChapters.vue';
import { UNIT_TITLE_LOGO_MAP } from '../song-stats/songDisplayConstants.js';
import { getHistoryEventPeriod } from './useHistoryFormatting.js';
const props = defineProps({ details: { type: Object, default: null }, presentation: { type: Object, required: true },
  cardMedia: { type: Object, required: true }, songMedia: { type: Object, required: true }, characters: { type: Array, default: () => [] }, attributeLabels: { type: Object, required: true } });
const event = computed(() => props.details?.event || {});
const isWorldLink = computed(() => /world\s*link|^wl(?:终章)?$/i.test(String(event.value.event_type || '')));
const classification = computed(() => {
  if (event.value.event_type === '总集篇') return event.value.unit ? `总集篇 · ${String(event.value.unit).toUpperCase()}` : '总集篇';
  const series = ['箱活', '混活'].includes(event.value.event_type) || isWorldLink.value ? props.presentation.formatSeries(event.value) : '';
  return series ? `${event.value.event_type} · ${series}` : event.value.event_type;
});
const compactClassification = computed(() => event.value.event_type === '总集篇' ? classification.value
  : ['箱活', '混活'].includes(event.value.event_type) || isWorldLink.value
    ? props.presentation.formatSeries(event.value) || event.value.event_type : event.value.event_type);
const unitLogo = computed(() => UNIT_TITLE_LOGO_MAP[String(event.value.unit || '').toLowerCase()] || '');
const themeColor = computed(() => event.value.banner ? props.presentation.getCharColor(event.value.banner) : event.value.unit ? props.presentation.getUnitColor(event.value.unit) : 'var(--precedent-accent)');
const period = computed(() => getHistoryEventPeriod(event.value));
const bannerImageFailed = ref(false);
const showReruns = computed(() => /限定|联动/.test(String(event.value.gacha_type || '')));
const reruns = computed(() => ['rerun1', 'rerun2'].map((key, index) => ({ key, label: `第${index === 0 ? '一' : '二'}次复刻`, date: event.value[key] })).filter(item => item.date && item.date !== '-'));
</script>

<style scoped src="./styles/historyEventDetails.css"></style>
