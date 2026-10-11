<template>
<UiSurfaceTransition kind="dialog">
<div data-feature-view="song-capture-modal" data-feature-page="songs"
      v-if="screenshotModalVisible"
      class="song-screenshot-modal-mask"
      @click.self="closeScreenshotModal"
    >
      <div class="song-screenshot-modal ui-motion-dialog-panel" :class="`is-${screenshotModalState}`" role="status" aria-live="polite">
        <div class="song-screenshot-modal-head">
          <div class="song-screenshot-modal-head-main">
            <span
              v-if="screenshotModalState === 'capturing' || screenshotModalState === 'retrying'"
              class="song-screenshot-modal-spinner"
              aria-hidden="true"
            ></span>
            <span class="song-screenshot-modal-title">{{ screenshotModalTitle }}</span>
          </div>
          <button
            v-if="screenshotModalState === 'capturing' || screenshotModalState === 'retrying'"
            class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-screenshot-modal-close-btn"
            @click="forceCancelScreenshotExport"
          >
            取消
          </button>
        </div>
        <p class="song-screenshot-modal-message">{{ screenshotModalMessage }}</p>
        <div v-if="screenshotModalState === 'failed'" class="song-screenshot-modal-actions">
          <button class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-screenshot-modal-btn" :disabled="isExportingPng" @click="retryScreenshotExport">重新截图</button>
          <button class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-screenshot-modal-btn song-screenshot-modal-btn-secondary" :disabled="isExportingPng" @click="closeScreenshotModal">关闭</button>
        </div>
      </div>
    </div>
</UiSurfaceTransition>
</template>

<script setup>
import UiSurfaceTransition from '../../components/ui/UiSurfaceTransition.vue';


/** Feature view: native markup and callbacks are preserved; state remains in its controller. */
defineProps(["screenshotModalVisible","closeScreenshotModal","screenshotModalState","screenshotModalTitle","forceCancelScreenshotExport","screenshotModalMessage","isExportingPng","retryScreenshotExport"]);

</script>
