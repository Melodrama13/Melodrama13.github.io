import { ref, computed } from 'vue';
import { selectEventHistoryRows } from '../../features/event-history/eventHistoryFilters.js';

/** Rows owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Filtering, EventOrdering, Formatting, PreviewSelections, SourceDates.
 */
export function useHistoryRows(ports) {
const previewDataRows = ref([]);

const baseEvents = computed(() => {
  const forceShowCollab = ports.filtering.filterMode.value === 'event' && (
    ports.filtering.eventFilterCriteria.value.eventTypes.includes('collab')
    || ports.filtering.eventFilterCriteria.value.gachaTypes.includes('collab')
  );
  if (forceShowCollab) return ports.filtering.sortedEvents.value;
  if (!ports.filtering.hideCollabPools.value) return ports.filtering.sortedEvents.value;
  return ports.filtering.sortedEvents.value.filter((event) => !ports.eventOrdering.isCollabPoolEvent(event));
});

const baseEventRows = computed(() => {
  return baseEvents.value.map((event) => ({
    kind: 'event',
    key: `event-${ports.formatting.normalizeEventId(event?.id)}`,
    event
  }));
});

const filteredData = computed(() => selectEventHistoryRows({
  events: baseEvents.value,
  mode: ports.filtering.filterMode.value,
  hasEventFilters: ports.filtering.hasEventFilters.value,
  hasDetailFilters: ports.filtering.hasDetailFilters.value,
  detailCriteria: ports.filtering.filterCriteria.value,
  matchEventFilters: (event) => ports.filtering.matchEventFilters(event),
  getEventCardsForFilter: (event) => ports.filtering.getEventCardsForFilter(event),
  normalizeAttribute: ports.formatting.normalizeEventHistoryAttribute
}));

const filterHitEventCount = computed(() => filteredData.value.length);

const activeFilteredEventCount = computed(() => {
  if (!ports.filtering.hasActiveFilters.value) return 0;
  return filteredData.value.length;
});

const birthdayRows = computed(() => {
  const rows = [];
  const seen = new Set();
  const sourceCards = (ports.props.allBaseCards && ports.props.allBaseCards.length > 0)
    ? ports.props.allBaseCards
    : (ports.props.allCards || []);

  sourceCards.forEach((card) => {
    if (String(card?.Type || '').toLowerCase() !== 'birthday') return;
    const name = String(card?.Name || '').trim().split(' ')[0];
    const cardDate = String(card?.Date || '').trim();
    if (!name || !cardDate) return;

    const matched = cardDate.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!matched) return;

    const year = Number(matched[1]);
    const fallbackMonth = Number(matched[2]);
    const fallbackDay = Number(matched[3]);
    if (!Number.isFinite(year) || !Number.isFinite(fallbackMonth) || !Number.isFinite(fallbackDay)) return;

    const md = ports.previewSelections.CHARACTER_BIRTHDAY_MD_MAP.value[name] || null;
    const month = md?.month || Math.trunc(fallbackMonth);
    const day = md?.day || Math.trunc(fallbackDay);
    const date = `${Math.trunc(year)}/${month}/${day}`;

    const key = `${name}|${date}`;
    if (seen.has(key)) return;
    seen.add(key);

    rows.push({
      kind: 'birthday',
      key: `birthday-${key}`,
      id: `birthday-${key}`,
      name,
      date,
      cardDate,
      Type: 'birthday',
      cardId: ports.formatting.normalizeCardIdText(card?.CardID),
      attribute: ports.formatting.normalizeEventHistoryAttribute(card?.Attribute)
    });
  });

  return rows;
});

const previewRows = computed(() => {
  return (previewDataRows.value || []).map((item, index) => {
    const idNum = Number(item?.id);
    const date = String(item?.date || '').trim();
    const week = String(item?.week || '').trim();
    const members = Array.isArray(item?.members)
      ? item.members.map((name) => String(name || '').trim()).filter((name) => !!ports.previewSelections.CHAR_MAP.value[name]).slice(0, 4)
      : [];
    const fallbackId = `${date}-${week}-${members.join('-')}-${index}`.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    const safeId = Number.isFinite(idNum) ? idNum : `x${fallbackId || index}`;
    return {
      kind: 'preview',
      key: `preview-${safeId}`,
      id: `preview-${safeId}`,
      date,
      week,
      members
    };
  }).filter((row) => row.date && row.members.length > 0);
});

const previewRowsWithAnchor = computed(() => {
  const limited = ports.filtering.normalLimitedEventsAsc.value;
  return previewRows.value.map((row) => {
    const rowTime = ports.sourceDates.getDateValue(row.date);
    const anchorEvent = limited.find((event) => {
      const t = ports.sourceDates.getDateValue(event?.start_date);
      if (!t || !rowTime) return false;
      return t >= rowTime;
    }) || null;
    const anchorEventKey = anchorEvent ? `event-${ports.formatting.normalizeEventId(anchorEvent.id)}` : '';
    return {
      ...row,
      anchorEventKey
    };
  });
});

