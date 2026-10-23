<template>
  <section v-if="song" class="event-detail-section event-song-details" aria-label="书下曲">
    <div class="event-detail-section-heading"><h3><Music2 :size="16" aria-hidden="true" />书下曲</h3><span>#{{ song.id }}</span></div>
    <div class="event-song-intro">
      <div class="event-song-cover-wrap">
        <img class="event-song-cover" crossorigin="anonymous" :src="songMedia.getSongTooltipImageSrc(event)" :alt="song.title" loading="lazy" decoding="async" />
        <span class="event-song-cover-fallback event-detail-surface ui-liquid-glass ui-liquid-glass--chip"><Music2 :size="26" aria-hidden="true" /></span>
      </div>
      <div class="event-song-copy"><div class="event-song-title-row"><h4>{{ song.title }}</h4><div v-if="mvTags.length" class="event-song-tags"><span v-for="tag in mvTags" :key="tag.label" class="event-detail-surface ui-liquid-glass ui-liquid-glass--chip" :class="tag.tone">{{ tag.label }} MV</span></div></div><p v-if="event.song_alias" class="event-song-alias">{{ event.song_alias }}</p>
        <dl class="event-song-credits"><div><dt>作曲</dt><dd>{{ song.composer || '—' }}</dd></div><div><dt>作词</dt><dd>{{ song.lyricist || '—' }}</dd></div><div><dt>编曲</dt><dd>{{ song.arranger || '—' }}</dd></div></dl>
        <p v-if="song.releaseDate" class="event-song-release">实装 <time>{{ releaseDate }}</time><small>UTC+8</small></p>
      </div>
    </div>
    <div class="event-song-difficulties" aria-label="谱面难度"><span v-for="difficulty in difficulties" :key="difficulty.key" class="event-detail-surface ui-liquid-glass ui-liquid-glass--chip" :data-difficulty="difficulty.key"><small>{{ difficulty.label }}</small><strong>{{ difficulty.level }}</strong></span></div>
    <section v-if="vocals.length" class="event-song-vocals" aria-label="歌唱版本"><h4>歌唱版本<span>{{ vocals.length }}</span></h4>
      <ul><li v-for="vocal in vocals" :key="vocal.vocal_id" class="event-detail-surface ui-liquid-glass ui-liquid-glass--chip"><span class="event-song-vocal-type">{{ vocalLabel(vocal.type) }}</span><span class="event-song-singers"><template v-for="name in vocal.characters || []" :key="name"><img v-if="songMedia.isKnownSongSinger(name)" :src="`/chibi_s/${presentation.getCharAbbr(name)}.webp`" :alt="name" :title="name" loading="lazy" decoding="async" /><span v-else class="event-song-external-singer event-detail-surface ui-liquid-glass ui-liquid-glass--chip">{{ name }}</span></template><span v-if="!vocal.characters?.length">{{ vocal.type === 'instrumental' ? '纯音乐' : '歌唱者未收录' }}</span></span><time v-if="vocal.released_at">{{ vocal.released_at }}</time></li></ul>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { Music2 } from 'lucide-vue-next';
import { SONG_DIFFICULTY_ORDER, MV_TAG_MAP } from '../song-stats/songDisplayConstants.js';
import { formatHistorySongReleaseDate } from './useHistoryFormatting.js';
const props = defineProps({ event: { type: Object, required: true }, presentation: { type: Object, required: true }, songMedia: { type: Object, required: true } });
const song = computed(() => props.songMedia.getSongByEvent(props.event));
const releaseDate = computed(() => formatHistorySongReleaseDate(song.value?.releaseDate));
const mvTags = computed(() => (song.value?.categories || []).map(key => MV_TAG_MAP[String(key).toLowerCase()]).filter(Boolean));
const difficulties = computed(() => SONG_DIFFICULTY_ORDER.filter(difficulty => song.value?.difficulties?.[difficulty.key] != null).map(difficulty => ({ ...difficulty, level: song.value.difficulties[difficulty.key] })));
const vocals = computed(() => props.songMedia.getReleasedSongVocals(props.event));
const vocalLabel = type => ({ sekai: 'SEKAI ver.', original_song: '原曲 ver.', virtual_singer: 'VS ver.', another_vocal: 'Another Vocal', streaming_live: '配信 Live ver.', instrumental: '纯音乐' }[type] || (/^april_fool/.test(type) ? `${type.slice(-4)} 愚人节 ver.` : type));
</script>

