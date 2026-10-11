import { computed } from 'vue';

/** Preview Statistics owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, PreviewSelections, Formatting, PreviewCutoff, Presentation, PredictionEditor.
 */
export function useHistoryPreviewStatistics(ports) {
const isPreviewEventRewardCard = (card, options = {}) => {
  const rarity = String(card?.Rarity || '').trim();
  if (!['2', '3'].includes(rarity)) return false;
  const includeCollab = options?.includeCollab === true || ports.previewSelections.previewIncludeCollabReward.value;
  if (ports.formatting.isNumericEventId(card?.EventID)) return true;
  if (!includeCollab) return false;
  return String(card?.Type || '').trim().toLowerCase() === 'collab';
};

const getPreviewStepBaseOrder = (name) => {
  const base = String(name || '').trim().split(/\s+/)[0] || '';
  return ports.previewSelections.getPreviewCharOrder(base);
};

const previewStepProgressOrderMap = computed(() => {
  const maxId = Number(ports.previewCutoff.previewMaxEventId.value);
  const rowMap = {};

  const ensure = (rawName) => {
    const name = String(rawName || '').trim();
    if (!name) return null;
    if (!rowMap[name]) {
      rowMap[name] = {
        lastCardOrderId: 0,
        lastFourStarOrderId: 0,
        lastLimitedOrderId: 0,
        lastPScoreOrderId: 0,
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
        lastLimitedBanOrderId: 0
      };
    }
    return rowMap[name];
  };

  ports.previewCutoff.previewEffectiveCards.value.forEach((card) => {
    if (!ports.previewCutoff.isCardWithinPreviewLimit(card, maxId)) return;
    const name = String(card?.Name || '').trim();
    if (!name || name === '-' || name === 'CardID') return;

    const row = ensure(name);
    if (!row) return;

    const rarity = String(card?.Rarity || '').trim();
    const skill = String(card?.Skill || '').trim().toLowerCase();
    const type = String(card?.Type || '').trim().toLowerCase();
    const progressOrderId = ports.previewCutoff.getPreviewCardProgressOrderId(card);

    row.lastCardOrderId = Math.max(Number(row.lastCardOrderId || 0), progressOrderId);

    if (rarity === '4') {
      row.lastFourStarOrderId = Math.max(Number(row.lastFourStarOrderId || 0), progressOrderId);
      if (skill === 'p_score') row.lastPScoreOrderId = Math.max(Number(row.lastPScoreOrderId || 0), progressOrderId);
      if (skill === 'score_up') row.lastScoreUpOrderId = Math.max(Number(row.lastScoreUpOrderId || 0), progressOrderId);
      if (skill === 'accuracy') row.lastAccuracyOrderId = Math.max(Number(row.lastAccuracyOrderId || 0), progressOrderId);
      if (skill === 'recovery') row.lastRecoveryOrderId = Math.max(Number(row.lastRecoveryOrderId || 0), progressOrderId);
      const excludedPureSkills = ports.previewSelections.previewIncludeUnitScoreInPureScore.value
        ? ['accuracy', 'recovery', '-', '']
        : ['accuracy', 'recovery', 'unit_score', '-', ''];
      if (!excludedPureSkills.includes(skill)) {
        row.lastPureScoreOrderId = Math.max(Number(row.lastPureScoreOrderId || 0), progressOrderId);
      }
    }

    if (rarity === '3') {
      row.lastThreeStarOrderId = Math.max(Number(row.lastThreeStarOrderId || 0), progressOrderId);
    }
    if (rarity === '2') {
      row.lastTwoStarOrderId = Math.max(Number(row.lastTwoStarOrderId || 0), progressOrderId);
    }

    if (isPreviewEventRewardCard(card)) {
      if (rarity === '3') {
        row.lastRewardThreeOrderId = Math.max(Number(row.lastRewardThreeOrderId || 0), progressOrderId);
      }
      if (rarity === '2') {
        row.lastRewardTwoOrderId = Math.max(Number(row.lastRewardTwoOrderId || 0), progressOrderId);
      }
      row.lastRewardOrderId = Math.max(Number(row.lastRewardOrderId || 0), progressOrderId);
    }

    if (isPreviewEventRewardCard(card, { includeCollab: true })) {
      if (rarity === '3') {
        row.lastRewardThreeWithCollabOrderId = Math.max(Number(row.lastRewardThreeWithCollabOrderId || 0), progressOrderId);
      }
      if (rarity === '2') {
        row.lastRewardTwoWithCollabOrderId = Math.max(Number(row.lastRewardTwoWithCollabOrderId || 0), progressOrderId);
      }
      row.lastRewardWithCollabOrderId = Math.max(Number(row.lastRewardWithCollabOrderId || 0), progressOrderId);
    }

    if (ports.previewSelections.PREVIEW_LIMITED_TYPES.has(type)) {
      row.lastLimitedOrderId = Math.max(Number(row.lastLimitedOrderId || 0), progressOrderId);
    }
  });

  const typeFilter = ports.previewSelections.previewLimitedBanEventTypeFilter.value;
  const bannerTypeFilter = ports.previewSelections.previewBannerEventTypeFilter.value;
  (ports.props.allEvents || []).forEach((ev) => {
    if (!ports.formatting.isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (!Number.isFinite(eid) || eid <= 0) return;
    if (Number.isFinite(maxId) && maxId > 0 && eid > maxId) return;

    const bannerName = ports.previewSelections.normalizeCharName(ev?.banner);
    if (bannerName && ports.previewSelections.getPreviewCharOrder(bannerName) < 999 && !ports.presentation.isVirtualSinger(bannerName)) {
      const eventType = String(ev?.event_type || '').trim();
      if (['箱活', '混活'].includes(eventType) && (bannerTypeFilter === 'all' || bannerTypeFilter === eventType)) {
        const row = ensure(bannerName);
        if (row) {
          row.lastBannerOrderId = Math.max(Number(row.lastBannerOrderId || 0), eid);
        }
      }
    }

    if (String(ev?.gacha_type || '').trim() !== '普通限定') return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerNameLimited = bannerName;
    if (!bannerNameLimited || ports.previewSelections.getPreviewCharOrder(bannerNameLimited) >= 999 || ports.presentation.isVirtualSinger(bannerNameLimited)) return;
    const row = ensure(bannerNameLimited);
    if (!row) return;
    row.lastLimitedBanOrderId = Math.max(Number(row.lastLimitedBanOrderId || 0), eid);
  });

  return rowMap;
});

const getPreviewStepProgressOrderKey = (name, key) => {
  const row = previewStepProgressOrderMap.value[String(name || '').trim()] || {};
  if (key === 'fourStarCount') return Number(row.lastFourStarOrderId || 0);
  if (key === 'limitedCount') return Number(row.lastLimitedOrderId || 0);
  if (key === 'pScoreCount') return Number(row.lastPScoreOrderId || 0);
  if (key === 'scoreUpCount') return Number(row.lastScoreUpOrderId || 0);
  if (key === 'pureScoreCount') return Number(row.lastPureScoreOrderId || 0);
  if (key === 'recoveryCount') return Number(row.lastRecoveryOrderId || 0);
  if (key === 'accuracyCount') return Number(row.lastAccuracyOrderId || 0);
  if (key === 'threeStarCount') return Number(row.lastThreeStarOrderId || 0);
  if (key === 'twoStarCount') return Number(row.lastTwoStarOrderId || 0);
  if (key === 'rewardThreeCount') return Number(row.lastRewardThreeOrderId || 0);
  if (key === 'rewardTwoCount') return Number(row.lastRewardTwoOrderId || 0);
  if (key === 'rewardThreeCountWithCollab') return Number(row.lastRewardThreeWithCollabOrderId || 0);
  if (key === 'rewardTwoCountWithCollab') return Number(row.lastRewardTwoWithCollabOrderId || 0);
  if (key === 'rewardTotalCount') return Number(row.lastRewardOrderId || 0);
  if (key === 'bannerCount') return Number(row.lastBannerOrderId || 0);
  if (key === 'limitedBanCount') return Number(row.lastLimitedBanOrderId || 0);
  return Number(row.lastCardOrderId || 0);
};

const comparePreviewStepCharByKey = (aName, bName, key) => {
  const ao = getPreviewStepProgressOrderKey(aName, key);
  const bo = getPreviewStepProgressOrderKey(bName, key);
  if (ao !== bo) return ao - bo;
  const ac = getPreviewStepBaseOrder(aName);
  const bc = getPreviewStepBaseOrder(bName);
  if (ac !== bc) return ac - bc;
  return String(aName || '').localeCompare(String(bName || ''), 'zh-Hans-CN');
};

const previewCharStats = computed(() => {
  const stats = {};
  const maxId = ports.previewCutoff.previewMaxEventId.value;
  ports.previewCutoff.previewEffectiveCards.value.forEach((card) => {
    const name = String(card?.Name || '').trim();
    if (!name || name === '-' || name === 'CardID') return;
    if (!ports.previewCutoff.isCardWithinPreviewLimit(card, maxId)) return;

    if (!stats[name]) {
      stats[name] = {
        name,
        fourStarCount: 0,
        limitedCount: 0,
        pScoreCount: 0,
        scoreUpCount: 0,
        bannerCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        rewardTwoCount: 0,
        rewardThreeCount: 0,
        rewardTwoCountWithCollab: 0,
        rewardThreeCountWithCollab: 0,
        accuracyCount: 0,
        recoveryCount: 0,
        unitScoreCount: 0,
        pendingSkillCount: 0,
        pureScoreCount: 0,
        rewardTotalCount: 0,
        attr4Counts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
      };
    }

    const rarity = String(card?.Rarity || '').trim();
    const type = String(card?.Type || '').toLowerCase();
    const skill = String(card?.Skill || '').toLowerCase();
    if (rarity === '4') {
      stats[name].fourStarCount += 1;
      if (skill === 'p_score') stats[name].pScoreCount += 1;
      if (skill === 'score_up') stats[name].scoreUpCount += 1;
      if (skill === 'accuracy') stats[name].accuracyCount += 1;
      if (skill === 'recovery') stats[name].recoveryCount += 1;
      if (skill === 'unit_score') stats[name].unitScoreCount += 1;
      if (!skill || skill === '-') stats[name].pendingSkillCount += 1;
      const attr = ports.formatting.normalizeEventHistoryAttribute(card?.Attribute);
      if (stats[name].attr4Counts[attr] !== undefined) {
        stats[name].attr4Counts[attr] += 1;
      }
    }
    if (rarity === '3') stats[name].threeStarCount += 1;
    if (rarity === '2') stats[name].twoStarCount += 1;
    if (isPreviewEventRewardCard(card)) {
      if (rarity === '3') stats[name].rewardThreeCount += 1;
      if (rarity === '2') stats[name].rewardTwoCount += 1;
    }
    if (isPreviewEventRewardCard(card, { includeCollab: true })) {
      if (rarity === '3') stats[name].rewardThreeCountWithCollab += 1;
      if (rarity === '2') stats[name].rewardTwoCountWithCollab += 1;
    }
    if (ports.previewSelections.PREVIEW_LIMITED_TYPES.has(type)) stats[name].limitedCount += 1;
  });

  const bannerTypeFilter = ports.previewSelections.previewBannerEventTypeFilter.value;
  (ports.props.allEvents || []).forEach((ev) => {
    if (!ports.formatting.isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (!Number.isFinite(eid) || eid <= 0) return;
    if (Number.isFinite(maxId) && maxId > 0 && eid > maxId) return;

    const eventType = String(ev?.event_type || '').trim();
    if (!['箱活', '混活'].includes(eventType)) return;
    if (bannerTypeFilter !== 'all' && bannerTypeFilter !== eventType) return;

    const bannerName = ports.previewSelections.normalizeCharName(ev?.banner);
    if (!bannerName || ports.previewSelections.getPreviewCharOrder(bannerName) >= 999 || ports.presentation.isVirtualSinger(bannerName)) return;

    if (!stats[bannerName]) {
      stats[bannerName] = {
        name: bannerName,
        fourStarCount: 0,
        limitedCount: 0,
        pScoreCount: 0,
        scoreUpCount: 0,
        bannerCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        rewardTwoCount: 0,
        rewardThreeCount: 0,
        rewardTwoCountWithCollab: 0,
        rewardThreeCountWithCollab: 0,
        accuracyCount: 0,
        recoveryCount: 0,
        unitScoreCount: 0,
        pendingSkillCount: 0,
        pureScoreCount: 0,
        rewardTotalCount: 0,
        attr4Counts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
      };
    }
    stats[bannerName].bannerCount += 1;
  });

  return Object.values(stats).map((s) => {
    const pureSubtract = ports.previewSelections.previewIncludeUnitScoreInPureScore.value
      ? (s.accuracyCount + s.recoveryCount + s.pendingSkillCount)
      : (s.accuracyCount + s.recoveryCount + s.unitScoreCount + s.pendingSkillCount);
    s.pureScoreCount = s.fourStarCount - pureSubtract;
    s.rewardTotalCount = s.rewardThreeCount + s.rewardTwoCount;
    return s;
  });
});

const createPreviewAttrCountSeed = () => Object.fromEntries(
  ports.previewSelections.PREVIEW_ATTRS.map((attr) => [attr, 0])
);

const previewAttrFiveSummaryRows = computed(() => {
  if (!ports.previewSelections.selectedPreviewPanelIds.value.includes('attr-five')) return [];

  const maxId = ports.previewCutoff.previewMaxEventId.value;
  const eventCounts = createPreviewAttrCountSeed();
  const fourStarCounts = createPreviewAttrCountSeed();

  (ports.props.allEvents || []).forEach((event) => {
    if (!ports.previewCutoff.isEventWithinPreviewLimit(event, maxId)) return;
    const attr = ports.formatting.normalizeEventHistoryAttribute(event?.event_attribute);
    if (eventCounts[attr] !== undefined) eventCounts[attr] += 1;
  });

  ports.previewCutoff.previewEffectiveCards.value.forEach((card) => {
    if (!ports.previewCutoff.isCardWithinPreviewLimit(card, maxId)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;
    const attr = ports.formatting.normalizeEventHistoryAttribute(card?.Attribute);
    if (fourStarCounts[attr] !== undefined) fourStarCounts[attr] += 1;
  });

  return [
    { key: 'events', label: '活动', ...eventCounts },
    { key: 'four-stars', label: '四星', ...fourStarCounts }
  ];
});

const previewAttrFiveRows = computed(() => {
  if (!ports.previewSelections.selectedPreviewPanelIds.value.includes('attr-five')) return [];
  const selected = ports.previewSelections.selectedPreviewAttrChars.value;
  if (selected.length === 0) return [];

  const statMap = new Map(previewCharStats.value.map((s) => [s.name, s]));
  return selected
    .map((name) => {
      const s = statMap.get(name);
      return {
        name,
        Pure: s?.attr4Counts?.Pure || 0,
        Cool: s?.attr4Counts?.Cool || 0,
        Cute: s?.attr4Counts?.Cute || 0,
        Happy: s?.attr4Counts?.Happy || 0,
        Mysterious: s?.attr4Counts?.Mysterious || 0
      };
    })
    .sort((a, b) => ports.previewSelections.getPreviewCharOrder(a.name) - ports.previewSelections.getPreviewCharOrder(b.name));
});

const previewLimitedBanSteps = computed(() => {
  const maxId = Number(ports.previewCutoff.previewMaxEventId.value);
  if (!Number.isFinite(maxId) || maxId <= 0) return [];

  const typeFilter = ports.previewSelections.previewLimitedBanEventTypeFilter.value;
  const countMap = Object.fromEntries(
    Object.keys(ports.previewSelections.PREVIEW_CHAR_ORDER.value)
      .filter((name) => !ports.presentation.isVirtualSinger(name))
      .map((name) => [name, 0])
  );

  (ports.props.allEvents || []).forEach((ev) => {
    if (!ports.formatting.isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxId) return;
    if (String(ev?.gacha_type || '').trim() !== '普通限定') return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerName = ports.previewSelections.normalizeCharName(ev?.banner);
    if (!bannerName || ports.previewSelections.getPreviewCharOrder(bannerName) >= 999) return;
    if (ports.presentation.isVirtualSinger(bannerName)) return;
    countMap[bannerName] = Number(countMap[bannerName] || 0) + 1;
  });

  const grouped = new Map();
  Object.entries(countMap).forEach(([name, count]) => {
    const n = Number(count || 0);
    if (!grouped.has(n)) grouped.set(n, []);
    grouped.get(n).push({ name });
  });

  return Array.from(grouped.entries())
    .map(([count, chars]) => ({
      count,
      chars: chars.sort((a, b) => comparePreviewStepCharByKey(a.name, b.name, 'limitedBanCount'))
    }))
    .sort((a, b) => b.count - a.count);
});

const previewBannerSteps = computed(() => {
  const grouped = new Map();
  previewCharStats.value
    .filter((row) => !ports.presentation.isVirtualSinger(String(row?.name || '').trim().split(/\s+/)[0]))
    .forEach((row) => {
      const count = Number(row?.bannerCount || 0);
      if (!grouped.has(count)) grouped.set(count, []);
      grouped.get(count).push({ name: row.name });
    });

  return Array.from(grouped.entries())
    .map(([count, chars]) => ({
      count,
      chars: chars.sort((a, b) => comparePreviewStepCharByKey(a.name, b.name, 'bannerCount'))
    }))
    .sort((a, b) => b.count - a.count);
});

const buildPreviewSteps = (key) => {
  const grouped = new Map();
  previewCharStats.value.forEach((row) => {
    const count = Number(row?.[key] || 0);
    if (!grouped.has(count)) grouped.set(count, []);
    grouped.get(count).push({
      name: row.name,
      rewardThreeCount: row.rewardThreeCount || 0,
      rewardTwoCount: row.rewardTwoCount || 0
    });
  });

  return Array.from(grouped.entries())
    .map(([count, chars]) => ({
      count,
      chars: [...chars].sort((a, b) => comparePreviewStepCharByKey(a.name, b.name, key))
    }))
    .sort((a, b) => b.count - a.count);
};

const getPreviewStepsByKey = (key) => {
  const resolvedKey = (() => {
    if (key === 'threeStarCount' && ports.previewSelections.previewThreeUseRewardCount.value) return 'rewardThreeCountWithCollab';
    if (key === 'twoStarCount' && ports.previewSelections.previewTwoUseRewardCount.value) return 'rewardTwoCountWithCollab';
    return key;
  })();

  if (resolvedKey === 'limitedBanCount' && ports.previewSelections.previewLimitedBanEventTypeFilter.value !== 'all') {
    return previewLimitedBanSteps.value;
  }
  if (resolvedKey === 'bannerCount' && ports.previewSelections.previewBannerEventTypeFilter.value !== 'all') {
    return previewBannerSteps.value;
  }
  const panelDef = ports.previewSelections.PREVIEW_PANEL_DEFS.find((d) => d.statKey === resolvedKey);
  const external = ports.props.statsPreviewData;
  const externalMaxId = Number(external?.maxEventId);
  if (panelDef?.externalKey && !ports.predictionEditor.isEditorOpen.value && Number.isFinite(externalMaxId) && externalMaxId === Number(ports.previewCutoff.previewMaxEventId.value)) {
    const groups = external?.groups?.[panelDef.externalKey];
    if (Array.isArray(groups) && groups.length > 0) {
      return groups.map((g) => ({
        count: Number(g?.count || 0),
        chars: Array.isArray(g?.chars) ? g.chars.map((c) => ({ name: c.name })) : []
      }));
    }
  }
  if (resolvedKey === 'limitedBanCount') {
    return previewLimitedBanSteps.value;
  }
  if (resolvedKey === 'bannerCount') {
    return previewBannerSteps.value;
  }
  return buildPreviewSteps(resolvedKey);
};

const getPreviewAttrRowStyle = (name) => {
  return {
    backgroundColor: ports.formatting.hexToRgba(ports.presentation.getCharColor(name), 0.3)
  };
};


return {
  previewAttrFiveSummaryRows,
  previewAttrFiveRows,
  getPreviewAttrRowStyle,
  getPreviewStepsByKey,
};
}
