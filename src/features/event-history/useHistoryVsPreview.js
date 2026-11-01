import { computed } from 'vue';
import { getWorldLinkStatTypes } from '../../domain/worldLink.js';
import { calculateCardVsStatistics } from '../card-stats/cardVsStatistics.js';
import { normalizeCardStatisticsAttribute, CARD_STATISTICS_ATTRIBUTES, CARD_STATISTICS_VS_NAMES } from '../card-stats/cardStatisticsRules.js';
import { formatCardStatisticsDate } from '../card-stats/cardStatisticsScope.js';

/** Vs Preview owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, PreviewSelections, PreviewCutoff, Formatting, SourceDates.
 */
export function useHistoryVsPreview(ports) {
const PREVIEW_VS_NAMES = CARD_STATISTICS_VS_NAMES;

const PREVIEW_VS_ORIGINAL_STAT_TYPES = computed(() => ['大罪', 'CFES', 'BFES',
  ...getWorldLinkStatTypes(ports.previewCutoff?.previewEffectiveCards?.value || [], ports.props?.allEvents || []).map(row => row.label), '其他']);

const parseDateSafe = value => ports.formatting.parseDateSafe(value);

const sharedVsStatistics = computed(() => {
  const maxEventId = Number(ports.previewCutoff.previewMaxEventId.value);
  const eventsById = Object.fromEntries((ports.props.allEvents || [])
    .filter(event => ports.formatting.isNumericEventId(event?.id)
      && !ports.previewCutoff.shouldSkipPreviewPredictEvent?.(event))
    .map(event => [Number(event.id), event]));
  const referenceDate = ports.previewCutoff.previewReferenceDateStr?.value
    || formatCardStatisticsDate(ports.previewCutoff.previewReferenceDate?.value
      || parseDateSafe(ports.previewCutoff.previewCutoffEvent.value?.start_date) || new Date());
  return calculateCardVsStatistics({
    cards: Number.isFinite(maxEventId) && maxEventId > 0 ? ports.previewCutoff.previewEffectiveCards.value : [],
    maxEventId, eventsById,
    sourceEventsById: Object.fromEntries((ports.props.allEvents || []).map(event => [String(event.id), event])),
    cutoffDate: ports.previewCutoff.previewCutoffEvent.value?.start_date,
    vsNames: PREVIEW_VS_NAMES,
    unitOrder: ports.previewSelections.PREVIEW_BOX_UNITS,
    statTypes: PREVIEW_VS_ORIGINAL_STAT_TYPES.value,
    attributes: CARD_STATISTICS_ATTRIBUTES,
    isCardWithinLimit: ports.previewCutoff.isCardWithinPreviewLimit,
    isNumericEventId: ports.formatting.isNumericEventId,
    parseDateSafe,
    normalizeAttribute: normalizeCardStatisticsAttribute,
    getCardProgressOrderId: ports.previewCutoff.getPreviewCardProgressOrderId,
    referenceDate,

  });
});

// Floating tables retain their existing orientations and missing-record marker.
const previewVsLastFourCompactRows = computed(() => PREVIEW_VS_NAMES.map(name => ({
  name,
  daysByUnit: Object.fromEntries(ports.previewSelections.PREVIEW_BOX_UNITS.map(unit => {
    const record = sharedVsStatistics.value.lastFourRecords.find(row => row.key === `${name} ${unit}`);
    return [unit, record?.dateValue ? record.days : '-'];
  })),
})));

const previewVsLastFourUnitRows = computed(() => ports.previewSelections.PREVIEW_BOX_UNITS.map(unit => ({
  unit,
  daysByVs: Object.fromEntries(previewVsLastFourCompactRows.value.map(row => [row.name, row.daysByUnit[unit]])),
})));

const previewVsUnitFourCountCompactRows = computed(() => PREVIEW_VS_NAMES.map(name => ({
  name,
  countByUnit: Object.fromEntries(ports.previewSelections.PREVIEW_BOX_UNITS.map(unit => [unit,
    sharedVsStatistics.value.fourCountRecords.find(row => row.key === `${name} ${unit}`)?.count || 0])),
})));

const previewVsUnitFourCountUnitRows = computed(() => ports.previewSelections.PREVIEW_BOX_UNITS.map(unit => ({
  unit,
  countByVs: Object.fromEntries(previewVsUnitFourCountCompactRows.value.map(row => [row.name, row.countByUnit[unit]])),
})));

const previewVsUnitScoreUnitRows = computed(() => sharedVsStatistics.value.scoreRows
  .map(({ unit, attrsByVs }) => ({ unit, attrsByVs })));

const previewVsOriginalRows = computed(() => sharedVsStatistics.value.originalRows.map(({ type, attrsByVs }) => ({
  type: type === 'CFES' ? 'CF' : type === 'BFES' ? 'BF' : type,
  attrsByVs,
})));

const previewVsLastFourMaxDays = computed(() => {
  let max = 0;
  previewVsLastFourCompactRows.value.forEach((row) => {
    ports.previewSelections.PREVIEW_BOX_UNITS.forEach((unit) => {
      const v = Number(row?.daysByUnit?.[unit]);
      if (Number.isFinite(v) && v > max) max = v;
    });
  });
  return Math.max(1, max);
});

const previewVsUnitFourCountMax = computed(() => {
  let max = 0;
  previewVsUnitFourCountCompactRows.value.forEach((row) => {
    ports.previewSelections.PREVIEW_BOX_UNITS.forEach((unit) => {
      const v = Number(row?.countByUnit?.[unit] || 0);
      if (Number.isFinite(v) && v > max) max = v;
    });
  });
  return Math.max(1, max);
});

const previewVsUnitFourCountMin = computed(() => {
  let min = Infinity;
  previewVsUnitFourCountCompactRows.value.forEach((row) => {
    ports.previewSelections.PREVIEW_BOX_UNITS.forEach((unit) => {
      const v = Number(row?.countByUnit?.[unit] || 0);
      if (Number.isFinite(v) && v > 0 && v < min) min = v;
    });
  });
  return Number.isFinite(min) ? min : 0;
});

const getPreviewVsMiniDataCellStyle = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: '#64748b'
    };
  }
  const ratio = Math.min(1, Math.max(0, n / previewVsLastFourMaxDays.value));
  const shade = Math.round(240 - (ratio * 110));
  const text = shade <= 165 ? '#f8fafc' : '#0f172a';
  return {
    backgroundColor: `rgb(${shade}, ${shade}, ${shade})`,
    color: text,
    fontWeight: 600
  };
};

const getPreviewVsFourCountCellStyle = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: '#64748b'
    };
  }
  if (n === previewVsUnitFourCountMax.value && previewVsUnitFourCountMax.value > 0) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: '#dc2626',
      fontWeight: 700
    };
  }
  if (n === previewVsUnitFourCountMin.value && previewVsUnitFourCountMin.value > 0 && previewVsUnitFourCountMin.value !== previewVsUnitFourCountMax.value) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: '#2563eb',
      fontWeight: 700
    };
  }
  return {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    color: '#0f172a',
    fontWeight: 600
  };
};


return {
  PREVIEW_VS_NAMES,
  previewVsLastFourUnitRows,
  previewVsUnitFourCountUnitRows,
  previewVsUnitScoreUnitRows,
  previewVsOriginalRows,
  getPreviewVsMiniDataCellStyle,
  getPreviewVsFourCountCellStyle,
};
}
