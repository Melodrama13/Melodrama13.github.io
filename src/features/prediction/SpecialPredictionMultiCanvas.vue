<template>
          <div data-feature-view="special-prediction-multi-canvas" data-feature-page="special-prediction"
            v-for="page in monthlyMultiPages"
            :key="page.key"
            class="special-canvas-stage"
            :style="getMultiCanvasStageStyle(page.key)"
          >
            <div
              :ref="(el) => setMultiCanvasElement(page.key, el)"
              class="special-canvas is-multi-case"
              :class="{ 'is-exporting': isExporting }"
              :style="getPageCanvasStyle(page.key)"
              :aria-label="`${page.label}多分支特殊预测图预览`"
              @pointerdown="onCanvasTextSelectionPointerDown"
            >
              <div
                :ref="(el) => setMultiCoverPanelElement(page.key, el)"
                class="special-cover-panel"
                :class="{ 'has-cover-image': !!getPageCoverBgUrl(page.key) }"
                :style="coverStyle"
              >
                <div v-if="getPageCoverBgUrl(page.key)" class="special-cover-bg-image" :style="getPageCoverImageStyle(page.key)" aria-hidden="true"></div>
                <div
                  v-for="block in getPageCoverTextBlocks(page.key)"
                  :key="`${page.key}-${block.id}`"
                  class="special-cover-text-frame"
                  :class="{
                    'is-selected': isPageAppearanceActive(page.key) && selectedCoverTextId === block.id,
                    'is-transforming': isPageAppearanceActive(page.key) && selectedCoverTextId === block.id && !!activeTextTransformMode
                  }"
                  :style="getCoverTextFrameStyle(block)"
                  @pointerdown="selectPageCoverTextBlock(page.key, block)"
                >
                  <div
                    class="special-cover-text"
                    :class="[`is-align-${block.align || 'left'}`, { 'is-italic': block.italic }]"
                    :contenteditable="isPageAppearanceActive(page.key)"
                    :style="getPageCoverTextContentStyle(block, page.key)"
                    :aria-label="block.name"
                    spellcheck="false"
                    :ref="(el) => setCoverTextElement(block, el, page.key)"
                    @focus="selectPageCoverTextBlock(page.key, block)"
                    @input="onCoverTextInput(block, $event, page.key)"
                    @blur="onCoverTextBlur(block, $event, page.key)"
                  />
                  <button
                    v-if="isPageAppearanceActive(page.key) && selectedCoverTextId === block.id"
                    class="pjsk-ui-action special-cover-move-handle"
                    type="button"
                    title="拖动文本框"
                    aria-label="拖动文本框"
                    @pointerdown="startCoverTextTransform(block, 'move', $event, page.key)"
                  >•••</button>
                  <button
                    v-if="isPageAppearanceActive(page.key) && selectedCoverTextId === block.id"
                    class="pjsk-ui-action special-cover-resize-handle"
                    type="button"
                    title="缩放文本框"
                    aria-label="缩放文本框"
                    @pointerdown="startCoverTextTransform(block, 'resize', $event, page.key)"
                  />
                </div>
              </div>

              <div class="special-month-bar" :style="getPageMonthTextStyle(page.key)">{{ page.label }}</div>

              <template v-for="row in page.rows" :key="row.key">
              <SpecialPredictionCompilationRow v-if="row.isCompilation" :row="row" :text-style="getPageEventMetaTextStyle(page.key)" />
              <div
                v-else
                :class="['special-event-row', 'special-multi-event-row', row.rowClass]"
                :style="row.detailStyle"
              >
                <div class="special-date-box" :style="getPageEventMetaTextStyle(page.key)">
                  <span class="special-date-text">{{ row.startDate || '-' }}</span>
                  <span v-if="row.endDate" class="special-date-sep">~</span>
                  <span v-if="row.endDate" class="special-date-text">{{ row.endDate }}</span>
                  <span class="special-event-id">{{ row.isCollab ? '时间仅供参考' : `#${row.id}` }}</span>
                </div>

                <div class="special-multi-case-grid" :class="{ 'is-single-case': row.cases.length === 1 }">
                  <section
                    v-for="caseItem in row.cases"
                    :key="`${row.key}-${caseItem.sourceIds.join('-')}`"
                    :class="[
                      'special-case-card',
                      caseItem.rowClass,
                      {
                        'is-manual-case': caseItem.isManual,
                        'is-controls-visible': activeCaseControlKey === `${row.id}|${caseItem.caseKey}`
                      }
                    ]"
                    :style="caseItem.detailStyle"
                    :title="caseItem.sourceNames.join(' / ')"
                    @pointerdown="activeCaseControlKey = `${row.id}|${caseItem.caseKey}`"
                  >
                    <div class="special-case-actions" aria-label="Case 操作">
                      <button class="pjsk-ui-action" type="button" title="临时删除此 Case" aria-label="删除 Case" @click.stop="removeRenderedCase(row.id, caseItem)">−</button>
                    </div>
                    <div class="special-case-head" :class="caseItem.detailKindClass" :style="getPageEventMetaTextStyle(page.key)">
                      <span class="special-case-label" :style="getPageCaseLabelStyle(page.key)">{{ caseItem.caseLabel }}</span>
                      <img v-if="caseItem.detailKind === 'box' && caseItem.unitLogo" :src="caseItem.unitLogo" class="special-unit-logo" :alt="caseItem.unitLabel" />
                      <img v-else-if="caseItem.detailKind === 'mixed'" src="/specialized/se.png" class="special-se-logo" alt="混活" />
                      <span v-else-if="caseItem.detailKind === 'wl'" class="special-wl-text">World Link</span>
                      <span v-else class="special-unknown-text">{{ caseItem.eventType || '待定' }}</span>
                      <span v-if="caseItem.seriesLabel" class="special-series-label">{{ caseItem.seriesLabel }}</span>
                    </div>

                    <div class="special-case-member-grid">
                      <template v-if="caseItem.isManual">
                        <label
                          v-for="slot in 8"
                          :key="`manual-${row.key}-${caseItem.manualId}-${slot}`"
                          class="special-manual-card-slot"
                          :class="{ 'is-invalid': caseItem.commands[slot - 1] && !getManualCaseCard(caseItem, slot - 1) }"
                        >
                          <SpecialPredictionCardCell
                            v-if="getManualCaseCard(caseItem, slot - 1)"
                            :card="getManualCaseCard(caseItem, slot - 1)"
                            :is-banner="false"
                            :char-map="charMap"
                            :vs-name-set="vsNameSet"
                          />
                          <div v-else class="special-case-card-placeholder" aria-hidden="true"></div>
                          <input class="pjsk-ui-field"
                            :value="caseItem.commands[slot - 1]"
                            type="text"
                            spellcheck="false"
                            :aria-label="`Case ${caseItem.caseIndex + 1} 人选 ${slot}`"
                            placeholder="ick-cute-4"
                            @input="updateManualCaseCommand(row.id, caseItem.manualId, slot - 1, $event.target.value)"
                          />
                        </label>
                      </template>
                      <template v-else v-for="(card, idx) in getCaseMemberSlots(caseItem, row.cases.length === 1)" :key="`mc-${row.key}-${caseItem.caseIndex}-${idx}`">
                        <SpecialPredictionCardCell v-if="card" :card="card" :is-banner="card.isBanner" :char-map="charMap" :vs-name-set="vsNameSet" />
                        <div v-else class="special-case-card-placeholder" aria-hidden="true"></div>
                      </template>
                    </div>

                    <div v-for="fesGroup in caseItem.fesGroups" :key="fesGroup.key" class="special-case-fes-row">
                      <div class="special-case-fes-logo-cell">
                        <img :src="fesGroup.logo" class="special-case-fes-logo" :alt="fesGroup.label" />
                      </div>
                      <SpecialPredictionCardCell
                        v-for="(card, idx) in fesGroup.cards"
                        :key="`mf-${row.key}-${caseItem.caseIndex}-${fesGroup.key}-${idx}`"
                        :card="card"
                        :is-banner="card.isBanner"
                        :char-map="charMap"
                        :vs-name-set="vsNameSet"
                      />
                    </div>

                    <div
                      v-if="caseItem.hasPrediction"
                      class="special-case-note"
                      :class="{
                        'is-selected': selectedEventNoteId === row.id && selectedEventNoteSourceId === caseItem.noteSourceId,
                        'is-empty': !getEventNote(row.id, caseItem.noteSourceId).text
                      }"
                      contenteditable="true"
                      spellcheck="false"
                      :aria-label="`${row.id}备注`"
                      data-placeholder="点击添加备注"
                      :style="getEventNoteRenderStyle(row.id, caseItem.noteSourceId)"
                      :ref="(el) => setEventNoteElement(row.id, el, caseItem.noteSourceId)"
                      @pointerdown="selectEventNote(row.id, caseItem.noteSourceId)"
                      @focus="selectEventNote(row.id, caseItem.noteSourceId)"
                      @input="onEventNoteInput(row.id, $event, caseItem.noteSourceId)"
                      @blur="onEventNoteBlur(row.id, $event, caseItem.noteSourceId)"
                      @beforeinput="onEventNoteBeforeInput(row.id, $event, caseItem.noteSourceId)"
                      @keydown="onEventNoteKeydown(row.id, $event, caseItem.noteSourceId)"
                    />
                  </section>
                </div>
              </div>

              </template>
              <div
                class="special-credit-box"
                :class="{ 'is-selected': isPageAppearanceActive(page.key) && isPredictorTextMode }"
                :contenteditable="isPageAppearanceActive(page.key)"
                spellcheck="false"
                aria-label="预测者署名"
                :style="getPageCreditTextRenderStyle(page.key)"
                @pointerdown="selectPagePredictor(page.key)"
                @focus="selectPagePredictor(page.key)"
                @input="onCreditInput"
                :ref="(el) => setCreditElement(el, page.key)"
              />
            </div>
          </div>
          <div data-feature-view="special-prediction-multi-canvas" data-feature-page="special-prediction" v-if="monthlyMultiPages.length === 0" class="special-multi-empty-canvas">
            请选择预测 JSON，或调整活动范围。
          </div>
