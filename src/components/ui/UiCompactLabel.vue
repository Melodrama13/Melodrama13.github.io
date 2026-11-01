<template>
  <span class="ui-compact-label" :aria-label="text">
    <span class="ui-compact-label-full">{{ text }}</span>
    <span class="ui-compact-label-short">{{ compact }}</span>
  </span>
</template>

<script setup>
defineProps({ text: { type: String, required: true }, compact: { type: String, required: true } });
</script>

<style scoped>
.ui-compact-label-short { display: none; }
@media (max-width: 900px) {
  .ui-compact-label-full { display: none; }
  .ui-compact-label-short { display: inline; }
}
</style>
