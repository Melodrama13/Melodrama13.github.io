/** Build the existing character card counts and progress records from eligible cards. */
export function buildCardCharacterStats({
  cards,
  maxEventId,
  includeUnitScoreInPureScore,
  isCardWithinLimit,
  normalizeCardStatsAttribute,
  isEventRewardCard,
  fesLimitedEventIds,
  includeFestivalFes,
  attributeKeys,
  bannerCounts,
  bannerLastEventIds,
  limitedBannerCounts,
  limitedBannerLastEventIds,
  festivalLimitedBannerCounts,
  festivalLimitedBannerLastEventIds,
  isNumericEventId,
  isFesCardType,
  shouldIncludeCardInLimitedStats,
  getCardProgressOrderId,
  normalizeBannerName
}) {
  const stats = {};
  const maxEid = maxEventId; // 这里拿到的是基于日期计算出的 ID
  const cardsSource = cards; // 使用 App.vue 传下来的全量卡片

  cardsSource.forEach(card => {
    const name = card.Name;
    // 基础过滤：排除无效数据
    if (!name || name === "-" || name === "CardID") return;

    // --- 核心修改：日期约束逻辑 ---
    // 逻辑：如果是活动卡 (有数字 EventID)，且 ID 大于当前正在进行的活动 ID，则跳过统计
    // 除非是初始卡 ("ori")，否则必须满足 EventID <= maxEid
    if (!isCardWithinLimit(card, maxEid)) {
      return;
    }

    // 初始化角色的统计对象
    if (!stats[name]) {
      stats[name] = {
        name,
        affiliation: card.Affiliation || 'vs',
        fourStarCount: 0,
        limitedCount: 0,
        pScoreCount: 0,
        scoreUpCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        rewardTwoCount: 0,
        rewardThreeCount: 0,
        rewardTwoCountWithCollab: 0,
        rewardThreeCountWithCollab: 0,
        bannerCount: 0,
        limitedBanCount: 0,
        fesLimitedCount: 0,
        fesLimitedBanCount: 0,
        accuracyCount: 0,
        recoveryCount: 0,
        unitScoreCount: 0,
        pendingSkillCount: 0,
        pureScoreCount: 0,
        lastCardOrderId: 0,
        lastFourStarOrderId: 0,
        lastLimitedOrderId: 0,
        lastPScoreOrderId: 0,
        lastScoreUpOrderId: 0,
        lastPureScoreOrderId: 0,
        lastRecoveryOrderId: 0,
        lastAccuracyOrderId: 0,
        lastThreeStarOrderId: 0,
        lastTwoStarOrderId: 0,
        lastRewardOrderId: 0,
        lastRewardThreeOrderId: 0,
        lastRewardTwoOrderId: 0,
        lastRewardWithCollabOrderId: 0,
        lastRewardThreeWithCollabOrderId: 0,
        lastRewardTwoWithCollabOrderId: 0,
        lastBannerOrderId: 0,
        lastLimitedBanOrderId: 0,
        lastFesLimitedOrderId: 0,
        lastFesLimitedBanOrderId: 0,
        attrCounts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
      };
    }

    const eventIdRaw = String(card?.EventID || '').trim();
    const eventIdNum = isNumericEventId(eventIdRaw) ? Number(eventIdRaw) : null;
    const rarity = String(card.Rarity || '').trim();
    const skill = String(card.Skill || '').toLowerCase();
    const cardType = String(card?.Type || '').trim().toLowerCase();
    const attr = normalizeCardStatsAttribute(card.Attribute);
    const progressOrderId = getCardProgressOrderId(card);
    stats[name].lastCardOrderId = Math.max(Number(stats[name].lastCardOrderId || 0), progressOrderId);

    // 统计 4 星卡片及技能分类
    if (rarity === "4") {
      stats[name].fourStarCount++;
      stats[name].lastFourStarOrderId = Math.max(Number(stats[name].lastFourStarOrderId || 0), progressOrderId);

      const isFesCard = isFesCardType(cardType);
      const isFesLimitedEventCard = eventIdNum !== null && fesLimitedEventIds.has(eventIdNum);
      const shouldCountFesLimited = (isFesLimitedEventCard && !isFesCard)
        || (includeFestivalFes && isFesCard);
      if (shouldCountFesLimited) {
        stats[name].fesLimitedCount++;
        stats[name].lastFesLimitedOrderId = Math.max(Number(stats[name].lastFesLimitedOrderId || 0), progressOrderId);
      }

      if (skill === 'p_score') {
        stats[name].pScoreCount++;
        stats[name].lastPScoreOrderId = Math.max(Number(stats[name].lastPScoreOrderId || 0), progressOrderId);
      }
      if (skill === 'score_up') {
        stats[name].scoreUpCount++;
        stats[name].lastScoreUpOrderId = Math.max(Number(stats[name].lastScoreUpOrderId || 0), progressOrderId);
      }
      if (skill === 'accuracy') {
        stats[name].accuracyCount++;
        stats[name].lastAccuracyOrderId = Math.max(Number(stats[name].lastAccuracyOrderId || 0), progressOrderId);
      }
      if (skill === 'recovery') {
        stats[name].recoveryCount++;
        stats[name].lastRecoveryOrderId = Math.max(Number(stats[name].lastRecoveryOrderId || 0), progressOrderId);
      }
      if (skill === 'unit_score') stats[name].unitScoreCount++;
      if (!skill || skill === '-') stats[name].pendingSkillCount++;
      const excludedPureSkills = includeUnitScoreInPureScore
        ? ['accuracy', 'recovery', '-', '']
        : ['accuracy', 'recovery', 'unit_score', '-', ''];
      if (!excludedPureSkills.includes(skill)) {
        stats[name].lastPureScoreOrderId = Math.max(Number(stats[name].lastPureScoreOrderId || 0), progressOrderId);
      }

      if (attr) {
        stats[name].attrCounts[attr] += 1;
      }
    }

    if (rarity === '3') {
      stats[name].threeStarCount++;
      stats[name].lastThreeStarOrderId = Math.max(Number(stats[name].lastThreeStarOrderId || 0), progressOrderId);
    }
    if (rarity === '2') {
      stats[name].twoStarCount++;
      stats[name].lastTwoStarOrderId = Math.max(Number(stats[name].lastTwoStarOrderId || 0), progressOrderId);
    }

    if (isEventRewardCard(card)) {
      if (rarity === '3') {
        stats[name].rewardThreeCount++;
        stats[name].lastRewardThreeOrderId = Math.max(Number(stats[name].lastRewardThreeOrderId || 0), progressOrderId);
      }
      if (rarity === '2') {
        stats[name].rewardTwoCount++;
        stats[name].lastRewardTwoOrderId = Math.max(Number(stats[name].lastRewardTwoOrderId || 0), progressOrderId);
      }
      stats[name].lastRewardOrderId = Math.max(Number(stats[name].lastRewardOrderId || 0), progressOrderId);
    }

    if (isEventRewardCard(card, { includeCollab: true })) {
      if (rarity === '3') {
        stats[name].rewardThreeCountWithCollab++;
        stats[name].lastRewardThreeWithCollabOrderId = Math.max(Number(stats[name].lastRewardThreeWithCollabOrderId || 0), progressOrderId);
      }
      if (rarity === '2') {
        stats[name].rewardTwoCountWithCollab++;
        stats[name].lastRewardTwoWithCollabOrderId = Math.max(Number(stats[name].lastRewardTwoWithCollabOrderId || 0), progressOrderId);
      }
      stats[name].lastRewardWithCollabOrderId = Math.max(Number(stats[name].lastRewardWithCollabOrderId || 0), progressOrderId);
    }

    // 统计限定卡片；WL3 与歌限由共享复选框状态控制。
    if (shouldIncludeCardInLimitedStats(card)) {
      stats[name].limitedCount++;
      stats[name].lastLimitedOrderId = Math.max(Number(stats[name].lastLimitedOrderId || 0), progressOrderId);
    }
  });

  // 最后的汇总处理
  return Object.values(stats).map(s => {
    // 计算“纯分卡”数量：四星总数 - (判定 + 奶卡 + 团分)
    // 同时剔除技能待定的 4 星卡，避免被误记为分卡。
    const pureSubtract = includeUnitScoreInPureScore
      ? (s.accuracyCount + s.recoveryCount + s.pendingSkillCount)
      : (s.accuracyCount + s.recoveryCount + s.unitScoreCount + s.pendingSkillCount);
    s.pureScoreCount = s.fourStarCount - pureSubtract;
    s.rewardTotalCount = s.rewardThreeCount + s.rewardTwoCount;
    s.bannerCount = bannerCounts[normalizeBannerName(s.name)] || 0;
    s.lastBannerOrderId = Number(bannerLastEventIds[normalizeBannerName(s.name)] || 0);
    s.limitedBanCount = limitedBannerCounts[normalizeBannerName(s.name)] || 0;
    s.lastLimitedBanOrderId = Number(limitedBannerLastEventIds[normalizeBannerName(s.name)] || 0);
    s.fesLimitedBanCount = festivalLimitedBannerCounts[normalizeBannerName(s.name)] || 0;
    s.lastFesLimitedBanOrderId = Number(festivalLimitedBannerLastEventIds[normalizeBannerName(s.name)] || 0);
    s.attrTotalCount = attributeKeys.reduce((sum, a) => sum + s.attrCounts[a], 0);
    return s;
  });

}
