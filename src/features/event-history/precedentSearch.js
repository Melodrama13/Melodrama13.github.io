import { queryPrecedents, getColorQuantityBounds, PRECEDENT_SKILL_LABELS } from './precedentRecords.js';
import { getCountContributions } from './milestoneCounts.js';
import { queryPeriodPrecedents } from './precedentPeriods.js';
import { querySequencePrecedents } from './precedentSequences.js';
import { getPoolQueryBounds, queryPoolPrecedents } from './precedentPoolQueries.js';
import { getMilestonePools, filterPoolOwnVs, poolParticipant, poolOwnVsMatch } from './milestonePools.js';
import { normalizeMilestoneRules, isPoolLimitedCard, isFesMilestoneSkill } from './milestoneRules.js';
import { buildMilestoneIndex } from './precedentMilestones.js';
import { MILESTONE_GRADES } from './milestoneLabels.js';
import { groupBy, makeMilestone, scopesFor, milestoneEventKey } from './milestoneShared.js';
import { makeThresholdCheckpoint, getThresholdAdvancement } from './precedentThresholds.js';
import { markPrecedentPositions, prioritizePrecedentResults } from './precedentResultPositions.js';

const snapshots = new WeakMap();
function snapshot(catalog, rules) {
  const key = JSON.stringify(rules);
  let cached = snapshots.get(catalog);
  if (cached?.key !== key) { cached = { key }; snapshots.set(catalog, cached); }
  return cached;
}
const selectedPeople = (catalog, query, ignoreCharacter = false) => catalog.characters.filter(person =>
  (ignoreCharacter || !query.character || person.zh_name === query.character)
  && (!query.scope || query.scope === 'all' || (query.scope === 'oc' ? person.unit !== 'vs' : person.unit === query.scope)));
const attributeMatches = (entry, query) => !query.attribute || ['any', 'all'].includes(query.attribute)
  || String(entry.attribute || entry.card?.Attribute || entry.source.event.event_attribute).toLowerCase() === query.attribute.toLowerCase();
const skillMatches = (entry, query) => !query.skill || String(entry.card?.Skill).toLowerCase() === query.skill;
const achievement = (type, entries, evidence, extra) => makeMilestone(type, undefined, entries, evidence, { isPersonalAchievement: true, ...extra });
const target = (query, bounds) => query.threshold === 'MAX' ? bounds.max : query.threshold === 'MIN' ? bounds.min : Math.max(0, Math.trunc(Number(query.threshold) || 0));
function boundsFor(people, counts) {
  const rows = people.map(person => ({ name: person.zh_name, count: counts.get(person.zh_name) || 0 }));
  return { max: Math.max(0, ...rows.map(row => row.count)), min: rows.length ? Math.min(...rows.map(row => row.count)) : 0, people: rows };
}
function countEntries(catalog, query, rules) {
  const cached = snapshot(catalog, rules);
  cached.counts ||= getCountContributions(catalog, rules);
  const people = selectedPeople(catalog, query).filter(person => !/banner/i.test(query.metric) || person.unit !== 'vs');
  const names = new Set(people.map(person => person.zh_name));
  return { people, entries: cached.counts.filter(entry => entry.metric === (query.metric || 'four') && names.has(entry.name) && attributeMatches(entry, query)) };
}
function searchPools(catalog, query, rules) {
  const cached = snapshot(catalog, rules);
  cached.pools ||= getMilestonePools(catalog, rules);
  const names = new Set(selectedPeople(catalog, query, true).map(person => person.zh_name));
  const required = [...new Set([query.character, query.secondCharacter].filter(Boolean))];
  const context = { 箱活: 'box', 混活: 'mix', 联动: 'collab' }[query.eventType] || query.eventType;
  return cached.pools.flatMap(pool => {
    if (context && pool.context !== context) return [];
    const matchesGacha = entry => !query.gachaType ? true : query.gachaType === 'limited' ? isPoolLimitedCard(entry.card)
      : query.gachaType === 'perm' ? !isPoolLimitedCard(entry.card) : pool.source.event.gacha_type === query.gachaType;
    const entries = filterPoolOwnVs(catalog, pool.entries.filter(entry => names.has(entry.name)
      && attributeMatches(entry, query) && skillMatches(entry, query) && matchesGacha(entry)), rules, pool.source);
    if (!entries.length || required.some(name => !entries.some(entry => entry.name === name))) return [];
    const participants = required.map(name => poolParticipant(catalog, entries.find(entry => entry.name === name)));
    if (rules.poolOwnVsOnly && participants.length === 2 && !poolOwnVsMatch(catalog, ...participants, pool.source)) return [];
    return [{ ...pool, entries, participants }];
  });
}
function streakRuns(catalog, query) {
  const names = new Set(selectedPeople(catalog, query).map(person => person.zh_name)), active = new Map(), runs = [];
  for (const step of catalog.steps) for (const [name, entries] of groupBy(step.entries.filter(entry => names.has(entry.name)), entry => entry.name)) {
    if (new Set(entries.map(entry => entry.attribute)).size !== 1) { active.delete(name); continue; }
    const previous = active.get(name), attribute = entries[0].attribute;
    const run = previous?.attribute === attribute ? previous : { name, attribute, steps: [], entries: [] };
    if (run !== previous) runs.push(run);
    run.entries.push(...entries); run.steps.push({ entries, count: run.entries.length }); active.set(name, run);
  }
  return runs.filter(run => attributeMatches(run.entries[0], query));
}

