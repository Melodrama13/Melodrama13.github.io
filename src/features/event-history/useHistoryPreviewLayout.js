import { ref, computed, nextTick, watch } from 'vue';
import { isViewportAtMost, UI_BREAKPOINTS } from '../../ui/breakpoints.js';

/** Preview Layout owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: Navigation, PredictionEditor, PreviewSelections, PreviewPanels.
 */
export function useHistoryPreviewLayout(ports) {
const previewLayerCursor = ref(0);

const previewPanelLayers = ref({});

const previewConfigLayer = ref(0);

const previewPanelState = ref({});

const previewFloatingCollapsed = ref(false);

const previewConfigBodyCollapsed = ref(false);

const previewExpandedCharSelectId = ref('');

const PREVIEW_CHAR_SELECT_IDS = Object.freeze(['attr-five', 'daily-lineup', 'char-attr']);

const isPreviewCharSelectExpanded = (selectId) => previewExpandedCharSelectId.value === String(selectId || '');

const togglePreviewCharSelectExpanded = (selectId) => {
  const id = String(selectId || '');
  if (!id) return;
  previewExpandedCharSelectId.value = previewExpandedCharSelectId.value === id ? '' : id;
};

const syncPreviewCharSelectExpandedState = (selectedPanelIds) => {
  const visibleSelectors = PREVIEW_CHAR_SELECT_IDS.filter((id) => selectedPanelIds.includes(id));
  if (!visibleSelectors.length) {
    previewExpandedCharSelectId.value = '';
    return;
  }
  if (!visibleSelectors.includes(previewExpandedCharSelectId.value)) {
    previewExpandedCharSelectId.value = visibleSelectors[0];
  }
};

const previewConfigDragState = ref({ dragging: false, offsetX: 0, offsetY: 0 });

const previewConfigPanelPos = ref({ x: null, y: null });

const previewDragState = ref({ dragging: false, panelId: '', offsetX: 0, offsetY: 0 });

const previewResizeState = ref({ resizing: false, panelId: '', startX: 0, startY: 0, startScale: 1 });

const PREVIEW_LAYER_BASE = 4200;

const PREVIEW_CONFIG_LEFT = 14;

const PREVIEW_CONFIG_WIDTH = 360;
const PREVIEW_CONFIG_NARROW_WIDTH = 352;

const PREVIEW_CONFIG_PANEL_SAFE_HEIGHT = 230;

const PREVIEW_PANEL_X_GAP = 18;

const PREVIEW_PANEL_SLOT_GAP = 14;

const PREVIEW_EDITOR_RIGHT_RESERVED = 392;

const PREVIEW_DEFAULT_PANEL_WIDTH = 208;

const PREVIEW_DEFAULT_PANEL_HEIGHT = 260;

const PREVIEW_SCREEN_EDGE_GAP = 10;

const PREVIEW_DRAG_MIN_VISIBLE_X = 80;

const PREVIEW_DRAG_MIN_VISIBLE_Y = 44;

const PREVIEW_PANEL_MIN_SCALE = 0.75;

const PREVIEW_PANEL_MAX_SCALE = 1.8;

const getPreviewDragMinY = () => {
  const filterEl = ports.navigation.filterStickyRef.value;
  if (!filterEl) return PREVIEW_SCREEN_EDGE_GAP;
  const rect = filterEl.getBoundingClientRect();
  return Math.max(PREVIEW_SCREEN_EDGE_GAP, Math.round(rect.top + 2));
};

// Bounds are read only for placement/drag/resize, never to derive corner shapes.
const getPreviewReachableBounds = (scale = 1) => {
  const height = window.visualViewport?.height || window.innerHeight;
  const minY = Math.min(getPreviewDragMinY(), Math.max(0, height - PREVIEW_DRAG_MIN_VISIBLE_Y));
  let bottom = height;
  if (isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.compactMax) && ports.predictionEditor.isEditorOpen.value) {
    const sheet = ports.predictionEditor.predictEditorRef?.value?.getDrawerElement?.();
    const rect = sheet?.classList.contains('is-mobile-sheet') ? sheet.getBoundingClientRect() : null;
    if (rect?.height > 0) bottom = Math.min(bottom, rect.top);
  }
  const header = Math.max(PREVIEW_DRAG_MIN_VISIBLE_Y, 54 * scale);
  // A nearly full-height sheet leaves no useful strip for six title bars.
  // The floating group sits above it, so a viewport cascade stays reachable.
  if (bottom - minY < header + 128) bottom = height;
  return { minY, maxY: Math.max(minY, bottom - header - 8) };
};

