import { isCollaborationEvent } from '../../domain/collaborationEvents.js';

export function findCurrentStartedEvent(events, now, { isNumericEventId, isEventStarted, getDateValue }) {
  return (events || []).reduce((latest, event) => {
    if (!isNumericEventId(event?.id) || !isEventStarted(event, now)) return latest;
    if (!latest) return event;
    const time = getDateValue(event.start_date);
    const latestTime = getDateValue(latest.start_date);
    return time > latestTime || (time === latestTime && Number(event.id) > Number(latest.id)) ? event : latest;
  }, null);
}

export function getEventPredictionStatus(event, { isPredictDisabled, isOfficialRevealed }) {
  if (isPredictDisabled(event)) return 'past';
  if (isOfficialRevealed(event)) return 'past';
  // Base World Link rosters alone do not constitute a local prediction.
  if (event.isPredict === true) return 'predicted';
  return 'todo';
}

export function canEditEventPrediction(event, currentEventId, {
  isNumericEventId, isPredictDisabled, isOfficialRevealed
}) {
  if (!event) return false;
  if (isCollaborationEvent(event)) {
    const roster = event.source_memberCards || event.memberCards;
    return Array.isArray(roster) && roster.length > 0 && !isPredictDisabled(event) && !isOfficialRevealed(event);
  }
  if (!isNumericEventId(event?.id)) return false;
  const eventId = Number(event.id);
  const currentId = Number(currentEventId);
  if (Number.isFinite(eventId) && Number.isFinite(currentId) && eventId <= currentId) return false;
  if (isPredictDisabled(event)) return false;
  if (isOfficialRevealed(event)) return false;
  return true;
}
