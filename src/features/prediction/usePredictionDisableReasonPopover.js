import { ref } from "vue";

/** Owns prediction disable reason popover; state is per editor instance. */
export const usePredictionDisableReasonPopover = (dependencies = {}) => {
  const disableReasonPopoverName = ref('');
  const disableReasonPopoverPinned = ref(false);
  let disableReasonHoverTimer = 0;
  let disableReasonAutoHideTimer = 0;

  const clearDisableReasonTimers = () => {
    if (disableReasonHoverTimer) {
      clearTimeout(disableReasonHoverTimer);
      disableReasonHoverTimer = 0;
    }
    if (disableReasonAutoHideTimer) {
      clearTimeout(disableReasonAutoHideTimer);
      disableReasonAutoHideTimer = 0;
    }
  };

  const hideDisableReasonPopover = (force = false) => {
    clearDisableReasonTimers();
    if (!force && disableReasonPopoverPinned.value) return;
    disableReasonPopoverName.value = '';
    disableReasonPopoverPinned.value = false;
  };

  const showDisableReasonPopover = (name, options = {}) => {
    const reason = dependencies.getCharDisableReason(name);
    if (!reason) {
      hideDisableReasonPopover(true);
      return;
    }
    const { pinned = false, autoHideMs = 0 } = options;
    disableReasonPopoverName.value = name;
    disableReasonPopoverPinned.value = !!pinned;
    if (autoHideMs > 0) {
      disableReasonAutoHideTimer = setTimeout(() => {
        disableReasonPopoverName.value = '';
        disableReasonPopoverPinned.value = false;
        disableReasonAutoHideTimer = 0;
      }, autoHideMs);
    }
  };

  const shouldShowDisableReasonPopover = (name) => {
    return disableReasonPopoverName.value === name && !!dependencies.getCharDisableReason(name) && !dependencies.isCharInList(name);
  };

  const handlePoolItemMouseEnter = (name) => {
    if (dependencies.isCharInList(name)) return;
    const reason = dependencies.getCharDisableReason(name);
    if (!reason) return;
    clearDisableReasonTimers();
    disableReasonHoverTimer = setTimeout(() => {
      showDisableReasonPopover(name, { pinned: false });
      disableReasonHoverTimer = 0;
    }, 1000);
  };

  const handlePoolItemMouseLeave = (name) => {
    const reason = dependencies.getCharDisableReason(name);
    if (!reason) return;
    if (disableReasonHoverTimer) {
      clearTimeout(disableReasonHoverTimer);
      disableReasonHoverTimer = 0;
    }
    if (!disableReasonPopoverPinned.value && disableReasonPopoverName.value === name) {
      disableReasonPopoverName.value = '';
    }
  };

  const handlePoolItemClick = (name) => {
    const reason = dependencies.getCharDisableReason(name);
    if (reason && !dependencies.isCharInList(name)) {
      clearDisableReasonTimers();
      showDisableReasonPopover(name, { pinned: true, autoHideMs: 2200 });
      return;
    }
    hideDisableReasonPopover(true);
    dependencies.toggleChar(name);
  };
  return {
    get disableReasonPopoverName() { return disableReasonPopoverName; },
    get disableReasonPopoverPinned() { return disableReasonPopoverPinned; },
    get disableReasonHoverTimer() { return disableReasonHoverTimer; },
    get disableReasonAutoHideTimer() { return disableReasonAutoHideTimer; },
    get clearDisableReasonTimers() { return clearDisableReasonTimers; },
    get hideDisableReasonPopover() { return hideDisableReasonPopover; },
    get showDisableReasonPopover() { return showDisableReasonPopover; },
    get shouldShowDisableReasonPopover() { return shouldShowDisableReasonPopover; },
    get handlePoolItemMouseEnter() { return handlePoolItemMouseEnter; },
    get handlePoolItemMouseLeave() { return handlePoolItemMouseLeave; },
    get handlePoolItemClick() { return handlePoolItemClick; }
  };
};