const previewConfigPanelStyle = computed(() => {
  const x = previewConfigPanelPos.value.x;
  const y = previewConfigPanelPos.value.y;
  const z = previewConfigLayer.value || PREVIEW_LAYER_BASE;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { zIndex: z };
  return {
    left: `${x}px`,
    top: `${y}px`,
    '--preview-config-top': `${y}px`,
    zIndex: z
  };
});

const clampPreviewConfigPanelPos = (x, y) => {
  const panelWidth = isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.compactMax)
    ? Math.min(PREVIEW_CONFIG_NARROW_WIDTH, window.innerWidth - 16) : PREVIEW_CONFIG_WIDTH;
  const maxX = Math.max(0, window.innerWidth - panelWidth - 6);
  const { minY, maxY } = getPreviewReachableBounds();
  return {
    x: Math.min(maxX, Math.max(6, x)),
    y: Math.min(maxY, Math.max(minY, y))
  };
};

const stopDragPreviewConfig = () => {
  previewConfigDragState.value = { dragging: false, offsetX: 0, offsetY: 0 };
};

const startDragPreviewConfig = (event) => {
  if (event.target?.closest('button')) return;
  bringPreviewConfigToFront();
  const panelEl = event.currentTarget?.closest('.preview-config-panel');
  const rect = panelEl?.getBoundingClientRect();
  if (!rect) return;
  const curX = Number.isFinite(previewConfigPanelPos.value.x) ? previewConfigPanelPos.value.x : rect.left;
  const curY = Number.isFinite(previewConfigPanelPos.value.y) ? previewConfigPanelPos.value.y : rect.top;
  previewConfigPanelPos.value = { x: curX, y: curY };
  previewConfigDragState.value = {
    dragging: true,
    offsetX: event.clientX - curX,
    offsetY: event.clientY - curY
  };
};

const startDragPreviewConfigTouch = (event) => {
  if (event.target?.closest('button')) return;
  bringPreviewConfigToFront();
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  const panelEl = event.currentTarget?.closest('.preview-config-panel');
  const rect = panelEl?.getBoundingClientRect();
  if (!rect) return;
  const curX = Number.isFinite(previewConfigPanelPos.value.x) ? previewConfigPanelPos.value.x : rect.left;
  const curY = Number.isFinite(previewConfigPanelPos.value.y) ? previewConfigPanelPos.value.y : rect.top;
  previewConfigPanelPos.value = { x: curX, y: curY };
  previewConfigDragState.value = {
    dragging: true,
    offsetX: t.clientX - curX,
    offsetY: t.clientY - curY
  };
};

const handleDragPreviewConfig = (event) => {
  if (!previewConfigDragState.value.dragging) return;
  const next = clampPreviewConfigPanelPos(
    event.clientX - previewConfigDragState.value.offsetX,
    event.clientY - previewConfigDragState.value.offsetY
  );
  previewConfigPanelPos.value = next;
};

const handleDragPreviewConfigTouch = (event) => {
  if (!previewConfigDragState.value.dragging) return;
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  event.preventDefault();
  const next = clampPreviewConfigPanelPos(
    t.clientX - previewConfigDragState.value.offsetX,
    t.clientY - previewConfigDragState.value.offsetY
  );
  previewConfigPanelPos.value = next;
};

