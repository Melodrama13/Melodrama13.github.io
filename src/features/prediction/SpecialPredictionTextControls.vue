<template>
<div data-feature-view="special-prediction-text-controls" data-feature-page="special-prediction" class="special-toolbar-row special-toolbar-row-text">
        <div class="special-toolbar-group special-toolbar-text" aria-label="头图文字">
          <div class="special-editor-row special-editor-row-picker">
            <div class="special-picker-field">
              <span class="special-toolbar-label">文本框</span>
              <div class="special-text-picker-controls">
                <select v-model="selectedCoverTextId" class="pjsk-ui-field special-text-select">
                  <option :value="GLOBAL_COVER_TEXT_ID">全局</option>
                  <option :value="ALL_EVENT_NOTES_ID">全体备注框</option>
                  <option v-for="block in coverTextBlocks" :key="block.id" :value="block.id">{{ block.name }}</option>
                  <option :value="PREDICTOR_TEXT_ID">预测者</option>
                  <option v-if="selectedEventNote" :value="selectedCoverTextId">{{ selectedEventNote.name }}</option>
                </select>
                <button class="pjsk-ui-action special-history-btn" type="button" :disabled="!canUndoEditor" title="撤销" aria-label="撤销" @click="undoEditorChange">
                  <img src="/icon/undo.png" alt="" />
                </button>
                <button class="pjsk-ui-action special-history-btn" type="button" :disabled="!canRedoEditor" title="重做" aria-label="重做" @click="redoEditorChange">
                  <img src="/icon/redo.png" alt="" />
                </button>
              </div>
            </div>
            <div v-if="isAnyEventNoteMode" class="special-editor-actions is-event-note">
              <button class="pjsk-ui-action special-secondary-btn" type="button" @click="resetEventNoteStyles">重置样式</button>
              <button class="pjsk-ui-action special-secondary-btn" type="button" @click="clearEventNoteText">清空文字</button>
              <button class="pjsk-ui-action special-secondary-btn" type="button" @click="resetSelectedCoverTextBlock">重置</button>
            </div>
            <div v-else class="special-editor-actions">
              <button class="pjsk-ui-action special-secondary-btn" type="button" @click="addCoverTextBlock">新增</button>
              <button class="pjsk-ui-action special-secondary-btn" type="button" :disabled="!selectedCoverTextBlock" @click="duplicateSelectedCoverTextBlock">复制</button>
              <button class="pjsk-ui-action special-secondary-btn" type="button" :disabled="!selectedCoverTextBlock || coverTextBlocks.length <= 1" @click="removeSelectedCoverTextBlock">删除</button>
              <button class="pjsk-ui-action special-secondary-btn" type="button" :disabled="isGlobalTextMode" @click="resetSelectedCoverTextBlock">重置</button>
            </div>
          </div>
          <template v-if="editorCoverTextSettings">
          <div class="special-editor-row special-editor-row-font" :class="{ 'has-custom-font': selectedCustomFontOption }">
            <label class="special-editor-select-field">
              <span>字体</span>
              <select v-model="editorCoverTextSettings.fontFamily" class="pjsk-ui-field special-font-select" :style="{ fontFamily: editorCoverTextSettings.fontFamily }">
                <option
                  v-for="option in availableFontOptions"
                  :key="option.value"
                  :value="option.value"
                  :style="{ fontFamily: option.value }"
                >{{ option.label }}</option>
              </select>
            </label>
            <label class="special-upload-btn special-font-upload-btn" title="导入字体并保存到当前浏览器">
              <input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" @change="onLocalFontUpload" />
              <span>导入字体</span>
            </label>
            <button v-if="selectedCustomFontOption" class="pjsk-ui-action special-secondary-btn special-font-delete-btn" type="button" title="仅删除当前上传字体" @click="deleteSelectedCustomFont">删除字体</button>
          </div>
          <div v-if="localFontStatus" class="special-font-status">{{ localFontStatus }}</div>
          <div class="special-editor-row special-editor-row-type">
            <label class="special-mini-field"><span>字号</span><input class="pjsk-ui-field" v-model.number="editorCoverTextSettings.fontSize" type="number" min="8" max="96" step="1" /></label>
            <label class="special-editor-select-field is-compact"><span>字重</span><select class="pjsk-ui-field" v-model.number="editorCoverTextSettings.weight"><option v-for="weight in [100, 300, 400, 500, 600, 700, 800, 900]" :key="weight" :value="weight">{{ weight }}</option></select></label>
            <div class="special-style-control" aria-label="字形样式">
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.weight >= 700 }" title="粗体" @click="editorCoverTextSettings.weight = editorCoverTextSettings.weight >= 700 ? 400 : 800">B</button>
              <button class="pjsk-ui-action special-italic-toggle" type="button" :class="{ active: editorCoverTextSettings.italic === true }" title="斜体" @click="editorCoverTextSettings.italic = !editorCoverTextSettings.italic"><em>I</em></button>
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.underline === true }" title="下划线" @click="editorCoverTextSettings.underline = !editorCoverTextSettings.underline"><u>U</u></button>
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.shadowEnabled === true }" title="文字阴影" @click="editorCoverTextSettings.shadowEnabled = !editorCoverTextSettings.shadowEnabled">影</button>
            </div>
          </div>
          <div class="special-editor-row special-editor-row-colors" :class="{ 'is-event-note': isAnyEventNoteMode }">
            <label class="special-color-field">
              <span>文字</span>
              <span class="special-text-color-swatch" :class="{ 'is-mixed': isGlobalTextPropertyMixed('color') }" :style="{ backgroundColor: isGlobalTextPropertyMixed('color') ? 'transparent' : editorCoverTextSettings.color }">
                <input v-model="editorCoverTextSettings.color" class="pjsk-ui-swatch special-text-color-input" type="color" title="文字颜色" />
              </span>
            </label>
            <label class="special-color-field">
              <span>阴影</span>
              <span class="special-text-color-swatch" :class="{ 'is-mixed': isGlobalTextPropertyMixed('shadowColor') }" :style="{ backgroundColor: isGlobalTextPropertyMixed('shadowColor') ? 'transparent' : (editorCoverTextSettings.shadowColor || editorShadowColorFallback) }">
                <input class="pjsk-ui-swatch special-text-color-input" type="color" title="阴影颜色" :value="isGlobalTextPropertyMixed('shadowColor') ? '#ffffff' : (editorCoverTextSettings.shadowColor || editorShadowColorFallback)" @input="editorCoverTextSettings.shadowColor = $event.target.value" />
              </span>
            </label>
            <button v-if="!isAnyEventNoteMode" class="pjsk-ui-action special-secondary-btn special-follow-btn" :class="{ active: !isGlobalTextPropertyMixed('shadowColor') && !editorCoverTextSettings.shadowColor }" type="button" @click="editorCoverTextSettings.shadowColor = ''">跟随月份色</button>
            <div v-if="isAnyEventNoteMode" class="special-align-control" aria-label="文字水平对齐">
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.align === 'left' }" @click="editorCoverTextSettings.align = 'left'">左</button>
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.align === 'center' }" @click="editorCoverTextSettings.align = 'center'">中</button>
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.align === 'right' }" @click="editorCoverTextSettings.align = 'right'">右</button>
            </div>
          </div>
          <div v-if="!isAnyEventNoteMode" class="special-editor-row special-editor-row-align" :class="{ 'is-single': isFixedTextMode }">
            <div class="special-align-control" aria-label="文字水平对齐">
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.align === 'left' }" @click="editorCoverTextSettings.align = 'left'">左</button>
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.align === 'center' }" @click="editorCoverTextSettings.align = 'center'">中</button>
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.align === 'right' }" @click="editorCoverTextSettings.align = 'right'">右</button>
            </div>
            <div v-if="!isFixedTextMode" class="special-align-control" aria-label="文字垂直对齐">
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.verticalAlign === 'top' }" @click="editorCoverTextSettings.verticalAlign = 'top'">上</button>
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.verticalAlign === 'center' }" @click="editorCoverTextSettings.verticalAlign = 'center'">中</button>
              <button class="pjsk-ui-action" type="button" :class="{ active: editorCoverTextSettings.verticalAlign === 'bottom' }" @click="editorCoverTextSettings.verticalAlign = 'bottom'">下</button>
            </div>
          </div>
          <div class="special-editor-row special-editor-row-spacing">
            <label class="special-mini-field"><span>行高</span><input class="pjsk-ui-field" v-model.number="editorCoverTextSettings.lineHeight" type="number" min="0.8" max="3" step="0.05" /></label>
            <label class="special-mini-field"><span>字距</span><input class="pjsk-ui-field" v-model.number="editorCoverTextSettings.letterSpacing" type="number" min="-4" max="20" step="0.5" /></label>
            <label class="special-mini-field"><span>透明</span><input class="pjsk-ui-field" v-model.number="editorCoverTextSettings.opacity" type="number" min="10" max="100" step="5" /></label>
          </div>
          <div v-if="selectedCoverTextBlock" class="special-editor-row special-editor-row-geometry">
            <label class="special-mini-field"><span>X</span><input class="pjsk-ui-field" v-model.number="selectedCoverTextBlock.x" type="number" min="0" max="94" step="0.25" /></label>
            <label class="special-mini-field"><span>Y</span><input class="pjsk-ui-field" v-model.number="selectedCoverTextBlock.y" type="number" min="0" max="94" step="0.25" /></label>
            <label class="special-mini-field"><span>宽</span><input class="pjsk-ui-field" v-model.number="selectedCoverTextBlock.w" type="number" min="6" max="100" step="0.25" /></label>
            <label class="special-mini-field"><span>高</span><input class="pjsk-ui-field" v-model.number="selectedCoverTextBlock.h" type="number" min="6" max="100" step="0.25" /></label>
          </div>
          <div v-if="selectedCoverTextBlock" class="special-editor-row special-editor-row-layer">
            <button class="pjsk-ui-action special-secondary-btn" type="button" @click="moveSelectedCoverTextLayer(1)">置于顶层</button>
            <button class="pjsk-ui-action special-secondary-btn" type="button" @click="moveSelectedCoverTextLayer(-1)">置于底层</button>
            <button class="pjsk-ui-action special-secondary-btn special-restore-btn" type="button" @click="restoreDefaultCoverTextBlocks">全部恢复默认</button>
          </div>
          <div v-else-if="isGlobalTextMode" class="special-editor-row special-editor-row-global-reset">
            <button class="pjsk-ui-action special-secondary-btn special-restore-btn" type="button" @click="restoreDefaultCoverTextBlocks">全部恢复默认</button>
          </div>
          </template>
        </div>
        </div>
