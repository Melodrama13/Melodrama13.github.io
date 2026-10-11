import { computed } from 'vue';

/** Owns card preview behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardPreview(inputs) {
  const previewDailyLineupMap = computed(() => {
    const result = {};
    (inputs.lineup.characterLineupRows.value || []).forEach((row) => {
      const name = String(row?.name || '').trim();
      if (!name) return;
      // Keep exactly the same order as stats panel: bestPlan first, then otherPlans.
      const plans = [row?.bestPlan, ...(row?.otherPlans || [])]
        .filter(Boolean)
        .map((plan) => ({
          attr: String(plan?.attr || ''),
          total: Number(plan?.total || 0),
          memberScores: [...(plan?.memberSlots || [])]
            .slice(0, 5)
            .map((slot) => Number(slot?.score || 0)),
          memberFesKinds: [...(plan?.memberSlots || [])]
            .slice(0, 5)
            .map((slot) => String(slot?.fesKind || ''))
        }));
      result[name] = plans;
    });
    return result;
  });

  const statsPreviewPayload = computed(() => {
    const fourPanel = inputs.distribution.groupPanels.value.find((p) => p.id === 'four');
    const limitedPanel = inputs.distribution.groupPanels.value.find((p) => p.id === 'limited');
    const scoreUpPanel = inputs.distribution.groupPanels.value.find((p) => p.id === 'score-up');
    const limitedBanPanel = inputs.distribution.groupPanels.value.find((p) => p.id === 'limited-ban');
    const fesLimitedPanel = inputs.distribution.groupPanels.value.find((p) => p.id === 'fes-limited');
    const fesLimitedBanPanel = inputs.distribution.groupPanels.value.find((p) => p.id === 'fes-limited-ban');
    const festivalGroups = Object.fromEntries(
      (inputs.festivals.festivalCharStats.value || []).map((item) => [item.festival, item.rows || []])
    );
    return {
      maxEventId: inputs.eventCatalog.safeMaxEventId.value,
      groups: {
        fourStarCount: fourPanel?.groups || [],
        limitedCount: limitedPanel?.groups || [],
        scoreUpCount: scoreUpPanel?.groups || [],
        limitedBanCount: limitedBanPanel?.groups || [],
        fesLimitedCount: fesLimitedPanel?.groups || [],
        fesLimitedBanCount: fesLimitedBanPanel?.groups || [],
        bannerCount: inputs.distribution.groupPanels.value.find((p) => p.id === 'banner')?.groups || [],
        festival: festivalGroups,
        dailyLineup: previewDailyLineupMap.value
      }
    };
  });

  return {
    statsPreviewPayload,
  };
}