const getPreviewDefaultPanelPosition = (idx = 0, avoidEditorDrawer = true) => {
  const slot = Number.isFinite(idx) ? idx : 0;
  if (isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.compactMax)) {
    const { minY, maxY } = getPreviewReachableBounds();
    const step = Math.min(28, Math.max(0, (maxY - minY) / 5));
    const start = Math.max(minY, Math.min(PREVIEW_CONFIG_PANEL_SAFE_HEIGHT, maxY - step * 5));
    return { x: 8 + (slot % 3) * 8, y: start + Math.min(5, slot) * step };
  }

  const isNarrow = isViewportAtMost(window.innerWidth, UI_BREAKPOINTS.historyPreviewMax);
  const baseX = isNarrow
    ? PREVIEW_CONFIG_LEFT
    : (PREVIEW_CONFIG_LEFT + PREVIEW_CONFIG_WIDTH + PREVIEW_PANEL_X_GAP);
  const baseY = isNarrow ? PREVIEW_CONFIG_PANEL_SAFE_HEIGHT : 74;
  const rightReserved = (avoidEditorDrawer && ports.predictionEditor.isEditorOpen.value && !isNarrow)
    ? PREVIEW_EDITOR_RIGHT_RESERVED
    : PREVIEW_SCREEN_EDGE_GAP;
  const stepX = PREVIEW_DEFAULT_PANEL_WIDTH + PREVIEW_PANEL_SLOT_GAP;
  const usableWidth = Math.max(PREVIEW_DEFAULT_PANEL_WIDTH, window.innerWidth - baseX - rightReserved);
  const columnCount = Math.max(1, Math.floor((usableWidth + PREVIEW_PANEL_SLOT_GAP) / stepX));
  const col = slot % columnCount;
  const row = Math.floor(slot / columnCount);
  return {
    x: baseX + (col * stepX),
    y: baseY + (row * (PREVIEW_DEFAULT_PANEL_HEIGHT + PREVIEW_PANEL_SLOT_GAP))
  };
};

const getPreviewDefaultState = (idx = 0) => ({
  ...getPreviewDefaultPanelPosition(idx),
  scale: 1,
  collapsed: false
});

const resetPreviewPanelLayout = () => {
  previewConfigPanelPos.value = { x: null, y: null };
  nextTick(() => {
    updatePreviewConfigOffset();
  });
  const nextState = { ...previewPanelState.value };
  ports.previewSelections.selectedPreviewPanelIds.value.forEach((panelId, idx) => {
    const cur = nextState[panelId] || getPreviewDefaultState(idx);
    const pos = getPreviewDefaultPanelPosition(idx, true);
    nextState[panelId] = {
      ...cur,
      x: pos.x,
      y: pos.y
    };
    bringPreviewPanelToFront(panelId);
  });
  previewPanelState.value = nextState;
  ports.previewSelections.selectedPreviewPanelIds.value.forEach((panelId) => clampPreviewPanelPosition(panelId));
};

const getPreviewPanelBaseSize = (panelId) => {
  if (panelId === 'attr-five') return { width: 216, height: 340 };
  if (panelId === 'daily-lineup') return { width: 228, height: 390 };
  if (panelId === 'festival' || panelId === 'year') return { width: 236, height: 350 };
  if (panelId === 'vs-last-four') return { width: 236, height: 242 };
  if (panelId === 'vs-unit-four-count') return { width: 236, height: 242 };
  if (panelId === 'vs-original') return { width: 236, height: 260 };
  if (panelId === 'reward') return { width: 208, height: 260 };
  return { width: 208, height: 260 };
};

const bringPreviewConfigToFront = () => {
  previewLayerCursor.value += 1;
  previewConfigLayer.value = PREVIEW_LAYER_BASE + previewLayerCursor.value;
};

const bringPreviewPanelToFront = (panelId) => {
  previewLayerCursor.value += 1;
  previewPanelLayers.value = {
    ...previewPanelLayers.value,
    [panelId]: PREVIEW_LAYER_BASE + previewLayerCursor.value
  };
};

const isPreviewPanelCollapsed = (panelId) => Boolean(previewPanelState.value[panelId]?.collapsed);

const togglePreviewPanelCollapsed = (panelId) => {
  const cur = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...cur,
      collapsed: !cur.collapsed
    }
  };
};

const getPreviewPanelStyle = (panelId) => {
  const p = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  const base = getPreviewPanelBaseSize(panelId);
  const scale = Number.isFinite(p.scale) ? p.scale : 1;
  const z = previewPanelLayers.value[panelId] || PREVIEW_LAYER_BASE;
  return {
    left: `${p.x}px`,
    top: `${p.y}px`,
    width: `${base.width}px`,
    minWidth: `${base.width}px`,
    height: 'auto',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    zIndex: z
  };
};