</template>

<script setup>
// Feature objects retain the actual instance refs used by native controls and canvas elements.
import { GLOBAL_COVER_TEXT_ID } from './specialPredictionTextDefaults.js';
import { ALL_EVENT_NOTES_ID } from './specialPredictionTextDefaults.js';
import { PREDICTOR_TEXT_ID } from './specialPredictionTextDefaults.js';
const props = defineProps(["textSettings","history","coverText","fonts"]);
const { selectedCoverTextId, coverTextBlocks, selectedEventNote, isAnyEventNoteMode, selectedCoverTextBlock, isGlobalTextMode, editorCoverTextSettings, isGlobalTextPropertyMixed, editorShadowColorFallback, isFixedTextMode } = props.textSettings;
const { canUndoEditor, undoEditorChange, canRedoEditor, redoEditorChange } = props.history;
const { resetEventNoteStyles, clearEventNoteText, resetSelectedCoverTextBlock, addCoverTextBlock, duplicateSelectedCoverTextBlock, removeSelectedCoverTextBlock, moveSelectedCoverTextLayer, restoreDefaultCoverTextBlocks } = props.coverText;
const { selectedCustomFontOption, availableFontOptions, onLocalFontUpload, deleteSelectedCustomFont, localFontStatus } = props.fonts;
</script>
