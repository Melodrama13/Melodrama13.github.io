import { isFesCard, isMilestoneLimited } from './milestoneRules.js';
import { COUNT_LABELS } from './milestoneLabels.js';
import { PRECEDENT_SKILL_LABELS } from './precedentRecords.js';

export const isPeriodBanner = metric => ['banner', 'unitBanner'].includes(metric);
export const hasLimitedSubdivision = query => ['four', 'banner'].includes(query.metric) && query.gachaType === 'limited';
export const periodKindLabel = kind => ({ year: '自然年', operating: '运营年', rollingYear: '动态年' }[kind] || '');
export const PERIOD_SKILL_LABELS = { pureScore: '分卡', ...PRECEDENT_SKILL_LABELS, p_score: 'P分' };

export function matchesPeriodCard(card, query, rules, festivalIds, sourceGachaType) {
  const skill = String(card.Skill || '').toLowerCase();
  if (query.skill === 'pureScore' ? ['accuracy', 'recovery', '-', '', ...(rules.includeUnitScoreInPureScore ? [] : ['unit_score'])].includes(skill)
    : query.skill && skill !== query.skill) return false;
  if (query.gachaType === 'perm' && String(card.Type).toLowerCase() !== 'perm') return false;
  if (query.gachaType === 'limited' && !isMilestoneLimited(card, rules)) return false;
  if (!hasLimitedSubdivision(query) || !query.limitedKind) return true;
  const festival = festivalIds.has(String(card.EventID));
  return query.limitedKind === 'six' ? (festival && !isFesCard(card) || rules.includeFestivalFes && isFesCard(card))
    : !festival && !isFesCard(card) && sourceGachaType === '普通限定';
}

export function periodMetricTitle(metric, filters = {}) {
  const banner = isPeriodBanner(metric), type = filters.gachaType, activity = filters.eventType;
  const typePrefix = type === 'perm' ? banner ? '普活' : '常驻' : type === 'limited' ? '限定' : '';
  const activityPrefix = { box: '箱活', mix: '混活' }[activity] || '';
  const combined = { 'perm:box': '普箱', 'perm:mix': '普混', 'limited:box': '箱限', 'limited:mix': '混限' }[`${type}:${activity}`];
  const subdivision = hasLimitedSubdivision({ ...filters, metric }) ? { three: '百三', six: '百六' }[filters.limitedKind] || '' : '';
  const label = metric === 'banner' ? 'Ban' : metric === 'unitBanner' ? '同团Ban' : metric === 'unitFour' ? '同团四星' : COUNT_LABELS[metric] || metric;
  return `${subdivision}${combined || `${activityPrefix}${typePrefix}`}${label}${!banner && filters.skill ? PERIOD_SKILL_LABELS[filters.skill] || filters.skill : ''}`;
}
