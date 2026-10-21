import { ACHIEVEMENT_GROUPS, PERIOD_METRICS, SEQUENCE_METRICS } from './precedentQueryDefinitions.js';
import { hasLimitedSubdivision, isPeriodBanner, PERIOD_SKILL_LABELS } from './precedentPeriodRules.js';

const options = labels => Object.entries(labels).map(([value, label]) => ({ value, label }));
const select = (key, label, choices, ariaLabel = label) => ({ key, label, options: choices, ariaLabel });
const any = (label = '不限') => ({ value: '', label });
const activityOptions = [any(), ...options({ box: '箱活', mix: '混活' })];
const typeOptions = [any(), ...options({ perm: '常驻', limited: '限定' })];
const operators = options({ equal: '恰好', atLeast: '至少', atMost: '至多' });

/** DOM order is also reading and keyboard order; layout only changes the number of columns. */
export function getPrecedentQueryControls(state) {
  const { draft: q, scopeOptions, characterOptions, attributeLabels, skillLabels } = state;
  const family = state.family.value, project = state.project.value;
  const people = characterOptions.value.map(person => ({ value: person.zh_name, label: person.zh_name }));
  const person = (key = 'character', label = '角色', choices = people, ariaLabel = label) => select(key, label, [any(), ...choices], ariaLabel);
  const color = (ariaLabel = '花色') => select('attribute', '花色', [{ value: 'any', label: '任意' }, ...options(attributeLabels)], ariaLabel);
  const skill = (labels = skillLabels, ariaLabel = '技能') => select('skill', '技能', [any(), ...options(labels)], ariaLabel);
  const quantity = select('threshold', family === 'achievement' ? '数量' : '次数', state.quantityOptions.value, '数量');
  const scope = select('scope', '范围', scopeOptions, '角色范围');
  const secondary = [];
  let core;
  if (family === 'achievement') {
    core = [{ key: 'project', label: '项目', groups: ACHIEVEMENT_GROUPS, ariaLabel: '达成项目' }, scope, person()];
    if (q.type === 'interval') core.push(select('direction', '纪录', options({ longest: '最长', shortest: '最短' }), '间隔排序'),
      select('unit', '单位', options({ days: '天', periods: '期' }), '间隔单位'),
      select('intervalHistory', '过程', [{ value: false, label: '最高纪录' }, { value: true, label: '历史突破' }], '间隔历史'));
    else {
      if (q.attributeMode !== 'skillFirst') core.push(quantity);
      if (project !== 'allColor') core.push(color());
      if (q.type !== 'count') core.push(q.attributeMode === 'skillFirst' ? skill(Object.fromEntries(Object.entries(skillLabels).filter(([key]) => !key.includes('fes')))) : skill(skillLabels, '筛选技能'));
    }
  } else if (family === 'sequence') {
    const groupedMetrics = [
      { label: '出卡', keys: ['four', 'noFour', 'reward', 'noReward', 'card', 'sameAttribute'] },
      { label: '活动', keys: ['pair', 'songVs', 'bannerUnit', 'flowerGap'] },
    ].map(group => ({ label: group.label, options: group.keys.map(value => ({ value, label: SEQUENCE_METRICS[value] })) }));
    core = [{ key: 'sequenceMetric', label: '项目', groups: groupedMetrics, ariaLabel: '连续项目' }, scope,
      select('sequence', '序列', state.sequences.value, '观察序列')];
    if (q.sequenceMetric === 'pair') {
      core.push(person('character', '角色一', people, '角色'), person('secondCharacter', '角色二', people.filter(person => person.value !== q.character), '同行角色'));
      if (q.sequence === 'ownBox') core.push(person('sequenceOwner', '箱主', state.catalog.value.characters.filter(person => person.unit !== 'vs').map(person => ({ value: person.zh_name, label: person.zh_name })), '箱活角色'));
    } else if (q.sequenceMetric === 'sameAttribute') core.push(person(), select('streakProperty', '特征', options({ attribute: '同色', skill: '同技能' }), '卡片特征'));
    else if (q.sequenceMetric === 'songVs') {
      if (q.sequence === 'ownBox') core.push(person('character', '角色', people.filter(person => state.catalog.value.characterByName.get(person.value)?.unit !== 'vs')));
      core.push(person('vs', 'VS', state.catalog.value.characters.filter(person => person.unit === 'vs').map(person => ({ value: person.zh_name, label: person.zh_name })), '书下VS'));
    } else if (q.sequenceMetric === 'bannerUnit') {
      if (q.sequence === 'ownBox') core.push(person('sequenceOwner', '箱主', people.filter(person => state.catalog.value.characterByName.get(person.value)?.unit !== 'vs'), '箱活角色'));
    } else if (q.sequenceMetric === 'flowerGap') core.push(color());
    else core.push(person());
    core.push(quantity);
    if (['four', 'noFour', 'reward', 'noReward', 'card', 'pair', 'sameAttribute'].includes(q.sequenceMetric)) {
      if (q.sequenceMetric !== 'sameAttribute' || q.streakProperty === 'attribute') secondary.push(color('筛选花色'));
      if (q.sequenceMetric !== 'sameAttribute' || q.streakProperty === 'skill') secondary.push(skill({ ...skillLabels, ...(q.sequence === 'allCards' && q.includeBirthday ? { birthday: '生日卡' } : {}) }));
      secondary.push(select('gachaType', '卡片', typeOptions, '卡片类型'));
    }
  } else if (family === 'period') {
    core = [{ key: 'metric', label: '项目', ariaLabel: '期间项目', groups: [
      { label: '卡片', options: ['four', 'three', 'two', 'reward', 'unitFour'].map(value => ({ value, label: PERIOD_METRICS[value] })) },
      { label: '活动', options: ['banner', 'unitBanner'].map(value => ({ value, label: PERIOD_METRICS[value] })) },
    ] }, scope, q.metric.startsWith('unit') ? select('coverage', '覆盖', [any('按次数'), ...(q.metric === 'unitFour' ? [{ value: 'all', label: '每期都有' }] : [])], '期间覆盖') : person(),
    { key: 'periodKind', label: '周期', ariaLabel: '统计周期', groups: [
      { label: '固定周期', options: options({ month: '月份', year: '自然年', operating: '运营年' }) },
      { label: '动态周期', options: options({ rollingYear: '动态年', events: '连续 N 期' }) },
    ] }, q.periodKind === 'events' ? { key: 'periodLength', label: '期数', kind: 'number', ariaLabel: '连续期数' }
      : select('periodValue', '时段', [{ value: 'all', label: '全部' }, ...state.periodOptions.value.map(period => ({ value: period.key, label: `${period.label}${period.complete ? '' : ' · 非完整'}` }))], '统计时段'), quantity];
    secondary.push(select('eventType', '活动', activityOptions, '活动类型'), select('gachaType', isPeriodBanner(q.metric) ? '卡池' : '卡片', typeOptions, isPeriodBanner(q.metric) ? '卡池类型' : '卡片类型'));
    if (hasLimitedSubdivision(q)) secondary.push(select('limitedKind', '限定分类', [any(), ...options({ three: '百三', six: '百六' })]));
    if (!isPeriodBanner(q.metric)) secondary.push(skill(PERIOD_SKILL_LABELS));
    secondary.push(select('operator', '次数条件', operators));
  }
  return { core: core || [], secondary };
}
