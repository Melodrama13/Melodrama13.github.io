import { isRegularQueryEvent } from './precedentPeriods.js';
import { isMilestoneLimited, normalizeMilestoneRules } from './milestoneRules.js';
import { scopesFor } from './milestoneShared.js';
import { markPrecedentPositions } from './precedentResultPositions.js';
import { getObservedQuantityBounds } from './precedentThresholds.js';
import { getCardImageReleaseGate } from '../../utils/spoilerGuard.js';
import { buildActivityPeriodMap } from '../../domain/activityPeriods.js';

export const QUANTITY_GAP_MIN = 3;
export const QUANTITY_GAP_METRICS = Object.freeze({ four: '四星', limited: '限定' });
const snapshotCache = new WeakMap();
const periodCount = snapshots => new Set(snapshots.map(point => point.periodKey || String(point.event.id))).size;
const metricFor = query => query.gapMetric === 'limited' ? 'limited' : 'four';
const excludeMiku = query => query.gapExcludeMiku ?? metricFor(query) === 'four';
const uniqueCards = rows => [...new Map(rows.filter(Boolean).map(card => [String(card.CardID), card])).values()]
  .sort((a, b) => +getCardImageReleaseGate(a.Date) - +getCardImageReleaseGate(b.Date)
    || String(a.CardID).localeCompare(String(b.CardID), 'en', { numeric: true }));

/** Per-event released totals, shared by queries and milestones; no floating-statistics state. */
function quantitySnapshots(catalog, metric, options) {
  const rules = normalizeMilestoneRules(options);
  const key = `${metric}:${rules.includeHairstyleWl ?? rules.includeWl3}:${rules.includeSongLimited}`;
  if (!snapshotCache.has(catalog)) snapshotCache.set(catalog, new Map());
  const cache = snapshotCache.get(catalog);
  if (cache.has(key)) return cache.get(key);
  const events = catalog.events.filter(isRegularQueryEvent);
  const bindings = buildActivityPeriodMap(catalog.sourceEvents || catalog.events.map(source => source.event));
  const entries = catalog.allSteps.flatMap(step => step.entries)
    .filter(entry => !/测试|test/i.test(entry.source.event.event_type || '')
      && (metric === 'four' ? String(entry.card.Rarity) === '4' : isMilestoneLimited(entry.card, rules)))
    .sort((a, b) => a.timestamp - b.timestamp);
  const totals = new Map(catalog.characters.map(person => [person.zh_name, { name: person.zh_name, count: 0, card: null }]));
  const snapshots = [];
  let cursor = 0;
  for (let index = 0; index < events.length; index++) {
    const source = events[index], boundary = Math.min(+catalog.now + 1, events[index + 1]?.timestamp ?? Infinity);
    const changes = [];
    let timestamp = source.timestamp;
    while (cursor < entries.length && entries[cursor].timestamp < boundary) {
      const entry = entries[cursor++], previous = totals.get(entry.name);
      if (!previous) continue;
      totals.set(entry.name, { name: entry.name, count: previous.count + 1, card: entry.card });
      if (entry.timestamp >= source.timestamp) {
        timestamp = Math.max(timestamp, entry.timestamp);
        changes.push({ name: entry.name, card: entry.card, timestamp: entry.timestamp, before: previous.count, after: previous.count + 1 });
      }
    }
    const binding = bindings.get(String(source.event.id));
    snapshots.push({ event: source.event, periodKey: binding?.key || String(source.event.id), timestamp, changes, counts: [...totals.values()] });
  }
  cache.set(key, snapshots);
  return snapshots;
}

function comparisonSnapshots(catalog, query, rules) {
  const scope = scopesFor(catalog).find(scope => scope.key === (query.scope || 'all'));
  const names = new Set((scope?.names || []).filter(name => !excludeMiku(query) || name !== '初音未来'));
  let previous = new Map(), previousMax = 0, previousMin = 0;
  const snapshots = quantitySnapshots(catalog, metricFor(query), rules).map(snapshot => {
    const values = snapshot.counts.filter(row => names.has(row.name)).map(row => ({ ...row, beforeCount: previous.get(row.name) || 0 }));
    const max = values.length ? Math.max(...values.map(row => row.count)) : 0;
    const min = values.length ? Math.min(...values.map(row => row.count)) : 0;
    const high = values.filter(row => row.count === max), low = values.filter(row => row.count === min);
    const increased = row => row.count > (previous.get(row.name) || 0);
    const raisedHigh = high.filter(increased);
    const before = { max: previousMax, min: previousMin, gap: previousMax - previousMin };
    const caughtLow = values.filter(row => row.beforeCount === previousMin && increased(row));
    const causes = max - min < before.gap ? caughtLow : raisedHigh.length ? raisedHigh : caughtLow;
    previous = new Map(values.map(row => [row.name, row.count]));
    previousMax = max; previousMin = min;
    return { event: snapshot.event, periodKey: snapshot.periodKey, timestamp: snapshot.timestamp, changes: snapshot.changes.filter(row => names.has(row.name)), before, values, max, min, gap: max - min, high, low, causes };
  });
  return { snapshots, names: [...names], scopeLabel: scope?.label || '', gapMax: Math.max(QUANTITY_GAP_MIN, ...snapshots.map(row => row.gap)) };
}

