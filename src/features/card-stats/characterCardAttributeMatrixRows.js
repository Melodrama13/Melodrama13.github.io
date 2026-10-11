/** Build the all-character attribute matrix rows with the existing stable sort policy. */
export function buildCharacterCardAttributeMatrixRows({
  stats,
  characterOrder,
  sortKey,
  sortOrder
}) {
  const baseRows = [...stats]
    .sort((a, b) => (characterOrder[a.name] || 999) - (characterOrder[b.name] || 999))
    .map((s) => ({
      name: s.name,
      Pure: s.attrCounts.Pure,
      Cool: s.attrCounts.Cool,
      Cute: s.attrCounts.Cute,
      Happy: s.attrCounts.Happy,
      Mysterious: s.attrCounts.Mysterious,
      pureScoreCount: s.pureScoreCount,
      scoreUpCount: s.scoreUpCount,
      pScoreCount: s.pScoreCount,
      accuracyCount: s.accuracyCount,
      recoveryCount: s.recoveryCount,
      fourStarCount: s.fourStarCount,
      threeStarCount: s.threeStarCount,
      twoStarCount: s.twoStarCount,
      rewardTotalCount: s.rewardTotalCount
    }));

  const key = sortKey;
  const order = sortOrder;
  if (!key || !order) return baseRows;

  const orderFactor = order === 'desc' ? -1 : 1;
  return [...baseRows].sort((a, b) => {
    const av = Number(a?.[key] || 0);
    const bv = Number(b?.[key] || 0);
    if (av !== bv) return (av - bv) * orderFactor;
    return (characterOrder[a.name] || 999) - (characterOrder[b.name] || 999);
  });

}
