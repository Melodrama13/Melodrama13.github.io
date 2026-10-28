<template>
<div data-feature-view="prediction-editor-header" data-feature-page="prediction-editor" class="drawer-header">
        <div
          v-if="isMobileViewport"
          class="drawer-grab-handle"
          @mousedown.prevent="startSheetDragMouse"
          @touchstart.prevent="startSheetDrag"
        ></div>
        <div class="header-main">
          <h3>预测编辑器 <span class="ev-id">#{{ event.id }}</span></h3>
          <div class="editor-header-actions">
            <button class="pjsk-ui-action close-btn" @click="$emit('close')">×</button>
          </div>
        </div>

        <div class="global-config-bar" :class="{ 'has-banner': !isFixedRosterMode }">
          <div class="cfg-group">
            <label>活动类型</label>
            <select class="pjsk-ui-field" v-model="form.eventType" :disabled="form.isTypeLocked">
              <option value="箱活">箱活</option>
              <option value="混活">混活</option>
              <option v-if="form.isTypeLocked && form.eventType === 'World Link'" value="World Link">World Link</option>
              <option v-if="form.isTypeLocked && form.eventType === '联动'" value="联动">联动</option>
            </select>
          </div>
          <div class="cfg-group">
            <label>卡池性质</label>
            <select class="pjsk-ui-field" v-model="form.gachaType" :disabled="form.isGachaLocked">
              <option value="perm">常驻</option>
              <option value="limited">普通限定</option>
              <option value="ue">UE限定</option>
              <option v-if="form.isGachaLocked && form.gachaType === 'collab'" value="collab">联动</option>
            </select>
          </div>
          <div class="cfg-group">
            <label>活动属性</label>
            <select class="pjsk-ui-field" v-model="form.predictAttr" :disabled="isWorldLinkMode" @change="applyGlobalAttr">
              <option value="">手动分配</option>
              <option v-for="a in ATTRS" :key="a" :value="a">{{ getAttrLabel(a) }}</option>
            </select>
          </div>
          <div v-if="!isFixedRosterMode" class="cfg-group">
            <label>Ban主</label>
            <select class="pjsk-ui-field" v-model="form.bannerName" :disabled="bannerCandidates.length === 0">
              <option v-if="bannerCandidates.length === 0" value="">无可用</option>
              <option v-else value="" disabled>选择 Ban主</option>
              <option v-for="char in bannerCandidates" :key="`ban-${char.name}`" :value="char.name">{{ char.name }}</option>
            </select>
          </div>
        </div>
      </div>
</template>

<script setup>
/** Native controls share the editor's per-instance form and explicit actions. */
defineProps(["isMobileViewport","startSheetDragMouse","startSheetDrag","event","isFixedRosterMode","isWorldLinkMode","form","applyGlobalAttr","ATTRS","getAttrLabel","bannerCandidates"]);
defineEmits(['close']);
</script>

<style scoped>
.editor-header-actions { display: flex; align-items: center; gap: 6px; }
</style>
