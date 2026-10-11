<template>
<div data-feature-view="special-prediction-single-canvas" data-feature-page="special-prediction" class="special-canvas-stage" :style="canvasStageStyle">
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
                class="pjsk-ui-action special-cover-move-handle"
                type="button"
                title="拖动文本框"
                aria-label="拖动文本框"
                @pointerdown="startCoverTextTransform(block, 'move', $event)"
              >•••</button>
              <button
                v-if="selectedCoverTextId === block.id"
                class="pjsk-ui-action special-cover-resize-handle"
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
            <div class="special-date-box" :style="eventMetaTextStyle">
              <span class="special-date-text">{{ row.startDate || '-' }}</span>
              <span v-if="row.endDate" class="special-date-sep">~</span>
              <span v-if="row.endDate" class="special-date-text">{{ row.endDate }}</span>
              <span class="special-event-id">{{ row.isCollab ? '时间仅供参考' : `#${row.id}` }}</span>
            </div>

            <div class="special-detail-box" :style="row.detailStyle">
              <div class="special-detail-head" :class="row.detailKindClass" :style="eventMetaTextStyle">
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
                <SpecialPredictionCardCell
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
                <SpecialPredictionCardCell
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
                'is-selected': selectedEventNoteId === row.id && selectedEventNoteSourceId === row.sourceId,
                'is-empty': !getEventNote(row.id, row.sourceId).text
              }"
              contenteditable="true"
              spellcheck="false"
              :aria-label="`${row.id}备注`"
              data-placeholder="点击添加备注"
              :style="getEventNoteRenderStyle(row.id, row.sourceId)"
              :ref="(el) => setEventNoteElement(row.id, el, row.sourceId)"
              @pointerdown="selectEventNote(row.id, row.sourceId)"
              @focus="selectEventNote(row.id, row.sourceId)"
              @input="onEventNoteInput(row.id, $event, row.sourceId)"
              @blur="onEventNoteBlur(row.id, $event, row.sourceId)"
              @beforeinput="onEventNoteBeforeInput(row.id, $event, row.sourceId)"
              @keydown="onEventNoteKeydown(row.id, $event, row.sourceId)"
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
</template>

<script setup>
import SpecialPredictionCardCell from './SpecialPredictionCardCell.vue';
// Feature objects retain the actual instance refs used by native controls and canvas elements.

const props = defineProps(["preview","capture","presentation","textTransform","background","textSettings","coverText","caseRows","metadata","eventNotes","noteEditing","credit"]);
const { canvasStageStyle, canvasRef, coverPanelRef } = props.preview;
const { isExporting } = props.capture;
const { canvasStyle, coverStyle, coverImageStyle, monthTextStyle, eventMetaTextStyle } = props.presentation;
const { onCanvasTextSelectionPointerDown, activeTextTransformMode, selectCoverTextBlock, startCoverTextTransform, selectEventNote, selectPredictorText } = props.textTransform;
const { coverBgUrl } = props.background;
const { coverTextBlocks, selectedCoverTextId, selectedEventNoteId, selectedEventNoteSourceId, isPredictorTextMode } = props.textSettings;
const { getCoverTextFrameStyle, getCoverTextContentStyle, setCoverTextElement, onCoverTextInput, onCoverTextBlur } = props.coverText;
const { renderedRows } = props.caseRows;
const { charMap, vsNameSet } = props.metadata;
const { getEventNote, getEventNoteRenderStyle, setEventNoteElement, onEventNoteInput, onEventNoteBlur } = props.eventNotes;
const { onEventNoteBeforeInput, onEventNoteKeydown } = props.noteEditing;
const { creditTextRenderStyle, onCreditInput, setCreditElement } = props.credit;
</script>
