import { PRECEDENT_ATTRIBUTE_LABELS } from './precedentRecords.js';
import { getMilestonePools } from './milestonePools.js';
import { isPoolLimitedCard, isRewardCard, normalizeMilestoneRules } from './milestoneRules.js';
import { markPrecedentPositions } from './precedentResultPositions.js';

export const CONFIGURATION_SKILLS = Object.freeze({
  pureScore: '分卡', nonScore: '非分卡', p_score: 'P分', score_up: '普分', unit_score: '团分', recovery: '奶卡', accuracy: '判卡',
  cfes_l: 'CFES血分', cfes_j: 'CFES判分', bfes_up: 'BFES', pending: '待定',
});
export const CONFIGURATION_UNITS = Object.freeze({ ln: 'LN', mmj: 'MMJ', vbs: 'VBS', ws: 'WS', nc: 'NC', vs: 'VS' });
export const createConfigurationCard = () => ({ rarity: '4', skill: '', attribute: '', unit: '' });
export const isValidConfigurationCard = slot => slot && typeof slot === 'object' && !Array.isArray(slot) && ['', '2', '3', '4'].includes(String(slot.rarity ?? '4'))
  && (!slot.skill || slot.skill in CONFIGURATION_SKILLS) && (!slot.attribute || slot.attribute in PRECEDENT_ATTRIBUTE_LABELS)
  && (!slot.unit || slot.unit in CONFIGURATION_UNITS);
const unique = entries => [...new Map(entries.map(entry => [String(entry.card.CardID), entry])).values()];
const extrema = values => ({ max: Math.max(0, ...values), min: values.length ? Math.min(...values) : 0 });
const skillOf = entry => String(entry.card.Skill || '').trim().toLowerCase();
const scoreCard = (entry, rules) => !['accuracy', 'recovery', '-', '', ...(rules.includeUnitScoreInPureScore ? [] : ['unit_score'])].includes(skillOf(entry));
function cardMatches(catalog, entry, slot, rules) {
  const rarity = String(slot.rarity ?? '4');
  const affiliation = String(entry.card.Affiliation || String(entry.card.Name).split(' ')[1] || catalog.characterByName.get(entry.name)?.unit || '').toLowerCase();
  return (!rarity || String(entry.card.Rarity) === rarity)
    && (!slot.attribute || String(entry.attribute || entry.card.Attribute).toLowerCase() === slot.attribute.toLowerCase())
    && (!slot.unit || affiliation === slot.unit)
    && (!slot.skill || (slot.skill === 'pureScore' ? scoreCard(entry, rules) : slot.skill === 'nonScore' ? !scoreCard(entry, rules)
      : slot.skill === 'pending' ? !skillOf(entry) || skillOf(entry) === '-' : skillOf(entry) === slot.skill));
}

/** Augmenting paths assign each condition a different card, even when conditions overlap. */
function assignCards(catalog, entries, slots, rules) {
  if (slots.length > entries.length) return null;
  const edges = slots.map(slot => entries.flatMap((entry, index) => cardMatches(catalog, entry, slot, rules) ? [index] : []));
  const owners = new Map();
  function assign(slotIndex, visited) {
    for (const cardIndex of edges[slotIndex]) {
      if (visited.has(cardIndex)) continue;
      visited.add(cardIndex);
      if (!owners.has(cardIndex) || assign(owners.get(cardIndex), visited)) { owners.set(cardIndex, slotIndex); return true; }
    }
    return false;
  }
  for (const index of slots.map((_, index) => index).sort((a, b) => edges[a].length - edges[b].length)) {
    if (!assign(index, new Set())) return null;
  }
  const matches = Array(slots.length);
  for (const [cardIndex, slotIndex] of owners) matches[slotIndex] = entries[cardIndex];
  return matches;
}

function firstAssignment(catalog, entries, slots, rules) {
  if (!slots.length) return [];
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp || String(a.card.CardID).localeCompare(String(b.card.CardID)));
  for (let count = slots.length; count <= sorted.length; count++) {
    // Cards released together must be considered as one availability step.
    if (count < sorted.length && sorted[count - 1].timestamp === sorted[count].timestamp) continue;
    const matches = assignCards(catalog, sorted.slice(0, count), slots, rules);
    if (matches) return matches;
  }
  return null;
}
const gachaType = pool => pool.pool === 'fes' || /限定|联动/.test(pool.source.event.gacha_type || '') ? 'limited'
  : pool.source.event.gacha_type === '常驻' ? 'perm' : pool.entries.some(entry => isPoolLimitedCard(entry.card)) ? 'limited' : 'perm';
