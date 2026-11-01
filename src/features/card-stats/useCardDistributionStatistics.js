import { computed, ref } from 'vue';
import { shouldCountCardAsLimited } from '../../utils/cardLimitedRules.js';
import { buildCardCharacterStats } from './cardCharacterStats.js';
import { CARD_STATISTICS_DEFAULTS, normalizeStatisticsEventTypes, isStatisticsRewardCard,
  getCardStatisticsProgressOrderId, getCardStatisticsProgressOrder, getCardStatisticsCount } from './cardStatisticsRules.js';

/** Shared reactive calculations; view controls remain owned by each caller. */
export function useCardDistributionStatistics(inputs, rules = {}) {
  const includeCollabRewardCards = rules.includeCollabRewardCards || ref(CARD_STATISTICS_DEFAULTS.includeCollabRewardCards);
  const limitedIncludeWl3 = rules.limitedIncludeWl3 || ref(CARD_STATISTICS_DEFAULTS.includeWl3);
  const limitedIncludeSongLimited = rules.limitedIncludeSongLimited || ref(CARD_STATISTICS_DEFAULTS.includeSongLimited);
  const includeUnitScoreInPureScore = rules.includeUnitScoreInPureScore || ref(CARD_STATISTICS_DEFAULTS.includeUnitScoreInPureScore);
  const fesLimitedIncludeFes = rules.fesLimitedIncludeFes || ref(CARD_STATISTICS_DEFAULTS.includeFestivalFes);
  const bannerEventTypeFilter = rules.bannerEventTypeFilter || ref(normalizeStatisticsEventTypes());
  const limitedBanEventTypeFilter = rules.limitedBanEventTypeFilter || ref(normalizeStatisticsEventTypes());
  const fesLimitedBanEventTypeFilter = rules.fesLimitedBanEventTypeFilter || ref(normalizeStatisticsEventTypes());
  const isEventTypeSelected = (filter, type) => normalizeStatisticsEventTypes(filter).includes(type);
  const isEventRewardCard = (card, options = {}) => isStatisticsRewardCard(card, options.includeCollab === true || includeCollabRewardCards.value);
  const shouldIncludeCardInLimitedStats = card => shouldCountCardAsLimited(card, {
    includeWl3: limitedIncludeWl3.value, includeSongLimited: limitedIncludeSongLimited.value,
  });
  const getCardProgressOrderId = getCardStatisticsProgressOrderId;
  const getStatProgressOrderKey = getCardStatisticsProgressOrder;

  const limitedBanCountMap = computed(() => {
    const map = {};
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const typeFilter = limitedBanEventTypeFilter.value;

    (inputs.props.allEvents || []).forEach((ev) => {
      if (!inputs.eventCatalog.isNumericEventId(ev?.id)) return;
      const eid = Number(ev.id);
      if (eid > maxEid) return;

      const eventType = String(ev?.event_type || '').trim();
      if (!isEventTypeSelected(typeFilter, eventType)) return;

      if (String(ev?.gacha_type || '').trim() !== '普通限定') return;

      const bannerName = inputs.presentation.normalizeBannerName(ev?.banner);
      if (!inputs.metadata.CHAR_ORDER[bannerName]) return;
      if (inputs.metadata.VS_NAMES.includes(bannerName)) return;
      map[bannerName] = (map[bannerName] || 0) + 1;
    });

    return map;
  });

  const limitedBanLastEventIdMap = computed(() => {
    const map = {};
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const typeFilter = limitedBanEventTypeFilter.value;

    (inputs.props.allEvents || []).forEach((ev) => {
      if (!inputs.eventCatalog.isNumericEventId(ev?.id)) return;
      const eid = Number(ev.id);
      if (eid > maxEid) return;

      const eventType = String(ev?.event_type || '').trim();
      if (!isEventTypeSelected(typeFilter, eventType)) return;

      if (String(ev?.gacha_type || '').trim() !== '普通限定') return;

      const bannerName = inputs.presentation.normalizeBannerName(ev?.banner);
      if (!inputs.metadata.CHAR_ORDER[bannerName]) return;
      if (inputs.metadata.VS_NAMES.includes(bannerName)) return;
      map[bannerName] = Math.max(Number(map[bannerName] || 0), eid);
    });

    return map;
  });

  const fesLimitedEventIdSet = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const fesEventIds = new Set();
    const result = new Set();

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      const eidRaw = String(card?.EventID || '').trim();
      if (!inputs.eventCatalog.isNumericEventId(eidRaw)) return;
      const type = String(card?.Type || '').trim().toLowerCase();
      if (inputs.presentation.isFesCardType(type)) {
        fesEventIds.add(Number(eidRaw));
      }
    });

    (inputs.props.allEvents || []).forEach((ev) => {
      if (inputs.eventCatalog.shouldSkipPredictEvent(ev)) return;
      if (!inputs.eventCatalog.isNumericEventId(ev?.id)) return;
      const eid = Number(ev.id);
      if (eid > maxEid) return;
      if (String(ev?.gacha_type || '').trim() !== '普通限定') return;
      if (!fesEventIds.has(eid)) return;
      result.add(eid);
    });

    return result;
  });

  const fesLimitedBanCountMap = computed(() => {
    const map = {};
    const targetEventIds = fesLimitedEventIdSet.value;
    const typeFilter = fesLimitedBanEventTypeFilter.value;
    if (!targetEventIds.size) return map;

    (inputs.props.allEvents || []).forEach((ev) => {
      if (!inputs.eventCatalog.isNumericEventId(ev?.id)) return;
      const eid = Number(ev.id);
      if (!targetEventIds.has(eid)) return;

      const eventType = String(ev?.event_type || '').trim();
      if (!isEventTypeSelected(typeFilter, eventType)) return;

      const bannerName = inputs.presentation.normalizeBannerName(ev?.banner);
      if (!inputs.metadata.CHAR_ORDER[bannerName]) return;
      if (inputs.metadata.VS_NAMES.includes(bannerName)) return;
      map[bannerName] = (map[bannerName] || 0) + 1;
    });

    return map;
  });

  const fesLimitedBanLastEventIdMap = computed(() => {
    const map = {};
    const targetEventIds = fesLimitedEventIdSet.value;
    const typeFilter = fesLimitedBanEventTypeFilter.value;
    if (!targetEventIds.size) return map;

    (inputs.props.allEvents || []).forEach((ev) => {
      if (!inputs.eventCatalog.isNumericEventId(ev?.id)) return;
      const eid = Number(ev.id);
      if (!targetEventIds.has(eid)) return;

      const eventType = String(ev?.event_type || '').trim();
      if (!isEventTypeSelected(typeFilter, eventType)) return;

      const bannerName = inputs.presentation.normalizeBannerName(ev?.banner);
      if (!inputs.metadata.CHAR_ORDER[bannerName]) return;
      if (inputs.metadata.VS_NAMES.includes(bannerName)) return;
      map[bannerName] = Math.max(Number(map[bannerName] || 0), eid);
    });

    return map;
  });

  const bannerCountMap = computed(() => {
    const map = {};
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const typeFilter = bannerEventTypeFilter.value;

    (inputs.props.allEvents || []).forEach((ev) => {
      if (inputs.eventCatalog.shouldSkipPredictEvent(ev)) return;
      if (!inputs.eventCatalog.isNumericEventId(ev?.id)) return;
      const eid = Number(ev.id);
      if (eid > maxEid) return;

      const eventType = String(ev?.event_type || '').trim();
      if (!['箱活', '混活'].includes(eventType)) return;
      if (!isEventTypeSelected(typeFilter, eventType)) return;

      const bannerName = inputs.presentation.normalizeBannerName(ev?.banner);
      if (!inputs.metadata.CHAR_ORDER[bannerName]) return;
      if (inputs.metadata.VS_NAMES.includes(bannerName)) return;
      map[bannerName] = (map[bannerName] || 0) + 1;
    });

    return map;
  });

  const bannerLastEventIdMap = computed(() => {
    const map = {};
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const typeFilter = bannerEventTypeFilter.value;

    (inputs.props.allEvents || []).forEach((ev) => {
      if (inputs.eventCatalog.shouldSkipPredictEvent(ev)) return;
      if (!inputs.eventCatalog.isNumericEventId(ev?.id)) return;
      const eid = Number(ev.id);
      if (eid > maxEid) return;

      const eventType = String(ev?.event_type || '').trim();
      if (!['箱活', '混活'].includes(eventType)) return;
      if (!isEventTypeSelected(typeFilter, eventType)) return;

      const bannerName = inputs.presentation.normalizeBannerName(ev?.banner);
      if (!inputs.metadata.CHAR_ORDER[bannerName]) return;
      if (inputs.metadata.VS_NAMES.includes(bannerName)) return;
      map[bannerName] = Math.max(Number(map[bannerName] || 0), eid);
    });

    return map;
  });

  const processedStats = computed(() => buildCardCharacterStats({
    cards: inputs.props.allCards || [],
    maxEventId: inputs.eventCatalog.safeMaxEventId.value,
    includeUnitScoreInPureScore: includeUnitScoreInPureScore.value,
    isCardWithinLimit: inputs.eventCatalog.isCardWithinLimit,
    normalizeCardStatsAttribute: inputs.eventCatalog.normalizeCardStatsAttribute,
    isEventRewardCard,
    fesLimitedEventIds: fesLimitedEventIdSet.value,
    includeFestivalFes: fesLimitedIncludeFes.value,
    attributeKeys: inputs.constants.ATTRS,
    bannerCounts: bannerCountMap.value,
    bannerLastEventIds: bannerLastEventIdMap.value,
    limitedBannerCounts: limitedBanCountMap.value,
    limitedBannerLastEventIds: limitedBanLastEventIdMap.value,
    festivalLimitedBannerCounts: fesLimitedBanCountMap.value,
    festivalLimitedBannerLastEventIds: fesLimitedBanLastEventIdMap.value,
    isNumericEventId: inputs.eventCatalog.isNumericEventId,
    isFesCardType: inputs.presentation.isFesCardType,
    shouldIncludeCardInLimitedStats,
    getCardProgressOrderId,
    normalizeBannerName: inputs.presentation.normalizeBannerName
  }));

  const groupByCount = (data, key) => {
    const groups = {};
    data.forEach(char => {
      const count = getCardStatisticsCount(char, key);
      if (!groups[count]) groups[count] = [];
      groups[count].push(char);
    });
    return Object.keys(groups)
      .map(count => ({
        count: parseInt(count, 10),
        chars: groups[count].sort((a, b) => {
          const ao = getStatProgressOrderKey(a, key);
          const bo = getStatProgressOrderKey(b, key);
          if (ao !== bo) return ao - bo;
          const ac = inputs.metadata.CHAR_ORDER[String(a?.name || '').split(/\s+/)[0]] || 999;
          const bc = inputs.metadata.CHAR_ORDER[String(b?.name || '').split(/\s+/)[0]] || 999;
          if (ac !== bc) return ac - bc;
          return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-Hans-CN');
        })
      }))
      .sort((a, b) => b.count - a.count);
  };


  return { processedStats, groupByCount, fesLimitedEventIdSet, isEventRewardCard,
    shouldIncludeCardInLimitedStats, getCardProgressOrderId, getStatProgressOrderKey };
}
