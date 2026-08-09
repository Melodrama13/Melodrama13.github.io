<template>
  <div
    class="special-predict-page"
    @compositionstart="onEditorCompositionStart"
    @compositionend="onEditorCompositionEnd"
  >
    <section v-if="!isUnlocked" class="special-lock-panel" aria-label="特殊预测生成器访问验证">
      <div class="special-lock-inner">
        <h2>特殊预测生成器</h2>
        <p>请输入访问密钥。</p>
        <form class="special-lock-form" @submit.prevent="unlock">
          <input
            v-model="keyDraft"
            class="special-lock-input"
            type="password"
            autocomplete="current-password"
            placeholder="密钥"
          />
          <button class="special-action-btn" type="submit">进入</button>
        </form>
        <div v-if="lockError" class="special-lock-error">{{ lockError }}</div>
        <div v-if="usingDefaultKey" class="special-lock-note">当前使用开发默认软锁。</div>
      </div>
    </section>

    <section v-else class="special-generator-shell">
      <div class="special-toolbar">
        <div class="special-toolbar-row special-toolbar-row-main">
        <div class="special-toolbar-group special-toolbar-source">
          <label class="special-source-picker">
            <span>数据源</span>
            <select v-model="selectedSourceId">
              <option
                v-for="source in normalizedSources"
                :key="source.id"
                :value="source.id"
              >
                {{ source.name }}（{{ source.predictiveEvents.length }}）
              </option>
            </select>
          </label>
        </div>

        <div class="special-toolbar-group special-toolbar-range">
          <label class="special-range-field">
            <span>起始</span>
            <input v-model="rangeStartDraft" type="text" inputmode="numeric" :placeholder="rangeStartPlaceholder" />
          </label>
          <label class="special-range-field">
            <span>截止</span>
            <input v-model="rangeEndDraft" type="text" inputmode="numeric" :placeholder="rangeEndPlaceholder" />
          </label>
          <label class="special-toggle-field">
            <input v-model="showUnpredictedRows" type="checkbox" />
            <span>未预测</span>
          </label>
        </div>
        </div>

        <div class="special-toolbar-row special-toolbar-row-colors">
        <div class="special-toolbar-group special-toolbar-colors" aria-label="月份填充色">
          <span class="special-toolbar-label special-color-group-label">月份色</span>
          <div class="special-color-swatches">
            <button
              v-for="item in characterColorOptions"
              :key="item.name"
              class="special-color-swatch"
              :class="{ active: selectedMonthColor === item.color }"
              type="button"
              :title="item.name"
              :style="{ backgroundColor: item.color }"
              @click="setMonthColor(item.name)"
            />
            <button
              class="special-color-swatch special-color-custom"
              :class="{ active: monthColorName === CUSTOM_COLOR_KEY }"
              type="button"
              title="自选色"
              @click="setMonthColor(CUSTOM_COLOR_KEY)"
            />
            <input
              v-if="monthColorName === CUSTOM_COLOR_KEY"
              v-model="customMonthColor"
              class="special-inline-color-input"
              type="color"
              title="自选月份色"
            />
          </div>
        </div>

        <div class="special-toolbar-group special-toolbar-colors" aria-label="背景颜色">
          <span class="special-toolbar-label special-color-group-label">背景色</span>
          <div class="special-color-swatches">
            <button
              v-for="item in characterColorOptions"
              :key="`bg-${item.name}`"
              class="special-color-swatch is-bg"
              :class="{ active: selectedBackgroundColor === item.color }"
              type="button"
              :title="item.name"
              :style="{ backgroundColor: rgbaFromHex(item.color, 0.42) }"
              @click="setBackgroundColor(item.name)"
            />
            <button
              class="special-color-swatch special-color-custom"
              :class="{ active: backgroundColorName === CUSTOM_COLOR_KEY }"
              type="button"
              title="自选色"
              @click="setBackgroundColor(CUSTOM_COLOR_KEY)"
            />
            <input
              v-if="backgroundColorName === CUSTOM_COLOR_KEY"
              v-model="customBackgroundColor"
              class="special-inline-color-input"
              type="color"
              title="自选背景色"
            />
          </div>
        </div>
        </div>

        <div class="special-toolbar-row special-toolbar-row-text">
        <div class="special-toolbar-group special-toolbar-text" aria-label="头图文字">
          <div class="special-editor-row special-editor-row-picker">
            <div class="special-picker-field">
              <span class="special-toolbar-label">文本框</span>
              <div class="special-text-picker-controls">
                <select v-model="selectedCoverTextId" class="special-text-select">
                  <option :value="GLOBAL_COVER_TEXT_ID">全局</option>
                  <option :value="ALL_EVENT_NOTES_ID">全体备注框</option>
                  <option v-for="block in coverTextBlocks" :key="block.id" :value="block.id">{{ block.name }}</option>
                  <option :value="PREDICTOR_TEXT_ID">预测者</option>
                  <option v-if="selectedEventNote" :value="selectedCoverTextId">{{ selectedEventNote.name }}</option>
                </select>
                <button class="special-history-btn" type="button" :disabled="!canUndoEditor" title="撤销" aria-label="撤销" @click="undoEditorChange">
                  <img src="/icon/undo.png" alt="" />
                </button>
                <button class="special-history-btn" type="button" :disabled="!canRedoEditor" title="重做" aria-label="重做" @click="redoEditorChange">
                  <img src="/icon/redo.png" alt="" />
                </button>
              </div>
            </div>
            <div v-if="isAnyEventNoteMode" class="special-editor-actions is-event-note">
              <button class="special-secondary-btn" type="button" @click="resetEventNoteStyles">重置样式</button>
              <button class="special-secondary-btn" type="button" @click="clearEventNoteText">清空文字</button>
              <button class="special-secondary-btn" type="button" @click="resetSelectedCoverTextBlock">重置</button>
            </div>
            <div v-else class="special-editor-actions">
              <button class="special-secondary-btn" type="button" @click="addCoverTextBlock">新增</button>
              <button class="special-secondary-btn" type="button" :disabled="!selectedCoverTextBlock" @click="duplicateSelectedCoverTextBlock">复制</button>
              <button class="special-secondary-btn" type="button" :disabled="!selectedCoverTextBlock || coverTextBlocks.length <= 1" @click="removeSelectedCoverTextBlock">删除</button>
              <button class="special-secondary-btn" type="button" :disabled="isGlobalTextMode" @click="resetSelectedCoverTextBlock">重置</button>
            </div>
          </div>
          <template v-if="editorCoverTextSettings">
          <div class="special-editor-row special-editor-row-font" :class="{ 'has-custom-font': selectedCustomFontOption }">
            <label class="special-editor-select-field">
              <span>字体</span>
              <select v-model="editorCoverTextSettings.fontFamily" class="special-font-select" :style="{ fontFamily: editorCoverTextSettings.fontFamily }">
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
            <button v-if="selectedCustomFontOption" class="special-secondary-btn special-font-delete-btn" type="button" title="仅删除当前上传字体" @click="deleteSelectedCustomFont">删除字体</button>
          </div>
          <div v-if="localFontStatus" class="special-font-status">{{ localFontStatus }}</div>
          <div class="special-editor-row special-editor-row-type">
            <label class="special-mini-field"><span>字号</span><input v-model.number="editorCoverTextSettings.fontSize" type="number" min="8" max="96" step="1" /></label>
            <label class="special-editor-select-field is-compact"><span>字重</span><select v-model.number="editorCoverTextSettings.weight"><option v-for="weight in [100, 300, 400, 500, 600, 700, 800, 900]" :key="weight" :value="weight">{{ weight }}</option></select></label>
            <div class="special-style-control" aria-label="字形样式">
              <button type="button" :class="{ active: editorCoverTextSettings.weight >= 700 }" title="粗体" @click="editorCoverTextSettings.weight = editorCoverTextSettings.weight >= 700 ? 400 : 800">B</button>
              <button class="special-italic-toggle" type="button" :class="{ active: editorCoverTextSettings.italic === true }" title="斜体" @click="editorCoverTextSettings.italic = !editorCoverTextSettings.italic"><em>I</em></button>
              <button type="button" :class="{ active: editorCoverTextSettings.underline === true }" title="下划线" @click="editorCoverTextSettings.underline = !editorCoverTextSettings.underline"><u>U</u></button>
              <button type="button" :class="{ active: editorCoverTextSettings.shadowEnabled === true }" title="文字阴影" @click="editorCoverTextSettings.shadowEnabled = !editorCoverTextSettings.shadowEnabled">影</button>
            </div>
          </div>
          <div class="special-editor-row special-editor-row-colors" :class="{ 'is-event-note': isAnyEventNoteMode }">
            <label class="special-color-field">
              <span>文字</span>
              <span class="special-text-color-swatch" :class="{ 'is-mixed': isGlobalTextPropertyMixed('color') }" :style="{ backgroundColor: isGlobalTextPropertyMixed('color') ? 'transparent' : editorCoverTextSettings.color }">
                <input v-model="editorCoverTextSettings.color" class="special-text-color-input" type="color" title="文字颜色" />
              </span>
            </label>
            <label class="special-color-field">
              <span>阴影</span>
              <span class="special-text-color-swatch" :class="{ 'is-mixed': isGlobalTextPropertyMixed('shadowColor') }" :style="{ backgroundColor: isGlobalTextPropertyMixed('shadowColor') ? 'transparent' : (editorCoverTextSettings.shadowColor || editorShadowColorFallback) }">
                <input class="special-text-color-input" type="color" title="阴影颜色" :value="isGlobalTextPropertyMixed('shadowColor') ? '#ffffff' : (editorCoverTextSettings.shadowColor || editorShadowColorFallback)" @input="editorCoverTextSettings.shadowColor = $event.target.value" />
              </span>
            </label>
            <button v-if="!isAnyEventNoteMode" class="special-secondary-btn special-follow-btn" :class="{ active: !isGlobalTextPropertyMixed('shadowColor') && !editorCoverTextSettings.shadowColor }" type="button" @click="editorCoverTextSettings.shadowColor = ''">跟随月份色</button>
            <div v-if="isAnyEventNoteMode" class="special-align-control" aria-label="文字水平对齐">
              <button type="button" :class="{ active: editorCoverTextSettings.align === 'left' }" @click="editorCoverTextSettings.align = 'left'">左</button>
              <button type="button" :class="{ active: editorCoverTextSettings.align === 'center' }" @click="editorCoverTextSettings.align = 'center'">中</button>
              <button type="button" :class="{ active: editorCoverTextSettings.align === 'right' }" @click="editorCoverTextSettings.align = 'right'">右</button>
            </div>
          </div>
          <div v-if="!isAnyEventNoteMode" class="special-editor-row special-editor-row-align" :class="{ 'is-single': isFixedTextMode }">
            <div class="special-align-control" aria-label="文字水平对齐">
              <button type="button" :class="{ active: editorCoverTextSettings.align === 'left' }" @click="editorCoverTextSettings.align = 'left'">左</button>
              <button type="button" :class="{ active: editorCoverTextSettings.align === 'center' }" @click="editorCoverTextSettings.align = 'center'">中</button>
              <button type="button" :class="{ active: editorCoverTextSettings.align === 'right' }" @click="editorCoverTextSettings.align = 'right'">右</button>
            </div>
            <div v-if="!isFixedTextMode" class="special-align-control" aria-label="文字垂直对齐">
              <button type="button" :class="{ active: editorCoverTextSettings.verticalAlign === 'top' }" @click="editorCoverTextSettings.verticalAlign = 'top'">上</button>
              <button type="button" :class="{ active: editorCoverTextSettings.verticalAlign === 'center' }" @click="editorCoverTextSettings.verticalAlign = 'center'">中</button>
              <button type="button" :class="{ active: editorCoverTextSettings.verticalAlign === 'bottom' }" @click="editorCoverTextSettings.verticalAlign = 'bottom'">下</button>
            </div>
          </div>
          <div class="special-editor-row special-editor-row-spacing">
            <label class="special-mini-field"><span>行高</span><input v-model.number="editorCoverTextSettings.lineHeight" type="number" min="0.8" max="3" step="0.05" /></label>
            <label class="special-mini-field"><span>字距</span><input v-model.number="editorCoverTextSettings.letterSpacing" type="number" min="-4" max="20" step="0.5" /></label>
            <label class="special-mini-field"><span>透明</span><input v-model.number="editorCoverTextSettings.opacity" type="number" min="10" max="100" step="5" /></label>
          </div>
          <div v-if="selectedCoverTextBlock" class="special-editor-row special-editor-row-geometry">
            <label class="special-mini-field"><span>X</span><input v-model.number="selectedCoverTextBlock.x" type="number" min="0" max="94" step="0.25" /></label>
            <label class="special-mini-field"><span>Y</span><input v-model.number="selectedCoverTextBlock.y" type="number" min="0" max="94" step="0.25" /></label>
            <label class="special-mini-field"><span>宽</span><input v-model.number="selectedCoverTextBlock.w" type="number" min="6" max="100" step="0.25" /></label>
            <label class="special-mini-field"><span>高</span><input v-model.number="selectedCoverTextBlock.h" type="number" min="6" max="100" step="0.25" /></label>
          </div>
          <div v-if="selectedCoverTextBlock" class="special-editor-row special-editor-row-layer">
            <button class="special-secondary-btn" type="button" @click="moveSelectedCoverTextLayer(1)">置于顶层</button>
            <button class="special-secondary-btn" type="button" @click="moveSelectedCoverTextLayer(-1)">置于底层</button>
            <button class="special-secondary-btn special-restore-btn" type="button" @click="restoreDefaultCoverTextBlocks">全部恢复默认</button>
          </div>
          <div v-else-if="isGlobalTextMode" class="special-editor-row special-editor-row-global-reset">
            <button class="special-secondary-btn special-restore-btn" type="button" @click="restoreDefaultCoverTextBlocks">全部恢复默认</button>
          </div>
          </template>
        </div>
        </div>

        <div class="special-toolbar-row special-toolbar-row-actions">
        <div class="special-toolbar-group special-toolbar-actions" :class="{ 'has-cover': coverBgUrl }">
          <label class="special-upload-btn">
            <input type="file" accept="image/*" @change="onCoverBgUpload" />
            <span>{{ coverBgFileName ? '更换图片' : '上传图片' }}</span>
          </label>
          <button v-if="coverBgUrl" class="special-secondary-btn special-clear-cover-btn" type="button" @click="clearCoverBg">清除图片</button>
          <label v-if="coverBgUrl" class="special-cover-opacity-field" title="图片透明度">
            <span>透明</span>
            <input v-model.number="coverBgOpacity" type="number" min="0" max="100" step="5" inputmode="numeric" aria-label="图片透明度" @change="normalizeCoverBgOpacity" />
            <span>%</span>
          </label>
          <button class="special-action-btn" type="button" :disabled="isExporting || renderedRows.length === 0" @click="exportPng">
            {{ isExporting ? '导出中...' : '导出 PNG' }}
          </button>
        </div>
        </div>
      </div>

      <div v-if="exportStatus" class="special-export-status">{{ exportStatus }}</div>

      <div ref="canvasWrapRef" class="special-canvas-wrap">
        <div class="special-canvas-stage" :style="canvasStageStyle">
        <div ref="canvasRef" class="special-canvas" :class="{ 'is-exporting': isExporting }" :style="canvasStyle" aria-label="特殊预测图预览" @pointerdown="onCanvasTextSelectionPointerDown">
          <div ref="coverPanelRef" class="special-cover-panel" :class="{ 'has-cover-image': coverBgUrl }" :style="coverStyle">
            <div v-if="coverBgUrl" class="special-cover-bg-image" :style="coverImageStyle" aria-hidden="true"></div>
            <div
              v-for="block in coverTextBlocks"
              :key="block.id"
              class="special-cover-text-frame"
              :class="{
                'is-selected': selectedCoverTextId === block.id,
                'is-transforming': selectedCoverTextId === block.id && !!activeTextTransformMode
              }"
              :style="getCoverTextFrameStyle(block)"
              @pointerdown="selectCoverTextBlock(block)"
            >
              <div
                class="special-cover-text"
                :class="[
                  `is-align-${block.align || 'left'}`,
                  { 'is-italic': block.italic }
                ]"
                contenteditable="true"
                :style="getCoverTextContentStyle(block)"
                :aria-label="block.name"
                spellcheck="false"
                :ref="(el) => setCoverTextElement(block, el)"
                @focus="selectCoverTextBlock(block)"
                @input="onCoverTextInput(block, $event)"
                @blur="onCoverTextBlur(block, $event)"
              />
              <button
                v-if="selectedCoverTextId === block.id"
                class="special-cover-move-handle"
                type="button"
                title="拖动文本框"
                aria-label="拖动文本框"
                @pointerdown="startCoverTextTransform(block, 'move', $event)"
              >•••</button>
              <button
                v-if="selectedCoverTextId === block.id"
                class="special-cover-resize-handle"
                type="button"
                title="缩放文本框"
                aria-label="缩放文本框"
                @pointerdown="startCoverTextTransform(block, 'resize', $event)"
              />
            </div>
          </div>
          <template v-for="row in renderedRows" :key="row.key">
            <div v-if="row.monthLabel" class="special-month-bar" :style="monthTextStyle">{{ row.monthLabel }}</div>
            <div
              :class="['special-event-row', row.rowClass]"
              :style="row.detailStyle"
            >
            <div class="special-date-box">
              <span class="special-date-text">{{ row.startDate || '-' }}</span>
              <span v-if="row.endDate" class="special-date-sep">~</span>
              <span v-if="row.endDate" class="special-date-text">{{ row.endDate }}</span>
              <span class="special-event-id">{{ row.isCollab ? '时间仅供参考' : `#${row.id}` }}</span>
            </div>

            <div class="special-detail-box" :style="row.detailStyle">
              <div class="special-detail-head" :class="row.detailKindClass">
                <template v-if="row.detailKind === 'box' && row.unitLogo">
                  <img :src="row.unitLogo" class="special-unit-logo" :alt="row.unitLabel" />
                </template>
                <template v-else-if="row.detailKind === 'mixed'">
                  <img src="/specialized/se.png" class="special-se-logo" alt="混活" />
                </template>
                <template v-else-if="row.detailKind === 'wl'">
                  <span class="special-wl-text">World Link</span>
                </template>
                <template v-else>
                  <span class="special-unknown-text">{{ row.eventType || '待定' }}</span>
                </template>
                <span v-if="row.seriesLabel" class="special-series-label">{{ row.seriesLabel }}</span>
              </div>

              <div class="special-member-grid">
                <SpecialCardCell
                  v-for="(card, idx) in row.normalCards"
                  :key="`n-${row.key}-${idx}`"
                  :card="card"
                  :is-banner="card.isBanner"
                  :char-map="charMap"
                  :vs-name-set="vsNameSet"
                />
              </div>

              <div v-if="row.bfesCards.length > 0" class="special-bfes-grid">
                <div class="special-bfes-logo-cell">
                  <img src="/elements/bfes.webp" class="special-bfes-logo" alt="BFES" />
                </div>
                <SpecialCardCell
                  v-for="(card, idx) in row.bfesCards"
                  :key="`b-${row.key}-${idx}`"
                  :card="card"
                  :is-banner="card.isBanner"
                  :char-map="charMap"
                  :vs-name-set="vsNameSet"
                />
              </div>
            </div>
            <div
              v-if="row.hasPrediction"
              class="special-event-note"
              :class="{
                'is-selected': selectedEventNoteId === row.id,
                'is-empty': !getEventNote(row.id).text
              }"
              contenteditable="true"
              spellcheck="false"
              :aria-label="`${row.id}备注`"
              data-placeholder="点击添加备注"
              :style="getEventNoteRenderStyle(row.id)"
              :ref="(el) => setEventNoteElement(row.id, el)"
              @pointerdown="selectEventNote(row.id)"
              @focus="selectEventNote(row.id)"
              @input="onEventNoteInput(row.id, $event)"
              @blur="onEventNoteBlur(row.id, $event)"
            />
            </div>
          </template>

          <div v-if="renderedRows.length === 0" class="special-empty">
            当前数据源没有可生成的预测。
          </div>
          <div
            class="special-credit-box"
            :class="{ 'is-selected': isPredictorTextMode }"
            contenteditable="true"
            spellcheck="false"
            aria-label="预测者署名"
            :style="creditTextRenderStyle"
            @pointerdown="selectPredictorText"
            @focus="selectPredictorText"
            @input="onCreditInput"
            :ref="setCreditElement"
          />
        </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import html2canvas from 'html2canvas';

