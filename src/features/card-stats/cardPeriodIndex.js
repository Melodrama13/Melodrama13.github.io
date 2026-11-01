import { buildActivityPeriodGroups, isCountedActivityEvent } from '../../domain/activityPeriods.js';

function findLowerBound(values, target) {
  let start = 0;
  let end = values.length;
  while (start < end) {
    const middle = start + Math.floor((end - start) / 2);
    if (values[middle] < target) start = middle + 1;
    else end = middle;
  }
  return start;
}

function findUpperBound(values, target) {
  let start = 0;
  let end = values.length;
  while (start < end) {
    const middle = start + Math.floor((end - start) / 2);
    if (values[middle] <= target) start = middle + 1;
    else end = middle;
  }
  return start;
}

/** Index period occurrences without deduplication; each query uses binary bounds. */
export function buildCardPeriodIndex({ eventIds = [], eventDates = [], events, allEvents = events,
  dateForEvent = event => new Date(event.start_date) }) {
  const idAliases = new Map(), dateAliases = new Map();
  if (events) {
    const visible = new Set(events.filter(isCountedActivityEvent).map(event => String(event.id)));
    const groups = buildActivityPeriodGroups(allEvents);
    for (const group of groups) {
      const id = Number(group.events[0].id), date = +dateForEvent(group.events[0]);
      for (const event of group.events) {
        idAliases.set(Number(event.id), id);
        const memberDate = +dateForEvent(event);
        if (Number.isFinite(memberDate) && Number.isFinite(date)) dateAliases.set(memberDate, date);
      }
    }
    const selected = groups.filter(group => group.events.some(event => visible.has(String(event.id))));
    eventIds = selected.map(group => group.events[0].id);
    eventDates = selected.map(group => dateForEvent(group.events[0])).filter(date => date != null);
  }
  const sortedIds = eventIds.map(Number).filter(value => !Number.isNaN(value)).sort((a, b) => a - b);
  const sortedDates = eventDates.map(Number).filter(value => !Number.isNaN(value)).sort((a, b) => a - b);

  const countRange = (values, start, end, includeEnd) => {
    const startValue = Number(start);
    const endValue = Number(end);
    if (!(startValue < endValue)) return 0;
    const endBound = includeEnd ? findUpperBound(values, endValue) : findLowerBound(values, endValue);
    return endBound - findUpperBound(values, startValue);
  };

  return {
    countIdsBetweenExclusive: (start, end) => countRange(sortedIds, idAliases.get(Number(start)) ?? start, idAliases.get(Number(end)) ?? end, false),
    countIdsAfterThrough: (start, end) => countRange(sortedIds, idAliases.get(Number(start)) ?? start, idAliases.get(Number(end)) ?? end, true),
    countDatesBetweenExclusive: (start, end) => countRange(sortedDates, dateAliases.get(Number(start)) ?? start, dateAliases.get(Number(end)) ?? end, false),
    countDatesAfter: (start) => {
      const startValue = dateAliases.get(Number(start)) ?? Number(start);
      return Number.isNaN(startValue) ? 0 : sortedDates.length - findUpperBound(sortedDates, startValue);
    }
  };
}
