import { shouldCountCardAsLimited } from '../../utils/cardLimitedRules.js';
import { isWorldLinkCardType } from '../../domain/worldLink.js';

export const DEFAULT_MILESTONE_RULES = Object.freeze({
  includeWl3: false, includeSongLimited: true, includeUnitScoreInPureScore: false,
  includeCollabRewardCards: false, useRewardCountForLowStars: true,
  includeFestivalFes: false,
  poolIncludeFes: false, poolOwnVsOnly: true,
});
export function normalizeMilestoneRules(options = {}) {
  const rewardOnly = options.useRewardCountForLowStars ?? options.useRewardCountForThreeStar
    ?? options.useRewardCountForTwoStar ?? DEFAULT_MILESTONE_RULES.useRewardCountForLowStars;
  return { ...DEFAULT_MILESTONE_RULES, ...options,
    useRewardCountForLowStars: rewardOnly,
    useRewardCountForThreeStar: rewardOnly, useRewardCountForTwoStar: rewardOnly,
  };
}
export const MILESTONE_METRICS = Object.freeze({
  four: '四星', limited: '限定', pureScore: '分卡', reward: '报酬',
  pScore: 'P分', scoreUp: '普分', recovery: '奶卡', accuracy: '判卡',
  three: '三星', two: '二星', banner: '全活动Banner', limitedBanner: '全活动限Banner',
  fesLimited: '百六限定', fesLimitedBanner: '全活动百六限Banner',
  boxBanner: '箱活Banner', mixedBanner: '混活Banner',
  boxLimitedBanner: '箱活限Banner', mixedLimitedBanner: '混活限Banner',
  boxFesLimitedBanner: '箱活百六限Banner', mixedFesLimitedBanner: '混活百六限Banner',
});
export const isFesCard = card => ['cfes', 'bfes'].includes(String(card?.Type).toLowerCase());
export const isPoolFesCard = card => isFesCard(card) || /^cfes|^bfes_up$/.test(String(card?.Skill).toLowerCase());
export const isFesMilestoneSkill = skill => /^cfes|^bfes/.test(String(skill).toLowerCase());
export const isPoolLimitedCard = card => isWorldLinkCardType(card?.Type) || ['limited', 'collab', 'collab_t', 'cfes', 'bfes'].includes(String(card?.Type).toLowerCase());
export const isMilestoneLimited = (card, rules) => shouldCountCardAsLimited(card, rules);
export const isRewardCard = (card, includeCollab = false) => ['2', '3'].includes(String(card.Rarity))
  && (/^\d+$/.test(String(card.EventID)) || includeCollab && String(card.Type).toLowerCase() === 'collab');
export const metricLabel = (metric, rules = DEFAULT_MILESTONE_RULES) => metric === 'three' && rules.useRewardCountForLowStars ? '三星报酬'
  : metric === 'two' && rules.useRewardCountForLowStars ? '二星报酬' : MILESTONE_METRICS[metric];

/** Same policies as staircase distribution, with an explicit historical rule snapshot. */
export function getEntryMetrics(entry, rules, festivalIds) {
  const { card } = entry;
  if (!card) return [];
  const rarity = String(card.Rarity), skill = String(card.Skill || '').toLowerCase();
  const metrics = [];
  if (isMilestoneLimited(card, rules)) metrics.push('limited');
  if (rarity === '4') {
    metrics.push('four');
    const skillMetric = { p_score: 'pScore', score_up: 'scoreUp', recovery: 'recovery', accuracy: 'accuracy' }[skill];
    if (skillMetric) metrics.push(skillMetric);
    if (!['accuracy', 'recovery', '-', '', ...(rules.includeUnitScoreInPureScore ? [] : ['unit_score'])].includes(skill)) metrics.push('pureScore');
    if (festivalIds.has(String(card.EventID)) && !isFesCard(card) || rules.includeFestivalFes && isFesCard(card)) metrics.push('fesLimited');
  }
  if (rarity === '3' && (!rules.useRewardCountForLowStars || isRewardCard(card, rules.includeCollabRewardCards))) metrics.push('three');
  if (rarity === '2' && (!rules.useRewardCountForLowStars || isRewardCard(card, rules.includeCollabRewardCards))) metrics.push('two');
  if (isRewardCard(card, rules.includeCollabRewardCards)) metrics.push('reward');
  return metrics;
}
