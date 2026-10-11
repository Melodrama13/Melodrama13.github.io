import { isCompilationEvent } from '../../utils/compilationEvents.js';
import { getEventPredictionStatus, findCurrentStartedEvent, canEditEventPrediction } from '../../features/prediction/eventPredictionEligibility.js';
import { computed } from 'vue';
import { isEventStarted } from '../../utils/spoilerGuard.js';

/** Prediction Eligibility owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Clock, Formatting, SourceDates.
 */
export function useHistoryPredictionEligibility(ports) {
const hasNonEmptyText = (value) => String(value || '').trim().length > 0;

const getSourceEventTitle = (event) => {
  if (Object.prototype.hasOwnProperty.call(event || {}, 'source_event_title')) {
    return String(event?.source_event_title || '').trim();
  }
  return event?.isPredict === true ? '' : String(event?.event_title || '').trim();
};

const getSourceEventType = (event) => (
  Object.prototype.hasOwnProperty.call(event || {}, 'source_event_type')
    ? String(event?.source_event_type || '').trim()
    : String(event?.event_type || '').trim()
);

const isEventTestByJson = (event) => {
  const type = getSourceEventType(event).toLowerCase();
  return type === '测试' || type === 'test' || type.includes('测试');
};

const isEventWorldLinkFinalByJson = (event) => {
  const type = getSourceEventType(event).toLowerCase().replace(/\s+/g, '');
  return type.includes('终章') && (type.includes('wl') || type.includes('worldlink'));
};

const isEventPredictDisabledByJson = (event) => (
  isEventTestByJson(event) || isEventWorldLinkFinalByJson(event) || isCompilationEvent(event)
);

const isEventOfficialRevealedByJson = (event) => hasNonEmptyText(getSourceEventTitle(event));

const getPredictStatus = (event) => getEventPredictionStatus(event, {
  isPredictDisabled: isEventPredictDisabledByJson,
  isOfficialRevealed: isEventOfficialRevealedByJson
});

const currentStartedEvent = computed(() => findCurrentStartedEvent(ports.props.allEvents, ports.clock.spoilerNow.value, {
  isNumericEventId: ports.formatting.isNumericEventId,
  isEventStarted,
  getDateValue: ports.sourceDates.getDateValue
}));

const getCurrentEvent = () => currentStartedEvent.value;

const getCurrentEventId = () => getCurrentEvent()?.id ?? -1;

const canOpenPredictEditor = (event) => canEditEventPrediction(event, getCurrentEventId(), {
  isNumericEventId: ports.formatting.isNumericEventId,
  isPredictDisabled: isEventPredictDisabledByJson,
  isOfficialRevealed: isEventOfficialRevealedByJson
});


return {
  getPredictStatus,
  canOpenPredictEditor,
  getCurrentEvent,
  getCurrentEventId,
};
}
