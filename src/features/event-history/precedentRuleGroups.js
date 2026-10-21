import { queryFamily } from './precedentQueryDefinitions.js';
import { hasLimitedSubdivision, isPeriodBanner } from './precedentPeriodRules.js';

export const MILESTONE_RULE_OPTIONS = [
  { key: 'includeSongLimited', label: '限定计入歌限' }, { key: 'includeWl3', label: '限定计入WL3' },
  { key: 'includeUnitScoreInPureScore', label: '分卡计入团分' }, { key: 'includeFestivalFes', label: '百六计入FES' },
  { key: 'useRewardCountForLowStars', label: '三星/二星仅报酬' }, { key: 'includeCollabRewardCards', label: '报酬计入联动' },
  { key: 'poolIncludeFes', label: '同池计入FES' }, { key: 'poolOwnVsOnly', label: '同池仅计入本团V' },
];

export function getQueryRuleGroups(query) {
  const family = queryFamily(query), groups = [];
  const group = (label, options) => { if (options.length) groups.push({ label, options }); };
  const local = (key, label) => ({ key, label, target: 'draft' });
  const shared = keys => MILESTONE_RULE_OPTIONS.filter(option => keys.includes(option.key)).map(option => ({ ...option, target: 'milestone' }));
  group('结果', family === 'achievement' && query.type !== 'interval' && query.attributeMode !== 'skillFirst' ? [local('onlyMilestones', '仅里程碑')] : []);

  const activity = [], cards = [], affiliation = [], counts = [];
  if (family === 'sequence') {
    if (!['sameAttribute', 'songVs'].includes(query.sequenceMetric)) activity.push(local('includeWl', '计入WL'));
    if (query.sequence === 'all') activity.push(local('includeCollab', '计入联动'));
    if (['four', 'noFour', 'card', 'pair', 'sameAttribute'].includes(query.sequenceMetric)) cards.push(local('includeFes', '计入FES'));
    if (query.sequenceMetric === 'sameAttribute' && query.sequence === 'allCards') cards.push(local('includeBirthday', '计入生日卡'));
    if (['reward', 'noReward'].includes(query.sequenceMetric) && query.sequence === 'all' && query.includeCollab) counts.push(...shared(['includeCollabRewardCards']));
    if (query.sequenceMetric === 'pair') affiliation.push(...shared(['poolOwnVsOnly']));
  }
  if (family === 'pool') {
    cards.push(...shared(['poolIncludeFes']).map(option => ({ ...option, label: '计入FES' })));
    if (query.cardSlots?.some(slot => ['pureScore', 'nonScore'].includes(slot.skill))) counts.push(...shared(['includeUnitScoreInPureScore']));
    if (query.cardSlots?.some(slot => slot.rarity === '' || ['2', '3'].includes(slot.rarity))) counts.push(...shared(['includeCollabRewardCards']));
  }
  if (family === 'period') {
    activity.push(local('includeIncomplete', '统计非完整期间'));
    if (query.periodKind === 'events') activity.push(local('includeCollab', '计入联动'));
    if (query.periodKind === 'year') activity.push(local('newYearNextYear', '新年计入下一年'));
    if (query.metric === 'unitFour') {
      cards.push(local('includeFes', '计入FES'));
    }
  }
  if (family === 'achievement' && query.type === 'lineup') {
    cards.push(...shared(['poolIncludeFes']));
    affiliation.push(...shared(['poolOwnVsOnly']));
  } else if (family === 'period' || family === 'achievement' && ['count', 'interval'].includes(query.type)) {
    if (query.metric === 'limited' || family === 'period' && query.gachaType === 'limited' && !isPeriodBanner(query.metric)
      && (!hasLimitedSubdivision(query) || !query.limitedKind)) cards.push(...shared(['includeSongLimited', 'includeWl3']));
    if (query.metric === 'fesLimited') cards.push(...shared(['includeFestivalFes']));
    if (family === 'period' && query.metric === 'four' && query.gachaType === 'limited' && query.limitedKind === 'six') cards.push(...shared(['includeFestivalFes']));
    if (query.metric === 'pureScore' || family === 'period' && query.skill === 'pureScore' && !isPeriodBanner(query.metric)) counts.push(...shared(['includeUnitScoreInPureScore']));
    if (['two', 'three'].includes(query.metric)) counts.push(...shared(['useRewardCountForLowStars']));
    if (['two', 'three', 'reward'].includes(query.metric)) counts.push(...shared(['includeCollabRewardCards']));
  }
  group('活动与时间', activity); group('卡片来源', cards); group('计数口径', counts); group('角色归属', affiliation);
  return groups;
}
