<template>
  <ul class="precedent-song-gallery" aria-label="书下依据">
    <li v-for="item in items" :key="item.event.id">
      <div class="precedent-song-art"><Music :size="22" aria-hidden="true" /><img class="precedent-song-cover" :src="buildLocalSongJacketUrl(item.event.song_id)" :alt="item.song?.title || item.event.song_alias || `歌曲 #${item.event.song_id}`" loading="lazy" @error="$event.currentTarget.style.opacity = 0" /><img class="precedent-song-vs" :src="`/chars/${presentation.getCharAbbr(item.vs)}.png`" :alt="item.vs" /></div>
      <button class="pjsk-ui-action precedent-song-jump" type="button" :title="`#${item.event.id} · ${item.event.event_title || ''}`" @click="jumpToEvent(item.event.id)">{{ presentation.formatSeriesCompact(item.event) || `#${item.event.id}` }}<ArrowUpRight :size="10" aria-hidden="true" /></button>
      <time>{{ item.event.start_date }}</time>
    </li>
  </ul>
</template>
<script setup>
import { ArrowUpRight, Music } from 'lucide-vue-next';
import { buildLocalSongJacketUrl } from '../song-stats/songFormatters.js';
defineProps({ items: { type: Array, required: true }, presentation: { type: Object, required: true }, jumpToEvent: { type: Function, required: true } });
</script>
<style scoped>
.precedent-song-gallery { display: grid; grid-template-columns: repeat(auto-fill, var(--precedent-card-size)); gap: 8px; margin: 7px 0 0; padding: 0; list-style: none; }
.precedent-song-gallery li { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; }
.precedent-song-art { position: relative; display: grid; place-items: center; width: 100%; aspect-ratio: 1; border-radius: 6px; background: var(--ui-glass-optical-group-bg); }
.precedent-song-art .precedent-song-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
.precedent-song-art .precedent-song-vs { position: absolute; right: 0; bottom: 0; width: 35%; height: 35%; object-fit: contain; }
.precedent-song-jump { display: inline-flex; align-items: center; justify-content: center; gap: 2px; box-sizing: border-box; max-width: 100%; min-width: 0; padding: 2px 5px; border: 1px solid var(--ui-control-border); border-radius: 999px; color: var(--precedent-accent); background: var(--ui-glass-optical-group-bg); font: inherit; font-size: 0.6875rem; cursor: pointer; white-space: nowrap; }
.precedent-song-jump > svg { flex-shrink: 0; }
.precedent-song-gallery time { font-size: 0.625rem; white-space: nowrap; font-variant-numeric: tabular-nums; }
</style>