</template>

<script setup>
import SpecialPredictionCardCell from './SpecialPredictionCardCell.vue';
import SpecialPredictionCompilationRow from './SpecialPredictionCompilationRow.vue';
// Feature objects retain the actual instance refs used by native controls and canvas elements.

const props = defineProps(["caseRows","preview","capture","presentation","textTransform","pageAppearance","textSettings","coverText","manualCases","metadata","eventNotes","noteEditing","credit"]);
const { monthlyMultiPages, getCaseMemberSlots } = props.caseRows;
const { getMultiCanvasStageStyle, setMultiCanvasElement, setMultiCoverPanelElement } = props.preview;
const { isExporting } = props.capture;
const { getPageCanvasStyle, getPageCoverBgUrl, coverStyle, getPageCoverImageStyle, getPageCoverTextBlocks, getPageMonthTextStyle, getPageEventMetaTextStyle, getPageCaseLabelStyle } = props.presentation;
const { onCanvasTextSelectionPointerDown, activeTextTransformMode, startCoverTextTransform, selectEventNote } = props.textTransform;
const { isPageAppearanceActive, selectPageCoverTextBlock, selectPagePredictor } = props.pageAppearance;
const { selectedCoverTextId, selectedEventNoteId, selectedEventNoteSourceId, isPredictorTextMode } = props.textSettings;
const { getCoverTextFrameStyle, getPageCoverTextContentStyle, setCoverTextElement, onCoverTextInput, onCoverTextBlur } = props.coverText;
const { activeCaseControlKey, removeRenderedCase, getManualCaseCard, updateManualCaseCommand } = props.manualCases;
const { charMap, vsNameSet } = props.metadata;
const { getEventNote, getEventNoteRenderStyle, setEventNoteElement, onEventNoteInput, onEventNoteBlur } = props.eventNotes;
const { onEventNoteBeforeInput, onEventNoteKeydown } = props.noteEditing;
const { getPageCreditTextRenderStyle, onCreditInput, setCreditElement } = props.credit;
</script>
