<template>
<div data-feature-view="app-data-loading-indicator" data-feature-page="app"
        v-if="!isAppDataReady"
        class="app-data-loading"
        role="status"
        aria-live="polite"
        :aria-label="appDataLoadFailed ? '数据加载失败，请刷新重试' : '数据加载中'"
      >
        <div v-if="!appDataLoadFailed" class="app-data-loader" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span v-else class="app-data-loading-error">数据加载失败，请刷新重试</span>
      </div>
</template>

<script setup>
const props = defineProps({
  resourceLoading: { type: Object, required: true },
});
const { isAppDataReady, appDataLoadFailed } = props.resourceLoading;
</script>
