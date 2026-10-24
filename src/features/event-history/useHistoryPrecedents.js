import { computed, nextTick, reactive, ref, shallowRef, watch } from 'vue';
import { dismissTransientOverlays } from '../../ui/transientOverlays.js';
import { buildPrecedentCatalog, PRECEDENT_ATTRIBUTE_LABELS, PRECEDENT_SKILL_LABELS } from './precedentRecords.js';
import { queryHistoryPrecedents, getHistoryQueryBounds } from './precedentSearch.js';
import { buildMilestoneIndex } from './precedentMilestones.js';
import { isNumericEventId } from '../../utils/spoilerGuard.js';
import { normalizeMilestoneRules, metricLabel, isPoolFesCard, isRewardCard } from './milestoneRules.js';
import { POOL_CONTEXT_LABELS } from './milestonePools.js';
import { INTERVAL_METRIC_LABELS } from './milestoneLabels.js';
import { queryFamily, achievementProject, setAchievementProject, sequenceOptions, SEQUENCE_METRICS, SEQUENCE_LABELS } from './precedentQueryDefinitions.js';
import { getQueryPeriods } from './precedentPeriods.js';
import { hasLimitedSubdivision, isPeriodBanner, periodMetricTitle, periodKindLabel } from './precedentPeriodRules.js';
import { createConfigurationCard, isValidConfigurationCard } from './precedentPoolQueries.js';

const initialQuery = () => ({
  type: 'attribute', scope: 'all', character: '', attribute: 'any', threshold: 'MAX',
  skill: '', order: 'all', eventType: '', gachaType: '', operator: 'equal',
  metric: 'four', attributeMode: 'count', onlyMilestones: false, secondCharacter: '',
  direction: 'longest', unit: 'days', minInterval: '',
  sequenceMetric: 'four', sequence: 'unitBox', sequenceOwner: '', streakProperty: 'attribute', includeBirthday: false, includeFes: false, includeWl: false, includeCollab: false, vs: '',
  cardSlots: [createConfigurationCard()],
  periodKind: 'year', periodValue: 'all', periodLength: 3, newYearNextYear: true, includeIncomplete: true, limitedKind: '', coverage: '', intervalHistory: false,
});
export const PRECEDENT_SCOPE_OPTIONS = [
  { value: 'all', label: '全角色' }, { value: 'oc', label: '全OC' },
  { value: 'ln', label: 'LN' }, { value: 'mmj', label: 'MMJ' },
  { value: 'vbs', label: 'VBS' }, { value: 'ws', label: 'WS' },
  { value: 'nc', label: 'NC' }, { value: 'vs', label: 'VS' },
];
const SKILL_LABELS = PRECEDENT_SKILL_LABELS;
const MILESTONE_CATEGORIES = { count: '首次达成', interval: '间隔纪录', attribute: '花色达成', pair: '首次同池' };

