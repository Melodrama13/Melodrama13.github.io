import { computed } from 'vue';

/** Owns card navigation catalog behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardNavigationCatalog(inputs) {
  const INTERVAL_RECORD_ITEMS = [
    { id: 'rel-last-four', title: '上一次四星' },
    { id: 'rel-last-limited', title: '上一次限定' },
    { id: 'rel-four-long', title: '四星最长间隔' },
    { id: 'rel-four-short', title: '四星最短间隔' },
    { id: 'rel-limited-long', title: '限定最长间隔' },
    { id: 'rel-limited-short', title: '限定最短间隔' },
    { id: 'rel-ban-long', title: 'Ban最长间隔' },
    { id: 'rel-ban-short', title: 'Ban最短间隔' }
  ];

  const SPECIAL_STAT_ITEMS = [
    { id: 'rel-vs-unit-last-four', title: '各团VS上次四星' },
    { id: 'rel-vs-unit-four-count', title: '各团VS四星数' },
    { id: 'rel-vs-unit-score', title: '团分统计' },
    { id: 'rel-vs-original-stat', title: '原V统计' },
    { id: 'rel-cfes-stat', title: 'CFES统计' },
    { id: 'rel-bfes-stat', title: 'BFES统计' },
    { id: 'rel-special-limited-stat', title: '特殊限定统计' }
  ];

  const DUO_STAT_ITEMS = [
    { id: 'duo-unit-pool', title: '各团同池统计' },
    { id: 'duo-pool', title: '同池统计' },
    { id: 'duo-event', title: '同活统计' }
  ];

  const RELATED_RECORD_ITEMS = [
    ...INTERVAL_RECORD_ITEMS,
    ...DUO_STAT_ITEMS,
    ...SPECIAL_STAT_ITEMS
  ];

  const RELATED_RECORD_TITLE_MAP = Object.fromEntries(
    RELATED_RECORD_ITEMS.map((item) => [item.id, item.title])
  );

  const getRelatedRecordTitle = (id) => RELATED_RECORD_TITLE_MAP[id] || id;

  const getUnitNavTitle = (unit) => String(unit || '').toUpperCase();

  const lineupUnitFirstNameMap = computed(() => {
    const firstByUnit = {};
    inputs.lineup.characterLineupRows.value.forEach((row) => {
      const name = String(row?.name || '').trim();
      if (!name) return;
      const unit = inputs.metadata.getUnitByChar(name);
      if (!inputs.constants.LINEUP_NAV_UNITS.includes(unit)) return;
      if (!firstByUnit[unit]) firstByUnit[unit] = name;
    });
    return firstByUnit;
  });

  const lineupUnitNavChildren = computed(() => {
    return inputs.constants.LINEUP_NAV_UNITS
      .filter((unit) => !!lineupUnitFirstNameMap.value[unit])
      .map((unit) => ({
        id: inputs.presentation.getLineupCardId(lineupUnitFirstNameMap.value[unit]),
        title: getUnitNavTitle(unit)
      }));
  });

  const supportUnitNavChildren = computed(() => {
    const supportUnitSet = new Set(
      inputs.support.supportLineupRows.value
        .map((row) => String(row?.unit || '').toLowerCase())
        .filter((unit) => inputs.constants.SUPPORT_NAV_UNITS.includes(unit))
    );

    return inputs.constants.SUPPORT_NAV_UNITS
      .filter((unit) => supportUnitSet.has(unit))
      .map((unit) => ({
        id: inputs.presentation.getSupportCardId(unit),
        title: getUnitNavTitle(unit)
      }));
  });

  const attrSummaryUnitNavChildren = computed(() => {
    const firstByUnit = {};
    (inputs.attributeSummary.attrSummaryCards.value || []).forEach((card) => {
      const unit = String(card?.unit || '').toLowerCase();
      if (!inputs.constants.LINEUP_NAV_UNITS.includes(unit)) return;
      if (!firstByUnit[unit]) firstByUnit[unit] = card;
    });

    return inputs.constants.LINEUP_NAV_UNITS
      .filter((unit) => !!firstByUnit[unit])
      .map((unit) => ({
        id: firstByUnit[unit].anchorId,
        title: getUnitNavTitle(unit)
      }));
  });

  const navGroups = computed(() => {
    const distChildren = inputs.distribution.groupPanels.value.map((p) => ({
      id: `panel-${p.id}`,
      title: p.title
    }));

    return [
      {
        id: 'panel-dist',
        title: '阶梯分布',
        children: distChildren
      },
      {
        id: 'panel-festival',
        title: '节日人选',
        children: inputs.constants.SPECIAL_FESTIVALS.map((fest) => ({
          id: inputs.constants.FESTIVAL_ANCHOR_IDS[fest],
          title: fest
        }))
      },
      {
        id: 'panel-related',
        title: '间隔记录',
        children: INTERVAL_RECORD_ITEMS.map((item) => ({ id: item.id, title: item.title }))
      },
      {
        id: 'panel-duo',
        title: '双人统计',
        children: DUO_STAT_ITEMS.map((item) => ({ id: item.id, title: item.title }))
      },
      {
        id: 'panel-special',
        title: '特殊统计',
        children: SPECIAL_STAT_ITEMS.map((item) => ({ id: item.id, title: item.title }))
      },
      {
        id: 'panel-lineup',
        title: '日挑配队',
        children: lineupUnitNavChildren.value
      },
      {
        id: 'panel-support',
        title: '支援配队',
        children: supportUnitNavChildren.value
      },
      {
        id: 'panel-attr-summary',
        title: '花色统计',
        children: attrSummaryUnitNavChildren.value
      },
      {
        id: 'panel-year',
        title: '年份统计',
        children: inputs.yearStats.yearPanels.value.map(panel => ({
          id: panel.anchorId,
          title: panel.navTitle
        }))
      },
      {
        id: 'panel-matrix',
        title: '角色矩阵',
        children: []
      },
      {
        id: 'panel-vs-matrix',
        title: '虚拟歌手矩阵',
        children: []
      },
      {
        id: 'panel-nuigurumi',
        title: '烤森娃娃',
        children: []
      }
    ];
  });

  const navTargetIds = computed(() => {
    const ids = [];
    navGroups.value.forEach((g) => {
      ids.push(g.id);
      (g.children || []).forEach((c) => ids.push(c.id));
    });
    return ids;
  });

  return {
    navTargetIds,
    navGroups,
    getUnitNavTitle,
    getRelatedRecordTitle,
  };
}
