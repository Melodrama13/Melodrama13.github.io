import { computed, ref } from "vue";
import { UI_BREAKPOINTS, isViewportAtMost } from '../../ui/breakpoints.js';

/** Owns prediction editor sheet; state is per editor instance. */
export const usePredictionEditorSheet = (dependencies = {}) => {
  const MOBILE_BREAKPOINT = UI_BREAKPOINTS.compactMax;
  const SHEET_MIN_VH = 26;
  const SHEET_MID_VH = 62;
  const SHEET_MAX_VH = 92;
  const isMobileViewport = ref(typeof window !== 'undefined'
    && isViewportAtMost(window.innerWidth, MOBILE_BREAKPOINT));
  const sheetHeightVh = ref(SHEET_MID_VH);
  const sheetDragState = ref({ dragging: false, startY: 0, startVh: SHEET_MID_VH });

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const setSheetDragStart = (clientY) => {
    sheetDragState.value = {
      dragging: true,
      startY: clientY,
      startVh: sheetHeightVh.value
    };
  };

  const applySheetDragMove = (clientY) => {
    const dy = sheetDragState.value.startY - clientY;
    const deltaVh = (dy / Math.max(1, window.innerHeight)) * 100;
    sheetHeightVh.value = clamp(sheetDragState.value.startVh + deltaVh, SHEET_MIN_VH, SHEET_MAX_VH);
  };

  function moveSheetDragMouse(event) {
    if (!isMobileViewport.value || !sheetDragState.value.dragging) return;
    applySheetDragMove(event.clientY);
  }

  function endSheetDragMouse() {
    endSheetDrag();
    detachSheetPointerListeners();
  }

  function moveSheetDragTouch(event) {
    if (!isMobileViewport.value || !sheetDragState.value.dragging) return;
    const t = event.touches?.[0];
    if (!t) return;
    event.preventDefault();
    applySheetDragMove(t.clientY);
  }

  function endSheetDragTouch() {
    endSheetDrag();
    detachSheetPointerListeners();
  }

  const detachSheetPointerListeners = () => {
    window.removeEventListener('mousemove', moveSheetDragMouse);
    window.removeEventListener('mouseup', endSheetDragMouse);
    window.removeEventListener('touchmove', moveSheetDragTouch);
    window.removeEventListener('touchend', endSheetDragTouch);
    window.removeEventListener('touchcancel', endSheetDragTouch);
  };

  const attachSheetTouchListeners = () => {
    window.addEventListener('touchmove', moveSheetDragTouch, { passive: false });
    window.addEventListener('touchend', endSheetDragTouch);
    window.addEventListener('touchcancel', endSheetDragTouch);
  };

  const updateMobileViewport = () => {
    isMobileViewport.value = isViewportAtMost(window.innerWidth, MOBILE_BREAKPOINT);
    if (!isMobileViewport.value) {
      sheetHeightVh.value = SHEET_MAX_VH;
      sheetDragState.value = { dragging: false, startY: 0, startVh: SHEET_MAX_VH };
      detachSheetPointerListeners();
    } else {
      sheetHeightVh.value = clamp(sheetHeightVh.value || SHEET_MID_VH, SHEET_MIN_VH, SHEET_MAX_VH);
    }
  };

  const drawerStyle = computed(() => {
    if (!isMobileViewport.value) return {};
    return {
      height: `${sheetHeightVh.value}dvh`
    };
  });

  const endSheetDrag = () => {
    if (!isMobileViewport.value || !sheetDragState.value.dragging) return;
    const snaps = [SHEET_MIN_VH, SHEET_MID_VH, SHEET_MAX_VH];
    const closest = snaps.reduce((prev, cur) => (
      Math.abs(cur - sheetHeightVh.value) < Math.abs(prev - sheetHeightVh.value) ? cur : prev
    ), SHEET_MID_VH);
    sheetHeightVh.value = closest;
    sheetDragState.value = { dragging: false, startY: 0, startVh: sheetHeightVh.value };
  };

  function startSheetDragMouse(event) {
    if (!isMobileViewport.value) return;
    setSheetDragStart(event.clientY);
    window.addEventListener('mousemove', moveSheetDragMouse);
    window.addEventListener('mouseup', endSheetDragMouse);
  }

  function startSheetDrag(event) {
    if (!isMobileViewport.value) return;
    const t = event.touches?.[0];
    if (!t) return;
    setSheetDragStart(t.clientY);
    attachSheetTouchListeners();
  }
  return {
    get MOBILE_BREAKPOINT() { return MOBILE_BREAKPOINT; },
    get SHEET_MIN_VH() { return SHEET_MIN_VH; },
    get SHEET_MID_VH() { return SHEET_MID_VH; },
    get SHEET_MAX_VH() { return SHEET_MAX_VH; },
    get isMobileViewport() { return isMobileViewport; },
    get sheetHeightVh() { return sheetHeightVh; },
    get sheetDragState() { return sheetDragState; },
    get clamp() { return clamp; },
    get setSheetDragStart() { return setSheetDragStart; },
    get applySheetDragMove() { return applySheetDragMove; },
    get moveSheetDragMouse() { return moveSheetDragMouse; },
    get endSheetDragMouse() { return endSheetDragMouse; },
    get moveSheetDragTouch() { return moveSheetDragTouch; },
    get endSheetDragTouch() { return endSheetDragTouch; },
    get detachSheetPointerListeners() { return detachSheetPointerListeners; },
    get attachSheetTouchListeners() { return attachSheetTouchListeners; },
    get updateMobileViewport() { return updateMobileViewport; },
    get drawerStyle() { return drawerStyle; },
    get endSheetDrag() { return endSheetDrag; },
    get startSheetDragMouse() { return startSheetDragMouse; },
    get startSheetDrag() { return startSheetDrag; }
  };
};
