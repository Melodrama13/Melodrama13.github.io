import { computed, ref } from 'vue';
import { CARD_YEAR_RARITY_OPTIONS, CARD_YEAR_DEFAULTS, buildCardYearEventIndex, prepareCardYearCards, buildCardYearPanels } from './cardYearStats.js';
import { useCardYearUnitSummary } from './useCardYearUnitSummary.js';
import { CARD_YEAR_TYPE_OPTIONS } from './cardYearCardTypes.js';

/** Owns year grouping controls, card counts, and chronological character columns. */
export function useCardYearStats(inputs) {
  const yearRarityOptions = CARD_YEAR_RARITY_OPTIONS;
  const yearRarities = ref([...CARD_YEAR_DEFAULTS.rarities]);
  const yearCardTypeOptions = CARD_YEAR_TYPE_OPTIONS;
  const yearCardTypes = ref([...CARD_YEAR_DEFAULTS.cardTypes]);
  const yearShowCardImages = ref(false);
  const yearShowCardDates = ref(false);
  const yearUseOperatingYear = ref(CARD_YEAR_DEFAULTS.useOperatingYear);
  const yearNewYearNextYear = ref(CARD_YEAR_DEFAULTS.newYearNextYear);
  const hideYearCharNames = ref(true);

  const orderedNames = computed(() => inputs.presentation.toDisplayOrderedCharNames(
    Object.keys(inputs.metadata.CHAR_ORDER)
  ));

  const yearEventIndex = computed(() => buildCardYearEventIndex(inputs.props.allEvents));

  const eligibleCards = computed(() => {
    const maxId = inputs.eventCatalog.safeMaxEventId.value;
    return prepareCardYearCards({
      cards: inputs.props.allCards || [], names: orderedNames.value, eventIndex: yearEventIndex.value,
      isCardWithinLimit: card => inputs.eventCatalog.isCardWithinLimit(card, maxId),
      useOperatingYear: yearUseOperatingYear.value, newYearNextYear: yearNewYearNextYear.value
    });
  });
  const yearPanels = computed(() => buildCardYearPanels({
    eligibleCards: eligibleCards.value, names: orderedNames.value, eventIndex: yearEventIndex.value,
    rarities: yearRarities.value, cardTypes: yearCardTypes.value,
    useOperatingYear: yearUseOperatingYear.value
  }));

  const unitSummary = useCardYearUnitSummary({
    yearPanels,
    get metadata() { return inputs.metadata; },
    get navigation() { return inputs.navigation; }
  });

  return {
    yearRarityOptions, yearRarities, yearCardTypeOptions, yearCardTypes,
    yearShowCardImages, yearShowCardDates,
    yearUseOperatingYear, yearNewYearNextYear, hideYearCharNames,
    ...unitSummary
  };
}
