<template>
<section data-feature-view="special-prediction-unlock-panel" data-feature-page="special-prediction" class="special-lock-panel" aria-label="特殊预测生成器访问验证">
      <div class="special-lock-inner">
        <h2>特殊预测生成器</h2>
        <p>请输入访问密钥。</p>
        <form class="special-lock-form" @submit.prevent="unlock">
          <input
            v-model="keyDraft"
            class="pjsk-ui-field special-lock-input"
            type="password"
            autocomplete="current-password"
            placeholder="密钥"
            aria-label="访问密钥"
            :aria-invalid="lockError ? 'true' : undefined"
            :aria-describedby="lockError ? 'special-prediction-unlock-error' : undefined"
          />
          <button class="pjsk-ui-action special-action-btn" type="submit">进入</button>
        </form>
        <div v-if="lockError" id="special-prediction-unlock-error" class="special-lock-error" role="alert">{{ lockError }}</div>
        <div v-if="usingDefaultKey" class="special-lock-note">当前使用开发默认软锁。</div>
      </div>
    </section>
</template>

<script setup>
// Feature objects retain the actual instance refs used by native controls and canvas elements.

const props = defineProps(["unlock"]);
const { unlock, keyDraft, lockError, usingDefaultKey } = props.unlock;
</script>