const props = defineProps({
  predictSources: { type: Array, default: () => [] },
  activePredictSourceId: { type: String, default: '' },
  allEvents: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] },
  allBaseCards: { type: Array, default: () => [] },
  predictUserName: { type: String, default: '' }
});

const DEFAULT_KEY_HASH = 'f5175cca14129a479337dfc2fd9d4a1f7f1f6b9dbc8f7d57db51685d85af60fd';
const configuredHash = String(import.meta.env.VITE_SPECIAL_PREDICT_KEY_SHA256 || '').trim().toLowerCase();
const activeKeyHash = configuredHash || DEFAULT_KEY_HASH;
const usingDefaultKey = !configuredHash;
const UNLOCK_SESSION_KEY = 'pjsk_special_predict_generator_unlocked_v1';
const COVER_TEXT_STORAGE_KEY = 'pjsk_special_predict_cover_text_blocks_v1';
const GLOBAL_COVER_TEXT_ID = '__global__';
const PREDICTOR_TEXT_ID = '__predictor__';
const ALL_EVENT_NOTES_ID = '__all_event_notes__';
const EVENT_NOTE_ID_PREFIX = '__event_note__:';
const CUSTOM_COLOR_KEY = '__custom';
const FONT_DATABASE_NAME = 'pjsk_special_predict_fonts_v1';
const FONT_DATABASE_STORE = 'fonts';
const DEFAULT_CUSTOM_MONTH_COLOR = '#ffcaa6';
const DEFAULT_CUSTOM_BACKGROUND_COLOR = '#c8c9e8';
const GLOBAL_TEXT_STYLE_KEYS = Object.freeze([
  'fontFamily',
  'fontSize',
  'color',
  'shadowColor',
  'align',
  'weight',
  'italic',
  'underline',
  'lineHeight',
  'letterSpacing',
  'verticalAlign',
  'opacity',
  'shadowEnabled'
]);
const createDefaultCreditTextStyle = () => ({
  fontFamily: 'inherit',
  fontSize: 18,
  color: '#ffffff',
  shadowColor: '',
  align: 'center',
  weight: 800,
  italic: false,
  underline: false,
  lineHeight: 1.3,
  letterSpacing: 0,
  opacity: 100,
  shadowEnabled: true
});
const createDefaultEventNote = (eventId) => ({
  id: String(eventId || ''),
  name: `${String(eventId || '')}备注`,
  text: '',
  fontFamily: 'inherit',
  fontSize: 12,
  color: '#334155',
  shadowColor: '',
  align: 'right',
  weight: 500,
  italic: false,
  underline: false,
  lineHeight: 1.25,
  letterSpacing: 0,
  opacity: 100,
  shadowEnabled: false
});
const EVENT_NOTE_STYLE_KEYS = Object.freeze(
  GLOBAL_TEXT_STYLE_KEYS.filter((key) => key !== 'verticalAlign')
);
const DEFAULT_TEXT_FONT_STACK = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Noto Sans CJK SC", "Hiragino Sans GB", "Segoe UI", sans-serif';
const COMMON_FONT_OPTIONS = Object.freeze([
  { label: '系统默认', value: 'inherit' },
  { label: '系统无衬线', value: DEFAULT_TEXT_FONT_STACK },
  { label: '系统衬线', value: 'ui-serif, "Songti SC", STSong, SimSun, "Noto Serif CJK SC", serif' }
]);
const PLATFORM_FONT_OPTIONS = Object.freeze({
  ios: [
    { label: '苹方', value: '"PingFang SC", "PingFang TC", -apple-system, sans-serif' },
    { label: '宋体', value: '"Songti SC", STSong, ui-serif, serif' },
    { label: '楷体', value: '"Kaiti SC", STKaiti, ui-serif, serif' },
    { label: '仿宋', value: '"FangSong SC", STFangsong, FangSong, ui-serif, serif' },
    { label: '圆体', value: 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", sans-serif' },
    { label: '日文无衬线', value: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif' },
    { label: '等宽', value: 'ui-monospace, "SFMono-Regular", Menlo, monospace' }
  ],
  android: [
    { label: 'Roboto', value: 'Roboto, "Noto Sans CJK SC", sans-serif' },
    { label: 'Noto 无衬线', value: '"Noto Sans CJK SC", "Noto Sans SC", sans-serif' },
    { label: 'Noto 衬线', value: '"Noto Serif CJK SC", "Noto Serif SC", serif' },
    { label: '楷体', value: 'KaiTi, "Kaiti SC", "Noto Serif CJK SC", serif' },
    { label: '仿宋', value: 'FangSong, "FangSong SC", "Noto Serif CJK SC", serif' },
    { label: '等宽', value: '"Roboto Mono", "Noto Sans Mono CJK SC", monospace' }
  ],
  mac: [
    { label: '苹方', value: '"PingFang SC", "PingFang TC", -apple-system, sans-serif' },
    { label: '宋体', value: '"Songti SC", STSong, ui-serif, serif' },
    { label: '楷体', value: '"Kaiti SC", STKaiti, ui-serif, serif' },
    { label: '仿宋', value: '"FangSong SC", STFangsong, FangSong, ui-serif, serif' },
    { label: '圆体', value: 'ui-rounded, "SF Pro Rounded", sans-serif' },
    { label: '日文无衬线', value: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif' },
    { label: '日文明朝', value: '"Hiragino Mincho ProN", "Songti SC", ui-serif, serif' },
    { label: '日文圆体', value: '"Hiragino Maru Gothic ProN", ui-rounded, sans-serif' },
    { label: 'Helvetica Neue（西文）', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
    { label: 'Arial（西文）', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman（西文）', value: '"Times New Roman", Times, serif' },
    { label: 'Georgia（西文）', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Avenir（西文）', value: 'Avenir, "Helvetica Neue", sans-serif' },
    { label: 'Baskerville（西文）', value: 'Baskerville, Georgia, serif' },
    { label: 'American Typewriter（西文）', value: '"American Typewriter", "Courier New", monospace' },
    { label: 'Courier New（打字机）', value: '"Courier New", Courier, monospace' },
    { label: 'Menlo（等宽）', value: 'ui-monospace, "SFMono-Regular", Menlo, monospace' },
    { label: 'Monaco（等宽）', value: 'Monaco, Menlo, ui-monospace, monospace' }
  ],
  desktop: [
    { label: '微软雅黑', value: '"Microsoft YaHei", "Noto Sans SC", sans-serif' },
    { label: '微软雅黑 UI', value: '"Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans SC", sans-serif' },
    { label: '等线', value: 'DengXian, "Microsoft YaHei", "Noto Sans SC", sans-serif' },
    { label: '黑体', value: 'SimHei, "Microsoft YaHei", "Noto Sans SC", sans-serif' },
    { label: '宋体', value: 'SimSun, "Songti SC", "Noto Serif CJK SC", serif' },
    { label: '新宋体', value: 'NSimSun, SimSun, "Noto Serif CJK SC", serif' },
    { label: '楷体', value: 'KaiTi, STKaiti, "Kaiti SC", serif' },
    { label: '仿宋', value: 'FangSong, STFangsong, "FangSong SC", serif' },
    { label: '微软正黑', value: '"Microsoft JhengHei", "Microsoft YaHei", sans-serif' },
    { label: '新细明体', value: 'PMingLiU, MingLiU, SimSun, serif' },
    { label: '游黑体（日文）', value: '"Yu Gothic", "Hiragino Sans", "Noto Sans JP", sans-serif' },
    { label: 'Meiryo（日文）', value: 'Meiryo, "Yu Gothic", "Noto Sans JP", sans-serif' },
    { label: 'MS Gothic（日文）', value: '"MS Gothic", "MS PGothic", Meiryo, sans-serif' },
    { label: '游明朝（日文）', value: '"Yu Mincho", "MS Mincho", "Noto Serif JP", serif' },
    { label: 'MS Mincho（日文）', value: '"MS Mincho", "MS PMincho", "Yu Mincho", serif' },
    { label: '圆体', value: '"Yu Gothic UI", "Arial Rounded MT Bold", ui-rounded, sans-serif' },
    { label: 'Segoe UI（西文）', value: '"Segoe UI", Arial, sans-serif' },
    { label: 'Arial（西文）', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman（西文）', value: '"Times New Roman", Times, serif' },
    { label: 'Calibri（西文）', value: 'Calibri, "Segoe UI", Arial, sans-serif' },
    { label: 'Cambria（西文）', value: 'Cambria, Georgia, "Times New Roman", serif' },
    { label: 'Georgia（西文）', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Verdana（西文）', value: 'Verdana, Arial, sans-serif' },
    { label: 'Tahoma（西文）', value: 'Tahoma, "Segoe UI", sans-serif' },
    { label: 'Trebuchet MS（西文）', value: '"Trebuchet MS", Arial, sans-serif' },
    { label: 'Consolas（等宽）', value: 'Consolas, "SFMono-Regular", Menlo, monospace' },
    { label: 'Courier New（打字机）', value: '"Courier New", Courier, monospace' },
    { label: 'Lucida Console（等宽）', value: '"Lucida Console", Consolas, monospace' }
  ]
});

const detectFontPlatform = () => {
  if (typeof navigator === 'undefined') return 'desktop';
  const userAgent = String(navigator.userAgent || '');
  const platform = String(navigator.platform || '');
  const isTouchMac = platform === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1;
  if (/iPhone|iPad|iPod/i.test(userAgent) || isTouchMac) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'mac';
  return 'desktop';
};

const createDefaultCoverTextBlocks = () => [
  {
    id: 'title',
    name: '左上标题',
    text: 'プロセカ\n活动预测',
    x: 5,
    y: 8,
    w: 40,
    h: 40,
    fontSize: 35,
    color: '#ffffff',
    shadowColor: '',
    align: 'left',
    weight: 900,
    fontFamily: 'inherit',
    italic: false,
    underline: false,
    lineHeight: 1.28,
    letterSpacing: 0,
    verticalAlign: 'top',
    padding: 4,
    backgroundEnabled: false,
    backgroundColor: '#ffffff',
    backgroundOpacity: 32,
    borderEnabled: false,
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 6,
    opacity: 100,
    shadowEnabled: true,
    zIndex: 2
  },
  {
    id: 'note',
    name: '左下说明',
    text: '情况很多',
    x: 5,
    y: 50,
    w: 55,
    h: 40,
    fontSize: 18,
    color: '#ffffff',
    shadowColor: '',
    align: 'left',
    weight: 800,
    fontFamily: 'inherit',
    italic: false,
    underline: false,
    lineHeight: 1.28,
    letterSpacing: 0,
    verticalAlign: 'top',
    padding: 4,
    backgroundEnabled: false,
    backgroundColor: '#ffffff',
    backgroundOpacity: 32,
    borderEnabled: false,
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 6,
    opacity: 100,
    shadowEnabled: true,
    zIndex: 2
  },
  {
    id: 'reference',
    name: '右侧参考',
    text: '仅供参考\n仅供参考\n仅供参考\n仅供参考\n仅供参考\n仅供参考',
    x: 66,
    y: 12,
    w: 28,
    h: 70,
    fontSize: 35,
    color: '#ffffff',
    shadowColor: '',
    align: 'right',
    weight: 900,
    fontFamily: 'inherit',
    italic: false,
    underline: false,
    lineHeight: 1.28,
    letterSpacing: 0,
    verticalAlign: 'top',
    padding: 4,
    backgroundEnabled: false,
    backgroundColor: '#ffffff',
    backgroundOpacity: 32,
    borderEnabled: false,
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 6,
    opacity: 100,
    shadowEnabled: true,
    zIndex: 2
  }
];

const keyDraft = ref('');
const lockError = ref('');
const isUnlocked = ref(false);
const selectedSourceId = ref('');
const canvasRef = ref(null);
const canvasWrapRef = ref(null);
const coverPanelRef = ref(null);
const isExporting = ref(false);
const exportStatus = ref('');
const rangeStartDraft = ref('');
const rangeEndDraft = ref('');
const showUnpredictedRows = ref(true);
const monthColorName = ref('');
const coverBgUrl = ref('');
const coverBgFileName = ref('');
const coverBgAssetId = ref('');
const coverBgOpacity = ref(100);
const creditText = ref('');
const creditManuallyEdited = ref(false);
const backgroundColorName = ref('');
const customMonthColor = ref(DEFAULT_CUSTOM_MONTH_COLOR);
const customBackgroundColor = ref(DEFAULT_CUSTOM_BACKGROUND_COLOR);
const selectedCoverTextId = ref(GLOBAL_COVER_TEXT_ID);
const coverTextBlocks = ref(createDefaultCoverTextBlocks());
const globalTextDraft = ref({});
const allEventNotesDraft = ref({});
const monthFontFamily = ref('inherit');
const creditTextStyle = ref(createDefaultCreditTextStyle());
const eventNotesBySource = ref({});
const customFontOptions = ref([]);
const localFontStatus = ref('');
const fontPlatform = detectFontPlatform();
const activeTextTransformMode = ref('');
const editorUndoStack = ref([]);
const editorRedoStack = ref([]);
const editorHistoryPending = ref(false);
const previewScale = ref(1);
const previewCanvasWidth = ref(0);
const previewCanvasHeight = ref(0);
let previewResizeObserver = null;
let lastCreditDefault = '';
let exportStatusTimer = null;
let localFontStatusTimer = null;
const coverTextElementMap = new Map();
const eventNoteElementMap = new Map();
let creditElement = null;
let coverTextSettingsReady = false;
let activeTextTransform = null;
let fontDatabasePromise = null;
const customFontFaceMap = new Map();
const coverBgAssetMap = new Map();
const EDITOR_HISTORY_LIMIT = 80;
const EDITOR_HISTORY_CAPTURE_DELAY = 360;
let editorHistoryReady = false;
let editorHistoryApplying = false;
let editorHistoryTimer = null;
let lastEditorHistoryState = null;
let editorCompositionActive = false;

const normalizeId = (value) => String(value ?? '').trim();
const getBaseName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
const normalizeUnit = (unit) => String(unit || '').trim().toLowerCase();
const normalizeAttr = (attr) => {
  const raw = String(attr || '').trim();
  const map = {
    pure: 'Pure',
    cool: 'Cool',
    cute: 'Cute',
    happy: 'Happy',
    mysterious: 'Mysterious'
  };
  if (!raw || raw === '-') return '';
  return map[raw.toLowerCase()] || raw;
};

const UNIT_LOGOS = {
  ln: '/elements/Leo_need.webp',
  mmj: '/elements/MORE_MORE_JUMP!.webp',
  vbs: '/elements/Vivid_BAD_SQUAD.webp',
  ws: '/elements/ワンダーランズ×ショウタイム.webp',
  nc: '/elements/25時、ナイトコードで.webp',
  vs: '/elements/virtual_singer.webp'
};

const textToBytes = (text) => {
  const value = String(text || '');
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value);
  const encoded = unescape(encodeURIComponent(value));
  const bytes = new Uint8Array(encoded.length);
  for (let index = 0; index < encoded.length; index += 1) {
    bytes[index] = encoded.charCodeAt(index);
  }
  return bytes;
};

const rotr = (value, bits) => (value >>> bits) | (value << (32 - bits));

const sha256Fallback = (inputBytes) => {
  const bytes = Array.from(inputBytes || []);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  for (let shift = 56; shift >= 0; shift -= 8) {
    bytes.push(Math.floor(bitLength / (2 ** shift)) & 0xff);
  }

  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Array(64).fill(0);
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      w[index] = ((bytes[start] << 24) | (bytes[start + 1] << 16) | (bytes[start + 2] << 8) | bytes[start + 3]) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = (rotr(w[index - 15], 7) ^ rotr(w[index - 15], 18) ^ (w[index - 15] >>> 3)) >>> 0;
      const s1 = (rotr(w[index - 2], 17) ^ rotr(w[index - 2], 19) ^ (w[index - 2] >>> 10)) >>> 0;
      w[index] = (w[index - 16] + s0 + w[index - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let index = 0; index < 64; index += 1) {
      const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (hh + s1 + ch + k[index] + w[index]) >>> 0;
      const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (s0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }

  return h.map((value) => value.toString(16).padStart(8, '0')).join('');
};

const hashText = async (text) => {
  const bytes = textToBytes(text);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return sha256Fallback(bytes);
  try {
    const digest = await subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.warn('[special-predict] Web Crypto SHA-256 failed, using JS fallback.', error);
    return sha256Fallback(bytes);
  }
};

const unlock = async () => {
  lockError.value = '';
  try {
    const digest = await hashText(keyDraft.value);
    if (digest === activeKeyHash) {
      isUnlocked.value = true;
      sessionStorage.setItem(UNLOCK_SESSION_KEY, '1');
      keyDraft.value = '';
      return;
    }
    lockError.value = '密钥不正确。';
  } catch (error) {
    console.error('[special-predict] key check failed', error);
    lockError.value = '当前浏览器不支持密钥校验。';
  }
};

const normalizedSources = computed(() => (Array.isArray(props.predictSources) ? props.predictSources : [])
  .map((source, index) => ({
    id: normalizeId(source?.id) || `source-${index}`,
    name: String(source?.name || `数据源 ${index + 1}`).trim() || `数据源 ${index + 1}`,
    predictiveEvents: Array.isArray(source?.predictiveEvents) ? source.predictiveEvents : []
  })));

const selectedSource = computed(() => normalizedSources.value.find((source) => source.id === selectedSourceId.value) || normalizedSources.value[0] || null);

const eventNotes = computed(() => (
  eventNotesBySource.value[selectedSource.value?.id] || {}
));

const activePredictiveEventIdSet = computed(() => new Set(
  (selectedSource.value?.predictiveEvents || [])
    .map((event) => normalizeId(event?.id))
    .filter(Boolean)
));

const selectedSourceName = computed(() => String(selectedSource.value?.name || '').trim() || '未知用户');

const creditUserName = computed(() => String(props.predictUserName || '').trim() || selectedSourceName.value);

const defaultCreditText = computed(() => `预测：${creditUserName.value}`);

const baseCardsByEventId = computed(() => {
  const map = new Map();
  (Array.isArray(props.allBaseCards) ? props.allBaseCards : []).forEach((card) => {
    const key = normalizeId(card?.EventID);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(card);
  });
  return map;
});

const charMap = computed(() => {
  const map = {};
  (Array.isArray(props.allCharacters) ? props.allCharacters : []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    if (!name) return;
    map[name] = {
      abbr: String(char?.en_abbr || '').trim(),
      unit: normalizeUnit(char?.unit),
      color: String(char?.color || '').trim()
    };
  });
  return map;
});

const vsNameSet = computed(() => new Set(
  Object.entries(charMap.value)
    .filter(([, meta]) => meta.unit === 'vs')
    .map(([name]) => name)
));

const characterColorOptions = computed(() => (Array.isArray(props.allCharacters) ? props.allCharacters : [])
  .map((char) => ({
    name: String(char?.zh_name || '').trim(),
    color: String(char?.color || '').trim()
  }))
  .filter((item) => item.name && !!hexToRgb(item.color))
  .slice(0, 26));

const selectedMonthColor = computed(() => {
  if (monthColorName.value === CUSTOM_COLOR_KEY) return customMonthColor.value || '#ffcaa6';
  const matched = characterColorOptions.value.find((item) => item.name === monthColorName.value);
  return matched?.color || characterColorOptions.value[0]?.color || '#ffcaa6';
});

const selectedBackgroundColor = computed(() => {
  if (backgroundColorName.value === CUSTOM_COLOR_KEY) return customBackgroundColor.value || '#c8c9e8';
  const matched = characterColorOptions.value.find((item) => item.name === backgroundColorName.value);
  return matched?.color || characterColorOptions.value[1]?.color || '#c8c9e8';
});

const canvasStyle = computed(() => ({
  '--special-month-fill': selectedMonthColor.value,
  '--special-canvas-bg': mixHexWithWhite(selectedBackgroundColor.value, 0.32),
  '--special-preview-scale': previewScale.value
}));

const canvasStageStyle = computed(() => ({
  width: previewCanvasWidth.value ? `${Math.ceil(previewCanvasWidth.value * previewScale.value)}px` : undefined,
  height: previewCanvasHeight.value ? `${Math.ceil(previewCanvasHeight.value * previewScale.value)}px` : undefined
}));

const availableFontOptions = computed(() => [
  ...COMMON_FONT_OPTIONS,
  ...(PLATFORM_FONT_OPTIONS[fontPlatform] || PLATFORM_FONT_OPTIONS.desktop),
  ...customFontOptions.value
]);

const selectedCoverTextBlock = computed(() => (
  coverTextBlocks.value.find((block) => block.id === selectedCoverTextId.value)
  || null
));

const isGlobalTextMode = computed(() => selectedCoverTextId.value === GLOBAL_COVER_TEXT_ID);
const isPredictorTextMode = computed(() => selectedCoverTextId.value === PREDICTOR_TEXT_ID);
const isAllEventNotesMode = computed(() => selectedCoverTextId.value === ALL_EVENT_NOTES_ID);
const selectedEventNoteId = computed(() => (
  selectedCoverTextId.value.startsWith(EVENT_NOTE_ID_PREFIX)
    ? selectedCoverTextId.value.slice(EVENT_NOTE_ID_PREFIX.length)
    : ''
));
const selectedEventNote = computed(() => (
  selectedEventNoteId.value ? (eventNotes.value[selectedEventNoteId.value] || null) : null
));
const isEventNoteMode = computed(() => !!selectedEventNote.value);
const isAnyEventNoteMode = computed(() => isAllEventNotesMode.value || isEventNoteMode.value);
const isFixedTextMode = computed(() => isPredictorTextMode.value || isAnyEventNoteMode.value);

const getCommonCoverTextProperty = (property) => {
  const blocks = coverTextBlocks.value;
  if (blocks.length === 0) return '';
  const firstValue = blocks[0]?.[property];
  return blocks.every((block) => Object.is(block?.[property], firstValue)) ? firstValue : '';
};

const isGlobalTextPropertyMixed = (property) => {
  if (isAllEventNotesMode.value) {
    const notes = Object.values(eventNotes.value);
    if (notes.length <= 1) return false;
    const firstValue = notes[0]?.[property];
    return notes.some((note) => !Object.is(note?.[property], firstValue));
  }
  if (!isGlobalTextMode.value || coverTextBlocks.value.length <= 1) return false;
  const firstValue = coverTextBlocks.value[0]?.[property];
  return coverTextBlocks.value.some((block) => !Object.is(block?.[property], firstValue));
};

const applyGlobalTextProperty = (property, value) => {
  if (!GLOBAL_TEXT_STYLE_KEYS.includes(property)) return;
  coverTextBlocks.value.forEach((block) => {
    block[property] = value;
  });
  if (property === 'fontFamily') monthFontFamily.value = value;
  if (Object.prototype.hasOwnProperty.call(creditTextStyle.value, property)) {
    creditTextStyle.value[property] = value;
  }
};

const globalTextSettingsProxy = new Proxy({}, {
  get: (_target, property) => {
    if (typeof property !== 'string') return undefined;
    if (Object.prototype.hasOwnProperty.call(globalTextDraft.value, property)) {
      return globalTextDraft.value[property];
    }
    return getCommonCoverTextProperty(property);
  },
  set: (_target, property, value) => {
    if (typeof property !== 'string' || !GLOBAL_TEXT_STYLE_KEYS.includes(property)) return true;
    if (value === '' && property !== 'shadowColor') {
      globalTextDraft.value[property] = '';
      return true;
    }
    delete globalTextDraft.value[property];
    applyGlobalTextProperty(property, value);
    return true;
  }
});

const getCommonEventNoteProperty = (property) => {
  const notes = Object.values(eventNotes.value);
  if (notes.length === 0) return createDefaultEventNote('')[property] ?? '';
  const firstValue = notes[0]?.[property];
  return notes.every((note) => Object.is(note?.[property], firstValue)) ? firstValue : '';
};

const allEventNotesSettingsProxy = new Proxy({}, {
  get: (_target, property) => {
    if (typeof property !== 'string') return undefined;
    if (Object.prototype.hasOwnProperty.call(allEventNotesDraft.value, property)) {
      return allEventNotesDraft.value[property];
    }
    return getCommonEventNoteProperty(property);
  },
  set: (_target, property, value) => {
    if (typeof property !== 'string' || !EVENT_NOTE_STYLE_KEYS.includes(property)) return true;
    if (value === '' && property !== 'shadowColor') {
      allEventNotesDraft.value[property] = '';
      return true;
    }
    delete allEventNotesDraft.value[property];
    Object.values(eventNotes.value).forEach((note) => {
      note[property] = value;
    });
    return true;
  }
});

const editorCoverTextSettings = computed(() => {
  if (isGlobalTextMode.value) return globalTextSettingsProxy;
  if (isPredictorTextMode.value) return creditTextStyle.value;
  if (isAllEventNotesMode.value) return allEventNotesSettingsProxy;
  if (isEventNoteMode.value) return selectedEventNote.value;
  return selectedCoverTextBlock.value;
});

const editorShadowColorFallback = computed(() => (
  isAnyEventNoteMode.value
    ? String(editorCoverTextSettings.value?.color || '#334155')
    : selectedMonthColor.value
));

const selectedCustomFontOption = computed(() => (
  customFontOptions.value.find((option) => option.value === editorCoverTextSettings.value?.fontFamily)
  || null
));

const clampPercent = (value, fallback, min = 0, max = 100) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const clampNumber = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeCreditTextStyle = (value) => {
  const defaults = createDefaultCreditTextStyle();
  const source = value && typeof value === 'object' ? value : {};
  return {
    fontFamily: String(source.fontFamily || defaults.fontFamily),
    fontSize: clampNumber(source.fontSize, defaults.fontSize, 8, 96),
    color: String(source.color || defaults.color),
    shadowColor: String(source.shadowColor || ''),
    align: ['left', 'center', 'right'].includes(source.align) ? source.align : defaults.align,
    weight: Math.round(clampNumber(source.weight, defaults.weight, 100, 900) / 100) * 100,
    italic: !!source.italic,
    underline: !!source.underline,
    lineHeight: clampNumber(source.lineHeight, defaults.lineHeight, 0.8, 3),
    letterSpacing: clampNumber(source.letterSpacing, defaults.letterSpacing, -4, 20),
    opacity: clampNumber(source.opacity, defaults.opacity, 10, 100),
    shadowEnabled: source.shadowEnabled !== false
  };
};

const normalizeEventNote = (value, eventId) => {
  const defaults = createDefaultEventNote(eventId);
  const source = value && typeof value === 'object' ? value : {};
  return {
    id: defaults.id,
    name: defaults.name,
    text: String(source.text ?? ''),
    fontFamily: String(source.fontFamily || defaults.fontFamily),
    fontSize: clampNumber(source.fontSize, defaults.fontSize, 8, 96),
    color: String(source.color || defaults.color),
    shadowColor: String(source.shadowColor || ''),
    align: ['left', 'center', 'right'].includes(source.align) ? source.align : defaults.align,
    weight: Math.round(clampNumber(source.weight, defaults.weight, 100, 900) / 100) * 100,
    italic: !!source.italic,
    underline: !!source.underline,
    lineHeight: clampNumber(source.lineHeight, defaults.lineHeight, 0.8, 3),
    letterSpacing: clampNumber(source.letterSpacing, defaults.letterSpacing, -4, 20),
    opacity: clampNumber(source.opacity, defaults.opacity, 10, 100),
    shadowEnabled: source.shadowEnabled === true
  };
};

const getEventNote = (eventId) => {
  const id = normalizeId(eventId);
  return eventNotes.value[id] || createDefaultEventNote(id);
};

const ensureEventNote = (eventId) => {
  const id = normalizeId(eventId);
  if (!id || !activePredictiveEventIdSet.value.has(id)) return null;
  const sourceId = selectedSource.value?.id;
  if (!sourceId) return null;
  if (!eventNotesBySource.value[sourceId]) eventNotesBySource.value[sourceId] = {};
  if (!eventNotes.value[id]) eventNotes.value[id] = createDefaultEventNote(id);
  return eventNotes.value[id];
};

const syncEventNotesWithSources = () => {
  const nextBySource = {};
  normalizedSources.value.forEach((source) => {
    const existingNotes = eventNotesBySource.value[source.id] || {};
    const nextNotes = {};
    source.predictiveEvents.forEach((event) => {
      const id = normalizeId(event?.id);
      if (!id || nextNotes[id]) return;
      nextNotes[id] = normalizeEventNote(existingNotes[id], id);
    });
    nextBySource[source.id] = nextNotes;
  });
  eventNotesBySource.value = nextBySource;
  const activeSourceNotes = nextBySource[selectedSource.value?.id] || {};
  if (selectedEventNoteId.value && !activeSourceNotes[selectedEventNoteId.value]) {
    selectedCoverTextId.value = ALL_EVENT_NOTES_ID;
  }
};

const getCoverTextFrameStyle = (block) => ({
  left: `${clampPercent(block.x, 0, 0, Math.max(0, 100 - clampPercent(block.w, 30, 6, 100)))}%`,
  top: `${clampPercent(block.y, 0, 0, Math.max(0, 100 - clampPercent(block.h, 20, 6, 100)))}%`,
  width: `${clampPercent(block.w, 30, 6, 100)}%`,
  height: `${clampPercent(block.h, 20, 6, 100)}%`,
  zIndex: Math.round(clampNumber(block.zIndex, 2, 2, 99)),
  opacity: clampNumber(block.opacity, 100, 10, 100) / 100
});

const getCoverTextContentStyle = (block) => {
  const shadowColor = block.shadowColor || selectedMonthColor.value;
  return {
    color: block.color || '#ffffff',
    fontFamily: String(block.fontFamily || 'inherit'),
    fontSize: `${clampNumber(block.fontSize, 24, 8, 96)}px`,
    textAlign: ['left', 'center', 'right'].includes(block.align) ? block.align : 'left',
    fontWeight: Math.round(clampNumber(block.weight, 900, 100, 900) / 100) * 100,
    fontStyle: 'normal',
    textDecoration: block.underline ? 'underline' : 'none',
    lineHeight: clampNumber(block.lineHeight, 1.28, 0.8, 3),
    letterSpacing: `${clampNumber(block.letterSpacing, 0, -4, 20)}px`,
    justifyContent: block.verticalAlign === 'center'
      ? 'center'
      : (block.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'),
    padding: `${clampNumber(block.padding, 4, 0, 40)}px`,
    textShadow: block.shadowEnabled === false
      ? 'none'
      : `0 2px 0 ${rgbaFromHex(shadowColor, 0.92)}, 0 0 6px ${rgbaFromHex(shadowColor, 0.9)}, 0 0 12px rgba(255, 255, 255, 0.58)`
  };
};

const monthTextStyle = computed(() => ({
  fontFamily: String(monthFontFamily.value || 'inherit')
}));

const creditTextRenderStyle = computed(() => {
  const style = normalizeCreditTextStyle(creditTextStyle.value);
  const shadowColor = style.shadowColor || selectedMonthColor.value;
  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    textAlign: style.align,
    fontWeight: style.weight,
    fontStyle: style.italic ? 'oblique 12deg' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing}px`,
    opacity: style.opacity / 100,
    textShadow: style.shadowEnabled
      ? `0 2px 0 ${rgbaFromHex(shadowColor, 0.92)}, 0 0 6px ${rgbaFromHex(shadowColor, 0.9)}, 0 0 12px rgba(255, 255, 255, 0.58)`
      : 'none'
  };
});

const getEventNoteRenderStyle = (eventId) => {
  const style = normalizeEventNote(getEventNote(eventId), eventId);
  const shadowColor = style.shadowColor || style.color;
  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    textAlign: style.align,
    fontWeight: style.weight,
    fontStyle: style.italic ? 'oblique 12deg' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing}px`,
    opacity: style.opacity / 100,
    textShadow: style.shadowEnabled
      ? `0 1px 2px ${rgbaFromHex(shadowColor, 0.72)}, 0 0 5px ${rgbaFromHex(shadowColor, 0.34)}`
      : 'none'
  };
};

const coverStyle = computed(() => {
  const base = 'linear-gradient(90deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.2))';
  const fallback = 'linear-gradient(135deg, #fbc2d7, #b9f3e9 48%, #fff2c6)';
  return { backgroundImage: `${base}, ${fallback}` };
});

const coverImageStyle = computed(() => ({
  backgroundImage: coverBgUrl.value ? `url(${JSON.stringify(coverBgUrl.value)})` : 'none',
  opacity: clampNumber(coverBgOpacity.value, 100, 0, 100) / 100
}));

const setMonthColor = (name) => {
  monthColorName.value = name;
};

const setBackgroundColor = (name) => {
  backgroundColorName.value = name;
};

const addCoverTextBlock = () => {
  const id = `text-${Date.now()}`;
  coverTextBlocks.value.push({
    id,
    name: `文本${coverTextBlocks.value.length + 1}`,
    text: '新文本',
    x: 12,
    y: 18,
    w: 34,
    h: 18,
    fontSize: 22,
    color: '#ffffff',
    shadowColor: '',
    align: 'left',
    weight: 900,
    fontFamily: 'inherit',
    italic: false,
    underline: false,
    lineHeight: 1.28,
    letterSpacing: 0,
    verticalAlign: 'top',
    padding: 4,
    backgroundEnabled: false,
    backgroundColor: '#ffffff',
    backgroundOpacity: 32,
    borderEnabled: false,
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 6,
    opacity: 100,
    shadowEnabled: true,
    zIndex: Math.min(99, Math.max(2, ...coverTextBlocks.value.map((block) => Number(block.zIndex) || 2)) + 1)
  });
  selectedCoverTextId.value = id;
};

const duplicateSelectedCoverTextBlock = () => {
  const source = selectedCoverTextBlock.value;
  if (!source) return;
  const id = `text-${Date.now()}`;
  const w = clampPercent(source.w, 30, 6, 100);
  const h = clampPercent(source.h, 20, 6, 100);
  const clone = {
    ...source,
    id,
    name: `${source.name || '文本'}副本`,
    text: String(source.text ?? ''),
    x: clampPercent(Number(source.x || 0) + 3, 3, 0, Math.max(0, 100 - w)),
    y: clampPercent(Number(source.y || 0) + 3, 3, 0, Math.max(0, 100 - h)),
    zIndex: Math.min(99, Math.max(2, ...coverTextBlocks.value.map((block) => Number(block.zIndex) || 2)) + 1)
  };
  coverTextBlocks.value.push(clone);
  selectedCoverTextId.value = id;
  syncCoverTextElements();
};

const moveSelectedCoverTextLayer = (direction) => {
  const block = selectedCoverTextBlock.value;
  if (!block) return;
  const originalOrder = new Map(coverTextBlocks.value.map((item, index) => [item.id, index]));
  const ordered = [...coverTextBlocks.value].sort((a, b) => (
    (Number(a.zIndex) || 2) - (Number(b.zIndex) || 2)
    || (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0)
  ));
  const otherBlocks = ordered.filter((item) => item.id !== block.id);
  const reordered = direction > 0
    ? [...otherBlocks, block]
    : [block, ...otherBlocks];
  reordered.forEach((item, index) => {
    item.zIndex = index + 2;
  });
  saveCoverTextSettings();
};

const removeSelectedCoverTextBlock = () => {
  if (coverTextBlocks.value.length <= 1) return;
  const index = coverTextBlocks.value.findIndex((block) => block.id === selectedCoverTextId.value);
  if (index < 0) return;
  coverTextBlocks.value.splice(index, 1);
  selectedCoverTextId.value = coverTextBlocks.value[Math.max(0, index - 1)]?.id || coverTextBlocks.value[0]?.id || '';
};

const resetEventNoteStyles = () => {
  if (isAllEventNotesMode.value) {
    Object.entries(eventNotes.value).forEach(([id, note]) => {
      eventNotes.value[id] = {
        ...createDefaultEventNote(id),
        text: String(note?.text ?? '')
      };
    });
    allEventNotesDraft.value = {};
  } else if (isEventNoteMode.value) {
    const id = selectedEventNoteId.value;
    eventNotes.value[id] = {
      ...createDefaultEventNote(id),
      text: String(eventNotes.value[id]?.text ?? '')
    };
  }
  syncEventNoteElements();
  saveCoverTextSettings();
};

const clearEventNoteText = () => {
  if (isAllEventNotesMode.value) {
    Object.values(eventNotes.value).forEach((note) => {
      note.text = '';
    });
  } else if (isEventNoteMode.value) {
    eventNotes.value[selectedEventNoteId.value].text = '';
  }
  syncEventNoteElements();
  saveCoverTextSettings();
};

const resetSelectedCoverTextBlock = () => {
  if (isPredictorTextMode.value) {
    creditManuallyEdited.value = false;
    creditText.value = defaultCreditText.value;
    creditTextStyle.value = createDefaultCreditTextStyle();
    syncCreditElement();
    saveCoverTextSettings();
    return;
  }
  if (isAllEventNotesMode.value) {
    Object.keys(eventNotes.value).forEach((id) => {
      eventNotes.value[id] = createDefaultEventNote(id);
    });
    allEventNotesDraft.value = {};
    syncEventNoteElements();
    saveCoverTextSettings();
    return;
  }
  if (isEventNoteMode.value) {
    const id = selectedEventNoteId.value;
    eventNotes.value[id] = createDefaultEventNote(id);
    syncEventNoteElements();
    saveCoverTextSettings();
    return;
  }
  const index = coverTextBlocks.value.findIndex((block) => block.id === selectedCoverTextId.value);
  if (index < 0) return;
  const current = coverTextBlocks.value[index];
  const builtInDefault = createDefaultCoverTextBlocks().find((block) => block.id === current.id);
  const replacement = builtInDefault || {
    ...createDefaultCoverTextBlocks()[0],
    id: current.id,
    name: current.name || `文本${index + 1}`,
    text: String(current.text ?? '新文本'),
    x: 12,
    y: 18,
    w: 34,
    h: 18,
    fontSize: 22,
    align: 'left',
    zIndex: Number(current.zIndex) || 2
  };
  coverTextBlocks.value.splice(index, 1, replacement);
  syncCoverTextElements();
  saveCoverTextSettings();
};

const normalizeCoverTextBlock = (block, fallback) => ({
  ...fallback,
  ...(block || {}),
  id: String(block?.id || fallback.id || `text-${Date.now()}`),
  name: String(block?.name || fallback.name || '文本'),
  text: String(block?.text ?? fallback.text ?? ''),
  x: clampPercent(block?.x, fallback.x ?? 0),
  y: clampPercent(block?.y, fallback.y ?? 0),
  w: clampPercent(block?.w, fallback.w ?? 30, 6, 100),
  h: clampPercent(block?.h, fallback.h ?? 20, 6, 100),
  fontSize: clampNumber(block?.fontSize, fallback.fontSize || 24, 8, 96),
  color: String(block?.color || fallback.color || '#ffffff'),
  shadowColor: String(block?.shadowColor || ''),
  align: ['left', 'center', 'right'].includes(block?.align) ? block.align : (fallback.align || 'left'),
  weight: Math.round(clampNumber(block?.weight, fallback.weight || 900, 100, 900) / 100) * 100,
  fontFamily: String(block?.fontFamily || fallback.fontFamily || 'inherit'),
  italic: !!block?.italic,
  underline: !!block?.underline,
  lineHeight: clampNumber(block?.lineHeight, fallback.lineHeight || 1.28, 0.8, 3),
  letterSpacing: clampNumber(block?.letterSpacing, fallback.letterSpacing || 0, -4, 20),
  verticalAlign: ['top', 'center', 'bottom'].includes(block?.verticalAlign)
    ? block.verticalAlign
    : (fallback.verticalAlign || 'top'),
  padding: clampNumber(block?.padding, fallback.padding || 4, 0, 40),
  backgroundEnabled: !!block?.backgroundEnabled,
  backgroundColor: String(block?.backgroundColor || fallback.backgroundColor || '#ffffff'),
  backgroundOpacity: clampNumber(block?.backgroundOpacity, fallback.backgroundOpacity || 32, 0, 100),
  borderEnabled: !!block?.borderEnabled,
  borderColor: String(block?.borderColor || fallback.borderColor || '#ffffff'),
  borderWidth: clampNumber(block?.borderWidth, fallback.borderWidth || 1, 0, 12),
  borderRadius: clampNumber(block?.borderRadius, fallback.borderRadius || 6, 0, 80),
  opacity: clampNumber(block?.opacity, fallback.opacity || 100, 10, 100),
  shadowEnabled: block?.shadowEnabled !== false,
  zIndex: Math.round(clampNumber(block?.zIndex, fallback.zIndex || 2, 2, 99))
});

const restoreDefaultCoverTextBlocks = () => {
  coverTextBlocks.value = createDefaultCoverTextBlocks();
  selectedCoverTextId.value = GLOBAL_COVER_TEXT_ID;
  globalTextDraft.value = {};
  monthFontFamily.value = 'inherit';
  creditTextStyle.value = createDefaultCreditTextStyle();
  eventNotesBySource.value = {};
  allEventNotesDraft.value = {};
  syncEventNotesWithSources();
  monthColorName.value = characterColorOptions.value[0]?.name || '';
  backgroundColorName.value = characterColorOptions.value[1]?.name || '';
  customMonthColor.value = DEFAULT_CUSTOM_MONTH_COLOR;
  customBackgroundColor.value = DEFAULT_CUSTOM_BACKGROUND_COLOR;
  coverBgOpacity.value = 100;
  syncCoverTextElements();
  syncEventNoteElements();
};

const loadCoverTextSettings = () => {
  try {
    const raw = localStorage.getItem(COVER_TEXT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const defaults = createDefaultCoverTextBlocks();
    const loadedBlocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
    const normalized = loadedBlocks
      .map((block, index) => normalizeCoverTextBlock(block, defaults[index] || defaults[0]))
      .filter((block) => block.id);
    if (normalized.length > 0) {
      coverTextBlocks.value = normalized;
      selectedCoverTextId.value = GLOBAL_COVER_TEXT_ID;
      globalTextDraft.value = {};
      syncCoverTextElements();
    }
    if (typeof parsed?.creditText === 'string') {
      creditText.value = parsed.creditText;
      creditManuallyEdited.value = typeof parsed?.creditManuallyEdited === 'boolean'
        ? parsed.creditManuallyEdited
        : !isDefaultCreditText(parsed.creditText);
      syncCreditDefault();
      syncCreditElement();
    }
    if (typeof parsed?.monthColorName === 'string') monthColorName.value = parsed.monthColorName;
    if (typeof parsed?.backgroundColorName === 'string') backgroundColorName.value = parsed.backgroundColorName;
    if (typeof parsed?.monthFontFamily === 'string') monthFontFamily.value = parsed.monthFontFamily || 'inherit';
    if (parsed?.creditTextStyle && typeof parsed.creditTextStyle === 'object') {
      creditTextStyle.value = normalizeCreditTextStyle(parsed.creditTextStyle);
    }
    if (parsed?.eventNotesBySource && typeof parsed.eventNotesBySource === 'object') {
      eventNotesBySource.value = Object.fromEntries(
        Object.entries(parsed.eventNotesBySource)
          .map(([sourceId, notes]) => [normalizeId(sourceId), notes && typeof notes === 'object' ? notes : {}])
          .filter(([sourceId]) => sourceId)
      );
      syncEventNotesWithSources();
      syncEventNoteElements();
    } else if (parsed?.eventNotes && typeof parsed.eventNotes === 'object' && selectedSource.value?.id) {
      eventNotesBySource.value = { [selectedSource.value.id]: parsed.eventNotes };
      syncEventNotesWithSources();
      syncEventNoteElements();
    }
    if (typeof parsed?.customMonthColor === 'string' && hexToRgb(parsed.customMonthColor)) {
      customMonthColor.value = parsed.customMonthColor;
    }
    if (typeof parsed?.customBackgroundColor === 'string' && hexToRgb(parsed.customBackgroundColor)) {
      customBackgroundColor.value = parsed.customBackgroundColor;
    }
  } catch (error) {
    console.warn('[special-predict] failed to load cover text settings', error);
  } finally {
    coverTextSettingsReady = true;
  }
};

const saveCoverTextSettings = () => {
  if (!coverTextSettingsReady) return;
  try {
    localStorage.setItem(COVER_TEXT_STORAGE_KEY, JSON.stringify({
      selectedId: selectedCoverTextId.value,
      blocks: coverTextBlocks.value,
      creditText: creditText.value,
      creditManuallyEdited: creditManuallyEdited.value,
      monthColorName: monthColorName.value,
      backgroundColorName: backgroundColorName.value,
      customMonthColor: customMonthColor.value,
      customBackgroundColor: customBackgroundColor.value,
      monthFontFamily: monthFontFamily.value,
      creditTextStyle: creditTextStyle.value,
      eventNotesBySource: eventNotesBySource.value
    }));
  } catch (error) {
    console.warn('[special-predict] failed to save cover text settings', error);
  }
};

const applyCoverBgAsset = (assetId, fileName = '') => {
  if (coverBgUrl.value) URL.revokeObjectURL(coverBgUrl.value);
  const file = assetId ? coverBgAssetMap.get(assetId) : null;
  coverBgAssetId.value = file ? assetId : '';
  coverBgUrl.value = file ? URL.createObjectURL(file) : '';
  coverBgFileName.value = file ? (fileName || file.name || '') : '';
};

const clearCoverBg = () => {
  applyCoverBgAsset('');
  coverBgOpacity.value = 100;
};

const normalizeCoverBgOpacity = () => {
  coverBgOpacity.value = Math.round(clampNumber(coverBgOpacity.value, 100, 0, 100));
};

const onCoverBgUpload = (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const assetId = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  coverBgAssetMap.set(assetId, file);
  applyCoverBgAsset(assetId, file.name);
  coverBgOpacity.value = 100;
  event.target.value = '';
};

const cloneEditorHistoryData = (value) => JSON.parse(JSON.stringify(value));

const captureEditorHistoryState = () => cloneEditorHistoryData({
  blocks: coverTextBlocks.value,
  creditText: creditText.value,
  creditManuallyEdited: creditManuallyEdited.value,
  monthFontFamily: monthFontFamily.value,
  creditTextStyle: creditTextStyle.value,
  eventNotesBySource: eventNotesBySource.value,
  monthColorName: monthColorName.value,
  backgroundColorName: backgroundColorName.value,
  customMonthColor: customMonthColor.value,
  customBackgroundColor: customBackgroundColor.value,
  coverBgAssetId: coverBgAssetId.value,
  coverBgFileName: coverBgFileName.value,
  coverBgOpacity: coverBgOpacity.value
});

const resetEditorHistory = () => {
  if (editorHistoryTimer) {
    window.clearTimeout(editorHistoryTimer);
    editorHistoryTimer = null;
  }
  editorUndoStack.value = [];
  editorRedoStack.value = [];
  editorHistoryPending.value = false;
  editorCompositionActive = false;
  lastEditorHistoryState = captureEditorHistoryState();
  editorHistoryReady = true;
};

const pushEditorHistoryTransition = (previousState, nextState) => {
  if (!previousState || JSON.stringify(nextState) === JSON.stringify(previousState)) {
    lastEditorHistoryState = nextState;
    return false;
  }
  editorUndoStack.value.push(previousState);
  if (editorUndoStack.value.length > EDITOR_HISTORY_LIMIT) editorUndoStack.value.shift();
  editorRedoStack.value = [];
  lastEditorHistoryState = nextState;
  return true;
};

const commitPendingEditorHistory = () => {
  if (!editorHistoryReady || editorHistoryApplying || editorCompositionActive) return;
  if (editorHistoryTimer) {
    window.clearTimeout(editorHistoryTimer);
    editorHistoryTimer = null;
  }
  editorHistoryPending.value = false;
  const nextState = captureEditorHistoryState();
  if (!lastEditorHistoryState) {
    lastEditorHistoryState = nextState;
    return;
  }
  pushEditorHistoryTransition(lastEditorHistoryState, nextState);
};

const scheduleEditorHistoryCapture = () => {
  if (!editorHistoryReady || editorHistoryApplying) return;
  const nextState = captureEditorHistoryState();
  const hasChange = !!lastEditorHistoryState
    && JSON.stringify(nextState) !== JSON.stringify(lastEditorHistoryState);
  if (editorHistoryTimer) window.clearTimeout(editorHistoryTimer);
  editorHistoryTimer = null;
  editorHistoryPending.value = hasChange && !editorCompositionActive;
  if (!hasChange || editorCompositionActive) return;
  editorHistoryTimer = window.setTimeout(commitPendingEditorHistory, EDITOR_HISTORY_CAPTURE_DELAY);
};

const isEditorHistoryInputTarget = (target) => (
  target instanceof Element
  && target.matches('input:not([type="file"]), textarea, select, [contenteditable="true"]')
);

const onEditorCompositionStart = (event) => {
  if (!isEditorHistoryInputTarget(event?.target)) return;
  commitPendingEditorHistory();
  editorCompositionActive = true;
  editorHistoryPending.value = false;
};

const onEditorCompositionEnd = (event) => {
  if (!isEditorHistoryInputTarget(event?.target)) return;
  editorCompositionActive = false;
  nextTick(scheduleEditorHistoryCapture);
};

const applyEditorHistoryState = async (state) => {
  if (!state) return;
  editorHistoryApplying = true;
  try {
    coverTextBlocks.value = cloneEditorHistoryData(state.blocks || []);
    creditText.value = String(state.creditText ?? '');
    creditManuallyEdited.value = !!state.creditManuallyEdited;
    monthFontFamily.value = String(state.monthFontFamily || 'inherit');
    creditTextStyle.value = normalizeCreditTextStyle(state.creditTextStyle);
    eventNotesBySource.value = cloneEditorHistoryData(state.eventNotesBySource || {});
    monthColorName.value = String(state.monthColorName || '');
    backgroundColorName.value = String(state.backgroundColorName || '');
    customMonthColor.value = String(state.customMonthColor || DEFAULT_CUSTOM_MONTH_COLOR);
    customBackgroundColor.value = String(state.customBackgroundColor || DEFAULT_CUSTOM_BACKGROUND_COLOR);
    coverBgOpacity.value = Math.round(clampNumber(state.coverBgOpacity, 100, 0, 100));
    applyCoverBgAsset(String(state.coverBgAssetId || ''), String(state.coverBgFileName || ''));
    syncEventNotesWithSources();
    await Promise.all([
      syncCoverTextElements(),
      syncCreditElement(),
      syncEventNoteElements()
    ]);
    updatePreviewScale();
    saveCoverTextSettings();
    await nextTick();
    lastEditorHistoryState = captureEditorHistoryState();
  } finally {
    editorHistoryApplying = false;
  }
};

const canUndoEditor = computed(() => editorHistoryPending.value || editorUndoStack.value.length > 0);
const canRedoEditor = computed(() => !editorHistoryPending.value && editorRedoStack.value.length > 0);

const undoEditorChange = async () => {
  if (editorHistoryApplying) return;
  commitPendingEditorHistory();
  const target = editorUndoStack.value.pop();
  if (!target) return;
  editorRedoStack.value.push(captureEditorHistoryState());
  await applyEditorHistoryState(target);
};

const redoEditorChange = async () => {
  if (editorHistoryApplying) return;
  commitPendingEditorHistory();
  const target = editorRedoStack.value.pop();
  if (!target) return;
  editorUndoStack.value.push(captureEditorHistoryState());
  await applyEditorHistoryState(target);
};

const openFontDatabase = () => {
  if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB unavailable'));
  if (fontDatabasePromise) return fontDatabasePromise;
  fontDatabasePromise = new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(FONT_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FONT_DATABASE_STORE)) {
        database.createObjectStore(FONT_DATABASE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open font database'));
  });
  return fontDatabasePromise;
};

const readStoredFonts = async () => {
  const database = await openFontDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(FONT_DATABASE_STORE, 'readonly')
      .objectStore(FONT_DATABASE_STORE)
      .getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error || new Error('Failed to read stored fonts'));
  });
};

const writeStoredFont = async (record) => {
  const database = await openFontDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FONT_DATABASE_STORE, 'readwrite');
    transaction.objectStore(FONT_DATABASE_STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to store font'));
    transaction.onabort = () => reject(transaction.error || new Error('Font storage aborted'));
  });
};

const removeStoredFont = async (id) => {
  const database = await openFontDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FONT_DATABASE_STORE, 'readwrite');
    transaction.objectStore(FONT_DATABASE_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to delete font'));
    transaction.onabort = () => reject(transaction.error || new Error('Font deletion aborted'));
  });
};

const registerStoredFont = async (record) => {
  if (!record?.id || !record?.family || !record?.data || typeof FontFace === 'undefined' || !document?.fonts) return null;
  const source = typeof record.data.arrayBuffer === 'function'
    ? await record.data.arrayBuffer()
    : record.data;
  const fontFace = new FontFace(record.family, source);
  await fontFace.load();
  document.fonts.add(fontFace);
  customFontFaceMap.set(record.id, fontFace);
  return {
    id: record.id,
    label: String(record.label || `上传：${record.fileName || '字体'}`),
    value: `"${record.family}", ${DEFAULT_TEXT_FONT_STACK}`,
    isCustom: true
  };
};

const setLocalFontStatus = (message, autoClear = true) => {
  if (localFontStatusTimer) {
    window.clearTimeout(localFontStatusTimer);
    localFontStatusTimer = null;
  }
  localFontStatus.value = message;
  if (message && autoClear) {
    localFontStatusTimer = window.setTimeout(() => {
      localFontStatus.value = '';
      localFontStatusTimer = null;
    }, 15000);
  }
};

const loadPersistedFonts = async () => {
  try {
    const records = await readStoredFonts();
    const loaded = (await Promise.all(records.map(async (record) => {
      try {
        return await registerStoredFont(record);
      } catch (error) {
        console.warn('[special-predict] failed to restore stored font', record?.fileName || record?.id, error);
        return null;
      }
    }))).filter(Boolean);
    customFontOptions.value = loaded;
    if (loaded.length > 0) setLocalFontStatus(`已恢复 ${loaded.length} 个上传字体`);
    const validValues = new Set(availableFontOptions.value.map((option) => option.value));
    coverTextBlocks.value.forEach((block) => {
      if (!validValues.has(block.fontFamily)) block.fontFamily = 'inherit';
    });
    Object.values(eventNotesBySource.value).forEach((notes) => {
      Object.values(notes).forEach((note) => {
        if (!validValues.has(note.fontFamily)) note.fontFamily = 'inherit';
      });
    });
    if (!validValues.has(monthFontFamily.value)) monthFontFamily.value = 'inherit';
    if (!validValues.has(creditTextStyle.value.fontFamily)) creditTextStyle.value.fontFamily = 'inherit';
  } catch (error) {
    console.warn('[special-predict] failed to load stored fonts', error);
  }
};

const onLocalFontUpload = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  setLocalFontStatus('正在载入字体...', false);
  try {
    if (typeof FontFace === 'undefined' || !document?.fonts) {
      throw new Error('FontFace API unavailable');
    }
    const id = `font-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const family = `PjskLocalFont_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const persistentData = await file.arrayBuffer();
    const data = persistentData.slice(0);
    const fontFace = new FontFace(family, data);
    await fontFace.load();
    document.fonts.add(fontFace);
    const value = `"${family}", ${DEFAULT_TEXT_FONT_STACK}`;
    const label = `上传：${file.name.replace(/\.[^.]+$/, '')}`;
    const option = { id, label, value, isCustom: true };
    customFontFaceMap.set(id, fontFace);
    customFontOptions.value.push(option);
    if (editorCoverTextSettings.value) editorCoverTextSettings.value.fontFamily = value;
    let persisted = true;
    try {
      await writeStoredFont({
        id,
        family,
        label,
        fileName: file.name,
        mimeType: file.type,
        data: persistentData
      });
      await globalThis.navigator?.storage?.persist?.();
    } catch (storageError) {
      persisted = false;
      console.warn('[special-predict] font loaded but could not be persisted', storageError);
    }
    setLocalFontStatus(persisted
      ? `已导入并保存 ${file.name}`
      : `已导入 ${file.name}，但当前浏览器无法持久保存`);
  } catch (error) {
    console.warn('[special-predict] local font load failed', error);
    setLocalFontStatus('字体载入失败，请尝试 TTF、OTF、WOFF 或 WOFF2。');
  } finally {
    event.target.value = '';
  }
};

