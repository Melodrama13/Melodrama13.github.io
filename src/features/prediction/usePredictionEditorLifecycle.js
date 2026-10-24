import { watch, onMounted, onActivated, onDeactivated, onBeforeUnmount } from "vue";
import { registerTransientOverlayDismissal } from '../../ui/transientOverlays.js';

/** Owns prediction editor lifecycle; state is per editor instance. */
export const usePredictionEditorLifecycle = (dependencies = {}) => {
  let unregisterTransientDismissal;
  const dismissReasonPopover = () => dependencies.hideDisableReasonPopover(true);
  const handleReasonPointerDown = (event) => {
    if (!dependencies.props.isOpen) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.pool-item') && dependencies.drawerRef.value?.contains(target)) return;
    dismissReasonPopover();
  };
  const handleReasonKeydown = (event) => {
    if (event.defaultPrevented || event.key !== 'Escape' || !dependencies.disableReasonPopoverName.value) return;
    dismissReasonPopover();
    event.preventDefault();
  };
  watch(() => dependencies.props.event?.id, dismissReasonPopover);
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
    unregisterTransientDismissal = registerTransientOverlayDismissal(dismissReasonPopover);
    dependencies.updateMobileViewport();
    window.addEventListener('resize', dependencies.updateMobileViewport);
    document.addEventListener('pointerdown', handleReasonPointerDown, true);
    document.addEventListener('keydown', handleReasonKeydown);
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
    unregisterTransientDismissal?.();
    dependencies.clearDisableReasonTimers();
    dependencies.detachSheetPointerListeners();
    window.removeEventListener('resize', dependencies.updateMobileViewport);
    document.removeEventListener('pointerdown', handleReasonPointerDown, true);
    document.removeEventListener('keydown', handleReasonKeydown);
  });
  return {
    get setDrawerPageVisibility() { return setDrawerPageVisibility; }
  };
};
