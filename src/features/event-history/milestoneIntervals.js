import { buildCardPeriodIndex } from '../card-stats/cardPeriodIndex.js';
import { groupBy, bannerEntries, makeMilestone, DAY_MS } from './milestoneShared.js';
import { isMilestoneLimited } from './milestoneRules.js';

/** The complete ended ranges are shared by ordinary searches and record detection. */
export function getClosedIntervals(catalog, rules) {
  const periodSources = catalog.events.filter(s => /^\d+$/.test(String(s.event.id)) && s.event.event_type !== '测试');
  const periodIndex = buildCardPeriodIndex({ eventIds: periodSources.map(s => s.event.id), eventDates: periodSources.map(s => s.timestamp) });
  const countPeriods = (start, end) => /^\d+$/.test(String(start.source.event.id)) && /^\d+$/.test(String(end.source.event.id))
    ? periodIndex.countIdsBetweenExclusive(Number(start.source.event.id), Number(end.source.event.id))
    : periodIndex.countDatesBetweenExclusive(start.timestamp, end.timestamp);
  const banners = bannerEntries(catalog);
  const four = (catalog.allSteps || catalog.steps).flatMap(s => s.entries).filter(e => String(e.card.Rarity) === '4');
  const streams = [
    ['four', four], ['limited', (catalog.allSteps || catalog.steps).flatMap(s => s.entries).filter(e => isMilestoneLimited(e.card, rules))], ['banner', banners],
    ['boxBanner', banners.filter(e => e.source.event.event_type === '箱活')],
    ['mixedBanner', banners.filter(e => e.source.event.event_type === '混活')],
  ];
  const ranges = [];
  for (const [metric, stream] of streams) {
    // Multiple cards for one person in one activity are one appearance in interval statistics.
    const appearances = [...groupBy(stream, e => `${e.name}:${e.source.event.id}`)].map(([, entries]) => {
      const first = entries.reduce((a, b) => a.timestamp <= b.timestamp ? a : b);
      return { ...first, timestamp: first.source.timestamp, entries };
    });
    const last = new Map();
    for (const [, appearancesAtTime] of [...groupBy(appearances, e => e.timestamp)].sort(([a], [b]) => a - b)) {
      const gaps = [];
      for (const [name, current] of groupBy(appearancesAtTime, e => e.name)) {
        const previous = last.get(name), end = current[0];
        if (previous && end.timestamp > previous.timestamp) gaps.push({
          metric, name, cohort: 'all', days: Math.round((end.timestamp - previous.timestamp) / DAY_MS),
          periods: countPeriods(previous, end), start: previous, end,
          entries: current.flatMap(e => e.entries),
          range: { name, startEvent: previous.source.event, endEvent: end.source.event,
            startTimestamp: previous.timestamp, endTimestamp: end.timestamp, entries: [...previous.entries, ...current.flatMap(e => e.entries)] },
        });
        last.set(name, { ...end, entries: current.flatMap(e => e.entries) });
      }
      ranges.push(...gaps);
    }
  }
  return ranges;
}

/** Ended intervals only. Days and period records may have different holders. */
export function collectIntervals(catalog, emit, rules) {
  for (const [metric, ranges] of groupBy(getClosedIntervals(catalog, rules), range => range.metric)) {
    const bests = new Map();
    for (const [, gaps] of [...groupBy(ranges, range => range.end.timestamp)].sort(([a], [b]) => a - b)) {
      for (const [cohort, candidates] of groupBy(gaps, gap => gap.cohort)) {
        const previous = bests.get(cohort), next = { ...previous };
        const pending = new Map();
        for (const direction of ['longest', 'shortest']) for (const unit of ['days', 'periods']) {
          const bestKey = `${direction}:${unit}`;
          const value = (direction === 'longest' ? Math.max : Math.min)(...candidates.map(gap => gap[unit]));
          const previousBest = previous?.[bestKey];
          if (previousBest?.value === value) {
            next[bestKey] = { value, ranges: [...previousBest.ranges, ...candidates.filter(gap => gap[unit] === value).map(gap => gap.range)] };
            continue;
          }
          if (previousBest && !(direction === 'longest' ? value > previousBest.value : value < previousBest.value)) continue;
          const winners = candidates.filter(gap => gap[unit] === value);
          next[bestKey] = { value, ranges: winners.map(gap => gap.range) };
          if (!previousBest) continue; // The first ended interval establishes a baseline.
          for (const gap of winners) {
            const key = `interval:${metric}:${gap.name}:${direction}:${gap.end.source.event.id}`;
            if (!pending.has(key)) pending.set(key, makeMilestone('interval', 'interval', gap.entries, gap.range.entries, {
              key, name: gap.name, subject: { kind: 'person', name: gap.name }, metric, direction, cohort, rules,
              days: gap.days, periods: gap.periods, closed: true, globalRecord: true, recordUnits: [], previousValues: {}, previousRanges: {},
              startEvent: gap.range.startEvent, startTimestamp: gap.range.startTimestamp, timestamp: gap.range.endTimestamp,
              priority: 1,
            }));
            const record = pending.get(key);
            record.recordUnits.push(unit);
            record.previousValues[unit] = previousBest.value;
            record.previousRanges[unit] = previousBest.ranges.map(range => ({ ...range, entries: undefined }));
            record.previous ??= previousBest.value;
            // Keep every tied previous holder, as well as the new interval's endpoints.
            record.evidence = [...new Map([...record.evidence, ...previousBest.ranges.flatMap(r => r.entries.map(e => e.card).filter(Boolean))]
              .map(card => [String(card.CardID), card])).values()];
          }
        }
        pending.forEach(emit);
        bests.set(cohort, next);
      }
    }
  }
}
