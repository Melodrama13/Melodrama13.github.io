<template>
<div data-feature-view="app-capture-status-content" data-feature-page="app" class="app-screenshot-modal ui-motion-dialog-panel ui-liquid-glass ui-liquid-glass--modal" :class="`is-${screenshotExportModalState}`" role="status" aria-live="polite">
        <div class="app-screenshot-modal-head">
          <div class="app-screenshot-modal-head-main">
            <span
              v-if="screenshotExportModalState === 'capturing' || screenshotExportModalState === 'retrying'"
              class="app-screenshot-modal-spinner"
              aria-hidden="true"
            ></span>
            <span class="app-screenshot-modal-title">{{ screenshotExportModalTitle }}</span>
          </div>
          <button
            v-if="screenshotExportModalState === 'capturing' || screenshotExportModalState === 'retrying'"
            class="pjsk-ui-action io-btn app-screenshot-modal-close-btn"
            @click="forceCancelScreenshotExport"
          >
            取消
          </button>
        </div>
        <p class="app-screenshot-modal-message">{{ screenshotExportModalMessage }}</p>
        <div v-if="screenshotExportModalState === 'failed'" class="app-screenshot-modal-actions">
          <button class="pjsk-ui-action io-btn app-screenshot-modal-btn" :disabled="isScreenshotExporting" @click="retryScreenshotExport">重新截图</button>
          <button class="pjsk-ui-action io-btn app-screenshot-modal-btn app-screenshot-modal-btn-secondary" :disabled="isScreenshotExporting" @click="closeScreenshotExportModal">关闭</button>
        </div>
      </div>
</template>

<script setup>
const props = defineProps({
  historyCapture: { type: Object, required: true },
});
const { screenshotExportModalState, screenshotExportModalTitle, forceCancelScreenshotExport, screenshotExportModalMessage, isScreenshotExporting, retryScreenshotExport, closeScreenshotExportModal } = props.historyCapture;
</script>