const getPreviewStepsStyle = (panelId) => {
  if (panelId === 'daily-lineup' || panelId === 'char-attr') {
    return {
      maxHeight: '380px',
      overflowY: 'auto',
      overflowX: 'hidden'
    };
  }
  return {};
};

const getClampedPreviewPanelCoordinates = (panelId, x, y, scale = 1) => {
  const panelWidth = getPreviewPanelBaseSize(panelId).width * scale;
  const { minY, maxY } = getPreviewReachableBounds(scale);
  return {
    x: Math.min(Math.max(0, window.innerWidth - PREVIEW_DRAG_MIN_VISIBLE_X), Math.max(PREVIEW_DRAG_MIN_VISIBLE_X - panelWidth, x)),
    y: Math.min(maxY, Math.max(minY, y))
  };
};

const clampPreviewPanelPosition = (panelId) => {
  const current = previewPanelState.value[panelId];
  if (!current) return;
  const scale = Number.isFinite(current.scale) ? current.scale : 1;
  previewPanelState.value = { ...previewPanelState.value,
    [panelId]: { ...current, ...getClampedPreviewPanelCoordinates(panelId, current.x, current.y, scale) } };
};

const startDragPreview = (panelId, event) => {
  bringPreviewPanelToFront(panelId);
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  previewDragState.value = {
    dragging: true,
    panelId,
    offsetX: event.clientX - current.x,
    offsetY: event.clientY - current.y
  };
};

const startDragPreviewTouch = (panelId, event) => {
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  bringPreviewPanelToFront(panelId);
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  previewDragState.value = {
    dragging: true,
    panelId,
    offsetX: t.clientX - current.x,
    offsetY: t.clientY - current.y
  };
};

const stopDragPreview = () => {
  previewDragState.value = { dragging: false, panelId: '', offsetX: 0, offsetY: 0 };
};

const stopResizePreview = () => {
  previewResizeState.value = { resizing: false, panelId: '', startX: 0, startY: 0, startScale: 1 };
};

const startResizePreview = (panelId, event) => {
  bringPreviewPanelToFront(panelId);
  const current = previewPanelState.value[panelId] || { scale: 1 };
  previewResizeState.value = {
    resizing: true,
    panelId,
    startX: event.clientX,
    startY: event.clientY,
    startScale: Number.isFinite(current.scale) ? current.scale : 1
  };
};

const startResizePreviewTouch = (panelId, event) => {
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  bringPreviewPanelToFront(panelId);
  const current = previewPanelState.value[panelId] || { scale: 1 };
  previewResizeState.value = {
    resizing: true,
    panelId,
    startX: t.clientX,
    startY: t.clientY,
    startScale: Number.isFinite(current.scale) ? current.scale : 1
  };
};

const handleDragPreview = (event) => {
  if (previewResizeState.value.resizing) return;
  if (!previewDragState.value.dragging) return;
  const panelId = previewDragState.value.panelId;
  if (!panelId) return;
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  const next = getClampedPreviewPanelCoordinates(panelId, event.clientX - previewDragState.value.offsetX, event.clientY - previewDragState.value.offsetY, current.scale || 1);
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...current,
      ...next
    }
  };
};

const handleDragPreviewTouch = (event) => {
  if (previewResizeState.value.resizing) return;
  if (!previewDragState.value.dragging) return;
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  event.preventDefault();
  const panelId = previewDragState.value.panelId;
  if (!panelId) return;
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  const next = getClampedPreviewPanelCoordinates(panelId, t.clientX - previewDragState.value.offsetX, t.clientY - previewDragState.value.offsetY, current.scale || 1);
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...current,
      ...next
    }
  };
};

