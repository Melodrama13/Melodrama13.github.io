<template>
  <div class="card-artwork" :class="[`card-artwork--${artworkVersion}`, { 'card-artwork--failed': imageFailed }]" :data-card-artwork-version="artworkVersion" :style="{ width: artworkSize }">
    <img v-if="hasImage" class="card-artwork__image media-load-shimmer"
      :src="src || undefined" :data-card-src="deferredSrc || undefined" :alt="alt"
      crossorigin="anonymous" loading="lazy" decoding="async" @load="onLoad" @error="onError" />
    <span v-show="!hasImage || imageFailed" class="card-artwork__fallback" role="img" :aria-label="alt">
      <img v-if="fallbackSrc" :src="fallbackSrc" alt="" loading="lazy" decoding="async" />
      <span v-else-if="fallbackText">{{ fallbackText }}</span>
    </span>
    <img v-if="showFrame && frameKey" class="card-artwork__frame" :src="`/elements/card_frame_${frameKey}_${artworkVersion}.png`" alt="" aria-hidden="true" loading="lazy" decoding="async" />
    <img v-if="showAttribute && attributeKey" class="card-artwork__attribute" :src="`/elements/attr_${attributeKey}_${artworkVersion}.png`"
      :alt="attributeLabel" :title="attributeLabel" loading="lazy" decoding="async" />
    <span v-if="showStars && frameKey" class="card-artwork__stars" role="img" :aria-label="rarityLabel" :title="rarityLabel">
      <img v-for="star in starCount" :key="star" class="card-artwork__star" :src="starSrc" width="72" height="70" alt="" aria-hidden="true" loading="lazy" decoding="async" />
    </span>
    <img v-if="showUnit && unitKey" class="card-artwork__unit" :src="`/elements/unit_mini_${unitKey}.png`"
      :alt="`${unitKey.toUpperCase()} 附属团体`" :title="`${unitKey.toUpperCase()} 附属团体`" loading="lazy" decoding="async" />
    <CardLimitedRibbon v-if="visibleRibbon" class="card-artwork__ribbon" :label="visibleRibbon.label" :tone="visibleRibbon.tone" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import CardLimitedRibbon from './CardLimitedRibbon.vue';
import { DEFAULT_CARD_ARTWORK_VERSION } from '../../config/cardArtwork.js';

const props = defineProps({
  src: { type: String, default: '' },
  deferredSrc: { type: String, default: '' },
  alt: { type: String, default: '' },
  rarity: { type: [String, Number], default: 4 },
  attribute: { type: String, default: '' },
  unit: { type: String, default: '' },
  trained: { type: Boolean, default: false },
  ribbonLabel: { type: String, default: '' },
  isPermanent: { type: Boolean, default: false },
  fallbackSrc: { type: String, default: '' },
  fallbackText: { type: String, default: '' },
  size: { type: [String, Number], default: '100%' },
  version: { type: String, default: DEFAULT_CARD_ARTWORK_VERSION, validator: value => ['v1', 'v2'].includes(value) },
  showFrame: { type: Boolean, default: true },
  showAttribute: { type: Boolean, default: true },
  showUnit: { type: Boolean, default: false },
  showStars: { type: Boolean, default: false },
  showRibbon: { type: Boolean, default: false },
  showPermanentRibbon: { type: Boolean, default: false },
});
const emit = defineEmits(['load', 'error']);
const ATTRIBUTE_LABELS = { cool: '蓝星', cute: '粉花', happy: '橙心', mysterious: '紫月', pure: '绿草' };
const UNIT_KEYS = new Set(['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs']);
const imageFailed = ref(false);
const hasImage = computed(() => Boolean(props.src || props.deferredSrc));
const visibleRibbon = computed(() => {
  if (props.showRibbon && props.ribbonLabel) return { label: props.ribbonLabel, tone: 'limited' };
  return props.showPermanentRibbon && props.isPermanent ? { label: '常驻', tone: 'permanent' } : null;
});
const artworkSize = computed(() => typeof props.size === 'number' ? `${props.size}px` : props.size);
const artworkVersion = computed(() => ['v1', 'v2'].includes(props.version) ? props.version : DEFAULT_CARD_ARTWORK_VERSION);
const frameKey = computed(() => {
  const rarity = String(props.rarity).trim().toLowerCase().replace(/^rarity_/, '');
  if (rarity === 'birth' || rarity === 'birthday') return 'birth';
  return ['1', '2', '3', '4'].includes(rarity) ? rarity : '';
});
const attributeKey = computed(() => {
  const key = String(props.attribute).trim().toLowerCase();
  return Object.hasOwn(ATTRIBUTE_LABELS, key) ? key : '';
});
const attributeLabel = computed(() => ATTRIBUTE_LABELS[attributeKey.value] || '');
const unitKey = computed(() => {
  const key = String(props.unit).trim().toLowerCase();
  return UNIT_KEYS.has(key) ? key : '';
});
const starCount = computed(() => frameKey.value === 'birth' ? 1 : Number(frameKey.value) || 0);
const rarityLabel = computed(() => frameKey.value === 'birth' ? '生日' : `${starCount.value} 星`);
const starSrc = computed(() => `/elements/rarity_${frameKey.value === 'birth' ? 'birthday' : props.trained ? 'rstar' : 'ystar'}.png`);
watch(() => [props.src, props.deferredSrc], () => { imageFailed.value = false; });
const onLoad = event => { imageFailed.value = false; emit('load', event); };
const onError = event => { imageFailed.value = true; emit('error', event); };
</script>

<style scoped>
.card-artwork { position: relative; display: block; flex: 0 0 auto; min-width: 0; height: auto; aspect-ratio: 1; isolation: isolate; overflow: hidden; border-radius: 4%; container-type: inline-size; }
.card-artwork__image, .card-artwork__fallback { position: absolute; inset: 5%; width: 90%; height: 90%; }
.card-artwork__image { display: block; object-fit: cover; z-index: 1; background: var(--ui-glass-optical-group-bg, #e5e7eb); }
.card-artwork--failed .card-artwork__image { visibility: hidden; }
.card-artwork__fallback { display: flex; align-items: center; justify-content: center; z-index: 0; background: var(--ui-glass-optical-group-bg, #e5e7eb); }
.card-artwork__fallback > img { width: 65%; height: 80%; object-fit: contain; }
.card-artwork__fallback > span { font-size: 25cqw; line-height: 1; }
.card-artwork__frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; z-index: 2; pointer-events: none; }
.card-artwork__attribute { position: absolute; left: 3%; top: 3%; width: 23%; height: 23%; object-fit: contain; z-index: 3; pointer-events: none; }
.card-artwork__unit { position: absolute; right: 3%; bottom: 3%; width: 23%; height: 23%; object-fit: contain; z-index: 4; pointer-events: none; }
.card-artwork__stars { position: absolute; left: 5%; bottom: 5%; display: flex; align-items: center; width: 58%; height: 17%; z-index: 4; pointer-events: none; }
/* Use intrinsic proportions so PNG capture does not depend on object-fit support. */
.card-artwork__star { flex: 0 0 25%; width: 25%; height: auto; object-fit: contain; }
.card-artwork__ribbon { z-index: 5; }
.card-artwork--v2 .card-artwork__image, .card-artwork--v2 .card-artwork__fallback { inset: 0; width: 100%; height: 100%; border-radius: 6.6%; }
.card-artwork--v2 .card-artwork__attribute { left: 0; top: 0; width: auto; height: 22.4%; }
.card-artwork--v2 .card-artwork__stars { left: 2%; }
.card-artwork--v2 .card-artwork__unit { right: 0%; }
</style>