const deleteSelectedCustomFont = async () => {
  const option = selectedCustomFontOption.value;
  if (!option) return;
  try {
    await removeStoredFont(option.id);
  } catch (error) {
    console.warn('[special-predict] failed to delete stored font', error);
  }
  const fontFace = customFontFaceMap.get(option.id);
  if (fontFace && document?.fonts?.delete) document.fonts.delete(fontFace);
  customFontFaceMap.delete(option.id);
  coverTextBlocks.value.forEach((block) => {
    if (block.fontFamily === option.value) block.fontFamily = 'inherit';
  });
  Object.values(eventNotesBySource.value).forEach((notes) => {
    Object.values(notes).forEach((note) => {
      if (note.fontFamily === option.value) note.fontFamily = 'inherit';
    });
  });
  if (monthFontFamily.value === option.value) monthFontFamily.value = 'inherit';
  if (creditTextStyle.value.fontFamily === option.value) creditTextStyle.value.fontFamily = 'inherit';
  customFontOptions.value = customFontOptions.value.filter((item) => item.id !== option.id);
  setLocalFontStatus(`已删除 ${option.label.replace(/^上传：/, '')}`);
};

const selectCoverTextBlock = (block) => {
  const id = String(block?.id || '');
  if (id) selectedCoverTextId.value = id;
};

