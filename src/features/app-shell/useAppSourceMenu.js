import { ref, watch, nextTick } from "vue";
import { UI_BREAKPOINTS, isViewportAtMost } from "../../ui/breakpoints.js";

/** Owns application source menu with per-instance state and explicit peer interfaces. */
export function useAppSourceMenu(ports = {}) {
const sourceMenuOpen = ref(false);

const sourceDropdownRef = ref(null);

const sourceTriggerRef = ref(null);

const mobileSourceTriggerRef = ref(null);

const sourceMenuPanelRef = ref(null);

const sourceMenuStyle = ref({});

const draggedSourceId = ref('');

const dragOverSourceId = ref('');

const isEditingPredictUserName = ref(false);

const showCreateSourceConfirmPanel = ref(false);

const createSourceCloneCurrent = ref(true);

const renameSourceTargetId = ref('');

const renameSourceDraftName = ref('');

const openCreateSourceConfirm = () => {
  if ((ports.predictionSources.predictSources.value || []).length >= ports.predictionSources.PREDICT_SOURCE_LIMIT) {
    alert(`数据源数量已达到上限（${ports.predictionSources.PREDICT_SOURCE_LIMIT}）。请先删除不需要的数据源。`);
    return;
  }
  renameSourceTargetId.value = '';
  renameSourceDraftName.value = '';
  ports.historyCapture.showScreenshotConfirmPanel.value = false;
  ports.historyCapture.screenshotStatusText.value = '';
  createSourceCloneCurrent.value = ports.predictionSources.canCloneActivePredictSource.value;
  showCreateSourceConfirmPanel.value = !showCreateSourceConfirmPanel.value;
};

const cancelCreateSourceAction = () => {
  showCreateSourceConfirmPanel.value = false;
  createSourceCloneCurrent.value = ports.predictionSources.canCloneActivePredictSource.value;
};

const confirmCreateSourceAction = () => {
  const owner = ports.predictionSources.normalizeUserName(ports.predictionSources.predictUserName.value);
  const current = ports.predictionSources.activePredictSource.value;
  const currentList = Array.isArray(current?.predictiveEvents) ? current.predictiveEvents : [];
  const shouldClone = ports.predictionSources.canCloneActivePredictSource.value && createSourceCloneCurrent.value;
  const initialList = shouldClone ? ports.predictionSources.clonePredictList(currentList) : [];

  const created = ports.predictionSources.createPredictSource({
    kind: 'local',
    ownerName: owner,
    predictiveList: initialList,
    switchTo: true
  });
  if (created) {
    ports.predictionSources.setCleanedPatchNoticeCount(0);
    showCreateSourceConfirmPanel.value = false;
    createSourceCloneCurrent.value = ports.predictionSources.canCloneActivePredictSource.value;
    const suffix = initialList.length > 0 ? `（已复制 ${initialList.length} 条预测）` : '（空白）';
    ports.historyCapture.screenshotStatusText.value = `已创建并切换到新数据源：${created.name}${suffix}`;
    setTimeout(() => {
      if (ports.historyCapture.screenshotStatusText.value.startsWith('已创建并切换到新数据源：')) {
        ports.historyCapture.screenshotStatusText.value = '';
      }
    }, 1800);
  }
};

const deleteActivePredictSource = () => {
  if (ports.predictionSources.predictSources.value.length <= 1) {
    alert('至少保留一个数据源。');
    return;
  }
  const current = ports.predictionSources.activePredictSource.value;
  if (!current) return;
  const ok = confirm(`确定删除数据源「${current.name}」吗？`);
  if (!ok) return;

  const remain = ports.predictionSources.predictSources.value.filter((s) => s.id !== current.id);
  ports.predictionSources.predictSources.value = remain;
  const fallback = remain[0] || null;
  ports.predictionSources.activePredictSourceId.value = fallback?.id || '';
  ports.predictionSources.predictiveEvents.value = ports.predictionSources.clonePredictList(fallback?.predictiveEvents);
  ports.predictionSources.setCleanedPatchNoticeCount(0);
  ports.predictionSources.persistPredictSources();
};

const toggleSourceMenu = () => {
  if (ports.tabNavigation.isHistoryPredictEditorOpen.value) return;
  sourceMenuOpen.value = !sourceMenuOpen.value;
  if (!sourceMenuOpen.value) {
    renameSourceTargetId.value = '';
    renameSourceDraftName.value = '';
  }
};

const startRenamePredictSource = (sourceId) => {
  const target = (ports.predictionSources.predictSources.value || []).find((s) => s.id === sourceId);
  if (!target) return;
  ports.historyCapture.showScreenshotConfirmPanel.value = false;
  showCreateSourceConfirmPanel.value = false;
  renameSourceTargetId.value = target.id;
  renameSourceDraftName.value = String(target.name || '').trim() || '未命名数据源';
};

const cancelRenamePredictSourceAction = () => {
  renameSourceTargetId.value = '';
  renameSourceDraftName.value = '';
};

const confirmRenamePredictSourceAction = () => {
  const target = (ports.predictionSources.predictSources.value || []).find((s) => s.id === renameSourceTargetId.value);
  if (!target) {
    cancelRenamePredictSourceAction();
    return;
  }

  const nextNameRaw = String(renameSourceDraftName.value || '').trim();
  if (!nextNameRaw) {
    alert('名称不能为空。');
    return;
  }

  const duplicate = (ports.predictionSources.predictSources.value || []).some((s) => s.id !== target.id && String(s?.name || '').trim() === nextNameRaw);
  if (duplicate) {
    alert('名称已存在，请使用其他名称。');
    return;
  }

  ports.predictionSources.predictSources.value = (ports.predictionSources.predictSources.value || []).map((s) => {
    if (s.id !== target.id) return s;
    return {
      ...s,
      name: nextNameRaw,
      updatedAt: new Date().toISOString()
    };
  });
  ports.predictionSources.persistPredictSources();
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

  const list = [...(ports.predictionSources.predictSources.value || [])];
  const fromIndex = list.findIndex((s) => s.id === fromId);
  const toIndex = list.findIndex((s) => s.id === toId);
  if (fromIndex < 0 || toIndex < 0) return;

  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);
  ports.predictionSources.predictSources.value = list;
  ports.predictionSources.persistPredictSources();
};

