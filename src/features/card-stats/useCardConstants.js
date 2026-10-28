import { computed } from 'vue';
import { getWorldLinkStatTypes } from '../../domain/worldLink.js';
/** Owns card constants behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardConstants(inputs) {
  const ATTRS = ['Pure', 'Cool', 'Cute', 'Happy', 'Mysterious'];

  const SUPPORT_WL_ATTR = 'wl';

  const FES_CARD_TYPES = new Set(['cfes', 'bfes']);

  const FES_SKILL_TYPES = new Set(['cfes', 'bfes_up']);

  const EXCLUDED_PERIOD_EVENT_TYPES = new Set(['测试']);

  const SPECIAL_EVENT_KEY_LABELS = {
    c1: '大罪',
    c2: '三丽欧',
    c3: 'ES',
    c4: '东方',
    c5: '拓麻歌子',
    c6: '歌限1',
    movie: '剧场版'
  };

  const ATTR_LABELS = {
    Pure: '绿草',
    Cool: '蓝星',
    Cute: '粉花',
    Happy: '橙心',
    Mysterious: '紫月'
  };

  const ATTR_COLORS = Object.freeze({
    Pure: '#17a159',
    Cool: '#4b48e9',
    Cute: '#f35c9b',
    Happy: '#ff8719',
    Mysterious: '#8e65c2'
  });

  const SPECIAL_FESTIVALS = ['新年', '婚活', '情人节', '白情', '半周年', '周年'];

  const FESTIVAL_ANCHOR_IDS = Object.fromEntries(SPECIAL_FESTIVALS.map((fest, idx) => [fest, `festival-${idx + 1}`]));

  const FESTIVAL_VS_UNIT_ORDER = { ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5, vs: 6 };

  const VS_UNIT_SORT_ORDER = ['ln', 'mmj', 'vbs', 'ws', 'nc'];

  const worldLinkStatTypes = computed(() => getWorldLinkStatTypes(inputs.props?.allCards || [], inputs.props?.allEvents || []));
  const VS_ORIGINAL_STAT_TYPES = computed(() => ['大罪', 'CFES', 'BFES', ...worldLinkStatTypes.value.map(row => row.label), '其他']);

  const RELATED_FES_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs'];

  const SPECIAL_LIMITED_STAT_TYPES = computed(() => Object.freeze([
    { key: 'cfes', label: 'CFES' },
    { key: 'bfes', label: 'BFES' },
    ...worldLinkStatTypes.value
  ]));

  const SUPPORT_UNITS = ['vs', 'ln', 'mmj', 'vbs', 'ws', 'nc'];

  const LINEUP_NAV_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs'];

  const SUPPORT_NAV_UNITS = ['vs', 'ln', 'mmj', 'vbs', 'ws', 'nc'];

  const DUO_OC_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc'];

  const DUO_FILTER_OPTIONS = Object.freeze([
    { value: 'box', label: '箱活', title: '统计箱活。' },
    { value: 'mix', label: '混活', title: '统计混活。' },
    { value: 'wl', label: 'WL', title: '统计 World Link。' },
    { value: 'collab', label: '联动', title: '统计联动。' },
    { value: 'fes', label: 'FES', title: '同池统计中允许 FES 卡参与计数。' },
    { value: 'limited', label: '限定', title: '勾选后仅统计普限、WL、联动与 FES 卡。' },
    { value: 'ownVs', label: '本团V', title: '勾选后，OC 与 VS 的配对仅统计该 OC 所属团的附属 VS。' }
  ]);

  const DUO_VS_TOTAL_KEY = '__duo_vs_total__';

  const supportUnitTitleLogoMap = Object.freeze({
    ln: '/elements/unit_logo_ln.png',
    mmj: '/elements/unit_logo_mmj.png',
    vbs: '/elements/unit_logo_vbs.png',
    ws: '/elements/unit_logo_ws.png',
    nc: '/elements/unit_logo_nc.png',
    vs: '/elements/unit_logo_vs.png'
  });

  return {
    LINEUP_NAV_UNITS,
    SUPPORT_NAV_UNITS,
    SPECIAL_FESTIVALS,
    FESTIVAL_ANCHOR_IDS,
    VS_UNIT_SORT_ORDER,
    ATTRS,
    ATTR_COLORS,
    get VS_ORIGINAL_STAT_TYPES() { return VS_ORIGINAL_STAT_TYPES.value; },
    FESTIVAL_VS_UNIT_ORDER,
    FES_CARD_TYPES,
    FES_SKILL_TYPES,
    SPECIAL_EVENT_KEY_LABELS,
    SUPPORT_WL_ATTR,
    SUPPORT_UNITS,
    EXCLUDED_PERIOD_EVENT_TYPES,
    RELATED_FES_UNITS,
    get SPECIAL_LIMITED_STAT_TYPES() { return SPECIAL_LIMITED_STAT_TYPES.value; },
    ATTR_LABELS,
    DUO_OC_UNITS,
    DUO_VS_TOTAL_KEY,
    DUO_FILTER_OPTIONS,
    supportUnitTitleLogoMap,
  };
}