const selectGlobalTextMode = () => {
  selectedCoverTextId.value = GLOBAL_COVER_TEXT_ID;
  globalTextDraft.value = {};
};

const selectPredictorText = () => {
  if (isExporting.value) return;
  selectedCoverTextId.value = PREDICTOR_TEXT_ID;
};

const selectEventNote = (eventId) => {
  if (isExporting.value) return;
  const note = ensureEventNote(eventId);
  if (note) selectedCoverTextId.value = `${EVENT_NOTE_ID_PREFIX}${note.id}`;
};

const onCanvasTextSelectionPointerDown = (event) => {
  if (isExporting.value) return;
  const target = event?.target;
  if (target instanceof Element && target.closest('.special-cover-text-frame, .special-credit-box, .special-event-note')) return;
  selectGlobalTextMode();
};

const endCoverTextTransform = (event) => {
  if (!activeTextTransform) return;
  if (event && event.pointerId !== activeTextTransform.pointerId) return;
  activeTextTransform = null;
  activeTextTransformMode.value = '';
  window.removeEventListener('pointermove', onCoverTextTransformMove);
  window.removeEventListener('pointerup', endCoverTextTransform);
  window.removeEventListener('pointercancel', endCoverTextTransform);
  saveCoverTextSettings();
};

const onCoverTextTransformMove = (event) => {
  const state = activeTextTransform;
  if (!state || event.pointerId !== state.pointerId) return;
  const block = coverTextBlocks.value.find((item) => item.id === state.blockId);
  if (!block) {
    endCoverTextTransform(event);
    return;
  }
  event.preventDefault();
  const dx = ((event.clientX - state.startClientX) / state.panelWidth) * 100;
  const dy = ((event.clientY - state.startClientY) / state.panelHeight) * 100;
  if (state.mode === 'move') {
    block.x = clampPercent(state.startX + dx, state.startX, 0, Math.max(0, 100 - state.startW));
    block.y = clampPercent(state.startY + dy, state.startY, 0, Math.max(0, 100 - state.startH));
  } else {
    block.w = clampPercent(state.startW + dx, state.startW, 6, Math.max(6, 100 - state.startX));
    block.h = clampPercent(state.startH + dy, state.startH, 6, Math.max(6, 100 - state.startY));
  }
};