const onSourceDragEnd = () => {
  draggedSourceId.value = '';
  dragOverSourceId.value = '';
};

const movePredictSource = (sourceId, delta) => {
  const list = [...(ports.predictionSources.predictSources.value || [])];
  const fromIndex = list.findIndex((s) => s.id === sourceId);
  if (fromIndex < 0) return;
  const toIndex = fromIndex + Number(delta || 0);
  if (toIndex < 0 || toIndex >= list.length) return;
  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);
  ports.predictionSources.predictSources.value = list;
  ports.predictionSources.persistPredictSources();
};

const updateSourceMenuPosition = () => {
  if (typeof window === 'undefined') return;
  if (!sourceMenuOpen.value) return;
  const mobile = ports.responsiveNavigation.isSmallTabletViewport.value;
  const trigger = mobile ? mobileSourceTriggerRef.value : sourceTriggerRef.value;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const compact = isViewportAtMost(vw, UI_BREAKPOINTS.compactMax);
  const minWidth = compact ? 250 : 320;
  const maxWidth = compact ? 360 : 420;
  const width = Math.max(Math.min(maxWidth, vw - 12), Math.min(minWidth, vw - 12));
  const left = Math.max(6, Math.min(vw - width - 6, rect.right - width));
  const maxHeight = mobile
    ? Math.max(0, rect.top - 16)
    : Math.max(180, vh - rect.bottom - 14);

  sourceMenuStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: mobile ? 'auto' : `${Math.round(Math.max(6, rect.bottom + 6))}px`,
    bottom: mobile ? `${Math.round(vh - rect.top + 8)}px` : 'auto',
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
  const raw = String(ports.predictionSources.predictUserName.value || '').replace(/\s+/g, '');
  if (raw !== ports.predictionSources.predictUserName.value) {
    ports.predictionSources.predictUserName.value = raw;
    return;
  }
  if (!raw) return;
  const normalized = ports.predictionSources.normalizeUserName(raw);
  if (normalized !== raw) {
    ports.predictionSources.predictUserName.value = normalized;
  }
};

const handleGlobalPointerDown = (event) => {
  if (!sourceMenuOpen.value) return;
  const triggerWrap = sourceDropdownRef.value;
  const mobileTrigger = mobileSourceTriggerRef.value;
  const menuPanel = sourceMenuPanelRef.value;
  const target = event.target;
  if (triggerWrap && triggerWrap.contains(target)) return;
  if (mobileTrigger && mobileTrigger.contains(target)) return;
  if (menuPanel && menuPanel.contains(target)) return;
  sourceMenuOpen.value = false;
};
const connectAppSourceMenu = () => {
watch(sourceMenuOpen, async (open) => {
  if (!open) {
    ports.historyCapture.showScreenshotConfirmPanel.value = false;
    showCreateSourceConfirmPanel.value = false;
    renameSourceTargetId.value = '';
    renameSourceDraftName.value = '';
    return;
  }
  await nextTick();
  updateSourceMenuPosition();
  ports.statsControls.scheduleStatsTopControlStateSync();
});
};
const connectAppPredictionEditorSourceGuard = () => {
watch(ports.tabNavigation.isHistoryPredictEditorOpen, (open) => {
  if (open) {
    sourceMenuOpen.value = false;
  }
});
};
return {
sourceMenuOpen,
sourceDropdownRef,
sourceTriggerRef,
mobileSourceTriggerRef,
sourceMenuPanelRef,
sourceMenuStyle,
draggedSourceId,
dragOverSourceId,
isEditingPredictUserName,
showCreateSourceConfirmPanel,
createSourceCloneCurrent,
renameSourceTargetId,
renameSourceDraftName,
openCreateSourceConfirm,
cancelCreateSourceAction,
confirmCreateSourceAction,
deleteActivePredictSource,
toggleSourceMenu,
startRenamePredictSource,
cancelRenamePredictSourceAction,
confirmRenamePredictSourceAction,
onSourceDragStart,
onSourceDragOver,
onSourceDragLeave,
onSourceDrop,
onSourceDragEnd,
movePredictSource,
updateSourceMenuPosition,
onPredictUserFocus,
onPredictUserBlur,
handleGlobalPointerDown,
connectAppSourceMenu,
connectAppPredictionEditorSourceGuard
};
}
