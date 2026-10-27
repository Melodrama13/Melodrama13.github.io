import { ref, computed, reactive } from 'vue';

/** Owns card festivals behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardFestivals(inputs) {
  const hideFestivalCharNames = ref(true);

  const festivalShowCardImages = ref(false);

  const festivalMergeToggles = reactive({
    新年: false,
    婚活: false,
    情人节: false,
    白情: false,
    半周年: false,
    周年: false
  });

  const festivalMergeHigherRanks = computed({
    get: () => Object.keys(festivalMergeToggles).every((fest) => !!festivalMergeToggles[fest]),
    set: (value) => {
      const checked = !!value;
      Object.keys(festivalMergeToggles).forEach((fest) => {
        festivalMergeToggles[fest] = checked;
      });
    }
  });

  const festivalMergeHigherRanksIndeterminate = computed(() => {
    const values = Object.keys(festivalMergeToggles).map((fest) => !!festivalMergeToggles[fest]);
    return values.some(Boolean) && values.some((value) => !value);
  });

  const festivalFesToggles = reactive({
    半周年: false,
    周年: false
  });

  const festivalFesEnabled = computed({
    get: () => !!festivalFesToggles['半周年'] && !!festivalFesToggles['周年'],
    set: (value) => {
      const checked = !!value;
      festivalFesToggles['半周年'] = checked;
      festivalFesToggles['周年'] = checked;
    }
  });

  const festivalFesEnabledIndeterminate = computed(() => {
    const values = ['半周年', '周年'].map((fest) => !!festivalFesToggles[fest]);
    return values.some(Boolean) && values.some((value) => !value);
  });

  const STEP_FESTIVAL_AVATAR_BORDER_MODE = 'unit';

  const STEP_FESTIVAL_AVATAR_BORDER_WIDTH = 2;

  const getStepFestivalAvatarBorderColor = (name) => {
    if (STEP_FESTIVAL_AVATAR_BORDER_MODE === 'char') {
      return inputs.metadata.getCharColor(name);
    }
    return inputs.metadata.UNIT_COLORS[inputs.metadata.getUnitByChar(name)] || '#d1d5db';
  };

  const getStepFestivalAvatarStyle = (name) => ({
    borderColor: getStepFestivalAvatarBorderColor(name),
    borderWidth: `${STEP_FESTIVAL_AVATAR_BORDER_WIDTH}px`
  });

  const normalizeFestivalCharName = (name) => {
    const raw = String(name || '').trim();
    if (!raw) return '';
    const [baseName] = raw.split(/\s+/);
    return inputs.metadata.CHAR_ORDER[baseName] ? baseName : '';
  };

  const parseFestivalCharKey = (charKey) => {
    const raw = String(charKey || '').trim();
    if (!raw) return { baseName: '', unit: '', isVs: false };
    const [baseName, suffixRaw] = raw.split(/\s+/);
    const unit = String(suffixRaw || '').toLowerCase();
    return {
      baseName,
      unit,
      isVs: inputs.metadata.isVirtualSinger(baseName)
    };
  };

  const buildFestivalCharKey = (card) => {
    const baseName = normalizeFestivalCharName(card?.Name);
    if (!baseName) return '';
    if (!inputs.metadata.isVirtualSinger(baseName)) return baseName;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (unit && unit !== 'vs' && inputs.constants.FESTIVAL_VS_UNIT_ORDER[unit]) {
      return `${baseName} ${unit}`;
    }
    return baseName;
  };

  const compareFestivalCharKey = (aKey, bKey) => {
    const a = parseFestivalCharKey(aKey);
    const b = parseFestivalCharKey(bKey);
    const baseDiff = (inputs.metadata.CHAR_ORDER[a.baseName] || 999) - (inputs.metadata.CHAR_ORDER[b.baseName] || 999);
    if (baseDiff !== 0) return baseDiff;

    if (a.isVs && b.isVs) {
      const au = inputs.constants.FESTIVAL_VS_UNIT_ORDER[a.unit || 'vs'] || 999;
      const bu = inputs.constants.FESTIVAL_VS_UNIT_ORDER[b.unit || 'vs'] || 999;
      if (au !== bu) return au - bu;
    }

    return String(aKey).localeCompare(String(bKey), 'zh-Hans-CN');
  };

  const getFestivalUnitLogoByName = (charName) => {
    const parsed = parseFestivalCharKey(charName);
    if (!parsed.isVs) return '';
    if (!parsed.unit || parsed.unit === 'vs') return '';
    return inputs.metadata.unitLogoMap[parsed.unit] || '';
  };

  const getFestivalDisplayNameLabel = (charName) => {
    const parsed = parseFestivalCharKey(charName);
    if (inputs.presentation.useSingleNameMark.value) {
      return inputs.presentation.getCharSingleMark(parsed.baseName || charName);
    }
    if (parsed?.isVs) {
      return inputs.metadata.CHAR_MAP[parsed.baseName] || inputs.metadata.getCharAbbr(parsed.baseName);
    }
    return inputs.metadata.getCharAbbr(charName);
  };

  const canToggleFestivalFes = (festival) => ['半周年', '周年'].includes(String(festival || '').trim());

  const shouldCountFestivalFes = (festival) => {
    if (!canToggleFestivalFes(festival)) return false;
    return festivalFesEnabled.value;
  };

  const onFestivalMergeHigherRanksChange = (event) => {
    const checked = !!event?.target?.checked;
    const shouldResetDefault = festivalMergeHigherRanksIndeterminate.value;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      festivalMergeHigherRanks.value = shouldResetDefault ? false : checked;
      if (shouldResetDefault && event?.target) {
        event.target.checked = false;
        event.target.indeterminate = false;
      }
    }, anchorEl);
  };

  const onFestivalFesEnabledChange = (event) => {
    const checked = !!event?.target?.checked;
    const shouldResetDefault = festivalFesEnabledIndeterminate.value;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      festivalFesEnabled.value = shouldResetDefault ? false : checked;
      if (shouldResetDefault && event?.target) {
        event.target.checked = false;
        event.target.indeterminate = false;
      }
    }, anchorEl);
  };

  const getFestivalTierCount = (tierKey) => {
    if (tierKey === 'four') return 4;
    if (tierKey === 'three') return 3;
    if (tierKey === 'two') return 2;
    return 0;
  };

  const getFestivalTierIcon = (tierKey) => (tierKey === 'four' ? '/elements/rarity_rstar.png' : '/elements/rarity_ystar.png');

  const festivalCharStats = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const allNames = Object.keys(inputs.metadata.CHAR_ORDER).sort((a, b) => (inputs.metadata.CHAR_ORDER[a] || 999) - (inputs.metadata.CHAR_ORDER[b] || 999));
    const eventFestivalMap = {};

    (inputs.props.allEvents || []).forEach((ev) => {
      if (inputs.eventCatalog.shouldSkipPredictEvent(ev)) return;
      if (!inputs.eventCatalog.isNumericEventId(ev?.id)) return;
      const eid = Number(ev.id);
      if (eid > maxEid) return;
      const fest = String(ev?.festival || '').trim();
      if (!inputs.constants.SPECIAL_FESTIVALS.includes(fest)) return;
      eventFestivalMap[eid] = fest;
    });

    const festCounts = Object.fromEntries(inputs.constants.SPECIAL_FESTIVALS.map((fest) => [
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
      const eventDate = inputs.eventCatalog.eventsById.value[eid]?.start_date;
      const dateObj = inputs.presentation.parseDateSafe(eventDate || card?.Date);
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
      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
      const cardId = String(card?.CardID || '').trim();
      const unit = parsed.unit || (parsed.isVs ? 'vs' : inputs.metadata.getUnitByChar(parsed.baseName));
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
        isFes: inputs.presentation.isFesCardType(type),
        orderId: inputs.distribution.getCardProgressOrderId(card),
        imageSrc: inputs.media.buildCardImageSrc(cardId, parsed.baseName, { rarity: String(frameRarity) })
      };
    };

    (inputs.props.allCards || []).forEach((card) => {
      const eid = String(card?.EventID || '').trim();
      if (!inputs.eventCatalog.isNumericEventId(eid)) return;
      const numericEid = Number(eid);
      const fest = eventFestivalMap[numericEid];
      if (!fest) return;

      const charName = buildFestivalCharKey(card);
      if (!charName) return;

      const baseName = parseFestivalCharKey(charName).baseName;
      if (!baseName) return;

      const type = String(card?.Type || '').trim().toLowerCase();
      const isFes = inputs.presentation.isFesCardType(type);
      if (isFes && !shouldCountFestivalFes(fest)) return;

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
      return !!festivalMergeToggles[festKey];
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

    return inputs.constants.SPECIAL_FESTIVALS.map((fest) => {
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
        anchorId: inputs.constants.FESTIVAL_ANCHOR_IDS[fest],
        rows: applyFestivalMerge(fest, rows),
        yearRows: buildFestivalYearRows(fest, festBucket),
        fourSlotCount: getFestivalFourSlotCount(fest),
        noneChars
      };
    });
  });

  return {
    festivalCharStats,
    getStepFestivalAvatarStyle,
    festivalShowCardImages,
    hideFestivalCharNames,
    festivalMergeHigherRanks,
    festivalMergeHigherRanksIndeterminate,
    onFestivalMergeHigherRanksChange,
    festivalMergeToggles,
    canToggleFestivalFes,
    festivalFesEnabled,
    festivalFesEnabledIndeterminate,
    onFestivalFesEnabledChange,
    getFestivalTierCount,
    getFestivalTierIcon,
    getFestivalUnitLogoByName,
    getFestivalDisplayNameLabel,
  };
}
