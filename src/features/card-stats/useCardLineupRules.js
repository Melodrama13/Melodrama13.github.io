import { createCardLineupRules } from './cardLineupRules.js';


/** Owns card lineup rules behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardLineupRules(inputs) {
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

  const {
    calcLineupUnitScore, getEventRefRecencyScore, evalLineupMembers,
    getLineupCardUnit, getLineupSkillInfo, compareMemberFreshness
  } = createCardLineupRules(inputs);

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
