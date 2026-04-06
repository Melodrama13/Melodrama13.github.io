<template>
  <div class="main-app">
    <div class="nav-tabs" :class="{ 'is-stats-top-compact': isStatsTopNavCompact }">
      <button 
        :class="{ active: currentTab === 'stats' }" 
        @click="setCurrentTab('stats')"
      >
        <span class="btn-with-icon">
          <img src="/data/icon/statistics.png" class="btn-icon" alt="统计" />
          <span>{{ isStatsTopNavCompact ? '统计' : '统计面板' }}</span>
        </span>
      </button>
      <button 
        :class="{ active: currentTab === 'history' }" 
        @click="setCurrentTab('history')"
      >
        <span class="btn-with-icon">
          <img src="/data/icon/event.png" class="btn-icon" alt="活动" />
          <span>{{ isStatsTopNavCompact ? '活动' : '历史活动一览' }}</span>
        </span>
      </button>
      <button
        :class="{ active: currentTab === 'songs' }"
        @click="setCurrentTab('songs')"
      >
        <span class="btn-with-icon">
          <img src="/data/icon/music.png" class="btn-icon" alt="乐曲" />
          <span>{{ isStatsTopNavCompact ? '乐曲' : '乐曲统计' }}</span>
        </span>
      </button>
      <div
        v-if="showStatsTopControlInNav"
        class="stats-top-nav-wrap"
        title="统计页：快速调整截止活动ID与展开菜单"
      >
        <span class="stats-top-label">截止ID</span>
        <button class="stats-top-mini-btn" title="减少 1" @click="adjustStatsTopDisplayEventId(-1)">－</button>
        <input
          v-model="statsTopDisplayEventIdDraft"
          class="stats-top-id-input"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="8"
          placeholder="ID"
          @focus="onStatsTopDisplayIdFocus"
          @input="onStatsTopDisplayIdInput($event.target.value)"
          @blur="onStatsTopDisplayIdBlur"
        />
        <button class="stats-top-mini-btn" title="增加 1" @click="adjustStatsTopDisplayEventId(1)">＋</button>
        <button class="stats-top-mini-btn stats-top-reset-btn" :title="`恢复到当前参考活动 ID：${statsTopAutoCurrentId || '-'}`" @click="resetStatsTopDisplayEventId">
          <img src="/data/icon/reset.png" class="stats-top-reset-icon" alt="复位" />
        </button>
      </div>
      <div v-else class="username-wrap" title="导出文件命名与本地数据源命名使用该用户名">
        <span class="username-label">用户名</span>
        <input
          v-model="predictUserName"
          class="username-input"
          type="text"
          maxlength="24"
          placeholder="user"
          @focus="onPredictUserFocus"
          @blur="onPredictUserBlur"
        />
      </div>
      <div class="nav-tabs-spacer"></div>
      <div class="predict-info" v-if="showPredictInfoInNav">
        {{ `${predictiveEvents.length}条预测` }}
      </div>
      <div class="predict-cleanup-info" v-if="cleanedPatchNoticeCount > 0">
        {{ isCompactTopNav ? `已清理 ${cleanedPatchNoticeCount} 条` : `已自动清理 ${cleanedPatchNoticeCount} 条过期/冲突预测` }}
      </div>
      <div class="source-dropdown" ref="sourceDropdownRef">
        <button
          ref="sourceTriggerRef"
          class="io-btn source-trigger"
          :class="{ active: sourceMenuOpen, 'is-disabled': isHistoryPredictEditorOpen }"
          :disabled="isHistoryPredictEditorOpen"
          @pointerdown.stop
          @click.stop="toggleSourceMenu"
          :title="isHistoryPredictEditorOpen ? '预测面板打开时不可操作数据源' : `当前数据源：${activePredictSourceName}`"
        >
          {{ isCompactTopNav ? '数据源' : `数据源：${activePredictSourceName}` }}
        </button>
      </div>
      <Teleport to="body">
        <div
          v-if="sourceMenuOpen"
          ref="sourceMenuPanelRef"
          class="source-menu source-menu-floating"
          :style="sourceMenuStyle"
          @pointerdown.stop
        >
          <div class="source-menu-title">切换数据源</div>
          <div class="source-list">
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
                class="source-item"
                :class="{ active: source.id === activePredictSourceId }"
                @click="switchPredictSource(source.id)"
              >
                <span class="source-item-name">{{ source.name }}</span>
                <span class="source-item-count">{{ Array.isArray(source.predictiveEvents) ? source.predictiveEvents.length : 0 }}</span>
              </button>
              <button class="source-mini-btn" title="重命名此数据源" @click="startRenamePredictSource(source.id)">
                <img src="/data/icon/edit.png" class="mini-btn-icon" alt="重命名" />
              </button>
              <button class="source-order-btn" title="上移" @click.stop="movePredictSource(source.id, -1)">↑</button>
              <button class="source-order-btn" title="下移" @click.stop="movePredictSource(source.id, 1)">↓</button>
              <span class="source-drag-handle" title="拖拽排序">⋮⋮</span>
            </div>
          </div>

          <div v-if="renameSourceTargetId" class="source-export-confirm source-rename-confirm">
            <div class="source-export-confirm-title">重命名数据源</div>
            <div class="source-export-confirm-row">
              <span>名称</span>
              <input
                v-model="renameSourceDraftName"
                class="source-export-name-input"
                type="text"
                maxlength="60"
                @keydown.enter.prevent="confirmRenamePredictSourceAction"
                @keydown.esc.prevent="cancelRenamePredictSourceAction"
              />
            </div>
            <div class="source-export-confirm-actions">
              <button class="io-btn" @click="cancelRenamePredictSourceAction">取消</button>
              <button class="io-btn" @click="confirmRenamePredictSourceAction">确认重命名</button>
            </div>
          </div>

          <div class="source-menu-title">数据源操作</div>
          <div class="source-actions">
            <button @click="triggerImportPredicts" class="io-btn" title="导入 JSON 并创建新数据源">
              <span class="btn-with-icon">
                <img src="/data/icon/import.png" class="btn-icon" alt="导入" />
                <span>导入</span>
              </span>
            </button>
            <button @click="exportPredicts" class="io-btn" title="导出当前数据源预测">
              <span class="btn-with-icon">
                <img src="/data/icon/export.png" class="btn-icon" alt="导出" />
                <span>导出</span>
              </span>
            </button>
            <button
              @click="openScreenshotExportConfirm"
              class="io-btn"
              :disabled="isScreenshotExporting"
              :title="isScreenshotExporting ? '正在截图，请等待' : '导出已预测活动区间PNG（生放送不导出）'"
            >
              <span class="btn-with-icon">
                <img src="/data/icon/camera.png" class="btn-icon" alt="截图" />
                <span>{{ isScreenshotExporting ? '截图中…' : '预测截图' }}</span>
              </span>
            </button>
            <button @click="openCreateSourceConfirm" class="io-btn" title="新建数据源（可选复制当前预测）">
              <span class="btn-with-icon">
                <img src="/data/icon/circle_add.png" class="btn-icon" alt="新建" />
                <span>新建</span>
              </span>
            </button>
            <button @click="deleteActivePredictSource" class="io-btn" :disabled="predictSources.length <= 1" title="删除当前数据源">
              <span class="btn-with-icon">
                <img src="/data/icon/delete.png" class="btn-icon" alt="删除" />
                <span>删除</span>
              </span>
            </button>
          </div>
          <label class="source-export-option">
            <input v-model="exportBirthdayRowsInPng" type="checkbox" />
            <span>截图导出生日行</span>
          </label>
          <label v-if="isCompactTopNav" class="source-export-option">
            <input v-model="experimentalHighQualityPng" type="checkbox" />
            <span>实验：高清导出（更慢，失败后可能自动降级）</span>
          </label>
          <div v-if="showScreenshotConfirmPanel" class="source-export-confirm">
            <div class="source-export-confirm-title">将要导出{{ screenshotConfirmRangeText }}期活动</div>
            <div class="source-export-confirm-row source-export-range-row">
              <span>活动范围</span>
              <input
                v-model="screenshotRangeStartId"
                class="source-export-range-input"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="8"
                placeholder="起始ID"
              />
              <span class="source-export-range-sep">~</span>
              <input
                v-model="screenshotRangeEndId"
                class="source-export-range-input"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="8"
                placeholder="结束ID"
              />
            </div>
            <div class="source-export-confirm-row">
              <span>文件名</span>
              <input v-model="screenshotExportFileName" class="source-export-name-input" type="text" maxlength="80" />
            </div>
            <div class="source-export-confirm-actions">
              <button class="io-btn" @click="cancelScreenshotExport" :disabled="isScreenshotExporting">取消</button>
              <button class="io-btn" @click="confirmScreenshotExport" :disabled="isScreenshotExporting">确认导出PNG</button>
            </div>
          </div>
          <div v-if="showCreateSourceConfirmPanel" class="source-export-confirm source-create-confirm">
            <div class="source-export-confirm-title">新建数据源</div>
            <div class="source-export-confirm-row source-create-clone-row">
              <label class="source-export-option source-create-clone-option">
                <input v-model="createSourceCloneCurrent" type="checkbox" :disabled="!canCloneActivePredictSource" />
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
              <button class="io-btn" @click="cancelCreateSourceAction">取消</button>
              <button class="io-btn" @click="confirmCreateSourceAction">确认新建</button>
            </div>
          </div>
          <div v-if="screenshotStatusText" class="source-export-status">{{ screenshotStatusText }}</div>

          <div
            class="io-drop-zone source-drop-zone"
            :class="{ 'is-drag-over': isImportDragOver }"
            @dragenter.prevent="onImportDragEnter"
            @dragover.prevent="onImportDragOver"
            @dragleave.prevent="onImportDragLeave"
            @drop.prevent="onImportDrop"
          >
            <span class="io-drop-hint">拖拽 JSON 到此处可导入为新数据源</span>
          </div>
        </div>
      </Teleport>
      <input
        ref="predictImportInputRef"
        type="file"
        accept="application/json,.json"
        class="predict-import-input"
        @change="handleImportPredictsFile"
      />
    </div>

    <div v-if="showAppUpdateBanner" class="app-update-banner" role="status" aria-live="polite">
      <span class="app-update-text">检测到新版本已发布，刷新后可获取最新内容。</span>
      <button class="app-update-btn app-update-btn-muted" @click="openAppUpdatePromptModal">更新说明</button>
      <button class="app-update-btn" @click="reloadForAppUpdate">立即更新</button>
      <button class="app-update-btn app-update-btn-muted" @click="dismissAppUpdateBanner">稍后</button>
    </div>

    <div v-if="showAppUpdatePromptDialog" class="app-update-modal-mask" @click.self="dismissAppUpdateBanner">
      <div class="app-update-modal" role="dialog" aria-modal="true" aria-label="版本更新日志">
        <div class="app-update-modal-title">新版本已发布</div>
        <div class="app-update-modal-subtitle">构建号：{{ remoteAppBuildId || '未知' }}</div>
        <ul class="app-update-log-list">
          <li v-for="(item, idx) in appUpdateReleaseNotes" :key="`update-log-${idx}`">{{ item }}</li>
        </ul>
        <div class="app-update-modal-actions">
          <button class="app-update-btn" @click="reloadForAppUpdate">立即更新</button>
          <button class="app-update-btn app-update-btn-muted" @click="dismissAppUpdateBanner">稍后</button>
        </div>
      </div>
    </div>

    <div v-if="showAppReleaseLogModal" class="app-update-modal-mask" @click.self="closeAppReleaseLogModal">
      <div class="app-update-modal" role="dialog" aria-modal="true" aria-label="新版日志">
        <div class="app-update-modal-title">新版内容</div>
        <div class="app-update-modal-subtitle">当前版本：{{ currentAppBuildId || '未知' }}</div>
        <ul class="app-update-log-list">
          <li v-for="(item, idx) in currentBuildReleaseNotes" :key="`release-log-${idx}`">{{ item }}</li>
        </ul>
        <img src="/hello.jpg" class="app-release-log-image" alt="更新内容配图" loading="eager" fetchpriority="high" decoding="async" />
        <label class="app-release-log-skip-option">
          <input v-model="releaseLogSkipChecked" class="app-release-log-skip-checkbox" type="checkbox" />
          <span>此版本不再提示</span>
        </label>
        <div class="app-update-modal-actions">
          <button class="app-update-btn app-update-btn-muted" @click="closeAppReleaseLogModal">我知道了</button>
        </div>
      </div>
    </div>

    <div
      ref="contentAreaRef"
      class="content-area"
      :class="{ 'history-mode': currentTab === 'history' }"
      @scroll.passive="handleContentScroll"
    >
      <keep-alive>
        <component 
          ref="tabComponentRef"
          :is="tabs[currentTab]" 
          :all-events="totalEventData" 
          :all-cards="totalCardsData"
          :all-songs="songsData"
          :all-characters="charactersData"
          :all-base-cards="baseCards"
          :stats-preview-data="statsPreviewData"
          :preview-sync-event-id="previewSyncEventId"
          :jump-event-id="historyJumpEventId"
          :jump-event-seq="historyJumpSeq"
          @jump-to-event="handleStatsJumpToEvent"
          @stats-preview-update="handleStatsPreviewUpdate"
          @sync-preview-event-id="handlePreviewSyncEventId"
        />
      </keep-alive>
    </div>

    <button
      v-if="showBackToTopBtn"
      class="floating-top-btn"
      title="回到顶部"
      @click="scrollContentToTop"
    >
      <span class="floating-top-btn-icon">↑</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import CardStats from './components/CardStats.vue';
