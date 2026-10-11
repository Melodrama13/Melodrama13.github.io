import { ref } from 'vue';

const haveSameLayoutValues = (previous, next) => {
  const keys = Object.keys(next);
  return keys.length === Object.keys(previous).length
    && keys.every(key => previous[key] === next[key]);
};

/** Per-instance state owned by SongPairLayout. */
export function createSongPairLayoutState() {
const duoNameCompactMap = ref({});

const duoNameRefMap = new Map();

const duoPairGridRefMap = new Map();

const duoPairGridColumnMap = ref({});

const duoNameRaf = ref(0);

const duoPairGridRaf = ref(0);

const duoPairGridResizeObserver = ref(null);
return { duoNameCompactMap, duoNameRefMap, duoPairGridRefMap, duoPairGridColumnMap, duoNameRaf, duoPairGridRaf, duoPairGridResizeObserver };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongPairLayout({
  duoNameCompactMap,
  duoNameRefMap,
  duoPairGridRefMap,
  duoPairGridColumnMap,
  duoNameRaf,
  duoPairGridRaf,
  duoPairGridResizeObserver
}) {
const scheduleRecalcDuoNameCompact = () => {
  if (duoNameRaf.value) cancelAnimationFrame(duoNameRaf.value);
  duoNameRaf.value = requestAnimationFrame(() => {
    duoNameRaf.value = 0;
    const next = {};
    duoNameRefMap.forEach((el, key) => {
      if (!el || !(el instanceof HTMLElement)) return;
      next[key] = el.scrollWidth > el.clientWidth + 1;
    });
    if (!haveSameLayoutValues(duoNameCompactMap.value, next)) {
      duoNameCompactMap.value = next;
    }
  });
};

const setDuoNameRef = (key, el) => {
  const nextEl = el instanceof HTMLElement ? el : null;
  if ((duoNameRefMap.get(key) || null) === nextEl) return;
  if (el && el instanceof HTMLElement) {
    duoNameRefMap.set(key, el);
  } else {
    duoNameRefMap.delete(key);
  }
  scheduleRecalcDuoNameCompact();
};

const parseCssPx = (value) => {
  const n = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(n) ? n : NaN;
};

const resolveGridGapPx = (styles) => {
  const columnGap = parseCssPx(styles?.columnGap);
  if (Number.isFinite(columnGap)) return columnGap;
  const gap = parseCssPx(styles?.gap);
  return Number.isFinite(gap) ? gap : 0;
};

const resolveGridMinCardWidthPx = (el, styles) => {
  const raw = String(styles?.getPropertyValue('--song-stat-min-card-width') || '').trim();
  if (!raw) return NaN;

  if (raw.endsWith('%')) {
    const ratio = Number.parseFloat(raw) / 100;
    const width = el.clientWidth || parseCssPx(styles?.width);
    if (Number.isFinite(ratio) && ratio > 0 && Number.isFinite(width) && width > 0) {
      return width * ratio;
    }
  }

  const px = parseCssPx(raw);
  return Number.isFinite(px) ? px : NaN;
};

const getBaseGridColumnCount = (el) => {
  if (!(el instanceof HTMLElement)) return 1;
  const styles = window.getComputedStyle(el);
  const width = el.clientWidth || parseCssPx(styles.width);
  const minCardWidth = resolveGridMinCardWidthPx(el, styles);
  const gap = resolveGridGapPx(styles);
  if (!Number.isFinite(width) || width <= 0) return 1;
  if (!Number.isFinite(minCardWidth) || minCardWidth <= 0) return 1;
  const count = Math.floor((width + gap) / (minCardWidth + gap));
  return Math.max(1, count);
};

const recalcDuoPairGridColumns = () => {
  const next = {};
  duoPairGridRefMap.forEach((el, unit) => {
    next[unit] = getBaseGridColumnCount(el);
  });
  if (!haveSameLayoutValues(duoPairGridColumnMap.value, next)) {
    duoPairGridColumnMap.value = next;
  }
};

const scheduleRecalcDuoPairGridColumns = () => {
  if (duoPairGridRaf.value) cancelAnimationFrame(duoPairGridRaf.value);
  duoPairGridRaf.value = requestAnimationFrame(() => {
    duoPairGridRaf.value = 0;
    recalcDuoPairGridColumns();
  });
};

const setDuoPairGridRef = (unit, el) => {
  const key = String(unit || '');
  const prevEl = duoPairGridRefMap.get(key);
  const nextEl = el instanceof HTMLElement ? el : null;
  if ((prevEl || null) === nextEl) return;
  if (duoPairGridResizeObserver.value && prevEl && prevEl !== el) {
    duoPairGridResizeObserver.value.unobserve(prevEl);
  }

  if (el && el instanceof HTMLElement) {
    duoPairGridRefMap.set(key, el);
    if (duoPairGridResizeObserver.value) duoPairGridResizeObserver.value.observe(el);
  } else {
    duoPairGridRefMap.delete(key);
  }

  scheduleRecalcDuoPairGridColumns();
};

const isDuoNameCompact = (key) => duoNameCompactMap.value[key] === true;

return { scheduleRecalcDuoNameCompact, setDuoNameRef, parseCssPx, resolveGridGapPx, resolveGridMinCardWidthPx, getBaseGridColumnCount, recalcDuoPairGridColumns, scheduleRecalcDuoPairGridColumns, setDuoPairGridRef, isDuoNameCompact };
}