export function getHistoryQueryBounds(catalog, query, options = {}) {
  const rules = normalizeMilestoneRules(options);
  if (query.type === 'pool') return getPoolQueryBounds(catalog, query, rules);
  if (query.type === 'sequence') return querySequencePrecedents(catalog, query, rules).bounds;
  if (query.type === 'period') return queryPeriodPrecedents(catalog, query, rules).bounds;
  if (query.type === 'interval') return { max: 0, min: 0, people: [] };
  if (query.type === 'count') {
    const { people, entries } = countEntries(catalog, query, rules);
    return boundsFor(people, new Map([...groupBy(entries, entry => entry.name)].map(([name, rows]) => [name, rows.length])));
  }
  if (query.type === 'lineup') {
    const counts = searchPools(catalog, query, rules).map(pool => pool.entries.length);
    return { max: Math.max(0, ...counts), min: counts.length ? Math.min(...counts) : 0, people: [] };
  }
  if (query.attributeMode === 'streak') {
    const bests = new Map();
    for (const run of streakRuns(catalog, query)) bests.set(run.name, Math.max(bests.get(run.name) || 0, run.entries.length));
    return boundsFor(selectedPeople(catalog, query), bests);
  }
  return getColorQuantityBounds(catalog, query);
}

function queryCounts(catalog, query, rules, bounds) {
  const threshold = target(query, bounds), states = new Map(), firsts = new Map(), records = [];
  const { entries } = countEntries(catalog, query, rules);
  if (threshold > 0) for (const [, batch] of [...groupBy(entries, entry => entry.timestamp)].sort(([a], [b]) => a - b)) {
    const pending = [];
    for (const [name, additions] of groupBy(batch, entry => entry.name)) {
      const previous = states.get(name) || [], evidence = [...previous, ...additions]; states.set(name, evidence);
      if (previous.length < threshold && evidence.length >= threshold) pending.push(achievement('count', additions, evidence, {
        key: `query-count:${name}:${query.metric}:${threshold}`, name, metric: query.metric || 'four', threshold,
        before: previous.length, after: evidence.length, rules,
        ...(query.metric === 'reward' ? { breakdown: { two: evidence.filter(entry => String(entry.card.Rarity) === '2').length,
          three: evidence.filter(entry => String(entry.card.Rarity) === '3').length } } : {}),
      }));
    }
    const ceiling = Math.max(0, ...[...states.values()].map(entries => entries.length));
    for (let level = firsts.size + 1; level <= ceiling; level++) firsts.set(level,
      makeThresholdCheckpoint(level, batch.filter(entry => states.get(entry.name).length >= level)));
    for (const record of pending) {
      if (firsts.get(threshold)?.timestamp === record.timestamp) record.advancement = getThresholdAdvancement(firsts, threshold, query.scope);
      records.push(record);
    }
  }
  const missing = bounds.people.filter(person => person.count < threshold);
  return { records, threshold, progress: { covered: bounds.people.length - missing.length, total: bounds.people.length, missing } };
}
function queryIntervals(catalog, query, index) {
  const names = new Set(selectedPeople(catalog, query).map(person => person.zh_name));
  const unit = query.unit === 'periods' ? 'periods' : 'days';
  let records = [...new Map([...index.values()].flat().map(record => [record.key, record])).values()].filter(record => record.type === 'interval'
    && record.metric === (query.metric || 'four') && names.has(record.name) && record.direction === (query.direction || 'longest') && record.recordUnits.includes(unit));
  if (!query.intervalHistory && records.length) {
    const value = (query.direction === 'shortest' ? Math.min : Math.max)(...records.map(record => record[unit]));
    records = records.filter(record => record[unit] === value);
  }
  return { records, unit };
}
function queryStreaks(catalog, query, bounds) {
  const threshold = target(query, bounds);
  return { threshold, records: threshold < 1 ? [] : streakRuns(catalog, query).flatMap((run, index) => {
    const step = run.steps.find(step => step.count >= threshold);
    return step ? [achievement('streak', step.entries, run.entries.slice(0, step.count), {
      key: `query-streak:${run.name}:${index}:${threshold}`, name: run.name, attribute: run.attribute, after: threshold, threshold,
    })] : [];
  }) };
}
function queryPools(catalog, query, rules, bounds) {
  const threshold = target(query, bounds);
  return { threshold, records: searchPools(catalog, query, rules).filter(pool => query.operator === 'equal'
    ? pool.entries.length === threshold : pool.entries.length >= threshold).map(pool => achievement('lineup', pool.entries, pool.entries, {
      key: `query-pool:${pool.source.event.id}:${pool.pool}`, pool: pool.pool, threshold, after: pool.entries.length, skill: query.skill, rules,
      ...(pool.participants.length > 1 ? { pair: pool.participants.map(person => person.name), participants: pool.participants } : {}),
    })) };
}
function queryPoolMilestones(catalog, query, rules, bounds, index) {
  const threshold = target(query, bounds), required = [query.character, query.secondCharacter].filter(Boolean), records = new Map();
  for (const pool of searchPools(catalog, query, rules)) {
    const ids = new Set(pool.entries.map(entry => String(entry.card.CardID)));
    for (const record of index.get(milestoneEventKey(pool.source.event.id)) || []) {
      if (!['pairFirst', 'lineup'].includes(record.type) || record.pool !== pool.pool) continue;
      if (required.length === 2 && record.type !== 'pairFirst' || !required.length && query.skill && record.type !== 'lineup') continue;
      if (query.skill && record.type === 'lineup' && record.skill !== query.skill) continue;
      if (!record.evidence.every(card => ids.has(String(card.CardID))) || required.some(name => !record.evidence.some(card => card.Name.split(' ')[0] === name))) continue;
      const count = record.evidence.length;
      if (query.operator === 'equal' ? count !== threshold : count < threshold) continue;
      records.set(record.key, record);
    }
  }
  return { threshold, records: [...records.values()] };
}
function matchesMilestone(record, milestone, query) {
  if (record.timestamp !== milestone.timestamp) return false;
  if (record.type === 'attribute') return !query.skill && milestone.type === 'attribute' && record.name === milestone.name
    && record.attribute === milestone.attribute && record.threshold === milestone.threshold;
  if (record.type === 'count') return milestone.type === 'count' && record.name === milestone.name && record.metric === milestone.metric && record.threshold === milestone.threshold;
  if (record.type === 'interval') return milestone.type === 'interval' && record.name === milestone.name && record.metric === milestone.metric
    && record.startTimestamp === milestone.startTimestamp && milestone.direction === (query.direction || 'longest')
    && milestone.recordUnits.includes(query.unit || 'days');
  if (record.type === 'streak') return milestone.type === 'streak' && record.name === milestone.name && record.attribute === milestone.attribute && record.after === milestone.after;
  if (record.type === 'skillFirst') return milestone.type === 'skillFirst' && record.name === milestone.name && record.attribute === milestone.attribute && record.skill === milestone.skill;
  if (record.type === 'pairFirst') return record.key === milestone.key;
  if (record.type === 'lineup') {
    if (record.pool !== milestone.pool) return false;
    const ids = new Set(record.evidence.map(card => String(card.CardID)));
    if (!milestone.evidence.every(card => ids.has(String(card.CardID)))) return false;
    if (record.pair) return milestone.type === 'pairFirst' && milestone.participants.every(person => record.participants.some(selected =>
      selected.name === person.name && selected.vsUnit === person.vsUnit));
    return milestone.type === 'lineup' && milestone.skill === record.skill && milestone.after === record.after;
  }
  return record.type === milestone.type && record.name === milestone.name && record.threshold === milestone.threshold;
}
function decorate(record, query, index) {
  const candidates = [...new Map(record.events.flatMap(event => index.get(milestoneEventKey(event.id)) || []).map(item => [item.key, item])).values()];
  const matches = candidates.filter(milestone => matchesMilestone(record, milestone, query));
  if (query.onlyMilestones && !matches.length) return null;
  if (!matches.length) return record;
  const badges = [...new Map(matches.flatMap(item => item.badges).map(badge => [badge.text, badge])).values()]
    .sort((a, b) => MILESTONE_GRADES[a.grade].order - MILESTONE_GRADES[b.grade].order);
  return { ...record, ...(query.onlyMilestones ? matches[0] : record.type === 'interval' ? {
    recordUnits: matches[0].recordUnits, previousValues: matches[0].previousValues, previousRanges: matches[0].previousRanges,
    evidence: matches[0].evidence, globalRecord: true,
  } : {}), badges, badge: badges[0].text, badgeParts: badges[0], grade: badges[0].grade,
  isPersonalAchievement: !query.onlyMilestones || Boolean(query.character) };
}