import EventHistory from './components/EventHistory.vue';
import SongStats from './components/SongStats.vue';

// --- 界面切换逻辑 (恢复原样) ---
const currentTab = ref('history');
const tabs = {
  stats: CardStats,
  history: EventHistory,
  songs: SongStats
};
const historyJumpEventId = ref(null);
const historyJumpSeq = ref(0);
const statsPreviewData = ref(null);
const previewSyncEventId = ref(null);
const tabComponentRef = ref(null);
const contentAreaRef = ref(null);
const statsScrollTop = ref(0);
const songsScrollTop = ref(0);
const tabCenterRatioMap = ref({ stats: 0.5, songs: 0.5 });
const showBackToTopBtn = ref(false);
const predictImportInputRef = ref(null);
const isImportDragOver = ref(false);
const sourceMenuOpen = ref(false);
const sourceDropdownRef = ref(null);
const sourceTriggerRef = ref(null);
const sourceMenuPanelRef = ref(null);
const sourceMenuStyle = ref({});
const predictUserName = ref('user');
const draggedSourceId = ref('');
const dragOverSourceId = ref('');
const isEditingPredictUserName = ref(false);
const isCompactTopNav = ref(false);
const isStatsTopNavCompact = ref(false);
const exportBirthdayRowsInPng = ref(true);
const experimentalHighQualityPng = ref(false);
const isScreenshotExporting = ref(false);
const screenshotStatusText = ref('');
const showScreenshotConfirmPanel = ref(false);
const showCreateSourceConfirmPanel = ref(false);
const createSourceCloneCurrent = ref(true);
const screenshotExportFileName = ref('');
const screenshotConfirmRange = ref({ firstId: '', lastId: '' });
const screenshotRangeStartId = ref('');
const screenshotRangeEndId = ref('');
const renameSourceTargetId = ref('');
const renameSourceDraftName = ref('');
const statsTopDisplayEventIdDraft = ref('');
const isEditingStatsTopDisplayEventId = ref(false);
const statsTopNavCollapsed = ref(true);
const statsTopNavAvailable = ref(false);
const statsTopAutoCurrentId = ref('');
const currentAppBuildId = String(__APP_BUILD_ID__ || '').trim();
const currentAppReleaseNotes = Array.isArray(__APP_RELEASE_NOTES__) ? __APP_RELEASE_NOTES__ : [];
const remoteAppBuildId = ref('');
const remoteAppReleaseNotes = ref([]);
const hasAppUpdate = ref(false);
const appUpdateDismissed = ref(false);
const showAppUpdatePromptModal = ref(false);
const showAppReleaseLogModal = ref(false);
const releaseLogSkipBuildId = ref('');
const releaseLogSkipChecked = ref(false);
const hasAutoShownReleaseLogThisVisit = ref(false);
let cleanupNoticeTimer = null;
let tabReflowObserver = null;
let tabReflowRaf = 0;
let appVersionCheckTimer = null;

const TAB_REFLOW_TRACK_KEYS = new Set(['stats']);
const APP_VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const APP_RELEASE_LOG_SKIP_KEY = 'pjsk_skip_release_log_build_id_v1';
const APP_UPDATE_DEBUG_REMOTE_KEY = 'pjsk_debug_remote_build_id_v1';

const appUpdateReleaseNotes = computed(() => {
  const list = Array.isArray(remoteAppReleaseNotes.value)
    ? remoteAppReleaseNotes.value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (list.length > 0) return list;
  return ['修复若干已知问题并优化交互体验。'];
});

const currentBuildReleaseNotes = computed(() => {
  const list = Array.isArray(currentAppReleaseNotes)
    ? currentAppReleaseNotes.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (list.length > 0) return list;
  return ['修复若干已知问题并优化交互体验。'];
});

const showAppUpdateBanner = computed(() => {
  return hasAppUpdate.value && !appUpdateDismissed.value;
});

const showAppUpdatePromptDialog = computed(() => {
  return showAppUpdateBanner.value && showAppUpdatePromptModal.value;
});

const isCurrentReleaseLogSkipped = computed(() => {
  const current = String(currentAppBuildId || '').trim();
  const skipped = String(releaseLogSkipBuildId.value || '').trim();
  return !!current && !!skipped && current === skipped;
});

const syncReleaseLogSkipChecked = () => {
  releaseLogSkipChecked.value = isCurrentReleaseLogSkipped.value;
};

const persistReleaseLogSkipChoice = () => {
  const current = String(currentAppBuildId || '').trim();
  if (!current) return;

  if (releaseLogSkipChecked.value) {
    releaseLogSkipBuildId.value = current;
    localStorage.setItem(APP_RELEASE_LOG_SKIP_KEY, current);
    return;
  }

  if (String(releaseLogSkipBuildId.value || '').trim() === current) {
    releaseLogSkipBuildId.value = '';
    localStorage.removeItem(APP_RELEASE_LOG_SKIP_KEY);
  }
};

const dismissAppUpdateBanner = () => {
  appUpdateDismissed.value = true;
  showAppUpdatePromptModal.value = false;
};

const openAppUpdatePromptModal = () => {
  if (!showAppUpdateBanner.value) return;
  showAppUpdatePromptModal.value = true;
};

const closeAppReleaseLogModal = () => {
  persistReleaseLogSkipChoice();
  showAppReleaseLogModal.value = false;
};

const openCurrentReleaseLogModal = () => {
  syncReleaseLogSkipChecked();
  showAppReleaseLogModal.value = true;
};

const reloadForAppUpdate = () => {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set('_update', String(Date.now()));
    window.location.replace(url.toString());
  }
};

const getDebugRemoteBuildId = () => {
  if (typeof window === 'undefined') return '';
  const host = String(window.location.hostname || '').trim().toLowerCase();
  const canDebug = host === 'localhost' || host === '127.0.0.1';
  if (!canDebug) return '';
  return String(localStorage.getItem(APP_UPDATE_DEBUG_REMOTE_KEY) || '').trim();
};