const startCoverTextTransform = (block, mode, event) => {
  const panel = coverPanelRef.value;
  if (!panel || !block || isExporting.value) return;
  const rect = panel.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  event.preventDefault();
  event.stopPropagation();
  selectCoverTextBlock(block);
  endCoverTextTransform();
  const startW = clampPercent(block.w, 30, 6, 100);
  const startH = clampPercent(block.h, 20, 6, 100);
  activeTextTransform = {
    blockId: block.id,
    mode,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    panelWidth: rect.width,
    panelHeight: rect.height,
    startX: clampPercent(block.x, 0, 0, Math.max(0, 100 - startW)),
    startY: clampPercent(block.y, 0, 0, Math.max(0, 100 - startH)),
    startW,
    startH
  };
  activeTextTransformMode.value = mode;
  window.addEventListener('pointermove', onCoverTextTransformMove, { passive: false });
  window.addEventListener('pointerup', endCoverTextTransform);
  window.addEventListener('pointercancel', endCoverTextTransform);
};

const onGlobalTextNudgeKeydown = (event) => {
  if (!isUnlocked.value || !selectedCoverTextBlock.value || isExporting.value) return;
  const target = event.target;
  if (target instanceof HTMLElement && (
    target.isContentEditable
    || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
  )) return;
  const deltaByKey = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  };
  const direction = deltaByKey[event.key];
  if (!direction) return;
  event.preventDefault();
  const step = event.shiftKey ? 1 : 0.25;
  const block = selectedCoverTextBlock.value;
  const w = clampPercent(block.w, 30, 6, 100);
  const h = clampPercent(block.h, 20, 6, 100);
  block.x = clampPercent(Number(block.x || 0) + direction[0] * step, 0, 0, Math.max(0, 100 - w));
  block.y = clampPercent(Number(block.y || 0) + direction[1] * step, 0, 0, Math.max(0, 100 - h));
};

const onGlobalEditorKeydown = (event) => {
  const pageElement = canvasRef.value?.closest('.special-predict-page');
  if (!isUnlocked.value || !pageElement?.isConnected || isExporting.value) return;
  const modifierPressed = event.ctrlKey || event.metaKey;
  const key = String(event.key || '').toLowerCase();
  if (modifierPressed && !event.altKey && (key === 'z' || key === 'y')) {
    event.preventDefault();
    event.stopPropagation();
    if (key === 'y' || (key === 'z' && event.shiftKey)) {
      void redoEditorChange();
    } else {
      void undoEditorChange();
    }
    return;
  }
  onGlobalTextNudgeKeydown(event);
};

const onCoverTextInput = (block, event) => {
  block.text = event?.currentTarget?.innerText ?? '';
  saveCoverTextSettings();
};

const renderCoverTextLines = (element, text) => {
  if (!element) return;
  const fragment = document.createDocumentFragment();
  String(text ?? '').split('\n').forEach((line) => {
    const lineElement = document.createElement('span');
    lineElement.className = 'special-cover-text-line';
    lineElement.textContent = line;
    fragment.appendChild(lineElement);
  });
  element.replaceChildren(fragment);
};

const onCoverTextBlur = (block, event) => {
  const element = event?.currentTarget;
  block.text = element?.innerText ?? block.text ?? '';
  renderCoverTextLines(element, block.text);
  saveCoverTextSettings();
};

const setCoverTextElement = (block, element) => {
  const id = String(block?.id || '');
  if (!id) return;
  if (!element) {
    coverTextElementMap.delete(id);
    return;
  }
  coverTextElementMap.set(id, element);
  const text = String(block?.text ?? '');
  if (element.innerText !== text || !element.querySelector('.special-cover-text-line')) {
    renderCoverTextLines(element, text);
  }
};

const syncCoverTextElements = async () => {
  await nextTick();
  coverTextBlocks.value.forEach((block) => {
    const element = coverTextElementMap.get(block.id);
    if (!element) return;
    const text = String(block.text ?? '');
    if (element.innerText !== text) renderCoverTextLines(element, text);
  });
};

const setCreditElement = (element) => {
  creditElement = element || null;
  if (!creditElement) return;
  const text = String(creditText.value ?? '');
  if (creditElement.innerText !== text) creditElement.innerText = text;
};

const syncCreditElement = async () => {
  await nextTick();
  if (!creditElement) return;
  const text = String(creditText.value ?? '');
  if (creditElement.innerText !== text) creditElement.innerText = text;
};

const setEventNoteElement = (eventId, element) => {
  const id = normalizeId(eventId);
  if (!id) return;
  if (!element) {
    eventNoteElementMap.delete(id);
    return;
  }
  eventNoteElementMap.set(id, element);
  const text = String(getEventNote(id).text ?? '');
  if (element.innerText !== text) element.innerText = text;
};

const syncEventNoteElements = async () => {
  await nextTick();
  Object.entries(eventNotes.value).forEach(([id, note]) => {
    const element = eventNoteElementMap.get(id);
    if (!element) return;
    const text = String(note?.text ?? '');
    if (element.innerText !== text) element.innerText = text;
  });
};

const onEventNoteInput = (eventId, event) => {
  const note = ensureEventNote(eventId);
  if (!note) return;
  note.text = event?.currentTarget?.innerText ?? '';
  saveCoverTextSettings();
};

const onEventNoteBlur = (eventId, event) => {
  const note = ensureEventNote(eventId);
  if (!note) return;
  note.text = event?.currentTarget?.innerText ?? note.text ?? '';
  saveCoverTextSettings();
};

const isDefaultCreditText = (value) => /^预测：\S+$/u.test(String(value || '').trim());

const onCreditInput = (event) => {
  creditManuallyEdited.value = true;
  creditText.value = event?.currentTarget?.innerText ?? '';
  saveCoverTextSettings();
};

const syncCreditDefault = () => {
  const nextDefault = defaultCreditText.value;
  if (!creditManuallyEdited.value && (!creditText.value || creditText.value === lastCreditDefault || isDefaultCreditText(creditText.value))) {
    creditText.value = nextDefault;
    syncCreditElement();
  }
  lastCreditDefault = nextDefault;
};

const updatePreviewScale = async () => {
  await nextTick();
  const target = canvasRef.value;
  const wrap = canvasWrapRef.value;
  if (!target || !wrap) return;
  const originalWidth = Math.ceil(target.offsetWidth || target.scrollWidth || target.getBoundingClientRect().width);
  const originalHeight = Math.ceil(target.offsetHeight || target.scrollHeight || target.getBoundingClientRect().height);
  if (!originalWidth || !originalHeight) return;
  const availableWidth = Math.max(1, Math.floor(wrap.clientWidth));
  previewCanvasWidth.value = originalWidth;
  previewCanvasHeight.value = originalHeight;
  previewScale.value = Math.min(1, availableWidth / originalWidth);
};

const isBfesCard = (card) => {
  const type = String(card?.Type || '').trim().toLowerCase();
  const skill = String(card?.Skill || '').trim().toLowerCase();
  return type === 'bfes' || skill === 'bfes_up';
};

const isFesCard = (card) => {
  const type = String(card?.Type || '').trim().toLowerCase();
  return type === 'bfes' || type === 'cfes';
};

const parseYmd = (value) => {
  const match = String(value || '').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
};

const formatDate = (value) => {
  const parsed = parseYmd(value);
  if (!parsed) return String(value || '').trim();
  return `${parsed.year}/${parsed.month}/${parsed.day}`;
};

const getMonthInfoFromDate = (value) => {
  const parsed = parseYmd(value);
  if (!parsed) return null;
  return {
    key: `${parsed.year}-${String(parsed.month).padStart(2, '0')}`,
    label: `${parsed.month}月`
  };
};

const getEventType = (event) => String(event?.event_type || event?.source_event_type || '').trim();
const getEventUnit = (event) => normalizeUnit(event?.unit || event?.source_unit);
const hasValidEventTitle = (value) => String(value || '').trim().length > 0;
const isOfficialRevealedEvent = (event) => !!event && hasValidEventTitle(event.event_title);
const getSourceEventTypeText = (event) => (
  Object.prototype.hasOwnProperty.call(event || {}, 'source_event_type')
    ? String(event?.source_event_type || '').trim()
    : String(event?.event_type || '').trim()
);
const isTestEvent = (event) => {
  const type = getSourceEventTypeText(event).toLowerCase();
  return type === '测试' || type === 'test' || type.includes('测试');
};
const isWorldLinkFinalEvent = (event) => {
  const type = getSourceEventTypeText(event).toLowerCase().replace(/\s+/g, '');
  return type.includes('终章') && (type.includes('wl') || type.includes('worldlink'));
};
const isC6FixedRosterEvent = (event) => (
  normalizeId(event?.id).toLowerCase() === 'c6'
  && getSourceEventTypeText(event) === '联动'
  && Number(event?.type_series_id) === 6
);
const isPredictDisabledEvent = (event) => isTestEvent(event) || isWorldLinkFinalEvent(event);
const isPredictableBaseEvent = (event) => (
  (Number.isFinite(Number(event?.id)) || isC6FixedRosterEvent(event))
  && !isPredictDisabledEvent(event)
  && !isOfficialRevealedEvent(event)
);

