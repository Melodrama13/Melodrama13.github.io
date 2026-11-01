/** Compare complete teams using the statistics page's stable tie priority. */
export function compareLineupSolvedHit(nextHit, bestHit, lineupRules) {
  if (!bestHit) return true;
  if (nextHit.total !== bestHit.total) return nextHit.total > bestHit.total;

  const nextBfes = nextHit.members.filter((m) => m.fesKind === 'bfes').length;
  const bestBfes = bestHit.members.filter((m) => m.fesKind === 'bfes').length;
  if (nextBfes !== bestBfes) return nextBfes > bestBfes;

  const nextCfes = nextHit.members.filter((m) => m.fesKind === 'cfes').length;
  const bestCfes = bestHit.members.filter((m) => m.fesKind === 'cfes').length;
  if (nextCfes !== bestCfes) return nextCfes > bestCfes;

  const freshnessDiff = lineupRules.compareMemberFreshness(nextHit.members, bestHit.members);
  if (freshnessDiff !== 0) return freshnessDiff > 0;
  return false;
}

/** Build full plans once; each view adapts only its presentation and selection. */
export function buildCharacterLineupRows({ cards, names, attrs, isCardWithinLimit,
  getCardBaseName, isKnownName, normalizeAttribute, lineupRules, buildEventRef,
  isFesSkillType, getFesKindBySkillKind }) {
  const solveSingleCharLineup = (cards) => {
    const source = [...(cards || [])];
    if (!source.length) return null;

    const teamSize = Math.min(5, source.length);
    let best = null;
    const selected = [];

    const dfs = (startIdx) => {
      const need = teamSize - selected.length;
      if (need === 0) {
        const hit = lineupRules.evalLineupMembers(selected);
        if (compareLineupSolvedHit(hit, best, lineupRules)) {
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
      const recencyDiff = lineupRules.getEventRefRecencyScore(b?.eventRef) - lineupRules.getEventRefRecencyScore(a?.eventRef);
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

  const pool = Object.fromEntries(attrs.map((attr) => [attr, {}]));

  (cards || []).forEach((card) => {
    if (!isCardWithinLimit(card)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const baseName = getCardBaseName(card?.Name);
    if (!baseName || !isKnownName(baseName)) return;

    const attr = normalizeAttribute(card?.Attribute);
    if (!attrs.includes(attr)) return;

    const skillInfo = lineupRules.getLineupSkillInfo(card);
    const { eventRef, eventLabel } = buildEventRef(card);
    const unit = lineupRules.getLineupCardUnit(card, baseName);

    if (!pool[attr][baseName]) pool[attr][baseName] = [];
    pool[attr][baseName].push({
      cardId: String(card?.CardID || ''),
      name: baseName,
      attr,
      unit,
      baseScore: skillInfo.baseScore,
      isUnitScore: skillInfo.isUnitScore,
      isFes: isFesSkillType(skillInfo.kind),
      fesKind: getFesKindBySkillKind(skillInfo.kind),
      skillKind: skillInfo.kind,
      eventRef,
      eventLabel
    });
  });

  return names.map((name) => {
    const plans = attrs
      .map((attr) => buildLineupPlan(name, attr, pool))
      .filter(Boolean)
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if ((b.bfesCount || 0) !== (a.bfesCount || 0)) return (b.bfesCount || 0) - (a.bfesCount || 0);
        if ((b.cfesCount || 0) !== (a.cfesCount || 0)) return (b.cfesCount || 0) - (a.cfesCount || 0);
        return attrs.indexOf(a.attr) - attrs.indexOf(b.attr);
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

}
