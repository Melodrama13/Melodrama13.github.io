import { computed } from 'vue';
import { buildCharacterAttributeSummary } from './cardAttributeSummary.js';

/** Reactive page adapter; all counting rules live in the shared calculation. */
export function useCardAttributeSummary(inputs) {
  const attrSummaryCards = computed(() => buildCharacterAttributeSummary({
    cards: inputs.props.allCards || [],
    names: inputs.presentation.toDisplayOrderedCharNames(Object.keys(inputs.metadata.CHAR_ORDER)),
    attrs: inputs.constants.ATTRS,
    isCardWithinLimit: (card) => inputs.eventCatalog.isCardWithinLimit(card, inputs.eventCatalog.safeMaxEventId.value),
    normalizeAttribute: inputs.eventCatalog.normalizeCardStatsAttribute,
    includeUnitScoreInPureScore: inputs.distribution.includeUnitScoreInPureScore.value,
    isVirtualSinger: inputs.metadata.isVirtualSinger,
    getUnitByChar: inputs.metadata.getUnitByChar,
    getAnchorId: inputs.presentation.getAttrSummaryCardId,
  }));
  return { attrSummaryCards };
}
