import { computed } from "vue";
import { getBaseName, hexToRgb, rgbaFromHex, mixHexWithWhite, normalizeId } from './specialPredictionFormatters.js';
import { mergeCollaborationCardPredictions } from '../../domain/collaborationEvents.js';

/** Owns special prediction case rows with explicit instance dependencies. */
export function useSpecialCaseRows(ports = {}) {
const buildMemberGradient = (cards, fallbackColor) => {
  const colors = (Array.isArray(cards) ? cards : [])
    .map((card) => ports.metadata.charMap.value[getBaseName(card?.Name)]?.color)
    .filter((color) => !!hexToRgb(color));
  const unique = [...new Set(colors)];
  if (unique.length === 0) {
    return `linear-gradient(135deg, ${rgbaFromHex(fallbackColor, 0.7)}, rgba(255, 255, 255, 0.72) 56%, ${rgbaFromHex(fallbackColor, 0.2)})`;
  }
  if (unique.length === 1) {
    return `linear-gradient(135deg, ${rgbaFromHex(unique[0], 0.72)}, rgba(255, 255, 255, 0.7) 56%, ${rgbaFromHex(unique[0], 0.22)})`;
  }
  const step = 100 / Math.max(1, unique.length - 1);
  const stops = unique.map((color, index) => `${rgbaFromHex(color, 0.68)} ${Math.round(index * step)}%`).join(', ');
  return `linear-gradient(135deg, ${stops})`;
};

const buildMemberBorderGradient = (cards, fallbackColor) => {
  const colors = (Array.isArray(cards) ? cards : [])
    .map((card) => ports.metadata.charMap.value[getBaseName(card?.Name)]?.color)
    .filter((color) => !!hexToRgb(color));
  const unique = [...new Set(colors)];
  if (unique.length === 0) return `linear-gradient(135deg, ${fallbackColor}, #ffffff, ${fallbackColor})`;
  if (unique.length === 1) return `linear-gradient(135deg, ${unique[0]}, #ffffff, ${unique[0]})`;
  const step = 100 / Math.max(1, unique.length - 1);
  return `linear-gradient(135deg, ${unique.map((color, index) => `${color} ${Math.round(index * step)}%`).join(', ')})`;
};

const buildCollabMemberGradient = (cards, fallbackColor) => {
  const colors = (Array.isArray(cards) ? cards : [])
    .map((card) => ports.metadata.charMap.value[getBaseName(card?.Name)]?.color)
    .filter((color) => !!hexToRgb(color));
  const unique = [...new Set(colors)];
  if (unique.length === 0) {
    const pale = mixHexWithWhite(fallbackColor, 0.54);
    return `linear-gradient(135deg, ${pale}, #ffffff 52%, ${pale})`;
  }
  if (unique.length === 1) {
    const pale = mixHexWithWhite(unique[0], 0.54);
    return `linear-gradient(135deg, ${pale}, #ffffff 52%, ${pale})`;
  }
  const step = 100 / Math.max(1, unique.length - 1);
  return `linear-gradient(135deg, ${unique.map((color, index) => (
    `${mixHexWithWhite(color, 0.54)} ${Math.round(index * step)}%`
  )).join(', ')})`;
};

const annotateCards = (cards, bannerName) => {
  const bannerBase = getBaseName(bannerName);
  return (Array.isArray(cards) ? cards : []).map((card) => ({
    ...card,
    isBanner: !!bannerBase && getBaseName(card?.Name) === bannerBase,
    ribbonLabel: ports.eventCatalog.getLimitedRibbonLabel(card)
  }));
};

const normalizeCaseSignatureValue = (value) => {
  if (Array.isArray(value)) return value.map(normalizeCaseSignatureValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b, 'en'))
        .map((key) => [key, normalizeCaseSignatureValue(value[key])])
    );
  }
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value.trim() : value;
};

const getCaseSignature = (cards, includeAllSkills = false) => (Array.isArray(cards) ? cards : [])
  .map((card) => {
    const includeSkill = includeAllSkills || ports.eventCatalog.isFesCard(card);
    const comparable = Object.fromEntries(
      Object.keys(card || {})
        .filter((key) => includeSkill || key.toLowerCase() !== 'skill')
        .sort((a, b) => a.localeCompare(b, 'en'))
        .map((key) => [key, normalizeCaseSignatureValue(card[key])])
    );
    return JSON.stringify(comparable);
  })
  .sort((a, b) => a.localeCompare(b, 'zh-CN'))
  .join('|');

