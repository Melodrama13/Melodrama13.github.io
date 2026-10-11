<template>
<UiSurfaceTransition kind="dialog">
<div data-feature-view="card-capture-status" data-feature-page="cards"
      v-if="screenshotModalVisible"
      class="screenshot-export-modal-mask"
      @click.self="closeScreenshotModal"
    >
      <div class="screenshot-export-modal ui-motion-dialog-panel" :class="`is-${screenshotModalState}`" role="status" aria-live="polite">
        <div class="screenshot-export-modal-head">
          <div class="screenshot-export-modal-head-main">
            <span
              v-if="screenshotModalState === 'capturing' || screenshotModalState === 'retrying'"
              class="screenshot-export-modal-spinner"
              aria-hidden="true"
            ></span>
            <span class="screenshot-export-modal-title">{{ screenshotModalTitle }}</span>
          </div>
          <button
            v-if="screenshotModalState === 'capturing' || screenshotModalState === 'retrying'"
            class="pjsk-ui-action card-export-btn screenshot-export-modal-close-btn"
            @click="forceCancelScreenshotExport"
          >
            取消
          </button>
        </div>
        <p class="screenshot-export-modal-message">{{ screenshotModalMessage }}</p>
        <div v-if="screenshotModalState === 'failed'" class="screenshot-export-modal-actions">
          <button class="pjsk-ui-action card-export-btn screenshot-export-modal-btn" :disabled="isExportingPng" @click="retryScreenshotExport">重新截图</button>
          <button class="pjsk-ui-action card-export-btn screenshot-export-modal-btn screenshot-export-modal-btn-secondary" :disabled="isExportingPng" @click="closeScreenshotModal">关闭</button>
        </div>
      </div>
    </div>
</UiSurfaceTransition>
</template>

<script setup>
import UiSurfaceTransition from '../../components/ui/UiSurfaceTransition.vue';
defineProps(["screenshotModalVisible","closeScreenshotModal","screenshotModalState","screenshotModalTitle","forceCancelScreenshotExport","screenshotModalMessage","isExportingPng","retryScreenshotExport"]);
</script>
