<template>
<div class="preview-label">生放送</div>
          <div class="preview-date">{{ row.date }} {{ row.week }}</div>
          <div class="preview-members">
            <img
              v-for="member in row.members"
              :key="`preview-${row.key}-${member}`"
              :src="`/chibi_s/${getCharAbbr(member)}.webp`"
              class="preview-member-avatar"
              :title="member"
            />
          </div>
</template>

<script setup>
const props = defineProps({
  presentation: { type: Object, required: true },
  row: { type: Object, required: true },
});
const { getCharAbbr } = props.presentation;
</script>
