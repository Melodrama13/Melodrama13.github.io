

/** Owns card lineup rules behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardLineupRules(inputs) {
  const LINEUP_SKILL_BASE = Object.freeze({
    bfes_up: 160,
    cfes: 140,
    p_score: 130,
    score_up: 120,
    accuracy: 100,
    recovery: 100,
    unit_score: 100,
    default: 120
  });

  const LINEUP_ATTR_BG = Object.freeze({
    Cool: '#4b48e9',
    Cute: '#f35c9b',
    Pure: '#17a159',
    Happy: '#ff8719',
    Mysterious: '#8e65c2'
  });

  const LINEUP_BASE_ALPHA = 0.15;

  const LINEUP_FES_ALPHA = Object.freeze({ cfes: 0.2, bfes: 0.35 });

  const WL_OC_UNIT_SCORE_BASE = 150;

  const WL_OC_ALLOWED_SKILLS = new Set(['bfes_up', 'unit_score']);

  const WL_OC_FALLBACK_SKILLS = new Set(['bfes_up', 'unit_score', 'p_score', 'score_up', 'default']);

  const makeLineupFesBg = (alpha) => {
    const a = Math.max(0, Math.min(1, Number(alpha)));
    return `linear-gradient(45deg, rgba(253,124,193,${a}) 0%, rgba(135,192,255,${a}) 50%, rgba(248,255,135,${a}) 100%)`;
  };

  const getLineupCardUnit = (card, baseName) => {
    if (inputs.metadata.isVirtualSinger(baseName)) {
      const aff = String(card?.Affiliation || '').trim().toLowerCase();
      if (aff && inputs.metadata.UNIT_COLORS[aff]) return aff;
      return 'vs';
    }
    return inputs.metadata.CHAR_UNIT_MAP[baseName] || 'vs';
  };

  const getLineupSkillInfo = (card) => {
    const skill = String(card?.Skill || '').trim().toLowerCase();
    const type = String(card?.Type || '').trim().toLowerCase();

    if (skill === 'bfes_up' || type === 'bfes') {
      return { kind: 'bfes_up', baseScore: LINEUP_SKILL_BASE.bfes_up, isUnitScore: false };
    }
    if (skill.startsWith('cfes') || type === 'cfes') {
      return { kind: 'cfes', baseScore: LINEUP_SKILL_BASE.cfes, isUnitScore: false };
    }
    if (skill === 'p_score') {
      return { kind: 'p_score', baseScore: LINEUP_SKILL_BASE.p_score, isUnitScore: false };
    }
    if (skill === 'score_up') {
      return { kind: 'score_up', baseScore: LINEUP_SKILL_BASE.score_up, isUnitScore: false };
    }
    if (skill === 'accuracy') {
      return { kind: 'accuracy', baseScore: LINEUP_SKILL_BASE.accuracy, isUnitScore: false };
    }
    if (skill === 'recovery') {
      return { kind: 'recovery', baseScore: LINEUP_SKILL_BASE.recovery, isUnitScore: false };
    }
    if (skill === 'unit_score') {
      return { kind: 'unit_score', baseScore: LINEUP_SKILL_BASE.unit_score, isUnitScore: true };
    }
    return { kind: 'default', baseScore: LINEUP_SKILL_BASE.default, isUnitScore: false };
  };

  const calcLineupUnitScore = (unit, unitCountMap) => {
    const selfIncluded = Number(unitCountMap[unit] || 0);
    const others = Math.max(0, selfIncluded - 1);
    const bonus = (others * 10) + (others === 4 ? 10 : 0);
    return 100 + bonus;
  };

  const evalLineupMembers = (cards) => {
    const unitCountMap = cards.reduce((map, card) => {
      map[card.unit] = Number(map[card.unit] || 0) + 1;
      return map;
    }, {});

    const members = cards.map((card) => {
      const score = card.isUnitScore ? calcLineupUnitScore(card.unit, unitCountMap) : card.baseScore;
      return {
        ...card,
        score
      };
    });

    const baseTotal = members.reduce((sum, m) => sum + m.score, 0);
    const captainBonus = members.length ? Math.max(...members.map((m) => m.score)) : 0;
    return { total: baseTotal + captainBonus, members };
  };

  const getEventRefRecencyScore = (eventRef) => {
    const dateText = String(eventRef?.start_date || '').trim();
    const dateObj = inputs.presentation.parseDateSafe(dateText);
    if (dateObj) return dateObj.getTime();

    const sourceKey = String(eventRef?.sourceKey || eventRef?.id || '').trim();
    if (inputs.eventCatalog.isNumericEventId(sourceKey)) return Number(sourceKey);
    return 0;
  };

  const compareMemberFreshness = (nextMembers, bestMembers) => {
    const normalize = (members) => {
      return [...(members || [])]
        .map((item) => ({
          recency: getEventRefRecencyScore(item?.eventRef),
          cardId: Number(String(item?.cardId || '').trim()) || 0
        }))
        .sort((a, b) => {
          if (b.recency !== a.recency) return b.recency - a.recency;
          return b.cardId - a.cardId;
        });
    };

    const next = normalize(nextMembers);
    const best = normalize(bestMembers);
    const size = Math.max(next.length, best.length);

    for (let i = 0; i < size; i += 1) {
      const n = next[i] || { recency: 0, cardId: 0 };
      const b = best[i] || { recency: 0, cardId: 0 };
      if (n.recency !== b.recency) return n.recency - b.recency;
      if (n.cardId !== b.cardId) return n.cardId - b.cardId;
    }

    return 0;
  };

  const getLineupRowStyle = (attr) => {
    if (String(attr || '').toLowerCase() === inputs.constants.SUPPORT_WL_ATTR) {
      return {
        '--lineup-row-bg': 'transparent',
        '--lineup-row-border': 'rgba(71, 85, 105, 0.34)',
        '--lineup-row-fg': '#111827',
        '--lineup-row-fg-muted': '#64748b'
      };
    }
    const bg = LINEUP_ATTR_BG[attr] || '#64748b';
    const flatBg = inputs.presentation.hexToSoftSolid(bg, 1 - LINEUP_BASE_ALPHA);
    return {
      '--lineup-row-bg': flatBg,
      '--lineup-row-border': inputs.presentation.hexToRgba(bg, 0.38),
      '--lineup-row-fg': '#111827',
      '--lineup-row-fg-muted': '#64748b'
    };
  };

  const getLineupMemberCellStyle = (slot, attr) => {
    if (slot?.fesKind === 'bfes') {
      return {
        background: makeLineupFesBg(LINEUP_FES_ALPHA.bfes),
        borderColor: '#4c1d95',
        color: '#111827'
      };
    }
    if (slot?.fesKind === 'cfes') {
      return {
        background: makeLineupFesBg(LINEUP_FES_ALPHA.cfes),
        borderColor: '#ffffff',
        boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.18)',
        color: '#111827'
      };
    }
    return getLineupRowStyle(attr);
  };

  return {
    calcLineupUnitScore,
    getEventRefRecencyScore,
    evalLineupMembers,
    WL_OC_ALLOWED_SKILLS,
    WL_OC_UNIT_SCORE_BASE,
    WL_OC_FALLBACK_SKILLS,
    getLineupCardUnit,
    getLineupSkillInfo,
    compareMemberFreshness,
    getLineupRowStyle,
    getLineupMemberCellStyle,
  };
}
