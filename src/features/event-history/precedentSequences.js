import { PRECEDENT_ATTRIBUTES, PRECEDENT_SKILL_LABELS } from './precedentRecords.js';
import { isPoolFesCard, isPoolLimitedCard, isRewardCard } from './milestoneRules.js';
import { getMilestonePools, filterPoolOwnVs, poolParticipant, poolOwnVsMatch } from './milestonePools.js';
import { periodPeople, isRegularQueryEvent } from './precedentPeriods.js';
import { OC_UNITS } from './milestoneShared.js';
import { parseVirtualSingerNames } from '../../domain/virtualSingerNames.js';
import { isDuoCollaborationEvent } from '../card-stats/cardDuoRules.js';
import { markPrecedentPositions } from './precedentResultPositions.js';

export const SEQUENCE_LABELS = { all: '全部活动', ownBox: '本人箱活', unitBox: '本团箱活', allBox: '箱活', mix: '混活', cards: '个人四星', allCards: '个人全卡' };
export const SEQUENCE_METRICS = { four: '出四星', noFour: '未出四星', reward: '出报酬', noReward: '未出报酬', card: '出卡', pair: '双人同池', sameAttribute: '同类型卡', songVs: '书下同V', bannerUnit: '同团Ban', flowerGap: '花色缺席' };
const unique = (items, key) => [...new Map(items.map(item => [key(item), item])).values()];
const unitsFor = (catalog, query) => unique(periodPeople(catalog, { ...query, character: '' }).map(person => person.unit), unit => unit);
const selected = (value, selection) => !selection || selection === 'any' || selection === 'all' || value === selection;
const skillOf = entry => String(entry.card.Skill || '').trim().toLowerCase();
const streakProperty = query => query.streakProperty === 'skill' ? 'skill' : 'attribute';
const propertyOf = (entry, property) => property === 'skill' ? skillOf(entry) : entry.attribute;
const eligible = (entry, query) => (query.includeFes || !isPoolFesCard(entry.card))
  && selected(entry.attribute, query.attribute)
  && selected(skillOf(entry), query.skill)
  && (!query.gachaType || (query.gachaType === 'perm' ? entry.card.Type === 'perm' : isPoolLimitedCard(entry.card)));
const context = (source, query) => source.event.event_type === '箱活' ? 'box' : source.event.event_type === '混活' ? 'mix'
  : query.includeWl && /^(world\s*link|wl)$/i.test(source.event.event_type || '') ? source.cards.some(entry => entry.card.Type === 'wl3') ? 'mix' : 'box' : '';

