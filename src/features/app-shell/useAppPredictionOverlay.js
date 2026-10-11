import { ref, computed } from "vue";
import { isCollaborationEvent, mergeCollaborationCardPredictions } from '../../domain/collaborationEvents.js';

/** Owns application prediction overlay with per-instance state and explicit peer interfaces. */
export function useAppPredictionOverlay(ports = {}) {
const draftPredictiveEvent = ref(null);

const effectivePredictiveEvents = computed(() => {
  const saved = ports.predictionSchedule.reconcilePredictiveEvents(ports.predictionSources.predictiveEvents.value);
  const draft = draftPredictiveEvent.value;
  const draftKey = ports.predictionSchedule.getEventKey(draft?.id);
  if (!draft || !draftKey) return saved;
  return ports.predictionSchedule.reconcilePredictiveEvents([
    ...saved.filter((item) => ports.predictionSchedule.getEventKey(item?.id) !== draftKey),
    draft
  ]);
});

const normalizeText = (v) => String(v || '').trim().toLowerCase();

const getFixedRosterCardKey = (card) => {
  return `${normalizeText(card?.Name)}|${normalizeText(card?.Affiliation)}|${String(card?.Rarity || '')}`;
};

const mergeFixedRosterCards = (baseCardsForEvent, predictCardsForEvent) => {
  if (!Array.isArray(baseCardsForEvent) || baseCardsForEvent.length === 0) return [];
  if (!Array.isArray(predictCardsForEvent) || predictCardsForEvent.length === 0) {
    return [...baseCardsForEvent].sort((a, b) => b.Rarity - a.Rarity);
  }

  const usedPredictIndexes = new Set();

  const findPredictForBase = (baseCard) => {
    const baseKey = getFixedRosterCardKey(baseCard);
    let idx = predictCardsForEvent.findIndex((c, i) => !usedPredictIndexes.has(i) && getFixedRosterCardKey(c) === baseKey);
    if (idx === -1) {
      const baseName = normalizeText(baseCard?.Name);
      idx = predictCardsForEvent.findIndex((c, i) => !usedPredictIndexes.has(i) && normalizeText(c?.Name) === baseName);
    }
    if (idx === -1) return null;
    usedPredictIndexes.add(idx);
    return predictCardsForEvent[idx];
  };

  const merged = baseCardsForEvent.map((baseCard) => {
    const patchCard = findPredictForBase(baseCard);
    if (!patchCard) return { ...baseCard };

    return {
      ...baseCard,
      Attribute: ports.predictionPayload.normalizePredictionAttribute(patchCard.Attribute) || baseCard.Attribute,
      Skill: patchCard.Skill || baseCard.Skill
    };
  });

  return merged.sort((a, b) => b.Rarity - a.Rarity);
};

const baseCardsByEventId = computed(() => {
  const cardsByEventId = new Map();
  (ports.resourceLoading.baseCards.value || []).forEach((card) => {
    const eventId = String(card?.EventID || '');
    const cards = cardsByEventId.get(eventId);
    if (cards) {
      cards.push(card);
    } else {
      cardsByEventId.set(eventId, [card]);
    }
  });
  return cardsByEventId;
});

const effectivePredictiveEventsById = computed(() => {
  const eventsById = new Map();
  (effectivePredictiveEvents.value || []).forEach((event) => {
    const eventId = ports.predictionSchedule.getEventKey(event?.id);
    // Keep the first entry to preserve the previous Array.find behavior.
    if (eventId && !eventsById.has(eventId)) {
      eventsById.set(eventId, event);
    }
  });
  return eventsById;
});

const totalEventData = computed(() => {
  // 1. 遍历所有的历史活动（包括你填好的 218 以前的坑）
  return ports.resourceLoading.historyData.value.map(jsonEvent => {
    // 2. 预测补丁默认按当前实际 ID 精确合并；插入型测试活动只在 reconcile 阶段重定向一次。
    const patch = effectivePredictiveEventsById.value.get(ports.predictionSchedule.getEventKey(jsonEvent.id));
    const forceOfficial = ports.predictionSchedule.isJsonEventOfficialRevealed(jsonEvent) || ports.predictionSchedule.isPredictDisabledJsonEvent(jsonEvent);
    const effectivePatch = forceOfficial ? null : patch;

    // 3. 如果有补丁，合并它；如果没有，用原件
    const event = effectivePatch ? { ...jsonEvent, ...effectivePatch, isPredict: true } : jsonEvent;

    // 4. 关联卡片逻辑：
    // 既搜 JSON 里的基础卡，也加上预测补丁里的卡
    const baseCardsForThisEvent = baseCardsByEventId.value.get(String(event.id)) || [];
    const predictCardsForThisEvent = effectivePatch ? (effectivePatch.memberCards || []) : [];

    const isWorldLinkEvent = String(event?.event_type || '').trim() === 'World Link';
    const isCollaboration = isCollaborationEvent(jsonEvent);
    const isFixedRosterEvent = isWorldLinkEvent || isCollaboration;
    const combinedRawCards = [...baseCardsForThisEvent, ...predictCardsForThisEvent];
    const combinedCards = (effectivePatch && predictCardsForThisEvent.length > 0)
      ? (isFixedRosterEvent
        ? (isCollaboration ? mergeCollaborationCardPredictions(baseCardsForThisEvent, predictCardsForThisEvent) : mergeFixedRosterCards(baseCardsForThisEvent, predictCardsForThisEvent))
        : ports.predictionPayload.sortPredictedCardsForDisplay(combinedRawCards, event.banner))
      : combinedRawCards.sort((a, b) => b.Rarity - a.Rarity);

    return {
      ...event,
      memberCards: combinedCards,
      ...(isCollaboration ? { source_memberCards: baseCardsForThisEvent } : {}),
      source_event_title: jsonEvent.event_title || '',
      source_event_type: jsonEvent.event_type || '',
      source_gacha_title: jsonEvent.gacha_title || '',
      source_gacha_type: jsonEvent.gacha_type || ''
    };
  });
});

const totalCardsData = computed(() => {
  const eventCards = totalEventData.value.flatMap((ev) => ev.memberCards || []);
  const usedCardIds = new Set(
    eventCards
      .map((c) => String(c?.CardID || '').trim())
      .filter((id) => id)
  );

  // movie 等非活动绑定卡不会出现在 totalEventData.memberCards，需要补入统计源。
  const detachedBaseCards = (ports.resourceLoading.baseCards.value || []).filter((card) => {
    const cardId = String(card?.CardID || '').trim();
    return cardId && !usedCardIds.has(cardId);
  });

  return [...eventCards, ...detachedBaseCards];
});

return {
draftPredictiveEvent,
effectivePredictiveEvents,
normalizeText,
getFixedRosterCardKey,
mergeFixedRosterCards,
baseCardsByEventId,
effectivePredictiveEventsById,
totalEventData,
totalCardsData
};
}
