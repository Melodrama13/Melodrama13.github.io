import { computed } from 'vue';

/** Vs Preview owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, PreviewSelections, PreviewCutoff, Formatting, SourceDates.
 */
export function useHistoryVsPreview(ports) {
const PREVIEW_VS_NAMES = ['初音未来', '镜音铃', '镜音连', '巡音流歌', 'MEIKO', 'KAITO'];

const PREVIEW_VS_ORIGINAL_STAT_TYPES = ['大罪', 'CF', 'BF', 'WL1', 'WL2', 'WL3', '其他'];

const PREVIEW_ATTR_ORDER = ['Pure', 'Cool', 'Cute', 'Happy', 'Mysterious'];

const getPreviewVsOriginalStatType = (card, sourceKey) => {
  const normalizedSourceKey = String(sourceKey || '').trim().toLowerCase();
  if (normalizedSourceKey === 'c1') return '大罪';

  const cardType = String(card?.Type || '').trim().toLowerCase();
  if (cardType === 'cfes') return 'CF';
  if (cardType === 'bfes') return 'BF';
  if (cardType.startsWith('wl1')) return 'WL1';
  if (cardType.startsWith('wl2')) return 'WL2';
  if (cardType.startsWith('wl3')) return 'WL3';
  return '其他';
};

const previewVsLastFourMap = computed(() => {
  const result = {};
  PREVIEW_VS_NAMES.forEach((vs) => {
    result[vs] = Object.fromEntries(ports.previewSelections.PREVIEW_BOX_UNITS.map((u) => [u, null]));
  });

  const maxId = Number(ports.previewCutoff.previewMaxEventId.value);
  if (!Number.isFinite(maxId) || maxId <= 0) return result;

  const eventDateById = {};
  (ports.props.allEvents || []).forEach((event) => {
    const eid = ports.formatting.normalizeEventId(event?.id);
    if (!eid || !ports.previewCutoff.isEventWithinPreviewLimit(event, maxId)) return;
    eventDateById[eid] = ports.sourceDates.getDateValue(event?.start_date);
  });

  ports.previewCutoff.previewEffectiveCards.value.forEach((card) => {
    const eid = ports.formatting.normalizeEventId(card?.EventID);
    if (!eid || !ports.previewCutoff.isCardWithinPreviewLimit(card, maxId)) return;
    const rarity = String(card?.Rarity || '').trim();
    if (rarity !== '4') return;
    const name = String(card?.Name || '').trim().split(' ')[0];
    if (!PREVIEW_VS_NAMES.includes(name)) return;
    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!ports.previewSelections.PREVIEW_BOX_UNITS.includes(unit)) return;
    const dateValue = Number(eventDateById[eid] || 0);
    if (!dateValue) return;
    const current = result[name][unit];
    if (current === null || dateValue > current) {
      result[name][unit] = dateValue;
    }
  });

  return result;
});

const previewReferenceDateValue = computed(() => {
  const t = ports.sourceDates.getDateValue(ports.previewCutoff.previewCutoffEvent.value?.start_date);
  return t > 0 ? t : Date.now();
});

const previewVsLastFourCompactRows = computed(() => {
  const anchor = Number(previewReferenceDateValue.value || Date.now());
  return PREVIEW_VS_NAMES.map((name) => {
    const unitMap = previewVsLastFourMap.value[name] || {};
    const daysByUnit = {};
    ports.previewSelections.PREVIEW_BOX_UNITS.forEach((unit) => {
      const t = Number(unitMap[unit] || 0);
      daysByUnit[unit] = t > 0 ? Math.max(0, Math.floor((anchor - t) / 86400000)) : '-';
    });
    return { name, daysByUnit };
  });
});

const previewVsLastFourUnitRows = computed(() => {
  const rowMap = Object.fromEntries(
    previewVsLastFourCompactRows.value.map((row) => [row.name, row])
  );
  return ports.previewSelections.PREVIEW_BOX_UNITS.map((unit) => {
    const daysByVs = {};
    PREVIEW_VS_NAMES.forEach((name) => {
      daysByVs[name] = rowMap[name]?.daysByUnit?.[unit] ?? '-';
    });
    return { unit, daysByVs };
  });
});

