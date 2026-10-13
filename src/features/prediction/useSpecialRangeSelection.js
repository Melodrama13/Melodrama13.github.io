import { computed, ref } from "vue";
import { normalizeId } from './specialPredictionFormatters.js';
import { isCompilationEvent } from '../../utils/compilationEvents.js';

/** Owns special prediction range selection with explicit instance dependencies. */
export function useSpecialRangeSelection(ports = {}) {
const rangeStartDraft = ref('');

const rangeEndDraft = ref('');

const showUnpredictedRows = ref(true);

const effectiveRange = computed(() => {
  const allRows = ports.eventCatalog.numericEvents.value;
  const minPredictableId = ports.eventCatalog.predictableEventIds.value[0] ?? null;
  const predictedIds = [...ports.eventCatalog.activePredictedEventKeys.value]
    .map((key) => {
      const numericId = Number(key);
      if (Number.isFinite(numericId)) return numericId;
      return ports.eventCatalog.numericEvents.value.find(({ event }) => normalizeId(event?.id) === key)?.idNum;
    })
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b);
  const maxPredictedId = predictedIds[predictedIds.length - 1] ?? null;

  // Manual bounds describe the available catalog, independently of source predictions or visibility.
  const availableIds = allRows
    .filter(({ event }) => ports.eventCatalog.isPredictableBaseEvent(event) || isCompilationEvent(event))
    .map(({ idNum }) => idNum);
  if (availableIds.length === 0) return { start: null, end: null };
  const minAllowed = Math.min(...availableIds);
  const maxAllowed = Math.max(...availableIds);

  const firstId = predictedIds[0] ?? minPredictableId ?? minAllowed;
  const lastId = maxPredictedId ?? minPredictableId ?? minAllowed;
  const boundaryMonths = new Set(allRows
    .filter(({ idNum }) => idNum === firstId || idNum === lastId)
    .map(({ event }) => ports.eventCatalog.getMonthInfoFromDate(event.end_date || event.start_date || event.date)?.key)
    .filter(Boolean));
  // Extend only as far as compilation events in the boundary months.
  const boundaryCompilationIds = showUnpredictedRows.value ? allRows
    .filter(({ event }) => isCompilationEvent(event)
      && boundaryMonths.has(ports.eventCatalog.getMonthInfoFromDate(event.end_date || event.start_date || event.date)?.key))
    .map(({ idNum }) => idNum) : [];

  const parseRangeDraft = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return NaN;
    return Number(raw);
  };
  const rawStart = parseRangeDraft(rangeStartDraft.value);
  const rawEnd = parseRangeDraft(rangeEndDraft.value);
  const unclampedStart = Number.isFinite(rawStart)
    ? rawStart
    : Math.min(firstId ?? minAllowed, ...boundaryCompilationIds);
  const unclampedEnd = Number.isFinite(rawEnd)
    ? rawEnd
    : Math.max(lastId ?? maxAllowed, ...boundaryCompilationIds);

  if (!Number.isFinite(unclampedStart) || !Number.isFinite(unclampedEnd) || !Number.isFinite(minAllowed) || !Number.isFinite(maxAllowed)) {
    return { start: null, end: null };
  }
  const start = Math.min(Math.max(unclampedStart, minAllowed), maxAllowed);
  const end = Math.min(Math.max(unclampedEnd, minAllowed), maxAllowed);
  // Preserve the explicit boundary if the other, automatic boundary crosses it.
  const hasManualStart = Number.isFinite(rawStart);
  const hasManualEnd = Number.isFinite(rawEnd);
  return {
    start: hasManualStart && !hasManualEnd ? start : Math.min(start, end),
    end: hasManualEnd && !hasManualStart ? end : Math.max(start, end),
    minAllowed,
    maxAllowed
  };
});

const rangeStartPlaceholder = computed(() => {
  const value = effectiveRange.value.start;
  return Number.isFinite(value) ? String(value) : '起始ID';
});

const rangeEndPlaceholder = computed(() => {
  const value = effectiveRange.value.end;
  return Number.isFinite(value) ? String(value) : '截止ID';
});

return { rangeStartDraft,
rangeEndDraft,
showUnpredictedRows,
effectiveRange,
rangeStartPlaceholder,
rangeEndPlaceholder };
}
