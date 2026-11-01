import { computed } from 'vue';
import { buildCharacterLineupRows } from '../card-stats/cardLineup.js';
import { createCardLineupRules } from '../card-stats/cardLineupRules.js';
import { normalizeCardStatisticsAttribute } from '../card-stats/cardStatisticsRules.js';

/** Daily Lineup owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, PreviewSelections, PreviewCutoff, PredictionEditor, Presentation, Formatting.
 */
export function useHistoryDailyLineup(ports) {
const previewDailyLineupRows = computed(() => {
  if (!ports.previewSelections.selectedPreviewPanelIds.value.includes('daily-lineup')) return [];
  const names = ports.previewSelections.selectedPreviewDailyLineupChars.value;
  if (!names.length) return [];
  const lineupRules = createCardLineupRules({
    metadata: {
      isVirtualSinger: ports.presentation.isVirtualSinger,
      UNIT_COLORS: ports.presentation.UNIT_COLORS.value,
      CHAR_UNIT_MAP: ports.previewSelections.PREVIEW_DAILY_CHAR_UNIT_MAP.value,
    },
    presentation: { parseDateSafe: ports.formatting.parseDateSafe },
    eventCatalog: { isNumericEventId: ports.formatting.isNumericEventId },
  });
  const rows = buildCharacterLineupRows({
    cards: ports.previewCutoff.previewEffectiveCards.value,
    names,
    attrs: ports.previewSelections.PREVIEW_ATTRS,
    isCardWithinLimit: (card) => ports.previewCutoff.isCardWithinPreviewLimit(card, ports.previewCutoff.previewMaxEventId.value),
    getCardBaseName: ports.previewSelections.normalizeCharName,
    isKnownName: (name) => ports.previewSelections.getPreviewCharOrder(name) < 999,
    normalizeAttribute: normalizeCardStatisticsAttribute,
    lineupRules,
    // Match the full page's source reference: its recency rule uses start_date
    // when present, otherwise the numeric source key (not the card's date).
    buildEventRef: (card) => {
      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      return { eventRef: sourceKey ? { sourceKey, date: String(card?.Date || '').trim() } : null };
    },
    isFesSkillType: (kind) => kind === 'bfes_up' || kind === 'cfes',
    getFesKindBySkillKind: (kind) => kind === 'bfes_up' ? 'bfes' : kind === 'cfes' ? 'cfes' : '',
  });
  return rows.filter((row) => row.bestPlan.members.length > 0)
    .map((row) => ({
      name: row.name,
      plans: [row.bestPlan, ...row.otherPlans].map((plan) => ({
        attr: plan.attr,
        total: plan.total,
        memberScores: plan.memberSlots.map((member) => member?.score || 0),
        memberFesKinds: plan.memberSlots.map((member) => member?.fesKind || ''),
      })),
    })).sort((a, b) => ports.previewSelections.getPreviewCharOrder(a.name) - ports.previewSelections.getPreviewCharOrder(b.name));
});

const getPreviewDailyPlanStyle = (attr) => {
  const color = ports.previewSelections.PREVIEW_DAILY_ATTR_COLOR[String(attr || '')] || '#94a3b8';
  return {
    '--daily-row-bg': ports.formatting.hexToRgba(color, 0.12),
    '--lineup-row-border': ports.formatting.hexToRgba(color, 0.52)
  };
};

const getPreviewDailyCardStyle = (name) => {
  const color = ports.presentation.getCharColor(name);
  return {
    backgroundColor: ports.formatting.hexToRgba(color, 0.14),
    borderColor: ports.formatting.hexToRgba(color, 0.34)
  };
};

const getPreviewDailyScoreCellClass = (fesKind, score) => {
  const kind = String(fesKind || '').toLowerCase();
  const empty = Number(score || 0) <= 0;
  return {
    'is-empty': empty,
    'is-bfes': !empty && kind === 'bfes',
    'is-cfes': !empty && kind === 'cfes'
  };
};


return {
  previewDailyLineupRows,
  getPreviewDailyPlanStyle,
  getPreviewDailyCardStyle,
  getPreviewDailyScoreCellClass,
};
}
