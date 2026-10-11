<template>
<div data-feature-view="special-prediction-export-controls" data-feature-page="special-prediction" class="special-toolbar-row special-toolbar-row-actions">
        <div class="special-toolbar-group special-toolbar-actions" :class="{ 'has-cover': coverBgUrl }">
          <label class="special-upload-btn">
            <input type="file" accept="image/*" @change="onCoverBgUpload" />
            <span>{{ coverBgFileName ? '更换图片' : '上传图片' }}</span>
          </label>
          <button v-if="coverBgUrl" class="pjsk-ui-action special-secondary-btn special-clear-cover-btn" type="button" @click="clearCoverBg">清除图片</button>
          <label v-if="coverBgUrl" class="special-cover-opacity-field" title="图片透明度">
            <span>透明</span>
            <input class="pjsk-ui-field" v-model.number="coverBgOpacity" type="number" min="0" max="100" step="5" inputmode="numeric" aria-label="图片透明度" @change="normalizeCoverBgOpacity" />
            <span>%</span>
          </label>
          <button class="pjsk-ui-action special-action-btn" type="button" :disabled="isExporting || !hasRenderableRows" :aria-busy="isExporting" @click="exportPng">
            {{ isExporting ? '导出中...' : '导出 PNG' }}
          </button>
        </div>
        </div>
</template>

<script setup>
// Feature objects retain the actual instance refs used by native controls and canvas elements.

const props = defineProps(["background","capture"]);
const { coverBgUrl, onCoverBgUpload, coverBgFileName, clearCoverBg, coverBgOpacity, normalizeCoverBgOpacity } = props.background;
const { isExporting, hasRenderableRows, exportPng } = props.capture;
</script>
