import { buildCardYearEventIndex, parseCardYearDate, getCardStatsYear, prepareCardYearCards, buildCardYearPanels } from '../card-stats/cardYearStats.js';
import { computed } from 'vue';
import { useCardDistributionStatistics } from '../card-stats/useCardDistributionStatistics.js';
import { normalizeCardStatisticsAttribute, orderCardStatisticsNames } from '../card-stats/cardStatisticsRules.js';

/** Floating presentation adapter over the statistics page's shared calculations. */
export function useHistoryPreviewStatistics(ports) {
  const inputs = {
    props: {
      get allCards() { return ports.previewCutoff.previewEffectiveCards.value; },
      get allEvents() { return ports.props.allEvents || []; },
    },
    constants: { get ATTRS() { return ports.previewSelections.PREVIEW_ATTRS; } },
    metadata: {
      get CHAR_ORDER() { return ports.previewSelections.PREVIEW_CHAR_ORDER.value; },
      get VS_NAMES() {
        return Object.keys(this.CHAR_ORDER).filter(name => ports.presentation.isVirtualSinger(name));
      },
    },
    presentation: {
      normalizeBannerName: value => ports.previewSelections.normalizeCharName(value),
      isFesCardType: type => ports.previewSelections.isFesCardType(type),
    },
    eventCatalog: {
      get safeMaxEventId() { return ports.previewCutoff.previewMaxEventId; },
      isCardWithinLimit: (card, maxId) => ports.previewCutoff.isCardWithinPreviewLimit(card, maxId),
      isNumericEventId: value => ports.formatting.isNumericEventId(value),
      normalizeCardStatsAttribute: normalizeCardStatisticsAttribute,
      shouldSkipPredictEvent: event => ports.previewCutoff.shouldSkipPreviewPredictEvent?.(event) || false,
    },
  };
  const statistics = useCardDistributionStatistics(inputs, {
    limitedIncludeWl3: ports.previewSelections.previewLimitedIncludeWl3,
    limitedIncludeSongLimited: ports.previewSelections.previewLimitedIncludeSongLimited,
    includeCollabRewardCards: ports.previewSelections.previewIncludeCollabReward,
    includeUnitScoreInPureScore: ports.previewSelections.previewIncludeUnitScoreInPureScore,
    bannerEventTypeFilter: ports.previewSelections.previewBannerEventTypeFilter,
    limitedBanEventTypeFilter: ports.previewSelections.previewLimitedBanEventTypeFilter,
  });

  const previewAttrFiveSummaryRows = computed(() => {
    if (!ports.previewSelections.selectedPreviewPanelIds.value.includes('attr-five')) return [];
    const attrs = ports.previewSelections.PREVIEW_ATTRS;
    const eventCounts = Object.fromEntries(attrs.map(attr => [attr, 0]));
    const fourStarCounts = Object.fromEntries(attrs.map(attr => [attr, 0]));
    const maxId = ports.previewCutoff.previewMaxEventId.value;
    (ports.props.allEvents || []).forEach(event => {
      if (!ports.previewCutoff.isEventWithinPreviewLimit(event, maxId)) return;
      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(event?.event_attribute);
      if (eventCounts[attr] !== undefined) eventCounts[attr] += 1;
    });
    statistics.processedStats.value.forEach(row => {
      attrs.forEach(attr => { fourStarCounts[attr] += row.attrCounts[attr]; });
    });
    return [
      { key: 'events', label: '活动', ...eventCounts },
      { key: 'four-stars', label: '四星', ...fourStarCounts },
    ];
  });

  const previewAttrFiveRows = computed(() => {
    if (!ports.previewSelections.selectedPreviewPanelIds.value.includes('attr-five')) return [];
    const statsByName = new Map(statistics.processedStats.value.map(row => [row.name, row]));
    return ports.previewSelections.selectedPreviewAttrChars.value.map(name => ({
      name,
      ...Object.fromEntries(ports.previewSelections.PREVIEW_ATTRS.map(attr => [attr, statsByName.get(name)?.attrCounts[attr] || 0])),
    })).sort((a, b) => ports.previewSelections.getPreviewCharOrder(a.name) - ports.previewSelections.getPreviewCharOrder(b.name));
  });

  const yearEventIndex = computed(() => buildCardYearEventIndex(ports.props.allEvents));
  const orderedYearNames = computed(() => orderCardStatisticsNames(Object.keys(inputs.metadata.CHAR_ORDER), inputs.metadata.CHAR_ORDER));
  const previewStatisticsYear = computed(() => {
    const event = ports.previewCutoff.previewCutoffEvent.value;
    const date = parseCardYearDate(event?.start_date)
      || ports.previewCutoff.previewReferenceDate?.value || new Date();
    // Select the same year that this activity's cards belong to, even before
    // the prediction contains any cards. New Year and anniversary boundaries
    // remain owned by the statistics page's shared attribution function.
    return getCardStatsYear({ EventID: event?.id }, date, yearEventIndex.value, {
      useOperatingYear: ports.previewSelections.previewYearUseOperatingYear.value,
      newYearNextYear: ports.previewSelections.previewYearNewYearNextYear.value
    });
  });
  const yearEligibleCards = computed(() => {
    if (!ports.previewSelections.selectedPreviewPanelIds.value.includes('year')) return [];
    const maxId = ports.previewCutoff.previewMaxEventId.value;
    return prepareCardYearCards({
      cards: ports.previewCutoff.previewEffectiveCards.value, names: orderedYearNames.value,
      eventIndex: yearEventIndex.value,
      isCardWithinLimit: card => ports.previewCutoff.isCardWithinPreviewLimit(card, maxId),
      useOperatingYear: ports.previewSelections.previewYearUseOperatingYear.value,
      newYearNextYear: ports.previewSelections.previewYearNewYearNextYear.value
    });
  });
  const previewYearPanel = computed(() => {
    if (!ports.previewSelections.selectedPreviewPanelIds.value.includes('year')) return null;
    return buildCardYearPanels({
      eligibleCards: yearEligibleCards.value, names: orderedYearNames.value, eventIndex: yearEventIndex.value,
      rarities: ports.previewSelections.previewYearRarities.value,
      cardTypes: ports.previewSelections.previewYearCardTypes.value,
      useOperatingYear: ports.previewSelections.previewYearUseOperatingYear.value,
      years: [previewStatisticsYear.value]
    })[0];
  });

  const getPreviewStepsByKey = key => {
    if (key === 'year') return previewYearPanel.value?.groups || [];
    let resolvedKey = key;
    if (key === 'threeStarCount' && ports.previewSelections.previewThreeUseRewardCount.value) resolvedKey = 'rewardThreeCount';
    if (key === 'twoStarCount' && ports.previewSelections.previewTwoUseRewardCount.value) resolvedKey = 'rewardTwoCount';
    const rows = ['bannerCount', 'limitedBanCount'].includes(key)
      ? statistics.processedStats.value.filter(row => !ports.presentation.isVirtualSinger(row.name.split(/\s+/)[0]))
      : statistics.processedStats.value;
    return statistics.groupByCount(rows, resolvedKey);
  };

  const getPreviewAttrRowStyle = name => ({
    backgroundColor: ports.formatting.hexToRgba(ports.presentation.getCharColor(name), 0.3),
  });

  return { previewYearPanel, previewAttrFiveSummaryRows, previewAttrFiveRows, getPreviewAttrRowStyle, getPreviewStepsByKey };
}
