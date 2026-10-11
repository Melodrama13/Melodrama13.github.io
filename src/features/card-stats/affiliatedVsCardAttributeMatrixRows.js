/** Build the seeded affiliated virtual singer matrix rows with the existing counts and sort policy. */
export function buildAffiliatedVsCardAttributeMatrixRows({
  cards,
  maxEventId,
  includeUnitScoreInPureScore,
  isCardWithinLimit,
  normalizeCardStatsAttribute,
  isEventRewardCard,
  singerNames,
  unitSortOrder,
  sortKey,
  sortOrder,
  createMatrixStatSeed,
  compareVsMatrixName
}) {
  const maxEid = maxEventId;
  const matrixStats = {};

  unitSortOrder.forEach((unit) => {
    singerNames.forEach((vsName) => {
      const key = `${vsName} ${unit}`;
      matrixStats[key] = createMatrixStatSeed(key);
    });
  });

  (cards).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    const baseName = String(card?.Name || '').trim();
    if (!singerNames.includes(baseName)) return;
    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!unitSortOrder.includes(unit)) return;

    const key = `${baseName} ${unit}`;
    const target = matrixStats[key];
    if (!target) return;

    const rarity = String(card?.Rarity || '').trim();
    const skill = String(card?.Skill || '').toLowerCase();
    const attr = normalizeCardStatsAttribute(card?.Attribute);

    if (rarity === '4') {
      target.fourStarCount += 1;
      if (skill === 'p_score') target.pScoreCount += 1;
      if (skill === 'score_up') target.scoreUpCount += 1;
      if (skill === 'accuracy') target.accuracyCount += 1;
      if (skill === 'recovery') target.recoveryCount += 1;
      if (skill === 'unit_score') target.unitScoreCount += 1;
      if (!skill || skill === '-') target.pendingSkillCount += 1;
      if (attr) target.attrCounts[attr] += 1;
    }

    if (rarity === '3') target.threeStarCount += 1;
    if (rarity === '2') target.twoStarCount += 1;

    if (isEventRewardCard(card)) {
      if (rarity === '3') target.rewardThreeCount += 1;
      if (rarity === '2') target.rewardTwoCount += 1;
    }
  });

  const baseRows = Object.values(matrixStats)
    .map((s) => {
      const pureSubtract = includeUnitScoreInPureScore
        ? (s.accuracyCount + s.recoveryCount + s.pendingSkillCount)
        : (s.accuracyCount + s.recoveryCount + s.unitScoreCount + s.pendingSkillCount);
      s.pureScoreCount = s.fourStarCount - pureSubtract;
      s.rewardTotalCount = s.rewardThreeCount + s.rewardTwoCount;
      return {
        name: s.name,
        Pure: s.attrCounts.Pure,
        Cool: s.attrCounts.Cool,
        Cute: s.attrCounts.Cute,
        Happy: s.attrCounts.Happy,
        Mysterious: s.attrCounts.Mysterious,
        unitScoreCount: s.unitScoreCount,
        pureScoreCount: s.pureScoreCount,
        scoreUpCount: s.scoreUpCount,
        pScoreCount: s.pScoreCount,
        accuracyCount: s.accuracyCount,
        recoveryCount: s.recoveryCount,
        fourStarCount: s.fourStarCount,
        threeStarCount: s.threeStarCount,
        twoStarCount: s.twoStarCount,
        rewardTotalCount: s.rewardTotalCount
      };
    })
    .sort((a, b) => compareVsMatrixName(a.name, b.name));

  const key = sortKey;
  const order = sortOrder;
  if (!key || !order) return baseRows;

  const orderFactor = order === 'desc' ? -1 : 1;
  return [...baseRows].sort((a, b) => {
    const av = Number(a?.[key] || 0);
    const bv = Number(b?.[key] || 0);
    if (av !== bv) return (av - bv) * orderFactor;
    return compareVsMatrixName(a.name, b.name);
  });

}