function subjectsFor(catalog, query) {
  const metric = query.sequenceMetric || 'four', people = periodPeople(catalog, query);
  if (metric === 'bannerUnit' && query.sequence === 'ownBox') return people.filter(person => OC_UNITS.includes(person.unit)
    && (!query.sequenceOwner || person.zh_name === query.sequenceOwner)).map(person => ({ key: person.zh_name,
    sequenceOwner: person.zh_name, unit: person.unit, label: person.unit.toUpperCase() }));
  if (metric === 'bannerUnit' || metric === 'songVs' && query.sequence === 'unitBox') return unitsFor(catalog, query).filter(unit => OC_UNITS.includes(unit)).map(unit => ({ key: unit, unit, label: unit.toUpperCase() }));
  if (metric === 'songVs' && query.sequence !== 'ownBox') return [{ key: 'all', label: '箱活' }];
  if (metric !== 'pair') return people.filter(person => metric !== 'songVs' || person.unit !== 'vs').map(person => ({ key: person.zh_name, name: person.zh_name, unit: person.unit }));
  const candidates = periodPeople(catalog, { ...query, character: '' }), pairs = [];
  for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) {
    const a = candidates[i], b = candidates[j];
    if (query.sequence === 'unitBox' && a.unit !== b.unit && a.unit !== 'vs' && b.unit !== 'vs') continue;
    if ([query.character, query.secondCharacter].filter(Boolean).some(name => name !== a.zh_name && name !== b.zh_name)) continue;
    pairs.push({ key: `${a.zh_name}:${b.zh_name}`, pair: [a.zh_name, b.zh_name], unit: a.unit === 'vs' ? b.unit : a.unit });
  }
  if (query.sequence !== 'ownBox') return pairs;
  const owners = catalog.characters.filter(person => OC_UNITS.includes(person.unit)
    && (!query.sequenceOwner || person.zh_name === query.sequenceOwner));
  return pairs.flatMap(pair => owners.map(owner => ({ ...pair, sequenceOwner: owner.zh_name })));
}
function nodesFor(catalog, query, subject) {
  if (query.sequenceMetric === 'sameAttribute') return (query.sequence === 'allCards' ? catalog.personalCardSteps || catalog.allSteps : catalog.steps).flatMap(step => {
    // Color and skill selections apply to completed runs, never to the observation stream.
    const entries = step.entries.filter(entry => entry.name === subject.name
      && (query.sequence === 'allCards' && query.includeBirthday === true || String(entry.card.Rarity).toLowerCase() !== 'birthday')
      && eligible(entry, { ...query, attribute: '', skill: '' }));
    const values = new Set(entries.map(entry => propertyOf(entry, streakProperty(query))));
    return entries.length ? [{ source: entries[0].source, timestamp: step.timestamp, entries,
      propertyValue: values.size === 1 ? values.values().next().value : '', mixed: values.size > 1, weight: entries.length }] : [];
  });
  return catalog.events.filter(source => (query.sequence === 'all' ? /^\d+$/.test(String(source.event.id)) && Number(source.event.id) > 0 && !/测试|test|纪念/i.test(source.event.event_type || '')
    || query.includeCollab && isDuoCollaborationEvent(source.event) : isRegularQueryEvent(source))
    && (query.includeWl || !/^(world\s*link|wl)$/i.test(source.event.event_type || ''))).filter(source => {
    const kind = context(source, query);
    if (query.sequence === 'all') return true;
    if (query.sequence === 'mix') return kind === 'mix';
    if (query.sequence === 'ownBox') return kind === 'box' && source.event.banner === (subject.sequenceOwner || subject.name);
    if (query.sequence === 'unitBox') return kind === 'box' && String(source.event.unit).toLowerCase() === subject.unit;
    return kind === 'box';
  }).filter(source => query.sequenceMetric !== 'songVs' || source.event.event_type === '箱活' && source.event.song_id)
    .map(source => ({ source, entries: [], weight: 1 }));
}
function makeRun(catalog, query, subject, nodes, value, extras = {}) {
  const first = nodes[0], last = nodes.at(-1), entries = nodes.flatMap(node => node.entries || []);
  const eventEvidence = ['bannerUnit', 'flowerGap', 'noFour', 'noReward'].includes(query.sequenceMetric) ? nodes.map(node => {
    const source = node.source;
    const cards = source.allCards || source.cards, banner = String(source.event.banner || '').split(' ')[0];
    const card = (cards.find(entry => entry.card.Name === source.event.banner && !isPoolFesCard(entry.card))
      || cards.find(entry => entry.name === banner && !isPoolFesCard(entry.card)))?.card;
    const unit = String(source.event.unit || '').toLowerCase();
    const units = [...OC_UNITS, 'vs'].includes(unit) ? [unit] : unique([catalog.characterByName.get(banner)?.unit,
      ...cards.map(entry => catalog.characterByName.get(entry.name)?.unit)].filter(unit => [...OC_UNITS, 'vs'].includes(unit)), unit => unit);
    return { event: source.event, card, units };
  }) : undefined;
  return { type: 'sequence', key: `sequence:${query.sequenceMetric}:${subject.key}:${subject.sequenceOwner ? `${subject.sequenceOwner}:` : ''}${first.source.event.id}:${last.source.event.id}:${extras.attribute || extras.skill || extras.vs || ''}`,
    name: subject.name, pair: subject.pair, scopeLabel: subject.label, subject: { kind: subject.name ? 'person' : subject.pair ? 'pair' : subject.unit ? 'unit' : 'cohort', unit: subject.unit },
    ...(subject.sequenceOwner ? { sequenceOwner: subject.sequenceOwner } : {}),
    ...(query.sequenceMetric === 'sameAttribute' ? { streakProperty: streakProperty(query), countUnit: '张' } : {}),
    sequenceMetric: query.sequenceMetric, sequence: query.sequence, after: value, value, threshold: value,
    startEvent: first.source.event, startTimestamp: first.timestamp ?? first.source.timestamp, event: last.source.event, events: [last.source.event], timestamp: last.timestamp ?? last.source.timestamp,
    steps: nodes.map(node => ({ event: node.source.event, timestamp: node.timestamp ?? node.source.timestamp, weight: node.weight })),
    sequenceEvents: nodes.map(node => node.source.event), contributors: unique((last.entries || []).map(entry => ({ name: entry.name, attribute: entry.attribute })), holder => `${holder.name}:${holder.attribute}`),
    evidence: unique(entries.filter(entry => entry.card).map(entry => entry.card).concat(eventEvidence?.flatMap(item => item.card ? [item.card] : []) || []), card => String(card.CardID)), triggerCards: [], isPersonalAchievement: true,
    ...(eventEvidence ? { eventEvidence } : {}),
    ...(query.sequenceMetric === 'songVs' ? { songEvidence: nodes.map(node => ({ event: node.source.event, song: catalog.songs?.find(song => String(song.id) === String(node.source.event.song_id)), vs: extras.vs })) } : {}),
    ...extras };
}

