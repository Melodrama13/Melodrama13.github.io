<template>
<div data-feature-view="special-prediction-color-controls" data-feature-page="special-prediction" class="special-toolbar-row special-toolbar-row-colors">
        <div class="special-toolbar-group special-toolbar-colors" aria-label="月份填充色">
          <span class="special-toolbar-label special-color-group-label">月份色</span>
          <div class="special-color-swatches">
            <button
              v-for="item in characterColorOptions"
              :key="item.name"
              class="pjsk-ui-action special-color-swatch"
              :class="{ active: selectedMonthColor === item.color }"
              type="button"
              :title="item.name"
              :style="{ backgroundColor: item.color }"
              @click="setMonthColor(item.name)"
            />
            <button
              class="pjsk-ui-action special-color-swatch special-color-custom"
              :class="{ active: monthColorName === CUSTOM_COLOR_KEY }"
              type="button"
              title="自选色"
              @click="setMonthColor(CUSTOM_COLOR_KEY)"
            />
            <input
              v-if="monthColorName === CUSTOM_COLOR_KEY"
              v-model="customMonthColor"
              class="pjsk-ui-swatch special-inline-color-input"
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
              class="pjsk-ui-action special-color-swatch is-bg"
              :class="{ active: selectedBackgroundColor === item.color }"
              type="button"
              :title="item.name"
              :style="{ backgroundColor: rgbaFromHex(item.color, 0.42) }"
              @click="setBackgroundColor(item.name)"
            />
            <button
              class="pjsk-ui-action special-color-swatch special-color-custom"
              :class="{ active: backgroundColorName === CUSTOM_COLOR_KEY }"
              type="button"
              title="自选色"
              @click="setBackgroundColor(CUSTOM_COLOR_KEY)"
            />
            <input
              v-if="backgroundColorName === CUSTOM_COLOR_KEY"
              v-model="customBackgroundColor"
              class="pjsk-ui-swatch special-inline-color-input"
              type="color"
              title="自选背景色"
            />
          </div>
        </div>
        </div>
</template>

<script setup>
// Feature objects retain the actual instance refs used by native controls and canvas elements.
import { CUSTOM_COLOR_KEY } from './specialPredictionTextDefaults.js';
import { rgbaFromHex } from './specialPredictionFormatters.js';
const props = defineProps(["metadata","presentation"]);
const { characterColorOptions } = props.metadata;
const { selectedMonthColor, setMonthColor, monthColorName, customMonthColor, selectedBackgroundColor, setBackgroundColor, backgroundColorName, customBackgroundColor } = props.presentation;
</script>
