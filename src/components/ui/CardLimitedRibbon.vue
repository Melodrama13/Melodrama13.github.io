<template>
  <span class="card-limited-ribbon" role="img" :aria-label="label" :title="label"><span aria-hidden="true">{{ label }}</span></span>
</template>

<script setup>
defineProps({ label: { type: String, required: true } });
</script>

<style scoped>
.card-limited-ribbon {
  position: absolute;
  inset: 0;
  border-radius: 4%;
  overflow: hidden;
  container-type: inline-size;
  z-index: 4;
  pointer-events: none;
}
.card-limited-ribbon::before {
  content: '';
  position: absolute;
  top: 11%;
  right: -21%;
  width: 100%;
  height: 15%;
  transform: rotate(30deg);
  transform-origin: center;
  background: linear-gradient(90deg, #ff7a7a 0%, #ff4d4f 58%, #d9363e 100%);
  box-shadow: 0 0.25px 0.5px rgba(128, 24, 24, 0.2);
}
.card-limited-ribbon > span {
  position: absolute;
  top: 11%;
  right: -21%;
  width: 100%;
  height: 15%;
  transform: rotate(30deg);
  transform-origin: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: clamp(4.5px, 11cqw, var(--card-ribbon-font-max, 6px));
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
  text-align: center;
  text-shadow: 0 1px 2px rgba(120, 18, 18, 0.36);
}
</style>