const hasPendingUp = (pool, rules) => pool.source.pendingUp?.some(card => (rules.poolIncludeFes || !card.fes)
  && (pool.pool === 'normal' ? !card.fes : pool.pool === 'fes' ? card.fes : true));

function configurationState(catalog, query, options) {
  const rules = normalizeMilestoneRules(options), slots = query.cardSlots || [];
  if (!Array.isArray(slots) || !slots.every(isValidConfigurationCard)) return { rules, slots, pools: [], bounds: { max: 0, min: 0, quantities: [], people: [] } };
  const context = { 箱活: 'box', 混活: 'mix', 联动: 'collab' }[query.eventType] || query.eventType;
  const pools = getMilestonePools(catalog, rules).flatMap(pool => {
    if (hasPendingUp(pool, rules) || context && pool.context !== context || query.gachaType && gachaType(pool) !== query.gachaType) return [];
    const rewards = pool.source.allCards.filter(entry => isRewardCard(entry.card, rules.includeCollabRewardCards));
    const available = unique([...pool.entries, ...rewards]);
    if (!available.length) return [];
    const matches = firstAssignment(catalog, available, slots, rules);
    return matches ? [{ ...pool, totalUp: pool.entries.length, matches, available }] : [];
  });
  const quantities = [...new Set(pools.map(pool => pool.totalUp))].sort((a, b) => a - b);
  return { rules, slots, pools, bounds: { ...extrema(quantities), quantities, people: [] } };
}

export function getPoolQueryBounds(catalog, query = {}, rules = {}) {
  return configurationState(catalog, query, rules).bounds;
}

/** UP always describes the original four-star pool; reward conditions never enlarge it. */
export function queryPoolPrecedents(catalog, query = {}, options = {}) {
  const { rules, slots, pools, bounds } = configurationState(catalog, query, options);
  const threshold = query.threshold === '' || query.threshold == null ? '' : query.threshold === 'MAX' ? bounds.max
    : query.threshold === 'MIN' ? bounds.min : Number(query.threshold);
  let records = pools.filter(pool => threshold === '' || pool.totalUp === threshold).map(pool => {
    const skillCounts = new Map();
    pool.entries.forEach(entry => {
      const skill = !skillOf(entry) || skillOf(entry) === '-' ? 'pending' : skillOf(entry);
      skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
    });
    const composition = [...skillCounts].sort((a, b) => b[1] - a[1]).map(([skill, count]) => `${count}${CONFIGURATION_SKILLS[skill] || '其他技能'}`).join('＋');
    const rewardOnly = !pool.entries.length && !pool.matches.length ? pool.available : [];
    const timestamp = Math.max(pool.source.timestamp, ...pool.entries.map(entry => entry.timestamp), ...pool.matches.map(entry => entry.timestamp),
      ...(rewardOnly.length ? [Math.min(...rewardOnly.map(entry => entry.timestamp))] : []));
    return {
      type: 'pool', key: `query-pool:${pool.source.event.id}:${pool.pool}`, pool: pool.pool,
      event: pool.source.event, events: [pool.source.event], timestamp,
      startEvent: pool.source.event, startTimestamp: pool.source.timestamp, endEvent: pool.source.event, endTimestamp: timestamp,
      evidence: unique([...pool.entries, ...pool.matches, ...rewardOnly]).map(entry => entry.card),
      matchedCards: pool.matches.map(entry => entry.card),
      configurationMatches: pool.matches.map((entry, index) => ({ condition: { ...slots[index] }, card: entry.card })),
      triggerCards: [], contributors: [], isPersonalAchievement: true, rules,
      totalUp: pool.totalUp, after: pool.totalUp, threshold, summary: `${pool.totalUp}UP · ${composition || '报酬配置'}`,
    };
  }).sort((a, b) => a.timestamp - b.timestamp || a.key.localeCompare(b.key));
  records = markPrecedentPositions(records);
  const totalRecords = records.length;
  if (['first', 'latest'].includes(query.order)) records = records.filter(record => record.queryPositions.includes(query.order));
  return { records, totalRecords, threshold, bounds };
}