/** Construct the observation sequence before applying hit conditions. */
export function getSequenceRuns(catalog, query, rules) {
  const metric = query.sequenceMetric || 'four';
  query = { ...query, sequenceMetric: metric };
  if (metric === 'flowerGap') {
    const nodes = nodesFor(catalog, { ...query, sequence: query.sequence || 'all' }, {}), runs = [];
    for (const attribute of PRECEDENT_ATTRIBUTES.filter(attribute => !query.attribute || query.attribute === 'any' || attribute === query.attribute)) {
      let previous = -1, best = -1;
      nodes.forEach((node, index) => {
        const current = String(node.source.event.event_attribute || '');
        if (!PRECEDENT_ATTRIBUTES.includes(current)) {
          if (!/world\s*link|^wl$/i.test(node.source.event.event_type || '')) previous = -1;
          return;
        }
        if (current !== attribute) return;
        if (previous >= 0) {
          const gap = index - previous - 1;
          runs.push(makeRun(catalog, query, { key: attribute }, nodes.slice(previous, index + 1), gap, { attribute, isRecord: best >= 0 && gap > best }));
          best = Math.max(best, gap);
        }
        previous = index;
      });
    }
    return runs;
  }
  const poolsByEvent = new Map();
  if (metric === 'pair') for (const pool of getMilestonePools(catalog, { ...rules, poolIncludeFes: Boolean(query.includeFes) })) {
    const id = String(pool.source.event.id);
    if (!poolsByEvent.has(id)) poolsByEvent.set(id, []);
    poolsByEvent.get(id).push(filterPoolOwnVs(catalog, pool.entries, rules, pool.source));
  }
  const singers = catalog.characters.filter(person => person.unit === 'vs' && (!query.vs || query.vs === person.zh_name)).map(person => person.zh_name), runs = [];
  const property = streakProperty(query), nodeCache = new Map();
  for (const subject of subjectsFor(catalog, query)) {
    // Pair queries can reuse each owner's activity sequence across every pair.
    const nodeKey = metric === 'sameAttribute' ? subject.name : query.sequence === 'ownBox' ? subject.sequenceOwner || subject.name
      : query.sequence === 'unitBox' ? subject.unit : 'all';
    if (!nodeCache.has(nodeKey)) nodeCache.set(nodeKey, nodesFor(catalog, query, subject));
    const nodes = nodeCache.get(nodeKey);
    const variants = metric === 'songVs' ? singers : metric === 'sameAttribute'
      ? property === 'skill' ? [...Object.keys(PRECEDENT_SKILL_LABELS), 'birthday'] : PRECEDENT_ATTRIBUTES : [''];
    for (const variant of variants) {
      let run = [], best = 1;
      const finish = ongoing => {
        if (!run.length) return;
        const after = run.reduce((sum, node) => sum + node.weight, 0);
        runs.push(makeRun(catalog, query, subject, run, after, { ongoing, isRecord: after > best,
          ...(metric === 'sameAttribute' ? { [property]: variant } : metric === 'songVs' ? { vs: variant } : {}) }));
        best = Math.max(best, after); run = [];
      };
      for (const node of nodes) {
        let entries = [], hit;
        if (metric === 'sameAttribute') {
          entries = node.entries.filter(entry => propertyOf(entry, property) === variant);
          if (node.mixed) {
            // An unordered mixed batch cannot connect either neighboring run.
            finish(false);
            if (entries.length) {
              run.push({ ...node, source: entries[0].source, entries, weight: entries.length });
              finish(false);
            }
            continue;
          }
          hit = node.propertyValue === variant;
        }
        else if (metric === 'songVs') hit = parseVirtualSingerNames(node.source.event.virtual_singer, catalog.characters).includes(variant);
        else if (metric === 'bannerUnit') hit = catalog.characterByName.get(node.source.event.banner)?.unit === subject.unit;
        else if (metric === 'pair') {
          for (const pool of poolsByEvent.get(String(node.source.event.id)) || []) {
            const aRows = pool.filter(entry => entry.name === subject.pair[0] && eligible(entry, query));
            const bRows = pool.filter(entry => entry.name === subject.pair[1] && eligible(entry, query));
            const a = aRows.find(a => bRows.some(b => !rules.poolOwnVsOnly || poolOwnVsMatch(catalog, poolParticipant(catalog, a), poolParticipant(catalog, b), node.source)));
            const b = a && bRows.find(b => !rules.poolOwnVsOnly || poolOwnVsMatch(catalog, poolParticipant(catalog, a), poolParticipant(catalog, b), node.source));
            if (a && b) { entries = [a, b]; break; }
          }
          hit = entries.length === 2;
        } else {
          const reward = metric === 'reward' || metric === 'noReward';
          entries = (metric === 'card' || reward ? node.source.allCards : node.source.cards)
            .filter(entry => entry.name === subject.name && eligible(entry, query)
              && (!reward || isRewardCard(entry.card, rules.includeCollabRewardCards)));
          hit = ['noFour', 'noReward'].includes(metric) ? entries.length === 0 : entries.length > 0;
        }
        if (hit) run.push({ ...node, entries: metric === 'sameAttribute' ? node.entries : entries }); else finish(false);
      }
      finish(true);
    }
  }
  const bests = new Map(), batches = new Map();
  const recordSubject = run => `${run.sequenceOwner || ''}:${run.name || run.pair?.join(':') || run.subject.unit || 'all'}`;
  for (const run of runs) {
    if (!batches.has(run.timestamp)) batches.set(run.timestamp, []);
    batches.get(run.timestamp).push(run);
  }
  for (const [, batch] of [...batches].sort(([a], [b]) => a - b)) {
    for (const run of batch) {
      const key = recordSubject(run);
      run.isRecord = run.after > (bests.get(key) || 1);
    }
    for (const run of batch) {
      const key = recordSubject(run);
      bests.set(key, Math.max(bests.get(key) || 1, run.after));
    }
  }
  return runs.filter(run => metric !== 'sameAttribute' || (selected(run[property], query[property])
    && run.evidence.every(card => selected(PRECEDENT_ATTRIBUTES.find(attribute => attribute.toLowerCase() === String(card.Attribute || '').toLowerCase()), query.attribute)
      && selected(String(card.Skill || '').trim().toLowerCase(), query.skill))));
}