/** Only cards responsible for entry, a new episode peak, or recovery explain a gap. */
function gapEvidence(query, snapshots, recovery) {
  const first = snapshots[0], last = snapshots.at(-1);
  const node = (kind, point, actors) => {
    const contributions = actors.flatMap(actor => {
      const additions = point.changes.filter(change => change.name === actor.name);
      return additions.length ? [{ name: actor.name, before: additions[0].before, after: additions.at(-1).after,
        cards: uniqueCards(additions.map(change => change.card)) }] : [];
    });
    return { kind, event: point.event, timestamp: point.timestamp, beforeGap: point.before.gap, afterGap: point.gap,
      contributions, cards: uniqueCards(contributions.flatMap(person => person.cards)) };
  };
  const gapChanges = [node('onset', first, first.causes)];
  let peak = first.gap;
  for (const point of snapshots.slice(1)) {
    if (point.gap > peak) gapChanges.push(node('peak', point, point.causes));
    peak = Math.max(peak, point.gap);
  }
  if (recovery) {
    const restored = recovery.gap < query.gapThreshold;
    const actors = restored ? last.low.filter(row => recovery.values.some(current => current.name === row.name && current.count > row.count)) : recovery.causes;
    gapChanges.push(node(restored ? 'recovery' : 'exit', recovery, actors));
  }
  return { gapChanges, onsetActors: first.causes.map(row => ({ name: row.name })),
    recoveryActors: gapChanges.filter(point => point.kind === 'recovery').flatMap(point => point.contributions.map(person => ({ name: person.name }))),
    evidence: uniqueCards(gapChanges.flatMap(point => point.cards)), triggerCards: gapChanges[0].cards };
}

function makeGapRun(query, scopeLabel, snapshots, recovery) {
  const first = snapshots[0], last = snapshots.at(-1), end = recovery || last;
  const personal = query.gapComparison === 'personal', name = personal ? first.low[0]?.name : (first.causes[0] || first.high[0])?.name;
  return {
    type: 'quantityGap', sequenceMetric: 'quantityGap', key: `quantity-gap:${query.scope || 'all'}:${metricFor(query)}:${personal ? name : 'range'}:${query.gapOperator || 'atLeast'}:${query.gapThreshold}:${first.event.id}`,
    gapMetric: metricFor(query), gapComparison: personal ? 'personal' : 'range', gapOperator: query.gapOperator === 'equal' ? 'equal' : 'atLeast', gapThreshold: query.gapThreshold,
    scope: query.scope || 'all', scopeLabel, name, isPersonalAchievement: personal,
    subject: { kind: personal ? 'person' : 'cohort' }, gapExcludeMiku: excludeMiku(query),
    after: periodCount(snapshots), value: periodCount(snapshots), duration: periodCount(snapshots), episodeDuration: periodCount(snapshots),
    peakGap: Math.max(...snapshots.map(row => row.gap)), gapSnapshots: snapshots, recovery,
    ongoing: !recovery, recovered: Boolean(recovery && recovery.gap < query.gapThreshold),
    startEvent: first.event, startTimestamp: first.timestamp, event: end.event, events: [end.event], timestamp: end.timestamp,
    contributors: end.low.map(row => ({ name: row.name })),
    sequenceEvents: snapshots.map(row => row.event),
    ...gapEvidence(query, snapshots, recovery),
  };
}

