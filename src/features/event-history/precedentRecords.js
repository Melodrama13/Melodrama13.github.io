import { GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY } from '../../domain/gameAttributes.js';
import { getCardImageReleaseGate, getEventStartGate } from '../../utils/spoilerGuard.js';
import { makeThresholdCheckpoint, getThresholdAdvancement } from './precedentThresholds.js';
import { isPoolFesCard } from './milestoneRules.js';

export const PRECEDENT_ATTRIBUTES = Object.values(GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY);
export const PRECEDENT_ATTRIBUTE_LABELS = { Pure: '绿草', Cool: '蓝星', Cute: '粉花', Happy: '橙心', Mysterious: '紫月' };
export const PRECEDENT_SKILL_LABELS = { p_score: 'P 分', score_up: '普分', accuracy: '判卡', recovery: '奶卡', unit_score: '团分', cfes_l: 'CFES 血分', cfes_j: 'CFES 判分', bfes_up: 'BFES' };
const eventKey = value => String(value ?? '').trim().replace(/^0$/, 'ori');
const baseName = value => String(value || '').trim().split(' ')[0];

export function isPrecedentEventAvailable(event, now = new Date()) {
  const gate = getEventStartGate(event) || getCardImageReleaseGate(event?.start_date);
  return !event?.isPredict && Boolean(gate && gate <= now);
}

/** Keep four-star query streams stable; the broader ledger supplies staircase milestones. */
export function buildPrecedentCatalog({ events = [], cards = [], characters = [], now = new Date(), scheduleOrder = null, songs = [] }) {
  const characterByName = new Map(characters.map(character => [character.zh_name, character]));
  const eventById = new Map();
  for (const event of events) {
    if (!isPrecedentEventAvailable(event, now)) continue;
    const gate = getEventStartGate(event) || getCardImageReleaseGate(event.start_date);
    if (!gate || gate > now) continue;
    eventById.set(eventKey(event.id), { event, timestamp: gate.getTime(), cards: [], allCards: [], pendingUp: [] });
  }
  const seen = new Set();
  const stepsByTime = new Map();
  const allStepsByTime = new Map();
  const personalStepsByTime = new Map();
  for (const card of cards) {
    const id = String(card.CardID ?? '').trim();
    const name = baseName(card.Name);
    const attribute = GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY[String(card.Attribute || '').toLowerCase()];
    const gate = getCardImageReleaseGate(card.Date);
    const source = eventById.get(eventKey(card.EventID)) || eventById.get(eventKey(card.GachaID))
      || String(card.Rarity) === 'birthday' && gate && { event: { id: card.EventID || card.GachaID || `birthday:${id}`, start_date: card.Date,
        event_type: '生日', event_title: `${name}生日卡`, isPersonalCardSource: true }, timestamp: gate.getTime(), cards: [], allCards: [] };
    if (!id || seen.has(id) || card.isPredict || !['1', '2', '3', '4', 'birthday'].includes(String(card.Rarity))
      || !characterByName.has(name) || !source || !gate) continue;
    const timestamp = Math.max(source.timestamp, gate.getTime());
    if (timestamp > now.getTime()) {
      if (String(card.Rarity) === '4') source.pendingUp.push({ timestamp, fes: isPoolFesCard(card) });
      continue;
    }
    seen.add(id);
    const entry = { card, name, attribute, source, timestamp };
    if (!personalStepsByTime.has(timestamp)) personalStepsByTime.set(timestamp, []);
    personalStepsByTime.get(timestamp).push(entry);
    if (String(card.Rarity) === 'birthday') continue;
    source.allCards.push(entry);
    if (!allStepsByTime.has(timestamp)) allStepsByTime.set(timestamp, []);
    allStepsByTime.get(timestamp).push(entry);
    if (String(card.Rarity) !== '4' || !attribute) continue;
    source.cards.push(entry);
    if (!stepsByTime.has(timestamp)) stepsByTime.set(timestamp, []);
    stepsByTime.get(timestamp).push(entry);
  }
  return {
    now, sourceEvents: events, scheduleOrder, songs,
    characters,
    characterByName,
    events: [...eventById.values()].sort((a, b) => a.timestamp - b.timestamp),
    steps: [...stepsByTime].sort(([a], [b]) => a - b).map(([timestamp, entries]) => ({ timestamp, entries })),
    allSteps: [...allStepsByTime].sort(([a], [b]) => a - b).map(([timestamp, entries]) => ({ timestamp, entries })),
    personalCardSteps: [...personalStepsByTime].sort(([a], [b]) => a - b).map(([timestamp, entries]) => ({ timestamp, entries })),
  };
}