export function querySequencePrecedents(catalog, query, rules) {
  const runs = getSequenceRuns(catalog, query, rules), max = Math.max(0, ...runs.map(run => run.after)), min = runs.length ? Math.min(...runs.map(run => run.after)) : 0;
  const threshold = query.threshold === 'MIN' ? min : query.threshold === 'MAX' || query.threshold == null ? max : Number(query.threshold);
  let records = runs.filter(run => (query.sequenceMetric !== 'flowerGap' || ['MAX', 'MIN'].includes(query.threshold) || run.isRecord)
    && (query.threshold === 'MAX' || query.threshold === 'MIN' ? run.after === threshold
      : query.operator === 'atLeast' ? run.after >= threshold : query.operator === 'atMost' ? run.after <= threshold : run.after === threshold)
    && (!query.onlyMilestones || run.isRecord));
  records = records.map(record => {
    let count = 0;
    const step = query.sequenceMetric !== 'flowerGap' && record.steps.find(step => { count += step.weight; return count >= threshold; });
    return { ...record, attainment: { timestamp: step?.timestamp ?? record.timestamp, event: step?.event ?? record.event, count: threshold } };
  });
  records.sort((a, b) => a.attainment.timestamp - b.attainment.timestamp || a.key.localeCompare(b.key));
  records = markPrecedentPositions(records);
  const totalRecords = records.length;
  if (query.order === 'first' || query.order === 'latest') {
    const timestamp = query.order === 'latest' ? records.at(-1)?.attainment.timestamp : records[0]?.attainment.timestamp;
    records = records.filter(record => record.attainment.timestamp === timestamp);
  }
  return { records, threshold, totalRecords, bounds: { max, min, people: [] } };
}
