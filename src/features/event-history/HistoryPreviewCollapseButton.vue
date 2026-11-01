<template>
  <button
    type="button"
    class="pjsk-ui-action preview-collapse-btn preview-window-action"
    :aria-label="`${collapsed ? '展开' : '收起'}${label}`"
    :aria-expanded="!collapsed"
    :title="collapsed ? '展开' : '收起'"
    @mousedown.stop
    @touchstart.stop
    @click.stop="$emit('toggle')"
  >
    <ChevronDown :size="16" :stroke-width="2" :class="{ 'is-expanded': !collapsed }" aria-hidden="true" />
  </button>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next';
defineProps({ collapsed: Boolean, label: { type: String, required: true } });
defineEmits(['toggle']);
</script>

<style scoped>
.preview-window-action.preview-collapse-btn {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  min-height: 32px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  box-shadow: none;
  cursor: pointer;
}
.preview-window-action svg {
  transform: rotate(0deg);
  transition: transform var(--ui-motion-state);
}
.preview-window-action svg.is-expanded { transform: rotate(180deg); }
.preview-window-action:focus-visible { outline: 2px solid #0d9488; outline-offset: 1px; }
@media (pointer: coarse) {
  .preview-window-action.preview-collapse-btn { width: 44px; height: 44px; min-height: 44px; }
}
</style>
