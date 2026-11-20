import { getFlowerGapRuns, getSequenceRuns } from './precedentSequences.js';
import { groupBy, milestoneEventKey } from './milestoneShared.js';

const BOX_FOUR = { sequenceMetric: 'four', sequence: 'unitBox' };
const FLOWER_GAP = { sequenceMetric: 'flowerGap', sequence: 'all' };
const UNIT_FOUR = { sequenceMetric: 'unitFour', sequence: 'all', includeWl: true, includeFes: true };
const SKILL_STREAK = { sequenceMetric: 'sameAttribute', sequence: 'cards', streakProperty: 'skill', includeFes: true };

export function isMilestoneSequenceQuery(query, rules) {
  if (query.sequenceMetric === 'sameAttribute') return query.sequence === 'cards' && query.streakProperty === 'skill'
    && query.includeFes && !query.gachaType;
  if (query.sequenceMetric === 'flowerGap') return query.sequence === 'all'
    && Boolean(query.includeWl) === rules.flowerGapIncludeWl && !query.includeCollab;
  return query.sequenceMetric === 'four' && query.sequence === 'unitBox' && !query.includeWl && !query.includeFes
    && (!query.attribute || query.attribute === 'any' || query.attribute === 'all') && !query.skill && !query.gachaType;
}

/** Compare all candidates at one timestamp against the same previous high. */
function emitNewHighs(candidates, { minimum, baseline }, emit) {
  const bests = new Map(baseline === undefined ? [] : [['all', baseline]]);
  for (const [, batch] of [...groupBy(candidates, candidate => candidate.timestamp)].sort(([a], [b]) => a - b)) {
    for (const [subjectKey, group] of groupBy(batch, candidate => candidate.subjectKey)) {
      const high = Math.max(...group.map(candidate => candidate.after));
      const previousRecord = bests.get(subjectKey);
      if (previousRecord !== undefined && high <= previousRecord) continue;
      bests.set(subjectKey, high);
      if (high < minimum) continue;
      for (const candidate of group.filter(candidate => candidate.after === high)) {
        const record = candidate.makeRecord();
        emit({ ...record, key: `milestone:${record.key}:${high}`, sequenceKey: record.key,
          category: 'sequence', previousRecord, priority: 10 });
      }
    }
  }
}

function getAttainments(catalog, query, rules) {
  const candidates = [];
  getSequenceRuns(catalog, query, rules, (subject, nodes, makeRecord) => {
    let after = 0, timestamp = -Infinity, trigger;
    for (const [index, node] of nodes.entries()) {
      after += node.weight;
      // An activity can contribute only after both its slot and a matching card open.
      const readyAt = Math.max(node.timestamp ?? node.source.timestamp, Math.min(...node.entries.map(entry => entry.timestamp)));
      if (readyAt >= timestamp) { timestamp = readyAt; trigger = node; }
      const event = (trigger.source.periodSources || [trigger.source]).at(-1).event;
      const attained = { after, timestamp, trigger, event };
      candidates.push({
        after, timestamp, subjectKey: query.sequenceMetric === 'sameAttribute' ? subject.key : 'all',
        makeRecord: () => {
          const available = nodes.slice(0, index + 1).map(step => ({
            ...step, entries: step.entries.filter(entry => entry.timestamp <= attained.timestamp),
          }));
          const newEntries = attained.trigger.entries.filter(entry => entry.timestamp === attained.timestamp);
          const events = query.sequenceMetric === 'sameAttribute'
            ? [...new Map(newEntries.map(entry => [milestoneEventKey(entry.source.event.id), entry.source.event])).values()]
            : [attained.event];
          return makeRecord(available, attained.after, {
            event: attained.event, events, timestamp: attained.timestamp, triggerCards: newEntries.map(entry => entry.card),
          });
        },
      });
    }
  });
  return candidates;
}

export function collectSequenceMilestones(catalog, emit, rules) {
  emitNewHighs(getAttainments(catalog, BOX_FOUR, rules), { minimum: 2 }, emit);
  const missing = [];
  const closed = getFlowerGapRuns(catalog, { ...FLOWER_GAP, includeWl: rules.flowerGapIncludeWl }, checkpoint => missing.push(checkpoint));
  if (closed.length) {
    const firstEnd = Math.min(...closed.map(record => record.timestamp));
    const baseline = Math.max(...closed.filter(record => record.timestamp === firstEnd).map(record => record.after));
    emitNewHighs(missing.filter(checkpoint => checkpoint.timestamp >= firstEnd), { minimum: 1, baseline }, emit);
  }
  emitNewHighs(getAttainments(catalog, UNIT_FOUR, rules), { minimum: 3 }, emit);
  emitNewHighs(getAttainments(catalog, SKILL_STREAK, rules), { minimum: 3 }, emit);
}