const previewVsUnitFourCountCompactRows = computed(() => {
  const maxId = Number(ports.previewCutoff.previewMaxEventId.value);
  const rows = Object.fromEntries(
    PREVIEW_VS_NAMES.map((name) => [
      name,
      {
        name,
        countByUnit: Object.fromEntries(ports.previewSelections.PREVIEW_BOX_UNITS.map((u) => [u, 0]))
      }
    ])
  );

  if (!Number.isFinite(maxId) || maxId <= 0) {
    return PREVIEW_VS_NAMES.map((name) => rows[name]);
  }

  ports.previewCutoff.previewEffectiveCards.value.forEach((card) => {
    if (!ports.previewCutoff.isCardWithinPreviewLimit(card, maxId)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const baseName = String(card?.Name || '').trim().split(/\s+/)[0] || '';
    if (!PREVIEW_VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!ports.previewSelections.PREVIEW_BOX_UNITS.includes(unit)) return;

    rows[baseName].countByUnit[unit] += 1;
  });

  return PREVIEW_VS_NAMES.map((name) => rows[name]);
});

const previewVsUnitFourCountUnitRows = computed(() => {
  const rowMap = Object.fromEntries(
    previewVsUnitFourCountCompactRows.value.map((row) => [row.name, row])
  );
  return ports.previewSelections.PREVIEW_BOX_UNITS.map((unit) => {
    const countByVs = {};
    PREVIEW_VS_NAMES.forEach((name) => {
      countByVs[name] = Number(rowMap[name]?.countByUnit?.[unit] || 0);
    });
    return { unit, countByVs };
  });
});

const previewVsUnitScoreRows = computed(() => {
  const maxId = Number(ports.previewCutoff.previewMaxEventId.value);
  const rows = Object.fromEntries(
    PREVIEW_VS_NAMES.map((name) => [
      name,
      {
        name,
        attrsByUnit: Object.fromEntries(ports.previewSelections.PREVIEW_BOX_UNITS.map((u) => [u, []]))
      }
    ])
  );

  if (!Number.isFinite(maxId) || maxId <= 0) {
    return PREVIEW_VS_NAMES.map((name) => rows[name]);
  }

  ports.previewCutoff.previewEffectiveCards.value.forEach((card) => {
    if (!ports.previewCutoff.isCardWithinPreviewLimit(card, maxId)) return;
    const skill = String(card?.Skill || '').trim().toLowerCase();
    if (skill !== 'unit_score') return;

    const baseName = String(card?.Name || '').trim().split(/\s+/)[0] || '';
    if (!PREVIEW_VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!ports.previewSelections.PREVIEW_BOX_UNITS.includes(unit)) return;

    const attr = ports.formatting.normalizeEventHistoryAttribute(card?.Attribute);
    if (!PREVIEW_ATTR_ORDER.includes(attr)) return;

    rows[baseName].attrsByUnit[unit].push(attr);
  });

  return PREVIEW_VS_NAMES.map((name) => rows[name]);
});

const previewVsUnitScoreUnitRows = computed(() => {
  const rowMap = Object.fromEntries(
    previewVsUnitScoreRows.value.map((row) => [row.name, row])
  );
  return ports.previewSelections.PREVIEW_BOX_UNITS.map((unit) => {
    const attrsByVs = {};
    PREVIEW_VS_NAMES.forEach((name) => {
      attrsByVs[name] = rowMap[name]?.attrsByUnit?.[unit] || [];
    });
    return { unit, attrsByVs };
  });
});

const previewVsOriginalRows = computed(() => {
  const maxId = Number(ports.previewCutoff.previewMaxEventId.value);
  const rows = Object.fromEntries(
    PREVIEW_VS_ORIGINAL_STAT_TYPES.map((type) => [
      type,
      {
        type,
        attrsByVs: Object.fromEntries(PREVIEW_VS_NAMES.map((name) => [name, []]))
      }
    ])
  );

  if (!Number.isFinite(maxId) || maxId <= 0) {
    return PREVIEW_VS_ORIGINAL_STAT_TYPES.map((type) => rows[type]);
  }

  ports.previewCutoff.previewEffectiveCards.value.forEach((card) => {
    if (!ports.previewCutoff.isCardWithinPreviewLimit(card, maxId)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const baseName = String(card?.Name || '').trim().split(/\s+/)[0] || '';
    if (!PREVIEW_VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (unit !== 'vs') return;

    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    if (!sourceKey) return;

    const attr = ports.formatting.normalizeEventHistoryAttribute(card?.Attribute);
    if (!PREVIEW_ATTR_ORDER.includes(attr)) return;

    const statType = getPreviewVsOriginalStatType(card, sourceKey);
    if (!rows[statType]) return;

    rows[statType].attrsByVs[baseName].push({
      attr,
      orderId: ports.previewCutoff.getPreviewCardProgressOrderId(card)
    });
  });

  return PREVIEW_VS_ORIGINAL_STAT_TYPES.map((type) => {
    const row = rows[type];
    PREVIEW_VS_NAMES.forEach((name) => {
      row.attrsByVs[name] = row.attrsByVs[name]
        .sort((a, b) => {
          const orderDiff = Number(a?.orderId || 0) - Number(b?.orderId || 0);
          if (orderDiff !== 0) return orderDiff;
          return PREVIEW_ATTR_ORDER.indexOf(a?.attr) - PREVIEW_ATTR_ORDER.indexOf(b?.attr);
        })
        .map((item) => item.attr);
    });
    return row;
  });
});

const previewVsLastFourMaxDays = computed(() => {
  let max = 0;
  previewVsLastFourCompactRows.value.forEach((row) => {
    ports.previewSelections.PREVIEW_BOX_UNITS.forEach((unit) => {
      const v = Number(row?.daysByUnit?.[unit]);
      if (Number.isFinite(v) && v > max) max = v;
    });
  });
  return Math.max(1, max);
});

const previewVsUnitFourCountMax = computed(() => {
  let max = 0;
  previewVsUnitFourCountCompactRows.value.forEach((row) => {
    ports.previewSelections.PREVIEW_BOX_UNITS.forEach((unit) => {
      const v = Number(row?.countByUnit?.[unit] || 0);
      if (Number.isFinite(v) && v > max) max = v;
    });
  });
  return Math.max(1, max);
});

const previewVsUnitFourCountMin = computed(() => {
  let min = Infinity;
  previewVsUnitFourCountCompactRows.value.forEach((row) => {
    ports.previewSelections.PREVIEW_BOX_UNITS.forEach((unit) => {
      const v = Number(row?.countByUnit?.[unit] || 0);
      if (Number.isFinite(v) && v > 0 && v < min) min = v;
    });
  });
  return Number.isFinite(min) ? min : 0;
});

const getPreviewVsMiniDataCellStyle = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: '#64748b'
    };
  }
  const ratio = Math.min(1, Math.max(0, n / previewVsLastFourMaxDays.value));
  const shade = Math.round(240 - (ratio * 110));
  const text = shade <= 165 ? '#f8fafc' : '#0f172a';
  return {
    backgroundColor: `rgb(${shade}, ${shade}, ${shade})`,
    color: text,
    fontWeight: 600
  };
};

const getPreviewVsFourCountCellStyle = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: '#64748b'
    };
  }
  if (n === previewVsUnitFourCountMax.value && previewVsUnitFourCountMax.value > 0) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: '#dc2626',
      fontWeight: 700
    };
  }
  if (n === previewVsUnitFourCountMin.value && previewVsUnitFourCountMin.value > 0 && previewVsUnitFourCountMin.value !== previewVsUnitFourCountMax.value) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: '#2563eb',
      fontWeight: 700
    };
  }
  return {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    color: '#0f172a',
    fontWeight: 600
  };
};


return {
  PREVIEW_VS_NAMES,
  previewVsLastFourUnitRows,
  previewVsUnitFourCountUnitRows,
  previewVsUnitScoreUnitRows,
  previewVsOriginalRows,
  getPreviewVsMiniDataCellStyle,
  getPreviewVsFourCountCellStyle,
};
}
