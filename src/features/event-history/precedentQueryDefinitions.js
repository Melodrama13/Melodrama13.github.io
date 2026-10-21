import { COUNT_LABELS, INTERVAL_METRIC_LABELS } from './milestoneLabels.js';
import { SEQUENCE_METRICS, SEQUENCE_LABELS } from './precedentSequences.js';

export const QUERY_FAMILIES = [{ value: 'achievement', label: '达成' }, { value: 'sequence', label: '连续' }, { value: 'period', label: '期间' }, { value: 'pool', label: '配置' }];
export const ACHIEVEMENT_GROUPS = [
  { label: '花色', options: [{ value: 'color', label: '花色四星' }, { value: 'allColor', label: '五色补齐' }, { value: 'skillFirst', label: '技能首张' }] },
  { label: '卡片数量', options: Object.entries(COUNT_LABELS).filter(([key]) => !/banner/i.test(key)).map(([key, label]) => ({ value: `count:${key}`, label })) },
  { label: 'Banner次数', options: Object.entries(COUNT_LABELS).filter(([key]) => /banner/i.test(key)).map(([key, label]) => ({ value: `count:${key}`, label })) },
  { label: '间隔纪录', options: Object.entries(INTERVAL_METRIC_LABELS).map(([key, label]) => ({ value: `interval:${key}`, label: `${label}间隔纪录` })) },
];
export const PERIOD_METRICS = { ...Object.fromEntries(Object.entries(COUNT_LABELS).filter(([key]) => !['limited', 'fesLimited', 'pScore', 'pureScore', 'recovery', 'accuracy', 'scoreUp'].includes(key) && (!/banner/i.test(key) || key === 'banner'))),
  unitFour: '同团四星', unitBanner: '同团Ban' };
export { SEQUENCE_METRICS, SEQUENCE_LABELS };
export const queryFamily = draft => ['sequence', 'period', 'pool'].includes(draft.type) ? draft.type : 'achievement';
export const achievementProject = draft => draft.type === 'count' || draft.type === 'interval' ? `${draft.type}:${draft.metric}`
  : draft.type === 'lineup' ? draft.onlyMilestones && !draft.skill ? 'pairFirst' : 'lineup'
  : draft.attributeMode === 'skillFirst' ? 'skillFirst' : draft.attribute === 'all' ? 'allColor' : 'color';
export function setAchievementProject(draft, value) {
  Object.assign(draft, { type: 'attribute', attributeMode: 'count', skill: '', character: '', secondCharacter: '', attribute: 'any', threshold: 'MAX', order: 'all', onlyMilestones: false, intervalHistory: false });
  if (value.startsWith('count:') || value.startsWith('interval:')) {
    const [type, metric] = value.split(':'); Object.assign(draft, { type, metric, onlyMilestones: type === 'interval' });
  } else if (value === 'allColor') draft.attribute = 'all';
  else if (value === 'skillFirst') draft.attributeMode = 'skillFirst';
  else if (['lineup', 'pairFirst'].includes(value)) Object.assign(draft, { type: 'lineup', threshold: 'MAX', attribute: '', skill: '', onlyMilestones: value === 'pairFirst' });
}
export const sequenceOptions = draft => Object.entries(SEQUENCE_LABELS).filter(([key]) => draft.sequenceMetric === 'sameAttribute' ? ['cards', 'allCards'].includes(key)
  : draft.sequenceMetric === 'songVs' ? ['ownBox', 'unitBox', 'allBox'].includes(key)
  : draft.sequenceMetric === 'flowerGap' ? ['all', 'allBox', 'mix'].includes(key)
  : !['cards', 'allCards'].includes(key)).map(([value, label]) => ({ value, label }));
