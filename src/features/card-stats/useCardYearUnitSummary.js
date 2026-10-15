import { computed, reactive, ref } from 'vue';

const SUMMARY_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc'];

const buildYearUnitSummary = (characters, metadata, includeVs) => {
  const totals = Object.fromEntries(SUMMARY_UNITS.map(unit => [unit, { total: 0, lastOrder: 0 }]));
  (characters || []).forEach(character => {
    const isVs = metadata.isVirtualSinger(character.name);
    if (isVs && !includeVs) return;
    const characterUnit = metadata.getUnitByChar(character.name);
    character.cards.forEach(card => {
      const unit = isVs ? String(card?.Affiliation || '').trim().toLowerCase() : characterUnit;
      if (!totals[unit]) return;
      totals[unit].total += 1;
      totals[unit].lastOrder = Math.max(totals[unit].lastOrder, Number(card.dateOrder) || 0);
    });
  });
  return SUMMARY_UNITS.map(unit => ({
    unit, title: unit.toUpperCase(), total: totals[unit].total,
    lastOrder: totals[unit].total ? totals[unit].lastOrder : Number.POSITIVE_INFINITY
  })).sort((a, b) => b.total - a.total
    || (a.lastOrder === b.lastOrder ? 0 : a.lastOrder - b.lastOrder)
    || SUMMARY_UNITS.indexOf(a.unit) - SUMMARY_UNITS.indexOf(b.unit));
};

/** Owns year-specific unit totals and the shared/mixed VS controls. */
export function useCardYearUnitSummary(inputs) {
  const includeVsByDefault = ref(false);
  const yearVsUnitSummaryToggles = reactive({});
  const isEnabled = panel => yearVsUnitSummaryToggles[panel.anchorId] ?? includeVsByDefault.value;
  const includeVsInYearUnitSummary = computed({
    get: () => inputs.yearPanels.value.length > 0 && inputs.yearPanels.value.every(isEnabled),
    set: checked => {
      includeVsByDefault.value = !!checked;
      Object.keys(yearVsUnitSummaryToggles).forEach(key => delete yearVsUnitSummaryToggles[key]);
    }
  });
  const includeVsInYearUnitSummaryIndeterminate = computed(() => {
    const states = inputs.yearPanels.value.map(isEnabled);
    return states.some(Boolean) && states.some(value => !value);
  });
  const onYearVsUnitSummaryChange = (anchorId, checked) => {
    yearVsUnitSummaryToggles[String(anchorId)] = !!checked;
  };
  const onIncludeVsInYearUnitSummaryChange = event => {
    const checked = includeVsInYearUnitSummaryIndeterminate.value ? false : !!event?.target?.checked;
    const update = () => {
      includeVsInYearUnitSummary.value = checked;
      if (event?.target) {
        event.target.checked = checked;
        event.target.indeterminate = false;
      }
    };
    if (inputs.navigation?.withInteractionPinnedPosition) {
      void inputs.navigation.withInteractionPinnedPosition(update, event?.target || null);
    } else update();
  };
  const yearPanels = computed(() => inputs.yearPanels.value.map(panel => ({
    ...panel,
    includeVsInUnitSummary: isEnabled(panel),
    unitSummary: buildYearUnitSummary(panel.characters, inputs.metadata, isEnabled(panel))
  })));

  return {
    yearPanels, includeVsInYearUnitSummary, includeVsInYearUnitSummaryIndeterminate,
    onIncludeVsInYearUnitSummaryChange, onYearVsUnitSummaryChange
  };
}
