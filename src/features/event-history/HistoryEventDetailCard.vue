<template>
  <article class="event-detail-card event-detail-surface ui-liquid-glass ui-liquid-glass--chip" :data-card-id="card.CardID">
    <div class="event-detail-card-faces" :class="{ 'is-single': faces.length === 1 && !song }">
      <figure v-if="song" class="event-detail-card-song" :data-song-id="song.id">
        <img crossorigin="anonymous" :src="songMedia.getSongTooltipImageSrc({ song_id: song.id })" :alt="song.title" loading="lazy" decoding="async" />
        <span class="event-detail-card-song-fallback event-detail-surface ui-liquid-glass ui-liquid-glass--chip"><Music2 :size="24" aria-hidden="true" /></span>
      </figure>
      <figure v-for="face in faces" :key="face.variant">
        <HistoryCardArtwork :card="card" :src="face.src" :label="`${card.Name} · ${card.CardName} · ${face.label}`"
          :presentation="presentation" :card-media="cardMedia" :attribute-labels="attributeLabels" :trained="face.variant === 'after_training'" show-details />
      </figure>
    </div>
    <div class="event-detail-card-copy">
      <div class="event-detail-card-person">
        <h4><img :src="`/chars/${presentation.getCharAbbr(card.Name)}.png`" alt="" loading="lazy" decoding="async" />{{ card.Name }}</h4>
        <span class="event-detail-skill-name event-detail-surface ui-liquid-glass ui-liquid-glass--chip">{{ presentation.translateSkill(card.Skill) || '未收录' }}</span>
      </div>
      <p class="event-detail-card-name">{{ card.CardName && card.CardName !== '-' ? card.CardName : '卡名未收录' }}</p>
      <div class="event-detail-card-meta"><span>#{{ card.CardID }}</span><span>实装 <time>{{ card.Date }}</time></span></div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { Music2 } from 'lucide-vue-next';
import HistoryCardArtwork from './HistoryCardArtwork.vue';
import { getCardImageVariants } from '../../utils/cardImageVariants.js';
const props = defineProps({ card: { type: Object, required: true }, presentation: { type: Object, required: true },
  cardMedia: { type: Object, required: true }, songMedia: { type: Object, required: true }, attributeLabels: { type: Object, required: true } });
const song = computed(() => props.songMedia.getCardSong(props.card));
const faces = computed(() => {
  const images = props.cardMedia.getCardTooltipImageList(props.card);
  return getCardImageVariants(props.card.CardID, props.card.Rarity, props.card.Type).map((variant, index) => ({
    variant, src: images[index] || '', label: variant === 'after_training' ? '花后' : '花前',
  }));
});
</script>

<style scoped>
.event-detail-card { display: grid; grid-template-columns: minmax(0, 1fr); align-content: start; gap: 10px; min-width: 0; padding: 10px; border: 1px solid var(--ui-control-border); border-radius: 14px; background: color-mix(in srgb, var(--event-detail-tint, var(--precedent-accent)) 4%, var(--event-detail-surface-fill)); }
.event-detail-card-faces { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; justify-self: center; width: 100%; max-width: 184px; gap: 6px; }
.event-detail-card-faces figure { min-width: 0; margin: 0; }
.event-detail-card-faces.is-single { grid-template-columns: minmax(0, 1fr); justify-items: center; }
.event-detail-card-faces.is-single > figure { width: calc((100% - 6px) / 2); }
.event-detail-card-song > img, .event-detail-card-song-fallback { display: block; width: 100%; aspect-ratio: 1; border-radius: 8px; object-fit: cover; }
.event-detail-card-song > img { box-shadow: var(--ui-glass-shadow-chip); }
.event-detail-card-song { position: relative; }
.event-detail-card-song-fallback { position: absolute; inset: 0; display: none; place-items: center; color: var(--precedent-muted); background: var(--ui-glass-optical-group-bg); }
.event-detail-card-song > img[data-failed='1'] + .event-detail-card-song-fallback { display: grid; }
.event-detail-card-copy { display: grid; align-content: start; gap: 7px; min-width: 0; }
.event-detail-card-person { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 7px; min-width: 0; }
.event-detail-card-person h4 { display: inline-flex; align-items: center; gap: 4px; margin: 0; font-size: 0.8125rem; line-height: 1.5; font-weight: 750; white-space: nowrap; }
.event-detail-card-person h4 > img { flex: 0 0 auto; width: 20px; height: 20px; object-fit: contain; }
.event-detail-skill-name { display: inline-block; padding: 2px 6px; border-radius: 999px; background: color-mix(in srgb, var(--precedent-accent) 10%, var(--event-detail-surface-fill)); color: var(--precedent-accent); font-size: 0.75rem; line-height: 1.45; font-weight: 700; white-space: nowrap; }
.event-detail-card-name { margin: 0; text-align: center; font-size: 0.75rem; line-height: 1.5; color: var(--precedent-muted); overflow-wrap: anywhere; }
.event-detail-card-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 3px 10px; margin: 0; font-size: 0.625rem; line-height: 1.5; color: var(--precedent-muted); font-variant-numeric: tabular-nums; }
@container history-precedent (max-width: 768px) {
  .event-detail-card-faces { max-width: 156px; }
}
@container history-precedent (max-width: 520px) {
  .event-detail-card { grid-template-columns: minmax(0, 0.95fr) minmax(0, 1fr); align-items: center; gap: 10px; padding: 10px; border-radius: 13px; }
  .event-detail-card-faces { gap: 4px; }
  .event-detail-card-person h4 { font-size: 0.8125rem; }
}
</style>
