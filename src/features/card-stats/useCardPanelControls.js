import { computed } from 'vue';

/** Owns card panel controls behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardPanelControls(inputs) {
  const hasMixedBooleanValues = (values) => values.some(Boolean) && values.some((value) => !value);

  const getSpecialPanelShowCardImageValues = () => [
    !!inputs.vsRecords.vsUnitLastFourShowCardImages.value,
    !!inputs.vsRecords.vsUnitFourCountShowCardImages.value,
    !!inputs.vsRecords.vsUnitScoreShowCardImages.value,
    !!inputs.vsRecords.vsOriginalStatShowCardImages.value,
    !!inputs.fesRecords.fesRecordShowCardImages.value,
    !!inputs.specialLimited.specialLimitedShowCardImages.value
  ];

  const specialPanelShowCardImagesAll = computed({
    get: () => getSpecialPanelShowCardImageValues().every(Boolean),
    set: (value) => {
      const checked = !!value;
      inputs.vsRecords.vsUnitLastFourShowCardImages.value = checked;
      inputs.vsRecords.vsUnitFourCountShowCardImages.value = checked;
      inputs.vsRecords.vsUnitScoreShowCardImages.value = checked;
      inputs.vsRecords.vsOriginalStatShowCardImages.value = checked;
      inputs.fesRecords.fesRecordShowCardImages.value = checked;
      inputs.specialLimited.specialLimitedShowCardImages.value = checked;
    }
  });

  const specialPanelShowCardImagesIndeterminate = computed(() => (
    hasMixedBooleanValues(getSpecialPanelShowCardImageValues())
  ));

  const onSpecialPanelShowAllCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const shouldResetDefault = specialPanelShowCardImagesIndeterminate.value;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      specialPanelShowCardImagesAll.value = shouldResetDefault ? false : checked;
      if (shouldResetDefault && event?.target) {
        event.target.checked = false;
        event.target.indeterminate = false;
      }
    }, anchorEl);
  };

  return {
    hasMixedBooleanValues,
    specialPanelShowCardImagesAll,
    specialPanelShowCardImagesIndeterminate,
    onSpecialPanelShowAllCardImagesChange,
  };
}
