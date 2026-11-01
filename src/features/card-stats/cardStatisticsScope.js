/** Apply the same numeric event/date boundary to every card statistic. */
export function isCardWithinStatisticsLimit(card, maxEventId, { cutoffDate, getCardSourceDate }) {
  const eventId = String(card?.EventID || '').trim();
  if (/^\d+$/.test(eventId)) return Number(eventId) <= Number(maxEventId);
  if (!cutoffDate) return true;
  const sourceDate = getCardSourceDate(card);
  return !sourceDate || sourceDate <= cutoffDate;
}

export function shouldSkipStatisticsPredictEvent(event, maxEventId, currentEventId) {
  return !!event?.isPredict && !(Number(maxEventId) > Number(currentEventId));
}

export function getCardStatisticsReferenceDate({ maxEventId, currentEventId, cutoffEvent, parseDateSafe, now = new Date() }) {
  if (cutoffEvent?.id != null && !/^\d+$/.test(String(cutoffEvent.id))) {
    return parseDateSafe(cutoffEvent.start_date) || now;
  }
  if (!(Number(maxEventId) > 0) || Number(maxEventId) === Number(currentEventId)) return now;
  return parseDateSafe(cutoffEvent?.start_date) || now;
}

export function formatCardStatisticsDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}/${month}/${day}`;
}
