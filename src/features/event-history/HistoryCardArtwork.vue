<template>
  <div class="precedent-card-image" :title="label">
    <img v-if="src && !cardMedia.isCardTooltipImageFailed(card, src)" class="precedent-card-art" :src="src" :alt="label"
      loading="lazy" decoding="async" @error="cardMedia.onCardTooltipImageError($event, card, src)" />
    <span v-else class="precedent-card-fallback" role="img" :aria-label="label"><img :src="`/chars/${presentation.getCharAbbr(card.Name)}.png`" alt="" /></span>
    <img class="precedent-card-frame" :src="`/elements/card_frame_${card.Rarity === 'birthday' ? 'birth' : card.Rarity}.png`" alt="" loading="lazy" decoding="async" />
    <img v-if="attributeLabels[card.Attribute]" class="precedent-card-attribute" :src="`/elements/${card.Attribute.toLowerCase()}.png`"
      :alt="attributeLabels[card.Attribute]" :title="attributeLabels[card.Attribute]" loading="lazy" decoding="async" />
    <template v-if="showDetails">
      <CardLimitedRibbon v-if="limitedLabel" class="event-detail-limited-ribbon" :label="limitedLabel" />
      <span class="event-detail-stars" role="img" :aria-label="`${card.Rarity} 星`" :title="`${card.Rarity} 星`"><img v-for="star in Number(card.Rarity)" :key="star"
        :src="trained ? '/elements/rstar.png' : '/elements/ystar.png'" alt="" /></span>
      <img v-if="affiliation" class="event-detail-affiliation" :src="`/elements/${affiliation}.png`"
        :alt="`${affiliation.toUpperCase()} 附属团体`" :title="`${affiliation.toUpperCase()} 附属团体`" loading="lazy" decoding="async" />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import CardLimitedRibbon from '../../components/ui/CardLimitedRibbon.vue';
import { getCardYearTypeInfo } from '../card-stats/cardYearCardTypes.js';
const props = defineProps({
  card: { type: Object, required: true }, src: { type: String, default: '' }, label: { type: String, required: true },
  presentation: { type: Object, required: true }, cardMedia: { type: Object, required: true }, attributeLabels: { type: Object, required: true },
  showDetails: { type: Boolean, default: false },
  trained: { type: Boolean, default: false },
});
const limitedLabel = computed(() => getCardYearTypeInfo(props.card).limitedLabel);
const unitIcons = new Set(['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs']);
const affiliation = computed(() => {
  const unit = String(props.card.Affiliation || '').toLowerCase();
  return props.presentation.isVirtualSinger(String(props.card.Name || '').split(/\s+/)[0]) && unitIcons.has(unit) ? unit : '';
});
</script>

<style scoped>
.precedent-card-image { position: relative; isolation: isolate; width: 100%; aspect-ratio: 1; overflow: hidden; border-radius: 4%; }
/* Match the statistics thumbnails' artwork, frame and attribute proportions. */
.precedent-card-art, .precedent-card-fallback { position: absolute; inset: 5%; width: 90%; height: 90%; }
.precedent-card-art { display: block; object-fit: cover; }
.precedent-card-frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; z-index: 2; }
.precedent-card-attribute { position: absolute; left: 3.5%; top: 3.5%; width: 27%; height: 27%; object-fit: contain; z-index: 3; }
.precedent-card-fallback { display: flex; align-items: center; justify-content: center; background: var(--ui-glass-optical-group-bg); }
.precedent-card-fallback > img { width: 65%; height: 80%; object-fit: contain; }
.event-detail-limited-ribbon { --card-ribbon-font-max: 12px; }
.event-detail-stars { position: absolute; left: 5%; bottom: 5%; display: flex; align-items: center; width: 58%; height: 17%; z-index: 4; pointer-events: none; }
.event-detail-stars img { width: 25%; height: 100%; object-fit: contain; }
.event-detail-affiliation { position: absolute; right: 3.5%; bottom: 3.5%; width: 27%; height: 27%; object-fit: contain; z-index: 4; pointer-events: none; }
</style>
