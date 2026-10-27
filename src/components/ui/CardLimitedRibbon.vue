<template>
  <span class="card-limited-ribbon" :class="{ 'card-limited-ribbon--permanent': tone === 'permanent' }" :data-ribbon-kind="tone" role="img" :aria-label="label" :title="label"><span aria-hidden="true">{{ label }}</span></span>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  tone: { type: String, default: 'limited', validator: value => ['limited', 'permanent'].includes(value) },
});
</script>

<style scoped>
.card-limited-ribbon {
  position: absolute;
  inset: 0;
  border-radius: 4%;
  overflow: hidden;
  container-type: inline-size;
  z-index: 5;
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
  box-shadow: 0 0.4cqw 0.8cqw rgba(128, 24, 24, 0.2);
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
  font-size: 11cqw;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
  text-align: center;
  text-shadow: 0 0.5cqw 1cqw rgba(120, 18, 18, 0.36);
}
.card-limited-ribbon--permanent::before {
  background: linear-gradient(90deg, #607898 0%, #536b89 58%, #465c78 100%);
  box-shadow: 0 0.4cqw 0.8cqw rgba(46, 64, 91, 0.18);
}
.card-limited-ribbon--permanent > span {
  text-shadow: 0 0.5cqw 1cqw rgba(36, 51, 75, 0.28);
}
</style>