const resolveUnitFromCards = (cards) => {
  const normalCards = (Array.isArray(cards) ? cards : []).filter((card) => !isFesCard(card));
  const firstOc = normalCards.find((card) => {
    const base = getBaseName(card?.Name);
    return base && !vsNameSet.value.has(base);
  });
  return normalizeUnit(firstOc?.Affiliation || normalCards[0]?.Affiliation);
};

const buildSeriesLabel = (event) => {
  const sid = String(event?.type_series_id || '').trim();
  const eventType = getEventType(event);
  if (!sid) return eventType === 'World Link' ? getWlPartLabel(event) : '';
  const banner = getBaseName(event?.banner);
  const bannerLabel = banner || '';
  if (eventType === '箱活') return `${bannerLabel}${sid}箱`;
  if (eventType === '混活') return `${bannerLabel}${sid}混`;
  if (eventType === 'World Link') return `WL${sid}${getWlPartLabel(event)}`;
  return sid;
};

const getWlPartLabel = (event) => {
  const currentId = Number(event?.id);
  if (!Number.isFinite(currentId)) return '';
  const eventType = getEventType(event);
  if (eventType !== 'World Link') return '';
  const sid = Number(String(event?.type_series_id || '').trim());
  if (!Number.isFinite(sid) || sid !== 3) return '';
  const ids = numericEvents.value
    .filter(({ event: item }) => {
      if (getEventType(item) !== 'World Link') return false;
      const itemSid = Number(String(item?.type_series_id || '').trim());
      return Number.isFinite(itemSid) && itemSid === 3;
    })
    .map(({ idNum }) => idNum);
  const index = ids.indexOf(currentId);
  return index >= 0 ? `P${index + 1}` : '';
};

const getLimitedRibbonLabel = (card) => {
  const type = String(card?.Type || '').trim().toLowerCase();
  if (['wl1', 'wl2', 'wl3', 'ue'].includes(type)) return 'WL限定';
  if (type === 'bfes' || type === 'cfes') return 'FES限定';
  if (type === 'limited') return '期间限定';
  if (type === 'collab' || type === 'collab_t') return '联动限定';
  return '';
};

const hasCardType = (cards, types) => {
  const set = new Set(types);
  return (Array.isArray(cards) ? cards : []).some((card) => set.has(String(card?.Type || '').trim().toLowerCase()));
};

const getRowLimitClass = (event, cards) => {
  const eventType = getEventType(event);
  const gachaType = String(event?.gacha_type || '').trim();
  if (eventType === 'World Link' || gachaType === 'UE限定' || hasCardType(cards, ['ue', 'wl1', 'wl2', 'wl3'])) {
    return 'is-ue-event';
  }
  if (gachaType === '普通限定' || hasCardType(cards, ['limited', 'collab_t'])) {
    return 'is-limited-event';
  }
  return '';
};

const hexToRgb = (hex) => {
  const raw = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16)
  };
};

const rgbaFromHex = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(20, 184, 166, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const mixHexWithWhite = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgb(245, 253, 252)';
  const mix = (channel) => Math.round(255 * (1 - alpha) + channel * alpha);
  return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
};

const buildMemberGradient = (cards, fallbackColor) => {
  const colors = (Array.isArray(cards) ? cards : [])
    .map((card) => charMap.value[getBaseName(card?.Name)]?.color)
    .filter((color) => !!hexToRgb(color));
  const unique = [...new Set(colors)];
  if (unique.length === 0) {
    return `linear-gradient(135deg, ${rgbaFromHex(fallbackColor, 0.7)}, rgba(255, 255, 255, 0.72) 56%, ${rgbaFromHex(fallbackColor, 0.2)})`;
  }
  if (unique.length === 1) {
    return `linear-gradient(135deg, ${rgbaFromHex(unique[0], 0.72)}, rgba(255, 255, 255, 0.7) 56%, ${rgbaFromHex(unique[0], 0.22)})`;
  }
  const step = 100 / Math.max(1, unique.length - 1);
  const stops = unique.map((color, index) => `${rgbaFromHex(color, 0.68)} ${Math.round(index * step)}%`).join(', ');
  return `linear-gradient(135deg, ${stops})`;
};

const buildMemberBorderGradient = (cards, fallbackColor) => {
  const colors = (Array.isArray(cards) ? cards : [])
    .map((card) => charMap.value[getBaseName(card?.Name)]?.color)
    .filter((color) => !!hexToRgb(color));
  const unique = [...new Set(colors)];
  if (unique.length === 0) return `linear-gradient(135deg, ${fallbackColor}, #ffffff, ${fallbackColor})`;
  if (unique.length === 1) return `linear-gradient(135deg, ${unique[0]}, #ffffff, ${unique[0]})`;
  const step = 100 / Math.max(1, unique.length - 1);
  return `linear-gradient(135deg, ${unique.map((color, index) => `${color} ${Math.round(index * step)}%`).join(', ')})`;
};

const buildCollabMemberGradient = (cards, fallbackColor) => {
  const colors = (Array.isArray(cards) ? cards : [])
    .map((card) => charMap.value[getBaseName(card?.Name)]?.color)
    .filter((color) => !!hexToRgb(color));
  const unique = [...new Set(colors)];
  if (unique.length === 0) {
    const pale = mixHexWithWhite(fallbackColor, 0.54);
    return `linear-gradient(135deg, ${pale}, #ffffff 52%, ${pale})`;
  }
  if (unique.length === 1) {
    const pale = mixHexWithWhite(unique[0], 0.54);
    return `linear-gradient(135deg, ${pale}, #ffffff 52%, ${pale})`;
  }
  const step = 100 / Math.max(1, unique.length - 1);
  return `linear-gradient(135deg, ${unique.map((color, index) => (
    `${mixHexWithWhite(color, 0.54)} ${Math.round(index * step)}%`
  )).join(', ')})`;
};

const annotateCards = (cards, bannerName) => {
  const bannerBase = getBaseName(bannerName);
  return (Array.isArray(cards) ? cards : []).map((card) => ({
    ...card,
    isBanner: !!bannerBase && getBaseName(card?.Name) === bannerBase,
    ribbonLabel: getLimitedRibbonLabel(card)
  }));
};

const numericEvents = computed(() => {
  const allEvents = Array.isArray(props.allEvents) ? props.allEvents : [];
  const numericRows = allEvents
    .filter((event) => Number.isFinite(Number(event?.id)))
    .map((event, index) => ({
      event,
      index,
      idNum: Number(event.id),
      scheduleIndex: Number.isFinite(Number(event?.predict_schedule_index))
        ? Number(event.predict_schedule_index)
        : Number(event.id)
    }))
    .sort((a, b) => a.scheduleIndex - b.scheduleIndex || a.idNum - b.idNum || a.index - b.index);

  const fixedRosterRows = allEvents
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => isC6FixedRosterEvent(event))
    .map(({ event, index }) => {
      const specialStart = parseYmd(event?.start_date);
      const specialTime = specialStart ? Date.UTC(specialStart.year, specialStart.month - 1, specialStart.day) : NaN;
      const rowsWithDates = numericRows.map((row) => {
        const start = parseYmd(row.event?.start_date);
        const end = parseYmd(row.event?.end_date || row.event?.start_date);
        return {
          row,
          startTime: start ? Date.UTC(start.year, start.month - 1, start.day) : NaN,
          endTime: end ? Date.UTC(end.year, end.month - 1, end.day) : NaN
        };
      });
      const overlapping = rowsWithDates.find(({ startTime, endTime }) => (
        Number.isFinite(specialTime)
        && Number.isFinite(startTime)
        && Number.isFinite(endTime)
        && specialTime >= startTime
        && specialTime <= endTime
      ));
      const previous = rowsWithDates
        .filter(({ startTime }) => Number.isFinite(specialTime) && Number.isFinite(startTime) && startTime <= specialTime)
        .at(-1);
      const anchor = overlapping?.row || previous?.row || numericRows.at(-1) || null;
      const anchorId = anchor?.idNum ?? 0;
      return {
        event,
        index,
        idNum: anchorId,
        scheduleIndex: anchorId + 0.5
      };
    });

  return [...numericRows, ...fixedRosterRows]
    .sort((a, b) => a.scheduleIndex - b.scheduleIndex || a.idNum - b.idNum || a.index - b.index);
});

const predictableEventIds = computed(() => numericEvents.value
  .filter(({ event }) => isPredictableBaseEvent(event))
  .map(({ idNum }) => idNum)
  .filter((id, index, ids) => ids.indexOf(id) === index)
  .sort((a, b) => a - b));

const predictPatchById = computed(() => {
  const source = selectedSource.value;
  const patches = Array.isArray(source?.predictiveEvents) ? source.predictiveEvents : [];
  const map = new Map();
  patches.forEach((patch) => {
    const key = normalizeId(patch?.id);
    if (key) map.set(key, patch);
  });
  return map;
});

const effectiveRange = computed(() => {
  const allRows = numericEvents.value;
  void allRows;
  const minPredictableId = predictableEventIds.value[0] ?? null;
  const predictedIds = [...predictPatchById.value.keys()]
    .map((key) => {
      const numericId = Number(key);
      if (Number.isFinite(numericId)) return numericId;
      return numericEvents.value.find(({ event }) => normalizeId(event?.id) === key)?.idNum;
    })
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b);
  const maxPredictedId = predictedIds[predictedIds.length - 1] ?? null;

  const parseRangeDraft = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return NaN;
    return Number(raw);
  };
  const rawStart = parseRangeDraft(rangeStartDraft.value);
  const rawEnd = parseRangeDraft(rangeEndDraft.value);
  const minAllowed = minPredictableId ?? predictedIds[0] ?? null;
  const maxAllowed = maxPredictedId ?? minAllowed;
  const unclampedStart = Number.isFinite(rawStart)
    ? rawStart
    : (predictedIds[0] ?? minAllowed);
  const unclampedEnd = Number.isFinite(rawEnd)
    ? rawEnd
    : maxAllowed;

  if (!Number.isFinite(unclampedStart) || !Number.isFinite(unclampedEnd) || !Number.isFinite(minAllowed) || !Number.isFinite(maxAllowed)) {
    return { start: null, end: null };
  }
  const start = Math.min(Math.max(unclampedStart, minAllowed), maxAllowed);
  const end = Math.min(Math.max(unclampedEnd, minAllowed), maxAllowed);
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
    minAllowed,
    maxAllowed
  };
});

const rangeStartPlaceholder = computed(() => {
  const value = effectiveRange.value.start;
  return Number.isFinite(value) ? String(value) : '起始ID';
});

const rangeEndPlaceholder = computed(() => {
  const value = effectiveRange.value.end;
  return Number.isFinite(value) ? String(value) : '截止ID';
});

const renderedRows = computed(() => {
  const range = effectiveRange.value;
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end)) return [];

  return numericEvents.value
    .filter(({ idNum }) => idNum >= range.start && idNum <= range.end)
    .map(({ event: base, index, scheduleIndex }) => {
      const idKey = normalizeId(base.id);
      const patch = predictPatchById.value.get(idKey) || null;
      if (!patch && !showUnpredictedRows.value) return null;
      const event = { ...base, ...patch };
      const cards = Array.isArray(patch?.memberCards)
        ? patch.memberCards
        : (baseCardsByEventId.value.get(idKey) || []);
      const bannerBase = getBaseName(event.banner);
      const bfesCards = annotateCards(cards.filter(isBfesCard), bannerBase);
      const normalCards = annotateCards(cards.filter((card) => !isBfesCard(card)), bannerBase);
      const eventType = getEventType(event);
      const isCollab = isC6FixedRosterEvent(event);
      const resolvedUnit = getEventUnit(event) || resolveUnitFromCards(cards);
      const colorName = bannerBase
        || getBaseName(normalCards.find((card) => !vsNameSet.value.has(getBaseName(card?.Name)))?.Name)
        || getBaseName(normalCards[0]?.Name);
      const mainColor = charMap.value[colorName]?.color || '#14b8a6';
      const detailKind = eventType === 'World Link'
        ? 'wl'
        : (isCollab ? 'collab' : (eventType === '箱活' ? 'box' : (eventType === '混活' ? 'mixed' : 'unknown')));
      const rowGradient = detailKind === 'collab'
        ? buildCollabMemberGradient(normalCards, mainColor)
        : detailKind === 'wl'
        ? buildMemberGradient(normalCards, mainColor)
        : `linear-gradient(115deg, ${rgbaFromHex(mainColor, 0.7)}, rgba(255, 255, 255, 0.74) 84%, ${rgbaFromHex(mainColor, 0.18)}), linear-gradient(90deg, ${rgbaFromHex(mainColor, 0.34)}, rgba(255, 255, 255, 0.65))`;

      return {
        key: `${idKey || 'unknown'}-${index}`,
        id: idKey || '-',
        sortKey: scheduleIndex,
        rowClass: `${getRowLimitClass(event, cards)}${isCollab ? ' is-collab-event' : ''}`.trim(),
        startDate: formatDate(base.start_date || base.date || patch?.start_date || patch?.date),
        endDate: formatDate(base.end_date || patch?.end_date),
        eventType,
        hasPrediction: !!patch,
        isCollab,
        detailKind,
        detailKindClass: `is-${detailKind}`,
        unitLabel: resolvedUnit.toUpperCase(),
        unitLogo: UNIT_LOGOS[resolvedUnit] || '',
        seriesLabel: isCollab ? '' : buildSeriesLabel(event),
        detailStyle: {
          '--special-row-gradient': rowGradient,
          '--special-collab-border-gradient': buildMemberBorderGradient(normalCards, mainColor),
          '--special-row-color-soft': rgbaFromHex(mainColor, 0.7),
          '--special-row-color-pale': rgbaFromHex(mainColor, 0.18),
          '--special-row-color-light': rgbaFromHex(mainColor, 0.34)
        },
        normalCards: normalCards.slice(0, 6),
        bfesCards: bfesCards.slice(0, 4)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((row, index, rows) => {
      const monthInfo = getMonthInfoFromDate(row.endDate || row.startDate);
      const prevMonthInfo = index > 0 ? getMonthInfoFromDate(rows[index - 1]?.endDate || rows[index - 1]?.startDate) : null;
      return {
        ...row,
        monthLabel: monthInfo && monthInfo.key !== prevMonthInfo?.key ? monthInfo.label : ''
      };
    });
});

const sanitizeFileName = (value) => {
  const cleaned = String(value || '').trim().replace(/[\\/:*?"<>|]/g, '_').replace(/[.\s]+$/g, '');
  return cleaned || 'pjsk-special-predict';
};

const exportPng = async () => {
  const target = canvasRef.value;
  if (!target || renderedRows.value.length === 0 || isExporting.value) return;

  isExporting.value = true;
  exportStatus.value = '正在生成 PNG...';
  const savedPreviewScale = previewScale.value;
  const clearExportStatusLater = () => {
    if (exportStatusTimer) window.clearTimeout(exportStatusTimer);
    exportStatusTimer = window.setTimeout(() => {
      exportStatus.value = '';
      exportStatusTimer = null;
    }, 10000);
  };
  try {
    previewScale.value = 1;
    await nextTick();
    if (document?.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const exportWidth = Math.ceil(target.scrollWidth || target.getBoundingClientRect().width);
    const exportHeight = Math.ceil(target.scrollHeight || target.getBoundingClientRect().height);
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      imageTimeout: 12000,
      width: exportWidth,
      height: exportHeight,
      windowWidth: Math.max(document.documentElement.clientWidth, exportWidth),
      windowHeight: Math.max(document.documentElement.clientHeight, exportHeight)
    });
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('toBlob failed'));
      }, 'image/png');
    });
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const sourceName = sanitizeFileName(selectedSource.value?.name || 'source');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sourceName}-special-predict-${stamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    exportStatus.value = 'PNG 已导出。';
    clearExportStatusLater();
  } catch (error) {
    console.error('[special-predict] export failed', error);
    exportStatus.value = '导出失败，请稍后重试。';
    clearExportStatusLater();
  } finally {
    previewScale.value = savedPreviewScale;
    updatePreviewScale();
    isExporting.value = false;
  }
};

watch(
  selectedCoverTextId,
  () => {
    globalTextDraft.value = {};
    allEventNotesDraft.value = {};
  }
);

watch(
  () => normalizedSources.value.map((source) => (
    `${source.id}:${source.predictiveEvents.map((event) => normalizeId(event?.id)).filter(Boolean).join(',')}`
  )).join('|'),
  () => {
    syncEventNotesWithSources();
    syncEventNoteElements();
    if (editorHistoryReady) nextTick(resetEditorHistory);
  },
  { immediate: true, flush: 'post' }
);

watch(
  selectedSourceId,
  () => {
    if (selectedCoverTextId.value.startsWith(EVENT_NOTE_ID_PREFIX)) {
      selectedCoverTextId.value = ALL_EVENT_NOTES_ID;
    }
    allEventNotesDraft.value = {};
    syncEventNoteElements();
  },
  { flush: 'post' }
);

watch(
  () => [props.activePredictSourceId, normalizedSources.value.map((source) => source.id).join('|')],
  () => {
    const activeId = normalizeId(props.activePredictSourceId);
    const exists = normalizedSources.value.some((source) => source.id === selectedSourceId.value);
    if (!exists) {
      selectedSourceId.value = normalizedSources.value.some((source) => source.id === activeId)
        ? activeId
        : (normalizedSources.value[0]?.id || '');
    }
  },
  { immediate: true }
);

watch(
  characterColorOptions,
  (options) => {
    if (!monthColorName.value && options.length > 0) {
      monthColorName.value = options[0].name;
    }
    if (!backgroundColorName.value && options.length > 1) {
      backgroundColorName.value = options[1].name;
    }
  },
  { immediate: true }
);

