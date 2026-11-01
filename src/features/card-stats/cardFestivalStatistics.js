import { CARD_STATISTICS_DEFAULTS } from './cardStatisticsRules.js';

/** Shared character keys preserve subgroup identities and canonical character ordering. */
export function createFestivalCharacterRules({ characterOrder, isVirtualSinger, unitOrder }) {
  const normalizeFestivalCharName = (name) => {
    const raw = String(name || '').trim();
    if (!raw) return '';
    const [baseName] = raw.split(/\s+/);
    return characterOrder[baseName] ? baseName : '';
  };

  const parseFestivalCharKey = (charKey) => {
    const raw = String(charKey || '').trim();
    if (!raw) return { baseName: '', unit: '', isVs: false };
    const [baseName, suffixRaw] = raw.split(/\s+/);
    const unit = String(suffixRaw || '').toLowerCase();
    return {
      baseName,
      unit,
      isVs: isVirtualSinger(baseName)
    };
  };

  const buildFestivalCharKey = (card) => {
    const baseName = normalizeFestivalCharName(card?.Name);
    if (!baseName) return '';
    if (!isVirtualSinger(baseName)) return baseName;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (unit && unit !== 'vs' && unitOrder[unit]) {
      return `${baseName} ${unit}`;
    }
    return baseName;
  };

  const compareFestivalCharKey = (aKey, bKey) => {
    const a = parseFestivalCharKey(aKey);
    const b = parseFestivalCharKey(bKey);
    const baseDiff = (characterOrder[a.baseName] || 999) - (characterOrder[b.baseName] || 999);
    if (baseDiff !== 0) return baseDiff;

    if (a.isVs && b.isVs) {
      const au = unitOrder[a.unit || 'vs'] || 999;
      const bu = unitOrder[b.unit || 'vs'] || 999;
      if (au !== bu) return au - bu;
    }

    return String(aKey).localeCompare(String(bKey), 'zh-Hans-CN');
  };

  return { parseFestivalCharKey, buildFestivalCharKey, compareFestivalCharKey };
}

