import { getPredictionScheduleOrderEntries } from '../../domain/predictionScheduleKeys.js';
import { buildCardYearEventIndex, getCardStatsYear, getCardYearPanelLabels, parseCardYearDate } from '../card-stats/cardYearStats.js';
import { getCountContributions } from './milestoneCounts.js';
import { isPoolFesCard, isFesCard } from './milestoneRules.js';
import { isPeriodBanner, hasLimitedSubdivision, matchesPeriodCard } from './precedentPeriodRules.js';
import { OC_UNITS } from './milestoneShared.js';
import { isDuoCollaborationEvent } from '../card-stats/cardDuoRules.js';
import { markPrecedentPositions } from './precedentResultPositions.js';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const orderCache = new WeakMap();
const DAY = 86400000;
const monthInfo = (year, month, source) => ({ year, month, source, key: `${year}-${String(month).padStart(2, '0')}`, label: `${year}年${month}月` });

/** Permanent identities are authoritative; non-keyed sources use their longest calendar coverage. */
export function getEventQueryMonth(event, order) {
  if (order && /^\d+$/.test(String(event.id))) {
    if (!orderCache.has(order)) {
      try { orderCache.set(order, getPredictionScheduleOrderEntries(order)); } catch { orderCache.set(order, []); }
    }
    const match = orderCache.get(order)[Number(event.id)]?.key.match(/^(\d{2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    if (match) return monthInfo(2000 + Number(match[1]), MONTHS.indexOf(match[2].toLowerCase()) + 1, 'identity');
  }
  const start = parseCardYearDate(event.start_date), end = parseCardYearDate(event.end_date) || start;
  if (!start || !end || end < start) return null;
  const utc = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  let best;
  for (let cursor = new Date(start.getFullYear(), start.getMonth(), 1); cursor <= end; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const days = (Math.min(utc(end), utc(last)) - Math.max(utc(start), utc(cursor))) / DAY + 1;
    if (!best || days >= best.days) best = { ...monthInfo(cursor.getFullYear(), cursor.getMonth() + 1, 'coverage'), days };
  }
  return best;
}

export const periodPeople = (catalog, query) => catalog.characters.filter(person => (!query.character || person.zh_name === query.character)
  && (!query.scope || query.scope === 'all' || (query.scope === 'oc' ? person.unit !== 'vs' : person.unit === query.scope)));
export const isRegularQueryEvent = source => /^\d+$/.test(String(source.event.id)) && Number(source.event.id) > 0
  && !/测试|test|纪念/i.test(source.event.event_type || '');
const isOpeningSource = source => ['0', 'ori'].includes(String(source.event.id));

function coverageUnit(catalog, entry) {
  const unit = catalog.characterByName.get(entry.name)?.unit;
  if (unit !== 'vs') return unit;
  const affiliation = String(entry.card.Affiliation || String(entry.card.Name).split(' ')[1] || 'vs').toLowerCase();
  return OC_UNITS.includes(affiliation) ? affiliation : 'vs';
}

const activityEnd = source => {
  const date = parseCardYearDate(source.event.end_date || source.event.start_date);
  return date ? +new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999) : source.timestamp;
};
const formatDate = timestamp => new Date(timestamp).toLocaleDateString('zh-CN');
const isDynamicPeriod = kind => ['events', 'rollingYear'].includes(kind);
const filterPeriods = (periods, query) => periods.filter(period => (query.includeIncomplete !== false || period.complete)
  && (!query.periodValue || query.periodValue === 'all' || query.periodValue === period.key)).sort((a, b) => a.startTimestamp - b.startTimestamp);

function rollingPeriods(catalog, query) {
  const anchors = catalog.events.filter(isRegularQueryEvent), now = +(catalog.now || new Date());
  const length = Number(query.periodLength ?? 3);
  if (query.periodKind === 'events' && (!Number.isInteger(length) || length < 1)) return [];
  const collaborations = catalog.events.filter(source => isDuoCollaborationEvent(source.event));
  return filterPeriods(anchors.map((source, index) => {
    const startTimestamp = query.periodKind === 'events' ? source.timestamp : +parseCardYearDate(source.event.start_date);
    let sources, endTimestamp, complete;
    if (query.periodKind === 'events') {
      sources = anchors.slice(index, index + length);
      if (sources.length !== length) return null;
      endTimestamp = Math.max(...sources.map(activityEnd));
      complete = sources.length === length && endTimestamp < now;
    } else {
      const start = new Date(startTimestamp), year = start.getFullYear() + 1, month = start.getMonth();
      const end = new Date(startTimestamp);
      end.setDate(1); end.setFullYear(year); end.setMonth(month);
      end.setDate(Math.min(start.getDate(), new Date(year, month + 1, 0).getDate()));
      endTimestamp = +end - 1;
      sources = anchors.filter(item => item.timestamp >= startTimestamp && item.timestamp < +end);
      complete = +end <= now && sources.every(item => activityEnd(item) < now);
    }
    const eventCount = sources.length;
    if (query.periodKind !== 'events' || query.includeCollab) sources = [...sources, ...collaborations.filter(item =>
      item.timestamp >= startTimestamp && item.timestamp <= endTimestamp || item.allCards.some(entry => entry.timestamp >= startTimestamp && entry.timestamp <= endTimestamp))]
      .sort((a, b) => a.timestamp - b.timestamp);
    return { key: `${query.periodKind}:${source.event.id}:${query.periodKind === 'events' ? length : 1}`,
      label: `${formatDate(startTimestamp)}—${formatDate(endTimestamp)}${query.periodKind === 'events' ? ` · ${eventCount} 期` : ''}`,
      kind: query.periodKind, startTimestamp, endTimestamp, complete, sources, totalEvents: eventCount, eventCount };
  }).filter(Boolean), query);
}

export function getQueryPeriods(catalog, query) {
  if (isDynamicPeriod(query.periodKind)) return rollingPeriods(catalog, query);
  const allEvents = catalog.sourceEvents || catalog.events.map(source => source.event);
  const index = buildCardYearEventIndex(allEvents), now = catalog.now || new Date();
  const opening = index.bySourceKey.get('0')?.date || index.bySourceKey.get('ori')?.date;
  const windows = new Map(), operating = query.periodKind === 'operating';
  for (const source of catalog.events.filter(source => isRegularQueryEvent(source) || isOpeningSource(source) || isDuoCollaborationEvent(source.event))) {
    const date = parseCardYearDate(source.event.start_date);
    if (!date) continue;
    const month = getEventQueryMonth(source.event, catalog.scheduleOrder);
    const year = getCardStatsYear({ EventID: source.event.id }, date, index, { useOperatingYear: operating, newYearNextYear: query.newYearNextYear !== false });
    const key = query.periodKind === 'month' ? month?.key : String(year);
    if (!key) continue;
    if (!windows.has(key)) {
      const start = query.periodKind === 'month' ? new Date(month.year, month.month - 1, 1) : operating
        ? index.anniversaries.find(item => item.year === year && item.id > 0) && parseCardYearDate(allEvents.find(event => Number(event.id) === index.anniversaries.find(item => item.year === year && item.id > 0).id)?.start_date)
          || new Date(year, 8, 30) : new Date(year, 0, 1);
      const end = query.periodKind === 'month' ? new Date(month.year, month.month, 1) : operating
        ? parseCardYearDate(allEvents.find(event => event.festival === '周年' && parseCardYearDate(event.start_date)?.getFullYear() === year + 1)?.start_date) || new Date(year + 1, 8, 30)
        : new Date(year + 1, 0, 1);
      windows.set(key, { key, kind: query.periodKind || 'year', label: query.periodKind === 'month' ? month.label : getCardYearPanelLabels(year, operating, index.startYear).title,
        startTimestamp: +start, endTimestamp: +end - 1, complete: end <= now && (!opening || start >= opening), sources: [] });
    }
    windows.get(key).sources.push(source);
  }
  return filterPeriods([...windows.values()].map(period => {
    const totalEvents = period.sources.filter(isRegularQueryEvent).length;
    return { ...period, totalEvents, eventCount: totalEvents };
  }), query);
}

/** Keep one evidence card for equivalent overlapping windows, retaining every exact window. */
function mergeDynamicMatches(records, query) {
  if (!isDynamicPeriod(query.periodKind)) return records;
  const groups = [], previousByEvidence = new Map();
  for (const record of records) {
    const signature = JSON.stringify([record.name || record.scopeLabel, record.metric, record.value,
      query.metric === 'unitFour' ? record.period.totalEvents : null,
      record.evidence.map(card => String(card.CardID)).sort(), record.matchingEventIds]);
    const previous = previousByEvidence.get(signature);
    if (previous && record.period.endTimestamp >= previous.periodWindows[0].startTimestamp) {
      previous.periodWindows.unshift(record.period);
      previous.queryPositions = ['first', 'latest'].filter(position => previous.queryPositions.includes(position) || record.queryPositions.includes(position));
    } else {
      const group = { ...record, periodWindows: [record.period] };
      groups.push(group); previousByEvidence.set(signature, group);
    }
  }
  return groups.map(record => {
    const period = query.order === 'first' ? record.periodWindows[0] : record.periodWindows.at(-1);
    return { ...record, period, ...(record.value === 0 ? { startTimestamp: period.startTimestamp, timestamp: period.endTimestamp } : {}) };
  });
}

export function queryPeriodPrecedents(catalog, query, rules) {
  const periods = getQueryPeriods(catalog, query), unitMetric = ['unitFour', 'unitBanner'].includes(query.metric);
  const people = periodPeople(catalog, query);
  const units = [...new Set(people.map(person => person.unit))].filter(unit => query.metric !== 'unitBanner' || OC_UNITS.includes(unit));
  const subjects = unitMetric ? units.map(unit => ({ unit, label: unit.toUpperCase() })) : people.filter(person => !/Banner|banner/.test(query.metric) || person.unit !== 'vs').map(person => ({ name: person.zh_name, label: person.zh_name }));
  const contributions = getCountContributions(catalog, rules);
  const festivalBannerEvents = new Set(catalog.events.filter(source => isRegularQueryEvent(source)
    && source.event.gacha_type === '普通限定' && source.allCards.some(entry => isFesCard(entry.card))).map(source => String(source.event.id)));
  const metric = query.metric === 'permBanner' ? 'banner' : query.metric || 'banner', contributionsByPerson = new Map();
  if (!unitMetric) for (const entry of contributions) {
    if (entry.metric !== metric || query.metric === 'permBanner' && entry.source.event.gacha_type !== '常驻') continue;
    if (!contributionsByPerson.has(entry.name)) contributionsByPerson.set(entry.name, new Map());
    const byEvent = contributionsByPerson.get(entry.name), id = String(entry.source.event.id);
    if (!byEvent.has(id)) byEvent.set(id, []);
    byEvent.get(id).push(entry);
  }
  const matchesEvent = source => (!query.eventType || source.event.event_type === ({ box: '箱活', mix: '混活' }[query.eventType] || query.eventType))
    && (!isPeriodBanner(query.metric) || (!query.gachaType || (query.gachaType === 'fesLimited' ? festivalBannerEvents.has(String(source.event.id))
      : source.event.gacha_type === ({ limited: '普通限定', perm: '常驻' }[query.gachaType] || query.gachaType)))
      && (!hasLimitedSubdivision(query) || !query.limitedKind || (query.limitedKind === 'six' ? festivalBannerEvents.has(String(source.event.id)) : !festivalBannerEvents.has(String(source.event.id)))));
  const rows = periods.flatMap(period => subjects.map(subject => {
    const sources = period.sources.filter(matchesEvent).filter(source => query.metric !== 'unitFour' || isRegularQueryEvent(source));
    const matchesCard = entry => matchesPeriodCard(entry.card, query, rules, festivalBannerEvents, entry.source.event.gacha_type)
      && (!(isDynamicPeriod(query.periodKind) && isDuoCollaborationEvent(entry.source.event)) || entry.timestamp >= period.startTimestamp && entry.timestamp <= period.endTimestamp);
    let entries;
    if (unitMetric) entries = query.metric === 'unitBanner' ? sources.filter(source => catalog.characterByName.get(source.event.banner)?.unit === subject.unit)
      .map(source => ({ source, name: source.event.banner, card: source.cards.find(entry => entry.name === source.event.banner)?.card }))
      : sources.flatMap(source => {
        const matched = source.cards.filter(entry => coverageUnit(catalog, entry) === subject.unit
          && matchesCard(entry) && (query.includeFes !== false || !isPoolFesCard(entry.card)));
        return matched.length ? [{ ...matched[0], cards: matched.map(entry => entry.card) }] : [];
      });
    else entries = sources.flatMap(source => contributionsByPerson.get(subject.name)?.get(String(source.event.id)) || [])
      .filter(entry => isPeriodBanner(query.metric) || matchesCard(entry));
    const evidence = [...new Map(entries.flatMap(entry => entry.cards || (entry.card ? [entry.card] : [])).map(card => [String(card.CardID), card])).values()];
    const eventSources = [...new Map(entries.map(entry => [String(entry.source.event.id), entry.source])).values()].sort((a, b) => a.timestamp - b.timestamp);
    const timedEntries = [...entries].sort((a, b) => (a.timestamp ?? a.source.timestamp) - (b.timestamp ?? b.source.timestamp));
    const first = timedEntries[0], last = timedEntries.at(-1);
    return { type: 'period', key: `period:${period.key}:${subject.label}:${query.metric}`, name: subject.name, scopeLabel: subject.unit?.toUpperCase(),
      subject: { kind: subject.unit ? 'unit' : 'person', unit: subject.unit }, metric: query.metric, period: { ...period, totalEvents: sources.filter(isRegularQueryEvent).length },
      queryFilters: { gachaType: query.gachaType, eventType: query.eventType, limitedKind: query.limitedKind, skill: query.skill },
      value: entries.length, after: entries.length, threshold: entries.length, evidence, triggerCards: [], contributors: [],
      matchingEventIds: eventSources.map(source => String(source.event.id)),
      event: last?.source.event, events: last ? [last.source.event] : [], startEvent: first?.source.event,
      startTimestamp: first ? first.timestamp ?? first.source.timestamp : period.startTimestamp,
      timestamp: last ? last.timestamp ?? last.source.timestamp : period.endTimestamp, rules, isPersonalAchievement: true };
  }));
  const max = Math.max(0, ...rows.map(row => row.value)), min = rows.length ? Math.min(...rows.map(row => row.value)) : 0;
  const threshold = query.threshold === 'MAX' ? max : query.threshold === 'MIN' ? min : Number(query.threshold ?? max);
  let records = rows.filter(row => query.metric === 'unitFour' && query.coverage === 'all' ? row.period.totalEvents > 0 && row.value === row.period.totalEvents
    : query.operator === 'atLeast' ? row.value >= threshold : query.operator === 'atMost' ? row.value <= threshold : row.value === threshold);
  records.sort((a, b) => b.period.startTimestamp - a.period.startTimestamp || a.key.localeCompare(b.key));
  records = markPrecedentPositions(records);
  records = mergeDynamicMatches(records, query);
  const totalRecords = records.length;
  if (query.order === 'first' || query.order === 'latest') {
    records = records.filter(row => row.queryPositions.includes(query.order));
  }
  return { records, totalRecords, threshold, bounds: { max, min, people: [] }, periods };
}
