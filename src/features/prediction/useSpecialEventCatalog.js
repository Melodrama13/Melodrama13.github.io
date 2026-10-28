import { computed } from "vue";
import { isCompilationEvent } from "../../utils/compilationEvents.js";
import { normalizeUnit, normalizeId, getBaseName } from './specialPredictionFormatters.js';
import { isCollaborationEvent } from '../../domain/collaborationEvents.js';
import { isWorldLinkCardType } from '../../domain/worldLink.js';

/** Owns special prediction event catalog with explicit instance dependencies. */
export function useSpecialEventCatalog(ports = {}) {
const isBfesCard = (card) => {
  const type = String(card?.Type || '').trim().toLowerCase();
  const skill = String(card?.Skill || '').trim().toLowerCase();
  return type === 'bfes' || skill === 'bfes_up';
};

const isFesCard = (card) => {
  const type = String(card?.Type || '').trim().toLowerCase();
  return type === 'bfes' || type === 'cfes';
};

const parseYmd = (value) => {
  const match = String(value || '').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
};

const formatDate = (value) => {
  const parsed = parseYmd(value);
  if (!parsed) return String(value || '').trim();
  return `${parsed.year}/${parsed.month}/${parsed.day}`;
};

const getMonthInfoFromDate = (value) => {
  const parsed = parseYmd(value);
  if (!parsed) return null;
  return {
    key: `${parsed.year}-${String(parsed.month).padStart(2, '0')}`,
    label: `${parsed.month}月`
  };
};

const getEventType = (event) => String(event?.event_type || event?.source_event_type || '').trim();

const getEventUnit = (event) => normalizeUnit(event?.unit || event?.source_unit);

const hasValidEventTitle = (value) => String(value || '').trim().length > 0;

const isOfficialRevealedEvent = (event) => !!event && hasValidEventTitle(event.event_title);

const getSourceEventTypeText = (event) => (
  Object.prototype.hasOwnProperty.call(event || {}, 'source_event_type')
    ? String(event?.source_event_type || '').trim()
    : String(event?.event_type || '').trim()
);

const isTestEvent = (event) => {
  const type = getSourceEventTypeText(event).toLowerCase();
  return type === '测试' || type === 'test' || type.includes('测试');
};

const isWorldLinkFinalEvent = (event) => {
  const type = getSourceEventTypeText(event).toLowerCase().replace(/\s+/g, '');
  return type.includes('终章') && (type.includes('wl') || type.includes('worldlink'));
};

const isPredictDisabledEvent = (event) => (
  isTestEvent(event) || isWorldLinkFinalEvent(event) || isCompilationEvent(event)
);

const isPredictableBaseEvent = (event) => (
  (Number.isFinite(Number(event?.id)) || isCollaborationEvent(event))
  && !isPredictDisabledEvent(event)
  && !isOfficialRevealedEvent(event)
  && (!isCollaborationEvent(event) || (ports.metadata.baseCardsByEventId.value.get(normalizeId(event.id)) || []).length > 0)
);

const resolveUnitFromCards = (cards) => {
  const normalCards = (Array.isArray(cards) ? cards : []).filter((card) => !isFesCard(card));
  const firstOc = normalCards.find((card) => {
    const base = getBaseName(card?.Name);
    return base && !ports.metadata.vsNameSet.value.has(base);
  });
  return normalizeUnit(firstOc?.Affiliation || normalCards[0]?.Affiliation);
};

const buildSeriesLabel = (event) => {
  const sid = String(event?.type_series_id || '').trim();
  const eventType = getEventType(event);
  if (!sid) return eventType === 'World Link' ? getWlPartLabel(event) : '';
  const banner = getBaseName(event?.banner);
  const bannerLabel = banner || '';
  if (eventType === '箱活') return `${bannerLabel}${sid}箱`;
  if (eventType === '混活') return `${bannerLabel}${sid}混`;
  if (eventType === 'World Link') return `WL${sid}${getWlPartLabel(event)}`;
  return sid;
};

const getWlPartLabel = (event) => {
  const currentId = Number(event?.id);
  if (!Number.isFinite(currentId)) return '';
  const eventType = getEventType(event);
  if (eventType !== 'World Link') return '';
  const sid = Number(String(event?.type_series_id || '').trim());
  if (!Number.isFinite(sid) || sid !== 3) return '';
  const ids = numericEvents.value
    .filter(({ event: item }) => {
      if (getEventType(item) !== 'World Link') return false;
      const itemSid = Number(String(item?.type_series_id || '').trim());
      return Number.isFinite(itemSid) && itemSid === 3;
    })
    .map(({ idNum }) => idNum);
  const index = ids.indexOf(currentId);
  return index >= 0 ? `P${index + 1}` : '';
};

const getLimitedRibbonLabel = (card) => {
  const type = String(card?.Type || '').trim().toLowerCase();
  if (isWorldLinkCardType(type) || type === 'ue') return 'WL限定';
  if (type === 'bfes' || type === 'cfes') return 'FES限定';
  if (type === 'limited') return '期间限定';
  if (type === 'collab' || type === 'collab_t') return '联动限定';
  return '';
};

const hasCardType = (cards, types) => {
  const set = new Set(types);
  return (Array.isArray(cards) ? cards : []).some((card) => set.has(String(card?.Type || '').trim().toLowerCase()));
};

const getRowLimitClass = (event, cards) => {
  const eventType = getEventType(event);
  const gachaType = String(event?.gacha_type || '').trim();
  if (eventType === 'World Link' || gachaType === 'UE限定' || hasCardType(cards, ['ue']) || (cards || []).some(card => isWorldLinkCardType(card?.Type))) {
    return 'is-ue-event';
  }
  if (gachaType === '普通限定' || hasCardType(cards, ['limited', 'collab_t'])) {
    return 'is-limited-event';
  }
  return '';
};

const numericEvents = computed(() => {
  const allEvents = Array.isArray(ports.props.allEvents) ? ports.props.allEvents : [];
  const numericRows = allEvents
    .filter((event) => Number.isFinite(Number(event?.id)))
    .map((event, index) => ({
      event,
      index,
      idNum: Number(event.id),
      scheduleIndex: Number.isFinite(Number(event?.predict_schedule_index))
        ? Number(event.predict_schedule_index)
        : Number(event.id)
    }))
    .sort((a, b) => a.scheduleIndex - b.scheduleIndex || a.idNum - b.idNum || a.index - b.index);

  const collaborationRows = allEvents
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => isCollaborationEvent(event))
    .map(({ event, index }) => {
      const specialStart = parseYmd(event?.start_date);
      const specialTime = specialStart ? Date.UTC(specialStart.year, specialStart.month - 1, specialStart.day) : NaN;
      const rowsWithDates = numericRows.map((row) => {
        const start = parseYmd(row.event?.start_date);
        const end = parseYmd(row.event?.end_date || row.event?.start_date);
        return {
          row,
          startTime: start ? Date.UTC(start.year, start.month - 1, start.day) : NaN,
          endTime: end ? Date.UTC(end.year, end.month - 1, end.day) : NaN
        };
      });
      const overlapping = rowsWithDates.find(({ startTime, endTime }) => (
        Number.isFinite(specialTime)
        && Number.isFinite(startTime)
        && Number.isFinite(endTime)
        && specialTime >= startTime
        && specialTime <= endTime
      ));
      const previous = rowsWithDates
        .filter(({ startTime }) => Number.isFinite(specialTime) && Number.isFinite(startTime) && startTime <= specialTime)
        .at(-1);
      const anchor = overlapping?.row || previous?.row || numericRows.at(-1) || null;
      const anchorId = anchor?.idNum ?? 0;
      return {
        event,
        index,
        idNum: anchorId,
        scheduleIndex: anchorId + 0.5
      };
    });

  return [...numericRows, ...collaborationRows]
    .sort((a, b) => a.scheduleIndex - b.scheduleIndex || a.idNum - b.idNum || a.index - b.index);
});

