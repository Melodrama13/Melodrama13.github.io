<template>
  <section class="event-wl-chapters" aria-label="WL 篇章">
    <div class="event-wl-heading"><h3><ListOrdered :size="16" aria-hidden="true" />WL 篇章</h3><span>UTC+8</span></div>
    <p v-if="loading" class="event-wl-status" role="status">正在加载篇章…</p>
    <p v-else-if="failed" class="event-wl-status" role="status">篇章资料加载失败<button type="button" class="pjsk-ui-action event-detail-surface ui-liquid-glass ui-liquid-glass--chip" @click="load">重试</button></p>
    <ol v-else-if="chapters.length" class="event-wl-list">
      <li v-for="chapter in chapters" :key="chapter.chapterNo" class="event-detail-surface ui-liquid-glass ui-liquid-glass--chip" :data-chapter-no="chapter.chapterNo" :style="{ '--event-wl-tint': chapter.characterInfo?.color || 'var(--precedent-accent)' }">
        <span class="event-wl-order">{{ chapter.chapterNo }}</span>
        <img v-if="chapter.characterInfo" :src="`/chars/${presentation.getCharAbbr(chapter.character)}.png`" :alt="chapter.character" loading="lazy" decoding="async" />
        <Flag v-else-if="!chapter.character" class="event-wl-finale" :size="26" aria-hidden="true" />
        <h4>{{ chapter.character || '终章' }}</h4>
        <div class="event-wl-times"><time :datetime="chapter.start.dateTime">{{ chapter.start.text }}</time><span>–</span><time :datetime="chapter.end.dateTime">{{ chapter.end.text }}</time></div>
      </li>
    </ol>
    <p v-else class="event-wl-status">暂无篇章资料</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, shallowRef } from 'vue';
import { Flag, ListOrdered } from 'lucide-vue-next';
import { loadWorldLinkChapters, formatWorldLinkChapterTime } from './worldLinkChapters.js';
const props = defineProps({ eventId: { type: [String, Number], required: true }, characters: { type: Array, required: true }, presentation: { type: Object, required: true } });
const rows = shallowRef([]), loading = ref(true), failed = ref(false);
const chapters = computed(() => {
  const characters = new Map(props.characters.map(character => [character.zh_name, character]));
  return (rows.value.find(row => String(row.event_id) === String(props.eventId))?.chapters || []).map((chapter, index) => ({
    ...chapter, chapterNo: index + 1, characterInfo: characters.get(chapter.character), start: formatWorldLinkChapterTime(chapter.start_date), end: formatWorldLinkChapterTime(chapter.end_date),
  }));
});
async function load() {
  loading.value = true; failed.value = false;
  try { rows.value = await loadWorldLinkChapters(); } catch { failed.value = true; }
  finally { loading.value = false; }
}
onMounted(load);
</script>

<style scoped>
.event-wl-chapters { min-width: 0; border-top: 1px solid var(--precedent-divider); padding-top: 15px; }
.event-wl-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 5px 10px; margin-bottom: 10px; }
.event-wl-heading h3 { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 0.9375rem; font-weight: 750; }
.event-wl-heading h3 svg { color: var(--precedent-accent); }
.event-wl-heading > span, .event-wl-status { font-size: 0.6875rem; color: var(--precedent-muted); }
.event-wl-status { display: flex; align-items: center; gap: 10px; margin: 0; }
.event-wl-status button { min-height: 44px; padding: 0 14px; border: 1px solid var(--ui-control-border); border-radius: 999px; background: var(--ui-glass-fallback-bg); color: var(--precedent-ink); cursor: pointer; }
.event-wl-list { display: grid; gap: 5px; margin: 0; padding: 0; list-style: none; }
.event-wl-list li { display: grid; grid-template-columns: 20px 30px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 7px 10px; border: 1px solid color-mix(in srgb, var(--event-wl-tint) 20%, var(--precedent-divider)); border-radius: 10px; background: color-mix(in srgb, var(--event-wl-tint) 18%, var(--event-detail-surface-fill)); }
.event-wl-order { color: var(--precedent-muted); font-size: 0.6875rem; text-align: center; font-variant-numeric: tabular-nums; }
.event-wl-list img { width: 30px; height: 30px; object-fit: contain; }
.event-wl-finale { color: var(--precedent-accent); }
.event-wl-list h4 { margin: 0; font-size: 0.8125rem; font-weight: 650; overflow-wrap: anywhere; }
.event-wl-times { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 8px; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.event-wl-times time { white-space: nowrap; }
.event-wl-times > span { color: var(--precedent-muted); }
@container history-precedent (max-width: 520px) {
  .event-wl-list li { grid-template-columns: 16px 26px minmax(0, 1fr); gap: 4px 6px; padding: 7px 8px; }
  .event-wl-list img { width: 26px; height: 26px; }
  .event-wl-times { grid-column: 3; font-size: 0.6875rem; }
}
</style>
