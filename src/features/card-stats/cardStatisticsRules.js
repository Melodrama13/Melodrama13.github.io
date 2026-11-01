import { GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY } from '../../domain/gameAttributes.js';

/** Calculation defaults shared by the full page and floating panels. */
export const CARD_STATISTICS_DEFAULTS = Object.freeze({
  includeCollabRewardCards: false,
  useRewardCountForLowStars: true,
  includeWl3: false,
  includeSongLimited: true,
  includeUnitScoreInPureScore: false,
  includeFestivalFes: true,
  festivalMergeHigherRanks: false,
});

export const CARD_STATISTICS_EVENT_TYPES = Object.freeze(['箱活', '混活']);
export const CARD_STATISTICS_ATTRIBUTES = Object.freeze(Object.values(GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY));
export const CARD_STATISTICS_UNIT_ORDER = Object.freeze(['ln', 'mmj', 'vbs', 'ws', 'nc']);
export const CARD_STATISTICS_FESTIVALS = Object.freeze(['新年', '婚活', '情人节', '白情', '半周年', '周年']);
export const CARD_STATISTICS_FESTIVAL_VS_UNIT_ORDER = Object.freeze({ ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5, vs: 6 });
export const CARD_STATISTICS_VS_NAMES = Object.freeze(['初音未来', '镜音铃', '镜音连', '巡音流歌', 'MEIKO', 'KAITO']);

export function normalizeCardStatisticsAttribute(value) {
  return GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY[String(value || '').trim().toLowerCase()] || '';
}

export function normalizeStatisticsEventTypes(value = CARD_STATISTICS_EVENT_TYPES) {
  if (value === 'all') return [...CARD_STATISTICS_EVENT_TYPES];
  return CARD_STATISTICS_EVENT_TYPES.filter(type => Array.isArray(value) ? value.includes(type) : type === value);
}

export function isStatisticsRewardCard(card, includeCollab = CARD_STATISTICS_DEFAULTS.includeCollabRewardCards) {
  if (!['2', '3'].includes(String(card?.Rarity || '').trim())) return false;
  if (/^\d+$/.test(String(card?.EventID ?? '').trim())) return true;
  return includeCollab && String(card?.Type || '').trim().toLowerCase() === 'collab';
}

export function getCardStatisticsProgressOrderId(card) {
  const cardId = Number(String(card?.CardID || '').trim());
  if (Number.isFinite(cardId) && cardId > 0) return cardId;
  const eventId = Number(String(card?.EventID || '').trim());
  return Number.isFinite(eventId) && eventId > 0 ? eventId * 10000 : 0;
}

const PROGRESS_FIELDS = Object.freeze({
  fourStarCount: 'lastFourStarOrderId', limitedCount: 'lastLimitedOrderId',
  fesLimitedCount: 'lastFesLimitedOrderId', scoreUpCount: 'lastScoreUpOrderId',
  pScoreCount: 'lastPScoreOrderId', pureScoreCount: 'lastPureScoreOrderId',
  recoveryCount: 'lastRecoveryOrderId', accuracyCount: 'lastAccuracyOrderId',
  threeStarCount: 'lastThreeStarOrderId', twoStarCount: 'lastTwoStarOrderId',
  rewardThreeCount: 'lastRewardThreeOrderId', rewardTwoCount: 'lastRewardTwoOrderId',
  rewardThreeCountWithCollab: 'lastRewardThreeWithCollabOrderId',
  rewardTwoCountWithCollab: 'lastRewardTwoWithCollabOrderId',
  rewardTotalCount: 'lastRewardOrderId', rewardTotalCountWithCollab: 'lastRewardWithCollabOrderId',
  bannerCount: 'lastBannerOrderId', limitedBanCount: 'lastLimitedBanOrderId',
  fesLimitedBanCount: 'lastFesLimitedBanOrderId',
});

export function getCardStatisticsProgressOrder(row, key) {
  return Number(row?.[PROGRESS_FIELDS[key] || 'lastCardOrderId'] || 0);
}

export function getCardStatisticsCount(row, key) {
  if (key === 'rewardTotalCountWithCollab') return row.rewardThreeCountWithCollab + row.rewardTwoCountWithCollab;
  return row[key];
}

/** Keep the shared character display order, including the adjacent Miku/Luka pair. */
export function orderCardStatisticsNames(sourceNames, order) {
  const names = [...(sourceNames || [])].sort((a, b) => (order[a] || 999) - (order[b] || 999));
  const luka = names.indexOf('巡音流歌'), miku = names.indexOf('初音未来');
  if (luka >= 0 && miku >= 0 && luka !== miku + 1) {
    names.splice(luka, 1); names.splice(miku + 1, 0, '巡音流歌');
  }
  return names;
}
