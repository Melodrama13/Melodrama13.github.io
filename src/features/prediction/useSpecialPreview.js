import { computed, nextTick, ref, watch } from "vue";
import { normalizeId } from './specialPredictionFormatters.js';

/** Owns special prediction preview with explicit instance dependencies. */
export function useSpecialPreview(ports = {}) {
const canvasRef = ref(null);

const canvasWrapRef = ref(null);

const coverPanelRef = ref(null);

const previewScale = ref(1);

const previewCanvasWidth = ref(0);

const previewCanvasHeight = ref(0);

const multiCanvasSizes = ref({});

let previewResizeObserver = null;

const multiCanvasElementMap = new Map();

const multiCoverPanelElementMap = new Map();

const canvasStageStyle = computed(() => ({
  width: previewCanvasWidth.value ? `${Math.ceil(previewCanvasWidth.value * previewScale.value)}px` : undefined,
  height: previewCanvasHeight.value ? `${Math.ceil(previewCanvasHeight.value * previewScale.value)}px` : undefined
}));

const getMultiCanvasStageStyle = (pageKey) => {
  const size = multiCanvasSizes.value[pageKey] || {};
  return {
    width: size.width ? `${Math.ceil(size.width * previewScale.value)}px` : undefined,
    height: size.height ? `${Math.ceil(size.height * previewScale.value)}px` : undefined
  };
};

const setMultiCanvasElement = (pageKey, element) => {
  const key = normalizeId(pageKey);
  if (!key) return;
  const previous = multiCanvasElementMap.get(key);
  if (previous && previous !== element) previewResizeObserver?.unobserve(previous);
  if (element) {
    multiCanvasElementMap.set(key, element);
    previewResizeObserver?.observe(element);
  } else {
    multiCanvasElementMap.delete(key);
  }
};

const setMultiCoverPanelElement = (pageKey, element) => {
  const key = normalizeId(pageKey);
  if (!key) return;
  if (element) multiCoverPanelElementMap.set(key, element);
  else multiCoverPanelElementMap.delete(key);
};

const updatePreviewScale = async () => {
  await nextTick();
  const wrap = canvasWrapRef.value;
  if (!wrap) return;
  const targets = ports.sourceSelection.isMultiCaseMode.value
    ? [...multiCanvasElementMap.entries()]
    : (canvasRef.value ? [['single', canvasRef.value]] : []);
  if (targets.length === 0) return;
  const target = targets[0][1];
  const originalWidth = Math.ceil(target.offsetWidth || target.scrollWidth || target.getBoundingClientRect().width);
  if (!originalWidth) return;
  const availableWidth = Math.max(1, Math.floor(wrap.clientWidth));
  previewCanvasWidth.value = originalWidth;
  previewScale.value = Math.min(1, availableWidth / originalWidth);
  if (ports.sourceSelection.isMultiCaseMode.value) {
    const sizes = {};
    targets.forEach(([key, element]) => {
      sizes[key] = {
        width: Math.ceil(element.offsetWidth || element.scrollWidth || element.getBoundingClientRect().width),
        height: Math.ceil(element.offsetHeight || element.scrollHeight || element.getBoundingClientRect().height)
      };
    });
    multiCanvasSizes.value = sizes;
  } else {
    previewCanvasHeight.value = Math.ceil(target.offsetHeight || target.scrollHeight || target.getBoundingClientRect().height);
  }
};
const connectSpecialPreviewLayout = () => {
watch(
  () => [
    ports.unlock.isUnlocked.value,
    ports.sourceSelection.isMultiCaseMode.value,
    ports.caseRows.renderedRows.value.length,
    ports.caseRows.monthlyMultiPages.value.map((page) => `${page.key}:${page.rows.length}`).join('|'),
    ports.sourceSelection.selectedSourceId.value,
    ports.sourceSelection.multiSourceIds.value.join('|'),
    ports.rangeSelection.showUnpredictedRows.value,
    ports.background.coverBgUrl.value
  ],
  () => {
    updatePreviewScale();
  },
  { flush: 'post' }
);
};
return { canvasRef,
canvasWrapRef,
coverPanelRef,
previewScale,
previewCanvasWidth,
previewCanvasHeight,
multiCanvasSizes,
get previewResizeObserver() { return previewResizeObserver; }, set previewResizeObserver(value) { previewResizeObserver = value; },
multiCanvasElementMap,
multiCoverPanelElementMap,
canvasStageStyle,
getMultiCanvasStageStyle,
setMultiCanvasElement,
setMultiCoverPanelElement,
updatePreviewScale,
connectSpecialPreviewLayout };
}
