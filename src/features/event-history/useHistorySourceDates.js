import { computed } from 'vue';

/** Source Dates owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Formatting.
 */
export function useHistorySourceDates(ports) {
const getDateValue = (dateStr) => ports.formatting.parseDateSafe(dateStr)?.getTime() || 0;

const eventDateBySourceKey = computed(() => {
  const map = {};
  (ports.props.allEvents || []).forEach((event) => {
    const key = ports.formatting.normalizeEventId(event?.id);
    const date = ports.formatting.parseDateSafe(event?.start_date);
    if (!key || !date) return;
    map[key] = date;
  });
  return map;
});

const getCardSourceDate = (card) => {
  const cardDate = ports.formatting.parseDateSafe(card?.Date);
  if (cardDate) return cardDate;
  const eventKey = ports.formatting.normalizeEventId(card?.EventID);
  if (eventKey && eventDateBySourceKey.value[eventKey]) return eventDateBySourceKey.value[eventKey];
  const gachaKey = ports.formatting.normalizeEventId(card?.GachaID);
  if (gachaKey && eventDateBySourceKey.value[gachaKey]) return eventDateBySourceKey.value[gachaKey];
  return null;
};

const getEventIdCutoffDate = (eventId) => {
  const key = ports.formatting.normalizeEventId(eventId);
  return key ? (eventDateBySourceKey.value[key] || null) : null;
};


return {
  getDateValue,
  getEventIdCutoffDate,
  getCardSourceDate,
};
}