watch(
  [
    coverTextBlocks,
    creditText,
    creditManuallyEdited,
    monthFontFamily,
    creditTextStyle,
    eventNotesBySource,
    monthColorName,
    backgroundColorName,
    customMonthColor,
    customBackgroundColor,
    coverBgAssetId,
    coverBgOpacity
  ],
  () => {
    saveCoverTextSettings();
    scheduleEditorHistoryCapture();
  },
  { deep: true }
);

watch(
  () => [
    isUnlocked.value,
    coverTextBlocks.value.map((block) => `${block.id}:${block.text}`).join('\u0001'),
    Object.values(eventNotes.value).map((note) => `${note.id}:${note.text}`).join('\u0001')
  ],
  () => {
    syncCoverTextElements();
    syncCreditElement();
    syncEventNoteElements();
  },
  { flush: 'post' }
);

watch(
  defaultCreditText,
  syncCreditDefault,
  { immediate: true }
);

watch(
  () => [
    isUnlocked.value,
    renderedRows.value.length,
    selectedSourceId.value,
    showUnpredictedRows.value,
    coverBgUrl.value
  ],
  () => {
    updatePreviewScale();
  },
  { flush: 'post' }
);

onMounted(() => {
  loadCoverTextSettings();
  void loadPersistedFonts().finally(() => nextTick(resetEditorHistory));
  isUnlocked.value = sessionStorage.getItem(UNLOCK_SESSION_KEY) === '1';
  if (usingDefaultKey) {
    console.warn('[special-predict] VITE_SPECIAL_PREDICT_KEY_SHA256 is not configured. Using the development soft-lock key.');
  }
  updatePreviewScale();
  if (typeof ResizeObserver !== 'undefined') {
    previewResizeObserver = new ResizeObserver(() => updatePreviewScale());
    if (canvasWrapRef.value) previewResizeObserver.observe(canvasWrapRef.value);
    if (canvasRef.value) previewResizeObserver.observe(canvasRef.value);
  }
  window.addEventListener('resize', updatePreviewScale);
  window.addEventListener('keydown', onGlobalEditorKeydown);
});

onBeforeUnmount(() => {
  endCoverTextTransform();
  editorHistoryReady = false;
  if (editorHistoryTimer) {
    window.clearTimeout(editorHistoryTimer);
    editorHistoryTimer = null;
  }
  if (exportStatusTimer) {
    window.clearTimeout(exportStatusTimer);
    exportStatusTimer = null;
  }
  if (localFontStatusTimer) {
    window.clearTimeout(localFontStatusTimer);
    localFontStatusTimer = null;
  }
  if (previewResizeObserver) {
    previewResizeObserver.disconnect();
    previewResizeObserver = null;
  }
  window.removeEventListener('resize', updatePreviewScale);
  window.removeEventListener('keydown', onGlobalEditorKeydown);
  if (coverBgUrl.value) URL.revokeObjectURL(coverBgUrl.value);
  coverBgAssetMap.clear();
});

const SpecialCardCell = defineComponent({
  name: 'SpecialCardCell',
  props: {
    card: { type: Object, default: null },
    isBanner: { type: Boolean, default: false },
    charMap: { type: Object, default: () => ({}) },
    vsNameSet: { type: Object, default: () => new Set() }
  },
  setup(cellProps) {
    const getCardImageSrc = (card) => {
      if (!card) return '';
      const base = getBaseName(card.Name);
      const meta = cellProps.charMap[base] || {};
      const abbr = String(meta.abbr || '').trim();
      if (!abbr) return '';
      if (cellProps.vsNameSet.has(base)) {
        const unit = normalizeUnit(card.Affiliation);
        if (unit && unit !== 'vs') return `/chibi_s/${abbr.toLowerCase()}_${unit}.webp`;
      }
      return `/chibi_s/${abbr}.webp`;
    };

    const buildLayers = () => {
      const card = cellProps.card;
      const rarity = String(card.Rarity || '').trim();
      const attr = normalizeAttr(card.Attribute);
      const unit = normalizeUnit(card.Affiliation);
      const charSrc = getCardImageSrc(card);
      const children = [
        h('img', { class: 'special-card-bg', src: `/specialized/bg${rarity || 4}.png`, alt: '' })
      ];

      if (cellProps.isBanner) {
        children.push(h('span', { class: 'special-card-glow', 'aria-hidden': 'true' }));
      }
      if (charSrc) {
        children.push(h('img', { class: 'special-card-chibi', src: charSrc, alt: getBaseName(card.Name) || '角色' }));
      }
      if (rarity) {
        children.push(h('img', { class: 'special-card-star', src: `/specialized/star${rarity}.png`, alt: `${rarity}星` }));
      }
      if (attr) {
        children.push(h('img', { class: 'special-card-attr', src: `/specialized/attr-${attr.toLowerCase()}.png`, alt: attr }));
      }
      if (cellProps.vsNameSet.has(getBaseName(card.Name)) && unit && unit !== 'vs') {
        children.push(h('img', { class: 'special-card-unit', src: `/specialized/unit-${unit}.png`, alt: unit }));
      }
      if (card.ribbonLabel) {
        children.push(h('span', { class: 'special-card-ribbon' }, [
          h('span', { class: 'special-card-ribbon-text' }, card.ribbonLabel)
        ]));
      }

      return h('div', {
        class: ['special-card-cell', { 'is-banner': cellProps.isBanner }],
        title: `${getBaseName(card.Name)} ${rarity || ''}`.trim()
      }, children);
    };

    return buildLayers;
  }
});
</script>

<style scoped>
.special-predict-page {
  --special-toolbar-width: 360px;
  --special-toolbar-left: 24px;
  --special-toolbar-top: 78px;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  color: #17313a;
  overflow-x: hidden;
}

.special-lock-panel {
  min-height: calc(100dvh - 110px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.special-lock-inner {
  width: min(420px, 100%);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  padding: 22px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.14);
}

.special-lock-inner h2 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}

.special-lock-inner p {
  margin: 0 0 16px;
  color: #64748b;
  font-size: 0.88rem;
}

.special-lock-form {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.special-lock-input {
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.9rem;
  outline: none;
}

.special-lock-input:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.14);
}

.special-lock-error {
  margin-top: 10px;
  color: #dc2626;
  font-size: 0.82rem;
}

.special-lock-note {
  margin-top: 8px;
  color: #64748b;
  font-size: 0.76rem;
}

.special-generator-shell {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: calc(var(--special-toolbar-width) + 16px) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.special-toolbar {
  container-type: inline-size;
  container-name: special-toolbar;
  position: fixed;
  top: var(--special-toolbar-top);
  left: var(--special-toolbar-left);
  z-index: 30;
  display: grid;
  flex-direction: column;
  align-items: stretch;
  gap: 7px;
  width: var(--special-toolbar-width);
  height: calc(100vh - var(--special-toolbar-top) - 10px);
  max-height: calc(100vh - var(--special-toolbar-top) - 10px);
  height: calc(100dvh - var(--special-toolbar-top) - 10px);
  max-height: calc(100dvh - var(--special-toolbar-top) - 10px);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 22px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(241, 245, 249, 0.46) 48%, rgba(219, 234, 254, 0.3)),
    linear-gradient(135deg, rgba(186, 230, 253, 0.34), rgba(251, 207, 232, 0.24));
  padding: 8px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 12px 28px rgba(80, 85, 132, 0.14);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
}

.special-toolbar-row {
  display: grid;
  width: 100%;
  gap: 7px;
  align-items: stretch;
}

.special-toolbar-row-main,
.special-toolbar-row-colors {
  grid-template-columns: minmax(0, 1fr);
}

.special-toolbar-row-text {
  grid-template-columns: minmax(0, 1fr);
}

.special-toolbar-row-actions {
  grid-template-columns: minmax(0, 1fr);
}

.special-toolbar-group {
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  display: grid;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.7), rgba(248, 250, 252, 0.42) 56%, rgba(226, 232, 240, 0.28));
  padding: 6px 9px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    inset 0 -1px 0 rgba(148, 163, 184, 0.08),
    0 7px 18px rgba(71, 85, 105, 0.09);
  backdrop-filter: blur(14px) saturate(155%);
  -webkit-backdrop-filter: blur(14px) saturate(155%);
}

.special-toolbar-break {
  display: none;
}

.special-toolbar-source {
  flex: 1 1 auto;
}

.special-toolbar-range {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
}

.special-toolbar-range .special-toggle-field {
  grid-column: auto;
}

.special-toolbar-group.special-toolbar-actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-radius: 999px;
}

.special-toolbar-actions.has-cover {
  grid-template-columns: minmax(0, 1fr) minmax(70px, 0.72fr) minmax(86px, 0.88fr);
  gap: 5px;
  border-radius: 22px;
}

.special-toolbar-actions.has-cover .special-action-btn {
  grid-column: 1 / -1;
}

.special-toolbar-actions .special-clear-cover-btn {
  width: 100%;
  min-width: 0;
  padding-inline: 5px;
}

.special-toolbar-colors {
  grid-template-columns: auto minmax(0, 1fr);
  border-radius: 22px;
}

.special-toolbar-text {
  border-radius: 22px;
  grid-template-columns: minmax(0, 1fr);
}

.special-cover-opacity-field {
  width: 100%;
  height: 38px;
  min-width: 0;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: auto minmax(30px, 1fr) auto;
  align-items: center;
  gap: 2px;
  border: 1px solid rgba(203, 213, 225, 0.78);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #475569;
  padding: 0 5px;
  font-size: 0.7rem;
  font-weight: 800;
}

.special-cover-opacity-field input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 0;
  outline: none;
  background: transparent;
  color: #0f172a;
  padding: 0;
  font-size: 0.72rem;
  font-weight: 800;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.special-toolbar-group.special-toolbar-text {
  row-gap: 11px;
}

.special-toolbar-label {
  flex: 0 0 auto;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 800;
}

.special-color-group-label {
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 0.08em;
  line-height: 1;
}

.special-source-picker {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
}

.special-source-picker select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  padding: 6px 30px 6px 10px;
  font-size: 0.82rem;
  color: #0f172a;
}

.special-source-count {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 0.78rem;
}

.special-range-field,
.special-toggle-field {
  display: grid;
  align-items: center;
  gap: 5px;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.special-range-field {
  grid-template-columns: auto minmax(0, 1fr);
}

.special-toggle-field {
  grid-template-columns: auto auto;
}

.special-range-field input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  padding: 5px 8px;
  font-size: 0.78rem;
  color: #0f172a;
}

.special-toggle-field input {
  margin: 0;
}

.special-action-btn {
  flex: 0 0 auto;
  border: 1px solid rgba(13, 148, 136, 0.42);
  border-radius: 999px;
  background: linear-gradient(135deg, #14b8a6, #22c7b8);
  color: #ffffff;
  padding: 0 16px;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
  min-height: 38px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 8px 16px rgba(20, 184, 166, 0.24);
}

.special-toolbar-actions .special-upload-btn,
.special-toolbar-actions .special-secondary-btn,
.special-toolbar-actions .special-action-btn {
  width: 100%;
  height: 38px;
  min-height: 38px;
}

.special-action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.special-action-btn,
.special-secondary-btn,
.special-upload-btn,
.special-align-control button,
.special-style-control button,
.special-color-swatch {
  transition: transform 0.14s ease, filter 0.14s ease, background-color 0.14s ease, box-shadow 0.14s ease;
}

.special-action-btn:not(:disabled):hover,
.special-secondary-btn:not(:disabled):hover,
.special-upload-btn:hover,
.special-align-control button:hover,
.special-style-control button:hover,
.special-color-swatch:hover {
  background: rgba(226, 232, 240, 0.86);
  color: #334155;
  filter: grayscale(0.2) brightness(0.96);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.68),
    0 4px 10px rgba(80, 85, 132, 0.12);
}

.special-action-btn:not(:disabled):active,
.special-secondary-btn:not(:disabled):active,
.special-upload-btn:active,
.special-align-control button:active,
.special-style-control button:active,
.special-color-swatch:active {
  transform: translateY(1px) scale(0.97);
  filter: grayscale(0.28) brightness(0.92);
  box-shadow:
    inset 0 3px 8px rgba(15, 23, 42, 0.16),
    0 2px 6px rgba(80, 85, 132, 0.1);
}

.special-color-swatches {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, 22px);
  justify-content: space-between;
  align-items: center;
  gap: 5px 5px;
  max-width: none;
  overflow: visible;
  padding: 2px;
}

.special-inline-color-input {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.56);
  padding: 2px;
  cursor: pointer;
}

.special-color-custom {
  background:
    conic-gradient(from 0deg, #ff4d4f, #f59e0b, #22c55e, #06b6d4, #6366f1, #f472b6, #ff4d4f);
}

.special-color-swatch {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(100, 116, 139, 0.25);
  cursor: pointer;
}

.special-color-swatch.active {
  box-shadow:
    0 0 0 1px #ffffff,
    0 0 0 3px #14b8a6;
}

.special-color-swatch.is-bg {
  background-image:
    linear-gradient(45deg, rgba(255, 255, 255, 0.72) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.72) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.72) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.72) 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
}

.special-upload-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  border: 1px solid rgba(249, 168, 212, 0.72);
  border-radius: 999px;
  background: rgba(253, 242, 248, 0.68);
  color: #be185d;
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 900;
  cursor: pointer;
}

.special-upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.special-secondary-btn {
  border: 1px solid rgba(203, 213, 225, 0.78);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #475569;
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.special-secondary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.special-secondary-btn.active {
  border-color: rgba(20, 184, 166, 0.52);
  background: rgba(204, 251, 241, 0.76);
  color: #0f766e;
}

.special-editor-row {
  width: 100%;
  min-width: 0;
  display: grid;
  align-items: center;
  gap: 6px;
}

.special-editor-row-picker {
  grid-template-columns: minmax(0, 1fr);
}

.special-picker-field {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.special-text-picker-controls {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px 28px;
  align-items: center;
  gap: 6px;
}

.special-history-btn {
  width: 28px;
  height: 28px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.48);
  border-radius: 50%;
  padding: 0;
  background: rgba(255, 255, 255, 0.48);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 3px 8px rgba(15, 23, 42, 0.08);
  cursor: pointer;
}

.special-history-btn img {
  width: 17px;
  height: 17px;
  object-fit: contain;
}

.special-history-btn:disabled {
  opacity: 0.34;
  cursor: not-allowed;
}

.special-editor-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
}

.special-editor-actions .special-secondary-btn {
  width: 100%;
  min-width: 0;
  padding-inline: 5px;
}

.special-editor-row-font {
  grid-template-columns: minmax(0, 1fr) auto;
}

.special-editor-row-font.has-custom-font {
  grid-template-columns: minmax(0, 1fr) auto auto;
}

.special-editor-row-type {
  grid-template-columns: 80px 104px minmax(0, 1fr);
}

.special-editor-row-colors {
  grid-template-columns: auto auto minmax(0, 1fr);
}

.special-editor-actions.is-event-note {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.special-editor-row-colors.is-event-note {
  grid-template-columns: auto auto minmax(0, 1fr);
}

.special-editor-row-align {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.special-editor-row-align.is-single {
  grid-template-columns: minmax(0, 1fr);
}

.special-editor-row-spacing {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.special-editor-row-geometry {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.special-editor-row-layer {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr);
}

.special-editor-row-global-reset {
  grid-template-columns: minmax(0, 1fr);
}

.special-editor-select-field,
.special-color-field {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 5px;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 800;
}

.special-editor-select-field select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 999px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(241, 245, 249, 0.5));
  color: #0f172a;
  padding: 5px 24px 5px 8px;
  font-size: 0.74rem;
  font-weight: 700;
}

.special-editor-select-field.is-compact select {
  padding-right: 16px;
  padding-left: 6px;
  font-variant-numeric: tabular-nums;
}

.special-font-upload-btn {
  min-width: 82px;
  min-height: 30px;
}

.special-font-delete-btn {
  min-width: 62px;
  padding-inline: 6px;
}

.special-font-status {
  color: #64748b;
  font-size: 0.66rem;
  line-height: 1.35;
}

.special-editor-row-font,
.special-editor-row-colors,
.special-editor-row-geometry {
  padding-top: 6px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.special-style-control,
.special-align-control {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: grid;
  padding: 2px;
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 999px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(241, 245, 249, 0.44));
}

.special-style-control {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 2px;
}

.special-align-control {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.special-style-control button,
.special-align-control button {
  min-width: 0;
  height: 25px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #475569;
  padding: 0 5px;
  font-size: 0.72rem;
  font-weight: 900;
  cursor: pointer;
}

.special-action-btn,
.special-secondary-btn,
.special-upload-btn {
  white-space: nowrap;
  line-height: 1.2;
}

.special-style-control button.active,
.special-align-control button.active {
  background: rgba(20, 184, 166, 0.9);
  color: #ffffff;
}

.special-restore-btn {
  width: 100%;
}

.special-text-select {
  width: 100%;
  min-width: 0;
  max-width: none;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 999px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(241, 245, 249, 0.5));
  color: #0f172a;
  padding: 5px 26px 5px 9px;
  font-size: 0.76rem;
  font-weight: 800;
}

.special-text-color-swatch {
  position: relative;
  display: block;
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(100, 116, 139, 0.28);
  overflow: hidden;
  cursor: pointer;
}

.special-text-color-swatch.is-mixed {
  background:
    linear-gradient(45deg, rgba(148, 163, 184, 0.28) 25%, transparent 25%, transparent 75%, rgba(148, 163, 184, 0.28) 75%),
    linear-gradient(45deg, rgba(148, 163, 184, 0.28) 25%, rgba(255, 255, 255, 0.76) 25%, rgba(255, 255, 255, 0.76) 75%, rgba(148, 163, 184, 0.28) 75%);
  background-position: 0 0, 5px 5px;
  background-size: 10px 10px;
}

.special-text-color-swatch .special-text-color-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  border: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
}