const handleResizePreview = (event) => {
  if (!previewResizeState.value.resizing) return;
  const panelId = previewResizeState.value.panelId;
  if (!panelId) return;
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  if (current.collapsed) return;
  const base = getPreviewPanelBaseSize(panelId);
  const dx = event.clientX - previewResizeState.value.startX;
  const dy = event.clientY - previewResizeState.value.startY;
  const scaleDelta = Math.max(dx / Math.max(1, base.width), dy / Math.max(1, base.height));
  const nextScale = Math.min(PREVIEW_PANEL_MAX_SCALE, Math.max(PREVIEW_PANEL_MIN_SCALE, previewResizeState.value.startScale + scaleDelta));
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...current,
      scale: nextScale
    }
  };
  clampPreviewPanelPosition(panelId);
};

const handleResizePreviewTouch = (event) => {
  if (!previewResizeState.value.resizing) return;
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  event.preventDefault();
  const panelId = previewResizeState.value.panelId;
  if (!panelId) return;
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  if (current.collapsed) return;
  const base = getPreviewPanelBaseSize(panelId);
  const dx = t.clientX - previewResizeState.value.startX;
  const dy = t.clientY - previewResizeState.value.startY;
  const scaleDelta = Math.max(dx / Math.max(1, base.width), dy / Math.max(1, base.height));
  const nextScale = Math.min(PREVIEW_PANEL_MAX_SCALE, Math.max(PREVIEW_PANEL_MIN_SCALE, previewResizeState.value.startScale + scaleDelta));
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...current,
      scale: nextScale
    }
  };
  clampPreviewPanelPosition(panelId);
};

const updatePreviewConfigOffset = () => {
  if (Number.isFinite(previewConfigPanelPos.value.x) && Number.isFinite(previewConfigPanelPos.value.y)) return;
  const wrapper = ports.navigation.historyWrapperRef.value;
  if (!wrapper) return;
  const filterEl = ports.navigation.filterStickyRef.value;
  if (!filterEl) {
    wrapper.style.setProperty('--preview-config-top', '16px');
    return;
  }
  const rect = filterEl.getBoundingClientRect();
  const nextTop = Math.max(16, Math.round(rect.bottom + 6));
  wrapper.style.setProperty('--preview-config-top', `${nextTop}px`);
};

function connectSyncPreviewCharSelectExpandedState() {
syncPreviewCharSelectExpandedState([]);
}

function watchFloatingPanelLayout() {
watch(ports.previewPanels.previewFloatingPanels, (panels) => {
  const nextState = { ...previewPanelState.value };
  panels.forEach((panel, idx) => {
    if (!nextState[panel.id]) {
      nextState[panel.id] = getPreviewDefaultState(idx);
    }
    if (panel.id === 'daily-lineup') {
      const cur = nextState[panel.id];
      nextState[panel.id] = {
        ...cur,
        scale: Math.min(1, Number(cur?.scale || 1))
      };
    }
    if (!previewPanelLayers.value[panel.id]) {
      bringPreviewPanelToFront(panel.id);
    }
  });
  previewPanelState.value = nextState;
  panels.forEach((panel) => clampPreviewPanelPosition(panel.id));
}, { immediate: true, flush: 'post' });
}
return {
  previewFloatingCollapsed,
  previewConfigBodyCollapsed,
  isPreviewCharSelectExpanded,
  togglePreviewCharSelectExpanded,
  previewConfigPanelStyle,
  startDragPreviewConfig,
  startDragPreviewConfigTouch,
  resetPreviewPanelLayout,
  bringPreviewConfigToFront,
  bringPreviewPanelToFront,
  isPreviewPanelCollapsed,
  togglePreviewPanelCollapsed,
  getPreviewPanelStyle,
  getPreviewStepsStyle,
  startDragPreview,
  startDragPreviewTouch,
  startResizePreview,
  startResizePreviewTouch,
  syncPreviewCharSelectExpandedState,
  previewConfigPanelPos,
  clampPreviewConfigPanelPos,
  updatePreviewConfigOffset,
  previewPanelState,
  clampPreviewPanelPosition,
  handleDragPreviewConfig,
  stopDragPreviewConfig,
  handleDragPreviewConfigTouch,
  handleDragPreview,
  handleResizePreview,
  stopDragPreview,
  stopResizePreview,
  handleDragPreviewTouch,
  handleResizePreviewTouch,
  connectSyncPreviewCharSelectExpandedState,
  watchFloatingPanelLayout,
};
}