const predictableEventIds = computed(() => numericEvents.value
  .filter(({ event }) => isPredictableBaseEvent(event))
  .map(({ idNum }) => idNum)
  .filter((id, index, ids) => ids.indexOf(id) === index)
  .sort((a, b) => a - b));

const predictPatchById = computed(() => {
  const source = ports.sourceSelection.selectedSource.value;
  const patches = Array.isArray(source?.predictiveEvents) ? source.predictiveEvents : [];
  const map = new Map();
  patches.forEach((patch) => {
    const key = normalizeId(patch?.id);
    if (key) map.set(key, patch);
  });
  return map;
});

const multiPredictPatchMaps = computed(() => new Map(
  ports.sourceSelection.selectedMultiSources.value.map((source) => {
    const patches = new Map();
    source.predictiveEvents.forEach((patch) => {
      const key = normalizeId(patch?.id);
      if (key) patches.set(key, patch);
    });
    return [source.id, patches];
  })
));

const activePredictedEventKeys = computed(() => {
  const keys = new Set();
  ports.sourceSelection.activeCaseSources.value.forEach((source) => {
    source.predictiveEvents.forEach((patch) => {
      const key = normalizeId(patch?.id);
      if (key) keys.add(key);
    });
  });
  return keys;
});

return { isBfesCard,
isFesCard,
parseYmd,
formatDate,
getMonthInfoFromDate,
getEventType,
getEventUnit,
hasValidEventTitle,
isOfficialRevealedEvent,
getSourceEventTypeText,
isTestEvent,
isWorldLinkFinalEvent,
isCollaborationEvent,
isPredictDisabledEvent,
isPredictableBaseEvent,
resolveUnitFromCards,
buildSeriesLabel,
getWlPartLabel,
getLimitedRibbonLabel,
hasCardType,
getRowLimitClass,
numericEvents,
predictableEventIds,
predictPatchById,
multiPredictPatchMaps,
activePredictedEventKeys };
}
