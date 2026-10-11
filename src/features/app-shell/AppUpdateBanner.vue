<template>
<UiSurfaceTransition kind="feedback">
<div data-feature-view="app-update-banner" data-feature-page="app" v-if="showAppUpdateBanner" class="app-update-banner" role="status" aria-live="polite">
      <span class="app-update-text">{{ appUpdateBannerText }}</span>
      <button class="pjsk-ui-action app-update-btn app-update-btn-muted" @click="openAppUpdatePromptModal">更新说明</button>
      <button class="pjsk-ui-action app-update-btn" @click="reloadForAppUpdate">立即更新</button>
      <button class="pjsk-ui-action app-update-btn app-update-btn-muted" @click="dismissAppUpdateBanner">稍后</button>
    </div>
</UiSurfaceTransition>
</template>

<script setup>
import UiSurfaceTransition from '../../components/ui/UiSurfaceTransition.vue';
const props = defineProps({
  versionUpdates: { type: Object, required: true },
});
const { showAppUpdateBanner, appUpdateBannerText, openAppUpdatePromptModal, reloadForAppUpdate, dismissAppUpdateBanner } = props.versionUpdates;
</script>
