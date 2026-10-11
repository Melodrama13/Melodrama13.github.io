import { ref, computed, nextTick } from 'vue';

/** Owns card lineup behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardLineup(inputs) {
  const lineupShowCardImages = ref(false);

  const compareLineupSolvedHit = (nextHit, bestHit) => {
    if (!bestHit) return true;
    if (nextHit.total !== bestHit.total) return nextHit.total > bestHit.total;

    const nextBfes = nextHit.members.filter((m) => m.fesKind === 'bfes').length;
    const bestBfes = bestHit.members.filter((m) => m.fesKind === 'bfes').length;
    if (nextBfes !== bestBfes) return nextBfes > bestBfes;

    const nextCfes = nextHit.members.filter((m) => m.fesKind === 'cfes').length;
    const bestCfes = bestHit.members.filter((m) => m.fesKind === 'cfes').length;
    if (nextCfes !== bestCfes) return nextCfes > bestCfes;

    const freshnessDiff = inputs.lineupRules.compareMemberFreshness(nextHit.members, bestHit.members);
    if (freshnessDiff !== 0) return freshnessDiff > 0;
    return false;
  };

  const solveSingleCharLineup = (cards) => {
    const source = [...(cards || [])];
    if (!source.length) return null;

    const teamSize = Math.min(5, source.length);
    let best = null;
    const selected = [];

    const dfs = (startIdx) => {
      const need = teamSize - selected.length;
      if (need === 0) {
        const hit = inputs.lineupRules.evalLineupMembers(selected);
        if (compareLineupSolvedHit(hit, best)) {
          best = hit;
        }
        return;
      }

      for (let i = startIdx; i <= source.length - need; i += 1) {
        selected.push(source[i]);
        dfs(i + 1);
        selected.pop();
      }
    };

    dfs(0);
    return best;
  };

  const buildLineupPlan = (captainName, attr, attrPool) => {
    const cards = [...(attrPool?.[attr]?.[captainName] || [])];
    const solved = solveSingleCharLineup(cards);
    if (!solved) return null;

    const orderedMembers = [...solved.members].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const recencyDiff = inputs.lineupRules.getEventRefRecencyScore(b?.eventRef) - inputs.lineupRules.getEventRefRecencyScore(a?.eventRef);
      if (recencyDiff !== 0) return recencyDiff;
      const bCardId = Number(String(b?.cardId || '').trim()) || 0;
      const aCardId = Number(String(a?.cardId || '').trim()) || 0;
      return bCardId - aCardId;
    });

    const memberSlots = [...orderedMembers];
    while (memberSlots.length < 5) memberSlots.push(null);

    return {
      attr,
      total: solved.total,
      bfesCount: orderedMembers.filter((m) => m.fesKind === 'bfes').length,
      cfesCount: orderedMembers.filter((m) => m.fesKind === 'cfes').length,
      members: orderedMembers,
      memberSlots
    };
  };

  const lineupCardPoolByAttr = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const pool = Object.fromEntries(inputs.constants.ATTRS.map((attr) => [attr, {}]));

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const baseName = inputs.metadata.getCardBaseName(card?.Name);
      if (!baseName || !inputs.metadata.CHAR_ORDER[baseName]) return;

      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
      if (!attr) return;

      const skillInfo = inputs.lineupRules.getLineupSkillInfo(card);
      const { eventRef, eventLabel } = inputs.eventLabels.buildLineupEventRef(card);
      const unit = inputs.lineupRules.getLineupCardUnit(card, baseName);

      if (!pool[attr][baseName]) pool[attr][baseName] = [];
      pool[attr][baseName].push({
        cardId: String(card?.CardID || ''),
        name: baseName,
        attr,
        unit,
        baseScore: skillInfo.baseScore,
        isUnitScore: skillInfo.isUnitScore,
        isFes: inputs.presentation.isFesSkillType(skillInfo.kind),
        fesKind: inputs.presentation.getFesKindBySkillKind(skillInfo.kind),
        skillKind: skillInfo.kind,
        eventRef,
        eventLabel
      });
    });

    return pool;
  });

  const characterLineupRows = computed(() => {
    const names = [...inputs.metadata.LINEUP_CHAR_NAMES.value];

    return names.map((name) => {
      const plans = inputs.constants.ATTRS
        .map((attr) => buildLineupPlan(name, attr, lineupCardPoolByAttr.value))
        .filter(Boolean)
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          if ((b.bfesCount || 0) !== (a.bfesCount || 0)) return (b.bfesCount || 0) - (a.bfesCount || 0);
          if ((b.cfesCount || 0) !== (a.cfesCount || 0)) return (b.cfesCount || 0) - (a.cfesCount || 0);
          return inputs.constants.ATTRS.indexOf(a.attr) - inputs.constants.ATTRS.indexOf(b.attr);
        });

      if (!plans.length) {
        const emptyPlan = {
          attr: 'Pure',
          total: 0,
          members: [],
          memberSlots: [null, null, null, null, null]
        };
        return {
          name,
          bestPlan: emptyPlan,
          otherPlans: []
        };
      }

      return {
        name,
        bestPlan: plans[0],
        otherPlans: plans.slice(1)
      };
    });
  });

  const lineupExpandedMap = ref({});

  const isLineupExpanded = (name) => {
    const key = String(name || '');
    return !!key && lineupExpandedMap.value[key] !== false;
  };

  const lineupRowsWithOthers = computed(() => characterLineupRows.value.filter((row) => (row.otherPlans || []).length > 0));

  const isLineupAllExpanded = computed(() => {
    if (!lineupRowsWithOthers.value.length) return false;
    return lineupRowsWithOthers.value.every((row) => isLineupExpanded(row.name));
  });

  const getLineupToggleLabel = (name, count = 0) => {
    const expanded = isLineupExpanded(name);
    if (inputs.navigation.isMobileNav.value) return expanded ? '收起' : '展开';
    return expanded ? '收起其余属性' : '展开其余属性';
  };

  const getLineupGlobalToggleLabel = () => {
    if (inputs.navigation.isMobileNav.value) return isLineupAllExpanded.value ? '收起全部' : '展开全部';
    return isLineupAllExpanded.value ? '收起全部其余属性' : '展开全部其余属性';
  };

  const onLineupShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      lineupShowCardImages.value = checked;
      void nextTick(() => {
        inputs.responsiveLayout.queueLineupCardModeRowLayoutSync();
      });
    }, anchorEl);
  };

  const toggleLineupExpanded = (name, event = null) => {
    const key = String(name || '');
    if (!key) return;
    const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      lineupExpandedMap.value = {
        ...lineupExpandedMap.value,
        [key]: !isLineupExpanded(key)
      };
    }, anchorEl);
  };

  const toggleLineupExpandedAll = (event = null) => {
    const target = !isLineupAllExpanded.value;
    const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      const next = { ...lineupExpandedMap.value };
      lineupRowsWithOthers.value.forEach((row) => {
        next[row.name] = target;
      });
      lineupExpandedMap.value = next;
    }, anchorEl);
  };

  return {
    characterLineupRows,
    compareLineupSolvedHit,
    lineupShowCardImages,
    onLineupShowCardImagesChange,
    toggleLineupExpandedAll,
    getLineupGlobalToggleLabel,
    toggleLineupExpanded,
    getLineupToggleLabel,
    isLineupExpanded,
  };
}
