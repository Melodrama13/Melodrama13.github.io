import { computed } from 'vue';

/** Event Ordering owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Formatting, SourceDates, PreviewSelections, PredictionEditor.
 */
export function useHistoryEventOrdering(ports) {
const isCollabPoolEvent = (event) => {
  const id = ports.formatting.normalizeEventId(event?.id).toLowerCase();
  const eventType = String(event?.event_type || '').trim();
  const gachaType = String(event?.gacha_type || '').trim();
  return /^c\d+$/.test(id) || eventType.includes('联动') || gachaType.includes('联动') || eventType === '纪念';
};

const getEventTime = (event) => {
  return ports.sourceDates.getDateValue(event?.start_date);
};

const eventSameDateOrder = (event) => {
  const id = ports.formatting.normalizeEventId(event?.id);
  if (!ports.formatting.isNumericEventId(id)) return 0;
  return 1;
};

const compareEventOrderAsc = (a, b) => {
  const ta = getEventTime(a);
  const tb = getEventTime(b);
  if (ta !== tb) return ta - tb;

  const pa = eventSameDateOrder(a);
  const pb = eventSameDateOrder(b);
  if (pa !== pb) return pa - pb;

  const aNum = ports.formatting.isNumericEventId(a?.id);
  const bNum = ports.formatting.isNumericEventId(b?.id);
  if (aNum && bNum) return Number(a.id) - Number(b.id);
  return ports.formatting.normalizeEventId(a?.id).localeCompare(ports.formatting.normalizeEventId(b?.id));
};

const normalizeUnitKey = (unit) => String(unit || '').trim().toLowerCase();

const isBoxEvent = (event) => {
  if (String(event?.event_type || '').trim() !== '箱活') return false;
  return ports.previewSelections.PREVIEW_BOX_UNITS.includes(normalizeUnitKey(event?.unit));
};

const boxTurnByEventId = computed(() => {
  const map = {};
  let usedUnits = new Set();
  let roundNo = 1;

  [...(ports.props.allEvents || [])]
    .filter((event) => ports.formatting.isNumericEventId(event?.id))
    .sort(compareEventOrderAsc)
    .forEach((event) => {
      if (!isBoxEvent(event)) return;
      const unit = normalizeUnitKey(event?.unit);
      if (!unit) return;

      if (usedUnits.size >= ports.previewSelections.PREVIEW_BOX_UNITS.length || usedUnits.has(unit)) {
        usedUnits = new Set();
        roundNo += 1;
      }

      usedUnits.add(unit);
      map[ports.formatting.normalizeEventId(event.id)] = {
        roundNo,
        turnInRound: usedUnits.size
      };
    });

  return map;
});

const getBoxTurnInRound = (event) => {
  const idKey = ports.formatting.normalizeEventId(event?.id);
  const turn = boxTurnByEventId.value?.[idKey]?.turnInRound;
  return Number.isFinite(turn) && turn >= 1 ? turn : null;
};

const getBoxLockedUnitsBeforeEvent = (targetEvent) => {
  const targetId = Number(targetEvent?.id);
  if (!Number.isFinite(targetId) || targetId <= 0) return [];

  let usedUnits = new Set();
  [...(ports.props.allEvents || [])]
    .filter((event) => ports.formatting.isNumericEventId(event?.id))
    .sort(compareEventOrderAsc)
    .forEach((event) => {
      const eventId = Number(event?.id);
      if (!Number.isFinite(eventId) || eventId >= targetId) return;
      if (!isBoxEvent(event)) return;
      const unit = normalizeUnitKey(event?.unit);
      if (!unit) return;

      if (usedUnits.size >= ports.previewSelections.PREVIEW_BOX_UNITS.length || usedUnits.has(unit)) {
        usedUnits = new Set();
      }
      usedUnits.add(unit);
    });

  // One full round completed (5 unique units) means the next box event starts a new round.
  if (usedUnits.size >= ports.previewSelections.PREVIEW_BOX_UNITS.length) {
    usedUnits = new Set();
  }

  return [...usedUnits];
};

const currentEditingBoxLockedUnits = computed(() => {
  return getBoxLockedUnitsBeforeEvent(ports.predictionEditor.currentEditingEvent.value);
});


return {
  getBoxTurnInRound,
  currentEditingBoxLockedUnits,
  compareEventOrderAsc,
  isCollabPoolEvent,
  eventSameDateOrder,
};
}
