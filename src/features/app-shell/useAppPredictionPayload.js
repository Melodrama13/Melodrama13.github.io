import { GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY } from "../../domain/gameAttributes.js";
import { isCollaborationEvent, normalizeCollaborationEventId, mergeCollaborationCardPredictions } from "../../domain/collaborationEvents.js";

/** Owns application prediction payload with per-instance state and explicit peer interfaces. */
export function useAppPredictionPayload(ports = {}) {
const getNextSeriesId = () => {
  const allIds = ports.predictionOverlay.totalCardsData.value
    .map(c => parseInt(c.SeriesID))
    .filter(id => !isNaN(id));
  return allIds.length > 0 ? Math.max(...allIds) + 1 : 1;
};

const getBaseBannerName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

const getNextTypeSeriesId = ({ eventId, eventType, bannerName }) => {
  const baseBanner = getBaseBannerName(bannerName);
  if (!eventType || !baseBanner || eventType === 'World Link') return null;

  const currentId = Number(eventId);
  const prevMax = ports.predictionOverlay.totalEventData.value.reduce((max, ev) => {
    const evId = Number(ev?.id);
    if (!Number.isFinite(evId) || evId >= currentId) return max;
    if (String(ev?.event_type || '').trim() !== eventType) return max;

    const evBanner = getBaseBannerName(ev?.banner);
    if (!evBanner || evBanner !== baseBanner) return max;

    const sid = parseInt(ev?.type_series_id, 10);
    if (Number.isNaN(sid)) return max;
    return Math.max(max, sid);
  }, 0);

  return prevMax + 1;
};

const normalizePredictionAttribute = (attributeValue) => {
  const attributeKey = String(attributeValue || '').trim();
  if (!attributeKey) return '';
  if (attributeKey === '-') return '-';
  return GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY[attributeKey.toLowerCase()] || '';
};

const CHAR_ORDER = {
  "星乃一歌": 1, "天马咲希": 2, "望月穗波": 3, "日野森志步": 4,
  "花里实乃里": 5, "桐谷遥": 6, "桃井爱莉": 7, "日野森雫": 8,
  "小豆泽心羽": 9, "白石杏": 10, "东云彰人": 11, "青柳冬弥": 12,
  "天马司": 13, "凤笑梦": 14, "草薙宁宁": 15, "神代类": 16,
  "宵崎奏": 17, "朝比奈真冬": 18, "东云绘名": 19, "晓山瑞希": 20,
  "初音未来": 21, "镜音铃": 22, "镜音连": 23, "巡音流歌": 24, "MEIKO": 25, "KAITO": 26
};

const VS_NAME_SET = new Set(["初音未来", "镜音铃", "镜音连", "巡音流歌", "MEIKO", "KAITO"]);

const isVsName = (name) => VS_NAME_SET.has(getBaseBannerName(name));

const buildBannerNameWithUnit = (name, unit) => {
  const baseName = getBaseBannerName(name);
  const unitSuffix = String(unit || '').trim().toLowerCase();
  if (!baseName) return '';
  if (isVsName(baseName) && unitSuffix && unitSuffix !== 'vs') return `${baseName} ${unitSuffix}`;
  return baseName;
};

const getCharOrder = (name) => {
  const baseName = getBaseBannerName(name);
  return CHAR_ORDER[baseName] || 0;
};

function sortPredictedCardsForDisplay(cards, bannerName) {
  if (!Array.isArray(cards) || cards.length === 0) return [];

  const baseBanner = getBaseBannerName(bannerName);
  const bannerIndex = cards.findIndex((c) => getBaseBannerName(c.Name) === baseBanner);
  const hasBanner = bannerIndex > -1;
  const bannerCard = hasBanner ? cards[bannerIndex] : null;
  const rest = cards.filter((_, idx) => !hasBanner || idx !== bannerIndex);
  const sortedFourStars = [];
  const unsortedBfesFourStars = [];
  const unsortedLowStars = [];

  rest.forEach((c) => {
    const isFourStar = Number(c.Rarity) === 4;
    const isBfes = String(c.Type || '').toLowerCase() === 'bfes';
    if (isFourStar && isBfes) {
      unsortedBfesFourStars.push(c);
    } else if (isFourStar) {
      sortedFourStars.push(c);
    } else {
      unsortedLowStars.push(c);
    }
  });

  sortedFourStars.sort((a, b) => getCharOrder(a.Name) - getCharOrder(b.Name));
  const sortedLowStars = [...unsortedLowStars].sort((a, b) => {
    const ar = Number(String(a?.Rarity || '').trim()) || 0;
    const br = Number(String(b?.Rarity || '').trim()) || 0;
    if (ar !== br) return br - ar;
    return getCharOrder(a.Name) - getCharOrder(b.Name);
  });

  const merged = [...sortedFourStars, ...unsortedBfesFourStars, ...sortedLowStars];
  return bannerCard ? [bannerCard, ...merged] : merged;
}

const isTeamWorldLink = (eventType, typeSeriesId) => {
  if (String(eventType || '').trim() !== 'World Link') return false;
  const sid = Number(typeSeriesId);
  return Number.isFinite(sid) && sid > 0 && sid <= 2;
};

const buildPredictEventPatchFromPayload = (payload, options = {}) => {
  if (!payload || typeof payload !== 'object') return null;
  const { eventId, eventType, gachaType, predictAttr, bannerName: payloadBannerName, selectedChars, event_title } = payload;
  const sourceEvent = ports.predictionSchedule.getSourceEventById(eventId);
  const isCollaboration = isCollaborationEvent(sourceEvent);
  const targetEventId = isCollaboration ? normalizeCollaborationEventId(sourceEvent.id) : Number(eventId);
  if (!sourceEvent || ports.predictionSchedule.isPredictDisabledJsonEvent(sourceEvent) || ports.predictionSchedule.isJsonEventOfficialRevealed(sourceEvent)) {
    if (options?.warn !== false) {
      console.warn(`[predict] ignore save for event ${eventId}, not editable by source JSON`);
    }
    return null;
  }

  const safeSelectedChars = Array.isArray(selectedChars) ? selectedChars : [];
  if (isCollaboration) {
    const sourceCards = ports.predictionSchedule.getSourceCollaborationCards(targetEventId);
    if (!sourceCards.length) return null;
    const memberCards = mergeCollaborationCardPredictions(sourceCards, safeSelectedChars.map(char => ({
      CardID: char.cardId,
      Name: char.name,
      Rarity: char.rarity,
      Affiliation: char.Affiliation || char.selectedUnit,
      Attribute: normalizePredictionAttribute(char.attr),
      Skill: char.skillType
    })));
    return ports.predictionSchedule.normalizePredictionPatchBySource({
      id: targetEventId,
      event_title: '[预测] 联动',
      event_attribute: normalizePredictionAttribute(predictAttr),
      memberCards
    });
  }

  const nextSid = getNextSeriesId();
  const isNonFesFourStar = (char) => {
    const rarity = String(char?.rarity || '').trim();
    const skill = String(char?.skillType || '').trim().toLowerCase();
    return rarity === '4' && !skill.includes('fes');
  };

  const bannerCandidates = safeSelectedChars
    .filter((char) => isNonFesFourStar(char))
    .map((char) => getBaseBannerName(char?.name))
    .filter(Boolean);

  const payloadBannerBaseName = getBaseBannerName(payloadBannerName);
  const resolvedBannerName = eventType === 'World Link'
    ? ''
    : (bannerCandidates.includes(payloadBannerBaseName)
      ? payloadBannerBaseName
      : (bannerCandidates[0] || ''));

  if (eventType !== 'World Link' && !resolvedBannerName) {
    if (options?.alertOnInvalid) {
      alert('保存失败：Ban主必须是队伍中的 4星非 FES 成员。');
    }
    return null;
  }

  const nextTypeSeriesId = eventType === 'World Link'
    ? (sourceEvent?.type_series_id ?? null)
    : getNextTypeSeriesId({ eventId, eventType, bannerName: resolvedBannerName });
  const teamWorldLink = isTeamWorldLink(eventType, nextTypeSeriesId ?? sourceEvent?.type_series_id);

  const generatedCardsRaw = safeSelectedChars.map((char, index) => {
    const rarity = char.rarity || "4";
    const isBfes = char.skillType === 'bfes_up' && rarity === '4';
    const isVsCard = isVsName(char.name);

    let cardType = 'perm';
    if (isBfes) {
      cardType = 'bfes';
    } else if (gachaType === 'limited' && rarity === '4') {
      cardType = 'limited';
    } else if (gachaType === 'ue' && rarity === '4') {
      cardType = 'ue';
    }

    return {
      CardID: `PRED-${targetEventId}-${index}`,
      Name: char.name,
      Rarity: rarity,
      EventID: targetEventId,
      Attribute: normalizePredictionAttribute(char.attr) || '-',
      Skill: isBfes ? 'bfes_up' : (char.skillType || "-"),
      Type: cardType,
      Affiliation: (isBfes && isVsCard) ? 'vs' : (char.Affiliation || ""),
      SeriesID: eventType === 'World Link' ? null : (getBaseBannerName(char?.name) === resolvedBannerName ? nextSid : null)
    };
  });

  const generatedCards = eventType === 'World Link'
    ? generatedCardsRaw
    : sortPredictedCardsForDisplay(generatedCardsRaw, resolvedBannerName);

  const predictedUnit = String(generatedCards?.[0]?.Affiliation || '').trim().toLowerCase();
  const sourceUnit = String(sourceEvent?.unit || '').trim().toLowerCase();
  const finalUnit = predictedUnit || sourceUnit;
  const worldLinkUnit = teamWorldLink ? finalUnit : '';
  const bannerCard = generatedCardsRaw.find((card) => getBaseBannerName(card?.Name) === resolvedBannerName && card?.SeriesID === nextSid);
  const finalBanner = eventType === 'World Link'
    ? ''
    : buildBannerNameWithUnit(resolvedBannerName, bannerCard?.Affiliation);

  return ports.predictionSchedule.retargetPredictPatch({
    id: targetEventId,
    predict_schema_version: 5,
    event_title: event_title,
    event_type: eventType,
    gacha_type: gachaType === 'limited' ? '普通限定' : (gachaType === 'ue' ? 'UE限定' : '常驻'),
    type_series_id: nextTypeSeriesId,
    event_attribute: normalizePredictionAttribute(predictAttr),
    memberCards: generatedCards,
    banner: finalBanner,
    unit: eventType === 'World Link' ? worldLinkUnit : finalUnit,
    isPredict: true
  }, sourceEvent);
};

return {
getNextSeriesId,
getBaseBannerName,
getNextTypeSeriesId,
normalizePredictionAttribute,
CHAR_ORDER,
VS_NAME_SET,
isVsName,
buildBannerNameWithUnit,
getCharOrder,
sortPredictedCardsForDisplay,
isTeamWorldLink,
buildPredictEventPatchFromPayload
};
}