const sortCaseCards = (cards) => (Array.isArray(cards) ? cards : [])
  .map((card, index) => ({ card, index }))
  .sort((a, b) => {
    const rarityDelta = Number(b.card?.Rarity || 0) - Number(a.card?.Rarity || 0);
    return rarityDelta || a.index - b.index;
  })
  .map(({ card }) => card);

const buildCaseMemberSlots = (cards) => {
  const fourStars = (Array.isArray(cards) ? cards : []).filter((card) => Number(card?.Rarity) === 4);
  const lowStars = (Array.isArray(cards) ? cards : []).filter((card) => Number(card?.Rarity) !== 4);
  const slots = new Array(8).fill(null);
  fourStars.slice(0, 4).forEach((card, index) => { slots[index] = card; });
  [...fourStars.slice(4), ...lowStars].slice(0, 4).forEach((card, index) => { slots[index + 4] = card; });
  return slots;
};

const getCaseMemberSlots = (caseItem, isSingleCase) => (
  isSingleCase ? (caseItem?.normalCards || []) : (caseItem?.memberSlots || [])
);

const buildFesGroups = (cards, bannerBase) => {
  const groups = [];
  const definitions = [
    { key: 'bfes', label: 'BFES', logo: '/elements/bfes.webp' },
    { key: 'cfes', label: 'CFES', logo: '/elements/cfes.webp' }
  ];
  definitions.forEach((definition) => {
    const matched = annotateCards((Array.isArray(cards) ? cards : []).filter((card) => (
      String(card?.Type || '').trim().toLowerCase() === definition.key
    )), bannerBase);
    if (matched.length > 0) groups.push({ ...definition, cards: matched.slice(0, 4) });
  });
  return groups;
};

const buildRenderedCase = ({ base, patch, source, caseIndex = 0, multi = false }) => {
  const idKey = normalizeId(base?.id);
  const isCollab = ports.eventCatalog.isCollaborationEvent(base);
  const sourceCards = ports.metadata.baseCardsByEventId.value.get(idKey) || [];
  const event = isCollab ? base : { ...base, ...patch };
  const cards = isCollab ? mergeCollaborationCardPredictions(sourceCards, patch?.memberCards)
    : Array.isArray(patch?.memberCards)
    ? patch.memberCards
    : sourceCards;
  const bannerBase = isCollab ? '' : getBaseName(event.banner);
  const fesGroups = multi ? buildFesGroups(cards, bannerBase) : [];
  const bfesCards = multi ? [] : annotateCards(cards.filter(ports.eventCatalog.isBfesCard), bannerBase);
  const normalSourceCards = isCollab ? cards : multi
    ? sortCaseCards(cards.filter((card) => !ports.eventCatalog.isFesCard(card)))
    : cards.filter((card) => !ports.eventCatalog.isBfesCard(card));
  const normalCards = annotateCards(normalSourceCards, bannerBase);
  const memberSlots = multi && !isCollab ? buildCaseMemberSlots(normalCards) : normalCards;
  const eventType = isCollab ? '联动' : ports.eventCatalog.getEventType(event);
  const resolvedUnit = ports.eventCatalog.getEventUnit(event) || ports.eventCatalog.resolveUnitFromCards(cards);
  const colorName = bannerBase
    || getBaseName(normalCards.find((card) => !ports.metadata.vsNameSet.value.has(getBaseName(card?.Name)))?.Name)
    || getBaseName(normalCards[0]?.Name);
  const mainColor = ports.metadata.charMap.value[colorName]?.color || '#14b8a6';
  const detailKind = eventType === 'World Link'
    ? 'wl'
    : (isCollab ? 'collab' : (eventType === '箱活' ? 'box' : (eventType === '混活' ? 'mixed' : 'unknown')));
  const rowGradient = detailKind === 'collab'
    ? buildCollabMemberGradient(normalCards, mainColor)
    : detailKind === 'wl'
    ? buildMemberGradient(normalCards, mainColor)
    : `linear-gradient(115deg, ${rgbaFromHex(mainColor, 0.7)}, rgba(255, 255, 255, 0.74) 84%, ${rgbaFromHex(mainColor, 0.18)}), linear-gradient(90deg, ${rgbaFromHex(mainColor, 0.34)}, rgba(255, 255, 255, 0.65))`;
  return {
    caseIndex,
    caseLabel: `Case ${caseIndex + 1}`,
    sourceId: source?.id || '',
    sourceName: source?.name || '',
    sourceIds: source?.id ? [source.id] : [],
    sourceNames: source?.name ? [source.name] : [],
    eventType,
    hasPrediction: !!patch,
    isCollab,
    detailKind,
    detailKindClass: `is-${detailKind}`,
    rowClass: `${ports.eventCatalog.getRowLimitClass(event, cards)}${isCollab ? ' is-collab-event' : ''}`.trim(),
    unitLabel: resolvedUnit.toUpperCase(),
    unitLogo: ports.noteTokens.UNIT_LOGOS[resolvedUnit] || '',
    seriesLabel: isCollab ? '' : ports.eventCatalog.buildSeriesLabel(event),
    detailStyle: {
      '--special-row-gradient': rowGradient,
      '--special-collab-border-gradient': buildMemberBorderGradient(normalCards, mainColor),
      '--special-row-color-soft': rgbaFromHex(mainColor, 0.7),
      '--special-row-color-pale': rgbaFromHex(mainColor, 0.18),
      '--special-row-color-light': rgbaFromHex(mainColor, 0.34)
    },
    normalCards: isCollab ? normalCards : normalCards.slice(0, multi ? 8 : 6),
    memberSlots,
    bfesCards: bfesCards.slice(0, 4),
    fesGroups
  };
};

