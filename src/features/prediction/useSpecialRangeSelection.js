import { computed, ref } from "vue";
import { normalizeId } from './specialPredictionFormatters.js';

/** Owns special prediction range selection with explicit instance dependencies. */
export function useSpecialRangeSelection(ports = {}) {
const rangeStartDraft = ref('');

const rangeEndDraft = ref('');

const showUnpredictedRows = ref(true);

const effectiveRange = computed(() => {
  const allRows = ports.eventCatalog.numericEvents.value;
  void allRows;
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

  const parseRangeDraft = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return NaN;
    return Number(raw);
  };
  const rawStart = parseRangeDraft(rangeStartDraft.value);
  const rawEnd = parseRangeDraft(rangeEndDraft.value);
  const minAllowed = minPredictableId ?? predictedIds[0] ?? null;
  const maxAllowed = maxPredictedId ?? minAllowed;
  const unclampedStart = Number.isFinite(rawStart)
    ? rawStart
    : (predictedIds[0] ?? minAllowed);
  const unclampedEnd = Number.isFinite(rawEnd)
    ? rawEnd
    : maxAllowed;

  if (!Number.isFinite(unclampedStart) || !Number.isFinite(unclampedEnd) || !Number.isFinite(minAllowed) || !Number.isFinite(maxAllowed)) {
    return { start: null, end: null };
  }
  const start = Math.min(Math.max(unclampedStart, minAllowed), maxAllowed);
  const end = Math.min(Math.max(unclampedEnd, minAllowed), maxAllowed);
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
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
