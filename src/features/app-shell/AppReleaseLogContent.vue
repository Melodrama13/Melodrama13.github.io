<template>
<div data-feature-view="app-release-log-content" data-feature-page="app" class="app-update-modal ui-motion-dialog-panel ui-liquid-glass ui-liquid-glass--modal" role="dialog" aria-modal="true" aria-label="新版日志">
        <div class="app-update-modal-title">{{ currentReleaseLogTitle }}</div>
        <div class="app-update-modal-subtitle">当前版本：{{ currentAppBuildId || '未知' }}</div>
        <ul class="app-update-log-list">
          <li v-for="(item, idx) in currentBuildReleaseNotes" :key="`release-log-${idx}`">{{ item }}</li>
        </ul>
        <img
          v-if="shouldRenderReleaseLogImage"
          :src="releaseLogImageSrc"
          class="app-release-log-image"
          alt="更新内容配图"
          loading="lazy"
          fetchpriority="low"
          decoding="async"
        />
        <label class="app-release-log-skip-option">
          <input v-model="releaseLogSkipChecked" class="pjsk-ui-choice app-release-log-skip-checkbox" type="checkbox" />
          <span>此版本不再提示</span>
        </label>
        <div class="app-update-modal-actions">
          <button class="pjsk-ui-action app-update-btn app-update-btn-muted" @click="closeAppReleaseLogModal">我知道了</button>
        </div>
      </div>
</template>

<script setup>
const props = defineProps({
  versionUpdates: { type: Object, required: true },
});
const { currentReleaseLogTitle, currentAppBuildId, currentBuildReleaseNotes, shouldRenderReleaseLogImage, releaseLogImageSrc, releaseLogSkipChecked, closeAppReleaseLogModal } = props.versionUpdates;
</script>
