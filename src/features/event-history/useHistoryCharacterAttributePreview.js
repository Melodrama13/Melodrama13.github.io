import { computed } from 'vue';
import { buildCharacterAttributeSummary } from '../card-stats/cardAttributeSummary.js';
import { normalizeCardStatisticsAttribute } from '../card-stats/cardStatisticsRules.js';

/** Character Attribute Preview owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: PreviewSelections, PreviewCutoff, Formatting, Presentation.
 */
export function useHistoryCharacterAttributePreview(ports) {
const previewCharAttrRows = computed(() => {
  if (!ports.previewSelections.selectedPreviewPanelIds.value.includes('char-attr')) return [];
  const names = ports.previewSelections.selectedPreviewCharAttrChars.value;
  if (!names.length) return [];
  return buildCharacterAttributeSummary({
    cards: ports.previewCutoff.previewEffectiveCards.value,
    names,
    attrs: ports.previewSelections.PREVIEW_ATTRS,
    isCardWithinLimit: (card) => ports.previewCutoff.isCardWithinPreviewLimit(card, ports.previewCutoff.previewMaxEventId.value),
    normalizeAttribute: normalizeCardStatisticsAttribute,
    isVirtualSinger: ports.presentation.isVirtualSinger,
    includeUnitScoreInPureScore: ports.previewSelections.previewIncludeUnitScoreInPureScore.value,
  }).map(({ name, rows, totalRow }) => ({
    name,
    mainScoreLabel: ports.presentation.isVirtualSinger(name) ? '团' : '分',
    rows,
    totalRow,
  })).sort((a, b) => ports.previewSelections.getPreviewCharOrder(a.name) - ports.previewSelections.getPreviewCharOrder(b.name));
});

const getPreviewCharAttrCardStyle = (name) => {
  const color = ports.presentation.getCharColor(name);
  return {
    backgroundColor: ports.formatting.hexToRgba(color, 0.14),
    borderColor: ports.formatting.hexToRgba(color, 0.34)
  };
};

const getPreviewCharAttrRowStyle = (attr) => {
  const color = ports.previewSelections.PREVIEW_DAILY_ATTR_COLOR[String(attr || '')] || '#94a3b8';
  return {
    '--preview-char-attr-row-bg': ports.formatting.hexToRgba(color, 0.16)
  };
};


return {
  previewCharAttrRows,
  getPreviewCharAttrCardStyle,
  getPreviewCharAttrRowStyle,
};
}
