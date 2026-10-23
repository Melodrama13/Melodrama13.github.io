import { ref, computed, watch, nextTick } from "vue";
import { resolveTabDragTarget } from "./mobileTabSwitcher.js";
import { useGlassTabFeedback } from './useGlassTabFeedback.js';

/** Shared glass selector geometry, drag handling and press feedback. */
export function useGlassTabGestures({ currentTab, primaryTabs, isMobileViewport, isCompact, selectTab }) {
const primaryTabSwitcherRef = ref(null);

const desktopTabSwitcherRef = ref(null);

const desktopTabGliderRect = ref({ left: 0, top: 0, width: 0, height: 0 });

const desktopTabDragOffset = ref(0);

const isDesktopTabDragging = ref(false);

const isDesktopTabPressed = ref(false);

const mobileTabDragOffset = ref(0);

const isMobileTabDragging = ref(false);

const isMobileTabPressed = ref(false);

const primaryTabPressedIndex = ref(-1);

let primaryTabDragState = null;

let desktopTabResizeObserver = null;

let suppressPrimaryTabClick = false;

let suppressPrimaryTabClickTimer = null;

const PRIMARY_TABS = Object.freeze([...primaryTabs]);

const { isTabGliderActive } = useGlassTabFeedback({
  currentTab: currentTab,
  primaryTabs: PRIMARY_TABS,
  isMobileViewport: isMobileViewport,
  desktopSwitcherRef: desktopTabSwitcherRef,
  mobileSwitcherRef: primaryTabSwitcherRef,
  isDesktopPressed: isDesktopTabPressed,
  isMobilePressed: isMobileTabPressed,
});

const mobileTabIndex = computed(() => PRIMARY_TABS.indexOf(currentTab.value));

const mobileTabSwitcherStyle = computed(() => ({
  '--mobile-tab-offset': `${Math.max(0, mobileTabIndex.value) * 100}%`,
  '--mobile-tab-drag-x': `${mobileTabDragOffset.value}px`
}));

const desktopTabGliderStyle = computed(() => ({
  '--desktop-tab-left': `${desktopTabGliderRect.value.left}px`,
  top: `${desktopTabGliderRect.value.top}px`,
  width: `${desktopTabGliderRect.value.width}px`,
  height: `${desktopTabGliderRect.value.height}px`,
  '--desktop-tab-drag-x': `${desktopTabDragOffset.value}px`
}));

const updateDesktopTabGlider = () => {
  const switcher = desktopTabSwitcherRef.value;
  const button = switcher?.querySelectorAll?.(':scope > .primary-tab-button')?.[mobileTabIndex.value];
  if (!button || !switcher.offsetWidth) {
    desktopTabGliderRect.value = { left: 0, top: 0, width: 0, height: 0 };
    return;
  }
  desktopTabGliderRect.value = {
    left: button.offsetLeft - 2,
    top: button.offsetTop - 2,
    width: button.offsetWidth + 4,
    height: button.offsetHeight + 4
  };
};

const clearPrimaryTabDrag = () => {
  isMobileTabPressed.value = false;
  isDesktopTabPressed.value = false;
  primaryTabPressedIndex.value = -1;
  primaryTabDragState = null;
  mobileTabDragOffset.value = 0;
  desktopTabDragOffset.value = 0;
  isMobileTabDragging.value = false;
  isDesktopTabDragging.value = false;
};

const selectPrimaryTab = (tab, event) => {
  // A drag's follow-up pointer click must not swallow keyboard activation.
  if (suppressPrimaryTabClick && event?.detail !== 0) {
    event?.preventDefault?.();
    return;
  }
  selectTab(tab);
  if (!isMobileViewport.value) updateDesktopTabGlider();
};

const onPrimaryTabPointerDown = (event) => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const switcher = event.currentTarget;
  const desktop = switcher === desktopTabSwitcherRef.value && !isMobileViewport.value;
  const mobile = switcher === primaryTabSwitcherRef.value && isMobileViewport.value;
  if ((!desktop && !mobile) || mobileTabIndex.value < 0) return;
  const button = event.target?.closest?.('.primary-tab-button');
  if (!button || !switcher.contains(button) || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
  primaryTabPressedIndex.value = Array.prototype.indexOf.call(switcher.querySelectorAll(':scope > .primary-tab-button'), button);
  if (desktop) isDesktopTabPressed.value = true;
  else isMobileTabPressed.value = true;

  primaryTabDragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startIndex: mobileTabIndex.value,
    switcher,
    desktop,
    moved: false
  };
  button.setPointerCapture?.(event.pointerId);
};

