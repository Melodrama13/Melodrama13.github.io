import { computed, ref } from 'vue';
import {
  CARD_YEAR_RARITY_OPTIONS, buildCardYearEventIndex, getCardYearSourceDate,
  getCardStatsYear, getCardYearPanelLabels
} from './cardYearStats.js';
import { useCardYearUnitSummary } from './useCardYearUnitSummary.js';
import { CARD_YEAR_TYPE_OPTIONS, getCardYearTypeInfo } from './cardYearCardTypes.js';

/** Owns year grouping controls, card counts, and chronological character columns. */
export function useCardYearStats(inputs) {
  const yearRarityOptions = CARD_YEAR_RARITY_OPTIONS;
  const yearRarities = ref(['4']);
  const yearCardTypeOptions = CARD_YEAR_TYPE_OPTIONS;
  const yearCardTypes = ref(['perm', 'limited']);
  const yearShowCardImages = ref(false);
  const yearShowCardDates = ref(false);
  const yearUseOperatingYear = ref(false);
  const yearNewYearNextYear = ref(true);
  const hideYearCharNames = ref(true);

  const orderedNames = computed(() => inputs.presentation.toDisplayOrderedCharNames(
    Object.keys(inputs.metadata.CHAR_ORDER)
  ));

  const yearEventIndex = computed(() => buildCardYearEventIndex(inputs.props.allEvents));

  const eligibleCards = computed(() => {
    const names = new Set(orderedNames.value);
    const rarities = new Set(CARD_YEAR_RARITY_OPTIONS.map(option => option.value));
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    return (inputs.props.allCards || []).flatMap(card => {
      const name = String(card?.Name || '').trim();
      const rarity = String(card?.Rarity || '').trim();
      if (!names.has(name) || !rarities.has(rarity)) return [];
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return [];
      const date = getCardYearSourceDate(card, yearEventIndex.value);
      if (!date) return [];
      return [{
        ...card,
        Name: name,
        Rarity: rarity,
        ...getCardYearTypeInfo(card),
        year: getCardStatsYear(card, date, yearEventIndex.value, {
          useOperatingYear: yearUseOperatingYear.value,
          newYearNextYear: yearNewYearNextYear.value
        }),
        dateOrder: date.getTime(),
        dateLabel: `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
      }];
    });
  });

  const yearPanels = computed(() => {
    const cards = eligibleCards.value;
    if (!cards.length) return [];
    const names = orderedNames.value;
    const selected = new Set(yearRarities.value);
    const selectedTypes = new Set(yearCardTypes.value);
    const years = cards.map(card => card.year);
    const firstYear = Math.min(...years);
    const lastYear = Math.max(...years);
    const panels = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => {
      const year = firstYear + index;
      return {
        year,
        ...getCardYearPanelLabels(year, yearUseOperatingYear.value, yearEventIndex.value.startYear),
        characters: names.map(name => ({ name, cards: [] }))
      };
    });
    const nameIndexes = new Map(names.map((name, index) => [name, index]));
    cards.forEach(card => {
      if (!selected.has(card.Rarity) || !selectedTypes.has(card.cardTypeGroup)) return;
      panels[card.year - firstYear].characters[nameIndexes.get(card.Name)].cards.push(card);
    });

    return panels.map(panel => {
      const groupsByCount = new Map();
      let total = 0;
      panel.characters.forEach(character => {
        character.cards.sort((a, b) => a.dateOrder - b.dateOrder || Number(a.CardID) - Number(b.CardID));
        const count = character.cards.length;
        total += count;
        if (!groupsByCount.has(count)) groupsByCount.set(count, []);
        groupsByCount.get(count).push(character);
      });
      const groups = [...groupsByCount.entries()]
        .sort(([a], [b]) => b - a)
        .map(([count, chars]) => ({
          count,
          chars: [...chars].sort((a, b) => {
            if (!count) return 0;
            const lastA = a.cards.at(-1);
            const lastB = b.cards.at(-1);
            return lastA.dateOrder - lastB.dateOrder || Number(lastA.CardID) - Number(lastB.CardID);
          })
        }));
      return { ...panel, total, groups };
    });
  });

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
