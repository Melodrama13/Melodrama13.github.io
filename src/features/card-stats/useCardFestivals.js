import { ref, computed, reactive } from 'vue';
import { calculateCardFestivalStatistics, createFestivalCharacterRules } from './cardFestivalStatistics.js';
import { CARD_STATISTICS_DEFAULTS } from './cardStatisticsRules.js';

/** Owns card festivals behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardFestivals(inputs) {
  const hideFestivalCharNames = ref(true);

  const festivalShowCardImages = ref(false);

  const festivalMergeToggles = reactive({
    新年: CARD_STATISTICS_DEFAULTS.festivalMergeHigherRanks,
    婚活: CARD_STATISTICS_DEFAULTS.festivalMergeHigherRanks,
    情人节: CARD_STATISTICS_DEFAULTS.festivalMergeHigherRanks,
    白情: CARD_STATISTICS_DEFAULTS.festivalMergeHigherRanks,
    半周年: CARD_STATISTICS_DEFAULTS.festivalMergeHigherRanks,
    周年: CARD_STATISTICS_DEFAULTS.festivalMergeHigherRanks
  });

  const festivalMergeHigherRanks = computed({
    get: () => Object.keys(festivalMergeToggles).every((fest) => !!festivalMergeToggles[fest]),
    set: (value) => {
      const checked = !!value;
      Object.keys(festivalMergeToggles).forEach((fest) => {
        festivalMergeToggles[fest] = checked;
      });
    }
  });

  const festivalMergeHigherRanksIndeterminate = computed(() => {
    const values = Object.keys(festivalMergeToggles).map((fest) => !!festivalMergeToggles[fest]);
    return values.some(Boolean) && values.some((value) => !value);
  });

  const festivalFesToggles = reactive({
    半周年: CARD_STATISTICS_DEFAULTS.includeFestivalFes,
    周年: CARD_STATISTICS_DEFAULTS.includeFestivalFes
  });

  const festivalFesEnabled = computed({
    get: () => !!festivalFesToggles['半周年'] && !!festivalFesToggles['周年'],
    set: (value) => {
      const checked = !!value;
      festivalFesToggles['半周年'] = checked;
      festivalFesToggles['周年'] = checked;
    }
  });

  const festivalFesEnabledIndeterminate = computed(() => {
    const values = ['半周年', '周年'].map((fest) => !!festivalFesToggles[fest]);
    return values.some(Boolean) && values.some((value) => !value);
  });

  const STEP_FESTIVAL_AVATAR_BORDER_MODE = 'unit';

  const STEP_FESTIVAL_AVATAR_BORDER_WIDTH = 2;

  const getStepFestivalAvatarBorderColor = (name) => {
    if (STEP_FESTIVAL_AVATAR_BORDER_MODE === 'char') {
      return inputs.metadata.getCharColor(name);
    }
    return inputs.metadata.UNIT_COLORS[inputs.metadata.getUnitByChar(name)] || '#d1d5db';
  };

  const getStepFestivalAvatarStyle = (name) => ({
    borderColor: getStepFestivalAvatarBorderColor(name),
    borderWidth: `${STEP_FESTIVAL_AVATAR_BORDER_WIDTH}px`
  });

  const { parseFestivalCharKey } = createFestivalCharacterRules({
    characterOrder: inputs.metadata.CHAR_ORDER,
    isVirtualSinger: inputs.metadata.isVirtualSinger,
    unitOrder: inputs.constants.FESTIVAL_VS_UNIT_ORDER,
  });

  const getFestivalUnitLogoByName = (charName) => {
    const parsed = parseFestivalCharKey(charName);
    if (!parsed.isVs) return '';
    if (!parsed.unit || parsed.unit === 'vs') return '';
    return inputs.metadata.unitLogoMap[parsed.unit] || '';
  };

  const getFestivalDisplayNameLabel = (charName) => {
    const parsed = parseFestivalCharKey(charName);
    if (inputs.presentation.useSingleNameMark.value) {
      return inputs.presentation.getCharSingleMark(parsed.baseName || charName);
    }
    if (parsed?.isVs) {
      return inputs.metadata.CHAR_MAP[parsed.baseName] || inputs.metadata.getCharAbbr(parsed.baseName);
    }
    return inputs.metadata.getCharAbbr(charName);
  };

  const canToggleFestivalFes = (festival) => ['半周年', '周年'].includes(String(festival || '').trim());

  const shouldCountFestivalFes = (festival) => {
    if (!canToggleFestivalFes(festival)) return false;
    return festivalFesEnabled.value;
  };

  const onFestivalMergeHigherRanksChange = (event) => {
    const checked = !!event?.target?.checked;
    const shouldResetDefault = festivalMergeHigherRanksIndeterminate.value;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      festivalMergeHigherRanks.value = shouldResetDefault ? false : checked;
      if (shouldResetDefault && event?.target) {
        event.target.checked = false;
        event.target.indeterminate = false;
      }
    }, anchorEl);
  };

  const onFestivalFesEnabledChange = (event) => {
    const checked = !!event?.target?.checked;
    const shouldResetDefault = festivalFesEnabledIndeterminate.value;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      festivalFesEnabled.value = shouldResetDefault ? false : checked;
      if (shouldResetDefault && event?.target) {
        event.target.checked = false;
        event.target.indeterminate = false;
      }
    }, anchorEl);
  };

  const getFestivalTierCount = (tierKey) => {
    if (tierKey === 'four') return 4;
    if (tierKey === 'three') return 3;
    if (tierKey === 'two') return 2;
    return 0;
  };

  const getFestivalTierIcon = (tierKey) => (tierKey === 'four' ? '/elements/rarity_rstar.png' : '/elements/rarity_ystar.png');

  const festivalCharStats = computed(() => calculateCardFestivalStatistics({
    cards: inputs.props.allCards, events: inputs.props.allEvents,
    maxEventId: inputs.eventCatalog.safeMaxEventId.value,
    characterOrder: inputs.metadata.CHAR_ORDER,
    isVirtualSinger: inputs.metadata.isVirtualSinger,
    unitOrder: inputs.constants.FESTIVAL_VS_UNIT_ORDER,
    festivals: inputs.constants.SPECIAL_FESTIVALS,
    anchorIds: inputs.constants.FESTIVAL_ANCHOR_IDS,
    eventsById: inputs.eventCatalog.eventsById.value,
    shouldSkipPredictEvent: inputs.eventCatalog.shouldSkipPredictEvent,
    isNumericEventId: inputs.eventCatalog.isNumericEventId,
    parseDateSafe: inputs.presentation.parseDateSafe,
    normalizeAttribute: inputs.eventCatalog.normalizeCardStatsAttribute,
    isFesCardType: inputs.presentation.isFesCardType,
    getCardProgressOrderId: inputs.distribution.getCardProgressOrderId,
    getUnitByChar: inputs.metadata.getUnitByChar,
    unitLogoMap: inputs.metadata.unitLogoMap,
    getFestivalDisplayNameLabel,
    buildCardImageSrc: inputs.media.buildCardImageSrc,
    mergeHigherRanks: festivalMergeToggles,
    includeFes: shouldCountFestivalFes,
  }));

  return {
    festivalCharStats,
    getStepFestivalAvatarStyle,
    festivalShowCardImages,
    hideFestivalCharNames,
    festivalMergeHigherRanks,
    festivalMergeHigherRanksIndeterminate,
    onFestivalMergeHigherRanksChange,
    festivalMergeToggles,
    canToggleFestivalFes,
    festivalFesEnabled,
    festivalFesEnabledIndeterminate,
    onFestivalFesEnabledChange,
    getFestivalTierCount,
    getFestivalTierIcon,
    getFestivalUnitLogoByName,
    getFestivalDisplayNameLabel,
  };
}
