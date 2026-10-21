<template>
  <ul class="precedent-evidence-gallery" aria-label="卡片依据">
    <li v-for="card in cards" :key="card.CardID" :class="{ 'is-pool-match': matchedIds.has(String(card.CardID)) }">
      <div class="precedent-card-image" :title="cardLabel(card)">
        <img v-if="cardImage(card)" class="precedent-card-art" :src="cardImage(card)" :alt="cardLabel(card)" loading="lazy" decoding="async" @error="cardMedia.onCardTooltipImageError($event, card)" />
        <span v-else class="precedent-card-fallback" role="img" :aria-label="cardLabel(card)"><img :src="`/chars/${presentation.getCharAbbr(card.Name)}.png`" alt="" /></span>
        <img class="precedent-card-frame" :src="`/elements/card_frame_${card.Rarity === 'birthday' ? 'birth' : card.Rarity}.png`" alt="" loading="lazy" decoding="async" />
        <img v-if="attributeLabels[card.Attribute]" class="precedent-card-attribute" :src="`/elements/${card.Attribute.toLowerCase()}.png`" :alt="attributeLabels[card.Attribute]" loading="lazy" decoding="async" />
      </div>
      <div class="precedent-card-caption">
        <button v-if="eventForCard(card)" type="button" class="pjsk-ui-action precedent-evidence-event" :title="`#${eventForCard(card).id} · ${eventForCard(card).event_title || eventForCard(card).event_type}`" :aria-label="`定位活动 ${eventForCard(card).id}`" @click="jumpToEvent(eventForCard(card).id)"><span>{{ presentation.formatSeriesCompact(eventForCard(card)).trim() || eventForCard(card).event_type || `#${eventForCard(card).id}` }}</span><ArrowUpRight :size="10" aria-hidden="true" /></button>
        <time>{{ dateLabel || card.Date }}</time>
      </div>
    </li>
  </ul>
</template>

<script setup>
import { ArrowUpRight } from 'lucide-vue-next';
import { computed } from 'vue';
const props = defineProps({ cards: { type: Array, required: true }, presentation: { type: Object, required: true },
  cardMedia: { type: Object, required: true }, attributeLabels: { type: Object, required: true },
  eventForCard: { type: Function, required: true }, jumpToEvent: { type: Function, required: true }, dateLabel: { type: String, default: '' }, matchedCards: { type: Array, default: () => [] } });
const matchedIds = computed(() => new Set(props.matchedCards.map(card => String(card.CardID))));
const cardImage = card => props.cardMedia.getVisibleCardTooltipImageList(card).at(-1) || '';
const cardLabel = card => `${card.Name} · ${props.attributeLabels[card.Attribute] || card.Attribute} · ${card.CardName || `卡片 #${card.CardID}`}`;
</script>

<style scoped>
.precedent-evidence-gallery { display: grid; grid-template-columns: repeat(auto-fill, var(--precedent-card-size)); gap: 6px; margin: 7px 0 0; padding: 0; list-style: none; min-width: 0; }
.precedent-evidence-gallery li { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; color: var(--precedent-muted); }
.precedent-card-image { position: relative; isolation: isolate; width: 100%; aspect-ratio: 1; overflow: hidden; border-radius: 4%; }
.is-pool-match .precedent-card-image { outline: 2px solid var(--precedent-accent); outline-offset: 1px; }
/* Preserve the statistics thumbnails' artwork, frame and attribute proportions. */
.precedent-card-art, .precedent-card-fallback { position: absolute; inset: 5%; width: 90%; height: 90%; }
.precedent-card-art { display: block; object-fit: cover; }
.precedent-card-frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; z-index: 2; }
.precedent-card-attribute { position: absolute; left: 3.5%; top: 3.5%; width: 27%; height: 27%; object-fit: contain; z-index: 3; }
.precedent-card-fallback { display: flex; align-items: center; justify-content: center; background: var(--ui-glass-optical-group-bg); }
.precedent-card-fallback > img:first-child { width: 65%; height: 80%; object-fit: contain; }
.precedent-card-caption { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: stretch; width: 100%; gap: 2px; text-align: center; }
.precedent-evidence-event { display: inline-flex; align-items: center; justify-content: center; justify-self: center; gap: 3px; width: fit-content; max-width: 100%; min-width: 0; min-height: 24px; box-sizing: border-box; padding: 1px 6px; text-align: center; border: 1px solid var(--ui-control-border); border-radius: 999px; color: var(--precedent-accent); background: var(--ui-glass-optical-group-bg); font-family: inherit; font-size: 0.75rem; line-height: 1.25; cursor: pointer; }
.precedent-evidence-event > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.precedent-evidence-event > svg { flex: 0 0 auto; }
.precedent-evidence-event:hover, .precedent-evidence-event:focus-visible { border-color: var(--precedent-accent); }
.precedent-evidence-gallery time { display: block; width: 100%; text-align: center; font-size: 0.6875rem; font-variant-numeric: tabular-nums; line-height: 1.25; white-space: nowrap; }
</style>
