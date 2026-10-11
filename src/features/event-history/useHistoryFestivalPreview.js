import { computed } from 'vue';

/** Festival Preview owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Presentation, PreviewSelections, PreviewCutoff, Formatting.
 */
export function useHistoryFestivalPreview(ports) {
const parseFestivalPreviewCharKey = (charKey) => {
  const raw = String(charKey || '').trim();
  if (!raw) return { baseName: '', unit: '', isVs: false };
  const [baseName, suffixRaw] = raw.split(/\s+/);
  const unit = String(suffixRaw || '').toLowerCase();
  return {
    baseName,
    unit,
    isVs: ports.presentation.isVirtualSinger(baseName)
  };
};

const buildFestivalPreviewCharKey = (card) => {
  const fullName = String(card?.Name || '').trim();
  const [baseName] = fullName.split(/\s+/);
  if (!baseName || ports.previewSelections.getPreviewCharOrder(baseName) >= 999) return '';
  if (!ports.presentation.isVirtualSinger(baseName)) return baseName;

  const unit = String(card?.Affiliation || '').trim().toLowerCase();
  if (unit && unit !== 'vs' && ports.previewSelections.PREVIEW_FESTIVAL_VS_UNIT_ORDER[unit]) {
    return `${baseName} ${unit}`;
  }
  return baseName;
};

const compareFestivalPreviewCharKey = (aKey, bKey) => {
  const a = parseFestivalPreviewCharKey(aKey);
  const b = parseFestivalPreviewCharKey(bKey);
  const baseDiff = ports.previewSelections.getPreviewCharOrder(a.baseName) - ports.previewSelections.getPreviewCharOrder(b.baseName);
  if (baseDiff !== 0) return baseDiff;

  if (a.isVs && b.isVs) {
    const au = ports.previewSelections.PREVIEW_FESTIVAL_VS_UNIT_ORDER[a.unit || 'vs'] || 999;
    const bu = ports.previewSelections.PREVIEW_FESTIVAL_VS_UNIT_ORDER[b.unit || 'vs'] || 999;
    if (au !== bu) return au - bu;
  }

  return String(aKey).localeCompare(String(bKey), 'zh-Hans-CN');
};

const canTogglePreviewFestivalFes = (festival) => ['半周年', '周年'].includes(String(festival || '').trim());

const shouldCountPreviewFestivalFes = (festival) => {
  const fest = String(festival || '').trim();
  if (!canTogglePreviewFestivalFes(fest)) return false;
  return !!ports.previewSelections.previewFestivalFesToggles.value[fest];
};

const previewFestivalRowsLocal = computed(() => {
  const maxId = Number(ports.previewCutoff.previewMaxEventId.value);
  if (!Number.isFinite(maxId) || maxId <= 0) return {};

  const eventFestivalMap = {};
  (ports.props.allEvents || []).forEach((event) => {
    if (!ports.formatting.isNumericEventId(event?.id)) return;
    const eid = Number(event.id);
    if (eid > maxId) return;
    const festival = String(event?.festival || '').trim();
    if (!ports.previewSelections.PREVIEW_FESTIVAL_TYPES.includes(festival)) return;
    eventFestivalMap[eid] = festival;
  });

  const buckets = Object.fromEntries(
    ports.previewSelections.PREVIEW_FESTIVAL_TYPES.map((festival) => [
      festival,
      {
        four: {},
        three: {},
        two: {},
        fourMeta: {},
        seenBase: new Set()
      }
    ])
  );

  ports.previewCutoff.previewEffectiveCards.value.forEach((card) => {
    if (!ports.previewCutoff.isCardWithinPreviewLimit(card, maxId)) return;
    const eid = String(card?.EventID || '').trim();
    if (!ports.formatting.isNumericEventId(eid)) return;
    const festival = eventFestivalMap[Number(eid)];
    if (!festival || !buckets[festival]) return;

    const charName = buildFestivalPreviewCharKey(card);
    if (!charName) return;
    const baseName = parseFestivalPreviewCharKey(charName).baseName;
    if (!baseName) return;
    const rarity = String(card?.Rarity || '').trim();
    const type = String(card?.Type || '').trim().toLowerCase();
    const isFes = ports.previewSelections.isFesCardType(type);
    if (isFes && !shouldCountPreviewFestivalFes(festival)) return;

    const bucket = buckets[festival];
    if (rarity === '4' || isFes) {
      bucket.four[charName] = (bucket.four[charName] || 0) + 1;
      if (!bucket.fourMeta[charName]) {
        bucket.fourMeta[charName] = { perm: 0, nonPerm: 0 };
      }
      if (type === 'perm') bucket.fourMeta[charName].perm += 1;
      else bucket.fourMeta[charName].nonPerm += 1;
      bucket.seenBase.add(baseName);
      return;
    }
    if (rarity === '3') {
      bucket.three[charName] = (bucket.three[charName] || 0) + 1;
      bucket.seenBase.add(baseName);
      return;
    }
    if (rarity === '2') {
      bucket.two[charName] = (bucket.two[charName] || 0) + 1;
      bucket.seenBase.add(baseName);
    }
  });

  const allBaseNames = Object.keys(ports.previewSelections.CHAR_MAP.value)
    .sort((a, b) => ports.previewSelections.getPreviewCharOrder(a) - ports.previewSelections.getPreviewCharOrder(b));

  const toRowList = (mapObj, options = {}) => Object.entries(mapObj || {})
    .map(([name, count]) => {
      const meta = options.fourMeta?.[name];
      const isPermOnly = !!meta && meta.perm > 0 && meta.nonPerm === 0;
      return { name, count: Number(count || 0), isPermOnly };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => compareFestivalPreviewCharKey(a.name, b.name));

  const result = {};
  ports.previewSelections.PREVIEW_FESTIVAL_TYPES.forEach((festival) => {
    const bucket = buckets[festival] || { four: {}, three: {}, two: {}, fourMeta: {}, seenBase: new Set() };
    result[festival] = [
      { key: 'four', label: '4星', chars: toRowList(bucket.four, { fourMeta: bucket.fourMeta }) },
      { key: 'three', label: '3星', chars: toRowList(bucket.three) },
      { key: 'two', label: '2星', chars: toRowList(bucket.two) },
      {
        key: 'none',
        label: '未出',
        chars: allBaseNames
          .filter((name) => !bucket.seenBase.has(name))
          .map((name) => ({ name, count: 0 }))
      }
    ];
  });
  return result;
});

const previewFestivalRowsMap = computed(() => {
  return previewFestivalRowsLocal.value;
});

const currentPreviewFestivalRows = computed(() => {
  const festival = ports.previewCutoff.activePreviewFestivalName.value;
  if (!festival) return [];
  const rows = previewFestivalRowsMap.value?.[festival];
  if (!Array.isArray(rows)) return [];
  if (!ports.previewSelections.previewFestivalMergeHigherRanks.value) return rows;

  const getBaseName = (charName) => parseFestivalPreviewCharKey(charName).baseName;
  const fourRow = rows.find((row) => row.key === 'four') || { chars: [] };
  const threeRow = rows.find((row) => row.key === 'three') || { chars: [] };
  const twoRow = rows.find((row) => row.key === 'two') || { chars: [] };

  const fourBaseSet = new Set((fourRow.chars || []).map((item) => getBaseName(item.name)).filter(Boolean));
  const mergedThreeChars = (threeRow.chars || []).filter((item) => !fourBaseSet.has(getBaseName(item.name)));
  const threeBaseSet = new Set(mergedThreeChars.map((item) => getBaseName(item.name)).filter(Boolean));
  const mergedTwoChars = (twoRow.chars || []).filter((item) => {
    const base = getBaseName(item.name);
    if (!base) return false;
    return !fourBaseSet.has(base) && !threeBaseSet.has(base);
  });

  return rows.map((row) => {
    if (row.key === 'three') return { ...row, chars: mergedThreeChars };
    if (row.key === 'two') return { ...row, chars: mergedTwoChars };
    return row;
  });
});

const previewFestivalIncludeFes = computed(() => {
  const fest = ports.previewCutoff.activePreviewFestivalName.value;
  return !!ports.previewSelections.previewFestivalFesToggles.value[String(fest || '').trim()];
});

const previewFestivalShowFes = computed(() => canTogglePreviewFestivalFes(ports.previewCutoff.activePreviewFestivalName.value));


return {
  currentPreviewFestivalRows,
  previewFestivalIncludeFes,
  previewFestivalShowFes,
};
}
