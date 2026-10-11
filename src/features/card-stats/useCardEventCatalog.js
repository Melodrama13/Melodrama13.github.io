import { GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY } from '../../domain/gameAttributes.js';
import { computed } from 'vue';
import { buildCardPeriodIndex } from './cardPeriodIndex.js';

/** Owns card event catalog behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardEventCatalog(inputs) {
  const normalizeCardStatsAttribute = (attributeValue) => {
    return GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY[String(attributeValue || '').trim().toLowerCase()] || '';
  };

  const normalizeSourceKey = (value) => String(value ?? '').trim();

  const isNumericEventId = (eventId) => /^\d+$/.test(normalizeSourceKey(eventId));

  const eventDateBySourceKey = computed(() => {
    const map = {};
    (inputs.props.allEvents || []).forEach((ev) => {
      const key = normalizeSourceKey(ev?.id);
      const date = inputs.presentation.parseDateSafe(ev?.start_date);
      if (!key || !date) return;
      map[key] = date;
    });
    return map;
  });

  const getCardSourceDate = (card) => {
    const cardDate = inputs.presentation.parseDateSafe(card?.Date);
    if (cardDate) return cardDate;
    const eventKey = normalizeSourceKey(card?.EventID);
    if (eventKey && eventDateBySourceKey.value[eventKey]) return eventDateBySourceKey.value[eventKey];
    const gachaKey = normalizeSourceKey(card?.GachaID);
    if (gachaKey && eventDateBySourceKey.value[gachaKey]) return eventDateBySourceKey.value[gachaKey];
    return null;
  };

  const getStatsCutoffDate = (maxEid) => {
    const key = normalizeSourceKey(maxEid);
    return key ? (eventDateBySourceKey.value[key] || null) : null;
  };

  const isCardWithinLimit = (card, maxEid) => {
    const eid = String(card?.EventID || '').trim();
    if (isNumericEventId(eid)) return Number(eid) <= Number(maxEid);
    const cutoffDate = getStatsCutoffDate(maxEid);
    if (!cutoffDate) return true;
    const sourceDate = getCardSourceDate(card);
    if (!sourceDate) return true;
    if (sourceDate.getTime() !== cutoffDate.getTime()) return sourceDate < cutoffDate;
    return true;
  };

  const safeMaxEventId = computed(() => {
    const n = inputs.cutoff.toFiniteEventId(inputs.cutoff.displayEventId.value);
    return n ?? 0;
  });

  const includePredictEventsInStats = computed(() => Number(safeMaxEventId.value) > Number(inputs.cutoff.autoCurrentId.value));

  const shouldSkipPredictEvent = (ev) => !!(ev?.isPredict && !includePredictEventsInStats.value);

  const allEventsById = computed(() => {
    const map = {};
    (inputs.props.allEvents || []).forEach((ev) => {
      if (!isNumericEventId(ev?.id)) return;
      map[Number(ev.id)] = ev;
    });
    return map;
  });

  const referenceDateObj = computed(() => {
    const fallback = new Date();
    const maxEid = Number(safeMaxEventId.value);
    if (!Number.isFinite(maxEid) || maxEid <= 0) return fallback;
    if (maxEid === Number(inputs.cutoff.autoCurrentId.value)) return fallback;

    const refEvent = allEventsById.value[maxEid];
    const refDate = inputs.presentation.parseDateSafe(refEvent?.start_date);
    return refDate || fallback;
  });

  const referenceDateStr = computed(() => {
    const d = referenceDateObj.value;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  });

  const eventsById = computed(() => {
    const map = {};
    (inputs.props.allEvents || []).forEach((ev) => {
      if (shouldSkipPredictEvent(ev)) return;
      if (!isNumericEventId(ev?.id)) return;
      map[Number(ev.id)] = ev;
    });
    return map;
  });

  const validPeriodEventIds = computed(() => {
    const maxEid = safeMaxEventId.value;
    return (inputs.props.allEvents || [])
      .filter((ev) => {
        if (shouldSkipPredictEvent(ev)) return false;
        if (!isNumericEventId(ev?.id)) return false;
        if (Number(ev.id) > maxEid) return false;
        return !inputs.constants.EXCLUDED_PERIOD_EVENT_TYPES.has(String(ev?.event_type || '').trim());
      })
      .map((ev) => Number(ev.id))
      .sort((a, b) => a - b);
  });

  const validPeriodEvents = computed(() => {
    const idSet = new Set(validPeriodEventIds.value);
    return (inputs.props.allEvents || [])
      .filter((ev) => {
        if (shouldSkipPredictEvent(ev)) return false;
        if (!isNumericEventId(ev?.id)) return false;
        return idSet.has(Number(ev.id));
      })
      .map((ev) => ({
        id: Number(ev.id),
        dateObj: inputs.presentation.parseDateSafe(ev.start_date)
      }))
      .filter((ev) => ev.dateObj)
      .sort((a, b) => a.id - b.id);
  });

  const cardPeriodIndex = computed(() => buildCardPeriodIndex({
    eventIds: validPeriodEventIds.value,
    eventDates: validPeriodEvents.value.map(event => event.dateObj)
  }));

  const countPeriodsBetweenExclusive = (startEvent, endEvent) => {
    const startId = Number(startEvent?.id);
    const endId = Number(endEvent?.id);
    if (Number.isFinite(startId) && Number.isFinite(endId)) {
      return cardPeriodIndex.value.countIdsBetweenExclusive(startId, endId);
    }

    const startDate = inputs.presentation.parseDateSafe(startEvent?.start_date || startEvent?.date);
    const endDate = inputs.presentation.parseDateSafe(endEvent?.start_date || endEvent?.date);
    if (!startDate || !endDate) return 0;
    return cardPeriodIndex.value.countDatesBetweenExclusive(startDate, endDate);
  };

  const countPeriodsSince = (eventRef) => {
    const eventId = Number(eventRef?.id ?? eventRef);
    const maxEid = Number(inputs.cutoff.displayEventId.value);
    if (Number.isFinite(eventId)) {
      return cardPeriodIndex.value.countIdsAfterThrough(eventId, maxEid);
    }

    const startDate = inputs.presentation.parseDateSafe(eventRef?.start_date || eventRef?.date);
    if (!startDate) return 0;
    return cardPeriodIndex.value.countDatesAfter(startDate);
  };

  return {
    isNumericEventId,
    safeMaxEventId,
    isCardWithinLimit,
    normalizeCardStatsAttribute,
    eventsById,
    referenceDateStr,
    countPeriodsSince,
    shouldSkipPredictEvent,
    referenceDateObj,
    countPeriodsBetweenExclusive,
    normalizeSourceKey,
    getStatsCutoffDate,
  };
}
