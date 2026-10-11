<template>
<Teleport to="body">
    <UiSurfaceTransition kind="dialog">
      <div
        v-if="predictSwitchDialog.visible"
        class="predict-switch-dialog-backdrop"
        role="presentation"
        @mousedown.self="resolvePredictSwitchDialog('cancel')"
        @keydown.esc.prevent="resolvePredictSwitchDialog('cancel')"
      >
        <section
          class="predict-switch-dialog-card ui-motion-dialog-panel ui-liquid-glass ui-liquid-glass--modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="predict-switch-dialog-title"
          tabindex="-1"
        >
          <div class="predict-switch-dialog-icon">!</div>
          <div class="predict-switch-dialog-copy">
            <h3 id="predict-switch-dialog-title">当前预测尚未保存</h3>
            <p>
              活动 <strong>#{{ predictSwitchDialog.currentEventKey }}</strong> 的临时改动尚未写入预测 JSON。是否先保存，再切换到
              <strong>#{{ predictSwitchDialog.nextEventKey }}</strong>？
            </p>
          </div>
          <div class="predict-switch-dialog-actions">
            <button class="pjsk-ui-action predict-switch-dialog-btn is-cancel" @click="resolvePredictSwitchDialog('cancel')">继续编辑</button>
            <button class="pjsk-ui-action predict-switch-dialog-btn is-discard" @click="resolvePredictSwitchDialog('discard')">不保存并切换</button>
            <button ref="predictSwitchSaveBtnRef" class="pjsk-ui-action predict-switch-dialog-btn is-save" @click="resolvePredictSwitchDialog('save')">保存并切换</button>
          </div>
        </section>
      </div>
    </UiSurfaceTransition>
  </Teleport>
</template>

<script setup>
import UiSurfaceTransition from '../../components/ui/UiSurfaceTransition.vue';
const props = defineProps({
  predictionEditor: { type: Object, required: true },
});
const { predictSwitchSaveBtnRef, predictSwitchDialog, resolvePredictSwitchDialog } = props.predictionEditor;
</script>

<style scoped src="./styles/historyPredictSwitchDialog.css"></style>
