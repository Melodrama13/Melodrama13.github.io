import { computed } from "vue";
import { isCompilationEvent } from "../../utils/compilationEvents.js";
import { normalizePredictionScheduleKey, getPredictionScheduleOrderEntries } from "../../domain/predictionScheduleKeys.js";
import { getExplicitPredictionKey, resolveImportedPredictionKey } from "../../domain/legacyPredictionMigration.js";
import { normalizeCollaborationEventId, isCollaborationEvent, mergeCollaborationCardPredictions } from "../../domain/collaborationEvents.js";
import { isTeamWorldLinkEvent, WORLD_LINK_PREDICTION_SKILL } from '../../domain/worldLink.js';

/** Owns application prediction schedule with per-instance state and explicit peer interfaces. */
export function useAppPredictionSchedule(ports = {}) {
const hasValidEventTitle = (value) => String(value || '').trim().length > 0;

const getEventKey = (value) => String(value ?? '').trim().toLowerCase();

const predictionOrderEntries = computed(() => {
  const order = ports.resourceLoading.predictionScheduleOrder?.value;
  return order ? getPredictionScheduleOrderEntries(order) : [];
});

const getPredictionScheduleKeyByEventId = (eventId) => {
  const event = getSourceEventById(eventId);
  if (!event || isJsonEventOfficialRevealed(event)) return '';
  return predictionOrderEntries.value.find(entry => entry.eventId === Number(eventId))?.key || '';
};

const predictionEventsByScheduleKey = computed(() => {
  const events = new Map();
  const byId = new Map((ports.resourceLoading.historyData.value || [])
    .filter(event => /^\d+$/.test(String(event?.id ?? '')))
    .map(event => [Number(event.id), event]));
  for (const entry of predictionOrderEntries.value) {
    const event = byId.get(entry.eventId);
    if (event && !isJsonEventOfficialRevealed(event) && !isPredictDisabledJsonEvent(event)) events.set(normalizePredictionScheduleKey(entry.key), event);
  }
  return events;
});

const resolvePredictionScheduleKeyEvent = key => predictionEventsByScheduleKey.value.get(normalizePredictionScheduleKey(key)) || null;

const isJsonEventOfficialRevealed = (event) => {
  if (!event || typeof event !== 'object') return false;
  return hasValidEventTitle(event.event_title);
};

const getSourceCollaborationCards = eventId => (ports.resourceLoading.baseCards?.value || [])
  .filter(card => getEventKey(card?.EventID) === getEventKey(eventId));

const isNumericEventIdValue = (value) => {
  const idNum = Number(value);
  return Number.isFinite(idNum);
};

const getSourceEventTypeText = (event) => (
  Object.prototype.hasOwnProperty.call(event || {}, 'source_event_type')
    ? String(event?.source_event_type || '').trim()
    : String(event?.event_type || '').trim()
);

const isJsonTestEvent = (event) => {
  const type = getSourceEventTypeText(event).toLowerCase();
  return type === '测试' || type === 'test' || type.includes('测试');
};

const isJsonWorldLinkFinalEvent = (event) => {
  const type = getSourceEventTypeText(event).toLowerCase().replace(/\s+/g, '');
  return type.includes('终章') && (type.includes('wl') || type.includes('worldlink'));
};

const isPredictDisabledJsonEvent = (event) => (
  isJsonTestEvent(event) || isJsonWorldLinkFinalEvent(event) || isCompilationEvent(event)
);

const resolvePredictEventIdForCurrentSchedule = patch => {
  const collaborationId = normalizeCollaborationEventId(patch?.id);
  if (collaborationId) {
    return getExplicitPredictionKey(patch) === null && isCollaborationEvent(getSourceEventById(collaborationId)) && getSourceCollaborationCards(collaborationId).length > 0
      ? collaborationId : null;
  }
  return resolvePredictionScheduleKeyEvent(resolveImportedPredictionKey(patch))?.id ?? null;
};

const getCurrentOfficialEventId = () => {
  const today = new Date();
  const ids = (ports.resourceLoading.historyData.value || [])
    .filter((ev) => {
      const idNum = Number(ev?.id);
      if (!Number.isFinite(idNum)) return false;
      if (isJsonTestEvent(ev)) return false;
      if (!hasValidEventTitle(ev?.event_title)) return false;
      const d = new Date(String(ev?.start_date || '').replace(/\//g, '-'));
      if (Number.isNaN(d.getTime())) return false;
      return d <= today;
    })
    .map((ev) => Number(ev.id));
  return ids.length ? Math.max(...ids) : -1;
};

const getCurrentJsonRevealedEventId = () => {
  const ids = (ports.resourceLoading.historyData.value || [])
    .filter((ev) => {
      const idNum = Number(ev?.id);
      if (!Number.isFinite(idNum)) return false;
      if (isJsonTestEvent(ev)) return false;
      return isJsonEventOfficialRevealed(ev);
    })
    .map((ev) => Number(ev.id));
  return ids.length ? Math.max(...ids) : -1;
};

const getCurrentPredictLockEventId = () => {
  const byDate = getCurrentOfficialEventId();
  const byReveal = getCurrentJsonRevealedEventId();
  return Math.max(byDate, byReveal);
};

const getPredictableEventIdRange = () => {
  const lockId = getCurrentPredictLockEventId();
  const ids = (ports.resourceLoading.historyData.value || [])
    .filter((ev) => isNumericEventIdValue(ev?.id) && !isPredictDisabledJsonEvent(ev) && !isJsonEventOfficialRevealed(ev) && getPredictionScheduleKeyByEventId(ev.id))
    .map((ev) => Number(ev?.id))
    .sort((a, b) => a - b);

  if (!ids.length) {
    return { ok: false, minId: 0, maxId: 0, lockId };
  }

  return {
    ok: true,
    minId: ids[0],
    maxId: ids[ids.length - 1],
    lockId
  };
};

const getSourceEventById = (eventId) => {
  const key = getEventKey(eventId);
  if (!key) return null;
  return (ports.resourceLoading.historyData.value || []).find((ev) => getEventKey(ev?.id) === key) || null;
};

const retargetPredictMemberCards = (cards, eventId) => {
  if (!Array.isArray(cards)) return cards;
  const targetId = isNumericEventIdValue(eventId) ? Number(eventId) : getEventKey(eventId);
  return cards.map((card, index) => {
    if (!card || typeof card !== 'object') return card;
    const next = {
      ...card,
      EventID: targetId
    };
    const cardId = String(card.CardID || '').trim();
    if (cardId.startsWith('PRED-')) {
      next.CardID = `PRED-${targetId}-${index}`;
    }
    return next;
  });
};

const retargetPredictPatch = (patch, targetEvent) => {
  const targetKey = getEventKey(targetEvent?.id);
  if (!targetKey) return null;
  const targetId = isNumericEventIdValue(targetEvent?.id) ? Number(targetEvent.id) : targetKey;
  const predictionKey = getPredictionScheduleKeyByEventId(targetId);
  if (isNumericEventIdValue(targetId) && !predictionKey) return null;
  const next = {
    ...(patch || {}),
    id: targetId,
    predict_schema_version: 5,
    memberCards: retargetPredictMemberCards(patch?.memberCards, targetId)
  };
  delete next.predict_schedule_key;
  delete next.predict_schedule_index;
  delete next.predict_shift_count;
  if (predictionKey) next.key = predictionKey;
  else delete next.key;
  return next;
};

const resolvePredictPatchForCurrentSchedule = (patch) => {
  if (!patch || typeof patch !== 'object') return null;

  const useTarget = (targetId) => {
    const sourceEvent = getSourceEventById(targetId);
    if (!sourceEvent) return null;
    if (isPredictDisabledJsonEvent(sourceEvent) || isJsonEventOfficialRevealed(sourceEvent)) return null;
    const patchWithKey = retargetPredictPatch(patch, sourceEvent);
    if (!patchWithKey) return null;
    return {
      patch: patchWithKey,
      sourceEvent,
      key: getEventKey(sourceEvent.id)
    };
  };

  return useTarget(resolvePredictEventIdForCurrentSchedule(patch));
};

const normalizeWorldLinkPatch = (patch) => {
  if (!patch || typeof patch !== 'object') return patch;
  const sourceEvent = getSourceEventById(patch.id);
  const sourceType = String(sourceEvent?.event_type || '').trim();
  if (sourceType !== 'World Link') return patch;

  return {
    ...patch,
    event_type: sourceType,
    gacha_type: sourceEvent.gacha_type,
    type_series_id: sourceEvent.type_series_id,
    event_attribute: '',
    memberCards: Array.isArray(patch.memberCards)
      ? patch.memberCards.map(card => ({ ...card, Skill: WORLD_LINK_PREDICTION_SKILL })) : patch.memberCards,
    banner: '',
    unit: isTeamWorldLinkEvent(sourceEvent) ? (sourceEvent.unit || patch.unit || '') : ''
  };
};

const normalizePredictionPatchBySource = (patch) => {
  if (!patch || typeof patch !== 'object') return patch;
  const sourceEvent = getSourceEventById(patch.id);
  if (!isCollaborationEvent(sourceEvent)) return normalizeWorldLinkPatch(patch);
  return {
    id: normalizeCollaborationEventId(sourceEvent.id),
    predict_schema_version: 5,
    event_title: sourceEvent.event_title || patch.event_title || '[预测] 联动',
    event_type: sourceEvent.event_type,
    gacha_type: sourceEvent.gacha_type,
    type_series_id: sourceEvent.type_series_id,
    event_attribute: patch.event_attribute || '',
    memberCards: mergeCollaborationCardPredictions(getSourceCollaborationCards(sourceEvent.id), patch.memberCards),
    banner: sourceEvent.banner || '',
    unit: sourceEvent.unit || '',
    isPredict: true
  };
};

const sanitizeScheduledPredictiveEvents = (list) => {
  const byKey = new Map();
  (list || []).forEach((ev) => {
    const resolved = resolvePredictPatchForCurrentSchedule(ev);
    if (!resolved) return;
    byKey.set(resolved.key, normalizePredictionPatchBySource(resolved.patch));
  });
  return [...byKey.values()];
};

const sanitizeCanonicalPredictiveEvents = (list) => {
  const byKey = new Map();
  (list || []).forEach((ev) => {
    const resolved = resolvePredictPatchForCurrentSchedule(ev);
    if (!resolved) return;
    byKey.set(resolved.key, normalizePredictionPatchBySource(resolved.patch));
  });
  return [...byKey.values()];
};

const filterActivePredictiveEvents = (list) => {
  return (list || []).filter((ev) => {
    const sourceEvent = getSourceEventById(ev?.id);
    if (!sourceEvent) return false;
    if (isPredictDisabledJsonEvent(sourceEvent)) return false;
    return !isJsonEventOfficialRevealed(sourceEvent);
  });
};

const reconcilePredictiveEvents = (list) => {
  const normalized = sanitizeScheduledPredictiveEvents(list);
  const filtered = filterActivePredictiveEvents(normalized);
  return filtered;
};

const buildPredictExportPayload = (list) => ({
  version: 5,
  exportedAt: new Date().toISOString(),
  source: 'pjsk-planner',
  owner: ports.predictionSources.normalizeUserName(ports.predictionSources.predictUserName.value),
  predictiveEvents: sanitizeCanonicalPredictiveEvents(Array.isArray(list) ? list : [])
});

return {
hasValidEventTitle,
getEventKey,
getPredictionScheduleKeyByEventId,
resolvePredictionScheduleKeyEvent,
getSourceCollaborationCards,
isJsonEventOfficialRevealed,
isNumericEventIdValue,
getSourceEventTypeText,
isJsonTestEvent,
isJsonWorldLinkFinalEvent,
isPredictDisabledJsonEvent,
resolvePredictEventIdForCurrentSchedule,
getCurrentOfficialEventId,
getCurrentJsonRevealedEventId,
getCurrentPredictLockEventId,
getPredictableEventIdRange,
getSourceEventById,
retargetPredictMemberCards,
retargetPredictPatch,
resolvePredictPatchForCurrentSchedule,
normalizeWorldLinkPatch,
normalizePredictionPatchBySource,
sanitizeScheduledPredictiveEvents,
sanitizeCanonicalPredictiveEvents,
filterActivePredictiveEvents,
reconcilePredictiveEvents,
buildPredictExportPayload
};
}
