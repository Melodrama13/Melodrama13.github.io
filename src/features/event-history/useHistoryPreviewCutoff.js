import { computed } from 'vue';

/** Preview Cutoff owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Formatting, PredictionEditor, PredictionEligibility, EventOrdering, PreviewSelections, SourceDates.
 */
export function useHistoryPreviewCutoff(ports) {
const previewEventBySourceKey = computed(() => new Map(
  (ports.props.allEvents || [])
    .map((event) => [ports.formatting.normalizeEventId(event?.id), event])
    .filter(([key]) => key)
));

const previewCutoffEvent = computed(() => {
  const editingKey = ports.formatting.normalizeEventId(ports.predictionEditor.currentEditingEvent.value?.id);
  if (editingKey) {
    return previewEventBySourceKey.value.get(editingKey) || ports.predictionEditor.currentEditingEvent.value;
  }
  const currentId = Number(ports.predictionEligibility.getCurrentEventId());
  if (!Number.isFinite(currentId) || currentId <= 0) return null;
  return previewEventBySourceKey.value.get(String(currentId)) || null;
});

const previewMaxEventId = computed(() => {
  const cutoffEvent = previewCutoffEvent.value;
  if (ports.formatting.isNumericEventId(cutoffEvent?.id)) return Number(cutoffEvent.id);

  if (cutoffEvent) {
    const precedingNumericIds = (ports.props.allEvents || [])
      .filter((event) => ports.formatting.isNumericEventId(event?.id))
      .filter((event) => ports.eventOrdering.compareEventOrderAsc(event, cutoffEvent) <= 0)
      .map((event) => Number(event.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (precedingNumericIds.length > 0) return Math.max(...precedingNumericIds);
  }

  const currentId = Number(ports.predictionEligibility.getCurrentEventId());
  return Number.isFinite(currentId) && currentId > 0 ? currentId : Number.MAX_SAFE_INTEGER;
});

const previewEffectiveCards = computed(() => {
  const sourceCards = [...(ports.props.allCards || [])];
  const editingKey = ports.formatting.normalizeEventId(ports.predictionEditor.currentEditingEvent.value?.id);
  if (!ports.predictionEditor.isEditorOpen.value || !editingKey) return sourceCards;

  const sourceByName = new Map();
  sourceCards.forEach((card) => {
    if (ports.formatting.normalizeEventId(card?.EventID) !== editingKey) return;
    const name = ports.previewSelections.normalizeCharName(card?.Name);
    if (!name) return;
    if (!sourceByName.has(name)) sourceByName.set(name, []);
    sourceByName.get(name).push(card);
  });

  const liveCards = ports.previewSelections.currentEditingSelectionCards.value.map((card, index) => {
    const matched = sourceByName.get(card.name)?.shift() || {};
    return {
      ...matched,
      CardID: matched?.CardID || `LIVE-${editingKey}-${index}`,
      EventID: editingKey,
      Name: card.name,
      Rarity: card.rarity,
      Attribute: ports.formatting.normalizeEventHistoryAttribute(card.attr) || '-',
      Skill: card.skillType || '-',
      Affiliation: card.selectedUnit || matched?.Affiliation || ''
    };
  });

  return [
    ...sourceCards.filter((card) => ports.formatting.normalizeEventId(card?.EventID) !== editingKey),
    ...liveCards
  ];
});

const previewFestivalContext = computed(() => {
  const fest = String(ports.previewSelections.selectedPreviewFestival.value || '').trim();
  if (!ports.previewSelections.PREVIEW_FESTIVAL_TYPES.includes(fest)) return null;
  return { festival: fest };
});

const activePreviewFestivalName = computed(() => previewFestivalContext.value?.festival || '');

const isEventWithinPreviewLimit = (event, maxId = previewMaxEventId.value) => {
  const eventKey = ports.formatting.normalizeEventId(event?.id);
  if (!eventKey) return true;

  const cutoffEvent = previewCutoffEvent.value;
  if (cutoffEvent) return ports.eventOrdering.compareEventOrderAsc(event, cutoffEvent) <= 0;

  if (ports.formatting.isNumericEventId(eventKey)) return Number(eventKey) <= Number(maxId);
  const cutoffDate = ports.sourceDates.getEventIdCutoffDate(maxId);
  const sourceDate = ports.formatting.parseDateSafe(event?.start_date);
  if (!cutoffDate || !sourceDate) return true;
  return sourceDate <= cutoffDate;
};

const isCardWithinPreviewLimit = (card, maxId) => {
  const eidRaw = String(card?.EventID || '').trim();
  if (!eidRaw) return true;
  const sourceEvent = previewEventBySourceKey.value.get(eidRaw);
  if (sourceEvent) return isEventWithinPreviewLimit(sourceEvent, maxId);
  if (ports.formatting.isNumericEventId(eidRaw)) return Number(eidRaw) <= Number(maxId);
  const cutoffDate = ports.formatting.parseDateSafe(previewCutoffEvent.value?.start_date) || ports.sourceDates.getEventIdCutoffDate(maxId);
  if (!cutoffDate) return true;
  const sourceDate = ports.sourceDates.getCardSourceDate(card);
  if (!sourceDate) return true;
  if (sourceDate.getTime() !== cutoffDate.getTime()) return sourceDate < cutoffDate;
  return true;
};

const getPreviewCardProgressOrderId = (card) => {
  const cardId = Number(String(card?.CardID || '').trim());
  if (Number.isFinite(cardId) && cardId > 0) return cardId;
  const eventId = Number(String(card?.EventID || '').trim());
  if (Number.isFinite(eventId) && eventId > 0) return eventId * 10000;
  return 0;
};


return {
  activePreviewFestivalName,
  previewMaxEventId,
  previewEffectiveCards,
  isCardWithinPreviewLimit,
  isEventWithinPreviewLimit,
  previewCutoffEvent,
  getPreviewCardProgressOrderId,
};
}
