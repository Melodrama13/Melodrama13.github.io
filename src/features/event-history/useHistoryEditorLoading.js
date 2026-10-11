import { ref, shallowRef, markRaw } from 'vue';
import { createRetryableModuleImporter } from '../../services/lazyModuleRecovery.js';

/** Lazy editor resource belongs to one history page; rejected imports remain retryable. */
export function useHistoryEditorLoading(importEditor = createRetryableModuleImporter('predictionEditor', () => import('../../components/PredictEditor.vue'))) {
  const editorComponent = shallowRef(null);
  const isEditorLoading = ref(false);
  const editorLoadError = ref('');
  let pendingImport = null;
  let loadRequestVersion = 0;

  // Cancelling a page request dismisses its feedback; a useful download
  // can still finish and populate the resource cache for the next opening.
  const cancelEditorLoadRequest = () => {
    loadRequestVersion += 1;
    isEditorLoading.value = false;
    editorLoadError.value = '';
  };

  const ensureEditorLoaded = async () => {
    if (editorComponent.value) return editorComponent.value;
    const requestVersion = ++loadRequestVersion;
    isEditorLoading.value = true;
    editorLoadError.value = '';
    try {
      if (!pendingImport) pendingImport = importEditor();
      const module = await pendingImport;
      const component = module.default;
      if (!component) throw new Error('Prediction editor module has no component');
      editorComponent.value = markRaw(component);
      return component;
    } catch (error) {
      pendingImport = null;
      if (requestVersion === loadRequestVersion) {
        editorLoadError.value = '预测编辑器加载失败，请重试。';
      }
      throw error;
    } finally {
      if (requestVersion === loadRequestVersion) isEditorLoading.value = false;
    }
  };

  return { editorComponent, isEditorLoading, editorLoadError, ensureEditorLoaded, cancelEditorLoadRequest };
}
