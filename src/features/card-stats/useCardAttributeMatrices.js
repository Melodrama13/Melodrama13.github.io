import { ref, computed } from 'vue';
import { buildCharacterCardAttributeMatrixRows } from './characterCardAttributeMatrixRows.js';
import { buildAffiliatedVsCardAttributeMatrixRows } from './affiliatedVsCardAttributeMatrixRows.js';

/** Owns card attribute matrices behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardAttributeMatrices(inputs) {
  const matrixSortKey = ref('');

  const matrixSortOrder = ref('');

  const suppressMatrixViewportAnchor = ref(false);

  let matrixSortAnchorTimer = 0;

  const disableMatrixViewportAnchorTemporarily = () => {
    suppressMatrixViewportAnchor.value = true;
    if (matrixSortAnchorTimer) {
      clearTimeout(matrixSortAnchorTimer);
    }
    matrixSortAnchorTimer = setTimeout(() => {
      suppressMatrixViewportAnchor.value = false;
      matrixSortAnchorTimer = 0;
    }, 200);
  };

  const toggleMatrixSort = (key) => {
    void inputs.navigation.withInteractionPinnedPosition(() => {
      disableMatrixViewportAnchorTemporarily();
      if (matrixSortKey.value !== key) {
        matrixSortKey.value = key;
        matrixSortOrder.value = 'desc';
        return;
      }
      if (matrixSortOrder.value === 'desc') {
        matrixSortOrder.value = 'asc';
        return;
      }
      if (matrixSortOrder.value === 'asc') {
        matrixSortKey.value = '';
        matrixSortOrder.value = '';
        return;
      }
      matrixSortOrder.value = 'desc';
    });
  };

  const getMatrixSortIconSrc = (key) => {
    if (matrixSortKey.value !== key || !matrixSortOrder.value) return '/data/icon/circle_arrow_up_down.png';
    return matrixSortOrder.value === 'desc' ? '/data/icon/circle_arrow_down.png' : '/data/icon/circle_arrow_up.png';
  };

  const isMatrixDefaultSort = computed(() => !matrixSortKey.value || !matrixSortOrder.value);

  const buildMatrixUnitFrameMap = (rows) => {
    const map = new Map();
    if (!isMatrixDefaultSort.value) return map;
    rows.forEach((row, idx) => {
      const unit = inputs.metadata.getUnitByChar(row.name);
      const prevUnit = idx > 0 ? inputs.metadata.getUnitByChar(rows[idx - 1].name) : null;
      const nextUnit = idx < rows.length - 1 ? inputs.metadata.getUnitByChar(rows[idx + 1].name) : null;
      map.set(row.name, {
        start: unit !== prevUnit,
        end: unit !== nextUnit
      });
    });
    return map;
  };

  const matrixUnitFrameMap = computed(() => buildMatrixUnitFrameMap(attrMatrixRows.value));

  const vsMatrixUnitFrameMap = computed(() => buildMatrixUnitFrameMap(virtualSingerMatrixRows.value));

  const getMatrixUnitFrameClass = (name, matrixType = 'char') => {
    const frameMap = matrixType === 'vs' ? vsMatrixUnitFrameMap.value : matrixUnitFrameMap.value;
    const info = frameMap.get(name);
    if (!info) return [];
    return [
      'matrix-unit-framed',
      info.start ? 'matrix-unit-group-start-row' : '',
      info.end ? 'matrix-unit-group-end-row' : ''
    ].filter(Boolean);
  };

  const matrixGroupClass = (idx, len) => ({
    'matrix-group-start': idx === 0,
    'matrix-group-end': idx === len - 1
  });

  const attrMatrixRows = computed(() => buildCharacterCardAttributeMatrixRows({
    stats: inputs.distribution.processedStats.value,
    characterOrder: inputs.metadata.CHAR_ORDER,
    sortKey: matrixSortKey.value,
    sortOrder: matrixSortOrder.value
  }));

  const createMatrixStatSeed = (name) => ({
    name,
    fourStarCount: 0,
    pScoreCount: 0,
    twoStarCount: 0,
    threeStarCount: 0,
    rewardTwoCount: 0,
    rewardThreeCount: 0,
    accuracyCount: 0,
    recoveryCount: 0,
    unitScoreCount: 0,
    pendingSkillCount: 0,
    pureScoreCount: 0,
    scoreUpCount: 0,
    rewardTotalCount: 0,
    attrCounts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
  });

  const parseVsMatrixRowName = (name) => {
    const [baseName, unitRaw] = String(name || '').trim().split(/\s+/);
    return {
      baseName,
      unit: String(unitRaw || '').toLowerCase()
    };
  };

  const compareVsMatrixName = (aName, bName) => {
    const a = parseVsMatrixRowName(aName);
    const b = parseVsMatrixRowName(bName);
    const au = inputs.constants.VS_UNIT_SORT_ORDER.indexOf(a.unit);
    const bu = inputs.constants.VS_UNIT_SORT_ORDER.indexOf(b.unit);
    const aUnitOrder = au >= 0 ? au : 999;
    const bUnitOrder = bu >= 0 ? bu : 999;
    if (aUnitOrder !== bUnitOrder) return aUnitOrder - bUnitOrder;
    const ac = inputs.metadata.CHAR_ORDER[a.baseName] || 999;
    const bc = inputs.metadata.CHAR_ORDER[b.baseName] || 999;
    if (ac !== bc) return ac - bc;
    return String(aName).localeCompare(String(bName), 'zh-Hans-CN');
  };

  const virtualSingerMatrixRows = computed(() => buildAffiliatedVsCardAttributeMatrixRows({
    cards: inputs.props.allCards || [],
    maxEventId: inputs.eventCatalog.safeMaxEventId.value,
    includeUnitScoreInPureScore: inputs.distribution.includeUnitScoreInPureScore.value,
    isCardWithinLimit: inputs.eventCatalog.isCardWithinLimit,
    normalizeCardStatsAttribute: inputs.eventCatalog.normalizeCardStatsAttribute,
    isEventRewardCard: inputs.distribution.isEventRewardCard,
    singerNames: inputs.metadata.VS_NAMES,
    unitSortOrder: inputs.constants.VS_UNIT_SORT_ORDER,
    sortKey: matrixSortKey.value,
    sortOrder: matrixSortOrder.value,
    createMatrixStatSeed,
    compareVsMatrixName
  }));

  const attrMatrixTotalRow = computed(() => {
    const seed = {
      Pure: 0,
      Cool: 0,
      Cute: 0,
      Happy: 0,
      Mysterious: 0,
      unitScoreCount: 0,
      pureScoreCount: 0,
      scoreUpCount: 0,
      pScoreCount: 0,
      accuracyCount: 0,
      recoveryCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      rewardTotalCount: 0
    };

    return (attrMatrixRows.value || []).reduce((acc, row) => {
      inputs.constants.ATTRS.forEach((attr) => {
        acc[attr] += Number(row?.[attr] || 0);
      });
      acc.unitScoreCount += Number(row?.unitScoreCount || 0);
      acc.pureScoreCount += Number(row?.pureScoreCount || 0);
      acc.scoreUpCount += Number(row?.scoreUpCount || 0);
      acc.pScoreCount += Number(row?.pScoreCount || 0);
      acc.accuracyCount += Number(row?.accuracyCount || 0);
      acc.recoveryCount += Number(row?.recoveryCount || 0);
      acc.fourStarCount += Number(row?.fourStarCount || 0);
      acc.threeStarCount += Number(row?.threeStarCount || 0);
      acc.twoStarCount += Number(row?.twoStarCount || 0);
      acc.rewardTotalCount += Number(row?.rewardTotalCount || 0);
      return acc;
    }, seed);
  });

  const getVsUnitTotalTint = (unit) => inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS[unit] || '#64748b', 0.2);

  const virtualSingerUnitTotalRows = computed(() => {
    const unitRows = Object.fromEntries(inputs.constants.VS_UNIT_SORT_ORDER.map((unit) => [unit, {
      unit,
      Pure: 0,
      Cool: 0,
      Cute: 0,
      Happy: 0,
      Mysterious: 0,
      unitScoreCount: 0,
      pureScoreCount: 0,
      scoreUpCount: 0,
      pScoreCount: 0,
      accuracyCount: 0,
      recoveryCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      rewardTotalCount: 0
    }]));

    (virtualSingerMatrixRows.value || []).forEach((row) => {
      const unit = parseVsMatrixRowName(row?.name).unit;
      if (!unitRows[unit]) return;
      inputs.constants.ATTRS.forEach((attr) => {
        unitRows[unit][attr] += Number(row?.[attr] || 0);
      });
      unitRows[unit].unitScoreCount += Number(row?.unitScoreCount || 0);
      unitRows[unit].pureScoreCount += Number(row?.pureScoreCount || 0);
      unitRows[unit].scoreUpCount += Number(row?.scoreUpCount || 0);
      unitRows[unit].pScoreCount += Number(row?.pScoreCount || 0);
      unitRows[unit].accuracyCount += Number(row?.accuracyCount || 0);
      unitRows[unit].recoveryCount += Number(row?.recoveryCount || 0);
      unitRows[unit].fourStarCount += Number(row?.fourStarCount || 0);
      unitRows[unit].threeStarCount += Number(row?.threeStarCount || 0);
      unitRows[unit].twoStarCount += Number(row?.twoStarCount || 0);
      unitRows[unit].rewardTotalCount += Number(row?.rewardTotalCount || 0);
    });

    const baseRows = inputs.constants.VS_UNIT_SORT_ORDER.map((unit) => unitRows[unit]);
    const key = matrixSortKey.value;
    const order = matrixSortOrder.value;
    if (!key || !order) return baseRows;

    const orderFactor = order === 'desc' ? -1 : 1;
    return [...baseRows].sort((a, b) => {
      const av = Number(a?.[key] || 0);
      const bv = Number(b?.[key] || 0);
      if (av !== bv) return (av - bv) * orderFactor;
      const au = inputs.constants.VS_UNIT_SORT_ORDER.indexOf(String(a?.unit || ''));
      const bu = inputs.constants.VS_UNIT_SORT_ORDER.indexOf(String(b?.unit || ''));
      const ao = au >= 0 ? au : 999;
      const bo = bu >= 0 ? bu : 999;
      return ao - bo;
    });
  });

  const buildUnitAttrExtremes = (rows) => {
    const result = {};
    const unitBuckets = {};
    rows.forEach((row) => {
      const unit = inputs.metadata.getUnitByChar(row.name);
      if (!unitBuckets[unit]) unitBuckets[unit] = [];
      unitBuckets[unit].push(row);
    });

    Object.entries(unitBuckets).forEach(([unit, rows]) => {
      const values = rows.flatMap((r) => inputs.constants.ATTRS.map((attr) => Number(r[attr]) || 0));
      const max = values.length ? Math.max(...values) : 0;
      const min = values.length ? Math.min(...values) : 0;
      result[unit] = { max, min };
    });

    return result;
  };

  const unitAttrExtremes = computed(() => buildUnitAttrExtremes(attrMatrixRows.value));

  const getAttrExtremeClass = (attr, value, name) => {
    void attr;
    const unit = inputs.metadata.getUnitByChar(name);
    const range = unitAttrExtremes.value?.[unit];
    if (!range) return '';
    if (range.max !== range.min && value === range.max) return 'matrix-max';
    if (range.max !== range.min && value === range.min) return 'matrix-min';
    return '';
  };

  const getVsMatrixValueClass = (value) => (Number(value || 0) === 0 ? 'matrix-vs-zero' : '');

  const getAttrSummaryAttrRowStyle = (attr) => {
    const color = inputs.constants.ATTR_COLORS[String(attr || '').trim()] || '#94a3b8';
    return { '--attr-summary-row-bg': inputs.presentation.hexToSoftSolid(color, 0.84) };
  };

  return {
    get matrixSortAnchorTimer() { return matrixSortAnchorTimer; },
    set matrixSortAnchorTimer(value) { matrixSortAnchorTimer = value; },
    getAttrSummaryAttrRowStyle,
    matrixGroupClass,
    toggleMatrixSort,
    getMatrixSortIconSrc,
    attrMatrixRows,
    getMatrixUnitFrameClass,
    getAttrExtremeClass,
    attrMatrixTotalRow,
    virtualSingerMatrixRows,
    parseVsMatrixRowName,
    getVsMatrixValueClass,
    virtualSingerUnitTotalRows,
    getVsUnitTotalTint,
    suppressMatrixViewportAnchor,
  };
}
