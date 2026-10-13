<template>
  <div class="special-event-row special-compilation-row" :style="[textStyle, row.detailStyle]" aria-label="总集篇排期">
    <div class="special-compilation-label">总集篇</div>
    <div class="special-compilation-items" :class="{ 'is-single': row.events.length === 1 }">
      <div v-for="event in row.events" :key="event.id" class="special-compilation-item">
        <span v-if="event.unitLogo" class="special-compilation-logo-frame">
          <img :src="event.unitLogo" class="special-compilation-logo" :alt="event.unitLabel" />
        </span>
        <span v-else class="special-compilation-unit">{{ event.unitLabel || '团体未定' }}</span>
        <span class="special-compilation-meta">
          <span class="special-event-id">#{{ event.id }}</span>
          <span class="special-compilation-dates">
            {{ event.startDate || '-' }}<template v-if="event.endDate"> ～ {{ event.endDate }}</template>
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ row: { type: Object, required: true }, textStyle: { type: Object, default: () => ({}) } });
</script>

<style scoped>
.special-compilation-label,
.special-compilation-items {
  min-width: 0;
  border: 1px solid rgba(23, 49, 58, 0.12);
  border-radius: 18px;
  background-image: var(--special-compilation-fill);
  background-size: var(--special-row-width) 100%;
}

.special-compilation-label {
  display: flex;
  align-items: center;
  justify-content: center;
  background-position: left;
  font-weight: 800;
}

.special-compilation-items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  background-position: right;
}

.special-compilation-items.is-single {
  grid-template-columns: minmax(0, 1fr);
}

.special-compilation-item {
  min-width: 0;
  min-height: 80px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 8px;
}

.special-compilation-item + .special-compilation-item {
  border-left: 1px solid rgba(23, 49, 58, 0.12);
}

.special-compilation-logo-frame {
  width: 168px;
  max-width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* html2canvas draws image bounds directly; keep those bounds at the intrinsic ratio. */
.special-compilation-logo {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
}

.special-compilation-meta {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 14px;
}

.special-event-id {
  color: #0f766e;
  font-size: 0.82em;
  font-weight: 800;
}

.special-compilation-dates {
  font-size: 0.85em;
  font-weight: 700;
  white-space: nowrap;
}
</style>
