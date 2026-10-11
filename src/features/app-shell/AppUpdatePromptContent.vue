<template>
<div data-feature-view="app-update-prompt-content" data-feature-page="app" class="app-update-modal ui-motion-dialog-panel ui-liquid-glass ui-liquid-glass--modal" role="dialog" aria-modal="true" aria-label="版本更新日志">
        <div class="app-update-modal-title">{{ appUpdatePromptTitle }}</div>
        <div class="app-update-modal-subtitle">{{ appUpdatePromptSubtitle }}</div>
        <ul class="app-update-log-list">
          <li v-for="(item, idx) in appUpdateReleaseNotes" :key="`update-log-${idx}`">{{ item }}</li>
        </ul>
        <div class="app-update-modal-actions">
          <button class="pjsk-ui-action app-update-btn" @click="reloadForAppUpdate">立即更新</button>
          <button class="pjsk-ui-action app-update-btn app-update-btn-muted" @click="dismissAppUpdateBanner">稍后</button>
        </div>
      </div>
</template>

<script setup>
const props = defineProps({
  versionUpdates: { type: Object, required: true },
});
const { appUpdatePromptTitle, appUpdatePromptSubtitle, appUpdateReleaseNotes, reloadForAppUpdate, dismissAppUpdateBanner } = props.versionUpdates;
</script>
