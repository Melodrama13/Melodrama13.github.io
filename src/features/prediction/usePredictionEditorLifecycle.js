import { watch, onMounted, onActivated, onDeactivated, onBeforeUnmount } from "vue";

/** Owns prediction editor lifecycle; state is per editor instance. */
export const usePredictionEditorLifecycle = (dependencies = {}) => {
  watch(() => dependencies.props.isOpen, (open) => {
    if (!open) {
      dependencies.hideDisableReasonPopover(true);
      dependencies.endSheetDrag();
      dependencies.detachSheetPointerListeners();
      return;
    }
    if (!dependencies.isMobileViewport.value) return;
    dependencies.sheetHeightVh.value = dependencies.SHEET_MID_VH;
  });

  onMounted(() => {
    dependencies.updateMobileViewport();
    window.addEventListener('resize', dependencies.updateMobileViewport);
  });

  const setDrawerPageVisibility = (visible) => {
    if (!(dependencies.drawerRef.value instanceof HTMLElement)) return;
    dependencies.drawerRef.value.style.display = visible && dependencies.props.isOpen ? '' : 'none';
  };

  onDeactivated(() => {
    dependencies.hideDisableReasonPopover(true);
    dependencies.endSheetDrag();
    dependencies.detachSheetPointerListeners();
    setDrawerPageVisibility(false);
  });

  onActivated(() => {
    setDrawerPageVisibility(true);
  });

  onBeforeUnmount(() => {
    dependencies.clearDisableReasonTimers();
    dependencies.detachSheetPointerListeners();
    window.removeEventListener('resize', dependencies.updateMobileViewport);
  });
  return {
    get setDrawerPageVisibility() { return setDrawerPageVisibility; }
  };
};
