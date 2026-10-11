import { computed } from 'vue';

/** Owns card attribute summary behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardAttributeSummary(inputs) {
  const createAttrSummaryMetricSeed = () => ({
    pureScoreCount: 0,
    unitScoreCount: 0,
    scoreUpCount: 0,
    pScoreCount: 0,
    accuracyCount: 0,
    recoveryCount: 0,
    fourStarCount: 0,
    threeStarCount: 0,
    twoStarCount: 0
  });

  const createAttrSummarySeed = () => ({
    Pure: createAttrSummaryMetricSeed(),
    Cool: createAttrSummaryMetricSeed(),
    Cute: createAttrSummaryMetricSeed(),
    Happy: createAttrSummaryMetricSeed(),
    Mysterious: createAttrSummaryMetricSeed(),
    total: createAttrSummaryMetricSeed()
  });

  const attrSummaryCards = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const names = inputs.presentation.toDisplayOrderedCharNames(Object.keys(inputs.metadata.CHAR_ORDER));
    const statsByName = Object.fromEntries(names.map((name) => [name, createAttrSummarySeed()]));
    const pureExcludedSkills = inputs.distribution.includeUnitScoreInPureScore.value
      ? new Set(['accuracy', 'recovery', '-', ''])
      : new Set(['accuracy', 'recovery', 'unit_score', '-', '']);

    (inputs.props.allCards || []).forEach((card) => {
      const name = String(card?.Name || '').trim();
      if (!statsByName[name]) return;
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;

      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
      if (!inputs.constants.ATTRS.includes(attr)) return;

      const rarity = String(card?.Rarity || '').trim();
      const skill = String(card?.Skill || '').trim().toLowerCase();
      const attrBucket = statsByName[name][attr];
      const totalBucket = statsByName[name].total;
      const increase = (key) => {
        attrBucket[key] += 1;
        totalBucket[key] += 1;
      };

      if (rarity === '4') {
        increase('fourStarCount');
        if (skill === 'score_up') increase('scoreUpCount');
        if (skill === 'p_score') increase('pScoreCount');
        if (skill === 'accuracy') increase('accuracyCount');
        if (skill === 'recovery') increase('recoveryCount');
        if (skill === 'unit_score') increase('unitScoreCount');
        if (!pureExcludedSkills.has(skill)) increase('pureScoreCount');
      }

      if (rarity === '3') increase('threeStarCount');
      if (rarity === '2') increase('twoStarCount');
    });

    const toSummaryRow = (bucket, isVs, attr) => {
      const source = bucket || createAttrSummaryMetricSeed();
      return {
        attr,
        mainScoreCount: isVs ? Number(source.unitScoreCount || 0) : Number(source.pureScoreCount || 0),
        scoreUpCount: Number(source.scoreUpCount || 0),
        pScoreCount: Number(source.pScoreCount || 0),
        accuracyCount: Number(source.accuracyCount || 0),
        recoveryCount: Number(source.recoveryCount || 0),
        fourStarCount: Number(source.fourStarCount || 0),
        threeStarCount: Number(source.threeStarCount || 0),
        twoStarCount: Number(source.twoStarCount || 0)
      };
    };

    return names.map((name) => {
      const isVs = inputs.metadata.isVirtualSinger(name);
      const unit = String(inputs.metadata.getUnitByChar(name) || '').toLowerCase() || 'vs';
      const source = statsByName[name] || createAttrSummarySeed();
      return {
        name,
        unit,
        anchorId: inputs.presentation.getAttrSummaryCardId(name),
        mainScoreLabel: isVs ? '团分' : '分卡',
        rows: inputs.constants.ATTRS.map((attr) => toSummaryRow(source[attr], isVs, attr)),
        totalRow: toSummaryRow(source.total, isVs, 'total')
      };
    });
  });

  return {
    attrSummaryCards,
  };
}
