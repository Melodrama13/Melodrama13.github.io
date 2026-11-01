import { computed } from 'vue';
import { calculateCardFestivalStatistics } from '../card-stats/cardFestivalStatistics.js';
import { CARD_STATISTICS_DEFAULTS, normalizeCardStatisticsAttribute } from '../card-stats/cardStatisticsRules.js';

/** Festival Preview owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Presentation, PreviewSelections, PreviewCutoff, Formatting.
 */
export function useHistoryFestivalPreview(ports) {
const canTogglePreviewFestivalFes = festival => ['半周年', '周年'].includes(String(festival || '').trim());

const previewFestivalRowsMap = computed(() => {
  const maxEventId = Number(ports.previewCutoff.previewMaxEventId.value);
  if (!Number.isFinite(maxEventId) || maxEventId <= 0) return {};
  const festivals = ports.previewSelections.PREVIEW_FESTIVAL_TYPES;
  const characterOrder = Object.fromEntries(Object.keys(ports.previewSelections.CHAR_MAP.value)
    .map(name => [name, ports.previewSelections.getPreviewCharOrder(name)]));
  const result = calculateCardFestivalStatistics({
    cards: ports.previewCutoff.previewEffectiveCards.value.filter(card => ports.previewCutoff.isCardWithinPreviewLimit(card, maxEventId)),
    events: ports.props.allEvents,
    maxEventId, characterOrder,
    isVirtualSinger: ports.presentation.isVirtualSinger,
    unitOrder: ports.previewSelections.PREVIEW_FESTIVAL_VS_UNIT_ORDER,
    festivals,
    shouldSkipPredictEvent: ports.previewCutoff.shouldSkipPreviewPredictEvent,
    isNumericEventId: ports.formatting.isNumericEventId,
    parseDateSafe: ports.formatting.parseDateSafe,
    normalizeAttribute: normalizeCardStatisticsAttribute,
    isFesCardType: ports.previewSelections.isFesCardType,
    getCardProgressOrderId: ports.previewCutoff.getPreviewCardProgressOrderId,
    mergeHigherRanks: Object.fromEntries(festivals.map(festival => [festival,
      ports.previewSelections.previewFestivalMergeHigherRanks.value ?? CARD_STATISTICS_DEFAULTS.festivalMergeHigherRanks])),
    includeFes: festival => canTogglePreviewFestivalFes(festival)
      && (ports.previewSelections.previewFestivalFesToggles.value[festival] ?? CARD_STATISTICS_DEFAULTS.includeFestivalFes),
  });
  return Object.fromEntries(result.map(row => [row.festival, row.rows]));
});

const currentPreviewFestivalRows = computed(() => {
  const festival = ports.previewCutoff.activePreviewFestivalName.value;
  return festival ? previewFestivalRowsMap.value[festival] || [] : [];
});

const previewFestivalIncludeFes = computed(() => {
  const fest = ports.previewCutoff.activePreviewFestivalName.value;
  return !!ports.previewSelections.previewFestivalFesToggles.value[String(fest || '').trim()];
});

const previewFestivalShowFes = computed(() => canTogglePreviewFestivalFes(ports.previewCutoff.activePreviewFestivalName.value));


return {
  currentPreviewFestivalRows,
  previewFestivalIncludeFes,
  previewFestivalShowFes,
};
}
