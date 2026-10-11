import { computed } from 'vue';

/** Daily Lineup owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, PreviewSelections, PreviewCutoff, PredictionEditor, Presentation, Formatting.
 */
export function useHistoryDailyLineup(ports) {
const previewDailyLineupRows = computed(() => {
  if (!ports.previewSelections.selectedPreviewPanelIds.value.includes('daily-lineup')) return [];
  if (!ports.previewSelections.selectedPreviewDailyLineupChars.value.length) return [];

  const external = ports.props.statsPreviewData;
  const externalMaxId = Number(external?.maxEventId);
  const lineupMap = external?.groups?.dailyLineup || {};
  const canUseExternal = Number.isFinite(externalMaxId)
    && externalMaxId === Number(ports.previewCutoff.previewMaxEventId.value)
    && !ports.predictionEditor.isEditorOpen.value
    && lineupMap
    && typeof lineupMap === 'object';

  const getDailyCardSkillInfo = (card) => {
    const skill = String(card?.Skill || '').trim().toLowerCase();
    const type = String(card?.Type || '').trim().toLowerCase();

    if (skill === 'bfes_up' || type === 'bfes') {
      return { kind: 'bfes_up', baseScore: ports.previewSelections.PREVIEW_DAILY_SKILL_BASE.bfes_up, isUnitScore: false };
    }
    if (skill.startsWith('cfes') || type === 'cfes') {
      return { kind: 'cfes', baseScore: ports.previewSelections.PREVIEW_DAILY_SKILL_BASE.cfes, isUnitScore: false };
    }
    if (skill === 'p_score') {
      return { kind: 'p_score', baseScore: ports.previewSelections.PREVIEW_DAILY_SKILL_BASE.p_score, isUnitScore: false };
    }
    if (skill === 'score_up') {
      return { kind: 'score_up', baseScore: ports.previewSelections.PREVIEW_DAILY_SKILL_BASE.score_up, isUnitScore: false };
    }
    if (skill === 'accuracy') {
      return { kind: 'accuracy', baseScore: ports.previewSelections.PREVIEW_DAILY_SKILL_BASE.accuracy, isUnitScore: false };
    }
    if (skill === 'recovery') {
      return { kind: 'recovery', baseScore: ports.previewSelections.PREVIEW_DAILY_SKILL_BASE.recovery, isUnitScore: false };
    }
    if (skill === 'unit_score') {
      return { kind: 'unit_score', baseScore: ports.previewSelections.PREVIEW_DAILY_SKILL_BASE.unit_score, isUnitScore: true };
    }
    return { kind: 'default', baseScore: ports.previewSelections.PREVIEW_DAILY_SKILL_BASE.default, isUnitScore: false };
  };

  const getDailyCardUnit = (card, baseName) => {
    if (ports.presentation.isVirtualSinger(baseName)) {
      const aff = String(card?.Affiliation || '').trim().toLowerCase();
      return aff && ports.presentation.UNIT_COLORS.value[aff] ? aff : 'vs';
    }
    return ports.previewSelections.PREVIEW_DAILY_CHAR_UNIT_MAP.value[baseName] || 'vs';
  };

  const calcDailyUnitScore = (unit, members) => {
    const sameUnitCount = members.reduce((sum, m) => sum + (m.unit === unit ? 1 : 0), 0);
    const others = Math.max(0, sameUnitCount - 1);
    return 100 + (others * 10) + (others === 4 ? 10 : 0);
  };

  const evalDailyMembers = (cards) => {
    const members = cards.map((card) => ({ ...card }));
    members.forEach((m) => {
      if (m.isUnitScore) {
        m.score = calcDailyUnitScore(m.unit, members);
      } else {
        m.score = m.baseScore;
      }
    });
    const baseTotal = members.reduce((sum, m) => sum + Number(m.score || 0), 0);
    const captainBonus = members.length ? Math.max(...members.map((m) => Number(m.score || 0))) : 0;
    return { total: baseTotal + captainBonus, members };
  };

  const compareDailySolvedHit = (nextHit, bestHit) => {
    if (!bestHit) return true;
    if (nextHit.total !== bestHit.total) return nextHit.total > bestHit.total;

    const nextBfes = nextHit.members.filter((m) => m.fesKind === 'bfes').length;
    const bestBfes = bestHit.members.filter((m) => m.fesKind === 'bfes').length;
    if (nextBfes !== bestBfes) return nextBfes > bestBfes;

    const nextCfes = nextHit.members.filter((m) => m.fesKind === 'cfes').length;
    const bestCfes = bestHit.members.filter((m) => m.fesKind === 'cfes').length;
    if (nextCfes !== bestCfes) return nextCfes > bestCfes;

    const nextNewest = Math.max(...nextHit.members.map((m) => Number(m.eventId || 0)));
    const bestNewest = Math.max(...bestHit.members.map((m) => Number(m.eventId || 0)));
    return nextNewest > bestNewest;
  };

  const solveDailyLineup = (cards) => {
    const source = [...(cards || [])];
    if (!source.length) return null;
    const teamSize = Math.min(5, source.length);
    let best = null;
    const selected = [];

    const dfs = (startIdx) => {
      const need = teamSize - selected.length;
      if (need === 0) {
        const hit = evalDailyMembers(selected);
        if (compareDailySolvedHit(hit, best)) best = hit;
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

  const localLineupMap = (() => {
    if (canUseExternal) return null;
    const maxId = Number(ports.previewCutoff.previewMaxEventId.value);
    if (!Number.isFinite(maxId) || maxId <= 0) return {};

    const byNameAttr = {};
    ports.previewCutoff.previewEffectiveCards.value.forEach((card) => {
      if (!ports.previewCutoff.isCardWithinPreviewLimit(card, maxId)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const baseName = ports.previewSelections.normalizeCharName(card?.Name);
      if (!baseName || ports.previewSelections.getPreviewCharOrder(baseName) >= 999) return;

      const attr = ports.formatting.normalizeEventHistoryAttribute(card?.Attribute);
      if (!ports.previewSelections.PREVIEW_ATTRS.includes(attr)) return;

      const skillInfo = getDailyCardSkillInfo(card);
      const unit = getDailyCardUnit(card, baseName);
      if (!byNameAttr[baseName]) byNameAttr[baseName] = {};
      if (!byNameAttr[baseName][attr]) byNameAttr[baseName][attr] = [];

      byNameAttr[baseName][attr].push({
        cardId: String(card?.CardID || ''),
        unit,
        baseScore: skillInfo.baseScore,
        isUnitScore: skillInfo.isUnitScore,
        fesKind: skillInfo.kind === 'bfes_up' ? 'bfes' : (skillInfo.kind === 'cfes' ? 'cfes' : ''),
        eventId: Number(String(card?.EventID || '').trim()) || 0
      });
    });

    const map = {};
    Object.keys(byNameAttr).forEach((name) => {
      const plans = ports.previewSelections.PREVIEW_ATTRS
        .map((attr) => {
          const solved = solveDailyLineup(byNameAttr[name][attr] || []);
          if (!solved) return null;
          const orderedMembers = [...solved.members].sort((a, b) => {
            if (Number(b.score || 0) !== Number(a.score || 0)) return Number(b.score || 0) - Number(a.score || 0);
            return Number(b.eventId || 0) - Number(a.eventId || 0);
          });
          const memberScores = orderedMembers.map((m) => Number(m.score || 0));
          while (memberScores.length < 5) memberScores.push(0);
          return {
            attr,
            total: Number(solved.total || 0),
            memberScores,
            memberFesKinds: orderedMembers.map((m) => String(m.fesKind || '')),
            bfesCount: orderedMembers.filter((m) => m.fesKind === 'bfes').length,
            cfesCount: orderedMembers.filter((m) => m.fesKind === 'cfes').length
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          if ((b.bfesCount || 0) !== (a.bfesCount || 0)) return (b.bfesCount || 0) - (a.bfesCount || 0);
          if ((b.cfesCount || 0) !== (a.cfesCount || 0)) return (b.cfesCount || 0) - (a.cfesCount || 0);
          return ports.previewSelections.PREVIEW_ATTRS.indexOf(a.attr) - ports.previewSelections.PREVIEW_ATTRS.indexOf(b.attr);
        })
        .map(({ bfesCount, cfesCount, ...plan }) => plan);
      map[name] = plans;
    });
    return map;
  })();

  const activeLineupMap = canUseExternal ? lineupMap : localLineupMap;
  if (!activeLineupMap || typeof activeLineupMap !== 'object') return [];

  return ports.previewSelections.selectedPreviewDailyLineupChars.value
    .map((name) => {
      const plansRaw = Array.isArray(activeLineupMap?.[name]) ? activeLineupMap[name] : [];
      const plans = plansRaw
        .map((plan) => {
          const attr = String(plan?.attr || '');
          if (!ports.previewSelections.PREVIEW_ATTRS.includes(attr)) return null;
          const rawScores = Array.isArray(plan?.memberScores) ? plan.memberScores : [];
          const memberScores = [...rawScores].slice(0, 5).map((n) => Number(n || 0));
          while (memberScores.length < 5) memberScores.push(0);
          const rawKinds = Array.isArray(plan?.memberFesKinds) ? plan.memberFesKinds : [];
          const memberFesKinds = [...rawKinds].slice(0, 5).map((k) => String(k || ''));
          while (memberFesKinds.length < 5) memberFesKinds.push('');
          return {
            attr,
            total: Number(plan?.total || 0),
            memberScores,
            memberFesKinds
          };
        })
        .filter(Boolean);
      if (!plans.length) {
        return null;
      }
      return { name, plans };
    })
    .filter(Boolean)
    .sort((a, b) => ports.previewSelections.getPreviewCharOrder(a.name) - ports.previewSelections.getPreviewCharOrder(b.name));
});

const getPreviewDailyPlanStyle = (attr) => {
  const color = ports.previewSelections.PREVIEW_DAILY_ATTR_COLOR[String(attr || '')] || '#94a3b8';
  return {
    '--daily-row-bg': ports.formatting.hexToRgba(color, 0.12),
    '--lineup-row-border': ports.formatting.hexToRgba(color, 0.52)
  };
};

const getPreviewDailyCardStyle = (name) => {
  const color = ports.presentation.getCharColor(name);
  return {
    backgroundColor: ports.formatting.hexToRgba(color, 0.14),
    borderColor: ports.formatting.hexToRgba(color, 0.34)
  };
};

const getPreviewDailyScoreCellClass = (fesKind, score) => {
  const kind = String(fesKind || '').toLowerCase();
  const empty = Number(score || 0) <= 0;
  return {
    'is-empty': empty,
    'is-bfes': !empty && kind === 'bfes',
    'is-cfes': !empty && kind === 'cfes'
  };
};


return {
  previewDailyLineupRows,
  getPreviewDailyPlanStyle,
  getPreviewDailyCardStyle,
  getPreviewDailyScoreCellClass,
};
}
