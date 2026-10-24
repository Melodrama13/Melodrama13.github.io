<template>
<div class="birthday-date">{{ row.date }}</div>
          <div class="birthday-name">{{ row.name }}</div>
          <div class="birthday-main-icon">
            <img src="/elements/birthday.png" class="birthday-row-icon" title="生日限定" />
          </div>
          <div class="birthday-attr-end">
            <img
              v-if="hasAttributeIcon(row.attribute)"
              :src="`/elements/${row.attribute.toLowerCase()}.png`"
              class="birthday-row-icon"
              :title="translateAttr(row.attribute)"
            />
          </div>
          <div v-if="isBirthdayInfoOpen(row)" class="birthday-info-popover">
            <div class="birthday-info-card-media">
            <img
              crossorigin="anonymous"
              v-if="getBirthdayCardImageSrc(row)"
              :src="getBirthdayCardImageSrc(row)"
              class="birthday-info-card media-load-shimmer"
              :alt="`${row.name} 生日卡面`"
              loading="lazy"
              decoding="async"
              @load="onBirthdayCardImageLoad($event, row)"
              @error="onBirthdayCardImageError($event, row)"
            />
            </div>
            <div class="birthday-info-content">
              <div class="birthday-info-title">{{ row.name }}</div>
              <div class="birthday-info-meta">卡面ID：{{ row.cardId || '-' }}</div>
              <div class="birthday-info-meta">属性：{{ translateAttr(row.attribute) }}</div>
            </div>
          </div>
</template>

<script setup>
const props = defineProps({
  formatting: { type: Object, required: true },
  tooltips: { type: Object, required: true },
  presentation: { type: Object, required: true },
  cardMedia: { type: Object, required: true },
  row: { type: Object, required: true },
});
const { hasAttributeIcon } = props.formatting;
const { isBirthdayInfoOpen } = props.tooltips;
const { translateAttr } = props.presentation;
const { getBirthdayCardImageSrc, onBirthdayCardImageError, onBirthdayCardImageLoad } = props.cardMedia;
</script>

<style scoped>
.birthday-info-card-media { position: relative; display: flex; flex: 0 0 auto; border-radius: 8px; }
</style>