const filteredBirthdayRows = computed(() => {
  if (ports.filtering.hideBirthdayRows.value) return [];

  if (ports.filtering.filterMode.value === 'event') {
    if (ports.filtering.hasEventFilters.value) return [];
    return birthdayRows.value;
  }

  const selected = ports.filtering.filterCriteria.value.selectedChars || [];
  return birthdayRows.value.filter((row) => {
    if (selected.length > 0 && !selected.includes(row.name)) return false;

    if (ports.filtering.filterCriteria.value.attributes.length > 0 && !ports.filtering.filterCriteria.value.attributes.includes(ports.formatting.normalizeEventHistoryAttribute(row.attribute))) return false;

    if (ports.filtering.filterCriteria.value.skills.length > 0) return false;
    if (ports.filtering.filterCriteria.value.units.length > 0) return false;
    if (ports.filtering.filterCriteria.value.cardTypes.length > 0) return false;

    return true;
  });
});

const filteredPreviewRows = computed(() => {
  if (ports.filtering.hidePreviewRows.value) return [];
  if (ports.filtering.hasActiveFilters.value) return [];
  return previewRowsWithAnchor.value;
});

const rowTypePriority = (row) => {
  if (row.kind === 'preview') return 0;
  if (row.kind === 'birthday') return 1;
  return 2;
};

const displayRows = computed(() => {
  const events = ports.filtering.hasActiveFilters.value
    ? filteredData.value.map((event) => ({
      kind: 'event',
      key: `event-${ports.formatting.normalizeEventId(event?.id)}`,
      event
    }))
    : baseEventRows.value;
  const birthdays = filteredBirthdayRows.value;
  const previews = filteredPreviewRows.value;
  const merged = birthdays.length > 0 ? [...events, ...birthdays] : [...events];

  merged.sort((a, b) => {
    const ta = a.kind === 'event' ? ports.sourceDates.getDateValue(a.event?.start_date) : ports.sourceDates.getDateValue(a.date);
    const tb = b.kind === 'event' ? ports.sourceDates.getDateValue(b.event?.start_date) : ports.sourceDates.getDateValue(b.date);
    if (ta !== tb) return ports.filtering.sortDesc.value ? tb - ta : ta - tb;

    const pa = rowTypePriority(a);
    const pb = rowTypePriority(b);
    if (pa !== pb) return pa - pb;

    if (a.kind === 'birthday' && b.kind === 'birthday') {
      const ao = ports.formatting.BIRTHDAY_ORDER[a.name] ?? 999;
      const bo = ports.formatting.BIRTHDAY_ORDER[b.name] ?? 999;
      if (ao !== bo) return ao - bo;
    }

    if (a.kind === 'event' && b.kind === 'event') {
      const pa = ports.eventOrdering.eventSameDateOrder(a.event);
      const pb = ports.eventOrdering.eventSameDateOrder(b.event);
      if (pa !== pb) return pa - pb;

      const aNum = ports.formatting.isNumericEventId(a.event?.id);
      const bNum = ports.formatting.isNumericEventId(b.event?.id);
      if (aNum && bNum) return Number(a.event.id) - Number(b.event.id);
    }

    const ak = a.kind === 'event' ? ports.formatting.normalizeEventId(a.event?.id) : a.key;
    const bk = b.kind === 'event' ? ports.formatting.normalizeEventId(b.event?.id) : b.key;
    return ak.localeCompare(bk);
  });

  if (previews.length === 0) return merged;

  const previewBucket = new Map();
  const unAnchored = [];
  previews.forEach((row) => {
    if (!row.anchorEventKey) {
      unAnchored.push(row);
      return;
    }
    if (!previewBucket.has(row.anchorEventKey)) previewBucket.set(row.anchorEventKey, []);
    previewBucket.get(row.anchorEventKey).push(row);
  });

  previewBucket.forEach((rows) => {
    rows.sort((a, b) => {
      const ta = ports.sourceDates.getDateValue(a.date);
      const tb = ports.sourceDates.getDateValue(b.date);
      return ports.filtering.sortDesc.value ? tb - ta : ta - tb;
    });
  });

  const withPreview = [];
  merged.forEach((row) => {
    if (row.kind === 'event') {
      const bucket = previewBucket.get(row.key);
      if (bucket && bucket.length > 0) withPreview.push(...bucket);
    }
    withPreview.push(row);
  });

  if (unAnchored.length > 0) {
    unAnchored.sort((a, b) => {
      const ta = ports.sourceDates.getDateValue(a.date);
      const tb = ports.sourceDates.getDateValue(b.date);
      return ports.filtering.sortDesc.value ? tb - ta : ta - tb;
    });
    return ports.filtering.sortDesc.value ? [...unAnchored, ...withPreview] : [...withPreview, ...unAnchored];
  }

  return withPreview;
});


return {
  filterHitEventCount,
  activeFilteredEventCount,
  displayRows,
  baseEvents,
  previewDataRows,
};
}
