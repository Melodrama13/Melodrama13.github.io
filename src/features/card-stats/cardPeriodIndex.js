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
export function buildCardPeriodIndex({ eventIds, eventDates }) {
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
    countIdsBetweenExclusive: (start, end) => countRange(sortedIds, start, end, false),
    countIdsAfterThrough: (start, end) => countRange(sortedIds, start, end, true),
    countDatesBetweenExclusive: (start, end) => countRange(sortedDates, start, end, false),
    countDatesAfter: (start) => {
      const startValue = Number(start);
      return Number.isNaN(startValue) ? 0 : sortedDates.length - findUpperBound(sortedDates, startValue);
    }
  };
}
