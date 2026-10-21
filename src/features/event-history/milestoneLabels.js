import { MILESTONE_METRICS } from './milestoneRules.js';
import { PRECEDENT_ATTRIBUTE_LABELS } from './precedentRecords.js';
import { POOL_CONTEXT_LABELS } from './milestonePools.js';

export const INTERVAL_METRIC_LABELS = Object.freeze({
  four: '四星', limited: '限定', banner: 'Banner', boxBanner: '箱活Ban', mixedBanner: '混活Ban',
});
const plain = text => ({ text, prefix: text, attribute: '', suffix: '' });
// Badge wording is independent of metric/interval titles and counting options.
export const COUNT_LABELS = Object.freeze({
  ...MILESTONE_METRICS,
  banner: 'Banner', limitedBanner: '限Ban', fesLimitedBanner: '百六限Ban',
  boxBanner: '箱Ban', mixedBanner: '混Ban', boxLimitedBanner: '箱限Ban', mixedLimitedBanner: '混限Ban',
  boxFesLimitedBanner: '百六箱限Ban', mixedFesLimitedBanner: '百六混限Ban',
});
export const MILESTONE_GRADES = Object.freeze({
  gold: { label: '金', order: 0 }, silver: { label: '银', order: 1 },
  bronze: { label: '铜', order: 2 }, unrated: { label: '未评级', order: 3 },
});
const GOLD_COUNTS = new Set(['four', 'limited', 'reward', 'fesLimited']);
const SILVER_COUNTS = new Set(['pureScore', 'pScore', 'scoreUp', 'recovery', 'accuracy', 'three', 'two',
  'limitedBanner', 'boxLimitedBanner', 'mixedLimitedBanner']);

export function getMilestoneGrade(record) {
  if (record.type === 'count') return GOLD_COUNTS.has(record.metric) ? 'gold' : SILVER_COUNTS.has(record.metric) ? 'silver' : 'bronze';
  if (['interval', 'lineup'].includes(record.type)) return 'gold';
  if (record.type === 'attribute') return record.ceilingFirsts.some(first => first.attribute === 'any') ? 'gold' : 'silver';
  if (record.type === 'completion') return record.subject.kind === 'unit' ? 'silver' : 'gold';
  if (record.type === 'pairFirst') return record.firstContexts.includes('all') ? 'silver' : 'bronze';
  if (['personalCompletion', 'skillFirst', 'streak'].includes(record.type)) return 'bronze';
  return 'unrated';
}

export function compareMilestones(a, b) {
  return MILESTONE_GRADES[a.grade].order - MILESTONE_GRADES[b.grade].order
    || a.priority - b.priority || a.key.localeCompare(b.key);
}

const attributeCeilingLabel = (cohort, attribute) => attribute === 'any' ? plain(`${cohort.toUpperCase()}花色新上限`)
  : { text: `${cohort.toUpperCase()}${PRECEDENT_ATTRIBUTE_LABELS[attribute]}新上限`, prefix: cohort.toUpperCase(), attribute, suffix: '新上限' };

/** A single achievement can carry gold overall and silver single-color labels. */
export function getMilestoneBadges(record) {
  if (record.type !== 'attribute') return [{ ...getMilestoneLabel(record), grade: getMilestoneGrade(record) }];
  return [...new Set(record.ceilingFirsts.map(first => first.attribute))]
    .sort((a, b) => Number(b === 'any') - Number(a === 'any'))
    .map(attribute => ({ ...attributeCeilingLabel(record.cohort, attribute), grade: attribute === 'any' ? 'gold' : 'silver' }));
}

/** The visible badge and its accessible name share one naming source. */
export function getMilestoneLabel(record) {
  if (record.type === 'count') return plain(`${COUNT_LABELS[record.metric]}新上限`);
  if (record.type === 'attribute') {
    return attributeCeilingLabel(record.cohort, record.ceilingFirsts.some(first => first.attribute === 'any') ? 'any' : record.attribute);
  }
  if (record.type === 'personalCompletion') return plain('个人五色补齐');
  if (record.type === 'completion') return plain(record.subject.kind === 'unit' ? '团体五色补齐' : '全员五色补齐');
  if (record.type === 'skillFirst') return plain(record.firstOverall ? '角色技能首张' : '花色技能首张');
  if (record.type === 'streak') return plain('同色连出新上限');
  if (record.type === 'interval') return plain('间隔新纪录');
  if (record.type === 'lineup') return plain('同池配置首次');
  if (record.type === 'pairFirst') return plain(record.firstContexts.includes('all') ? POOL_CONTEXT_LABELS.all
    : record.firstContexts.includes('limited') ? POOL_CONTEXT_LABELS.limited : POOL_CONTEXT_LABELS[record.firstContexts[0]]);
  return plain(record.badge || '里程碑');
}

export const MILESTONE_NAME_CATALOG = Object.freeze([
  { category: '数量新上限', names: Object.values(COUNT_LABELS).map(label => `${label}新上限`) },
  { category: '间隔纪录', names: ['间隔新纪录'], titleVariants: Object.values(INTERVAL_METRIC_LABELS).flatMap(metric => ['最长', '最短'].map(direction => `${metric}${direction}间隔`)) },
  { category: '花色新上限', names: ['OC', 'VS'].flatMap(cohort => [`${cohort}花色新上限`, ...Object.values(PRECEDENT_ATTRIBUTE_LABELS).map(attribute => `${cohort}${attribute}新上限`)]) },
  { category: '五色补齐', names: ['个人五色补齐', '团体五色补齐', '全员五色补齐'] },
  { category: '技能与连出', names: ['角色技能首张', '花色技能首张', '同色连出新上限'] },
  { category: '首次同池', names: [...Object.values(POOL_CONTEXT_LABELS), '同池配置首次'] },
]);
