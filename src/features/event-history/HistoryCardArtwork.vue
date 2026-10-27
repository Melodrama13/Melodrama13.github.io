<template>
  <CardArtwork class="precedent-card-image" :title="label" :src="src" :alt="label"
    :rarity="card.Rarity" :attribute="attributeLabels[card.Attribute] ? card.Attribute : ''"
    :unit="affiliation" :trained="trained" :ribbon-label="limitedLabel"
    :fallback-src="`/chars/${presentation.getCharAbbr(card.Name)}.png`"
    :show-stars="showDetails" :show-unit="showDetails" :show-ribbon="showDetails"
    @error="cardMedia.onCardTooltipImageError($event, card, src)" />
</template>

<script setup>
import { computed } from 'vue';
import CardArtwork from '../../components/ui/CardArtwork.vue';
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