const onPrimaryTabPointerMove = (event) => {
  const drag = primaryTabDragState;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const bounds = drag.switcher?.getBoundingClientRect?.();
  if (!bounds?.width) return;

  const deltaX = event.clientX - drag.startX;
  if (drag.desktop) {
    const buttons = drag.switcher.querySelectorAll(':scope > .primary-tab-button');
    const start = buttons[drag.startIndex]?.offsetLeft ?? 0;
    desktopTabDragOffset.value = Math.min(
      Math.max(deltaX, (buttons[0]?.offsetLeft ?? start) - start),
      (buttons[buttons.length - 1]?.offsetLeft ?? start) - start
    );
  } else {
    const segmentWidth = Math.max(1, (bounds.width - 8) / PRIMARY_TABS.length);
    const minOffset = -drag.startIndex * segmentWidth;
    const maxOffset = (PRIMARY_TABS.length - 1 - drag.startIndex) * segmentWidth;
    mobileTabDragOffset.value = Math.min(Math.max(deltaX, minOffset), maxOffset);
  }

  if (Math.abs(deltaX) >= 5) {
    drag.moved = true;
    if (drag.desktop) isDesktopTabDragging.value = true;
    else isMobileTabDragging.value = true;
    event.preventDefault?.();
  }
};

const onPrimaryTabPointerUp = (event) => {
  const drag = primaryTabDragState;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const bounds = drag.switcher?.getBoundingClientRect?.();
  const deltaX = event.clientX - drag.startX;

  if (drag.moved && bounds?.width) {
    const buttons = drag.desktop ? drag.switcher.querySelectorAll(':scope > .primary-tab-button') : null;
    const firstCenter = buttons?.length ? buttons[0].offsetLeft + buttons[0].offsetWidth / 2 : 0;
    const lastCenter = buttons?.length ? buttons[buttons.length - 1].offsetLeft + buttons[buttons.length - 1].offsetWidth / 2 : 0;
    const targetIndex = resolveTabDragTarget({
      startIndex: drag.startIndex,
      deltaX,
      trackWidth: drag.desktop
        ? Math.max(1, (lastCenter - firstCenter) * PRIMARY_TABS.length / (PRIMARY_TABS.length - 1))
        : Math.max(1, bounds.width - 8),
      tabCount: PRIMARY_TABS.length
    });
    suppressPrimaryTabClick = true;
    if (suppressPrimaryTabClickTimer) window.clearTimeout(suppressPrimaryTabClickTimer);
    suppressPrimaryTabClickTimer = window.setTimeout(() => {
      suppressPrimaryTabClick = false;
      suppressPrimaryTabClickTimer = null;
    }, 0);
    selectTab(PRIMARY_TABS[targetIndex]);
    if (drag.desktop) updateDesktopTabGlider();
  }

  clearPrimaryTabDrag();
};

const onPrimaryTabPointerCancel = (event) => {
  if (primaryTabDragState?.pointerId !== event.pointerId) return;
  clearPrimaryTabDrag();
};
const connectTabGliderLayout = () => {
watch([currentTab, isCompact, isMobileViewport], async () => {
  await nextTick();
  updateDesktopTabGlider();
}, { flush: 'post' });
};
return {
primaryTabSwitcherRef,
desktopTabSwitcherRef,
desktopTabGliderRect,
desktopTabDragOffset,
isDesktopTabDragging,
isDesktopTabPressed,
mobileTabDragOffset,
isMobileTabDragging,
isMobileTabPressed,
isTabGliderActive,
primaryTabPressedIndex,
get primaryTabDragState() { return primaryTabDragState; }, set primaryTabDragState(value) { primaryTabDragState = value; },
get desktopTabResizeObserver() { return desktopTabResizeObserver; }, set desktopTabResizeObserver(value) { desktopTabResizeObserver = value; },
get suppressPrimaryTabClick() { return suppressPrimaryTabClick; }, set suppressPrimaryTabClick(value) { suppressPrimaryTabClick = value; },
get suppressPrimaryTabClickTimer() { return suppressPrimaryTabClickTimer; }, set suppressPrimaryTabClickTimer(value) { suppressPrimaryTabClickTimer = value; },
PRIMARY_TABS,
mobileTabIndex,
mobileTabSwitcherStyle,
desktopTabGliderStyle,
updateDesktopTabGlider,
clearPrimaryTabDrag,
selectPrimaryTab,
onPrimaryTabPointerDown,
onPrimaryTabPointerMove,
onPrimaryTabPointerUp,
onPrimaryTabPointerCancel,
connectTabGliderLayout
};
}