<style scoped>
.event-song-details { min-width: 0; border-top: 1px solid var(--precedent-divider); padding-top: 15px; }
.event-detail-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.event-detail-section-heading h3 { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 0.9375rem; font-weight: 750; }
.event-detail-section-heading h3 svg { color: var(--precedent-accent); }
.event-detail-section-heading > span { font-size: 0.6875rem; color: var(--precedent-muted); font-variant-numeric: tabular-nums; }
.event-song-intro { display: flex; align-items: center; gap: 14px; }
.event-song-cover-wrap { position: relative; flex: 0 0 112px; width: 112px; height: 112px; }
.event-song-cover { flex: 0 0 auto; width: 112px; height: 112px; border-radius: 10px; object-fit: cover; box-shadow: var(--ui-glass-shadow-chip); }
.event-song-cover-fallback { position: absolute; inset: 0; display: none; place-items: center; border-radius: 10px; background: var(--ui-glass-optical-group-bg); color: var(--precedent-muted); }
.event-song-cover[data-failed='1'] + .event-song-cover-fallback { display: grid; }
.event-song-copy { min-width: 0; }
.event-song-title-row { display: flex; align-items: center; gap: 8px; min-width: 0; margin-bottom: 5px; }
.event-song-copy h4 { flex: 0 1 auto; min-width: 0; margin: 0; font-size: 1rem; line-height: 1.45; overflow-wrap: anywhere; }
.event-song-alias { margin: 0 0 8px; font-size: 0.75rem; color: var(--precedent-muted); overflow-wrap: anywhere; }
.event-song-tags { display: flex; flex: 0 0 auto; flex-wrap: wrap; gap: 5px; max-width: 50%; }
.event-song-tags > span { border-radius: 999px; padding: 3px 8px; background: #e0f2fe; color: #075985; font-size: 0.625rem; font-weight: 650; white-space: nowrap; }
.event-song-tags > .is-3d { background: #dcfce7; color: #166534; }
.event-song-tags > .is-2d { background: #ede9fe; color: #6d28d9; }
.event-song-credits { display: flex; flex-wrap: wrap; gap: 5px 14px; margin: 0; font-size: 0.75rem; line-height: 1.6; }
.event-song-credits > div { display: flex; gap: 5px; min-width: 0; }
.event-song-credits dt { flex-shrink: 0; color: var(--precedent-muted); }
.event-song-credits dd { margin: 0; overflow-wrap: anywhere; }
.event-song-release { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 7px; margin: 7px 0 0; color: var(--precedent-muted); font-size: 0.75rem; line-height: 1.6; }
.event-song-release time { color: var(--precedent-ink); font-variant-numeric: tabular-nums; }
.event-song-release small { font-size: inherit; }
.event-song-difficulties { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
.event-song-difficulties > span { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 72px; box-sizing: border-box; padding: 5px 10px; border: 1px solid color-mix(in srgb, var(--event-difficulty-tint) 28%, var(--ui-control-border)); border-radius: 999px; --event-difficulty-tint: #14d473; background: color-mix(in srgb, var(--event-difficulty-tint) 10%, var(--event-detail-surface-fill)); color: color-mix(in srgb, var(--event-difficulty-tint) 32%, var(--precedent-ink)); }
.event-song-difficulties small { font-size: 0.5625rem; font-weight: 700; }
.event-song-difficulties strong { font-size: 1rem; font-variant-numeric: tabular-nums; }
.event-song-difficulties > [data-difficulty="normal"] { --event-difficulty-tint: #38bef0; }
.event-song-difficulties > [data-difficulty="hard"] { --event-difficulty-tint: #f9c803; }
.event-song-difficulties > [data-difficulty="expert"] { --event-difficulty-tint: #f64478; }
.event-song-difficulties > [data-difficulty="master"] { --event-difficulty-tint: #c735f9; }
.event-song-difficulties > [data-difficulty="append"] { --event-difficulty-tint: #f883cb; }
.event-song-vocals { margin-top: 17px; }
.event-song-vocals h4 { display: flex; gap: 7px; margin: 0 0 7px; font-size: 0.8125rem; }
.event-song-vocals h4 > span { color: var(--precedent-muted); font-weight: 400; }
.event-song-vocals ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.event-song-vocals li { display: grid; grid-template-columns: minmax(108px, 0.6fr) minmax(0, 1fr) auto; align-items: center; gap: 8px; min-width: 0; padding: 8px 10px; border: 1px solid var(--precedent-divider); border-radius: 12px; background: var(--ui-glass-optical-group-bg); }
.event-song-vocal-type { font-size: 0.6875rem; font-weight: 650; overflow-wrap: anywhere; }
.event-song-singers { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; min-width: 0; font-size: 0.6875rem; color: var(--precedent-muted); }
.event-song-singers img { width: 30px; height: 30px; object-fit: contain; }
.event-song-external-singer { padding: 3px 7px; border-radius: 999px; background: var(--ui-glass-fallback-bg); color: var(--precedent-ink); }
.event-song-vocals time { font-size: 0.625rem; color: var(--precedent-muted); font-variant-numeric: tabular-nums; }
@container history-precedent (max-width: 520px) {
  .event-song-intro { gap: 10px; }
  .event-song-cover { width: 76px; height: 76px; }
  .event-song-cover-wrap { flex-basis: 76px; width: 76px; height: 76px; }
  .event-song-copy h4 { font-size: 0.875rem; }
  .event-song-difficulties { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .event-song-difficulties > span { min-width: 0; gap: 4px; padding: 5px 7px; }
  .event-song-vocals li { grid-template-columns: minmax(88px, 0.6fr) minmax(0, 1fr); gap: 5px 7px; padding: 8px; }
  .event-song-vocals time { grid-column: 2; }
  .event-song-singers img { width: 26px; height: 26px; }
}
</style>