.special-mini-field {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 4px;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 800;
}

.special-mini-field input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 999px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(241, 245, 249, 0.5));
  color: #0f172a;
  padding: 4px 5px;
  font-size: 0.72rem;
  font-weight: 800;
  text-align: center;
}

.special-follow-btn.active {
  border-color: rgba(20, 184, 166, 0.52);
  background: rgba(204, 251, 241, 0.76);
  color: #0f766e;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.74),
    0 0 0 2px rgba(20, 184, 166, 0.14);
}

.special-export-status {
  grid-column: 2;
  align-self: center;
  width: min(980px, 100%);
  box-sizing: border-box;
  color: #0f766e;
  background: #ecfeff;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.8rem;
}

.special-canvas-wrap {
  grid-column: 2;
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
  padding-bottom: 8px;
  display: flex;
  justify-content: center;
}

.special-canvas-stage {
  position: relative;
  flex: 0 0 auto;
}

.special-canvas {
  --special-card-size: 86px;
  --special-card-gap: 8px;
  --special-date-width: 118px;
  --special-row-gap: 10px;
  --special-detail-pad-x: 12px;
  --special-canvas-pad: 14px;
  --special-grid-width: calc((var(--special-card-size) * 6) + (var(--special-card-gap) * 5));
  --special-detail-width: calc(var(--special-grid-width) + (var(--special-detail-pad-x) * 2));
  --special-row-width: calc(var(--special-date-width) + var(--special-row-gap) + var(--special-detail-width));
  --special-cover-width: calc(var(--special-row-width) + 20px);
  width: var(--special-cover-width);
  min-height: 280px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border: 0;
  outline: 4px solid rgba(255, 202, 166, 0.92);
  outline-offset: -4px;
  border-radius: 10px;
  background: var(--special-canvas-bg, rgba(200, 201, 232, 0.72));
  padding: 0 0 var(--special-canvas-pad);
  box-shadow: 0 14px 36px rgba(80, 85, 132, 0.18);
  transform: scale(var(--special-preview-scale, 1));
  transform-origin: top left;
}

.special-cover-panel {
  position: relative;
  width: var(--special-cover-width);
  aspect-ratio: 2520 / 1440;
  box-sizing: border-box;
  border-radius: 6px;
  overflow: hidden;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.special-cover-bg-image {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  pointer-events: none;
}

.special-cover-panel + .special-month-bar {
  margin-top: -10px;
}

.special-cover-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06));
  pointer-events: none;
}

.special-cover-panel.has-cover-image::before {
  display: none;
}

.special-cover-text-frame {
  position: absolute;
  box-sizing: border-box;
  min-width: 6%;
  min-height: 6%;
  outline: none;
}

.special-cover-text-frame.is-selected {
  box-shadow: 0 0 0 1.5px rgba(14, 165, 233, 0.92), 0 0 0 3px rgba(255, 255, 255, 0.66);
}

.special-cover-text-frame.is-transforming {
  cursor: grabbing;
  user-select: none;
}

.special-cover-text {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border: 0;
  outline: none;
  background: transparent;
  color: #ffffff;
  font-family: inherit;
  font-size: 1.75rem;
  font-weight: 900;
  line-height: 1.28;
  letter-spacing: 0;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}

.special-cover-text:focus {
  outline: none;
}

.special-cover-text :deep(.special-cover-text-line) {
  display: block;
  flex: 0 0 auto;
  width: fit-content;
  max-width: 100%;
  min-height: 1em;
  box-sizing: border-box;
}

.special-cover-text.is-align-left :deep(.special-cover-text-line),
.special-cover-text.is-align-left :deep(div) {
  align-self: flex-start;
}

.special-cover-text.is-align-center :deep(.special-cover-text-line),
.special-cover-text.is-align-center :deep(div) {
  align-self: center;
}

.special-cover-text.is-align-right :deep(.special-cover-text-line),
.special-cover-text.is-align-right :deep(div) {
  align-self: flex-end;
}

.special-cover-text.is-italic :deep(.special-cover-text-line),
.special-cover-text.is-italic :deep(div) {
  transform: skewX(-12deg);
  transform-origin: center;
}

.special-cover-move-handle,
.special-cover-resize-handle {
  position: absolute;
  z-index: 20;
  border: 1px solid rgba(255, 255, 255, 0.94);
  background: rgba(14, 165, 233, 0.94);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.28);
  touch-action: none;
  user-select: none;
}

.special-cover-move-handle {
  top: 3px;
  left: 50%;
  width: 42px;
  height: 16px;
  border-radius: 18px;
  transform: translateX(-50%);
  display: grid;
  place-items: center;
  padding: 0 0 5px;
  font-size: 12px;
  line-height: 1;
  letter-spacing: 2px;
  cursor: grab;
}

.special-cover-move-handle:active {
  cursor: grabbing;
}

.special-cover-resize-handle {
  right: -6px;
  bottom: -6px;
  width: 14px;
  height: 14px;
  padding: 0;
  border-radius: 4px;
  cursor: nwse-resize;
}

.special-canvas.is-exporting .special-cover-text-frame.is-selected {
  box-shadow: none;
}

.special-canvas.is-exporting .special-cover-move-handle,
.special-canvas.is-exporting .special-cover-resize-handle {
  display: none;
}

.special-month-bar {
  width: var(--special-cover-width);
  height: 36px;
  box-sizing: border-box;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--special-month-fill, #ffcaa6);
  color: #ffffff;
  font-size: 1.55rem;
  font-weight: 900;
  text-shadow: 0 1px 5px rgba(15, 23, 42, 0.16);
}

.special-event-row {
  position: relative;
  display: grid;
  grid-template-columns: var(--special-date-width) var(--special-detail-width);
  gap: var(--special-row-gap);
  align-items: stretch;
  width: var(--special-row-width);
  box-sizing: border-box;
  border-radius: 18px;
}

.special-event-note {
  position: absolute;
  z-index: 3;
  top: 10px;
  right: 14px;
  width: min(340px, calc(var(--special-detail-width) - 220px));
  min-height: 34px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  outline: none;
  padding: 2px 6px;
  background: transparent;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  cursor: text;
}

.special-event-note.is-empty::before {
  content: attr(data-placeholder);
  color: #64748b;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease;
}

.special-event-note.is-empty {
  display: block;
  height: 34px;
  line-height: 28px !important;
}

.special-event-note.is-empty:hover::before,
.special-event-note.is-empty:focus::before,
.special-event-note.is-empty.is-selected::before {
  opacity: 0.48;
}

.special-event-note:focus {
  background: rgba(255, 255, 255, 0.16);
}

.special-event-note.is-selected {
  border-color: rgba(14, 165, 233, 0.92);
  box-shadow:
    0 0 0 1.5px rgba(14, 165, 233, 0.92),
    0 0 0 3px rgba(255, 255, 255, 0.66);
}

.special-canvas.is-exporting .special-event-note {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.special-canvas.is-exporting .special-event-note.is-empty::before {
  content: none;
}

.special-date-box,
.special-detail-box {
  box-sizing: border-box;
  border-radius: 16px;
  border: 1px solid rgba(23, 49, 58, 0.12);
  background: #ffffff;
  box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08);
}

.special-event-row.is-limited-event .special-date-box,
.special-event-row.is-limited-event .special-detail-box {
  border: 3px solid #ff4d4f;
}

.special-event-row.is-ue-event .special-date-box,
.special-event-row.is-ue-event .special-detail-box {
  border: 3px solid #f59e0b;
}

.special-date-box {
  min-height: 132px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  text-align: center;
  background: var(--special-row-gradient);
}

.special-date-text {
  font-size: 0.94rem;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.1;
}

.special-date-sep {
  color: #64748b;
  font-size: 0.94rem;
  font-weight: 900;
  line-height: 1;
}

.special-event-id {
  color: #0f766e;
  background: transparent;
  border-radius: 999px;
  padding: 2px 0;
  font-size: 0.76rem;
  font-weight: 800;
}

.special-credit-box {
  width: var(--special-row-width);
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.94);
  padding: 3px 8px 0;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
  text-shadow:
    0 2px 0 var(--special-month-fill, #ffcaa6),
    0 0 6px var(--special-month-fill, #ffcaa6),
    0 0 12px rgba(255, 255, 255, 0.58);
  white-space: pre-wrap;
}

.special-credit-box:focus {
  border-color: rgba(255, 255, 255, 0.58);
  background: rgba(255, 255, 255, 0.08);
}

.special-credit-box.is-selected {
  border-color: rgba(14, 165, 233, 0.92);
  box-shadow:
    0 0 0 1.5px rgba(14, 165, 233, 0.92),
    0 0 0 3px rgba(255, 255, 255, 0.66);
}

.special-canvas.is-exporting .special-credit-box {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.special-detail-box {
  min-width: 0;
  width: var(--special-detail-width);
  padding: 10px var(--special-detail-pad-x);
  background: var(--special-row-gradient);
}

.special-event-row.is-collab-event .special-date-box,
.special-event-row.is-collab-event .special-detail-box {
  border: 4px solid transparent;
  background:
    var(--special-row-gradient) padding-box,
    var(--special-collab-border-gradient) border-box;
}

.special-detail-head {
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  border-radius: 12px;
  margin-bottom: 8px;
  background: transparent;
  overflow: hidden;
}

.special-detail-head.is-mixed {
  background: transparent;
}

.special-detail-head.is-wl {
  background: transparent;
  color: #ffffff;
  text-shadow: 0 1px 6px rgba(15, 23, 42, 0.52);
}

.special-unit-logo {
  max-width: 210px;
  max-height: 28px;
  object-fit: contain;
}

.special-se-logo {
  width: 62px;
  height: 28px;
  object-fit: contain;
}

.special-wl-text,
.special-unknown-text {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0;
}

.special-series-label {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.18);
  color: #0f172a;
  font-size: 0.74rem;
  font-weight: 900;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.4);
}

.special-detail-head.is-wl .special-series-label {
  color: #ffffff;
  text-shadow: 0 1px 5px rgba(15, 23, 42, 0.42);
}

.special-member-grid,
.special-bfes-grid {
  display: grid;
  width: var(--special-grid-width);
  grid-template-columns: repeat(6, var(--special-card-size));
  gap: var(--special-card-gap);
  justify-content: start;
}

.special-bfes-grid {
  margin-top: 8px;
}

:deep(.special-card-cell) {
  position: relative;
  width: var(--special-card-size);
  aspect-ratio: 1 / 1;
  min-width: 0;
  overflow: visible;
  border-radius: 0;
  background: transparent;
}

:deep(.special-card-glow) {
  position: absolute;
  inset: -4%;
  z-index: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle,
      transparent 57%,
      rgba(255, 255, 255, 0.34) 60%,
      rgba(255, 255, 255, 0.98) 63%,
      #ffffff 66%,
      rgba(255, 255, 255, 0.74) 70%,
      rgba(255, 255, 255, 0.18) 76%,
      transparent 83%
    ),
    radial-gradient(circle,
      transparent 47%,
      rgba(255, 255, 255, 0.18) 57%,
      rgba(255, 255, 255, 0.36) 69%,
      rgba(255, 255, 255, 0.16) 82%,
      transparent 92%
    );
  pointer-events: none;
}

:deep(.special-card-bg),
:deep(.special-card-chibi),
:deep(.special-card-star),
:deep(.special-card-attr),
:deep(.special-card-unit),
:deep(.special-card-ribbon) {
  position: absolute;
  display: block;
  pointer-events: none;
}

:deep(.special-card-bg),
:deep(.special-card-chibi),
:deep(.special-card-star),
:deep(.special-card-attr),
:deep(.special-card-unit) {
  object-fit: contain;
}

:deep(.special-card-bg),
:deep(.special-card-chibi) {
  width: 100%;
  height: 100%;
}

:deep(.special-card-bg) {
  inset: 0;
  z-index: 1;
  object-fit: contain;
}

:deep(.special-card-chibi) {
  inset: 3%;
  width: 94%;
  height: 94%;
  z-index: 3;
}

:deep(.special-card-star) {
  z-index: 6;
  inset: 0;
  width: 100%;
  height: 100%;
}

:deep(.special-card-attr) {
  z-index: 6;
  inset: 0;
  width: 100%;
  height: 100%;
}

:deep(.special-card-unit) {
  z-index: 6;
  inset: 0;
  width: 100%;
  height: 100%;
}

:deep(.special-card-ribbon) {
  z-index: 5;
  inset: 3%;
  width: 94%;
  height: 94%;
  border-radius: 50%;
  overflow: hidden;
}

:deep(.special-card-ribbon)::before {
  content: '';
  position: absolute;
  top: 20%;
  right: -28%;
  width: 100%;
  height: 12%;
  transform: rotate(43deg);
  transform-origin: center;
  background: linear-gradient(90deg, #ff94ca 0%, #ff67b0 58%, #f74399 100%);
  box-shadow: 0 1px 4px rgba(143, 21, 76, 0.22);
}

:deep(.special-card-ribbon-text) {
  position: absolute;
  top: 19%;
  right: -26%;
  width: 100%;
  transform: rotate(43deg);
  transform-origin: center;
  display: block;
  color: #ffffff;
  font-size: 7px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(143, 21, 76, 0.42);
}

.special-bfes-logo-cell {
  grid-column: span 2;
  border-radius: 10px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 2 / 1;
  min-width: 0;
  overflow: hidden;
}

.special-bfes-logo {
  max-width: 82%;
  max-height: 72%;
  object-fit: contain;
}

.special-empty {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
}

@container special-toolbar (max-width: 270px) {
  .special-editor-row-type {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .special-editor-row-type .special-style-control {
    grid-column: 1 / -1;
  }

  .special-editor-row-geometry {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 700px) and (max-width: 1200px) {
  .special-predict-page {
    --special-toolbar-width: 320px;
    --special-toolbar-left: 12px;
  }

  .special-generator-shell {
    grid-template-columns: calc(var(--special-toolbar-width) + 16px) minmax(0, 1fr);
  }

  .special-toolbar {
    padding: 6px;
    gap: 5px;
  }

  .special-toolbar-row {
    gap: 5px;
  }

  .special-toolbar-group {
    gap: 5px;
    padding: 5px 7px;
  }
}

@media (max-width: 699px) {
  .special-generator-shell {
    display: flex;
    flex-direction: column;
  }

  .special-toolbar {
    position: static;
    z-index: auto;
    align-self: center;
    width: min(980px, 100%);
    height: auto;
    max-height: min(42dvh, 430px);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-gutter: auto;
  }

  .special-toolbar-text {
    flex-direction: column;
    align-items: stretch;
    flex-wrap: nowrap;
  }

  .special-toolbar-range {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  }

  .special-toolbar-range .special-toggle-field {
    grid-column: auto;
  }

  .special-export-status,
  .special-canvas-wrap {
    grid-column: auto;
  }

  .special-lock-panel {
    min-height: calc(100dvh - 84px);
    padding: 14px;
  }

  .special-lock-inner {
    width: min(460px, 100%);
    padding: 18px;
  }

  .special-lock-form {
    flex-direction: column;
    gap: 10px;
  }

  .special-lock-input {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 13px;
    font-size: 16px;
  }

  .special-lock-form .special-action-btn {
    align-self: flex-end;
    width: auto;
    min-height: 38px;
    padding: 0 18px;
  }

  .special-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 5px;
    padding: 6px;
    border-radius: 18px;
  }

  .special-toolbar-row,
  .special-toolbar-row-main,
  .special-toolbar-row-colors,
  .special-toolbar-row-text {
    grid-template-columns: minmax(0, 1fr);
    gap: 5px;
  }

  .special-toolbar-row-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .special-toolbar-group {
    width: 100%;
    box-sizing: border-box;
    align-items: center;
    flex-direction: row;
    gap: 5px;
    padding: 4px 7px;
    border-radius: 18px;
    min-height: 0;
  }

  .special-toolbar-group.special-toolbar-text {
    align-items: stretch;
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .special-toolbar-label,
  .special-range-field,
  .special-toggle-field,
  .special-mini-field {
    font-size: 0.72rem;
  }

  .special-source-picker {
    width: 100%;
    align-items: center;
    flex-direction: row;
    gap: 5px;
  }

  .special-source-picker select {
    min-width: 0;
    font-size: 14px;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .special-range-field {
    flex: 1 1 92px;
  }

  .special-range-field input {
    flex: 1 1 auto;
    width: 100%;
    box-sizing: border-box;
    font-size: 14px;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .special-toggle-field {
    flex: 0 0 auto;
  }

  .special-action-btn {
    width: 100%;
    min-height: 34px;
  }

  .special-color-swatches {
    max-width: 100%;
    flex: 1 1 210px;
    flex-wrap: wrap;
    overflow: visible;
    grid-template-columns: repeat(auto-fill, 17px);
    gap: 4px 3px;
    padding: 0;
  }

  .special-color-swatch {
    width: 17px;
    height: 17px;
    border-width: 1px;
  }

  .special-inline-color-input {
    width: 18px;
    height: 18px;
    padding: 1px;
  }

  .special-upload-btn,
  .special-secondary-btn {
    flex: 1 1 96px;
    box-sizing: border-box;
    min-height: 26px;
    padding: 4px 8px;
    font-size: 0.72rem;
  }

  .special-restore-btn {
    width: 100%;
    flex-basis: auto;
    align-self: stretch;
  }

  .special-text-select {
    width: 100%;
    min-width: 0;
    max-width: none;
    padding-top: 4px;
    padding-bottom: 4px;
    font-size: 0.72rem;
  }

  .special-mini-field input {
    width: 100%;
    padding: 3px 6px;
    font-size: 0.72rem;
  }

  .special-align-control button {
    padding: 3px 6px;
    font-size: 0.7rem;
  }

  .special-cover-text {
    padding: 16px 18px;
    font-size: 1.35rem;
  }
}
</style>
