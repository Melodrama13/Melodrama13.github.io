<template>
<div data-feature-view="special-prediction-source-controls" data-feature-page="special-prediction" class="special-toolbar-row special-toolbar-row-main">
        <div class="special-toolbar-group special-toolbar-source" :class="{ 'is-multi': isMultiCaseMode }">
          <div class="special-predict-mode-toggle" aria-label="预测图模式">
            <button class="pjsk-ui-action" type="button" :class="{ active: !isMultiCaseMode }" @click="setPredictionMode('single')">单一预测</button>
            <button class="pjsk-ui-action" type="button" :class="{ active: isMultiCaseMode }" @click="setPredictionMode('multi')">多分支预测</button>
          </div>
          <label v-if="!isMultiCaseMode" class="special-source-picker">
            <span>数据源</span>
            <select class="pjsk-ui-field" v-model="selectedSourceId">
              <option
                v-for="source in normalizedSources"
                :key="source.id"
                :value="source.id"
              >
                {{ source.name }}（{{ source.predictiveEvents.length }}）
              </option>
            </select>
          </label>
          <div v-else class="special-multi-source-picker">
            <button class="pjsk-ui-action special-multi-source-trigger" type="button" :class="{ active: multiSourceListOpen }" @click="multiSourceListOpen = !multiSourceListOpen">
              <span>预测源</span>
              <span>{{ selectedMultiSources.length }}/{{ normalizedSources.length }}</span>
              <span class="special-multi-source-chevron" aria-hidden="true"></span>
            </button>
            <div v-if="multiSourceListOpen" class="special-multi-source-list" role="group" aria-label="多分支预测源">
              <button
                v-for="source in normalizedSources"
                :key="source.id"
                class="pjsk-ui-action special-multi-source-option"
                :class="{ active: getMultiSourceOrder(source.id) > 0 }"
                type="button"
                role="checkbox"
                :data-source-id="source.id"
                :aria-checked="getMultiSourceOrder(source.id) > 0"
                @click="toggleMultiCaseSource(source.id)"
              >
                <span class="special-multi-source-order">{{ getMultiSourceOrder(source.id) || '' }}</span>
                <span class="special-multi-source-name" :title="source.name">{{ source.name }}</span>
                <span class="special-multi-source-count">{{ source.predictiveEvents.length }}</span>
              </button>
            </div>
            <div v-else-if="selectedMultiSources.length === 0" class="special-multi-source-empty">展开列表并选择预测源。</div>
          </div>
        </div>

        <div v-if="isMultiCaseMode" class="special-toolbar-group special-toolbar-page">
          <label class="special-page-picker">
            <span>图片</span>
            <select class="pjsk-ui-field" :value="selectedPageConfigKey" @change="selectPageConfig($event.target.value)">
              <option :value="ALL_PAGE_CONFIG_KEY">全部图</option>
              <option v-for="page in monthlyMultiPages" :key="page.key" :value="page.key">{{ page.label }}（{{ page.rows.length }}期）</option>
            </select>
          </label>
          <span class="special-page-scope-note">{{ selectedPageConfigKey === ALL_PAGE_CONFIG_KEY ? '修改将应用到全部月份' : '仅修改当前月份' }}</span>
        </div>

        <div class="special-toolbar-group special-toolbar-range">
          <label class="special-range-field">
            <span>起始</span>
            <input class="pjsk-ui-field" v-model="rangeStartDraft" type="text" inputmode="numeric" :placeholder="rangeStartPlaceholder" />
          </label>
          <label class="special-range-field">
            <span>截止</span>
            <input class="pjsk-ui-field" v-model="rangeEndDraft" type="text" inputmode="numeric" :placeholder="rangeEndPlaceholder" />
          </label>
          <label class="special-toggle-field">
            <input class="pjsk-ui-choice" v-model="showUnpredictedRows" type="checkbox" />
            <span>未预测</span>
          </label>
        </div>
        </div>
</template>

<script setup>
// Feature objects retain the actual instance refs used by native controls and canvas elements.
import { ALL_PAGE_CONFIG_KEY } from './specialPredictionTextDefaults.js';
const props = defineProps(["sourceSelection","pageAppearance","caseRows","rangeSelection"]);
const { isMultiCaseMode, setPredictionMode, selectedSourceId, normalizedSources, multiSourceListOpen, selectedMultiSources, getMultiSourceOrder, toggleMultiCaseSource } = props.sourceSelection;
const { selectedPageConfigKey, selectPageConfig } = props.pageAppearance;
const { monthlyMultiPages } = props.caseRows;
const { rangeStartDraft, rangeStartPlaceholder, rangeEndDraft, rangeEndPlaceholder, showUnpredictedRows } = props.rangeSelection;
</script>
