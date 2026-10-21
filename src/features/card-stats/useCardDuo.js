import { ref, computed, reactive } from 'vue';
import { isDuoCollaborationEvent } from './cardDuoRules.js';

/** Owns card duo behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardDuo(inputs) {
  const DEFAULT_DUO_UNIT_POOL_FILTERS = Object.freeze(['box', 'wl']);

  const duoUnitPoolFilters = ref([...DEFAULT_DUO_UNIT_POOL_FILTERS]);

  const duoUnitPoolFiltersByUnit = reactive({
    ln: [...DEFAULT_DUO_UNIT_POOL_FILTERS],
    mmj: [...DEFAULT_DUO_UNIT_POOL_FILTERS],
    vbs: [...DEFAULT_DUO_UNIT_POOL_FILTERS],
    ws: [...DEFAULT_DUO_UNIT_POOL_FILTERS],
    nc: [...DEFAULT_DUO_UNIT_POOL_FILTERS]
  });

  const duoPoolFilters = ref(['mix', 'wl']);

  const duoEventFilters = ref(['mix', 'wl']);

  const duoLastPoolShowCardImages = ref(false);

  const duoLastPoolShowCardImagesByUnit = reactive({
    ln: false,
    mmj: false,
    vbs: false,
    ws: false,
    nc: false
  });

  const isDuoWorldLinkEvent = (event) => {
    const eventType = String(event?.event_type || '').trim();
    const lower = eventType.toLowerCase();
    return lower === 'wl' || lower === 'world link' || eventType === 'World Link终章';
  };

  const isDuoCollabEvent = isDuoCollaborationEvent;

  const isDuoFesCard = (card) => {
    const cardType = String(card?.Type || '').trim().toLowerCase();
    const skillKind = String(card?.Skill || '').trim().toLowerCase();
    return inputs.presentation.isFesCardType(cardType) || skillKind === 'bfes_up' || skillKind.startsWith('cfes');
  };

  const EARLY_SPLIT_FES_EVENT_IDS = new Set(['18', '27']);

  const isEarlySplitFesEvent = (event) => EARLY_SPLIT_FES_EVENT_IDS.has(inputs.eventCatalog.normalizeSourceKey(event?.id));

  const getDuoFilterSet = (filters) => new Set(Array.isArray(filters) ? filters : []);

  const matchDuoEventFilters = (event, filters) => {
    const selected = getDuoFilterSet(filters);
    if (selected.has('box') && String(event?.event_type || '').trim() === '箱活') return true;
    if (selected.has('mix') && String(event?.event_type || '').trim() === '混活') return true;
    if (selected.has('wl') && isDuoWorldLinkEvent(event)) return true;
    if (selected.has('collab') && isDuoCollabEvent(event)) return true;
    return false;
  };

  const duoFiltersIncludeFes = (filters) => getDuoFilterSet(filters).has('fes');

  const duoFiltersLimitedOnly = (filters) => getDuoFilterSet(filters).has('limited');

  const duoFiltersOwnUnitVsOnly = (filters) => getDuoFilterSet(filters).has('ownVs');

  const isDuoLimitedCard = (card) => {
    const cardType = String(card?.Type || '').trim().toLowerCase();
    if (cardType === 'limited') return true;
    if (cardType === 'collab' || cardType === 'collab_t') return true;
    if (cardType === 'wl1' || cardType === 'wl2' || cardType === 'wl3') return true;
    return inputs.presentation.isFesCardType(cardType);
  };

  const isDuoEventWithinLimit = (event) => {
    if (inputs.eventCatalog.shouldSkipPredictEvent(event)) return false;
    if (inputs.constants.EXCLUDED_PERIOD_EVENT_TYPES.has(String(event?.event_type || '').trim())) return false;

    const maxEid = Number(inputs.eventCatalog.safeMaxEventId.value);
    const idRaw = inputs.eventCatalog.normalizeSourceKey(event?.id);
    if (inputs.eventCatalog.isNumericEventId(idRaw)) {
      return Number(idRaw) <= maxEid;
    }

    const cutoffDate = inputs.eventCatalog.getStatsCutoffDate(maxEid);
    if (!cutoffDate) return true;
    const eventDate = inputs.presentation.parseDateSafe(event?.start_date || event?.date);
    if (!eventDate) return true;
    if (eventDate.getTime() !== cutoffDate.getTime()) return eventDate < cutoffDate;
    return true;
  };

  const getDuoEventCards = (event) => {
    const cardsInEvent = Array.isArray(event?.memberCards) ? event.memberCards.filter(Boolean) : [];
    if (cardsInEvent.length > 0) return cardsInEvent;
    const eid = inputs.eventCatalog.normalizeSourceKey(event?.id);
    if (!eid) return [];
    return (inputs.props.allCards || []).filter((card) => inputs.eventCatalog.normalizeSourceKey(card?.EventID) === eid);
  };

  const normalizeDuoParticipantName = (name) => {
    const baseName = inputs.metadata.normalizeCharName(name);
    if (!baseName) return '';
    if (!inputs.metadata.CHAR_ORDER[baseName] && !inputs.metadata.VS_NAMES.includes(baseName)) return '';
    return baseName;
  };

  const getDuoParticipantName = (participant) => (
    typeof participant === 'string'
      ? normalizeDuoParticipantName(participant)
      : normalizeDuoParticipantName(participant?.name)
  );

  const getDuoParticipantVsUnit = (participant) => (
    typeof participant === 'string'
      ? ''
      : String(participant?.vsUnit || '').trim().toLowerCase()
  );

  const getDuoCardVsUnit = (card, name) => {
    if (!inputs.metadata.VS_NAMES.includes(name)) return '';
    const aff = String(card?.Affiliation || '').trim().toLowerCase();
    return inputs.constants.DUO_OC_UNITS.includes(aff) ? aff : '';
  };

  const makeDuoParticipantEntry = (nameRaw, source = null) => {
    const name = normalizeDuoParticipantName(nameRaw);
    if (!name) return null;
    const sourceUnit = String(source?.unit || '').trim().toLowerCase();
    return {
      name,
      vsUnit: inputs.metadata.VS_NAMES.includes(name) && inputs.constants.DUO_OC_UNITS.includes(sourceUnit) ? sourceUnit : ''
    };
  };

  const makeDuoCardParticipantEntry = (card) => {
    const name = normalizeDuoParticipantName(card?.Name);
    if (!name) return null;
    return {
      name,
      vsUnit: getDuoCardVsUnit(card, name)
    };
  };

  const dedupeDuoParticipantEntries = (entries) => {
    const seen = new Set();
    return (Array.isArray(entries) ? entries : []).filter((entry) => {
      const name = getDuoParticipantName(entry);
      if (!name) return false;
      const key = `${name}::${getDuoParticipantVsUnit(entry)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getDuoEventParticipantEntries = (event, options = {}) => {
    const entries = [];
    const includeFes = options?.includeFes === true;
    const limitedOnly = options?.limitedOnly === true;
    if (!limitedOnly) {
      const bannerName = normalizeDuoParticipantName(event?.banner);
      const bannerEntry = makeDuoParticipantEntry(bannerName, { unit: event?.unit });
      if (bannerEntry) entries.push(bannerEntry);
    }

    getDuoEventCards(event).forEach((card) => {
      if (isDuoFesCard(card) && !includeFes) return;
      if (limitedOnly && !isDuoLimitedCard(card)) return;
      const entry = makeDuoCardParticipantEntry(card);
      if (entry) entries.push(entry);
    });

    return dedupeDuoParticipantEntries(entries);
  };

  const getDuoPoolParticipantGroups = (event, options = {}) => {
    const includeFes = options?.includeFes === true;
    const limitedOnly = options?.limitedOnly === true;
    const fourStarCards = getDuoEventCards(event).filter((card) => {
      if (String(card?.Rarity || '').trim() !== '4') return;
      if (isDuoFesCard(card) && !includeFes) return false;
      if (limitedOnly && !isDuoLimitedCard(card)) return false;
      return true;
    });
    const toEntries = (cards) => {
      return dedupeDuoParticipantEntries(cards.map(makeDuoCardParticipantEntry).filter(Boolean));
    };

    if (!isEarlySplitFesEvent(event)) return [toEntries(fourStarCards)].filter((group) => group.length);

    const normalEntries = toEntries(fourStarCards.filter((card) => !isDuoFesCard(card)));
    const fesEntries = includeFes ? toEntries(fourStarCards.filter((card) => isDuoFesCard(card))) : [];
    return [normalEntries, fesEntries].filter((group) => group.length);
  };

  const getDuoFesParticipantNames = (event) => {
    const entries = [];
    getDuoEventCards(event).forEach((card) => {
      if (!isDuoFesCard(card)) return;
      const entry = makeDuoCardParticipantEntry(card);
      if (entry) entries.push(entry);
    });
    return dedupeDuoParticipantEntries(entries);
  };

  const shouldCountDuoParticipantPair = (aEntry, bEntry, options = {}) => {
    if (options?.ownUnitVsOnly !== true) return true;
    const a = getDuoParticipantName(aEntry);
    const b = getDuoParticipantName(bEntry);
    const aIsVs = inputs.metadata.VS_NAMES.includes(a);
    const bIsVs = inputs.metadata.VS_NAMES.includes(b);
    if (aIsVs === bIsVs) return true;
    const ocName = aIsVs ? b : a;
    const vsEntry = aIsVs ? aEntry : bEntry;
    const ocUnit = inputs.metadata.getUnitByChar(ocName);
    return !!ocUnit && getDuoParticipantVsUnit(vsEntry) === ocUnit;
  };

  const addDuoGroupsToMap = (map, groups, valueFactory = null, options = {}) => {
    (Array.isArray(groups) ? groups : []).forEach((participants) => {
      if (!Array.isArray(participants) || participants.length < 2) return;
      for (let i = 0; i < participants.length; i += 1) {
        for (let j = i + 1; j < participants.length; j += 1) {
          const aEntry = participants[i];
          const bEntry = participants[j];
          const a = getDuoParticipantName(aEntry);
          const b = getDuoParticipantName(bEntry);
          if (!a || !b || a === b) continue;
          if (!shouldCountDuoParticipantPair(aEntry, bEntry, options)) continue;
          const key = makeDuoPairKey(a, b);
          if (typeof valueFactory === 'function') {
            map.set(key, valueFactory(key));
          } else {
            map.set(key, (map.get(key) || 0) + 1);
          }
        }
      }
    });
  };

  const makeDuoPairKey = (a, b) => {
    const ao = inputs.metadata.CHAR_ORDER[a] || 999;
    const bo = inputs.metadata.CHAR_ORDER[b] || 999;
    if (ao !== bo) return ao < bo ? `${a}::${b}` : `${b}::${a}`;
    return String(a).localeCompare(String(b), 'zh-Hans-CN') <= 0 ? `${a}::${b}` : `${b}::${a}`;
  };

  const buildDuoEventRef = (event) => ({
    id: inputs.eventCatalog.isNumericEventId(event?.id) ? Number(event.id) : inputs.eventCatalog.normalizeSourceKey(event?.id),
    date: String(event?.start_date || event?.date || '').trim(),
    typeSeriesId: event?.type_series_id,
    eventType: String(event?.event_type || '').trim(),
    banner: String(event?.banner || '').trim(),
    unit: String(event?.unit || '').trim(),
    sourceKey: inputs.eventCatalog.normalizeSourceKey(event?.id)
  });

  const getDuoEventSortTime = (event) => {
    const d = inputs.presentation.parseDateSafe(event?.start_date || event?.date);
    if (d) return d.getTime();
    const idNum = Number(event?.id);
    return Number.isFinite(idNum) ? idNum : 0;
  };

  const buildDuoCountMap = (mode, filters) => {
    const map = new Map();
    const includeFes = duoFiltersIncludeFes(filters);
    const limitedOnly = duoFiltersLimitedOnly(filters);
    const ownUnitVsOnly = duoFiltersOwnUnitVsOnly(filters);
    (inputs.props.allEvents || []).forEach((event) => {
      if (!isDuoEventWithinLimit(event)) return;
      const eventMatchesFilters = matchDuoEventFilters(event, filters);

      if (eventMatchesFilters) {
        const groups = mode === 'event'
          ? [getDuoEventParticipantEntries(event, { includeFes, limitedOnly })]
          : getDuoPoolParticipantGroups(event, { includeFes, limitedOnly });
        addDuoGroupsToMap(map, groups, null, { ownUnitVsOnly });
        return;
      }

      if (includeFes) {
        addDuoGroupsToMap(map, [getDuoFesParticipantNames(event)], null, { ownUnitVsOnly });
      }
    });
    return map;
  };

  const buildDuoLastPoolMap = (filters) => {
    const map = new Map();
    const includeFes = duoFiltersIncludeFes(filters);
    const limitedOnly = duoFiltersLimitedOnly(filters);
    const ownUnitVsOnly = duoFiltersOwnUnitVsOnly(filters);
    (inputs.props.allEvents || [])
      .filter((event) => (
        isDuoEventWithinLimit(event)
        && (matchDuoEventFilters(event, filters) || includeFes)
      ))
      .sort((a, b) => {
        const dt = getDuoEventSortTime(a) - getDuoEventSortTime(b);
        if (dt !== 0) return dt;
        return String(a?.id || '').localeCompare(String(b?.id || ''), 'zh-Hans-CN', { numeric: true });
      })
      .forEach((event) => {
        const eventRef = buildDuoEventRef(event);
        const eventMatchesFilters = matchDuoEventFilters(event, filters);
        const groups = eventMatchesFilters
          ? getDuoPoolParticipantGroups(event, { includeFes, limitedOnly })
          : [getDuoFesParticipantNames(event)];
        addDuoGroupsToMap(map, groups, () => {
          return {
            eventRef,
            eventLabel: inputs.presentation.getNonBanEventMark(eventRef),
            date: eventRef.date
          };
        }, { ownUnitVsOnly });
      });
    return map;
  };

  const getDuoPairCount = (map, rowName, colName) => {
    if (!rowName || !colName || rowName === colName) return null;
    if (rowName === inputs.constants.DUO_VS_TOTAL_KEY || colName === inputs.constants.DUO_VS_TOTAL_KEY) {
      const otherName = rowName === inputs.constants.DUO_VS_TOTAL_KEY ? colName : rowName;
      if (!otherName || otherName === inputs.constants.DUO_VS_TOTAL_KEY || inputs.metadata.VS_NAMES.includes(otherName)) return null;
      return duoVsNames.value.reduce((sum, vsName) => sum + (map.get(makeDuoPairKey(otherName, vsName)) || 0), 0);
    }
    return map.get(makeDuoPairKey(rowName, colName)) || 0;
  };

  const duoOcNames = computed(() => inputs.presentation.toDisplayOrderedCharNames(
    Object.keys(inputs.metadata.CHAR_ORDER).filter((name) => !inputs.metadata.VS_NAMES.includes(name))
  ));

  const duoVsNames = computed(() => inputs.presentation.toDisplayOrderedCharNames([...inputs.metadata.VS_NAMES]));

  const duoRowsAll = computed(() => [...duoOcNames.value, ...duoVsNames.value]);

  const duoUnitCharacters = computed(() => {
    const grouped = Object.fromEntries(inputs.constants.DUO_OC_UNITS.map((unit) => [unit, []]));
    duoOcNames.value.forEach((name) => {
      const unit = inputs.metadata.getUnitByChar(name);
      if (grouped[unit]) grouped[unit].push(name);
    });
    return grouped;
  });

  const buildDuoCharMeta = (name) => {
    if (name === inputs.constants.DUO_VS_TOTAL_KEY) {
      return {
        key: inputs.constants.DUO_VS_TOTAL_KEY,
        name: inputs.constants.DUO_VS_TOTAL_KEY,
        title: 'VS',
        isVs: true,
        isVsTotal: true,
        shortName: 'VS',
        avatarSrc: '/elements/vs.png',
        color: inputs.metadata.UNIT_COLORS.vs || '#111827',
        unit: 'vs',
        tint: inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS.vs || '#111827', 0.1),
        unitTint: inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS.vs || '#111827', 0.14)
      };
    }
    const baseName = inputs.metadata.normalizeCharName(name);
    const isVs = inputs.metadata.VS_NAMES.includes(baseName);
    return {
      key: baseName,
      name: baseName,
      isVs,
      shortName: inputs.presentation.getCharSingleMark(baseName),
      avatarSrc: `/chibi_s/${inputs.metadata.getCharAbbr(baseName)}.webp`,
      color: inputs.metadata.getCharColor(baseName),
      unit: isVs ? 'vs' : inputs.metadata.getUnitByChar(baseName),
      tint: inputs.presentation.getCharTint(baseName),
      unitTint: inputs.presentation.getUnitMatrixTint(baseName)
    };
  };

  const buildDuoMatrixData = (columns, rows, countMap) => {
    const columnMetas = columns.map(buildDuoCharMeta);
    const rowMetas = rows.map(buildDuoCharMeta);
    const isSameUnitOc = (a, b) => !a?.isVs && !b?.isVs && a?.unit && b?.unit && a.unit === b.unit;
    const isVsRegion = (a, b) => !!(a && b && (a.isVs || b.isVs));
    const vsRegionBounds = rowMetas.reduce((bounds, row, rowIndex) => {
      columnMetas.forEach((col, colIndex) => {
        if (!isVsRegion(row, col)) return;
        bounds.minRow = Math.min(bounds.minRow, rowIndex);
        bounds.maxRow = Math.max(bounds.maxRow, rowIndex);
        bounds.minCol = Math.min(bounds.minCol, colIndex);
        bounds.maxCol = Math.max(bounds.maxCol, colIndex);
      });
      return bounds;
    }, {
      minRow: Number.POSITIVE_INFINITY,
      maxRow: Number.NEGATIVE_INFINITY,
      minCol: Number.POSITIVE_INFINITY,
      maxCol: Number.NEGATIVE_INFINITY
    });
    const hasVsRegion = Number.isFinite(vsRegionBounds.minRow) && Number.isFinite(vsRegionBounds.minCol);
    const vsRegionRowCount = hasVsRegion ? (vsRegionBounds.maxRow - vsRegionBounds.minRow + 1) : 0;
    const vsRegionColCount = hasVsRegion ? (vsRegionBounds.maxCol - vsRegionBounds.minCol + 1) : 0;
    return {
      columns: columnMetas,
      rows: rowMetas.map((row, rowIndex) => {
        return {
          ...row,
          cells: columnMetas.map((col, colIndex) => {
            const sameUnit = isSameUnitOc(row, col);
            const vsRegion = isVsRegion(row, col);
            const prevRow = rowMetas[rowIndex - 1] || null;
            const nextRow = rowMetas[rowIndex + 1] || null;
            const prevCol = columnMetas[colIndex - 1] || null;
            const nextCol = columnMetas[colIndex + 1] || null;
            return {
              key: `${row.key}-${col.key}`,
              value: getDuoPairCount(countMap, row.name, col.name),
              row,
              col,
              isDiagonal: row.name === col.name,
              isVsPair: vsRegion,
              isSameUnitOcPair: sameUnit,
              sameUnitTop: sameUnit && !isSameUnitOc(prevRow, col),
              sameUnitBottom: sameUnit && !isSameUnitOc(nextRow, col),
              sameUnitLeft: sameUnit && !isSameUnitOc(row, prevCol),
              sameUnitRight: sameUnit && !isSameUnitOc(row, nextCol),
              vsTop: vsRegion && !isVsRegion(prevRow, col),
              vsBottom: vsRegion && !isVsRegion(nextRow, col),
              vsLeft: vsRegion && !isVsRegion(row, prevCol),
              vsRight: vsRegion && !isVsRegion(row, nextCol),
              vsRegionRowIndex: hasVsRegion ? rowIndex - vsRegionBounds.minRow : 0,
              vsRegionColIndex: hasVsRegion ? colIndex - vsRegionBounds.minCol : 0,
              vsRegionRowCount,
              vsRegionColCount,
              unitColor: sameUnit ? inputs.presentation.getUnitAccentColor(row.unit) : ''
            };
          })
        };
      })
    };
  };

  const getDuoMatrixCellClass = (cell) => ({
    'duo-cell-empty': cell?.value == null && !cell?.isDiagonal,
    'duo-zero': cell?.value === 0 && !cell?.isDiagonal,
    'duo-diagonal': !!cell?.isDiagonal,
    'duo-same-unit-top': !!cell?.sameUnitTop,
    'duo-same-unit-bottom': !!cell?.sameUnitBottom,
    'duo-same-unit-left': !!cell?.sameUnitLeft,
    'duo-same-unit-right': !!cell?.sameUnitRight,
    'duo-vs-top': !!cell?.vsTop && !cell?.isDiagonal,
    'duo-vs-bottom': !!cell?.vsBottom && !cell?.isDiagonal,
    'duo-vs-left': !!cell?.vsLeft && !cell?.isDiagonal,
    'duo-vs-right': !!cell?.vsRight && !cell?.isDiagonal
  });

  const getDuoHeadCellStyle = (meta) => ({
    background: `linear-gradient(0deg, ${meta?.tint || 'rgba(248, 250, 252, 1)'}, ${meta?.tint || 'rgba(248, 250, 252, 1)'}), #ffffff`
  });

  const getDuoMatrixCellStyle = (cell) => {
    const style = {};
    if (cell?.unitColor) style['--duo-cell-unit-color'] = cell.unitColor;
    if (cell?.isVsPair) {
      const rowIndex = Number(cell.vsRegionRowIndex || 0);
      const colIndex = Number(cell.vsRegionColIndex || 0);
      const rowCount = Math.max(1, Number(cell.vsRegionRowCount || 1));
      const colCount = Math.max(1, Number(cell.vsRegionColCount || 1));
      style['--duo-vs-bg-x'] = `${colCount > 1 ? (colIndex / (colCount - 1)) * 100 : 0}%`;
      style['--duo-vs-bg-y'] = `${rowCount > 1 ? (rowIndex / (rowCount - 1)) * 100 : 0}%`;
      style['--duo-vs-region-height'] = `${rowCount * 100}%`;
      style['--duo-vs-region-width'] = `${colCount * 100}%`;
    }
    return style;
  };

  const getDuoUnitPoolFilters = (unit) => {
    const key = String(unit || '').trim().toLowerCase();
    const filters = duoUnitPoolFiltersByUnit[key];
    return Array.isArray(filters) ? filters : duoUnitPoolFilters.value;
  };

  const getDuoUnitShowCardImages = (unit) => {
    const key = String(unit || '').trim().toLowerCase();
    return !!duoLastPoolShowCardImagesByUnit[key];
  };

  const duoUnitPoolCountMap = computed(() => buildDuoCountMap('pool', duoUnitPoolFilters.value));

  const duoPoolCountMap = computed(() => buildDuoCountMap('pool', duoPoolFilters.value));

  const duoEventCountMap = computed(() => buildDuoCountMap('event', duoEventFilters.value));

  const duoUnitLastPoolMap = computed(() => buildDuoLastPoolMap(duoUnitPoolFilters.value));

  const duoUnitPoolCountMaps = computed(() => Object.fromEntries(inputs.constants.DUO_OC_UNITS.map((unit) => [
    unit,
    buildDuoCountMap('pool', getDuoUnitPoolFilters(unit))
  ])));

  const duoUnitLastPoolMaps = computed(() => Object.fromEntries(inputs.constants.DUO_OC_UNITS.map((unit) => [
    unit,
    buildDuoLastPoolMap(getDuoUnitPoolFilters(unit))
  ])));

  const getDuoUnitPairRows = (unitNames, lastMap) => {
    const rows = [];
    for (let i = 0; i < unitNames.length; i += 1) {
      for (let j = i + 1; j < unitNames.length; j += 1) {
        const a = unitNames[i];
        const b = unitNames[j];
        const last = lastMap.get(makeDuoPairKey(a, b)) || null;
        const members = [buildDuoCharMeta(a), buildDuoCharMeta(b)];
        const cards = members.map((member) => {
          const cardInfo = last?.eventRef
            ? inputs.relatedRecords.getRelatedRecordCardInfo(member.name, last.eventRef, { mode: 'four' })
            : { imageSrc: '', attr: '' };
          return {
            key: `${member.key}-card`,
            name: member.name,
            imageSrc: cardInfo.imageSrc,
            attr: cardInfo.attr
          };
        });
        rows.push({
          key: `${a}-${b}`,
          members,
          cards,
          eventRef: last?.eventRef || null,
          eventLabel: last?.eventLabel || '-',
          date: last?.date || '-',
          gapText: last?.date ? `${inputs.presentation.monthsSince(last.date)}个月 | ${last?.eventRef ? inputs.eventCatalog.countPeriodsSince(last.eventRef) : 0}期` : '-',
          tint: inputs.presentation.hexToRgba(inputs.presentation.getMatrixUnitColor(a), 0.14)
        });
      }
    }
    return rows.sort((a, b) => {
      const at = inputs.presentation.parseDateSafe(a.date)?.getTime();
      const bt = inputs.presentation.parseDateSafe(b.date)?.getTime();
      const aValid = Number.isFinite(at);
      const bValid = Number.isFinite(bt);
      if (aValid && bValid && at !== bt) return at - bt;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return String(a.key || '').localeCompare(String(b.key || ''), 'zh-Hans-CN', { numeric: true });
    });
  };

  const duoUnitRows = computed(() => inputs.constants.DUO_OC_UNITS.map((unit) => {
    const unitNames = duoUnitCharacters.value[unit] || [];
    const unitFilters = getDuoUnitPoolFilters(unit);
    const unitLimitedOnly = duoFiltersLimitedOnly(unitFilters);
    const unitShowCardImages = getDuoUnitShowCardImages(unit);
    const unitCountMap = duoUnitPoolCountMaps.value[unit] || duoUnitPoolCountMap.value;
    const unitLastPoolMap = duoUnitLastPoolMaps.value[unit] || duoUnitLastPoolMap.value;
    const isDesktopCardMode = unitShowCardImages && !inputs.navigation.isNavTopLayout.value;
    const matrixColumns = unitLimitedOnly
      ? (isDesktopCardMode ? unitNames : [...unitNames, ...duoVsNames.value, inputs.constants.DUO_VS_TOTAL_KEY])
      : (isDesktopCardMode ? unitNames : [...unitNames, ...duoVsNames.value]);
    const matrixRows = unitLimitedOnly
      ? (isDesktopCardMode ? [...unitNames, ...duoVsNames.value, inputs.constants.DUO_VS_TOTAL_KEY] : unitNames)
      : (isDesktopCardMode ? [...unitNames, ...duoVsNames.value] : unitNames);
    return {
      id: `duo-unit-${unit}`,
      unit,
      title: inputs.navigationCatalog.getUnitNavTitle(unit),
      filters: unitFilters,
      isLimitedOnly: unitLimitedOnly,
      showCardImages: unitShowCardImages,
      matrix: buildDuoMatrixData(matrixColumns, matrixRows, unitCountMap),
      lastRows: getDuoUnitPairRows(unitNames, unitLastPoolMap)
    };
  }));

  const duoPoolMatrix = computed(() => buildDuoMatrixData(duoOcNames.value, duoRowsAll.value, duoPoolCountMap.value));

  const duoEventMatrix = computed(() => buildDuoMatrixData(duoOcNames.value, duoRowsAll.value, duoEventCountMap.value));

  const formatDuoCount = (value) => (value == null ? '—' : String(value));

  const getDuoFilterTargetRef = (targetKey) => {
    if (targetKey === 'unit') return duoUnitPoolFilters;
    if (targetKey === 'pool') return duoPoolFilters;
    if (targetKey === 'event') return duoEventFilters;
    return null;
  };

  const getOrderedDuoFilterValues = (values) => {
    const set = new Set(Array.isArray(values) ? values : []);
    return inputs.constants.DUO_FILTER_OPTIONS
      .map((option) => option.value)
      .filter((option) => set.has(option));
  };

  const syncDuoUnitGlobalFiltersFromUnitFilters = () => {
    duoUnitPoolFilters.value = inputs.constants.DUO_FILTER_OPTIONS
      .map((option) => option.value)
      .filter((value) => inputs.constants.DUO_OC_UNITS.every((unit) => getDuoUnitPoolFilters(unit).includes(value)));
  };

  const isDuoUnitGlobalFilterChecked = (optionValue) => {
    const value = String(optionValue || '').trim();
    if (!value) return false;
    return inputs.constants.DUO_OC_UNITS.every((unit) => getDuoUnitPoolFilters(unit).includes(value));
  };

  const isDuoUnitGlobalFilterIndeterminate = (optionValue) => {
    const value = String(optionValue || '').trim();
    if (!value) return false;
    const selectedCount = inputs.constants.DUO_OC_UNITS
      .filter((unit) => getDuoUnitPoolFilters(unit).includes(value))
      .length;
    return selectedCount > 0 && selectedCount < inputs.constants.DUO_OC_UNITS.length;
  };

  const resetDuoUnitGlobalFilterOptionToDefault = (optionValue) => {
    const value = String(optionValue || '').trim();
    if (!value) return;
    const defaultChecked = DEFAULT_DUO_UNIT_POOL_FILTERS.includes(value);
    inputs.constants.DUO_OC_UNITS.forEach((unit) => {
      const next = new Set(getDuoUnitPoolFilters(unit));
      if (defaultChecked) next.add(value);
      else next.delete(value);
      duoUnitPoolFiltersByUnit[unit] = getOrderedDuoFilterValues([...next]);
    });
    syncDuoUnitGlobalFiltersFromUnitFilters();
  };

  const onDuoFilterChange = (targetKey, optionValue, event) => {
    const checked = !!event?.target?.checked;
    const value = String(optionValue || '').trim();
    const targetRef = getDuoFilterTargetRef(targetKey);
    if (!value || !targetRef || !Array.isArray(targetRef.value)) return;
    const shouldResetDefault = targetKey === 'unit' && isDuoUnitGlobalFilterIndeterminate(value);
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      if (shouldResetDefault) {
        resetDuoUnitGlobalFilterOptionToDefault(value);
        if (event?.target) {
          event.target.checked = DEFAULT_DUO_UNIT_POOL_FILTERS.includes(value);
          event.target.indeterminate = false;
        }
        return;
      }
      const next = new Set(targetRef.value);
      if (checked) next.add(value);
      else next.delete(value);
      targetRef.value = getOrderedDuoFilterValues([...next]);
      if (targetKey === 'unit') {
        inputs.constants.DUO_OC_UNITS.forEach((unit) => {
          duoUnitPoolFiltersByUnit[unit] = [...targetRef.value];
        });
      }
    }, anchorEl);
  };

  const onDuoUnitFilterChange = (unit, optionValue, event) => {
    const checked = !!event?.target?.checked;
    const value = String(optionValue || '').trim();
    const key = String(unit || '').trim().toLowerCase();
    if (!value || !inputs.constants.DUO_OC_UNITS.includes(key)) return;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      const next = new Set(getDuoUnitPoolFilters(key));
      if (checked) next.add(value);
      else next.delete(value);
      duoUnitPoolFiltersByUnit[key] = getOrderedDuoFilterValues([...next]);
      syncDuoUnitGlobalFiltersFromUnitFilters();
    }, anchorEl);
  };

  const duoLastPoolShowCardImagesAll = computed(() => (
    inputs.constants.DUO_OC_UNITS.every((unit) => !!duoLastPoolShowCardImagesByUnit[unit])
  ));

  const duoLastPoolShowCardImagesIndeterminate = computed(() => {
    const values = inputs.constants.DUO_OC_UNITS.map((unit) => !!duoLastPoolShowCardImagesByUnit[unit]);
    return inputs.panelControls.hasMixedBooleanValues(values);
  });

  const onDuoLastPoolShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const shouldResetDefault = duoLastPoolShowCardImagesIndeterminate.value;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      const next = shouldResetDefault ? false : checked;
      duoLastPoolShowCardImages.value = next;
      inputs.constants.DUO_OC_UNITS.forEach((unit) => {
        duoLastPoolShowCardImagesByUnit[unit] = next;
      });
      if (shouldResetDefault && event?.target) {
        event.target.checked = false;
        event.target.indeterminate = false;
      }
    }, anchorEl);
  };

  const onDuoUnitLastPoolShowCardImagesChange = (unit, event) => {
    const checked = !!event?.target?.checked;
    const key = String(unit || '').trim().toLowerCase();
    if (!inputs.constants.DUO_OC_UNITS.includes(key)) return;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      duoLastPoolShowCardImagesByUnit[key] = checked;
      duoLastPoolShowCardImages.value = duoLastPoolShowCardImagesAll.value;
    }, anchorEl);
  };

  return {
    isDuoUnitGlobalFilterChecked,
    isDuoUnitGlobalFilterIndeterminate,
    onDuoFilterChange,
    duoLastPoolShowCardImagesAll,
    duoLastPoolShowCardImagesIndeterminate,
    onDuoLastPoolShowCardImagesChange,
    duoUnitRows,
    onDuoUnitFilterChange,
    getDuoHeadCellStyle,
    getDuoMatrixCellClass,
    getDuoMatrixCellStyle,
    formatDuoCount,
    onDuoUnitLastPoolShowCardImagesChange,
    duoPoolFilters,
    duoPoolMatrix,
    duoEventFilters,
    duoEventMatrix,
  };
}
