import { ref, computed, nextTick } from 'vue';

/** Owns card support behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardSupport(inputs) {
  const supportUseOriginalVsTeam = ref(false);

  const supportEnableWlLineup = ref(false);

  const supportUseCompilationRules = ref(false);

  const supportShowCardImages = ref(false);

  const isSupportAttrIcon = (attr) => inputs.constants.ATTRS.includes(String(attr || ''));

  const compareLineupCardForPick = (a, b) => {
    if ((b?.baseScore || 0) !== (a?.baseScore || 0)) return (b?.baseScore || 0) - (a?.baseScore || 0);
    const aBfes = a?.fesKind === 'bfes' ? 1 : 0;
    const bBfes = b?.fesKind === 'bfes' ? 1 : 0;
    if (bBfes !== aBfes) return bBfes - aBfes;
    const aCfes = a?.fesKind === 'cfes' ? 1 : 0;
    const bCfes = b?.fesKind === 'cfes' ? 1 : 0;
    if (bCfes !== aCfes) return bCfes - aCfes;
    const recencyDiff = inputs.lineupRules.getEventRefRecencyScore(b?.eventRef) - inputs.lineupRules.getEventRefRecencyScore(a?.eventRef);
    if (recencyDiff !== 0) return recencyDiff;
    const bCardId = Number(String(b?.cardId || '').trim()) || 0;
    const aCardId = Number(String(a?.cardId || '').trim()) || 0;
    return bCardId - aCardId;
  };

  const compressSupportCards = (cards) => {
    const bestBySignature = {};
    (cards || []).forEach((card) => {
      const signature = [
        String(card?.unit || ''),
        Number(card?.baseScore || 0),
        card?.isUnitScore ? 1 : 0,
        String(card?.fesKind || ''),
        String(card?.skillKind || '')
      ].join('|');
      const prev = bestBySignature[signature];
      if (!prev || compareLineupCardForPick(card, prev) < 0) {
        bestBySignature[signature] = card;
      }
    });
    return Object.values(bestBySignature).sort(compareLineupCardForPick);
  };

  const evalSupportMembers = (cards) => {
    const lineupHit = inputs.lineupRules.evalLineupMembers(cards);
    const orderedMembers = [...lineupHit.members].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const recencyDiff = inputs.lineupRules.getEventRefRecencyScore(b?.eventRef) - inputs.lineupRules.getEventRefRecencyScore(a?.eventRef);
      if (recencyDiff !== 0) return recencyDiff;
      const bCardId = Number(String(b?.cardId || '').trim()) || 0;
      const aCardId = Number(String(a?.cardId || '').trim()) || 0;
      return bCardId - aCardId;
    });
    const captainScore = Number(orderedMembers[0]?.score || 0);
    const othersScore = orderedMembers.slice(1).reduce((sum, m) => sum + Number(m.score || 0), 0);
    const total = captainScore + (othersScore / 5);
    return {
      total,
      members: orderedMembers,
      captainScore,
      othersScore
    };
  };

  const compareSupportSolvedHit = (nextHit, bestHit, targetUnit) => {
    if (!bestHit) return true;

    if (inputs.lineup.compareLineupSolvedHit(nextHit, bestHit)) return true;
    if (inputs.lineup.compareLineupSolvedHit(bestHit, nextHit)) return false;

    if (targetUnit === 'vs') {
      const nextPureVs = nextHit.members.filter((m) => String(m?.unit || '').trim().toLowerCase() === 'vs').length;
      const bestPureVs = bestHit.members.filter((m) => String(m?.unit || '').trim().toLowerCase() === 'vs').length;
      if (nextPureVs !== bestPureVs) return nextPureVs > bestPureVs;
      return false;
    }

    const nextOcInUnit = nextHit.members.filter((m) => m.unit === targetUnit && !inputs.metadata.isVirtualSinger(String(m?.name || '').trim())).length;
    const bestOcInUnit = bestHit.members.filter((m) => m.unit === targetUnit && !inputs.metadata.isVirtualSinger(String(m?.name || '').trim())).length;
    if (nextOcInUnit !== bestOcInUnit) return nextOcInUnit > bestOcInUnit;

    const nextVsCount = nextHit.members.filter((m) => inputs.metadata.isVirtualSinger(String(m?.name || '').trim())).length;
    const bestVsCount = bestHit.members.filter((m) => inputs.metadata.isVirtualSinger(String(m?.name || '').trim())).length;
    if (nextVsCount !== bestVsCount) return nextVsCount < bestVsCount;

    return false;
  };

  const solveSupportLineup = (cardsByName, targetUnit) => {
    const entries = Object.entries(cardsByName || {})
      .map(([name, cards]) => ({
        name,
        // Keep all card options for a character; unit_score cards can outperform score_up after lineup composition.
        cards: compressSupportCards(cards)
      }))
      .filter((entry) => entry.cards.length > 0)
      .sort((a, b) => compareLineupCardForPick(b.cards[0], a.cards[0]));

    if (!entries.length) return null;

    const teamSize = Math.min(5, entries.length);
    let best = null;
    const selected = [];

    const dfs = (idx) => {
      const remainNeed = teamSize - selected.length;
      const remainEntries = entries.length - idx;
      if (remainNeed === 0) {
        const hit = evalSupportMembers(selected);
        if (compareSupportSolvedHit(hit, best, targetUnit)) best = hit;
        return;
      }
      if (remainEntries < remainNeed) return;
      if (idx >= entries.length) return;

      const entry = entries[idx];
      for (let i = 0; i < entry.cards.length; i += 1) {
        selected.push(entry.cards[i]);
        dfs(idx + 1);
        selected.pop();
      }

      dfs(idx + 1);
    };

    dfs(0);
    return best;
  };

  const buildCompilationSupportPlan = (targetUnit, attr, supportPool) => {
    const emptyPlan = () => ({ attr, total: 0, members: [], memberSlots: [null, null, null, null, null] });
    const ocNames = Object.keys(inputs.metadata.CHAR_UNIT_MAP)
      .filter((name) => inputs.metadata.CHAR_UNIT_MAP[name] === targetUnit && !inputs.metadata.isVirtualSinger(name));
    if (ocNames.length !== 4) return emptyPlan();

    const multicolor = attr === inputs.constants.SUPPORT_WL_ATTR;
    const attrs = multicolor ? inputs.constants.ATTRS : [attr];
    const unitScore = inputs.lineupRules.calcLineupUnitScore(targetUnit, { [targetUnit]: 5 });
    const effectiveCard = (card) => ({ ...card, baseScore: card.isUnitScore ? unitScore : card.baseScore });

    // All five members belong to the same unit, so each skill's value is fixed.
    // A stronger card in the same role/color always improves the support total.
    const roles = [...ocNames, null].map((name) => attrs.map((color) => {
      const cardsByName = supportPool?.[targetUnit]?.[color] || {};
      const candidates = name ? (cardsByName[name] || []) : Object.entries(cardsByName)
        .filter(([singer]) => inputs.metadata.isVirtualSinger(singer))
        .flatMap(([, cards]) => cards);
      return candidates.reduce((best, card) => {
        if (card.unit !== targetUnit) return best;
        return !best || compareLineupCardForPick(effectiveCard(card), effectiveCard(best)) < 0 ? card : best;
      }, null);
    }).filter(Boolean));
    if (roles.some((cards) => cards.length === 0)) return emptyPlan();

    let best = null;
    const selected = [];
    const usedAttrs = new Set();
    const visit = (index) => {
      if (index === roles.length) {
        const hit = evalSupportMembers(selected);
        if (compareSupportSolvedHit(hit, best, targetUnit)) best = hit;
        return;
      }
      for (const card of roles[index]) {
        if (multicolor && usedAttrs.has(card.attr)) continue;
        selected.push(card);
        if (multicolor) usedAttrs.add(card.attr);
        visit(index + 1);
        if (multicolor) usedAttrs.delete(card.attr);
        selected.pop();
      }
    };
    // WL enumerates all feasible color assignments (at most 5! complete teams).
    visit(0);
    return best ? { attr, total: best.total, members: best.members, memberSlots: [...best.members] } : emptyPlan();
  };

  const buildSupportLineupPlan = (targetUnit, attr, supportPool) => {
    if (supportUseCompilationRules.value && targetUnit !== 'vs') {
      return buildCompilationSupportPlan(targetUnit, attr, supportPool);
    }
    const cardsByName = supportPool?.[targetUnit]?.[attr] || {};
    const solved = solveSupportLineup(cardsByName, targetUnit);
    if (!solved) {
      return {
        attr,
        total: 0,
        members: [],
        memberSlots: [null, null, null, null, null]
      };
    }

    const memberSlots = [...solved.members];
    while (memberSlots.length < 5) memberSlots.push(null);

    return {
      attr,
      total: solved.total,
      members: solved.members,
      memberSlots
    };
  };

  const buildSupportWlPlan = (targetUnit, supportPool) => {
    if (supportUseCompilationRules.value && targetUnit !== 'vs') {
      return buildCompilationSupportPlan(targetUnit, inputs.constants.SUPPORT_WL_ATTR, supportPool);
    }
    const isVsTarget = targetUnit === 'vs';
    const isOcTarget = targetUnit !== 'vs';

    const buildWlAttrCandidateCards = (cardsByName, { strictOc = true, widen = false } = {}) => {
      const cards = Object.values(cardsByName || {}).flatMap((list) => Array.isArray(list) ? list : []);
      const normalized = cards
        .filter((card) => {
          const unit = String(card?.unit || '').trim().toLowerCase();
          const skillKind = String(card?.skillKind || '').trim().toLowerCase();

          // NOTE(wl-heuristic-2026-04): WL 行固定按“原v”统计，忽略“原v队”勾选，避免无效搜索空间。
          if (isVsTarget) return unit === 'vs';

          // NOTE(wl-heuristic-2026-04): OC 行仅保留 BFES/团分，未来若出现高倍率 CFES/P分再回退。
          if (isOcTarget) {
            if (unit !== targetUnit) return false;
            if (!strictOc) return true;
            return inputs.lineupRules.WL_OC_ALLOWED_SKILLS.has(skillKind);
          }

          return true;
        })
        .map((card) => {
          const skillKind = String(card?.skillKind || '').trim().toLowerCase();
          if (isOcTarget && skillKind === 'unit_score') {
            return { ...card, baseScore: inputs.lineupRules.WL_OC_UNIT_SCORE_BASE };
          }
          return card;
        });

      const sorted = [...normalized].sort(compareLineupCardForPick);
      if (!sorted.length) return [];

      const unitScoreCards = sorted.filter((card) => card?.isUnitScore).slice(0, widen ? 8 : 4);
      const bfesCards = sorted.filter((card) => card?.fesKind === 'bfes').slice(0, widen ? 8 : 4);
      const scoreCards = sorted
        .filter((card) => inputs.lineupRules.WL_OC_FALLBACK_SKILLS.has(String(card?.skillKind || '').trim().toLowerCase()))
        .slice(0, widen ? 8 : 4);
      const highBaseCards = sorted.slice(0, widen ? 9 : 5);

      const merged = [];
      const seen = new Set();
      const pushUnique = (card) => {
        const key = String(card?.cardId || '').trim() || `${String(card?.name || '').trim()}|${String(card?.attr || '').trim()}|${String(card?.unit || '').trim()}|${String(card?.skillKind || '').trim()}|${Number(card?.baseScore || 0)}`;
        if (!key || seen.has(key)) return;
        seen.add(key);
        merged.push(card);
      };

      unitScoreCards.forEach(pushUnique);
      bfesCards.forEach(pushUnique);
      scoreCards.forEach(pushUnique);
      highBaseCards.forEach(pushUnique);
      if (isVsTarget || !strictOc || widen) {
        sorted.forEach(pushUnique);
      }

      const limit = isVsTarget
        ? (widen ? 14 : 10)
        : (strictOc ? (widen ? 10 : 6) : (widen ? 14 : 10));
      return merged.slice(0, limit);
    };

    const buildAttrBuckets = (strictOc, widen) => inputs.constants.ATTRS.map((attr) => {
      const cardsByName = supportPool?.[targetUnit]?.[attr] || {};
      return {
        attr,
        cards: buildWlAttrCandidateCards(cardsByName, { strictOc, widen })
      };
    });

    const solveByBuckets = (attrBuckets) => {
      if (attrBuckets.some((bucket) => bucket.cards.length === 0)) {
        return null;
      }

      let best = null;
      const selected = [];
      const usedNames = new Set();

      const dfs = (idx) => {
        if (idx >= attrBuckets.length) {
          if (selected.length !== inputs.constants.ATTRS.length) return;
          const hit = evalSupportMembers(selected);
          if (compareSupportSolvedHit(hit, best, targetUnit)) best = hit;
          return;
        }

        const bucket = attrBuckets[idx];
        for (let i = 0; i < bucket.cards.length; i += 1) {
          const card = bucket.cards[i];
          const nameKey = String(card?.name || '').trim();
          if (!nameKey || usedNames.has(nameKey)) continue;
          usedNames.add(nameKey);
          selected.push(card);
          dfs(idx + 1);
          selected.pop();
          usedNames.delete(nameKey);
        }
      };

      dfs(0);
      return best;
    };

    let best = solveByBuckets(buildAttrBuckets(true, false));
    if (!best && isOcTarget) {
      // 回退策略：当严格筛选导致某团 WL 行无法成队时，放宽到同团全技能并扩大候选集。
      best = solveByBuckets(buildAttrBuckets(false, true));
    }
    if (!best && isVsTarget) {
      best = solveByBuckets(buildAttrBuckets(true, true));
    }

    if (!best) {
      return {
        attr: inputs.constants.SUPPORT_WL_ATTR,
        total: 0,
        members: [],
        memberSlots: [null, null, null, null, null]
      };
    }

    const memberSlots = [...best.members];
    while (memberSlots.length < 5) memberSlots.push(null);

    return {
      attr: inputs.constants.SUPPORT_WL_ATTR,
      total: best.total,
      members: best.members,
      memberSlots
    };
  };

  const supportCardPoolByUnitAttr = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const pool = Object.fromEntries(
      inputs.constants.SUPPORT_UNITS.map((unit) => [unit, Object.fromEntries(inputs.constants.ATTRS.map((attr) => [attr, {}]))])
    );

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const baseName = inputs.metadata.getCardBaseName(card?.Name);
      if (!baseName || !inputs.metadata.CHAR_ORDER[baseName]) return;

      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
      if (!attr) return;

      const unit = inputs.lineupRules.getLineupCardUnit(card, baseName);
      const skillInfo = inputs.lineupRules.getLineupSkillInfo(card);
      const { eventRef, eventLabel } = inputs.eventLabels.buildLineupEventRef(card);

      inputs.constants.SUPPORT_UNITS.forEach((targetUnit) => {
        if (targetUnit === 'vs') {
          if (!inputs.metadata.VS_NAMES.includes(baseName)) return;
          if (supportUseOriginalVsTeam.value && unit !== 'vs') return;
        } else if (unit !== targetUnit) {
          return;
        }

        if (!pool[targetUnit][attr][baseName]) pool[targetUnit][attr][baseName] = [];
        pool[targetUnit][attr][baseName].push({
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
    });

    return pool;
  });

  const supportLineupRows = computed(() => {
    return inputs.constants.SUPPORT_UNITS.map((unit) => {
      const plans = inputs.constants.ATTRS
        .map((attr) => buildSupportLineupPlan(unit, attr, supportCardPoolByUnitAttr.value))
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return inputs.constants.ATTRS.indexOf(a.attr) - inputs.constants.ATTRS.indexOf(b.attr);
        });

      if (supportEnableWlLineup.value) {
        plans.push(buildSupportWlPlan(unit, supportCardPoolByUnitAttr.value));
      }

      return {
        unit,
        plans
      };
    });
  });

  const formatSupportTotal = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return '0';
    if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
    return num.toFixed(1);
  };

  const onSupportShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      supportShowCardImages.value = checked;
      void nextTick(() => {
        inputs.responsiveLayout.queueLineupCardModeRowLayoutSync();
      });
    }, anchorEl);
  };

  const onSupportEnableWlLineupChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      supportEnableWlLineup.value = checked;
    }, anchorEl);
  };

  const onSupportUseOriginalVsTeamChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      supportUseOriginalVsTeam.value = checked;
    }, anchorEl);
  };

  const onSupportCompilationRulesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      supportUseCompilationRules.value = checked;
    }, anchorEl);
  };

  return {
    supportLineupRows,
    supportShowCardImages,
    onSupportShowCardImagesChange,
    supportEnableWlLineup,
    onSupportEnableWlLineupChange,
    supportUseCompilationRules,
    onSupportCompilationRulesChange,
    supportUseOriginalVsTeam,
    onSupportUseOriginalVsTeamChange,
    isSupportAttrIcon,
    formatSupportTotal,
  };
}
