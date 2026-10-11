<template>
<div data-feature-view="app-source-menu-contents" data-feature-page="app" class="source-menu-username-wrap" title="导出文件命名与本地数据源命名使用该用户名">
            <span class="source-menu-username-label">用户名</span>
            <input
              v-model="predictUserName"
              class="pjsk-ui-field source-menu-username-input"
              type="text"
              maxlength="24"
              placeholder="user"
              @focus="onPredictUserFocus"
              @blur="onPredictUserBlur"
            />
            <button
              class="pjsk-ui-action source-special-entry-btn"
              type="button"
              title="打开特殊预测生成器"
              @click.stop="openSpecialPredictGenerator"
            >
              <span>？</span>
            </button>
          </div>
          <div data-feature-view="app-source-menu-contents" data-feature-page="app" v-if="isSmallTabletViewport && showPredictInfoInNav" class="source-menu-mobile-summary">
            当前数据源共有 {{ predictiveEvents.length }} 条预测
          </div>
          <div data-feature-view="app-source-menu-contents" data-feature-page="app" v-if="isSmallTabletViewport && cleanedPatchNoticeCount > 0" class="source-menu-mobile-summary">
            已清理 {{ cleanedPatchNoticeCount }} 条过期或冲突预测
          </div>
          <div data-feature-view="app-source-menu-contents" data-feature-page="app" class="source-menu-title">切换数据源</div>
          <div data-feature-view="app-source-menu-contents" data-feature-page="app" class="source-list">
            <div
              v-for="source in predictSources"
              :key="source.id"
              class="source-item-row"
              :class="{ 'is-drag-over': dragOverSourceId === source.id }"
              draggable="true"
              @dragstart="onSourceDragStart(source.id, $event)"
              @dragover.prevent="onSourceDragOver(source.id, $event)"
              @dragleave="onSourceDragLeave(source.id, $event)"
              @drop.prevent="onSourceDrop(source.id, $event)"
              @dragend="onSourceDragEnd"
            >
              <button
                class="pjsk-ui-action source-item"
                :class="{ active: source.id === activePredictSourceId }"
                @click="switchPredictSource(source.id)"
              >
                <span class="source-item-name">{{ source.name }}</span>
                <span class="source-item-count">{{ Array.isArray(source.predictiveEvents) ? source.predictiveEvents.length : 0 }}</span>
              </button>
              <button class="pjsk-ui-action source-mini-btn" title="重命名此数据源" @click="startRenamePredictSource(source.id)">
                <img src="/data/icon/edit.png" class="mini-btn-icon" alt="重命名" />
              </button>
              <button class="pjsk-ui-action source-order-btn" title="上移" @click.stop="movePredictSource(source.id, -1)">↑</button>
              <button class="pjsk-ui-action source-order-btn" title="下移" @click.stop="movePredictSource(source.id, 1)">↓</button>
              <span class="source-drag-handle" title="拖拽排序">⋮⋮</span>
            </div>
          </div>

          <div data-feature-view="app-source-menu-contents" data-feature-page="app" v-if="renameSourceTargetId" class="source-export-confirm source-rename-confirm">
            <div class="source-export-confirm-title">重命名数据源</div>
            <div class="source-export-confirm-row">
              <span>名称</span>
              <input
                v-model="renameSourceDraftName"
                class="pjsk-ui-field source-export-name-input"
                type="text"
                maxlength="60"
                @keydown.enter.prevent="confirmRenamePredictSourceAction"
                @keydown.esc.prevent="cancelRenamePredictSourceAction"
              />
            </div>
            <div class="source-export-confirm-actions">
              <button class="pjsk-ui-action io-btn" @click="cancelRenamePredictSourceAction">取消</button>
              <button class="pjsk-ui-action io-btn" @click="confirmRenamePredictSourceAction">确认重命名</button>
            </div>
          </div>

          <div data-feature-view="app-source-menu-contents" data-feature-page="app" class="source-menu-title">数据源操作</div>
          <div data-feature-view="app-source-menu-contents" data-feature-page="app" class="source-actions">
            <button @click="triggerImportPredicts" class="pjsk-ui-action io-btn" title="导入 JSON 并创建新数据源">
              <span class="btn-with-icon">
                <img src="/data/icon/import.png" class="btn-icon" alt="导入" />
                <span>导入</span>
              </span>
            </button>
            <button @click="exportPredicts" class="pjsk-ui-action io-btn" title="导出当前数据源预测">
              <span class="btn-with-icon">
                <img src="/data/icon/export.png" class="btn-icon" alt="导出" />
                <span>导出</span>
              </span>
            </button>
            <button
              @click="openScreenshotExportConfirm"
              class="pjsk-ui-action io-btn"
              :disabled="isScreenshotExporting"
              :title="isScreenshotExporting ? '正在截图，请等待' : '导出预测活动区间PNG（生放送不导出）'"
            >
              <span class="btn-with-icon">
                <img src="/data/icon/camera.png" class="btn-icon" alt="截图" />
                <span>{{ isScreenshotExporting ? '截图中…' : '预测截图' }}</span>
              </span>
            </button>
            <button @click="openCreateSourceConfirm" class="pjsk-ui-action io-btn" title="新建数据源（可选复制当前预测）">
              <span class="btn-with-icon">
                <img src="/data/icon/circle_add.png" class="btn-icon" alt="新建" />
                <span>新建</span>
              </span>
            </button>
            <button @click="deleteActivePredictSource" class="pjsk-ui-action io-btn" :disabled="predictSources.length <= 1" title="删除当前数据源">
              <span class="btn-with-icon">
                <img src="/data/icon/delete.png" class="btn-icon" alt="删除" />
                <span>删除</span>
              </span>
            </button>
          </div>
          <label data-feature-view="app-source-menu-contents" data-feature-page="app" class="source-export-option">
            <input class="pjsk-ui-choice" v-model="exportBirthdayRowsInPng" type="checkbox" />
            <span>截图导出生日行</span>
          </label>
          <div data-feature-view="app-source-menu-contents" data-feature-page="app" v-if="showScreenshotConfirmPanel" class="source-export-confirm">
            <div class="source-export-confirm-title">将要导出{{ screenshotConfirmRangeText }}期活动</div>
            <div class="source-export-confirm-row source-export-range-row">
              <span>活动范围</span>
              <input
                v-model="screenshotRangeStartId"
                class="pjsk-ui-field source-export-range-input"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="8"
                placeholder="起始ID"
              />
              <span class="source-export-range-sep">~</span>
              <input
                v-model="screenshotRangeEndId"
                class="pjsk-ui-field source-export-range-input"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="8"
                placeholder="结束ID"
              />
            </div>
            <div class="source-export-confirm-row">
              <span>文件名</span>
              <input v-model="screenshotExportFileName" class="pjsk-ui-field source-export-name-input" type="text" maxlength="80" />
            </div>
            <div class="source-export-confirm-actions">
              <button class="pjsk-ui-action io-btn" @click="cancelScreenshotExport" :disabled="isScreenshotExporting">取消</button>
              <button class="pjsk-ui-action io-btn" @click="confirmScreenshotExport" :disabled="isScreenshotExporting">确认导出PNG</button>
            </div>
          </div>
          <div data-feature-view="app-source-menu-contents" data-feature-page="app" v-if="showCreateSourceConfirmPanel" class="source-export-confirm source-create-confirm">
            <div class="source-export-confirm-title">新建数据源</div>
            <div class="source-export-confirm-row source-create-clone-row">
              <label class="source-export-option source-create-clone-option">
                <input class="pjsk-ui-choice" v-model="createSourceCloneCurrent" type="checkbox" :disabled="!canCloneActivePredictSource" />
                <span>
                  <template v-if="canCloneActivePredictSource">
                    复制当前数据源「{{ activePredictSourceName }}」的 {{ activePredictSourcePredictCount }} 条预测
                  </template>
                  <template v-else>
                    当前数据源暂无预测，创建空白数据源
                  </template>
                </span>
              </label>
            </div>
            <div class="source-export-confirm-actions">
              <button class="pjsk-ui-action io-btn" @click="cancelCreateSourceAction">取消</button>
              <button class="pjsk-ui-action io-btn" @click="confirmCreateSourceAction">确认新建</button>
            </div>
          </div>
          <div data-feature-view="app-source-menu-contents" data-feature-page="app" v-if="screenshotStatusText" class="source-export-status">{{ screenshotStatusText }}</div>

          <div data-feature-view="app-source-menu-contents" data-feature-page="app"
            class="io-drop-zone source-drop-zone"
            :class="{ 'is-drag-over': isImportDragOver }"
            @dragenter.prevent="onImportDragEnter"
            @dragover.prevent="onImportDragOver"
            @dragleave.prevent="onImportDragLeave"
            @drop.prevent="onImportDrop"
          >
            <span class="io-drop-hint">拖拽 JSON 到此处可导入为新数据源</span>
          </div>
