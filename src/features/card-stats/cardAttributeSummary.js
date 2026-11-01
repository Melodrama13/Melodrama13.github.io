import { CARD_STATISTICS_DEFAULTS } from './cardStatisticsRules.js';

/** Attribute counts preserve the full statistics page's exact character names and skill rules. */
export function buildCharacterAttributeSummary({ cards, names, attrs, isCardWithinLimit, normalizeAttribute,
  isVirtualSinger, getUnitByChar = () => 'vs', getAnchorId = () => '',
  includeUnitScoreInPureScore = CARD_STATISTICS_DEFAULTS.includeUnitScoreInPureScore }) {
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

  const statsByName = Object.fromEntries(names.map((name) => [name, createAttrSummarySeed()]));
  const pureExcludedSkills = includeUnitScoreInPureScore
    ? new Set(['accuracy', 'recovery', '-', ''])
    : new Set(['accuracy', 'recovery', 'unit_score', '-', '']);

  (cards || []).forEach((card) => {
    const name = String(card?.Name || '').trim();
    if (!statsByName[name]) return;
    if (!isCardWithinLimit(card)) return;

    const attr = normalizeAttribute(card?.Attribute);
    if (!attrs.includes(attr)) return;

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
    const isVs = isVirtualSinger(name);
    const unit = String(getUnitByChar(name) || '').toLowerCase() || 'vs';
    const source = statsByName[name] || createAttrSummarySeed();
    return {
      name,
      unit,
      anchorId: getAnchorId(name),
      mainScoreLabel: isVs ? '团分' : '分卡',
      rows: attrs.map((attr) => toSummaryRow(source[attr], isVs, attr)),
      totalRow: toSummaryRow(source.total, isVs, 'total')
    };
  });

}
