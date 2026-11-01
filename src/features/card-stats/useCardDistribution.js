import { ref, computed, reactive } from 'vue';
import { useCardDistributionStatistics } from './useCardDistributionStatistics.js';
import { CARD_STATISTICS_DEFAULTS, CARD_STATISTICS_EVENT_TYPES, normalizeStatisticsEventTypes } from './cardStatisticsRules.js';

/** Owns card distribution behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardDistribution(inputs) {
  const includeCollabRewardCards = ref(CARD_STATISTICS_DEFAULTS.includeCollabRewardCards);

  const useRewardCountForLowStars = ref(CARD_STATISTICS_DEFAULTS.useRewardCountForLowStars);

  const useRewardCountForThreeStar = useRewardCountForLowStars;

  const useRewardCountForTwoStar = useRewardCountForLowStars;

  const limitedIncludeWl3 = ref(CARD_STATISTICS_DEFAULTS.includeWl3);

  const limitedIncludeSongLimited = ref(CARD_STATISTICS_DEFAULTS.includeSongLimited);

  const hideDistCharNames = ref(true);

  const EVENT_TYPE_FILTER_OPTIONS = CARD_STATISTICS_EVENT_TYPES;

  const createEventTypeFilter = () => ref([...EVENT_TYPE_FILTER_OPTIONS]);

  const banEventTypeFilter = createEventTypeFilter();

  const bannerEventTypeFilter = createEventTypeFilter();

  const limitedBanEventTypeFilter = createEventTypeFilter();

  const fesLimitedBanEventTypeFilter = createEventTypeFilter();

  const fesLimitedIncludeFes = ref(CARD_STATISTICS_DEFAULTS.includeFestivalFes);

  const includeUnitScoreInPureScore = ref(CARD_STATISTICS_DEFAULTS.includeUnitScoreInPureScore);

  const DIST_VS_SUMMARY_PANEL_IDS = [
    'four',
    'limited',
    'pure-score',
    'reward',
    'p-score',
    'score-up',
    'recovery',
    'accuracy',
    'three',
    'two',
    'fes-limited'
  ];

  const distVsUnitSummaryToggles = reactive(Object.fromEntries(
    DIST_VS_SUMMARY_PANEL_IDS.map((id) => [id, false])
  ));

  const includeVsInDistUnitSummary = computed({
    get: () => DIST_VS_SUMMARY_PANEL_IDS.every((id) => !!distVsUnitSummaryToggles[id]),
    set: (value) => {
      const checked = !!value;
      DIST_VS_SUMMARY_PANEL_IDS.forEach((id) => {
        distVsUnitSummaryToggles[id] = checked;
      });
    }
  });

  const includeVsInDistUnitSummaryIndeterminate = computed(() => {
    const values = DIST_VS_SUMMARY_PANEL_IDS.map((id) => !!distVsUnitSummaryToggles[id]);
    return values.some(Boolean) && values.some((value) => !value);
  });

  const onIncludeVsInDistUnitSummaryChange = (event) => {
    const checked = !!event?.target?.checked;
    const shouldResetDefault = includeVsInDistUnitSummaryIndeterminate.value;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      includeVsInDistUnitSummary.value = shouldResetDefault ? false : checked;
      if (shouldResetDefault && event?.target) {
        event.target.checked = false;
        event.target.indeterminate = false;
      }
    }, anchorEl);
  };

  const isDistPanelVsSummaryEnabled = (panelId) => !!distVsUnitSummaryToggles[String(panelId || '')];

  const normalizeEventTypeFilter = normalizeStatisticsEventTypes;

  const isEventTypeSelected = (filterValue, eventType) => {
    return normalizeEventTypeFilter(filterValue).includes(eventType);
  };

  const setEventTypeFilterValue = (targetRef, targetType, checked) => {
    if (!EVENT_TYPE_FILTER_OPTIONS.includes(targetType)) return;
    const next = new Set(normalizeEventTypeFilter(targetRef.value));
    if (checked) next.add(targetType);
    else next.delete(targetType);
    targetRef.value = EVENT_TYPE_FILTER_OPTIONS.filter((type) => next.has(type));
  };

  const setBanEventTypeFilter = (targetType, checked) => {
    setEventTypeFilterValue(banEventTypeFilter, targetType, checked);
  };

  const setBannerEventTypeFilter = (targetType, checked) => {
    setEventTypeFilterValue(bannerEventTypeFilter, targetType, checked);
  };

  const setLimitedBanEventTypeFilter = (targetType, checked) => {
    setEventTypeFilterValue(limitedBanEventTypeFilter, targetType, checked);
  };

  const setFesLimitedBanEventTypeFilter = (targetType, checked) => {
    setEventTypeFilterValue(fesLimitedBanEventTypeFilter, targetType, checked);
  };

  const onIncludeUnitScoreInPureScoreChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      includeUnitScoreInPureScore.value = checked;
    }, anchorEl);
  };

  const { processedStats, groupByCount, fesLimitedEventIdSet, isEventRewardCard,
    shouldIncludeCardInLimitedStats, getCardProgressOrderId, getStatProgressOrderKey } = useCardDistributionStatistics(inputs, {
    includeCollabRewardCards, limitedIncludeWl3, limitedIncludeSongLimited, includeUnitScoreInPureScore,
    fesLimitedIncludeFes, bannerEventTypeFilter, limitedBanEventTypeFilter, fesLimitedBanEventTypeFilter,
  });

  const DIST_SUMMARY_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc'];

  const DIST_VS_SUMMARY_KEYS = [
    'fourStarCount',
    'limitedCount',
    'pureScoreCount',
    'rewardTotalCount',
    'pScoreCount',
    'scoreUpCount',
    'recoveryCount',
    'accuracyCount',
    'threeStarCount',
    'twoStarCount',
    'rewardThreeCount',
    'rewardTwoCount',
    'rewardThreeCountWithCollab',
    'rewardTwoCountWithCollab',
    'fesLimitedCount'
  ];

  const createDistSummaryUnitMap = () => Object.fromEntries(DIST_SUMMARY_UNITS.map((unit) => [unit, {
    total: 0,
    lastOrder: Number.POSITIVE_INFINITY
  }]));

  const createDistVsSummaryMap = () => Object.fromEntries(
    DIST_VS_SUMMARY_KEYS.map((key) => [key, createDistSummaryUnitMap()])
  );

  const addDistVsSummaryCount = (summaryMap, unit, key, orderId) => {
    const target = summaryMap?.[key]?.[unit];
    if (!target) return;
    target.total += 1;
    const order = Number(orderId || 0);
    if (Number.isFinite(order) && order > 0) {
      target.lastOrder = Number.isFinite(target.lastOrder)
        ? Math.max(target.lastOrder, order)
        : order;
    }
  };

  const getDistVsAffiliationUnit = (card) => {
    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    return DIST_SUMMARY_UNITS.includes(unit) ? unit : '';
  };

  const distVsUnitSummaryByKey = computed(() => {
    const summaryMap = createDistVsSummaryMap();
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const excludedPureSkills = includeUnitScoreInPureScore.value
      ? ['accuracy', 'recovery', '-', '']
      : ['accuracy', 'recovery', 'unit_score', '-', ''];

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      const baseName = String(card?.Name || '').trim();
      if (!inputs.metadata.VS_NAMES.includes(baseName)) return;
      const unit = getDistVsAffiliationUnit(card);
      if (!unit) return;

      const rarity = String(card?.Rarity || '').trim();
      const skill = String(card?.Skill || '').trim().toLowerCase();
      const cardType = String(card?.Type || '').trim().toLowerCase();
      const orderId = getCardProgressOrderId(card);
      const eventIdRaw = String(card?.EventID || '').trim();
      const eventIdNum = inputs.eventCatalog.isNumericEventId(eventIdRaw) ? Number(eventIdRaw) : null;

      if (rarity === '4') {
        addDistVsSummaryCount(summaryMap, unit, 'fourStarCount', orderId);

        if (shouldIncludeCardInLimitedStats(card)) {
          addDistVsSummaryCount(summaryMap, unit, 'limitedCount', orderId);
        }

        const isFesCard = inputs.presentation.isFesCardType(cardType);
        const isFesLimitedEventCard = eventIdNum !== null && fesLimitedEventIdSet.value.has(eventIdNum);
        const shouldCountFesLimited = (isFesLimitedEventCard && !isFesCard)
          || (fesLimitedIncludeFes.value && isFesCard);
        if (shouldCountFesLimited) {
          addDistVsSummaryCount(summaryMap, unit, 'fesLimitedCount', orderId);
        }

        if (skill === 'p_score') addDistVsSummaryCount(summaryMap, unit, 'pScoreCount', orderId);
        if (skill === 'score_up') addDistVsSummaryCount(summaryMap, unit, 'scoreUpCount', orderId);
        if (skill === 'accuracy') addDistVsSummaryCount(summaryMap, unit, 'accuracyCount', orderId);
        if (skill === 'recovery') addDistVsSummaryCount(summaryMap, unit, 'recoveryCount', orderId);
        if (!excludedPureSkills.includes(skill)) {
          addDistVsSummaryCount(summaryMap, unit, 'pureScoreCount', orderId);
        }
      }

      if (rarity === '3') {
        addDistVsSummaryCount(summaryMap, unit, 'threeStarCount', orderId);
      }
      if (rarity === '2') {
        addDistVsSummaryCount(summaryMap, unit, 'twoStarCount', orderId);
      }

      if (isEventRewardCard(card)) {
        addDistVsSummaryCount(summaryMap, unit, 'rewardTotalCount', orderId);
        if (rarity === '3') addDistVsSummaryCount(summaryMap, unit, 'rewardThreeCount', orderId);
        if (rarity === '2') addDistVsSummaryCount(summaryMap, unit, 'rewardTwoCount', orderId);
      }

      if (isEventRewardCard(card, { includeCollab: true })) {
        if (rarity === '3') addDistVsSummaryCount(summaryMap, unit, 'rewardThreeCountWithCollab', orderId);
        if (rarity === '2') addDistVsSummaryCount(summaryMap, unit, 'rewardTwoCountWithCollab', orderId);
      }
    });

    return summaryMap;
  });

  const buildDistUnitSummary = (groups, key, vsUnitAdditions = null) => {
    const unitTotals = Object.fromEntries(DIST_SUMMARY_UNITS.map((unit) => [unit, {
      total: 0,
      lastOrder: Number.POSITIVE_INFINITY
    }]));
    (groups || []).forEach((group) => {
      const count = Number(group?.count || 0);
      (group?.chars || []).forEach((char) => {
        const unit = inputs.metadata.getUnitByChar(char?.name);
        if (!DIST_SUMMARY_UNITS.includes(unit)) return;
        unitTotals[unit].total += count;
        if (count <= 0) return;
        const order = Number(getStatProgressOrderKey(char, key) || 0);
        if (Number.isFinite(order) && order > 0) {
          unitTotals[unit].lastOrder = Number.isFinite(unitTotals[unit].lastOrder)
            ? Math.max(unitTotals[unit].lastOrder, order)
            : order;
        }
      });
    });

    if (vsUnitAdditions) {
      DIST_SUMMARY_UNITS.forEach((unit) => {
        const addition = vsUnitAdditions[unit];
        const addTotal = Number(addition?.total || 0);
        if (addTotal <= 0) return;
        unitTotals[unit].total += addTotal;
        const addOrder = Number(addition?.lastOrder || 0);
        if (Number.isFinite(addOrder) && addOrder > 0) {
          unitTotals[unit].lastOrder = Number.isFinite(unitTotals[unit].lastOrder)
            ? Math.max(unitTotals[unit].lastOrder, addOrder)
            : addOrder;
        }
      });
    }

    return Object.entries(unitTotals)
      .map(([unit, summary]) => ({
        unit,
        total: summary.total,
        lastOrder: summary.lastOrder,
        title: inputs.navigationCatalog.getUnitNavTitle(unit)
      }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        const aOrder = Number.isFinite(a.lastOrder) ? a.lastOrder : Number.POSITIVE_INFINITY;
        const bOrder = Number.isFinite(b.lastOrder) ? b.lastOrder : Number.POSITIVE_INFINITY;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return DIST_SUMMARY_UNITS.indexOf(a.unit) - DIST_SUMMARY_UNITS.indexOf(b.unit);
      });
  };

  const createGroupPanel = (config, rows, key) => {
    const groups = groupByCount(rows, key);
    const allowVsUnitSummary = DIST_VS_SUMMARY_PANEL_IDS.includes(config.id);
    const includeVsSummary = allowVsUnitSummary && isDistPanelVsSummaryEnabled(config.id);
    return {
      ...config,
      allowVsUnitSummary,
      groups,
      unitSummary: buildDistUnitSummary(
        groups,
        key,
        includeVsSummary ? distVsUnitSummaryByKey.value[key] : null
      )
    };
  };

  const groupPanels = computed(() => [
    createGroupPanel({ id: 'four', title: '4星总数', cellClass: '', showRewardBreakdown: false }, processedStats.value, 'fourStarCount'),
    createGroupPanel({ id: 'limited', title: '限定总数', cellClass: 'lim', showRewardBreakdown: false }, processedStats.value, 'limitedCount'),
    createGroupPanel({ id: 'pure-score', title: '4星分卡数', cellClass: 'pure-score', showRewardBreakdown: false }, processedStats.value, 'pureScoreCount'),
    createGroupPanel({ id: 'reward', title: '报酬总数', cellClass: 'reward', showRewardBreakdown: true }, processedStats.value, 'rewardTotalCount'),
    createGroupPanel({ id: 'p-score', title: '4星P分数', cellClass: 'p-score', showRewardBreakdown: false }, processedStats.value, 'pScoreCount'),
    createGroupPanel({ id: 'score-up', title: '4星普分数', cellClass: 'score-up', showRewardBreakdown: false }, processedStats.value, 'scoreUpCount'),
    createGroupPanel({ id: 'recovery', title: '4星奶卡数', cellClass: 'recovery', showRewardBreakdown: false }, processedStats.value, 'recoveryCount'),
    createGroupPanel({ id: 'accuracy', title: '4星判卡数', cellClass: 'accuracy', showRewardBreakdown: false }, processedStats.value, 'accuracyCount'),
    createGroupPanel({
      id: 'three',
      title: '3星总数',
      cellClass: 'three-star',
      showRewardBreakdown: false
    }, processedStats.value, useRewardCountForLowStars.value ? 'rewardThreeCount' : 'threeStarCount'),
    createGroupPanel({
      id: 'two',
      title: '2星总数',
      cellClass: 'two-star',
      showRewardBreakdown: false
    }, processedStats.value, useRewardCountForLowStars.value ? 'rewardTwoCount' : 'twoStarCount'),
    createGroupPanel(
      { id: 'banner', title: 'Banner数', cellClass: 'banner', showRewardBreakdown: false },
      processedStats.value.filter((row) => !inputs.metadata.VS_NAMES.includes(String(row?.name || '').trim().split(/\s+/)[0])),
      'bannerCount'
    ),
    createGroupPanel(
      { id: 'limited-ban', title: '限Ban数', cellClass: 'limited-ban', showRewardBreakdown: false },
      processedStats.value.filter((row) => !inputs.metadata.VS_NAMES.includes(String(row?.name || '').trim().split(/\s+/)[0])),
      'limitedBanCount'
    ),
    createGroupPanel({ id: 'fes-limited', title: '百六限定次数', cellClass: 'fes-limited', showRewardBreakdown: false }, processedStats.value, 'fesLimitedCount'),
    createGroupPanel(
      { id: 'fes-limited-ban', title: '百六限Ban次数', cellClass: 'fes-limited-ban', showRewardBreakdown: false },
      processedStats.value.filter((row) => !inputs.metadata.VS_NAMES.includes(String(row?.name || '').trim().split(/\s+/)[0])),
      'fesLimitedBanCount'
    )
  ]);

  return {
    groupPanels,
    processedStats,
    includeUnitScoreInPureScore,
    isEventRewardCard,
    getCardProgressOrderId,
    shouldIncludeCardInLimitedStats,
    banEventTypeFilter,
    isEventTypeSelected,
    normalizeEventTypeFilter,
    hideDistCharNames,
    includeVsInDistUnitSummary,
    includeVsInDistUnitSummaryIndeterminate,
    onIncludeVsInDistUnitSummaryChange,
    distVsUnitSummaryToggles,
    limitedIncludeWl3,
    limitedIncludeSongLimited,
    includeCollabRewardCards,
    useRewardCountForLowStars,
    useRewardCountForThreeStar,
    useRewardCountForTwoStar,
    onIncludeUnitScoreInPureScoreChange,
    fesLimitedIncludeFes,
    limitedBanEventTypeFilter,
    setLimitedBanEventTypeFilter,
    bannerEventTypeFilter,
    setBannerEventTypeFilter,
    fesLimitedBanEventTypeFilter,
    setFesLimitedBanEventTypeFilter,
    setBanEventTypeFilter,
  };
}