</template>

<script setup>
const props = defineProps({
  predictionSources: { type: Object, required: true },
  sourceMenu: { type: Object, required: true },
  tabNavigation: { type: Object, required: true },
  responsiveNavigation: { type: Object, required: true },
  predictionFiles: { type: Object, required: true },
  historyCapture: { type: Object, required: true },
});
const { predictUserName, predictiveEvents, cleanedPatchNoticeCount, predictSources, activePredictSourceId, switchPredictSource, canCloneActivePredictSource, activePredictSourceName, activePredictSourcePredictCount } = props.predictionSources;
const { onPredictUserFocus, onPredictUserBlur, dragOverSourceId, onSourceDragStart, onSourceDragOver, onSourceDragLeave, onSourceDrop, onSourceDragEnd, startRenamePredictSource, movePredictSource, renameSourceTargetId, renameSourceDraftName, confirmRenamePredictSourceAction, cancelRenamePredictSourceAction, openCreateSourceConfirm, deleteActivePredictSource, showCreateSourceConfirmPanel, createSourceCloneCurrent, cancelCreateSourceAction, confirmCreateSourceAction } = props.sourceMenu;
const { openSpecialPredictGenerator, showPredictInfoInNav } = props.tabNavigation;
const { isSmallTabletViewport } = props.responsiveNavigation;
const { triggerImportPredicts, exportPredicts, isImportDragOver, onImportDragEnter, onImportDragOver, onImportDragLeave, onImportDrop } = props.predictionFiles;
const { openScreenshotExportConfirm, isScreenshotExporting, exportBirthdayRowsInPng, showScreenshotConfirmPanel, screenshotConfirmRangeText, screenshotRangeStartId, screenshotRangeEndId, screenshotExportFileName, cancelScreenshotExport, confirmScreenshotExport, screenshotStatusText } = props.historyCapture;
</script>