const renderedRows = computed(() => {
  const range = ports.rangeSelection.effectiveRange.value;
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end)) return [];

  return ports.eventCatalog.numericEvents.value
    .filter(({ event, idNum }) => ports.eventCatalog.isPredictableBaseEvent(event) && idNum >= range.start && idNum <= range.end)
    .map(({ event: base, index, scheduleIndex }) => {
      const idKey = normalizeId(base.id);
      const patch = ports.eventCatalog.predictPatchById.value.get(idKey) || null;
      if (!patch && !ports.rangeSelection.showUnpredictedRows.value) return null;
      const renderedCase = buildRenderedCase({ base, patch, source: ports.sourceSelection.selectedSource.value });

      return {
        key: `${idKey || 'unknown'}-${index}`,
        id: idKey || '-',
        sortKey: scheduleIndex,
        ...renderedCase,
        startDate: ports.eventCatalog.formatDate(base.start_date || base.date || patch?.start_date || patch?.date),
        endDate: ports.eventCatalog.formatDate(base.end_date || patch?.end_date)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((row, index, rows) => {
      const monthInfo = ports.eventCatalog.getMonthInfoFromDate(row.endDate || row.startDate);
      const prevMonthInfo = index > 0 ? ports.eventCatalog.getMonthInfoFromDate(rows[index - 1]?.endDate || rows[index - 1]?.startDate) : null;
      return {
        ...row,
        monthLabel: monthInfo && monthInfo.key !== prevMonthInfo?.key ? monthInfo.label : ''
      };
    });
});

const multiCaseRows = computed(() => {
  const range = ports.rangeSelection.effectiveRange.value;
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end)) return [];
  return ports.eventCatalog.numericEvents.value
    .filter(({ event, idNum }) => ports.eventCatalog.isPredictableBaseEvent(event) && idNum >= range.start && idNum <= range.end)
    .map(({ event: base, index, scheduleIndex }) => {
      const idKey = normalizeId(base.id);
      const groupedCases = new Map();
      ports.sourceSelection.selectedMultiSources.value.forEach((source) => {
        const patch = ports.eventCatalog.multiPredictPatchMaps.value.get(source.id)?.get(idKey) || null;
        if (!patch) return;
        const isCollab = ports.eventCatalog.isCollaborationEvent(base);
        const cards = isCollab
          ? mergeCollaborationCardPredictions(ports.metadata.baseCardsByEventId.value.get(idKey) || [], patch?.memberCards)
          : Array.isArray(patch?.memberCards)
          ? patch.memberCards
          : (ports.metadata.baseCardsByEventId.value.get(idKey) || []);
        const signature = getCaseSignature(cards, isCollab);
        const existing = groupedCases.get(signature);
        if (existing) {
          existing.sourceIds.push(source.id);
          existing.sourceNames.push(source.name);
          return;
        }
        groupedCases.set(signature, buildRenderedCase({
          base,
          patch,
          source,
          caseIndex: groupedCases.size,
          multi: true
        }));
      });
      if (groupedCases.size === 0 && ports.rangeSelection.showUnpredictedRows.value && ports.sourceSelection.selectedMultiSources.value.length > 0) {
        const source = ports.sourceSelection.selectedMultiSources.value[0];
        groupedCases.set('__unpredicted__', buildRenderedCase({ base, patch: null, source, multi: true }));
      }
      const edit = ports.manualCases.manualCaseEditsByEvent.value[idKey] || { removedCaseKeys: [], manualCases: [] };
      const removedKeys = new Set(edit.removedCaseKeys || []);
      const cases = [...groupedCases.entries()]
        .map(([signature, item]) => ({
          ...item,
          caseKey: `source:${signature}`,
          noteSourceId: item.sourceIds.find((sourceId) => ports.eventNotes.getEventNote(idKey, sourceId).text) || item.sourceId
        }))
        .filter((item) => !removedKeys.has(item.caseKey));

      // Roster commands apply to normal events; collaboration rosters come only from source cards.
      (ports.eventCatalog.isCollaborationEvent(base) ? [] : edit.manualCases || []).forEach((manualCase) => {
        const manualCards = Array.from({ length: 8 }, (_, slot) => (
          ports.manualCases.parseManualCaseCardCommand(manualCase.commands?.[slot], idKey, slot)
        ));
        const noteSourceId = ports.eventNotes.getManualCaseNoteSourceId(manualCase.id);
        const renderedManualCase = {
          ...buildRenderedCase({
            base,
            patch: {
              ...(manualCase.basePatch || {}),
              memberCards: manualCards.filter(Boolean)
            },
            source: { id: noteSourceId, name: '手动 Case' },
            multi: true
          }),
          caseKey: `manual:${manualCase.id}`,
          isManual: true,
          manualId: manualCase.id,
          afterCaseKey: manualCase.afterCaseKey,
          commands: manualCase.commands,
          manualCards,
          memberSlots: manualCards,
          noteSourceId
        };
        const afterIndex = cases.findIndex((item) => item.caseKey === manualCase.afterCaseKey);
        let insertIndex = afterIndex >= 0 ? afterIndex + 1 : cases.length;
        while (cases[insertIndex]?.isManual && cases[insertIndex].afterCaseKey === manualCase.afterCaseKey) insertIndex += 1;
        cases.splice(insertIndex, 0, renderedManualCase);
      });

      cases.forEach((item, caseIndex) => {
        item.caseIndex = caseIndex;
        item.caseLabel = `Case ${caseIndex + 1}`;
      });
      if (cases.length === 0) return null;
      const firstCase = cases[0];
      const firstPatch = ports.eventCatalog.multiPredictPatchMaps.value.get(firstCase.sourceId)?.get(idKey) || null;
      return {
        key: `multi-${idKey || 'unknown'}-${index}`,
        id: idKey || '-',
        sortKey: scheduleIndex,
        startDate: ports.eventCatalog.formatDate(base.start_date || base.date || firstPatch?.start_date || firstPatch?.date),
        endDate: ports.eventCatalog.formatDate(base.end_date || firstPatch?.end_date),
        isCollab: firstCase.isCollab,
        rowClass: firstCase.rowClass,
        detailStyle: firstCase.detailStyle,
        cases
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortKey - b.sortKey);
});

const monthlyMultiPages = computed(() => {
  const pages = [];
  multiCaseRows.value.forEach((row) => {
    const monthInfo = ports.eventCatalog.getMonthInfoFromDate(row.endDate || row.startDate) || { key: 'undated', label: '月份未定' };
    let page = pages.find((item) => item.key === monthInfo.key);
    if (!page) {
      page = { key: monthInfo.key, label: monthInfo.label, rows: [] };
      pages.push(page);
    }
    page.rows.push(row);
  });
  return pages;
});

return { buildMemberGradient,
buildMemberBorderGradient,
buildCollabMemberGradient,
annotateCards,
normalizeCaseSignatureValue,
getCaseSignature,
sortCaseCards,
buildCaseMemberSlots,
getCaseMemberSlots,
buildFesGroups,
buildRenderedCase,
renderedRows,
multiCaseRows,
monthlyMultiPages };
}
