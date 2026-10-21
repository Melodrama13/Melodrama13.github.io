import { groupBy, makeMilestone, OC_UNITS } from './milestoneShared.js';
import { PRECEDENT_SKILL_LABELS } from './precedentRecords.js';
import { isPoolFesCard, isPoolLimitedCard, isFesMilestoneSkill } from './milestoneRules.js';
import { isDuoCollaborationEvent } from '../card-stats/cardDuoRules.js';

export const POOL_CONTEXT_LABELS = Object.freeze({
  all: '首次同池', box: '首次箱活同池', mix: '首次混活同池', collab: '首次联动同池',
  limited: '首次限定同池', 'box:limited': '首次箱限同池', 'mix:limited': '首次混限同池',
  'collab:limited': '首次联动限定同池',
});
export const getPoolEventContext = source => {
  const event = source.event;
  if (event.event_type === '箱活') return 'box';
  if (event.event_type === '混活') return 'mix';
  if (['wl', 'world link', 'world link终章'].includes(String(event.event_type).toLowerCase())) {
    const types = new Set((source.allCards || source.cards).map(entry => String(entry.card.Type).toLowerCase()));
    if (types.has('wl3')) return 'mix';
    if (types.has('wl1') || types.has('wl2')) return 'box';
    return Number(event.type_series_id) === 3 ? 'mix' : [1, 2].includes(Number(event.type_series_id)) ? 'box' : '';
  }
  return isDuoCollaborationEvent(event) ? 'collab' : '';
};

export const poolParticipant = (catalog, entry) => ({ name: entry.name, vsUnit: catalog.characterByName.get(entry.name)?.unit === 'vs'
  && OC_UNITS.includes(String(entry.card.Affiliation).toLowerCase()) ? String(entry.card.Affiliation).toLowerCase() : '' });
export const poolHasUnitContext = source => Boolean(source?.event.banner || source?.event.unit);
export const poolOwnVsMatch = (catalog, a, b, source) => {
  if (source && !poolHasUnitContext(source)) return true;
  const aUnit = catalog.characterByName.get(a.name)?.unit, bUnit = catalog.characterByName.get(b.name)?.unit;
  return (aUnit === 'vs') === (bUnit === 'vs') || (aUnit === 'vs' ? a.vsUnit === bUnit : b.vsUnit === aUnit);
};
export function filterPoolOwnVs(catalog, entries, rules, source = entries[0]?.source) {
  if (source && !poolHasUnitContext(source)) return entries;
  const units = new Set(entries.map(entry => catalog.characterByName.get(entry.name)?.unit).filter(unit => unit !== 'vs'));
  return rules.poolOwnVsOnly && units.size ? entries.filter(entry => catalog.characterByName.get(entry.name)?.unit !== 'vs'
    || units.has(String(entry.card.Affiliation).toLowerCase())) : entries;
}
export function getMilestonePools(catalog, rules) {
  return catalog.events.flatMap(source => {
    const context = getPoolEventContext(source);
    if (!context || source.event.event_type === '测试') return [];
    const eligible = (source.allCards || source.cards).filter(e => String(e.card.Rarity) === '4' && (rules.poolIncludeFes || !isPoolFesCard(e.card)));
    const pools = ['18', '27'].includes(String(source.event.id)) ? [...groupBy(eligible, e => isPoolFesCard(e.card) ? 'fes' : 'normal')] : [['main', eligible]];
    return pools.map(([pool, entries]) => ({ source, pool, entries, context }));
  });
}

export function collectPoolFirsts(catalog, emit, rules) {
  const candidates = [], patterns = [];
  const participant = entry => poolParticipant(catalog, entry);
  const participantKey = person => `${person.name}:${person.vsUnit}`;
  for (const { source, context, pool, entries } of getMilestonePools(catalog, rules)) {
      for (const limited of [false, true]) {
        const selected = entries.filter(e => !limited || isPoolLimitedCard(e.card));
        const participants = [...groupBy(selected, e => participantKey(participant(e)))].map(([, list]) => ({
          person: participant(list[0]), entry: list.reduce((a, b) => a.timestamp <= b.timestamp ? a : b),
        })).sort((a, b) => participantKey(a.person).localeCompare(participantKey(b.person)));
        for (let i = 0; i < participants.length; i += 1) for (let j = i + 1; j < participants.length; j += 1) {
          const [a, b] = [participants[i], participants[j]];
          if (a.person.name === b.person.name || rules.poolOwnVsOnly && !poolOwnVsMatch(catalog, a.person, b.person, source)) continue;
          const pairKey = [participantKey(a.person), participantKey(b.person)].join('|');
          const pairEntries = [a.entry, b.entry];
          candidates.push(makeMilestone('pairFirst', 'pair', pairEntries, pairEntries, {
            key: `pair:${pairKey}:${source.event.id}:${pool}:${Math.max(a.entry.timestamp, b.entry.timestamp)}`, pairKey, participants: [a.person, b.person],
            pair: [a.person.name, b.person.name], pool, rules, priority: 35,
            contexts: limited ? ['limited', `${context}:limited`] : ['all', context],
          }));
        }
      }
      // Existing skill-configuration firsts remain accessible within the same-pool category.
      for (const [skill, skillEntries] of groupBy(entries, e => String(e.card.Skill || '').toLowerCase())) {
        const selected = filterPoolOwnVs(catalog, skillEntries, rules, source);
        if (!PRECEDENT_SKILL_LABELS[skill] || isFesMilestoneSkill(skill) || selected.length < 2) continue;
        patterns.push(makeMilestone('lineup', 'pair', selected, selected, {
          key: `lineup:${skill}:${selected.length}:${source.event.id}:${pool}`, patternKey: `${skill}:${selected.length}`, pool, skill,
          after: selected.length, threshold: selected.length, rules, priority: 5,
        }));
      }
  }
  const seen = new Set();
  for (const [, batch] of [...groupBy(candidates, r => r.timestamp)].sort(([a], [b]) => a - b)) {
    const pending = new Map(), newKeys = [];
    for (const record of batch) {
      const firstContexts = record.contexts.filter(context => !seen.has(`${record.pairKey}|${context}`));
      newKeys.push(...record.contexts.map(context => `${record.pairKey}|${context}`));
      if (!firstContexts.length) continue;
      if (!pending.has(record.key)) pending.set(record.key, { ...record, firstContexts: [] });
      const target = pending.get(record.key);
      target.firstContexts = [...new Set([...target.firstContexts, ...firstContexts])];
    }
    pending.forEach(emit);
    newKeys.forEach(key => seen.add(key));
  }
  const seenPatterns = new Set();
  for (const [, batch] of [...groupBy(patterns, r => r.timestamp)].sort(([a], [b]) => a - b)) {
    batch.filter(r => !seenPatterns.has(r.patternKey)).forEach(emit);
    batch.forEach(r => seenPatterns.add(r.patternKey));
  }
}
