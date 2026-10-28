import { ref, computed } from 'vue';
import { isWorldLinkCardType } from '../../domain/worldLink.js';

/** Owns card vs records behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardVsRecords(inputs) {
  const vsUnitLastFourSort = ref('char');

  const vsUnitFourCountSort = ref('char');

  const vsUnitLastFourCompact = ref(true);

  const vsUnitLastFourShowCardImages = ref(false);

  const vsUnitFourCountCompact = ref(true);

  const vsUnitFourCountShowCardImages = ref(false);

  const vsUnitScoreShowCardImages = ref(false);

  const vsOriginalStatShowCardImages = ref(false);

  const toggleVsUnitLastFourSort = () => {
    if (vsUnitLastFourSort.value === 'char') {
      vsUnitLastFourSort.value = 'date-desc';
      return;
    }
    if (vsUnitLastFourSort.value === 'date-desc') {
      vsUnitLastFourSort.value = 'date-asc';
      return;
    }
    vsUnitLastFourSort.value = 'char';
  };

  const onToggleVsUnitLastFourSort = (event) => {
    const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      toggleVsUnitLastFourSort();
    }, anchorEl);
  };

  const onVsUnitLastFourCompactChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      vsUnitLastFourCompact.value = checked;
      vsUnitFourCountCompact.value = checked;
    }, anchorEl);
  };

  const onVsUnitFourCountCompactChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      vsUnitLastFourCompact.value = checked;
      vsUnitFourCountCompact.value = checked;
    }, anchorEl);
  };

  const toggleVsUnitFourCountSort = () => {
    if (vsUnitFourCountSort.value === 'char') {
      vsUnitFourCountSort.value = 'count-desc';
      return;
    }
    if (vsUnitFourCountSort.value === 'count-desc') {
      vsUnitFourCountSort.value = 'count-asc';
      return;
    }
    vsUnitFourCountSort.value = 'char';
  };

  const onToggleVsUnitFourCountSort = (event) => {
    const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      toggleVsUnitFourCountSort();
    }, anchorEl);
  };

  const vsUnitLastFourSortLabel = computed(() => {
    if (vsUnitLastFourSort.value === 'date-desc') return '日期↓';
    if (vsUnitLastFourSort.value === 'date-asc') return '日期↑';
    return '日期';
  });

  const vsUnitFourCountSortLabel = computed(() => {
    if (vsUnitFourCountSort.value === 'count-desc') return '数量↓';
    if (vsUnitFourCountSort.value === 'count-asc') return '数量↑';
    return '数量';
  });

  const onVsUnitLastFourShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      vsUnitLastFourShowCardImages.value = checked;
      vsUnitFourCountShowCardImages.value = checked;
    }, anchorEl);
  };

  const onVsUnitFourCountShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      vsUnitLastFourShowCardImages.value = checked;
      vsUnitFourCountShowCardImages.value = checked;
    }, anchorEl);
  };

  const onVsUnitScoreShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      vsUnitScoreShowCardImages.value = checked;
    }, anchorEl);
  };

  const onVsOriginalStatShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      vsOriginalStatShowCardImages.value = checked;
    }, anchorEl);
  };

  const buildVsUnitKey = (baseName, unit) => `${baseName} ${unit}`;

  const parseVsUnitKey = (key) => {
    const [baseName, unitRaw] = String(key || '').trim().split(/\s+/);
    const unit = String(unitRaw || '').toLowerCase();
    return { baseName, unit };
  };

  const getVsUnitVariantAvatarSrc = (key, name) => {
    const { unit } = parseVsUnitKey(key);
    const baseName = String(name || '').trim();
    const fallbackAbbr = String(inputs.metadata.getCharAbbr(baseName) || '').trim().toLowerCase();
    const baseAbbr = String(inputs.metadata.CHAR_MAP[baseName] || fallbackAbbr).trim().toLowerCase();
    if (baseAbbr && unit) {
      return `/chibi_s/${baseAbbr}_${unit}.webp`;
    }
    return `/chibi_s/${fallbackAbbr || baseAbbr}.webp`;
  };

  const onVsUnitVariantAvatarError = (event) => {
    const target = event?.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (target.dataset.fallbackApplied === '1') return;

    const altText = String(target.alt || '').trim();
    const fallbackAbbr = String(inputs.metadata.getCharAbbr(altText) || '').trim().toLowerCase();
    if (!fallbackAbbr) return;
    target.dataset.fallbackApplied = '1';
    target.src = `/chibi_s/${fallbackAbbr}.webp`;
  };

  const getVsUnitLogoByKey = (key) => {
    const { unit } = parseVsUnitKey(key);
    return inputs.metadata.unitLogoMap[unit] || '';
  };

  const getVsOriginalStatType = (card, sourceKey) => {
    const normalizedSourceKey = String(sourceKey || '').trim().toLowerCase();
    if (normalizedSourceKey === 'c1') return '大罪';

    const cardType = String(card?.Type || '').trim().toLowerCase();
    if (cardType === 'cfes') return 'CFES';
    if (cardType === 'bfes') return 'BFES';
    if (isWorldLinkCardType(cardType)) return cardType.toUpperCase();
    return '其他';
  };

  const VS_UNIT_ROW_KEYS = computed(() => inputs.metadata.VS_NAMES.flatMap((vsName) =>
    inputs.constants.VS_UNIT_SORT_ORDER.map((unit) => buildVsUnitKey(vsName, unit))
  ));

  const getVsUnitRecordLabel = (nameWithUnit) => {
    const [baseName, unitRaw] = String(nameWithUnit || '').trim().split(/\s+/);
    const baseAbbr = inputs.metadata.CHAR_MAP[baseName] || inputs.metadata.getCharAbbr(baseName);
    const unit = String(unitRaw || '').toUpperCase();
    return `${baseAbbr} ${unit}`;
  };

  const vsUnitLastFourRecords = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const maxEventDate = inputs.presentation.parseDateSafe(inputs.eventCatalog.eventsById.value[maxEid]?.start_date);
    const latestByKey = {};

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const fullName = String(card?.Name || '').trim();
      const baseName = fullName.split(/\s+/)[0] || fullName;
      if (!inputs.metadata.VS_NAMES.includes(baseName)) return;

      const unit = String(card?.Affiliation || '').trim().toLowerCase();
      if (!inputs.constants.VS_UNIT_SORT_ORDER.includes(unit)) return;

      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      if (!sourceKey) return;

      const isNum = inputs.eventCatalog.isNumericEventId(sourceKey);
      const ev = isNum ? inputs.eventCatalog.eventsById.value[Number(sourceKey)] : null;
      const eventDateStr = String(ev?.start_date || card?.Date || '').trim();
      const eventDate = inputs.presentation.parseDateSafe(eventDateStr);
      if (!eventDate) return;
      if (!isNum && maxEventDate && eventDate > maxEventDate) return;

      const recordKey = buildVsUnitKey(baseName, unit);
      const prev = latestByKey[recordKey];
      const nextRecord = {
        key: recordKey,
        name: recordKey,
        label: getVsUnitRecordLabel(recordKey),
        eventRef: ev
          ? {
              id: Number(ev.id),
              date: ev.start_date,
              typeSeriesId: ev.type_series_id,
              eventType: String(ev.event_type || '').trim(),
              banner: String(ev.banner || '').trim(),
              unit: String(ev.unit || '').trim(),
              sourceKey: String(ev.id)
            }
          : null,
        eventLabel: ev
          ? inputs.presentation.getNonBanEventMark({
              id: Number(ev.id),
              typeSeriesId: ev.type_series_id,
              eventType: String(ev.event_type || '').trim(),
              banner: String(ev.banner || '').trim(),
              unit: String(ev.unit || '').trim(),
              sourceKey: String(ev.id)
            })
          : `ID ${sourceKey}`,
        date: eventDateStr,
        dateValue: eventDate.getTime(),
        days: inputs.presentation.daysBetween(eventDateStr, inputs.eventCatalog.referenceDateStr.value),
        periods: ev ? inputs.eventCatalog.countPeriodsSince({ id: Number(ev.id), date: ev.start_date }) : 0
      };

      if (!prev || nextRecord.dateValue > prev.dateValue) {
        latestByKey[recordKey] = nextRecord;
      }
    });

    return VS_UNIT_ROW_KEYS.value.map((key) => {
      const hit = latestByKey[key];
      if (hit) return hit;
      return {
        key,
        name: key,
        label: getVsUnitRecordLabel(key),
        eventRef: null,
        eventLabel: '-',
        date: '-',
        dateValue: 0,
        days: 0,
        periods: 0
      };
    });
  });

  const vsUnitLastFourRecordsSorted = computed(() => {
    const rows = [...vsUnitLastFourRecords.value];
    if (vsUnitLastFourSort.value === 'date-desc') {
      return rows.sort((a, b) => {
        const av = a.dateValue || 0;
        const bv = b.dateValue || 0;
        if (bv !== av) return bv - av;
        return VS_UNIT_ROW_KEYS.value.indexOf(a.key) - VS_UNIT_ROW_KEYS.value.indexOf(b.key);
      });
    }
    if (vsUnitLastFourSort.value === 'date-asc') {
      return rows.sort((a, b) => {
        const aMiss = !a.dateValue;
        const bMiss = !b.dateValue;
        if (aMiss !== bMiss) return aMiss ? 1 : -1;
        const av = a.dateValue || 0;
        const bv = b.dateValue || 0;
        if (av !== bv) return av - bv;
        return VS_UNIT_ROW_KEYS.value.indexOf(a.key) - VS_UNIT_ROW_KEYS.value.indexOf(b.key);
      });
    }
    return rows;
  });

  const vsUnitLastFourCompactUnitRows = computed(() => {
    const rowMap = Object.fromEntries(
      inputs.constants.VS_UNIT_SORT_ORDER.map((unit) => [unit, { unit, daysByVs: Object.fromEntries(inputs.metadata.VS_NAMES.map((name) => [name, 0])) }])
    );

    vsUnitLastFourRecords.value.forEach((item) => {
      const { baseName, unit } = parseVsUnitKey(item.key);
      if (!rowMap[unit] || !inputs.metadata.VS_NAMES.includes(baseName)) return;
      rowMap[unit].daysByVs[baseName] = Number(item.days || 0);
    });

    return inputs.constants.VS_UNIT_SORT_ORDER.map((unit) => rowMap[unit]);
  });

  const vsUnitScoreAttrByUnitRows = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const maxEventDate = inputs.presentation.parseDateSafe(inputs.eventCatalog.eventsById.value[maxEid]?.start_date);
    const rowMap = Object.fromEntries(
      inputs.constants.VS_UNIT_SORT_ORDER.map((unit) => [
        unit,
        {
          unit,
          attrsByVs: Object.fromEntries(inputs.metadata.VS_NAMES.map((name) => [name, []])),
          cardsByVs: Object.fromEntries(inputs.metadata.VS_NAMES.map((name) => [name, []]))
        }
      ])
    );

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      const skill = String(card?.Skill || '').trim().toLowerCase();
      if (skill !== 'unit_score') return;

      const fullName = String(card?.Name || '').trim();
      const baseName = fullName.split(/\s+/)[0] || fullName;
      if (!inputs.metadata.VS_NAMES.includes(baseName)) return;

      const unit = String(card?.Affiliation || '').trim().toLowerCase();
      if (!inputs.constants.VS_UNIT_SORT_ORDER.includes(unit)) return;

      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      if (!sourceKey) return;
      const isNum = inputs.eventCatalog.isNumericEventId(sourceKey);
      const ev = isNum ? inputs.eventCatalog.eventsById.value[Number(sourceKey)] : null;
      const eventDate = inputs.presentation.parseDateSafe(String(ev?.start_date || card?.Date || '').trim());
      if (!eventDate) return;
      if (!isNum && maxEventDate && eventDate > maxEventDate) return;

      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
      const cardId = inputs.distribution.getCardProgressOrderId(card);
      rowMap[unit].cardsByVs[baseName].push({
        cardId,
        attr,
        name: baseName,
        imageSrc: inputs.media.buildCardImageSrc(card?.CardID, baseName, { rarity: String(card?.Rarity || '4') })
      });
    });

    return inputs.constants.VS_UNIT_SORT_ORDER.map((unit) => {
      const row = rowMap[unit];
      inputs.metadata.VS_NAMES.forEach((name) => {
        row.cardsByVs[name].sort((a, b) => {
          const aid = Number(a?.cardId || 0);
          const bid = Number(b?.cardId || 0);
          if (aid !== bid) return aid - bid;
          return inputs.constants.ATTRS.indexOf(a?.attr) - inputs.constants.ATTRS.indexOf(b?.attr);
        });
        row.attrsByVs[name] = row.cardsByVs[name]
          .map((item) => item?.attr)
          .filter((attr) => inputs.constants.ATTRS.includes(attr));
      });
      return row;
    });
  });

  const vsUnitFourCountDetailRecords = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const maxEventDate = inputs.presentation.parseDateSafe(inputs.eventCatalog.eventsById.value[maxEid]?.start_date);
    const rowMap = Object.fromEntries(
      VS_UNIT_ROW_KEYS.value.map((key) => {
        const { baseName } = parseVsUnitKey(key);
        return [
          key,
          {
            key,
            name: baseName,
            label: getVsUnitRecordLabel(key),
            count: 0,
            attrs: [],
            cards: []
          }
        ];
      })
    );

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const fullName = String(card?.Name || '').trim();
      const baseName = fullName.split(/\s+/)[0] || fullName;
      if (!inputs.metadata.VS_NAMES.includes(baseName)) return;

      const unit = String(card?.Affiliation || '').trim().toLowerCase();
      if (!inputs.constants.VS_UNIT_SORT_ORDER.includes(unit)) return;

      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      if (!sourceKey) return;
      const isNum = inputs.eventCatalog.isNumericEventId(sourceKey);
      const ev = isNum ? inputs.eventCatalog.eventsById.value[Number(sourceKey)] : null;
      const eventDate = inputs.presentation.parseDateSafe(String(ev?.start_date || card?.Date || '').trim());
      if (!eventDate) return;
      if (!isNum && maxEventDate && eventDate > maxEventDate) return;

      const key = buildVsUnitKey(baseName, unit);
      const row = rowMap[key];
      if (!row) return;

      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
      row.cards.push({
        cardId: inputs.distribution.getCardProgressOrderId(card),
        attr,
        name: baseName,
        imageSrc: inputs.media.buildCardImageSrc(card?.CardID, baseName, { rarity: String(card?.Rarity || '4') })
      });
    });

    return VS_UNIT_ROW_KEYS.value.map((key) => {
      const row = rowMap[key];
      row.cards.sort((a, b) => {
        const aid = Number(a?.cardId || 0);
        const bid = Number(b?.cardId || 0);
        if (aid !== bid) return aid - bid;
        return inputs.constants.ATTRS.indexOf(a?.attr) - inputs.constants.ATTRS.indexOf(b?.attr);
      });
      row.attrs = row.cards
        .map((item) => item?.attr)
        .filter((attr) => inputs.constants.ATTRS.includes(attr));
      row.count = row.cards.length;
      return row;
    });
  });

  const vsUnitFourCountRows = computed(() => {
    const rowMap = Object.fromEntries(
      inputs.constants.VS_UNIT_SORT_ORDER.map((unit) => [
        unit,
        {
          unit,
          countByVs: Object.fromEntries(inputs.metadata.VS_NAMES.map((name) => [name, 0]))
        }
      ])
    );

    vsUnitFourCountDetailRecords.value.forEach((item) => {
      const { baseName, unit } = parseVsUnitKey(item?.key);
      if (!rowMap[unit] || !inputs.metadata.VS_NAMES.includes(baseName)) return;
      rowMap[unit].countByVs[baseName] = Number(item?.count || 0);
    });

    return inputs.constants.VS_UNIT_SORT_ORDER.map((unit) => rowMap[unit]);
  });

  const vsUnitFourCountMax = computed(() => {
    const values = vsUnitFourCountRows.value
      .flatMap((row) => inputs.metadata.VS_NAMES.map((name) => Number(row?.countByVs?.[name] || 0)))
      .filter((v) => Number.isFinite(v) && v > 0);
    return values.length ? Math.max(...values) : 0;
  });

  const vsUnitFourCountMin = computed(() => {
    const values = vsUnitFourCountRows.value
      .flatMap((row) => inputs.metadata.VS_NAMES.map((name) => Number(row?.countByVs?.[name] || 0)))
      .filter((v) => Number.isFinite(v) && v > 0);
    return values.length ? Math.min(...values) : 0;
  });

  const getVsFourCountMiniCellClass = (value) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return '';
    if (n === vsUnitFourCountMax.value && vsUnitFourCountMax.value > 0) return 'vs-four-count-max';
    if (n === vsUnitFourCountMin.value && vsUnitFourCountMin.value > 0) return 'vs-four-count-min';
    return '';
  };

  const vsUnitFourCountDisplayRecords = computed(() => {
    const rows = [...vsUnitFourCountDetailRecords.value];
    if (vsUnitFourCountSort.value === 'count-desc') {
      return rows.sort((a, b) => {
        const av = Number(a?.count || 0);
        const bv = Number(b?.count || 0);
        if (bv !== av) return bv - av;
        return VS_UNIT_ROW_KEYS.value.indexOf(a.key) - VS_UNIT_ROW_KEYS.value.indexOf(b.key);
      });
    }
    if (vsUnitFourCountSort.value === 'count-asc') {
      return rows.sort((a, b) => {
        const av = Number(a?.count || 0);
        const bv = Number(b?.count || 0);
        if (av !== bv) return av - bv;
        return VS_UNIT_ROW_KEYS.value.indexOf(a.key) - VS_UNIT_ROW_KEYS.value.indexOf(b.key);
      });
    }
    return rows;
  });

  const vsOriginalStatRows = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const maxEventDate = inputs.presentation.parseDateSafe(inputs.eventCatalog.eventsById.value[maxEid]?.start_date);
    const rowMap = Object.fromEntries(
      inputs.constants.VS_ORIGINAL_STAT_TYPES.map((type) => [
        type,
        {
          type,
          attrsByVs: Object.fromEntries(inputs.metadata.VS_NAMES.map((name) => [name, []])),
          cardsByVs: Object.fromEntries(inputs.metadata.VS_NAMES.map((name) => [name, []]))
        }
      ])
    );

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const fullName = String(card?.Name || '').trim();
      const baseName = fullName.split(/\s+/)[0] || fullName;
      if (!inputs.metadata.VS_NAMES.includes(baseName)) return;

      const unit = String(card?.Affiliation || '').trim().toLowerCase();
      if (unit !== 'vs') return;

      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      if (!sourceKey) return;
      const isNum = inputs.eventCatalog.isNumericEventId(sourceKey);
      const ev = isNum ? inputs.eventCatalog.eventsById.value[Number(sourceKey)] : null;
      const eventDate = inputs.presentation.parseDateSafe(String(ev?.start_date || card?.Date || '').trim());
      if (!eventDate) return;
      if (!isNum && maxEventDate && eventDate > maxEventDate) return;

      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
      const statType = getVsOriginalStatType(card, sourceKey);
      if (!rowMap[statType]) return;
      rowMap[statType].cardsByVs[baseName].push({
        cardId: inputs.distribution.getCardProgressOrderId(card),
        attr,
        name: baseName,
        imageSrc: inputs.media.buildCardImageSrc(card?.CardID, baseName, { rarity: String(card?.Rarity || '4') })
      });
    });

    return inputs.constants.VS_ORIGINAL_STAT_TYPES.map((type) => {
      const row = rowMap[type];
      inputs.metadata.VS_NAMES.forEach((name) => {
        row.cardsByVs[name].sort((a, b) => {
          const aid = Number(a?.cardId || 0);
          const bid = Number(b?.cardId || 0);
          if (aid !== bid) return aid - bid;
          return inputs.constants.ATTRS.indexOf(a?.attr) - inputs.constants.ATTRS.indexOf(b?.attr);
        });
        row.attrsByVs[name] = row.cardsByVs[name]
          .map((item) => item?.attr)
          .filter((attr) => inputs.constants.ATTRS.includes(attr));
      });
      return row;
    });
  });

  const getVsOriginalOtherRowCards = (row) => {
    if (!row?.cardsByVs) return [];
    if (inputs.metadata.VS_NAMES.includes('初音未来') && row.cardsByVs['初音未来']?.length) {
      return row.cardsByVs['初音未来'];
    }
    for (let i = 0; i < inputs.metadata.VS_NAMES.length; i += 1) {
      const key = inputs.metadata.VS_NAMES[i];
      if (row.cardsByVs[key]?.length) return row.cardsByVs[key];
    }
    return [];
  };

  const getVsOriginalOtherRowAttrs = (row) => {
    if (!row?.attrsByVs) return [];
    if (inputs.metadata.VS_NAMES.includes('初音未来') && row.attrsByVs['初音未来']?.length) {
      return row.attrsByVs['初音未来'];
    }
    for (let i = 0; i < inputs.metadata.VS_NAMES.length; i += 1) {
      const key = inputs.metadata.VS_NAMES[i];
      if (row.attrsByVs[key]?.length) return row.attrsByVs[key];
    }
    return [];
  };

  const vsUnitLastFourMaxDays = computed(() => {
    const values = vsUnitLastFourCompactUnitRows.value
      .flatMap((row) => inputs.metadata.VS_NAMES.map((name) => Number(row?.daysByVs?.[name] || 0)))
      .filter((v) => v > 0);
    return values.length ? Math.max(...values) : 0;
  });

  const getVsMiniUnitHeadStyle = (unit) => ({
    backgroundColor: inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS[unit] || '#9ca3af', 0.28)
  });

  const getVsMiniVsHeadStyle = (name) => ({
    backgroundColor: inputs.presentation.hexToRgba(inputs.metadata.getCharColor(name), 0.28)
  });

  const getVsScoreUnitHeadStyle = (unit) => ({
    backgroundColor: inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS[unit] || '#9ca3af', 0.28)
  });

  const getVsScoreVsHeadStyle = (name) => ({
    backgroundColor: inputs.presentation.hexToRgba(inputs.metadata.getCharColor(name), 0.26)
  });

  const getVsScoreCellStyle = (name, unit) => ({
    backgroundImage: `linear-gradient(${inputs.presentation.hexToRgba(inputs.metadata.getCharColor(name), 0.12)}, ${inputs.presentation.hexToRgba(inputs.metadata.getCharColor(name), 0.12)}), linear-gradient(${inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS[unit] || '#9ca3af', 0.12)}, ${inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS[unit] || '#9ca3af', 0.12)})`,
    backgroundColor: '#f8fafc'
  });

  const getVsOriginalStatCellStyle = (name) => ({
    backgroundImage: `linear-gradient(${inputs.presentation.hexToRgba(inputs.metadata.getCharColor(name), 0.14)}, ${inputs.presentation.hexToRgba(inputs.metadata.getCharColor(name), 0.14)})`,
    backgroundColor: '#f8fafc'
  });

  const getVsMiniDataCellStyle = (days) => {
    const d = Number(days || 0);
    if (d <= 0) {
      return {
        backgroundColor: 'rgb(245, 247, 250)',
        color: '#94a3b8'
      };
    }
    const maxDays = Math.max(1, Number(vsUnitLastFourMaxDays.value || 1));
    const ratio = Math.min(1, d / maxDays);
    const shade = Math.round(245 - (ratio * 95));
    const bg = `rgb(${shade}, ${shade}, ${shade})`;
    const fg = shade < 175 ? '#ffffff' : '#1f2937';
    return {
      backgroundColor: bg,
      color: fg,
      fontWeight: 700
    };
  };

  return {
    parseVsUnitKey,
    vsUnitLastFourRecordsSorted,
    vsUnitLastFourShowCardImages,
    vsUnitFourCountShowCardImages,
    vsUnitScoreShowCardImages,
    vsOriginalStatShowCardImages,
    vsUnitLastFourCompact,
    onVsUnitLastFourCompactChange,
    onVsUnitLastFourShowCardImagesChange,
    vsUnitLastFourSort,
    onToggleVsUnitLastFourSort,
    vsUnitLastFourSortLabel,
    getVsUnitLogoByKey,
    getVsMiniVsHeadStyle,
    vsUnitLastFourCompactUnitRows,
    getVsMiniUnitHeadStyle,
    getVsMiniDataCellStyle,
    vsUnitFourCountCompact,
    onVsUnitFourCountCompactChange,
    onVsUnitFourCountShowCardImagesChange,
    vsUnitFourCountSort,
    onToggleVsUnitFourCountSort,
    vsUnitFourCountSortLabel,
    vsUnitFourCountDisplayRecords,
    getVsUnitVariantAvatarSrc,
    onVsUnitVariantAvatarError,
    getVsScoreVsHeadStyle,
    vsUnitFourCountRows,
    getVsScoreUnitHeadStyle,
    getVsFourCountMiniCellClass,
    getVsScoreCellStyle,
    onVsUnitScoreShowCardImagesChange,
    vsUnitScoreAttrByUnitRows,
    onVsOriginalStatShowCardImagesChange,
    vsOriginalStatRows,
    getVsOriginalStatCellStyle,
    getVsOriginalOtherRowCards,
    getVsOriginalOtherRowAttrs,
  };
}
