<template>
  <Transition :css="false" :appear="appear"
    @before-enter="enableSurface" @enter="motion.enter" @leave="motion.leave"
    @enter-cancelled="motion.cancel" @leave-cancelled="cancelLeavingSurface" @before-leave="disableSurface">
    <slot />
  </Transition>
</template>

<script setup>
import { watch } from 'vue';
import { useUiSurfaceMotion } from '../../ui/useUiSurfaceMotion.js';
const props = defineProps({
  kind: { type: String, default: 'popover', validator: value => ['popover', 'dialog', 'feedback', 'navigation', 'drawer'].includes(value) },
  edge: { type: String, default: 'right', validator: value => ['right', 'bottom'].includes(value) },
  appear: { type: Boolean, default: false },
});
const motion = useUiSurfaceMotion(() => props.kind, () => props.edge);
// A responsive drawer can change edges during rotation or resize. Settle its
// old direction before letting the new layout accept input.
watch(() => [props.kind, props.edge], motion.finish);

// Leaving surfaces stop accepting pointer and keyboard input immediately.
// Vue owns cancellation and v-show display; reopening remains interruptible.
const enableSurface = element => { element.inert = false; };
const disableSurface = element => { element.inert = true; };
const cancelLeavingSurface = element => { motion.cancel(element); enableSurface(element); };
</script>