/** Global minima may change holders; personal deficits retain their own uninterrupted identity. */
export function getQuantityGapRuns(catalog, criteria = {}, rules = {}) {
  const query = { ...criteria, gapThreshold: Math.max(QUANTITY_GAP_MIN, Math.floor(Number(criteria.gapThreshold) || QUANTITY_GAP_MIN)) };
  const { snapshots, names, scopeLabel } = comparisonSnapshots(catalog, query, rules);
  const subjects = query.gapComparison === 'personal' ? names.filter(name => !query.character || name === query.character) : ['range'];
  const runs = [];
  for (const subject of subjects) {
    let active = [], previousDuration = 0;
    const finish = recovery => {
      if (!active.length) return;
      const record = makeGapRun(query, scopeLabel, active, recovery);
      record.previousDuration = previousDuration;
      record.isRecord = previousDuration > 0 && record.after > previousDuration;
      previousDuration = Math.max(previousDuration, record.after);
      runs.push(record); active = [];
    };
    for (const snapshot of snapshots) {
      const own = query.gapComparison === 'personal' ? snapshot.values.find(row => row.name === subject) : null;
      const point = own ? { ...snapshot, low: [own], subjectCount: own.count, gap: snapshot.max - own.count,
        causes: snapshot.max - own.count < snapshot.before.max - own.beforeCount ? [own] : snapshot.high.filter(row => row.count > row.beforeCount),
        before: { ...snapshot.before, min: own.beforeCount, gap: snapshot.before.max - own.beforeCount } } : snapshot;
      const hit = point.values.length > 1 && (query.gapOperator === 'equal' ? point.gap === query.gapThreshold : point.gap >= query.gapThreshold);
      if (hit) active.push(point); else finish(point);
    }
    finish(null);
  }
  return runs.sort((a, b) => a.startTimestamp - b.startTimestamp || a.key.localeCompare(b.key));
}

export function queryQuantityGapPrecedents(catalog, query, rules = {}) {
  const runs = getQuantityGapRuns(catalog, query, rules).filter(run => !query.onlyMilestones || run.isRecord);
  const bounds = getObservedQuantityBounds(runs, run => run.after), { max, min } = bounds;
  const threshold = query.threshold === 'MIN' ? min : query.threshold == null || query.threshold === 'MAX' ? max : Number(query.threshold);
  let records = runs.filter(run => run.after === threshold)
    .map(run => ({ ...run, attainment: { event: run.gapSnapshots.at(-1).event, timestamp: run.gapSnapshots.at(-1).timestamp, count: run.after } }));
  records = markPrecedentPositions(records);
  const totalRecords = records.length;
  if (query.order === 'first' || query.order === 'latest') records = records.filter(record => record.queryPositions.includes(query.order));
  return { records, totalRecords, threshold, bounds: { ...bounds, gapMin: QUANTITY_GAP_MIN,
    gapMax: comparisonSnapshots(catalog, query, rules).gapMax } };
}

/** Fixed standard anomalies: silver on entry, gold only at an actual later duration record. */
export function collectQuantityGapMilestones(catalog, emit, rules = {}) {
  for (const gapMetric of ['four', 'limited']) {
    const query = { scope: 'all', gapMetric, gapComparison: 'range', gapThreshold: QUANTITY_GAP_MIN, gapOperator: 'atLeast' };
    for (const run of getQuantityGapRuns(catalog, query, rules)) {
      const first = run.gapSnapshots[0];
      emit({ ...run, key: `milestone:${run.key}:onset`, category: 'gap', priority: 42, milestoneAction: 'onset',
        event: first.event, events: [first.event], timestamp: first.timestamp });
      if (!run.previousDuration) continue;
      let bestDuration = run.previousDuration;
      for (let index = 0; index < run.gapSnapshots.length; index++) {
        const point = run.gapSnapshots[index], snapshots = run.gapSnapshots.slice(0, index + 1);
        const duration = periodCount(snapshots);
        if (duration <= bestDuration) continue;
        const previousDuration = bestDuration; bestDuration = duration;
        emit({ ...run, key: `milestone:${run.key}:duration:${point.event.id}`, category: 'gap', priority: 41,
          milestoneAction: 'duration', previousDuration, after: duration, value: duration, duration, episodeDuration: duration,
          gapSnapshots: snapshots, recovery: null, recovered: false, ongoing: true,
          peakGap: Math.max(...snapshots.map(row => row.gap)), event: point.event, events: [point.event], timestamp: point.timestamp,
          contributors: point.low.map(row => ({ name: row.name })), sequenceEvents: snapshots.map(row => row.event),
          ...gapEvidence(query, snapshots, null),
        });
      }
    }
  }
}