const fetchRemoteVersionMeta = async () => {
  try {
    const response = await fetch(`/version.json?ts=${Date.now()}`, {
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      buildId: String(data?.buildId || '').trim(),
      releaseNotes: Array.isArray(data?.releaseNotes) ? data.releaseNotes : []
    };
  } catch {
    return null;
  }
};

const checkForAppUpdate = async () => {
  if (!currentAppBuildId) return;
  const remoteMeta = await fetchRemoteVersionMeta();
  const debugRemoteBuildId = getDebugRemoteBuildId();
  const remoteBuildId = String(debugRemoteBuildId || remoteMeta?.buildId || '').trim();
  if (!remoteBuildId) return;

  remoteAppBuildId.value = remoteBuildId;
  remoteAppReleaseNotes.value = Array.isArray(remoteMeta?.releaseNotes) ? remoteMeta.releaseNotes : [];

  if (remoteBuildId !== currentAppBuildId) {
    hasAppUpdate.value = true;
    appUpdateDismissed.value = false;
    showAppUpdatePromptModal.value = true;
    return;
  }

  hasAppUpdate.value = false;
  showAppUpdatePromptModal.value = false;

  if (!hasAutoShownReleaseLogThisVisit.value && !isCurrentReleaseLogSkipped.value) {
    hasAutoShownReleaseLogThisVisit.value = true;
    openCurrentReleaseLogModal();
  }
};

const screenshotConfirmRangeText = computed(() => {
  const firstId = String(screenshotRangeStartId.value || screenshotConfirmRange.value.firstId || '').trim();
  const lastId = String(screenshotRangeEndId.value || screenshotConfirmRange.value.lastId || '').trim();
  if (!firstId || !lastId) return '';
  return `${firstId}~${lastId}`;
});

const normalizeRangeEventIdInput = (value) => String(value || '').replace(/\D+/g, '').trim();

const isHistoryPredictEditorOpen = computed(() => {
  if (currentTab.value !== 'history') return false;
  const id = Number(previewSyncEventId.value);
  return Number.isFinite(id) && id > 0;
});

const showStatsTopControlInNav = computed(() => currentTab.value === 'stats' && isStatsTopNavCompact.value);
const showPredictInfoInNav = computed(() => predictiveEvents.value.length > 0 && currentTab.value === 'history');

const PREDICT_SOURCES_KEY = 'pjsk_predict_sources_v1';
const PREDICT_ACTIVE_KEY = 'pjsk_predict_active_source_v1';
const LEGACY_PREDICT_KEY = 'pjsk_predict_data';
const PREDICT_USERNAME_KEY = 'pjsk_predict_user_name_v1';
const PREDICT_SOURCE_LIMIT = 30;

const handleStatsPreviewUpdate = (payload) => {
  statsPreviewData.value = payload || null;
};

const handlePreviewSyncEventId = (eventId) => {
  const n = Number(eventId);
  previewSyncEventId.value = Number.isFinite(n) && n > 0 ? n : null;
};

const requestHistoryJump = (eventId, retry = 18) => {
  const instance = tabComponentRef.value;
  const jumpFn = instance && typeof instance.jumpToEventById === 'function'
    ? instance.jumpToEventById
    : null;

  if (jumpFn) {
    const ok = jumpFn(eventId, 'auto');
    if (ok) return;
  }

  if (retry > 0) {
    setTimeout(() => {
      requestHistoryJump(eventId, retry - 1);
    }, 80);
  }
};

const getStatsTabInstance = () => {
  if (currentTab.value !== 'stats') return null;
  return tabComponentRef.value;
};

const syncStatsTopControlState = () => {
  if (!showStatsTopControlInNav.value) return;
  const instance = getStatsTabInstance();
  if (!instance || typeof instance.getTopBarState !== 'function') {
    statsTopNavAvailable.value = false;
    statsTopNavCollapsed.value = true;
    return;
  }

  const state = instance.getTopBarState() || {};
  const nextDraft = String(state.displayEventIdDraft ?? state.displayEventId ?? '');
  if (!isEditingStatsTopDisplayEventId.value) {
    statsTopDisplayEventIdDraft.value = nextDraft;
  }
  statsTopNavAvailable.value = !!state.isNavTopLayout;
  statsTopNavCollapsed.value = !!state.navCollapsed;
  statsTopAutoCurrentId.value = String(state.autoCurrentId ?? '');
};

const onStatsTopDisplayIdFocus = () => {
  isEditingStatsTopDisplayEventId.value = true;
};

const onStatsTopDisplayIdInput = (rawValue) => {
  statsTopDisplayEventIdDraft.value = String(rawValue ?? '');
  const instance = getStatsTabInstance();
  if (instance && typeof instance.setTopBarDisplayEventIdDraft === 'function') {
    instance.setTopBarDisplayEventIdDraft(statsTopDisplayEventIdDraft.value);
  }
};

const onStatsTopDisplayIdBlur = () => {
  isEditingStatsTopDisplayEventId.value = false;
  const instance = getStatsTabInstance();
  if (instance && typeof instance.applyTopBarDisplayEventId === 'function') {
    instance.applyTopBarDisplayEventId(statsTopDisplayEventIdDraft.value);
  }
  syncStatsTopControlState();
};

const adjustStatsTopDisplayEventId = (delta) => {
  const instance = getStatsTabInstance();
  if (instance && typeof instance.adjustTopBarDisplayEventId === 'function') {
    instance.adjustTopBarDisplayEventId(delta);
  }
  syncStatsTopControlState();
};

const resetStatsTopDisplayEventId = () => {
  isEditingStatsTopDisplayEventId.value = false;
  const instance = getStatsTabInstance();
  if (instance && typeof instance.resetTopBarDisplayEventId === 'function') {
    instance.resetTopBarDisplayEventId();
  }
  syncStatsTopControlState();
};

const toggleStatsTopNavMenu = () => {
  const instance = getStatsTabInstance();
  if (instance && typeof instance.toggleTopBarNavCollapsed === 'function') {
    instance.toggleTopBarNavCollapsed();
  }
  syncStatsTopControlState();
};

const saveStatsScroll = () => {
  if (currentTab.value !== 'stats') return;
  if (!contentAreaRef.value) return;
  statsScrollTop.value = contentAreaRef.value.scrollTop || 0;
};

const saveSongsScroll = () => {
  if (currentTab.value !== 'songs') return;
  if (!contentAreaRef.value) return;
  songsScrollTop.value = contentAreaRef.value.scrollTop || 0;
};

const saveActiveTabCenterRatio = () => {
  if (!TAB_REFLOW_TRACK_KEYS.has(currentTab.value)) return;
  const el = contentAreaRef.value;
  if (!el) return;
  const ratio = (el.scrollTop + el.clientHeight / 2) / Math.max(1, el.scrollHeight);
  tabCenterRatioMap.value = {
    ...tabCenterRatioMap.value,
    [currentTab.value]: Math.max(0, Math.min(1, ratio))
  };
};

const restoreActiveTabCenterRatio = () => {
  if (!TAB_REFLOW_TRACK_KEYS.has(currentTab.value)) return;
  const el = contentAreaRef.value;
  if (!el) return;
  const ratio = Number(tabCenterRatioMap.value[currentTab.value]);
  if (!Number.isFinite(ratio)) return;
  const targetTop = ratio * el.scrollHeight - el.clientHeight / 2;
  const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
  const nextTop = Math.max(0, Math.min(maxTop, targetTop));
  el.scrollTop = nextTop;
  if (currentTab.value === 'stats') {
    statsScrollTop.value = nextTop;
  } else if (currentTab.value === 'songs') {
    songsScrollTop.value = nextTop;
  }
};

const scheduleRestoreActiveTabCenterRatio = () => {
  if (tabReflowRaf) {
    cancelAnimationFrame(tabReflowRaf);
  }
  tabReflowRaf = requestAnimationFrame(() => {
    tabReflowRaf = 0;
    restoreActiveTabCenterRatio();
  });
};

const bindActiveTabReflowObserver = async () => {
  if (tabReflowObserver) {
    tabReflowObserver.disconnect();
    tabReflowObserver = null;
  }
  if (!TAB_REFLOW_TRACK_KEYS.has(currentTab.value)) return;
  if (typeof ResizeObserver === 'undefined') return;

  await nextTick();
  const host = contentAreaRef.value;
  if (!host) return;
  const root = host.querySelector('.pjsk-stats, .pjsk-song-stats');
  if (!root) return;

  tabReflowObserver = new ResizeObserver(() => {
    scheduleRestoreActiveTabCenterRatio();
  });

  const targets = [
    root,
    root.querySelector('.stats-nav'),
    root.querySelector('.stats-layout'),
    root.querySelector('.stats-main'),
    root.querySelector('.stats-grid')
  ].filter(Boolean);

  Array.from(new Set(targets)).forEach((target) => {
    tabReflowObserver.observe(target);
  });
};

const handleContentScroll = () => {
  if (contentAreaRef.value) {
    showBackToTopBtn.value = contentAreaRef.value.scrollTop > 260;
  }
  saveStatsScroll();
  saveSongsScroll();
  saveActiveTabCenterRatio();
};

const scrollContentToTop = () => {
  if (!contentAreaRef.value) return;
  contentAreaRef.value.scrollTo({ top: 0, behavior: 'smooth' });
};

const setCurrentTab = (tab) => {
  if (tab === currentTab.value) return;
  saveActiveTabCenterRatio();
  if (currentTab.value === 'stats') {
    saveStatsScroll();
  } else if (currentTab.value === 'songs') {
    saveSongsScroll();
  }
  currentTab.value = tab;
};

const handleStatsJumpToEvent = async (eventId) => {
  const id = String(eventId ?? '').trim();
  if (!id) return;

  saveStatsScroll();
  historyJumpEventId.value = id;
  historyJumpSeq.value += 1;
  setCurrentTab('history');
  await nextTick();
  requestHistoryJump(id);
};

watch(currentTab, async (nextTab, prevTab) => {
  if (nextTab === 'stats') {
    await nextTick();
    if (contentAreaRef.value) {
      contentAreaRef.value.scrollTop = statsScrollTop.value;
    }
    syncStatsTopControlState();
    return;
  }
  if (nextTab === 'songs') {
    await nextTick();
    if (contentAreaRef.value) {
      contentAreaRef.value.scrollTop = songsScrollTop.value;
    }
  }
  saveActiveTabCenterRatio();
  await bindActiveTabReflowObserver();
});

const handleStatsSongsViewportResize = () => {
  if (!TAB_REFLOW_TRACK_KEYS.has(currentTab.value)) return;
  saveActiveTabCenterRatio();
  scheduleRestoreActiveTabCenterRatio();
};

watch(() => tabComponentRef.value, async () => {
  if (currentTab.value !== 'stats') return;
  await nextTick();
  syncStatsTopControlState();
});

watch(showStatsTopControlInNav, async (show) => {
  if (!show) {
    isEditingStatsTopDisplayEventId.value = false;
    return;
  }
  await nextTick();
  syncStatsTopControlState();
});

// --- 数据管理逻辑 (新增预测支持) ---
const historyData = ref([]);      // 既定的历史 JSON 数据
const baseCards = ref([]); // 新增：存储基础卡片库
const songsData = ref([]);
const charactersData = ref([]);
const predictiveEvents = ref([]); // 用户填写的预测数据
const cleanedPatchNoticeCount = ref(0);
const predictSources = ref([]);
const activePredictSourceId = ref('');

const clonePredictList = (list) => JSON.parse(JSON.stringify(Array.isArray(list) ? list : []));

const buildPredictSourceId = () => {
  const rand = Math.random().toString(36).slice(2, 8);
  return `src_${Date.now()}_${rand}`;
};

const normalizeUserName = (name) => {
  const compact = String(name || '').trim().replace(/\s+/g, '');
  return compact || 'user';
};

const escapeRegExp = (text) => String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const detectSourceKind = (kindRaw, nameRaw) => {
  const kind = String(kindRaw || '').trim();
  if (kind === 'import' || kind === 'local') return kind;
  const name = String(nameRaw || '').trim();
  if (name.startsWith('导入预测-')) return 'import';
  return 'local';
};

const SOURCE_PREFIX_MAP = {
  local: '我的预测',
  import: '导入预测'
};

const getSourceNamePrefix = (kind) => SOURCE_PREFIX_MAP[kind] || SOURCE_PREFIX_MAP.local;

const getNextSourceSerial = (kind, ownerName) => {
  const prefix = getSourceNamePrefix(kind);
  const owner = normalizeUserName(ownerName);
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-${escapeRegExp(owner)}-(\\d+)$`);
  let maxNo = 0;
  for (const source of (predictSources.value || [])) {
    const match = String(source?.name || '').trim().match(pattern);
    if (!match) continue;
    const seq = Number(match[1]);
    if (Number.isFinite(seq)) maxNo = Math.max(maxNo, seq);
  }
  return maxNo + 1;
};

const buildAutoSourceName = (kind, ownerName) => {
  const prefix = getSourceNamePrefix(kind);
  const owner = normalizeUserName(ownerName);
  const serial = getNextSourceSerial(kind, owner);
  return `${prefix}-${owner}-${serial}`;
};

const normalizeSourceName = (name) => String(name || '').trim() || '我的预测';

const makeUniqueSourceName = (desiredName) => {
  const base = normalizeSourceName(desiredName);
  const existing = new Set((predictSources.value || []).map((s) => String(s?.name || '').trim()));
  if (!existing.has(base)) return base;
  for (let i = 2; i <= 999; i += 1) {
    const nextName = `${base} ${i}`;
    if (!existing.has(nextName)) return nextName;
  }
  return `${base} ${Date.now()}`;
};

const normalizePredictSource = (source, index = 0) => {
  const id = String(source?.id || '').trim() || buildPredictSourceId();
  const kind = detectSourceKind(source?.kind, source?.name);
  const ownerName = normalizeUserName(source?.ownerName || predictUserName.value);
  const fallbackName = `${getSourceNamePrefix(kind)}-${ownerName}-${index + 1}`;
  const nameRaw = normalizeSourceName(source?.name || fallbackName);
  return {
    id,
    name: nameRaw,
    kind,
    ownerName,
    predictiveEvents: clonePredictList(source?.predictiveEvents),
    createdAt: String(source?.createdAt || new Date().toISOString()),
    updatedAt: String(source?.updatedAt || new Date().toISOString())
  };
};

const persistPredictSources = () => {
  localStorage.setItem(PREDICT_SOURCES_KEY, JSON.stringify(predictSources.value));
  localStorage.setItem(PREDICT_ACTIVE_KEY, String(activePredictSourceId.value || ''));
};

const activePredictSource = computed(() => {
  return (predictSources.value || []).find((s) => s.id === activePredictSourceId.value) || null;
});

const activePredictSourceName = computed(() => activePredictSource.value?.name || '未命名数据源');
const activePredictSourcePredictCount = computed(() => {
  const list = activePredictSource.value?.predictiveEvents;
  return Array.isArray(list) ? list.length : 0;
});
const canCloneActivePredictSource = computed(() => activePredictSourcePredictCount.value > 0);

const setCleanedPatchNoticeCount = (count, autoHideMs = 0) => {
  cleanedPatchNoticeCount.value = Math.max(0, Number(count) || 0);
  if (cleanupNoticeTimer) {
    clearTimeout(cleanupNoticeTimer);
    cleanupNoticeTimer = null;
  }
  if (cleanedPatchNoticeCount.value > 0 && autoHideMs > 0) {
    cleanupNoticeTimer = setTimeout(() => {
      cleanedPatchNoticeCount.value = 0;
      cleanupNoticeTimer = null;
    }, autoHideMs);
  }
};

const isLocalSource = (source) => detectSourceKind(source?.kind, source?.name) === 'local';

const relabelLocalSourcesByUser = (userName) => {
  const normalizedUser = normalizeUserName(userName);
  let localSeq = 0;
  predictSources.value = (predictSources.value || []).map((source) => {
    if (!isLocalSource(source)) return source;
    localSeq += 1;
    return {
      ...source,
      ownerName: normalizedUser,
      name: `${SOURCE_PREFIX_MAP.local}-${normalizedUser}-${localSeq}`,
      updatedAt: new Date().toISOString()
    };
  });
};

const syncCurrentPredictsToActiveSource = () => {
  const target = activePredictSource.value;
  if (!target) return;
  target.predictiveEvents = clonePredictList(predictiveEvents.value);
  target.updatedAt = new Date().toISOString();
  persistPredictSources();
};

const switchPredictSource = (sourceId) => {
  const next = (predictSources.value || []).find((s) => s.id === sourceId);
  if (!next) return;
  syncCurrentPredictsToActiveSource();
  activePredictSourceId.value = next.id;
  predictiveEvents.value = clonePredictList(next.predictiveEvents);
  setCleanedPatchNoticeCount(0);
  persistPredictSources();
};

const createPredictSource = ({ name, predictiveList = [], kind = 'local', ownerName = '', switchTo = true }) => {
  if ((predictSources.value || []).length >= PREDICT_SOURCE_LIMIT) {
    alert(`数据源数量已达到上限（${PREDICT_SOURCE_LIMIT}）。请先删除不需要的数据源。`);
    return null;
  }

  const normalizedKind = detectSourceKind(kind, name);
  const normalizedOwner = normalizeUserName(ownerName || predictUserName.value);
  const nowIso = new Date().toISOString();
  const source = {
    id: buildPredictSourceId(),
    name: makeUniqueSourceName(name || buildAutoSourceName(normalizedKind, normalizedOwner)),
    kind: normalizedKind,
    ownerName: normalizedOwner,
    predictiveEvents: clonePredictList(predictiveList),
    createdAt: nowIso,
    updatedAt: nowIso
  };
  predictSources.value = [...predictSources.value, source];
  if (switchTo) {
    activePredictSourceId.value = source.id;
    predictiveEvents.value = clonePredictList(source.predictiveEvents);
  }
  persistPredictSources();
  return source;
};

const openCreateSourceConfirm = () => {
  if ((predictSources.value || []).length >= PREDICT_SOURCE_LIMIT) {
    alert(`数据源数量已达到上限（${PREDICT_SOURCE_LIMIT}）。请先删除不需要的数据源。`);
    return;
  }
  renameSourceTargetId.value = '';
  renameSourceDraftName.value = '';
  showScreenshotConfirmPanel.value = false;
  screenshotStatusText.value = '';
  createSourceCloneCurrent.value = canCloneActivePredictSource.value;
  showCreateSourceConfirmPanel.value = !showCreateSourceConfirmPanel.value;
};

const cancelCreateSourceAction = () => {
  showCreateSourceConfirmPanel.value = false;
  createSourceCloneCurrent.value = canCloneActivePredictSource.value;
};

const confirmCreateSourceAction = () => {
  const owner = normalizeUserName(predictUserName.value);
  const current = activePredictSource.value;
  const currentList = Array.isArray(current?.predictiveEvents) ? current.predictiveEvents : [];
  const shouldClone = canCloneActivePredictSource.value && createSourceCloneCurrent.value;
  const initialList = shouldClone ? clonePredictList(currentList) : [];

  const created = createPredictSource({
    kind: 'local',
    ownerName: owner,
    predictiveList: initialList,
    switchTo: true
  });
  if (created) {
    setCleanedPatchNoticeCount(0);
    showCreateSourceConfirmPanel.value = false;
    createSourceCloneCurrent.value = canCloneActivePredictSource.value;
    const suffix = initialList.length > 0 ? `（已复制 ${initialList.length} 条预测）` : '（空白）';
    screenshotStatusText.value = `已创建并切换到新数据源：${created.name}${suffix}`;
    setTimeout(() => {
      if (screenshotStatusText.value.startsWith('已创建并切换到新数据源：')) {
        screenshotStatusText.value = '';
      }
    }, 1800);
  }
};

const deleteActivePredictSource = () => {
  if (predictSources.value.length <= 1) {
    alert('至少保留一个数据源。');
    return;
  }
  const current = activePredictSource.value;
  if (!current) return;
  const ok = confirm(`确定删除数据源「${current.name}」吗？`);
  if (!ok) return;

  const remain = predictSources.value.filter((s) => s.id !== current.id);
  predictSources.value = remain;
  const fallback = remain[0] || null;
  activePredictSourceId.value = fallback?.id || '';
  predictiveEvents.value = clonePredictList(fallback?.predictiveEvents);
  setCleanedPatchNoticeCount(0);
  persistPredictSources();
};

const toggleSourceMenu = () => {
  if (isHistoryPredictEditorOpen.value) return;
  sourceMenuOpen.value = !sourceMenuOpen.value;
  if (!sourceMenuOpen.value) {
    renameSourceTargetId.value = '';
    renameSourceDraftName.value = '';
  }
};

const startRenamePredictSource = (sourceId) => {
  const target = (predictSources.value || []).find((s) => s.id === sourceId);
  if (!target) return;
  showScreenshotConfirmPanel.value = false;
  showCreateSourceConfirmPanel.value = false;
  renameSourceTargetId.value = target.id;
  renameSourceDraftName.value = String(target.name || '').trim() || '未命名数据源';
};

const cancelRenamePredictSourceAction = () => {
  renameSourceTargetId.value = '';
  renameSourceDraftName.value = '';
};

const confirmRenamePredictSourceAction = () => {
  const target = (predictSources.value || []).find((s) => s.id === renameSourceTargetId.value);
  if (!target) {
    cancelRenamePredictSourceAction();
    return;
  }

  const nextNameRaw = String(renameSourceDraftName.value || '').trim();
  if (!nextNameRaw) {
    alert('名称不能为空。');
    return;
  }

  const duplicate = (predictSources.value || []).some((s) => s.id !== target.id && String(s?.name || '').trim() === nextNameRaw);
  if (duplicate) {
    alert('名称已存在，请使用其他名称。');
    return;
  }

  predictSources.value = (predictSources.value || []).map((s) => {
    if (s.id !== target.id) return s;
    return {
      ...s,
      name: nextNameRaw,
      updatedAt: new Date().toISOString()
    };
  });
  persistPredictSources();
  cancelRenamePredictSourceAction();
};

const onSourceDragStart = (sourceId, event) => {
  draggedSourceId.value = String(sourceId || '');
  dragOverSourceId.value = '';
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedSourceId.value);
  }
};

const onSourceDragOver = (sourceId, event) => {
  if (!draggedSourceId.value || draggedSourceId.value === sourceId) return;
  dragOverSourceId.value = String(sourceId || '');
  if (event?.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
};

const onSourceDragLeave = (sourceId, event) => {
  const currentTarget = event?.currentTarget;
  const nextTarget = event?.relatedTarget;
  if (currentTarget && nextTarget && currentTarget.contains(nextTarget)) return;
  if (dragOverSourceId.value === sourceId) {
    dragOverSourceId.value = '';
  }
};

const onSourceDrop = (targetSourceId, event) => {
  const fromId = String(draggedSourceId.value || event?.dataTransfer?.getData('text/plain') || '').trim();
  const toId = String(targetSourceId || '').trim();
  dragOverSourceId.value = '';
  draggedSourceId.value = '';
  if (!fromId || !toId || fromId === toId) return;

  const list = [...(predictSources.value || [])];
  const fromIndex = list.findIndex((s) => s.id === fromId);
  const toIndex = list.findIndex((s) => s.id === toId);
  if (fromIndex < 0 || toIndex < 0) return;

  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);
  predictSources.value = list;
  persistPredictSources();
};

const onSourceDragEnd = () => {
  draggedSourceId.value = '';
  dragOverSourceId.value = '';
};

const movePredictSource = (sourceId, delta) => {
  const list = [...(predictSources.value || [])];
  const fromIndex = list.findIndex((s) => s.id === sourceId);
  if (fromIndex < 0) return;
  const toIndex = fromIndex + Number(delta || 0);
  if (toIndex < 0 || toIndex >= list.length) return;
  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);
  predictSources.value = list;
  persistPredictSources();
};

const updateCompactTopNav = () => {
  if (typeof window === 'undefined') return;
  isCompactTopNav.value = window.innerWidth <= 900;
  isStatsTopNavCompact.value = window.innerWidth <= 900;
  syncStatsTopControlState();
};

const updateSourceMenuPosition = () => {
  if (typeof window === 'undefined') return;
  if (!sourceMenuOpen.value) return;
  const trigger = sourceTriggerRef.value;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const compact = vw <= 900;
  const minWidth = compact ? 250 : 320;
  const maxWidth = compact ? 360 : 420;
  const width = Math.max(Math.min(maxWidth, vw - 12), Math.min(minWidth, vw - 12));
  const left = Math.max(6, Math.min(vw - width - 6, rect.right - width));
  const top = Math.max(6, rect.bottom + 6);
  const maxHeight = Math.max(180, vh - top - 8);

  sourceMenuStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
    overflowY: 'auto',
    zIndex: 4200
  };
};

const onPredictUserFocus = () => {
  isEditingPredictUserName.value = true;
};

const onPredictUserBlur = () => {
  isEditingPredictUserName.value = false;
  const raw = String(predictUserName.value || '').replace(/\s+/g, '');
  if (raw !== predictUserName.value) {
    predictUserName.value = raw;
    return;
  }
  if (!raw) return;
  const normalized = normalizeUserName(raw);
  if (normalized !== raw) {
    predictUserName.value = normalized;
  }
};

const hasValidEventTitle = (value) => String(value || '').trim().length > 0;
const hasValidGachaName = (value) => String(value || '').trim().length > 0;
const isJsonEventOfficialRevealed = (event) => {
  if (!event || typeof event !== 'object') return false;
  return hasValidEventTitle(event.event_title) && hasValidGachaName(event.gacha_title);
};

const getCurrentOfficialEventId = () => {
  const today = new Date();
  const ids = (historyData.value || [])
    .filter((ev) => {
      const idNum = Number(ev?.id);
      if (!Number.isFinite(idNum)) return false;
      if (!hasValidEventTitle(ev?.event_title)) return false;
      const d = new Date(String(ev?.date || '').replace(/\//g, '-'));
      if (Number.isNaN(d.getTime())) return false;
      return d <= today;
    })
    .map((ev) => Number(ev.id));
  return ids.length ? Math.max(...ids) : -1;
};

const getCurrentJsonRevealedEventId = () => {
  const ids = (historyData.value || [])
    .filter((ev) => {
      const idNum = Number(ev?.id);
      if (!Number.isFinite(idNum)) return false;
      return isJsonEventOfficialRevealed(ev);
    })
    .map((ev) => Number(ev.id));
  return ids.length ? Math.max(...ids) : -1;
};

const getCurrentPredictLockEventId = () => {
  const byDate = getCurrentOfficialEventId();
  const byReveal = getCurrentJsonRevealedEventId();
  return Math.max(byDate, byReveal);
};

const getPredictableEventIdRange = () => {
  const lockId = getCurrentPredictLockEventId();
  const ids = (historyData.value || [])
    .map((ev) => Number(ev?.id))
    .filter((id) => Number.isFinite(id) && id > lockId)
    .sort((a, b) => a - b);

  if (!ids.length) {
    return { ok: false, minId: 0, maxId: 0, lockId };
  }

  return {
    ok: true,
    minId: ids[0],
    maxId: ids[ids.length - 1],
    lockId
  };
};

const getSourceEventById = (eventId) => {
  const idNum = Number(eventId);
  if (!Number.isFinite(idNum)) return null;
  return (historyData.value || []).find((ev) => Number(ev?.id) === idNum) || null;
};

const normalizeWorldLinkPatch = (patch) => {
  if (!patch || typeof patch !== 'object') return patch;
  const sourceEvent = getSourceEventById(patch.id);
  const sourceType = String(sourceEvent?.event_type || '').trim();
  const sourceSid = Number(sourceEvent?.type_series_id);
  const isNonTeamWorldLink = sourceType === 'World Link' && (!Number.isFinite(sourceSid) || sourceSid > 2 || sourceSid <= 0);
  if (!isNonTeamWorldLink) return patch;

  return {
    ...patch,
    banner: '',
    unit: ''
  };
};

const filterOutdatedPredictiveEvents = (list) => {
  const currentOfficialId = getCurrentPredictLockEventId();
  if (!Number.isFinite(currentOfficialId) || currentOfficialId < 0) return [...(list || [])];
  return (list || []).filter((ev) => {
    const idNum = Number(ev?.id);
    if (!Number.isFinite(idNum)) return false;
    // 当期及以前的 patch 一律视为过期冲突并清理。
    return idNum > currentOfficialId;
  });
};

const sanitizePredictiveEvents = (list) => {
  return (list || []).map((ev) => normalizeWorldLinkPatch(ev));
};

const reconcilePredictiveEvents = (list) => {
  const normalized = sanitizePredictiveEvents(list);
  const filtered = filterOutdatedPredictiveEvents(normalized);
  return filtered;
};

const buildPredictExportPayload = (list) => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  source: 'pjsk-planner',
  owner: normalizeUserName(predictUserName.value),
  predictiveEvents: Array.isArray(list) ? list : []
});

const sanitizeExportFileName = (name) => {
  const raw = String(name || '').trim();
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim();
  return cleaned || 'pjsk_predict_backup';
};

const exportPredicts = () => {
  try {
    const payload = buildPredictExportPayload(predictiveEvents.value);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const userName = sanitizeExportFileName(normalizeUserName(predictUserName.value));
    const finalBaseName = sanitizeExportFileName(`pjsk-${userName}-${y}${m}${d}`);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${finalBaseName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出预测失败', error);
    alert('导出失败，请稍后重试。');
  }
};

const prepareScreenshotExport = async () => {
  const sourceName = String(activePredictSourceName.value || '').trim() || '预测数据源';
  const userName = sanitizeExportFileName(normalizeUserName(predictUserName.value));
  const defaultBaseName = sanitizeExportFileName(`pjsk-${userName}-${sourceName}-预测截图`);

  if (currentTab.value !== 'history') {
    setCurrentTab('history');
    await nextTick();
  }

  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const instance = tabComponentRef.value;
  if (!instance || typeof instance.exportPredictedRangePng !== 'function') {
    return { ok: false, message: '历史页面尚未准备完成，请稍后重试。' };
  }
  if (typeof instance.getPredictedExportRangeInfo !== 'function') {
    return { ok: false, message: '历史页面尚未准备完成，请稍后重试。' };
  }

  const rangeInfo = instance.getPredictedExportRangeInfo(!!exportBirthdayRowsInPng.value);
  if (!rangeInfo?.ok) {
    return { ok: false, message: rangeInfo?.message || '导出失败，请稍后重试。' };
  }

  return {
    ok: true,
    defaultBaseName,
    firstId: String(rangeInfo.firstEventId || '').trim(),
    lastId: String(rangeInfo.lastEventId || '').trim()
  };
};

const openScreenshotExportConfirm = async () => {
  if (isScreenshotExporting.value) return;
  renameSourceTargetId.value = '';
  renameSourceDraftName.value = '';
  showCreateSourceConfirmPanel.value = false;
  screenshotStatusText.value = '正在准备截图范围...';
  try {
    const prepared = await prepareScreenshotExport();
    if (!prepared.ok) {
      alert(prepared.message || '导出失败，请稍后重试。');
      showScreenshotConfirmPanel.value = false;
      return;
    }
    screenshotConfirmRange.value = { firstId: prepared.firstId, lastId: prepared.lastId };
    screenshotRangeStartId.value = prepared.firstId;
    screenshotRangeEndId.value = prepared.lastId;
    screenshotExportFileName.value = prepared.defaultBaseName;
    showScreenshotConfirmPanel.value = true;
    screenshotStatusText.value = '';
  } catch (error) {
    console.error('准备截图导出失败', error);
    alert('导出失败，请稍后重试。');
    showScreenshotConfirmPanel.value = false;
    screenshotStatusText.value = '';
  }
};

const cancelScreenshotExport = () => {
  if (isScreenshotExporting.value) return;
  showScreenshotConfirmPanel.value = false;
  screenshotRangeStartId.value = '';
  screenshotRangeEndId.value = '';
};

const confirmScreenshotExport = async () => {
  if (isScreenshotExporting.value) return;
  try {
    const sourceName = String(activePredictSourceName.value || '').trim() || '预测数据源';
    const userName = sanitizeExportFileName(normalizeUserName(predictUserName.value));
    const defaultBaseName = sanitizeExportFileName(`pjsk-${userName}-${sourceName}-预测截图`);

    isScreenshotExporting.value = true;
    screenshotStatusText.value = '正在截图，请等待...';

    if (currentTab.value !== 'history') {
      setCurrentTab('history');
      await nextTick();
    }

    await nextTick();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const instance = tabComponentRef.value;
    if (!instance || typeof instance.exportPredictedRangePng !== 'function') {
      alert('历史页面尚未准备完成，请稍后重试。');
      return;
    }

    const fileBaseName = sanitizeExportFileName(String(screenshotExportFileName.value || '').trim() || defaultBaseName);
    const rangeStartId = normalizeRangeEventIdInput(screenshotRangeStartId.value || screenshotConfirmRange.value.firstId);
    const rangeEndId = normalizeRangeEventIdInput(screenshotRangeEndId.value || screenshotConfirmRange.value.lastId);

    if (!rangeStartId || !rangeEndId) {
      alert('请输入有效的起止活动ID。');
      return;
    }

    const predictableRange = getPredictableEventIdRange();
    if (!predictableRange.ok) {
      alert('当前没有可预测活动，无法导出截图。');
      return;
    }

    const startNum = Number(rangeStartId);
    const endNum = Number(rangeEndId);
    const minSelected = Math.min(startNum, endNum);
    const maxSelected = Math.max(startNum, endNum);
    if (minSelected < predictableRange.minId || maxSelected > predictableRange.maxId) {
      alert(`活动ID需在可预测范围内：${predictableRange.minId}~${predictableRange.maxId}`);
      return;
    }

    const result = await instance.exportPredictedRangePng({
      includeBirthdayRows: !!exportBirthdayRowsInPng.value,
      fileBaseName,
      experimentalHQ: !!experimentalHighQualityPng.value,
      rangeStartId,
      rangeEndId
    });

    if (!result?.ok) {
      alert(result?.message || '导出失败，请稍后重试。');
    } else {
      showScreenshotConfirmPanel.value = false;
      screenshotRangeStartId.value = '';
      screenshotRangeEndId.value = '';
      screenshotStatusText.value = '截图导出完成。';
      setTimeout(() => {
        screenshotStatusText.value = '';
      }, 1800);
    }
  } catch (error) {
    console.error('导出预测截图失败', error);
    alert('导出失败，请稍后重试。');
  } finally {
    isScreenshotExporting.value = false;
    if (screenshotStatusText.value && screenshotStatusText.value !== '截图导出完成。') {
      screenshotStatusText.value = '';
    }
  }
};

const triggerImportPredicts = () => {
  if (!predictImportInputRef.value) return;
  predictImportInputRef.value.value = '';
  predictImportInputRef.value.click();
};

const parseImportedPredictList = (rawText) => {
  const parsed = JSON.parse(rawText);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.predictiveEvents)) return parsed.predictiveEvents;
  return null;
};

const parseOwnerFromImportFileName = (fileName) => {
  const base = String(fileName || '').trim().replace(/\.[^.]+$/, '');
  const match = base.match(/^pjsk-(.+)-(\d{8})$/i);
  if (!match) return null;
  return normalizeUserName(match[1]);
};

const validateImportedPredictList = (list) => {
  if (!Array.isArray(list)) {
    return { ok: false, message: '文件格式错误：顶层必须是数组，或包含 predictiveEvents 数组。' };
  }

  for (let i = 0; i < list.length; i += 1) {
    const row = list[i];
    if (!row || typeof row !== 'object') {
      return { ok: false, message: `第 ${i + 1} 条记录不是对象。` };
    }
    const idNum = Number(row.id);
    if (!Number.isFinite(idNum)) {
      return { ok: false, message: `第 ${i + 1} 条记录缺少有效 id。` };
    }
    if (row.memberCards != null && !Array.isArray(row.memberCards)) {
      return { ok: false, message: `第 ${i + 1} 条记录的 memberCards 不是数组。` };
    }
  }

  return { ok: true };
};

const applyImportedPredicts = (importedRawList, fileName = '') => {
  const normalizedImported = (importedRawList || []).map((item) => ({
    ...(item || {}),
    id: Number(item?.id)
  })).filter((item) => Number.isFinite(item.id));

  const reconciled = reconcilePredictiveEvents(normalizedImported);
  const cleaned = Math.max(0, normalizedImported.length - reconciled.length);
  if (reconciled.length === 0) {
    alert('导入结果没有有效预测（可能已被自动清理为过期/冲突，或原文件本就为空），不会创建数据源。');
    return;
  }

  const parsedOwner = parseOwnerFromImportFileName(fileName);
  const owner = normalizeUserName(parsedOwner || predictUserName.value);
  const source = createPredictSource({
    kind: 'import',
    ownerName: owner,
    predictiveList: reconciled,
    switchTo: true
  });
  if (!source) return;
  setCleanedPatchNoticeCount(cleaned, 4200);
  alert(`导入完成：已创建数据源「${source.name}」，有效预测 ${reconciled.length} 条，清理 ${cleaned} 条。`);
};

const importPredictsFromFile = async (file) => {
  const text = await file.text();
  const importedRawList = parseImportedPredictList(text);
  if (!importedRawList) {
    alert('导入失败：文件格式不正确。');
    return;
  }

  const validation = validateImportedPredictList(importedRawList);
  if (!validation.ok) {
    alert(`导入失败：${validation.message}`);
    return;
  }

  const ok = confirm('确认导入吗？将基于文件创建一个新的预测数据源，不会覆盖现有数据源。');
  if (!ok) return;

  applyImportedPredicts(importedRawList, file?.name || '');
};

const handleImportPredictsFile = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  try {
    await importPredictsFromFile(file);
  } catch (error) {
    console.error('导入预测失败', error);
    alert('导入失败：请确认 JSON 文件内容有效。');
  }
};

const onImportDragEnter = () => {
  isImportDragOver.value = true;
};

const onImportDragOver = () => {
  isImportDragOver.value = true;
};

const onImportDragLeave = (event) => {
  const zone = event.currentTarget;
  const nextTarget = event.relatedTarget;
  if (zone && nextTarget && zone.contains(nextTarget)) return;
  isImportDragOver.value = false;
};

const onImportDrop = async (event) => {
  isImportDragOver.value = false;
  const file = event?.dataTransfer?.files?.[0];
  if (!file) return;
  try {
    await importPredictsFromFile(file);
  } catch (error) {
    console.error('拖拽导入失败', error);
    alert('导入失败：请确认 JSON 文件内容有效。');
  }
};

const effectivePredictiveEvents = computed(() => reconcilePredictiveEvents(predictiveEvents.value));

onMounted(async () => {
  try {
    predictUserName.value = normalizeUserName(localStorage.getItem(PREDICT_USERNAME_KEY) || 'user');
    const rawSources = localStorage.getItem(PREDICT_SOURCES_KEY);
    const rawActive = localStorage.getItem(PREDICT_ACTIVE_KEY);
    let loadedSources = [];

    if (rawSources) {
      const parsed = JSON.parse(rawSources);
      if (Array.isArray(parsed)) {
        loadedSources = parsed.map((item, idx) => normalizePredictSource(item, idx));
      }
    }

    // 兼容旧版单数据源缓存
    if (!loadedSources.length) {
      const legacyRaw = localStorage.getItem(LEGACY_PREDICT_KEY);
      let legacyList = [];
      if (legacyRaw) {
        try {
          const parsedLegacy = JSON.parse(legacyRaw);
          legacyList = Array.isArray(parsedLegacy) ? parsedLegacy : [];
        } catch {
          legacyList = [];
        }
      }
      const nowIso = new Date().toISOString();
      loadedSources = [{
        id: buildPredictSourceId(),
        name: `我的预测-${predictUserName.value}-1`,
        kind: 'local',
        ownerName: predictUserName.value,
        predictiveEvents: clonePredictList(legacyList),
        createdAt: nowIso,
        updatedAt: nowIso
      }];
    }

    // 名称去重
    const dedupNameSet = new Set();
    loadedSources = loadedSources.map((source, idx) => {
      let name = normalizeSourceName(source.name || `我的预测 ${idx + 1}`);
      if (dedupNameSet.has(name)) {
        let i = 2;
        while (dedupNameSet.has(`${name} ${i}`)) i += 1;
        name = `${name} ${i}`;
      }
      dedupNameSet.add(name);
      return { ...source, name };
    });

    predictSources.value = loadedSources;
    const activeId = loadedSources.some((s) => s.id === rawActive) ? rawActive : loadedSources[0].id;
    activePredictSourceId.value = activeId;
    predictiveEvents.value = clonePredictList((loadedSources.find((s) => s.id === activeId) || loadedSources[0]).predictiveEvents);
    persistPredictSources();

    // 同时请求活动、卡片、歌曲与角色数据
    const [resEvents, resCards, resSongs, resCharacters] = await Promise.all([
      fetch('/data/pjsk_events.json'),
      fetch('/data/pjsk_cards.json'),
      fetch('/data/pjsk_songs.json'),
      fetch('/data/pjsk_characters.json')
    ]);
    
    historyData.value = await resEvents.json();
    baseCards.value = await resCards.json();
    songsData.value = await resSongs.json();
    charactersData.value = await resCharacters.json();
    const beforeCount = predictiveEvents.value.length;
    const reconciled = reconcilePredictiveEvents(predictiveEvents.value);
    predictiveEvents.value = reconciled;
    syncCurrentPredictsToActiveSource();
    setCleanedPatchNoticeCount(Math.max(0, beforeCount - reconciled.length), 4200);
    
    console.log("数据加载成功:", historyData.value.length, "条活动,", baseCards.value.length, "张卡片");
  } catch (e) {
    console.error("加载失败:", e);
  }
});

const normalizeText = (v) => String(v || '').trim().toLowerCase();

const getWorldLinkCardKey = (card) => {
  return `${normalizeText(card?.Name)}|${normalizeText(card?.Affiliation)}|${String(card?.Rarity || '')}`;
};

const mergeWorldLinkCards = (baseCardsForEvent, predictCardsForEvent) => {
  if (!Array.isArray(baseCardsForEvent) || baseCardsForEvent.length === 0) return [];
  if (!Array.isArray(predictCardsForEvent) || predictCardsForEvent.length === 0) {
    return [...baseCardsForEvent].sort((a, b) => b.Rarity - a.Rarity);
  }

  const usedPredictIndexes = new Set();

  const findPredictForBase = (baseCard) => {
    const baseKey = getWorldLinkCardKey(baseCard);
    let idx = predictCardsForEvent.findIndex((c, i) => !usedPredictIndexes.has(i) && getWorldLinkCardKey(c) === baseKey);
    if (idx === -1) {
      const baseName = normalizeText(baseCard?.Name);
      idx = predictCardsForEvent.findIndex((c, i) => !usedPredictIndexes.has(i) && normalizeText(c?.Name) === baseName);
    }
    if (idx === -1) return null;
    usedPredictIndexes.add(idx);
    return predictCardsForEvent[idx];
  };

  const merged = baseCardsForEvent.map((baseCard) => {
    const patchCard = findPredictForBase(baseCard);
    if (!patchCard) return { ...baseCard };

    return {
      ...baseCard,
      Attribute: normalizeAttr(patchCard.Attribute) || baseCard.Attribute,
      Skill: patchCard.Skill || baseCard.Skill
    };
  });

  return merged.sort((a, b) => b.Rarity - a.Rarity);
};

const totalEventData = computed(() => {
  // 1. 遍历所有的历史活动（包括你填好的 218 以前的坑）
  return historyData.value.map(jsonEvent => {
    // 2. 看看预测数组里有没有对这个 ID 的“填坑记录”
    const patch = effectivePredictiveEvents.value.find(p => Number(p.id) === Number(jsonEvent.id));
    const forceOfficial = isJsonEventOfficialRevealed(jsonEvent);
    const effectivePatch = forceOfficial ? null : patch;
    
    // 3. 如果有补丁，合并它；如果没有，用原件
    const event = effectivePatch ? { ...jsonEvent, ...effectivePatch, isPredict: true } : jsonEvent;
    
    // 4. 关联卡片逻辑：
    // 既搜 JSON 里的基础卡，也加上预测补丁里的卡
    const baseCardsForThisEvent = baseCards.value.filter(c => String(c.EventID) === String(event.id));
    const predictCardsForThisEvent = effectivePatch ? (effectivePatch.memberCards || []) : [];
    
    const isWorldLinkEvent = String(event?.event_type || '').trim() === 'World Link';
    const combinedRawCards = [...baseCardsForThisEvent, ...predictCardsForThisEvent];
    const combinedCards = (effectivePatch && predictCardsForThisEvent.length > 0)
      ? (isWorldLinkEvent
        ? mergeWorldLinkCards(baseCardsForThisEvent, predictCardsForThisEvent)
        : sortPredictedCardsForDisplay(combinedRawCards, event.banner))
      : combinedRawCards.sort((a, b) => b.Rarity - a.Rarity);

    return {
      ...event,
      memberCards: combinedCards,
      source_event_title: jsonEvent.event_title || '',
      source_event_type: jsonEvent.event_type || '',
      source_gacha_title: jsonEvent.gacha_title || '',
      source_gacha_type: jsonEvent.gacha_type || ''
    };
  });
});

// 统计面板统一使用“历史+预测合并后的活动卡面”，确保 WL 预测属性/技能也参与统计。
const totalCardsData = computed(() => {
  const eventCards = totalEventData.value.flatMap((ev) => ev.memberCards || []);
  const usedCardIds = new Set(
    eventCards
      .map((c) => String(c?.CardID || '').trim())
      .filter((id) => id)
  );

  // movie 等非活动绑定卡不会出现在 totalEventData.memberCards，需要补入统计源。
  const detachedBaseCards = (baseCards.value || []).filter((card) => {
    const cardId = String(card?.CardID || '').trim();
    return cardId && !usedCardIds.has(cardId);
  });

  return [...eventCards, ...detachedBaseCards];
});

// 辅助方法：获取下一个 SeriesID
const getNextSeriesId = () => {
  const allIds = totalCardsData.value
    .map(c => parseInt(c.SeriesID))
    .filter(id => !isNaN(id));
  return allIds.length > 0 ? Math.max(...allIds) + 1 : 1;
};

const getBaseBannerName = (name) => String(name || '').trim().split(' ')[0] || '';

const getNextTypeSeriesId = ({ eventId, eventType, bannerName }) => {
  const baseBanner = getBaseBannerName(bannerName);
  if (!eventType || !baseBanner || eventType === 'World Link') return null;

  const currentId = Number(eventId);
  const prevMax = totalEventData.value.reduce((max, ev) => {
    const evId = Number(ev?.id);
    if (!Number.isFinite(evId) || evId >= currentId) return max;
    if (String(ev?.event_type || '').trim() !== eventType) return max;

    const evBanner = getBaseBannerName(ev?.banner);
    if (!evBanner || evBanner !== baseBanner) return max;

    const sid = parseInt(ev?.type_series_id, 10);
    if (Number.isNaN(sid)) return max;
    return Math.max(max, sid);
  }, 0);

  return prevMax + 1;
};

const normalizeAttr = (attr) => {
  const map = {
    pure: 'Pure',
    cool: 'Cool',
    cute: 'Cute',
    happy: 'Happy',
    mysterious: 'Mysterious'
  };
  const raw = String(attr || '').trim();
  if (!raw) return '';
  if (raw === '-') return '-';
  return map[raw.toLowerCase()] || '';
};

const CHAR_ORDER = {
  "星乃一歌": 1, "天马咲希": 2, "望月穗波": 3, "日野森志步": 4,
  "花里实乃里": 5, "桐谷遥": 6, "桃井爱莉": 7, "日野森雫": 8,
  "小豆泽心羽": 9, "白石杏": 10, "东云彰人": 11, "青柳冬弥": 12,
  "天马司": 13, "凤笑梦": 14, "草薙宁宁": 15, "神代类": 16,
  "宵崎奏": 17, "朝比奈真冬": 18, "东云绘名": 19, "晓山瑞希": 20,
  "初音未来": 21, "镜音铃": 22, "镜音连": 23, "巡音流歌": 24, "MEIKO": 25, "KAITO": 26
};

const getCharOrder = (name) => {
  const baseName = String(name || '').split(' ')[0];
  return CHAR_ORDER[baseName] || 0;
};

function sortPredictedCardsForDisplay(cards, bannerName) {
  if (!Array.isArray(cards) || cards.length === 0) return [];

  const baseBanner = String(bannerName || '').split(' ')[0];
  const bannerIndex = cards.findIndex((c) => String(c.Name || '').split(' ')[0] === baseBanner);
  const hasBanner = bannerIndex > -1;
  const bannerCard = hasBanner ? cards[bannerIndex] : null;
  const rest = cards.filter((_, idx) => !hasBanner || idx !== bannerIndex);
  const sortedFourStars = [];
  const unsortedBfesFourStars = [];
  const unsortedLowStars = [];

  rest.forEach((c) => {
    const isFourStar = Number(c.Rarity) === 4;
    const isBfes = String(c.Type || '').toLowerCase() === 'bfes';
    if (isFourStar && isBfes) {
      unsortedBfesFourStars.push(c);
    } else if (isFourStar) {
      sortedFourStars.push(c);
    } else {
      unsortedLowStars.push(c);
    }
  });

  sortedFourStars.sort((a, b) => getCharOrder(a.Name) - getCharOrder(b.Name));
  const sortedLowStars = [...unsortedLowStars].sort((a, b) => {
    const ar = Number(String(a?.Rarity || '').trim()) || 0;
    const br = Number(String(b?.Rarity || '').trim()) || 0;
    if (ar !== br) return br - ar;
    return getCharOrder(a.Name) - getCharOrder(b.Name);
  });

  const merged = [...sortedFourStars, ...unsortedBfesFourStars, ...sortedLowStars];
  return bannerCard ? [bannerCard, ...merged] : merged;
}

const isTeamWorldLink = (eventType, typeSeriesId) => {
  if (String(eventType || '').trim() !== 'World Link') return false;
  const sid = Number(typeSeriesId);
  return Number.isFinite(sid) && sid > 0 && sid <= 2;
};

// App.vue 约第 135 行 savePredictEvent 替换为：
provide('savePredictEvent', (payload) => {
  const { eventId, eventType, gachaType, predictAttr, bannerName: payloadBannerName, selectedChars, event_title } = payload;
  const currentOfficialId = getCurrentPredictLockEventId();
  if (Number(eventId) <= currentOfficialId) {
    console.warn(`[predict] ignore save for event ${eventId}, current official id is ${currentOfficialId}`);
    return;
  }
  
  const nextSid = getNextSeriesId();
  const safeSelectedChars = Array.isArray(selectedChars) ? selectedChars : [];
  const isNonFesFourStar = (char) => {
    const rarity = String(char?.rarity || '').trim();
    const skill = String(char?.skillType || '').trim().toLowerCase();
    return rarity === '4' && !skill.includes('fes');
  };

  const bannerCandidates = safeSelectedChars
    .filter((char) => isNonFesFourStar(char))
    .map((char) => String(char?.name || '').trim())
    .filter(Boolean);

  const resolvedBannerName = eventType === 'World Link'
    ? ''
    : (bannerCandidates.includes(String(payloadBannerName || '').trim())
      ? String(payloadBannerName || '').trim()
      : (bannerCandidates[0] || ''));

  if (eventType !== 'World Link' && !resolvedBannerName) {
    alert('保存失败：Ban主必须是队伍中的 4★ 非FES 成员。');
    return;
  }

  const sourceEvent = historyData.value.find(e => Number(e.id) === Number(eventId));
  const nextTypeSeriesId = eventType === 'World Link'
    ? (sourceEvent?.type_series_id ?? null)
    : getNextTypeSeriesId({ eventId, eventType, bannerName: resolvedBannerName });
  const teamWorldLink = isTeamWorldLink(eventType, nextTypeSeriesId ?? sourceEvent?.type_series_id);

  // 1. 内部卡片生成逻辑
  const generatedCardsRaw = safeSelectedChars.map((char, index) => {
    const rarity = char.rarity || "4";
    const isBfes = char.skillType === 'bfes_up' && rarity === '4';
    const isVsName = ["初音未来", "镜音铃", "镜音连", "巡音流歌", "MEIKO", "KAITO"].includes(char.name);

    let cardType = 'perm';
    if (isBfes) {
      cardType = 'bfes';
    } else if (gachaType === 'limited' && rarity === '4') {
      cardType = 'limited';
    } else if (gachaType === 'ue' && rarity === '4') {
      cardType = 'ue';
    }

    return {
      CardID: `PRED-${eventId}-${index}`,
      Name: char.name,
      Rarity: rarity,
      EventID: eventId,
      Attribute: normalizeAttr(char.attr) || '-',
      Skill: isBfes ? 'bfes_up' : (char.skillType || "-"),
      Type: cardType,
      // 重点：使用 PredictEditor 传过来的 Affiliation (已包含 VS 的单位逻辑)
      Affiliation: (isBfes && isVsName) ? 'vs' : (char.Affiliation || ""),
      // Ban主作为 Banner
      SeriesID: eventType === 'World Link' ? null : (String(char?.name || '').trim() === resolvedBannerName ? nextSid : null)
    };
  });

  const generatedCards = eventType === 'World Link'
    ? generatedCardsRaw
    : sortPredictedCardsForDisplay(generatedCardsRaw, resolvedBannerName);

  const predictedUnit = String(generatedCards?.[0]?.Affiliation || '').trim().toLowerCase();
  const sourceUnit = String(sourceEvent?.unit || '').trim().toLowerCase();
  const finalUnit = predictedUnit || sourceUnit;
  const worldLinkUnit = teamWorldLink ? finalUnit : '';
  const finalBanner = eventType === 'World Link'
    ? ''
    : resolvedBannerName;

  const newPredictEvent = {
    id: Number(eventId),
    event_title: event_title,
    event_type: eventType,
    gacha_type: gachaType === 'limited' ? '普通限定' : (gachaType === 'ue' ? 'UE限定' : '常驻'),
    type_series_id: nextTypeSeriesId,
    event_attribute: normalizeAttr(predictAttr),
    memberCards: generatedCards,
    banner: finalBanner,
    unit: eventType === 'World Link' ? worldLinkUnit : finalUnit,
    isPredict: true // 必须标记，用于 PredictEditor 判断是否回显
  };

  // 更新逻辑
  const index = predictiveEvents.value.findIndex(e => e.id === newPredictEvent.id);
  const updatedList = [...predictiveEvents.value]; 
  
  if (index > -1) {
    updatedList[index] = newPredictEvent;
  } else {
    updatedList.push(newPredictEvent);
  }
  
  const beforeCount = updatedList.length;
  const reconciled = reconcilePredictiveEvents(updatedList);
  predictiveEvents.value = reconciled;
  setCleanedPatchNoticeCount(Math.max(0, beforeCount - reconciled.length), 4200);
});

// 删除预测活动
provide('deletePredictEvent', (id) => {
  predictiveEvents.value = predictiveEvents.value.filter(e => e.id !== id);
});

const handleGlobalPointerDown = (event) => {
  if (!sourceMenuOpen.value) return;
  const triggerWrap = sourceDropdownRef.value;
  const menuPanel = sourceMenuPanelRef.value;
  const target = event.target;
  if (triggerWrap && triggerWrap.contains(target)) return;
  if (menuPanel && menuPanel.contains(target)) return;
  sourceMenuOpen.value = false;
};

onMounted(() => {
  updateCompactTopNav();
  releaseLogSkipBuildId.value = String(localStorage.getItem(APP_RELEASE_LOG_SKIP_KEY) || '').trim();
  syncReleaseLogSkipChecked();
  void checkForAppUpdate();
  if (typeof window !== 'undefined') {
    appVersionCheckTimer = window.setInterval(() => {
      void checkForAppUpdate();
    }, APP_VERSION_CHECK_INTERVAL_MS);
  }
  document.addEventListener('pointerdown', handleGlobalPointerDown);
  window.addEventListener('resize', updateCompactTopNav);
  window.addEventListener('resize', updateSourceMenuPosition);
  window.addEventListener('resize', handleStatsSongsViewportResize);
  window.addEventListener('scroll', updateSourceMenuPosition, true);
  nextTick(() => {
    saveActiveTabCenterRatio();
    bindActiveTabReflowObserver();
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleGlobalPointerDown);
  window.removeEventListener('resize', updateCompactTopNav);
  window.removeEventListener('resize', updateSourceMenuPosition);
  window.removeEventListener('resize', handleStatsSongsViewportResize);
  window.removeEventListener('scroll', updateSourceMenuPosition, true);
  if (tabReflowObserver) {
    tabReflowObserver.disconnect();
    tabReflowObserver = null;
  }
  if (tabReflowRaf) {
    cancelAnimationFrame(tabReflowRaf);
    tabReflowRaf = 0;
  }
  if (cleanupNoticeTimer) {
    clearTimeout(cleanupNoticeTimer);
    cleanupNoticeTimer = null;
  }
  if (appVersionCheckTimer) {
    clearInterval(appVersionCheckTimer);
    appVersionCheckTimer = null;
  }
});

// 监听预测变化并持久化到当前数据源
watch(predictiveEvents, (newVal) => {
  void newVal;
  syncCurrentPredictsToActiveSource();
}, { deep: true });

watch(predictUserName, (newVal) => {
  const compact = String(newVal || '').replace(/\s+/g, '');
  localStorage.setItem(PREDICT_USERNAME_KEY, compact);
  if (!compact || isEditingPredictUserName.value) return;
  relabelLocalSourcesByUser(compact);
  persistPredictSources();
});

watch(sourceMenuOpen, async (open) => {
  if (!open) {
    showScreenshotConfirmPanel.value = false;
    showCreateSourceConfirmPanel.value = false;
    renameSourceTargetId.value = '';
    renameSourceDraftName.value = '';
    return;
  }
  await nextTick();
  updateSourceMenuPosition();
  syncStatsTopControlState();
});

watch(isHistoryPredictEditorOpen, (open) => {
  if (open) {
    sourceMenuOpen.value = false;
  }
});
</script>

<style scoped>
/* 3. 恢复并优化你原本的样式 */
/* App.vue 样式部分 */
:global(#app) {
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  text-align: left !important;
}

.main-app {
  display: flex;
  flex-direction: column;
  height: 100vh;     /* 强制占满一屏高度 */
  width: 100%;
  max-width: 100%;
  overflow: hidden;  /* 锁定外层，防止整个网页滚动 */
}

.nav-tabs {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 15px;
  padding: 15px 25px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  z-index: 2000;
  /* 移除 sticky，因为外层已经是 flex 布局，它自然就在最顶部 */
}

.app-update-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 14px;
  background: #ecfeff;
  border-bottom: 1px solid #99f6e4;
}

.app-update-text {
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 600;
}

.app-update-btn {
  border: 1px solid #0f766e;
  background: #14b8a6;
  color: #ffffff;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.app-update-btn.app-update-btn-muted {
  border-color: #94a3b8;
  background: #f8fafc;
  color: #334155;
}

.app-update-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 5200;
  background: rgba(15, 23, 42, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.app-update-modal {
  width: min(520px, calc(100vw - 20px));
  max-height: min(78vh, 640px);
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.96));
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.32);
  padding: 14px;
}

.app-update-modal-title {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.app-update-modal-subtitle {
  margin-top: 4px;
  font-size: 0.78rem;
  color: #64748b;
}

.app-update-log-list {
  margin: 10px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: #1e293b;
  font-size: 0.84rem;
  line-height: 1.35;
}

.app-update-modal-actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.app-release-log-image {
  margin-top: 10px;
  display: block;
  margin-left: auto;
  margin-right: auto;
  width: min(100%, 240px);
  max-height: min(48vh, 280px);
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  object-fit: contain;
  background: rgba(248, 250, 252, 0.8);
}

.app-release-log-skip-option {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #334155;
}

.app-release-log-skip-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #0f766e;
}

.nav-tabs > button,
.nav-tabs > .io-btn,
.nav-tabs > .source-dropdown > .source-trigger {
  min-height: 42px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.username-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 5px 8px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #f8fafc;
  box-sizing: border-box;
}

.stats-top-nav-wrap {
  --stats-top-control-size: 30px;
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 4px;
  min-height: 42px;
  padding: 5px 8px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #f8fafc;
  box-sizing: border-box;
}

.stats-top-label {
  font-size: 0.72rem;
  color: #475569;
  white-space: nowrap;
}

.stats-top-id-input {
  width: 56px;
  height: var(--stats-top-control-size);
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 0 6px;
  font-size: 0.74rem;
  color: #0f172a;
  background: #ffffff;
  text-align: center;
  outline: none;
  box-sizing: border-box;
}

.stats-top-id-input:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.15);
}

.stats-top-mini-btn,
.stats-top-menu-btn {
  flex: 0 0 auto;
  width: var(--stats-top-control-size);
  height: var(--stats-top-control-size);
  min-width: var(--stats-top-control-size);
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 0.76rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  transition: filter 0.16s ease, transform 0.16s ease, background-color 0.16s ease;
}

.nav-tabs .stats-top-mini-btn,
.nav-tabs .stats-top-menu-btn {
  min-height: var(--stats-top-control-size);
  padding: 0 4px;
}

.nav-tabs .stats-top-mini-btn:active,
.nav-tabs .stats-top-menu-btn:active {
  filter: brightness(0.82);
  transform: translateY(1px) scale(0.96);
}

.stats-top-reset-btn {
  min-width: var(--stats-top-control-size);
}

.stats-top-reset-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  display: block;
}

.stats-top-menu-btn {
  min-width: 30px;
  font-size: 0.88rem;
}

.stats-top-menu-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.nav-tabs.is-stats-top-compact {
  gap: 6px;
  padding: 8px 10px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: visible;
}

.nav-tabs.is-stats-top-compact > button,
.nav-tabs.is-stats-top-compact > .io-btn,
.nav-tabs.is-stats-top-compact > .source-dropdown > .source-trigger {
  min-height: 34px;
  white-space: nowrap;
}

.nav-tabs.is-stats-top-compact > button {
  flex: 0 0 auto;
  padding: 7px 10px;
  font-size: 0.82rem;
}

.nav-tabs.is-stats-top-compact .btn-with-icon {
  gap: 2px;
}

.nav-tabs.is-stats-top-compact .btn-icon {
  width: 13px;
  height: 13px;
  flex-basis: 13px;
}

.nav-tabs.is-stats-top-compact .stats-top-nav-wrap {
  --stats-top-control-size: 24px;
  order: 3;
  gap: 1px;
  min-height: 34px;
  padding: 3px 5px;
}

.nav-tabs.is-stats-top-compact .stats-top-label {
  display: none;
}

.nav-tabs.is-stats-top-compact .stats-top-id-input {
  width: 50px;
}

.nav-tabs.is-stats-top-compact .stats-top-mini-btn {
  font-size: 0.7rem;
}

.nav-tabs.is-stats-top-compact .stats-top-reset-icon {
  width: 13px;
  height: 13px;
}

.username-label {
  font-size: 0.75rem;
  color: #475569;
  white-space: nowrap;
}

.username-input {
  width: 112px;
  height: 30px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 0.78rem;
  color: #0f172a;
  background: #ffffff;
  outline: none;
  box-sizing: border-box;
}

.username-input:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.15);
}

.nav-tabs-spacer {
  flex: 1 1 auto;
  min-width: 8px;
}

.nav-create-btn {
  order: 98;
}

.source-dropdown {
  order: 99;
}

.nav-tabs button:not(:disabled),
.io-btn:not(:disabled),
.source-item:not(:disabled),
.source-mini-btn:not(:disabled),
.source-order-btn:not(:disabled),
.floating-top-btn:not(:disabled) {
  transition: filter 0.16s ease, transform 0.16s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.nav-tabs button:not(:disabled):active,
.io-btn:not(:disabled):active,
.source-item:not(:disabled):active,
.source-mini-btn:not(:disabled):active,
.source-order-btn:not(:disabled):active,
.floating-top-btn:not(:disabled):active {
  filter: brightness(0.86);
  transform: translateY(1px) scale(0.97);
}

/* 修改并替换 App.vue 中的 .content-area 相关样式 */
.content-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto; /* 默认允许滚动，拯救你的统计面板 */
  overflow-x: hidden;
}

/* 当切换到历史页面时，去掉 padding 并锁定外层滚动 */
.content-area.history-mode {
  padding: 0;
  overflow: hidden; 
}

button {
  padding: 10px 20px;
  border: none;
  background: #f0f0f0;
  border-radius: 999px;
  cursor: pointer;
  font-weight: bold;
  transition: 0.3s;
}

button.active {
  background: #33ccbb; /* 初音绿高亮 */
  color: white;
}

.predict-info {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  box-sizing: border-box;
  font-size: 0.85rem;
  color: #eb2f96;
  background: #fff0f6;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid #ffadd2;
}

.predict-cleanup-info {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  box-sizing: border-box;
  font-size: 0.8rem;
  color: #065f46;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 4px 10px;
  border-radius: 999px;
}

.io-btn {
  padding: 6px 10px;
  font-size: 0.8rem;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
}

.btn-with-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  line-height: 1;
}

.nav-tabs > button .btn-with-icon,
.nav-tabs > .io-btn .btn-with-icon {
  min-height: 1em;
}

.btn-icon {
  width: 15px;
  height: 15px;
  object-fit: contain;
  flex: 0 0 15px;
  display: block;
}

/* Optional PNG tinting: keep default dark, use white icon on active tab. */
.btn-icon {
  filter: var(--app-icon-filter, none);
}

.nav-tabs button.active .btn-icon {
  --app-icon-filter: brightness(0) saturate(100%) invert(100%);
}

.source-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.source-trigger {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-trigger.is-disabled,
.source-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.source-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 320px;
  max-width: min(92vw, 420px);
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 18px;
  padding: 10px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.16);
  z-index: 2800;
}

.source-menu-floating {
  box-sizing: border-box;
}

.source-menu-title {
  font-size: 0.74rem;
  font-weight: 700;
  color: #475569;
  margin: 2px 0 6px;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
  margin-bottom: 8px;
}

.source-item {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #dbe4ef;
  border-radius: 999px;
  padding: 6px 8px;
  font-size: 0.78rem;
}

.source-item-row {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 10px;
}

.source-item-row.is-drag-over {
  background: #e0f2fe;
  box-shadow: inset 0 0 0 1px #38bdf8;
}

.source-mini-btn {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  font-size: 0.72rem;
  line-height: 1;
}

.mini-btn-icon {
  width: 12px;
  height: 12px;
  object-fit: contain;
  display: block;
}

.source-order-btn {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  font-size: 0.72rem;
  line-height: 1;
}

.source-drag-handle {
  flex: 0 0 auto;
  width: 16px;
  color: #64748b;
  font-size: 0.9rem;
  text-align: center;
  user-select: none;
  cursor: move;
}

.source-item-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.source-item-count {
  flex: 0 0 auto;
  font-size: 0.72rem;
  color: #64748b;
  background: #e2e8f0;
  border-radius: 999px;
  padding: 1px 7px;
}

.source-item.active {
  border-color: #14b8a6;
  background: #ecfeff;
  color: #0f172a;
}

.source-item.active .source-item-count {
  color: #155e75;
  background: #cffafe;
}

.source-actions {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 1px;
  margin-bottom: 8px;
}

.source-actions .io-btn {
  flex: 0 0 auto;
  padding: 5px 8px;
  font-size: 0.74rem;
  border-radius: 999px;
}

.nav-tabs > button:hover:not(.active),
.io-btn:hover:not(:disabled),
.source-item:hover:not(.active),
.source-mini-btn:hover:not(:disabled),
.source-order-btn:hover:not(:disabled),
.stats-top-mini-btn:hover:not(:disabled),
.stats-top-menu-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.source-item.active:hover {
  background: #ecfeff;
}

.source-actions .btn-with-icon {
  gap: 5px;
  white-space: nowrap;
}

.source-export-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  color: #475569;
  margin-bottom: 8px;
  user-select: none;
}

.source-export-option input {
  margin: 0;
}

.source-export-status {
  font-size: 0.72rem;
  color: #0f766e;
  background: #ecfeff;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  padding: 4px 8px;
  margin-bottom: 8px;
}

.source-export-confirm {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 8px;
  background: #f8fafc;
  margin-bottom: 8px;
}

.source-export-confirm-title {
  font-size: 0.75rem;
  color: #334155;
  font-weight: 700;
  margin-bottom: 7px;
}

.source-export-confirm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.source-export-range-row {
  gap: 6px;
}

.source-export-confirm-row > span {
  flex: 0 0 auto;
  font-size: 0.72rem;
  color: #475569;
}

.source-export-name-input {
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 5px 7px;
  font-size: 0.74rem;
}

.source-export-range-input {
  flex: 1 1 0;
  min-width: 0;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 5px 7px;
  font-size: 0.74rem;
}

.source-export-range-sep {
  flex: 0 0 auto;
  font-size: 0.72rem;
  color: #64748b;
}

.source-export-confirm-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.source-create-confirm {
  margin-top: -2px;
}

.source-rename-confirm {
  margin-top: -2px;
}

.source-create-clone-row {
  margin-bottom: 6px;
}

.source-create-clone-option {
  margin-bottom: 0;
}

.io-drop-zone {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 3px 6px;
}

.io-drop-zone.is-drag-over {
  border-color: #14b8a6;
  background: #ecfeff;
}

.io-drop-hint {
  font-size: 0.72rem;
  color: #64748b;
  user-select: none;
}

.source-drop-zone {
  width: 100%;
  justify-content: center;
  box-sizing: border-box;
}

.predict-import-input {
  display: none;
}

.floating-top-btn {
  position: fixed;
  right: 14px;
  bottom: 18px;
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: #14b8a6;
  color: #fff;
  box-shadow: 0 6px 18px rgba(20, 184, 166, 0.35);
  z-index: 2600;
  cursor: pointer;
}

.floating-top-btn-icon {
  display: block;
  line-height: 1;
  font-size: 1.05rem;
  font-weight: 700;
  transform: translateY(-1px);
}

.floating-top-btn:hover {
  background: #0d9488;
}

@media (min-width: 901px) and (max-width: 1200px) {
  .nav-tabs > button,
  .nav-tabs > .io-btn,
  .nav-tabs > .source-dropdown > .source-trigger,
  .username-wrap,
  .stats-top-nav-wrap,
  .predict-info,
  .predict-cleanup-info {
    min-height: 36px;
  }

  .nav-tabs {
    gap: 10px;
    padding: 10px 16px;
  }

  .nav-tabs > button {
    padding: 7px 12px;
    font-size: 0.86rem;
  }

  .username-wrap,
  .stats-top-nav-wrap {
    padding: 3px 7px;
  }

  .stats-top-nav-wrap {
    --stats-top-control-size: 24px;
    gap: 3px;
  }

  .stats-top-id-input {
    width: 52px;
    padding: 0 5px;
    font-size: 0.72rem;
  }

  .username-input {
    height: 30px;
    width: 96px;
    font-size: 0.74rem;
  }

  .predict-info {
    padding: 3px 9px;
    font-size: 0.74rem;
  }

  .predict-cleanup-info {
    padding: 2px 7px;
    font-size: 0.64rem;
  }
}

@media (min-width: 769px) and (max-width: 900px) {
  .nav-tabs.is-stats-top-compact > button,
  .nav-tabs.is-stats-top-compact > .io-btn,
  .nav-tabs.is-stats-top-compact > .source-dropdown > .source-trigger,
  .nav-tabs.is-stats-top-compact .username-wrap,
  .nav-tabs.is-stats-top-compact .stats-top-nav-wrap,
  .nav-tabs.is-stats-top-compact .predict-info,
  .nav-tabs.is-stats-top-compact .predict-cleanup-info {
    min-height: 32px;
  }

  .nav-tabs.is-stats-top-compact > button {
    min-height: 32px;
    padding: 6px 10px;
    font-size: 0.82rem;
  }

  .nav-tabs.is-stats-top-compact .btn-with-icon {
    gap: 4px;
  }

  .nav-tabs.is-stats-top-compact .btn-icon {
    width: 13px;
    height: 13px;
    flex-basis: 13px;
  }

  .nav-tabs.is-stats-top-compact .username-wrap,
  .nav-tabs.is-stats-top-compact .stats-top-nav-wrap {
    padding: 2px 6px;
  }

  .nav-tabs.is-stats-top-compact .stats-top-nav-wrap {
    --stats-top-control-size: 22px;
  }

  .nav-tabs.is-stats-top-compact .predict-info {
    padding: 3px 8px;
    font-size: 0.7rem;
  }

  .nav-tabs.is-stats-top-compact .predict-cleanup-info {
    padding: 2px 6px;
    font-size: 0.62rem;
  }
}

@media (max-width: 768px) {
  .main-app {
    width: 100%;
    height: 100dvh;
  }

  .nav-tabs {
    gap: 3px;
    padding: 5px 6px;
    flex-wrap: wrap;
    overflow-x: hidden;
    overflow-y: visible;
  }

  .nav-tabs button,
  .reset-btn {
    flex: 0 0 auto;
    padding: 5px 7px;
    font-size: 0.74rem;
    min-height: 31px;
    white-space: nowrap;
  }

  .btn-with-icon {
    gap: 4px;
  }

  .btn-icon {
    width: 13px;
    height: 13px;
    flex-basis: 13px;
  }

  .username-wrap {
    order: 3;
    gap: 3px;
    min-height: 31px;
    padding: 2px 4px;
    border-radius: 999px;
  }

  .stats-top-nav-wrap {
    --stats-top-control-size: 21px;
    order: 3;
    gap: 2px;
    min-height: 31px;
    padding: 2px 3px;
  }

  .stats-top-label {
    font-size: 0.64rem;
  }

  .stats-top-id-input {
    width: 50px;
    font-size: 0.64rem;
    padding: 0 4px;
  }

  .stats-top-mini-btn,
  .stats-top-menu-btn {
    font-size: 0.74rem;
  }

  .stats-top-menu-btn {
    min-width: 27px;
    font-size: 0.82rem;
  }

  .username-label {
    font-size: 0.66rem;
  }
  .source-export-confirm {
    padding: 6px;
  }
  .source-export-confirm-title {
    font-size: 0.68rem;
  }
  .source-export-confirm-row {
    gap: 6px;
  }
  .source-export-confirm-row > span {
    font-size: 0.66rem;
  }
  .source-export-name-input {
    font-size: 0.68rem;
    padding: 4px 6px;
  }
  .source-export-range-input {
    font-size: 0.68rem;
    padding: 4px 6px;
  }

  .username-input {
    width: 52px;
    height: var(--stats-top-control-size);
    font-size: 0.64rem;
    padding: 2px 4px;
    border-radius: 999px;
  }

  /* iOS/Safari 聚焦输入框会自动放大页面，移动端统一将关键输入字号提升到 16px 以避免锁定放大态。 */
  .username-input,
  .stats-top-id-input,
  .source-export-name-input,
  .source-export-range-input {
    font-size: 16px;
  }

  .nav-tabs-spacer {
    display: none;
  }

  .predict-info {
    order: 5;
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    width: auto;
    min-width: fit-content;
    border-radius: 999px;
    font-size: 0.64rem;
    padding: 2px 6px;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .predict-cleanup-info {
    order: 6;
    min-height: 32px;
    font-size: 0.58rem;
    padding: 2px 5px;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .nav-tabs > .io-btn {
    order: 7;
    font-size: 0.66rem;
    padding: 4px 7px;
    min-height: 32px;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .nav-tabs > .nav-create-btn {
    order: 8;
  }

  .nav-tabs > .source-dropdown {
    order: 99;
    margin-left: auto;
  }

  .source-trigger {
    max-width: 66px;
    min-height: 31px;
    padding: 4px 6px;
    font-size: 0.62rem;
  }

  .source-item {
    font-size: 0.72rem;
    padding: 5px 7px;
  }

  .source-item-count {
    font-size: 0.66rem;
  }

  .io-drop-zone {
    order: 2;
    gap: 4px;
    padding: 2px 4px;
    border-style: solid;
  }

  .io-drop-hint {
    display: none;
  }

  .content-area {
    padding: 10px;
    overflow-x: hidden;
  }

  .content-area.history-mode {
    padding: 0;
  }

  .floating-top-btn {
    right: 10px;
    bottom: 14px;
    width: 36px;
    height: 36px;
  }

  .floating-top-btn-icon {
    font-size: 0.95rem;
  }

  .source-drag-handle {
    display: none;
  }
}

@media (max-width: 520px) {
  .nav-tabs {
    gap: 3px;
    padding: 5px 6px;
  }

  .username-wrap {
    min-height: 32px;
    padding: 2px 5px;
    border-radius: 999px;
  }

  .stats-top-nav-wrap {
    --stats-top-control-size: 20px;
    min-height: 30px;
    padding: 2px 3px;
    gap: 2px;
  }

  .stats-top-label {
    display: none;
  }

  .stats-top-id-input {
    width: 46px;
  }

  .stats-top-mini-btn,
  .stats-top-menu-btn {
    font-size: 0.7rem;
  }

  .username-input {
    width: 52px;
    height: var(--stats-top-control-size);
    border-radius: 999px;
  }

  .nav-tabs button,
  .reset-btn {
    padding: 4px 6px;
    font-size: 0.7rem;
    min-height: 30px;
  }

  .predict-info {
    min-height: 30px;
    font-size: 0.62rem;
    padding: 2px 6px;
  }

  .predict-cleanup-info {
    min-height: 30px;
    font-size: 0.56rem;
    padding: 2px 5px;
  }

  .nav-tabs > .io-btn {
    font-size: 0.64rem;
    padding: 4px 6px;
    min-height: 30px;
  }

  .source-trigger {
    max-width: 60px;
    padding: 3px 5px;
    font-size: 0.6rem;
  }

  .source-actions {
    gap: 4px;
  }

  .source-actions .io-btn {
    padding: 4px 7px;
    font-size: 0.68rem;
    border-radius: 999px;
  }

  .source-actions .btn-icon {
    width: 12px;
    height: 12px;
    flex-basis: 12px;
  }

  .source-export-option {
    font-size: 0.68rem;
    gap: 4px;
  }

  .source-export-status {
    font-size: 0.64rem;
    padding: 3px 6px;
  }

  .source-item {
    font-size: 0.68rem;
  }

  .source-order-btn {
    width: 22px;
    height: 22px;
    font-size: 0.66rem;
  }

  .io-drop-zone {
    padding: 2px;
    border: none;
    background: transparent;
  }
}
</style>