/** Page-owned query state. Historical evidence always uses base cards, independently of predictions and list filters. */
export function useHistoryPrecedents(ports) {
  const isOpen = ref(false);
  const mode = ref('search');
  const draft = reactive(initialQuery());
  const appliedQuery = ref(initialQuery());
  const hasSearched = ref(false);
  const result = shallowRef({ records: [], totalRecords: 0 });
  const appliedRules = ref('');
  const resetSearch = () => { hasSearched.value = false; result.value = { records: [], totalRecords: 0 }; };
  const visibleCount = ref(5);
  const selectedEventOverride = ref(null);
  const milestoneFilter = ref('all');
  const milestoneRules = reactive(normalizeMilestoneRules());
  let triggerElement = null;
  const catalog = computed(() => buildPrecedentCatalog({
    events: ports.props.allEvents,
    cards: ports.props.allBaseCards,
    characters: ports.props.allCharacters,
    now: ports.clock.spoilerNow.value,
    scheduleOrder: ports.props.predictionScheduleOrder,
    songs: ports.props.allSongs,
  }));
  const eventOptions = computed(() => [...catalog.value.events].reverse().map(source => source.event));
  const defaultEventId = computed(() => {
    const current = catalog.value.events.reduce((latest, source) => {
      if (!isNumericEventId(source.event.id)) return latest;
      return !latest || source.timestamp > latest.timestamp
        || source.timestamp === latest.timestamp && Number(source.event.id) > Number(latest.event.id) ? source : latest;
    }, null);
    return String(current?.event.id ?? eventOptions.value[0]?.id ?? '');
  });
  const selectedEventId = computed({
    get: () => selectedEventOverride.value !== null && eventOptions.value.some(event => String(event.id) === selectedEventOverride.value)
      ? selectedEventOverride.value : defaultEventId.value,
    set: value => { selectedEventOverride.value = String(value); },
  });
  const selectedEventDetails = computed(() => {
    const source = catalog.value.events.find(source => String(source.event.id) === selectedEventId.value);
    if (!source) return null;
    const memberCards = source.allCards.map(entry => entry.card);
    const groups = [
      { key: 'cfes', label: 'CFES', icon: 'cfes', cards: [] },
      { key: 'bfes', label: 'BFES', icon: 'bfes', cards: [] },
      { key: 'pool', label: '当期卡池', cards: [] },
      { key: 'rewards', label: '活动报酬', cards: [] },
      { key: 'other', label: '其他卡片', cards: [] },
    ];
    for (const card of memberCards) {
      const key = isPoolFesCard(card) ? (String(card.Type).toLowerCase() === 'bfes' || String(card.Skill).toLowerCase() === 'bfes_up' ? 'bfes' : 'cfes')
        : String(card.Rarity) === '4' ? 'pool' : isRewardCard(card, true) ? 'rewards' : 'other';
      groups.find(group => group.key === key).cards.push(card);
    }
    return { event: { ...source.event, memberCards }, groups: groups.filter(group => group.cards.length) };
  });
  const characterOptions = computed(() => ports.props.allCharacters.filter(character =>
    draft.scope === 'all' || (draft.scope === 'oc' ? character.unit !== 'vs' : character.unit === draft.scope)));
  const family = computed(() => queryFamily(draft));
  const project = computed({ get: () => achievementProject(draft), set: value => { setAchievementProject(draft, value); resetSearch(); } });
  const sequences = computed(() => sequenceOptions(draft));
  const periodOptions = computed(() => getQueryPeriods(catalog.value, { ...draft, periodValue: 'all' }));
  const draftColorBounds = computed(() => getHistoryQueryBounds(catalog.value, draft, milestoneRules));
  const quantityOptions = computed(() => {
    const { min, max } = draftColorBounds.value;
    if (draft.type === 'sequence') return max === 0 ? [{ value: 'MAX', label: '0(MAX)' }]
      : Array.from({ length: max + (draft.sequenceMetric === 'flowerGap' ? 1 : 0) }, (_, index) => ({ value: index === 0 ? 'MAX' : max - index, label: index === 0 ? `${max}(MAX)` : String(max - index) }));
    const values = Array.from({ length: max }, (_, index) => max - index);
    if (min === 0) values.push(0);
    return values.map(value => value === max && value === min
      ? { value: draft.threshold === 'MIN' ? 'MIN' : 'MAX', label: `${value}(MAX=MIN)` }
      : value === max ? { value: 'MAX', label: `${value}(MAX)` }
      : value === min ? { value: 'MIN', label: `${value}(MIN)` }
      : { value, label: String(value) });
  });
  const isValid = computed(() => draft.type === 'pool' ? (draft.threshold === '' || ['MAX', 'MIN'].includes(draft.threshold) || Number.isInteger(Number(draft.threshold)) && Number(draft.threshold) >= 0)
    && draft.cardSlots.every(isValidConfigurationCard)
    : draft.type === 'period' ? (draft.periodKind !== 'events' || Number.isInteger(Number(draft.periodLength)) && Number(draft.periodLength) >= 1)
    && (['MAX', 'MIN'].includes(draft.threshold) || Number.isInteger(Number(draft.threshold)) && Number(draft.threshold) >= 0)
    : draft.type === 'interval' ? true
    : draft.type === 'attribute' && draft.attributeMode === 'skillFirst' || ['MAX', 'MIN'].includes(draft.threshold)
    || Number.isInteger(Number(draft.threshold)) && Number(draft.threshold) >= 1
      && (draft.type === 'lineup' || draftColorBounds.value.max === 0 || Number(draft.threshold) <= draftColorBounds.value.max));
  const hasPendingChanges = computed(() => hasSearched.value && (JSON.stringify(draft) !== JSON.stringify(appliedQuery.value) || JSON.stringify(milestoneRules) !== appliedRules.value));
  const eventContexts = computed(() => new Map(catalog.value.events.map(source => [String(source.event.id), {
    ...source.event, memberCards: source.cards.map(entry => entry.card),
  }])));
  const evidenceEvents = computed(() => new Map(catalog.value.allSteps.flatMap(step => step.entries.map(entry => [String(entry.card.CardID), entry.source.event]))));
  const evidenceEvent = card => {
    const event = evidenceEvents.value.get(String(card.CardID));
    return event && (eventContexts.value.get(String(event.id)) || event);
  };
  const milestoneIndex = computed(() => buildMilestoneIndex(catalog.value, milestoneRules));
  const milestoneRecords = computed(() => milestoneIndex.value.get(String(selectedEventId.value).replace(/^0$/, 'ori')) || []);
  const records = computed(() => mode.value === 'event' ? milestoneRecords.value : result.value.records);
  const filteredRecords = computed(() => mode.value !== 'event' || milestoneFilter.value === 'all' ? records.value : records.value.filter(record => record.category === milestoneFilter.value));
  const visibleRecords = computed(() => filteredRecords.value.slice(0, visibleCount.value));
  const recordSections = computed(() => {
    if (mode.value === 'search' && !hasSearched.value) return [];
    const sections = [{ key: 'matches', label: mode.value === 'event' ? '里程碑' : appliedQuery.value.type === 'sequence' ? '连续先例' : appliedQuery.value.type === 'period' ? '期间先例' : appliedQuery.value.type === 'interval'
      ? `${appliedQuery.value.direction === 'shortest' ? '最短' : '最长'}间隔纪录`
      : appliedQuery.value.type === 'pool' ? '配置先例' : { first: '首次达成', latest: '最近达成', all: '达成记录' }[appliedQuery.value.order],
    records: visibleRecords.value, total: filteredRecords.value.length }];
    if (mode.value === 'search' && appliedQuery.value.type === 'attribute' && result.value.completion?.records.length) {
      sections.push({ key: 'completion', label: ['all', 'oc'].includes(appliedQuery.value.scope) ? '全员达成' : '团体达成', records: result.value.completion.records, total: result.value.completion.records.length });
    }
    return sections;
  });
  const milestoneCategories = computed(() => Object.entries(MILESTONE_CATEGORIES).map(([value, label]) => ({
    value, label, count: milestoneRecords.value.filter(record => record.category === value).length,
  })).filter(category => category.count));
  const extraConditionCount = computed(() => [draft.character, draft.type === 'attribute' && draft.skill,
    draft.type === 'lineup' && draft.eventType, draft.type === 'lineup' && draft.gachaType,
    draft.type === 'lineup' && draft.operator === 'equal', draft.order !== 'first', draft.onlyMilestones,
    draft.secondCharacter, draft.attributeMode !== 'count', draft.type === 'interval' && draft.unit === 'periods',
    draft.type === 'interval' && draft.minInterval !== ''].filter(Boolean).length);
  const scopeLabel = query => PRECEDENT_SCOPE_OPTIONS.find(option => option.value === query.scope)?.label || '全角色';
  const question = computed(() => {
    const query = appliedQuery.value;
    const subject = query.character || scopeLabel(query);
    const attr = PRECEDENT_ATTRIBUTE_LABELS[query.attribute] || '任意花色';
    const order = { first: '最早', latest: '最近', all: '全部' }[query.order];
    if (query.type === 'completion') return `${subject}的${query.attribute ? attr : '每一种花色'}均达到 ${query.threshold} 张四星，何时补齐？`;
    if (query.type === 'lineup') return `${subject} · ${PRECEDENT_ATTRIBUTE_LABELS[query.attribute] || '全部花色'} · ${query.eventType || '所有活动'} · ${query.gachaType || '所有卡池'}，同池${query.operator === 'equal' ? '恰好' : '至少'} ${query.threshold} 张${SKILL_LABELS[query.skill] || '四星'}，${order}出现在哪里？`;
    return `${subject} · ${query.attribute === 'all' ? '五种花色均' : attr}达到 ${result.value.threshold} 张${SKILL_LABELS[query.skill] || '四星'}，同时查看${{ first: '首次达成', latest: '最近达成', all: '全部达成记录' }[query.order]}和全员进度。任意花色取每人最多的一色，全部花色取每人最少的一色；MAX／MIN 再取范围内的最大／最小值。`;
  });
  const normalizeQuantity = () => {
    if (draft.type === 'interval' || draft.attributeMode === 'skillFirst' || draft.type === 'pool' && draft.threshold === '' || ['MAX', 'MIN'].includes(draft.threshold)) return;
    const count = Number(draft.threshold);
    if (count < (draft.type === 'period' ? 0 : 1) || count === draftColorBounds.value.max || draft.type !== 'lineup' && count > draftColorBounds.value.max) draft.threshold = 'MAX';
    else if (draft.type !== 'sequence' && count === draftColorBounds.value.min) draft.threshold = 'MIN';
  };
  const search = () => {
    if (!isValid.value) return;
    if (draft.type === 'sequence') draft.operator = 'equal';
    normalizeQuantity();
    appliedQuery.value = JSON.parse(JSON.stringify(draft));
    appliedRules.value = JSON.stringify(milestoneRules);
    result.value = queryHistoryPrecedents(catalog.value, appliedQuery.value, { rules: normalizeMilestoneRules({ ...milestoneRules }), index: milestoneIndex.value });
    hasSearched.value = true;
    visibleCount.value = 5;
  };
  const selectType = type => {
    Object.assign(draft, { type: type === 'completion' ? 'attribute' : type,
      attribute: type === 'lineup' ? '' : type === 'completion' ? 'all' : 'any',
      threshold: 'MAX',
      skill: '', order: 'all', eventType: '', gachaType: '', operator: 'equal',
      metric: 'four', attributeMode: 'count', onlyMilestones: false, secondCharacter: '', direction: 'longest', unit: 'days', minInterval: '' });
  };
  const applyPreset = type => {
    Object.assign(draft, initialQuery());
    selectType(type);
    if (type === 'lineup') draft.scope = 'all';
    mode.value = 'search';
    resetSearch();
  };
  const applyFamily = type => {
    Object.assign(draft, initialQuery());
    if (type === 'sequence') Object.assign(draft, { type, order: 'all' });
    if (type === 'period') Object.assign(draft, { type, metric: 'banner', order: 'all', operator: 'equal', includeFes: true });
    if (type === 'pool') Object.assign(draft, { type });
    resetSearch();
  };
  const close = (restoreFocus = true) => {
    isOpen.value = false;
    if (restoreFocus && triggerElement?.isConnected) nextTick(() => triggerElement?.focus({ preventScroll: true }));
  };
  const open = (event, id) => {
    dismissTransientOverlays();
    if (event?.currentTarget && event.currentTarget instanceof HTMLElement) triggerElement = event.currentTarget;
    ports.filtering.showFilter.value = false;
    if (id !== undefined) {
      selectedEventId.value = String(id);
      mode.value = 'details';
      milestoneFilter.value = 'all';
    } else if (!eventOptions.value.some(item => String(item.id) === selectedEventId.value)) {
      selectedEventId.value = defaultEventId.value;
    }
    visibleCount.value = mode.value === 'event' ? 8 : 5;
    isOpen.value = true;
  };
  const toggle = event => isOpen.value ? close() : open(event);
  const jumpToRecord = id => {
    close(false);
    nextTick(() => ports.navigation.jumpToEventById(id));
  };
  // The holder of a cohort-wide record is evidence, not the record's subject.
  // Query matches, personal firsts/completions and streaks keep their own names.
  const recordTitleName = record => record.isPersonalAchievement ? record.name || '' : ['count', 'interval'].includes(record.type)
    || record.type === 'attribute' && (record.category || record.isGroupCompletion) ? '' : record.name || '';
  const recordTitle = record => {
    const person = recordTitleName(record), prefix = person ? `${person} · ` : '';
    if (record.type === 'sequence') {
      const subject = record.name || record.pair?.join(' × ') || record.scopeLabel || '';
      const label = record.sequenceMetric === 'flowerGap' ? '缺席' : '连续';
      const feature = record.sequenceMetric === 'sameAttribute' && record.streakProperty === 'skill' ? `${SKILL_LABELS[record.skill] || (record.skill === 'birthday' ? '生日卡' : '同技能')} ` : '';
      return `${subject ? `${subject} · ` : ''}${record.vs ? `${record.vs} ` : ''}${feature}${label} ${record.after} ${record.sequenceMetric === 'sameAttribute' ? '张' : '期'}`;
    }
    if (record.type === 'pool') return record.summary;
    if (record.type === 'period') {
      const period = record.period.kind === 'events' ? `${record.period.eventCount ?? record.period.totalEvents} 期`
        : `1 ${record.period.kind === 'month' ? '月' : '年'}`;
      return `${record.name || record.scopeLabel} · ${period} ${record.value} ${periodMetricTitle(record.metric, record.queryFilters)}`;
    }
    if (record.type === 'attribute' && record.attribute === 'all') return `${prefix}五色各 ${record.threshold} 四星`;
    if (record.type === 'attribute') return `${prefix}${PRECEDENT_ATTRIBUTE_LABELS[record.attribute]} ${record.threshold} 四星`;
    if (record.type === 'completion') return `${record.scopeLabel || scopeLabel(appliedQuery.value)} · ${record.completionAttribute && record.completionAttribute !== 'all'
      ? record.completionAttribute === 'any' ? '各有一色' : PRECEDENT_ATTRIBUTE_LABELS[record.completionAttribute] : '五色各'} ${record.threshold} 四星`;
    if (record.type === 'personalCompletion') return `${record.name} · 五色各 ${record.threshold} 四星`;
    if (record.type === 'skillFirst') return `${record.name} · ${PRECEDENT_ATTRIBUTE_LABELS[record.attribute]}首张 ${SKILL_LABELS[record.skill]}`;
    if (record.type === 'count') return `${prefix}${record.threshold} ${metricLabel(record.metric, record.rules)}`;
    if (record.type === 'pairFirst' || record.pair) return (record.participants || record.pair.map(name => ({ name }))).map(p => `${p.name}${p.vsUnit ? `（${p.vsUnit.toUpperCase()}）` : ''}`).join(' × ');
    if (record.type === 'streak') return `${record.name}连续 ${record.after} 张${PRECEDENT_ATTRIBUTE_LABELS[record.attribute]}`;
    if (record.type === 'interval') return `${prefix}${INTERVAL_METRIC_LABELS[record.metric]}${record.globalRecord ? record.direction === 'longest' ? '最长' : '最短' : ''}间隔`;
    return `同池 ${record.after} 张${SKILL_LABELS[record.skill] || '四星'}`;
  };
  const recordDescription = record => {
    if (record.type === 'sequence') return `${record.sequenceOwner ? `${record.sequenceOwner}的箱活` : SEQUENCE_LABELS[record.sequence] || '全部活动'} · ${record.sequenceMetric === 'sameAttribute' ? record.streakProperty === 'skill' ? '同技能' : '同色' : SEQUENCE_METRICS[record.sequenceMetric]}`;
    if (record.type === 'pool') {
      const matches = record.configurationMatches || [], rewards = matches.filter(match => ['2', '3'].includes(String(match.card.Rarity))).length;
      return `${record.totalUp} 张 UP${matches.length ? ` · 匹配 ${matches.length} 张${rewards ? ` · 含 ${rewards} 张报酬` : ''}` : ' · 完整卡池'}`;
    }
    if (record.type === 'period') return `${record.period.label}${periodKindLabel(record.period.kind) ? ` · ${periodKindLabel(record.period.kind)}` : ''}${record.period.complete ? '' : ' · 未完整'}${record.metric === 'unitFour' ? ` · 覆盖 ${record.value}/${record.period.totalEvents} 期` : ''}${record.periodWindows?.length > 1 ? ` · 合并 ${record.periodWindows.length} 个窗口` : ''}`;
    if (record.type === 'attribute' && record.attribute === 'all') return `五种花色均达到 ${record.threshold} 张四星`;
    if (record.type === 'attribute') return `${record.before} → ${record.after} 张四星`;
    if (record.type === 'count') return record.isPersonalAchievement ? `数量 ${record.before} → ${record.after}` : `历史上限 ${record.threshold - 1} → ${record.threshold}`;
    if (record.type === 'interval') return record.recordUnits.map(unit => `${record.previousValues[unit]} → ${record[unit]} ${unit === 'days' ? '天' : '期'}`).join(' · ');
    if (record.type === 'skillFirst') return record.firstOverall ? '首次拥有该技能' : '该花色首次拥有该技能';
    if (record.type === 'personalCompletion' || record.type === 'completion') return `${[...new Set((record.contributors || []).map(p => p.name))].join('、')}补齐最后花色`;
    if (record.type === 'pairFirst') return record.firstContexts.map(key => POOL_CONTEXT_LABELS[key]).filter(Boolean).join(' · ');
    if (record.type === 'streak') return record.isPersonalAchievement && !record.badges?.length ? '连续四星同花色' : '连续四星同花色 · 个人历史新高';
    if (record.type === 'lineup' && record.pair) return `同池 ${record.after} 张${SKILL_LABELS[record.skill] || '四星'}`;
    return record.evidence.map(card => card.Name).join('、');
  };
  const advancementLabel = record => {
    if (record.isGroupCompletion) return '首次达成 → 全员达成';
    const { fromThreshold, toThreshold } = record.advancement;
    if (record.type === 'personalCompletion' || record.type === 'completion') return `五色各 ${fromThreshold} → ${toThreshold} 四星`;
    if (record.type === 'attribute' && record.attribute === 'all') return `首次五色各 ${fromThreshold} 四星 → ${toThreshold} 四星`;
    return record.type === 'attribute' ? `首次 ${fromThreshold} 四星 → ${toThreshold} 四星`
      : `首次 ${fromThreshold} → ${toThreshold} ${metricLabel(record.metric, record.rules) || '四星'}`;
  };
  const advancementOrigin = record => {
    const { previous, scope } = record.advancement;
    const subject = catalog.value.characterByName.has(scope) ? scope : !record.category && appliedQuery.value.character ? appliedQuery.value.character : scopeLabel({ scope });
    const unit = ['personalCompletion', 'completion'].includes(record.type) ? '四星（五色各）' : record.type === 'attribute'
      ? record.attribute === 'all' ? '四星（五色各）' : '四星' : metricLabel(record.metric, record.rules) || '四星';
    const holders = [...new Set(previous.holders.map(holder => record.type === 'attribute' && record.attribute !== 'all'
      ? `${holder.name} · ${PRECEDENT_ATTRIBUTE_LABELS[holder.attribute]}` : holder.name))].join('、');
    return `${subject}首次 ${previous.threshold} ${unit}：${new Date(previous.timestamp).toLocaleDateString('zh-CN')} · ${holders}`;
  };
  const advancementHolders = record => [...new Map(record.advancement.previous.holders.map(holder => [
    record.type === 'attribute' && record.attribute !== 'all' || ['personalCompletion', 'completion'].includes(record.type) ? `${holder.name}:${holder.attribute}` : holder.name, holder,
  ])).values()];
  const recordCheckpoints = record => {
    const points = [];
    if (['sequence', 'period'].includes(record.type)) {
      return [{ key: 'start', label: '起点', timestamp: record.startTimestamp, holders: [], events: record.startEvent ? [eventContexts.value.get(String(record.startEvent.id)) || record.startEvent] : [] },
        { key: 'end', label: '终点', timestamp: record.timestamp, holders: record.contributors || [], events: record.events.map(event => eventContexts.value.get(String(event.id)) || event) }];
    }
    if (record.type === 'interval') points.push({
      key: 'start', label: '起点', timestamp: record.startTimestamp, holders: [{ name: record.name }], events: [record.startEvent],
    });
    if (record.advancement) points.push({
      key: 'start', label: '起点', timestamp: record.advancement.previous.timestamp,
      holders: advancementHolders(record), events: record.advancement.previous.events,
    });
    points.push({
      key: 'end', label: points.length ? '终点' : '达成', timestamp: record.timestamp,
      holders: record.contributors || (record.advancement && record.name ? [{ name: record.name, attribute: record.attribute }] : []), events: record.events,
    });
    return points.map(point => ({ ...point, events: point.events.map(event => eventContexts.value.get(String(event.id)) || event) }));
  };
  watch([() => draft.type, draftColorBounds], normalizeQuantity);
  watch(() => draft.attributeMode, value => {
    if (value !== 'count' && draft.attribute === 'all') draft.attribute = 'any';
    if (value === 'streak') draft.skill = '';
  });
  watch(() => draft.scope, () => {
    if (!characterOptions.value.some(character => character.zh_name === draft.character)) draft.character = '';
    if (!characterOptions.value.some(character => character.zh_name === draft.secondCharacter)) draft.secondCharacter = '';
    if (draft.sequenceMetric === 'bannerUnit' && !characterOptions.value.some(character => character.zh_name === draft.sequenceOwner)) draft.sequenceOwner = '';
  });
  watch(() => draft.character, value => { if (value === draft.secondCharacter) draft.secondCharacter = ''; });
  watch(() => draft.sequenceMetric, metric => {
    if (draft.type !== 'sequence') return;
    draft.sequence = metric === 'sameAttribute' ? 'cards' : ['bannerUnit', 'flowerGap'].includes(metric) ? 'all' : 'unitBox';
    draft.attribute = 'any'; draft.skill = ''; draft.vs = ''; draft.character = ''; draft.secondCharacter = ''; draft.onlyMilestones = false;
    draft.sequenceOwner = ''; draft.streakProperty = 'attribute'; draft.includeBirthday = false;
    if (metric === 'songVs') draft.includeWl = false;
    draft.threshold = 'MAX'; resetSearch();
  }, { flush: 'sync' });
  watch(() => draft.streakProperty, value => {
    if (draft.type !== 'sequence' || draft.sequenceMetric !== 'sameAttribute') return;
    if (value === 'skill') draft.attribute = 'any'; else draft.skill = '';
    draft.threshold = 'MAX'; resetSearch();
  }, { flush: 'sync' });
  watch(() => draft.periodKind, () => { draft.periodValue = 'all'; });
  watch([() => draft.gachaType, () => draft.metric], () => {
    if (draft.type === 'period' && !hasLimitedSubdivision(draft)) draft.limitedKind = '';
  }, { flush: 'sync' });
  watch(() => draft.metric, metric => {
    if (draft.type !== 'period') return;
    draft.threshold = 'MAX'; resetSearch();
    if (metric === 'unitFour') draft.includeFes = true;
    if (draft.gachaType === 'fesLimited' && !['banner', 'unitBanner'].includes(metric)) draft.gachaType = '';
    if (metric !== 'unitFour') draft.coverage = '';
    if (metric.startsWith('unit')) draft.character = '';
    if (isPeriodBanner(metric)) draft.skill = '';
  }, { flush: 'sync' });
  watch(() => draft.skill, () => { if (draft.type === 'period') draft.threshold = 'MAX'; }, { flush: 'sync' });
  watch(periodOptions, options => {
    if (draft.type === 'period' && draft.periodValue !== 'all' && !options.some(option => option.key === draft.periodValue)) draft.periodValue = 'all';
  });
  watch(() => draft.sequence, value => {
    if (draft.sequenceMetric === 'songVs' && value !== 'ownBox') draft.character = '';
    if (value !== 'ownBox') draft.sequenceOwner = '';
    if (value !== 'allCards') draft.includeBirthday = false;
  });
  watch([() => draft.includeBirthday, () => draft.sequence], ([includeBirthday, sequence]) => {
    if ((!includeBirthday || sequence !== 'allCards') && draft.skill === 'birthday') draft.skill = '';
  }, { flush: 'sync' });
  watch(() => draft.threshold, value => { if (draft.type === 'period' && ['MAX', 'MIN'].includes(value)) draft.operator = 'equal'; });
  watch(mode, () => { visibleCount.value = mode.value === 'event' ? 8 : 5; });
  watch(selectedEventId, () => { milestoneFilter.value = 'all'; visibleCount.value = 8; });
  watch(milestoneFilter, () => { visibleCount.value = 8; });
  return {
    isOpen, mode, draft, appliedQuery, hasSearched, visibleCount, selectedEventId, selectedEventDetails, catalog, eventOptions, characterOptions,
    isValid, hasPendingChanges, result, draftColorBounds, quantityOptions, records, filteredRecords, visibleRecords, recordSections, question, extraConditionCount, milestoneFilter, milestoneCategories, milestoneRules,
    search, selectType, applyPreset, applyFamily, family, project, sequences, periodOptions, open, close, toggle, jumpToRecord, recordTitle, recordTitleName, recordDescription, advancementLabel, advancementOrigin, recordCheckpoints, evidenceEvent,
    attributeLabels: PRECEDENT_ATTRIBUTE_LABELS,
    scopeOptions: PRECEDENT_SCOPE_OPTIONS,
    skillLabels: SKILL_LABELS,
  };
}