/** Ordinary achievements are the source; milestones annotate/filter them, never replace their history. */
export function queryHistoryPrecedents(catalog, criteria, options = {}) {
  const query = { type: 'attribute', attributeMode: 'count', scope: 'all', order: 'all', threshold: 'MAX', metric: 'four', ...criteria };
  const rules = normalizeMilestoneRules(options.rules), index = options.index || buildMilestoneIndex(catalog, rules);
  if (query.type === 'sequence') return prioritizePrecedentResults(querySequencePrecedents(catalog, query, rules), query.order);
  if (query.type === 'pool') return prioritizePrecedentResults(queryPoolPrecedents(catalog, query, rules), query.order);
  if (query.type === 'period') return prioritizePrecedentResults(queryPeriodPrecedents(catalog, query, rules), query.order);
  if (query.type === 'interval') query.onlyMilestones = true;
  const bounds = getHistoryQueryBounds(catalog, query, rules);
  let result;
  if (query.type === 'count') result = queryCounts(catalog, query, rules, bounds);
  else if (query.type === 'interval') result = queryIntervals(catalog, query, index);
  else if (query.type === 'lineup') result = query.onlyMilestones ? queryPoolMilestones(catalog, query, rules, bounds, index) : queryPools(catalog, query, rules, bounds);
  else if (query.attributeMode === 'streak') result = queryStreaks(catalog, query, bounds);
  else if (query.attributeMode === 'skillFirst') {
    const names = new Set(selectedPeople(catalog, query).map(person => person.zh_name));
    result = { records: !query.skill || PRECEDENT_SKILL_LABELS[query.skill] && !isFesMilestoneSkill(query.skill)
      ? [...new Map([...index.values()].flat().filter(record => record.type === 'skillFirst' && names.has(record.name)
        && attributeMatches({ attribute: record.attribute }, query) && (!query.skill || record.skill === query.skill)).map(record => [record.key, record])).values()] : [] };
  } else result = queryPrecedents(catalog, { ...query, order: 'all' });
  if (query.type === 'attribute' && query.attributeMode === 'count' && query.attribute === 'all' && !query.skill) result.records = result.records.map(record => {
    const milestone = (index.get(milestoneEventKey(record.event.id)) || []).find(item => item.type === 'personalCompletion'
      && item.name === record.name && item.threshold === record.threshold && item.timestamp === record.timestamp);
    return { ...record, type: 'personalCompletion', contributors: [...new Map(record.triggerCards.map(card =>
      [`${record.name}:${card.Attribute}`, { name: record.name, attribute: card.Attribute }])).values()],
    ...(milestone ? { badges: milestone.badges, badge: milestone.badge, grade: milestone.grade } : {}) };
  });
  let records = markPrecedentPositions(result.records.map(record => decorate(record, query, index)).filter(Boolean).sort((a, b) => a.timestamp - b.timestamp || a.key.localeCompare(b.key)));
  const totalRecords = records.length;
  if (query.type === 'interval') records.sort((a, b) => (query.direction === 'shortest' ? 1 : -1) * (a[result.unit] - b[result.unit]) || a.timestamp - b.timestamp);
  if (query.order !== 'all') records = records.filter(record => record.queryPositions.includes(query.order));
  if (query.character) result.completion = null;
  if (result.completion) {
    const scope = scopesFor(catalog).find(scope => scope.key === query.scope);
    const unique = (rows, key) => [...new Map(rows.map(row => [key(row), row])).values()];
    const holders = rows => unique(rows.flatMap(row => row.triggerCards.map(card => ({ name: row.name, attribute: card.Attribute }))), holder => `${holder.name}:${holder.attribute}`);
    result.completion.records = [...groupBy(result.completion.records, record => record.timestamp)].map(([timestamp, rows]) => {
      const record = rows[0];
      const adapted = { ...record, key: `query-completion:${query.scope}:${query.attribute}:${record.threshold}`, type: 'completion', name: undefined,
        scope: query.scope, scopeLabel: scope?.label || '全角色', completionAttribute: query.attribute,
        subject: { kind: ['all', 'oc'].includes(query.scope) ? 'cohort' : 'unit', unit: query.scope },
        events: unique(rows.flatMap(row => row.events), event => milestoneEventKey(event.id)),
        triggerCards: unique(rows.flatMap(row => row.triggerCards), card => String(card.CardID)),
        evidence: unique(rows.flatMap(row => row.evidence), card => String(card.CardID)), contributors: holders(rows),
        advancement: { ...record.advancement, previous: { ...record.advancement.previous,
          holders: holders(result.records.filter(row => row.timestamp === record.advancement.previous.timestamp)) } },
      };
      const match = query.attribute === 'all' && !query.skill && (index.get(milestoneEventKey(record.event.id)) || [])
        .find(item => item.type === 'completion' && item.scope === query.scope && item.threshold === record.threshold && item.timestamp === timestamp);
      return match ? { ...adapted, grade: match.grade, badges: match.badges } : adapted;
    }).filter(record => !query.onlyMilestones || record.badges?.length);
  }
  return prioritizePrecedentResults({ ...result, records, totalRecords, bounds }, query.order);
}