/** Pure festival aggregation; view adapters supply labels and optional card media. */
export function calculateCardFestivalStatistics({
  cards = [], events = [], maxEventId, characterOrder, isVirtualSinger, unitOrder,
  festivals, anchorIds = {}, eventsById = Object.fromEntries(events.map(event => [event.id, event])),
  shouldSkipPredictEvent = () => false, isNumericEventId = value => /^\d+$/.test(String(value)),
  parseDateSafe, normalizeAttribute, isFesCardType, getCardProgressOrderId,
  getUnitByChar = () => '', unitLogoMap = {}, getFestivalDisplayNameLabel = name => name, buildCardImageSrc = () => '',
  mergeHigherRanks = {}, includeFes = () => CARD_STATISTICS_DEFAULTS.includeFestivalFes,
}) {
  const maxEid = maxEventId;
  const { parseFestivalCharKey, buildFestivalCharKey, compareFestivalCharKey } = createFestivalCharacterRules({ characterOrder, isVirtualSinger, unitOrder });
  const canToggleFestivalFes = festival => ['半周年', '周年'].includes(String(festival || '').trim());
  const getFestivalUnitLogoByName = name => {
    const parsed = parseFestivalCharKey(name);
    return parsed.isVs && parsed.unit && parsed.unit !== 'vs' ? unitLogoMap[parsed.unit] || '' : '';
  };
  const allNames = Object.keys(characterOrder).sort((a, b) => (characterOrder[a] || 999) - (characterOrder[b] || 999));
  const eventFestivalMap = {};

  (events || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;
    const fest = String(ev?.festival || '').trim();
    if (!festivals.includes(fest)) return;
    eventFestivalMap[eid] = fest;
  });

  const festCounts = Object.fromEntries(festivals.map((fest) => [
    fest,
    {
      four: {},
      three: {},
      two: {},
      fourMeta: {},
      years: {},
      seenBase: new Set()
    }
  ]));

  let festivalCardSeq = 0;
  const getFestivalYearValue = (card, eid, festival) => {
    const eventDate = eventsById[eid]?.start_date;
    const dateObj = parseDateSafe(eventDate || card?.Date);
    if (dateObj) {
      const year = dateObj.getFullYear();
      return String(festival || '').trim() === '新年' ? year + 1 : year;
    }
    const matched = String(eventDate || card?.Date || '').match(/^(\d{4})/);
    if (!matched) return 0;
    const year = Number(matched[1]);
    return String(festival || '').trim() === '新年' ? year + 1 : year;
  };

  const ensureFestivalYearRow = (festBucket, year) => {
    const yearKey = String(year || '未知');
    if (!festBucket.years[yearKey]) {
      festBucket.years[yearKey] = {
        year: yearKey,
        four: [],
        three: [],
        two: [],
        fes: []
      };
    }
    return festBucket.years[yearKey];
  };

  const buildFestivalCardEntry = (card, charName, tierKey, type) => {
    const parsed = parseFestivalCharKey(charName);
    const rarity = String(card?.Rarity || '').trim();
    const rarityNum = Number(rarity);
    const frameRarity = Number.isFinite(rarityNum) && rarityNum >= 1 && rarityNum <= 4 ? rarityNum : 4;
    const attr = normalizeAttribute(card?.Attribute);
    const cardId = String(card?.CardID || '').trim();
    const unit = parsed.unit || (parsed.isVs ? 'vs' : getUnitByChar(parsed.baseName));
    const isPermOnly = tierKey === 'four' && type === 'perm';
    festivalCardSeq += 1;
    return {
      key: `${cardId || 'na'}-${charName}-${festivalCardSeq}`,
      cardId,
      name: charName,
      baseName: parsed.baseName,
      label: getFestivalDisplayNameLabel(charName),
      title: `${getFestivalDisplayNameLabel(charName)} #${cardId || '-'}`,
      tierKey,
      attr,
      unit,
      unitLogo: getFestivalUnitLogoByName(charName),
      fesLogo: `/elements/fes_${String(type || 'cfes').toLowerCase() === 'bfes' ? 'bloom' : 'colorful'}.webp`,
      frameRarity,
      isPermOnly,
      isFes: isFesCardType(type),
      orderId: getCardProgressOrderId(card),
      imageSrc: buildCardImageSrc(cardId, parsed.baseName, { rarity: String(frameRarity) })
    };
  };

  (cards || []).forEach((card) => {
    const eid = String(card?.EventID || '').trim();
    if (!isNumericEventId(eid)) return;
    const numericEid = Number(eid);
    const fest = eventFestivalMap[numericEid];
    if (!fest) return;

    const charName = buildFestivalCharKey(card);
    if (!charName) return;

    const baseName = parseFestivalCharKey(charName).baseName;
    if (!baseName) return;

    const type = String(card?.Type || '').trim().toLowerCase();
    const isFes = isFesCardType(type);
    if (isFes && !includeFes(fest)) return;

    const rarity = String(card?.Rarity || '').trim();
    const festBucket = festCounts[fest];
    const year = getFestivalYearValue(card, numericEid, fest);
    const yearRow = ensureFestivalYearRow(festBucket, year);

    if (rarity === '4' || isFes) {
      festBucket.four[charName] = (festBucket.four[charName] || 0) + 1;
      if (!festBucket.fourMeta[charName]) {
        festBucket.fourMeta[charName] = { perm: 0, nonPerm: 0 };
      }
      if (type === 'perm') festBucket.fourMeta[charName].perm += 1;
      else festBucket.fourMeta[charName].nonPerm += 1;
      festBucket.seenBase.add(baseName);
      const entry = buildFestivalCardEntry(card, charName, 'four', type);
      if (isFes) yearRow.fes.push(entry);
      else yearRow.four.push(entry);
      return;
    }
    if (rarity === '3') {
      festBucket.three[charName] = (festBucket.three[charName] || 0) + 1;
      festBucket.seenBase.add(baseName);
      yearRow.three.push(buildFestivalCardEntry(card, charName, 'three', type));
      return;
    }
    if (rarity === '2') {
      festBucket.two[charName] = (festBucket.two[charName] || 0) + 1;
      festBucket.seenBase.add(baseName);
      yearRow.two.push(buildFestivalCardEntry(card, charName, 'two', type));
    }
  });

  const buildCountRow = (countMap, options = {}) => Object.entries(countMap || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([name, count]) => {
      const meta = options.fourMeta?.[name];
      const isPermOnly = !!meta && meta.perm > 0 && meta.nonPerm === 0;
      return { name, count: Number(count), isPermOnly };
    })
    .sort((a, b) => compareFestivalCharKey(a.name, b.name));
  const getFestivalBaseName = (charName) => parseFestivalCharKey(charName).baseName;
  const getFestivalCardBaseName = (card) => parseFestivalCharKey(card?.name).baseName;

  const shouldMergeFestivalRows = (festival) => {
    const festKey = String(festival || '').trim();
    return !!(mergeHigherRanks[festKey] ?? CARD_STATISTICS_DEFAULTS.festivalMergeHigherRanks);
  };

  const applyFestivalMerge = (festival, rows) => {
    if (!shouldMergeFestivalRows(festival)) return rows;
    const fourRow = rows.find((row) => row.key === 'four') || { chars: [] };
    const threeRow = rows.find((row) => row.key === 'three') || { chars: [] };
    const twoRow = rows.find((row) => row.key === 'two') || { chars: [] };

    const fourBaseSet = new Set((fourRow.chars || []).map((item) => getFestivalBaseName(item.name)).filter(Boolean));
    const mergedThreeChars = (threeRow.chars || []).filter((item) => !fourBaseSet.has(getFestivalBaseName(item.name)));
    const threeBaseSet = new Set(mergedThreeChars.map((item) => getFestivalBaseName(item.name)).filter(Boolean));
    const mergedTwoChars = (twoRow.chars || []).filter((item) => {
      const base = getFestivalBaseName(item.name);
      if (!base) return false;
      return !fourBaseSet.has(base) && !threeBaseSet.has(base);
    });

    return rows.map((row) => {
      if (row.key === 'three') return { ...row, chars: mergedThreeChars };
      if (row.key === 'two') return { ...row, chars: mergedTwoChars };
      return row;
    });
  };

  const getFestivalFourSlotCount = (festival) => (canToggleFestivalFes(festival) ? 4 : 3);
  const buildFestivalSlots = (items, minCount, options = {}) => {
    const slots = [];
    const getSpanTotal = () => slots.reduce((sum, slot) => sum + Number(slot.span || 1), 0);
    if (options.logo) {
      slots.push({
        type: 'logo',
        key: `${options.keyPrefix || 'slot'}-logo`,
        logo: options.logo,
        label: options.label || 'FES',
        span: Number(options.logoSpan || 1)
      });
    }
    (items || []).forEach((item) => slots.push({ type: 'card', key: item.key, card: item, span: 1 }));
    while (getSpanTotal() < minCount) {
      slots.push({ type: 'empty', key: `${options.keyPrefix || 'slot'}-empty-${slots.length}` });
    }
    return slots;
  };

  const getFestivalFesLogo = (items) => {
    const first = (items || [])[0];
    return first?.fesLogo || '/elements/fes_colorful.webp';
  };

  const buildFestivalYearRows = (festival, festBucket) => {
    const fourSlotCount = getFestivalFourSlotCount(festival);
    return Object.values(festBucket.years || {})
      .map((row) => {
        const sortCards = (cards) => [...(cards || [])].sort((a, b) => {
          if (a.orderId !== b.orderId) return a.orderId - b.orderId;
          return compareFestivalCharKey(a.name, b.name);
        });
        const four = sortCards(row.four);
        const three = sortCards(row.three);
        const two = sortCards(row.two);
        const fes = sortCards(row.fes);
        return {
          ...row,
          four,
          three,
          two,
          fes,
          fourSlots: buildFestivalSlots(four, fourSlotCount, { keyPrefix: `${festival}-${row.year}-four` }),
          fesSlots: buildFestivalSlots(fes, fourSlotCount + 2, { keyPrefix: `${festival}-${row.year}-fes`, logo: getFestivalFesLogo(fes), logoSpan: 2, label: 'FES' })
        };
      })
      .filter((row) => row.four.length || row.three.length || row.two.length || row.fes.length)
      .sort((a, b) => {
        const ay = Number(a.year);
        const by = Number(b.year);
        if (Number.isFinite(ay) && Number.isFinite(by) && ay !== by) return ay - by;
        return String(a.year).localeCompare(String(b.year), 'zh-Hans-CN');
      });
  };

  return festivals.map((fest) => {
    const festBucket = festCounts[fest];
    const rows = [
      { key: 'four', label: '4星', chars: buildCountRow(festBucket.four, { fourMeta: festBucket.fourMeta }) },
      { key: 'three', label: '3星', chars: buildCountRow(festBucket.three) },
      { key: 'two', label: '2星', chars: buildCountRow(festBucket.two) }
    ];

    const noneChars = allNames
      .filter((name) => !festBucket.seenBase.has(name))
      .map((name) => ({ name, count: 0 }));

    rows.push({ key: 'none', label: '未出', chars: noneChars });
    return {
      festival: fest,
      anchorId: anchorIds[fest],
      rows: applyFestivalMerge(fest, rows),
      yearRows: buildFestivalYearRows(fest, festBucket),
      fourSlotCount: getFestivalFourSlotCount(fest),
      noneChars
    };
  });
}