function getSelectedNames(catalog, query) {
  return catalog.characters.filter(character => {
    if (query.character && character.zh_name !== query.character) return false;
    if (query.scope === 'oc' && character.unit === 'vs') return false;
    if (query.scope && !['all', 'oc'].includes(query.scope) && character.unit !== query.scope) return false;
    return true;
  }).map(character => character.zh_name);
}

function matchesEntry(entry, names, query) {
  return names.has(entry.name)
    && (!query.attribute || entry.attribute === query.attribute)
    && (!query.skill || String(entry.card.Skill).toLowerCase() === query.skill);
}

function makeRecord(type, entries, evidence, extra = {}) {
  const events = [...new Map(entries.map(entry => [eventKey(entry.source.event.id), entry.source.event])).values()];
  return {
    type,
    event: events[0],
    events,
    timestamp: entries[0].timestamp,
    evidence: evidence.map(entry => entry.card),
    triggerCards: entries.map(entry => entry.card),
    ...extra,
  };
}

function queryAttributes(catalog, query, names) {
  const counts = new Map();
  const records = [];
  const firstReached = new Map();
  for (const step of catalog.steps) {
    const groups = new Map();
    const previousLevelEntries = [];
    const stepRecords = [];
    for (const entry of step.entries) {
      if (!matchesEntry(entry, names, query)) continue;
      const key = `${entry.name}:${entry.attribute}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
    for (const [key, entries] of groups) {
      const previous = counts.get(key) || [];
      const evidence = [...previous, ...entries];
      counts.set(key, evidence);
      if (query.threshold > 1 && previous.length < query.threshold - 1 && evidence.length >= query.threshold - 1) previousLevelEntries.push(...entries);
      if (previous.length >= query.threshold || evidence.length < query.threshold) continue;
      stepRecords.push(makeRecord('attribute', entries, evidence, {
        key: `attribute:${key}:${query.threshold}`,
        name: entries[0].name,
        attribute: entries[0].attribute,
        threshold: query.threshold,
        before: previous.length,
        after: evidence.length,
      }));
    }
    if (previousLevelEntries.length && !firstReached.has(query.threshold - 1)) {
      firstReached.set(query.threshold - 1, makeThresholdCheckpoint(query.threshold - 1, previousLevelEntries));
    }
    if (stepRecords.length && !firstReached.has(query.threshold)) {
      firstReached.set(query.threshold, makeThresholdCheckpoint(query.threshold, [...groups.values()].flat().filter(entry =>
        counts.get(`${entry.name}:${entry.attribute}`).length >= query.threshold)));
      const advancement = getThresholdAdvancement(firstReached, query.threshold, query.scope || 'all');
      stepRecords.forEach(record => { if (advancement) record.advancement = advancement; });
    }
    records.push(...stepRecords);
  }
  return { records };
}

/** Extremes are taken across people, after applying the selected color rule per person. */
export function getColorQuantityBounds(catalog, criteria) {
  const names = new Set(getSelectedNames(catalog, criteria));
  const attributes = PRECEDENT_ATTRIBUTES.includes(criteria.attribute) ? [criteria.attribute] : PRECEDENT_ATTRIBUTES;
  const counts = new Map([...names].map(name => [name, Object.fromEntries(attributes.map(attribute => [attribute, 0]))]));
  for (const step of catalog.steps) for (const entry of step.entries) {
    if (!names.has(entry.name) || !attributes.includes(entry.attribute)
      || criteria.skill && String(entry.card.Skill).toLowerCase() !== criteria.skill) continue;
    counts.get(entry.name)[entry.attribute] += 1;
  }
  const people = [...counts].map(([name, values]) => ({
    name,
    count: (criteria.attribute === 'all' ? Math.min : Math.max)(...Object.values(values)),
    attributes: attributes.map(attribute => ({ attribute, count: values[attribute] })),
  }));
  return {
    min: people.length ? Math.min(...people.map(person => person.count)) : 0,
    max: people.length ? Math.max(...people.map(person => person.count)) : 0,
    people,
  };
}

function queryAllColors(catalog, query, names) {
  const states = new Map([...names].map(name => [name, Object.fromEntries(PRECEDENT_ATTRIBUTES.map(attribute => [attribute, []]))]));
  const firstReached = new Map();
  const records = [];
  for (const step of catalog.steps) {
    const groups = new Map();
    for (const entry of step.entries) {
      if (!matchesEntry(entry, names, { ...query, attribute: '' })) continue;
      if (!groups.has(entry.name)) groups.set(entry.name, []);
      groups.get(entry.name).push(entry);
    }
    const previousLevelEntries = [];
    const currentLevelEntries = [];
    const stepRecords = [];
    for (const [name, entries] of groups) {
      const state = states.get(name);
      const before = Math.min(...PRECEDENT_ATTRIBUTES.map(attribute => state[attribute].length));
      entries.forEach(entry => state[entry.attribute].push(entry));
      const after = Math.min(...PRECEDENT_ATTRIBUTES.map(attribute => state[attribute].length));
      if (query.threshold > 1 && before < query.threshold - 1 && after >= query.threshold - 1) previousLevelEntries.push(...entries);
      if (before >= query.threshold || after < query.threshold) continue;
      currentLevelEntries.push(...entries);
      stepRecords.push(makeRecord('attribute', entries, PRECEDENT_ATTRIBUTES.flatMap(attribute => state[attribute]), {
        key: `attribute:${name}:all:${query.threshold}`, name, attribute: 'all', threshold: query.threshold, before, after,
        cells: PRECEDENT_ATTRIBUTES.map(attribute => ({ name, attribute, count: state[attribute].length })),
      }));
    }
    if (previousLevelEntries.length && !firstReached.has(query.threshold - 1)) {
      firstReached.set(query.threshold - 1, makeThresholdCheckpoint(query.threshold - 1, previousLevelEntries));
    }
    if (stepRecords.length && !firstReached.has(query.threshold)) {
      firstReached.set(query.threshold, makeThresholdCheckpoint(query.threshold, currentLevelEntries));
      const advancement = getThresholdAdvancement(firstReached, query.threshold, query.scope || 'all');
      stepRecords.forEach(record => { if (advancement) record.advancement = advancement; });
    }
    records.push(...stepRecords);
  }
  return { records };
}

function queryColors(catalog, query, names) {
  const bounds = getColorQuantityBounds(catalog, query);
  const quantity = String(query.threshold).toUpperCase();
  const threshold = quantity === 'MAX' ? bounds.max : quantity === 'MIN' ? bounds.min
    : Math.max(0, Math.trunc(Number(query.threshold) || 0));
  const normalized = { ...query, threshold, attribute: query.attribute === 'any' ? '' : query.attribute };
  const result = threshold === 0 ? { records: [] } : query.attribute === 'all'
    ? queryAllColors(catalog, normalized, names) : queryAttributes(catalog, normalized, names);
  const missing = bounds.people.filter(person => person.count < threshold);
  const progress = { covered: bounds.people.length - missing.length, total: bounds.people.length, missing, people: bounds.people };
  let completion = null;
  if (threshold > 0 && progress.total > 0 && !missing.length) {
    const firstByName = new Map();
    for (const record of result.records) if (!firstByName.has(record.name)) firstByName.set(record.name, record.timestamp);
    const timestamp = Math.max(...firstByName.values());
    const lastRecords = result.records.filter(record => record.timestamp === timestamp && firstByName.get(record.name) === timestamp);
    const firstTimestamp = Math.min(...firstByName.values());
    const firstRecords = result.records.filter(record => record.timestamp === firstTimestamp);
    const first = {
      threshold, timestamp: firstTimestamp,
      holders: [...new Map(firstRecords.map(record => [`${record.name}:${record.attribute}`, { name: record.name, attribute: record.attribute }])).values()],
      events: [...new Map(firstRecords.flatMap(record => record.events).map(event => [eventKey(event.id), event])).values()],
    };
    completion = {
      timestamp, events: [...new Map(lastRecords.flatMap(record => record.events).map(event => [eventKey(event.id), event])).values()],
      records: lastRecords.map(record => ({
        ...record, key: `completion:${record.key}`, badge: '全员达成', isGroupCompletion: true,
        advancement: { scope: query.scope || 'all', fromThreshold: threshold, toThreshold: threshold,
          days: Math.round((timestamp - firstTimestamp) / 86400000), previous: first },
      })),
    };
  }
  return { ...result, threshold, limits: { min: bounds.min, max: bounds.max }, progress, completion };
}

function queryLineups(catalog, query, names) {
  const records = [];
  for (const source of catalog.events) {
    if (query.eventType && source.event.event_type !== query.eventType) continue;
    if (query.gachaType && (query.gachaType === '联动'
      ? !String(source.event.gacha_type || '').includes('联动')
      : source.event.gacha_type !== query.gachaType)) continue;
    const pools = new Map();
    for (const entry of source.cards) {
      if (!matchesEntry(entry, names, query)) continue;
      const pool = getPrecedentPoolKey(entry);
      if (!pools.has(pool)) pools.set(pool, []);
      pools.get(pool).push(entry);
    }
    for (const [pool, entries] of pools) {
      if (query.operator === 'equal' ? entries.length !== query.threshold : entries.length < query.threshold) continue;
      records.push(makeRecord('lineup', entries, entries, {
        key: `lineup:${eventKey(source.event.id)}:${pool}`,
        threshold: query.threshold,
        after: entries.length,
        pool,
        skill: query.skill,
        timestamp: Math.max(...entries.map(entry => entry.timestamp)),
      }));
    }
  }
  return { records: records.sort((a, b) => a.timestamp - b.timestamp) };
}

function queryCompletion(catalog, query, names) {
  const attributes = query.attribute ? [query.attribute] : PRECEDENT_ATTRIBUTES;
  const counts = new Map();
  const records = [];
  let coveredBefore = 0;
  const total = names.size * attributes.length;
  for (const step of catalog.steps) {
    const entries = step.entries.filter(entry => matchesEntry(entry, names, query));
    if (!entries.length) continue;
    for (const entry of entries) {
      const key = `${entry.name}:${entry.attribute}`;
      counts.set(key, [...(counts.get(key) || []), entry]);
    }
    const covered = [...counts.values()].filter(group => group.length >= query.threshold).length;
    if (total > 0 && covered === total && records.length === 0) {
      records.push(makeRecord('completion', entries, entries, {
        key: `completion:${query.threshold}`,
        threshold: query.threshold,
        before: coveredBefore,
        after: total,
        total,
      }));
    }
    coveredBefore = covered;
  }
  const missing = [...names].flatMap(name => attributes.map(attribute => ({
    name, attribute, count: (counts.get(`${name}:${attribute}`) || []).length,
  }))).filter(cell => cell.count < query.threshold);
  return { records, progress: { total, covered: total - missing.length, missing } };
}

/** Evaluate explicit templates; results always retain the underlying evidence. */
export function queryPrecedents(catalog, criteria) {
  const query = { type: 'attribute', scope: 'oc', order: 'all', threshold: 'MAX', ...criteria };
  if (query.type !== 'attribute') query.threshold = Math.max(1, Math.min(30, Math.trunc(Number(query.threshold) || 1)));
  const names = new Set(getSelectedNames(catalog, query));
  const result = query.type === 'lineup' ? queryLineups(catalog, query, names)
    : query.type === 'completion' ? queryCompletion(catalog, query, names) : queryColors(catalog, query, names);
  const records = result.records;
  const timestamp = query.order === 'latest' ? records.at(-1)?.timestamp : records[0]?.timestamp;
  return {
    ...result,
    totalRecords: records.length,
    records: query.order === 'all' ? records : records.filter(record => record.timestamp === timestamp),
  };
}

/** Match the historical split-pool convention used by activity and duo filters. */
export function getPrecedentPoolKey(entry) {
  const pool = String(entry.card.GachaID || entry.card.EventID);
  if (!['18', '27'].includes(eventKey(entry.source.event.id))) return pool;
  const isFes = ['cfes', 'bfes'].includes(String(entry.card.Type).toLowerCase()) || String(entry.card.Skill).includes('fes');
  return `${pool}:${isFes ? 'fes' : 'normal'}`;
}
