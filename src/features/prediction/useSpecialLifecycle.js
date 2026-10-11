import { nextTick, onBeforeUnmount, onMounted } from "vue";

/** Owns special prediction lifecycle with explicit instance dependencies. */
export function useSpecialLifecycle(ports = {}) {

const connectSpecialGeneratorMount = () => {
onMounted(() => {
  ports.settingsPersistence.loadCoverTextSettings();
  void ports.fonts.loadPersistedFonts().finally(() => nextTick(ports.history.resetEditorHistory));
  ports.unlock.isUnlocked.value = sessionStorage.getItem(ports.unlock.UNLOCK_SESSION_KEY) === '1';
  if (ports.unlock.usingDefaultKey) {
    console.warn('[special-predict] VITE_SPECIAL_PREDICT_KEY_SHA256 is not configured. Using the development soft-lock key.');
  }
  ports.preview.updatePreviewScale();
  if (typeof ResizeObserver !== 'undefined') {
    ports.preview.previewResizeObserver = new ResizeObserver(() => ports.preview.updatePreviewScale());
    if (ports.preview.canvasWrapRef.value) ports.preview.previewResizeObserver.observe(ports.preview.canvasWrapRef.value);
    if (ports.preview.canvasRef.value) ports.preview.previewResizeObserver.observe(ports.preview.canvasRef.value);
    ports.preview.multiCanvasElementMap.forEach((element) => ports.preview.previewResizeObserver.observe(element));
  }
  window.addEventListener('resize', ports.preview.updatePreviewScale);
  window.addEventListener('keydown', ports.history.onGlobalEditorKeydown);
});
};
const connectSpecialGeneratorUnmount = () => {
onBeforeUnmount(() => {
  ports.textTransform.endCoverTextTransform();
  ports.history.editorHistoryReady = false;
  if (ports.history.editorHistoryTimer) {
    window.clearTimeout(ports.history.editorHistoryTimer);
    ports.history.editorHistoryTimer = null;
  }
  if (ports.capture.exportStatusTimer) {
    window.clearTimeout(ports.capture.exportStatusTimer);
    ports.capture.exportStatusTimer = null;
  }
  if (ports.fonts.localFontStatusTimer) {
    window.clearTimeout(ports.fonts.localFontStatusTimer);
    ports.fonts.localFontStatusTimer = null;
  }
  if (ports.preview.previewResizeObserver) {
    ports.preview.previewResizeObserver.disconnect();
    ports.preview.previewResizeObserver = null;
  }
  window.removeEventListener('resize', ports.preview.updatePreviewScale);
  window.removeEventListener('keydown', ports.history.onGlobalEditorKeydown);
  ports.background.coverBgUrlMap.forEach((url) => URL.revokeObjectURL(url));
  ports.background.coverBgUrlMap.clear();
  ports.background.coverBgAssetMap.clear();
});
};
return { connectSpecialGeneratorMount,
connectSpecialGeneratorUnmount };
}
