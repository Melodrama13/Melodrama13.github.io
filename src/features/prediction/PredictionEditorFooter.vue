<template>
<div data-feature-view="prediction-editor-footer" data-feature-page="prediction-editor" class="drawer-footer">
        <button @click="submit" class="pjsk-ui-action save-all-btn">确认并保存预测</button>
      </div>
</template>

<script setup>
/** Native controls share the editor's per-instance form and explicit actions. */
defineProps(["submit"]);
</script>
