import { ref, computed } from 'vue';

/** Owns card related records behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardRelatedRecords(inputs) {
  const relatedLastRecordShowCardImages = ref(false);

  const intervalFourShowCardImages = ref(false);

  const intervalLimitedShowCardImages = ref(false);

  const intervalBanShowCardImages = ref(false);

  const buildGapRanges = (eventList, countFn) => {
    const ranges = [];
    for (let i = 1; i < eventList.length; i += 1) {
      const prev = eventList[i - 1];
      const curr = eventList[i];
      ranges.push({
        startMark: inputs.presentation.getNonBanEventMark(prev),
        endMark: inputs.presentation.getNonBanEventMark(curr),
        startRef: prev,
        endRef: curr,
        startTypeSeriesId: prev.typeSeriesId,
        endTypeSeriesId: curr.typeSeriesId,
        startEventType: prev.eventType,
        endEventType: curr.eventType,
        days: inputs.presentation.daysBetween(prev.date, curr.date),
        periods: countFn(prev, curr)
      });
    }
    return ranges;
  };

  const pickGap = (ranges, mode) => {
    if (!ranges.length) return null;
    return [...ranges].sort((a, b) => {
      if (mode === 'max') {
        if (b.days !== a.days) return b.days - a.days;
        return b.periods - a.periods;
      }
      if (a.days !== b.days) return a.days - b.days;
      return a.periods - b.periods;
    })[0];
  };

  const pickGapByPeriods = (ranges, mode) => {
    if (!ranges.length) return null;
    return [...ranges].sort((a, b) => {
      if (mode === 'max') {
        if (b.periods !== a.periods) return b.periods - a.periods;
        return b.days - a.days;
      }
      if (a.periods !== b.periods) return a.periods - b.periods;
      return a.days - b.days;
    })[0];
  };

  const onRelatedLastRecordShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      relatedLastRecordShowCardImages.value = checked;
    }, anchorEl);
  };

  const getIntervalPanelShowCardImageValues = () => [
    !!relatedLastRecordShowCardImages.value,
    !!intervalFourShowCardImages.value,
    !!intervalLimitedShowCardImages.value,
    !!intervalBanShowCardImages.value
  ];

  const intervalPanelShowCardImagesAll = computed({
    get: () => getIntervalPanelShowCardImageValues().every(Boolean),
    set: (value) => {
      const checked = !!value;
      relatedLastRecordShowCardImages.value = checked;
      intervalFourShowCardImages.value = checked;
      intervalLimitedShowCardImages.value = checked;
      intervalBanShowCardImages.value = checked;
    }
  });

  const intervalPanelShowCardImagesIndeterminate = computed(() => (
    inputs.panelControls.hasMixedBooleanValues(getIntervalPanelShowCardImageValues())
  ));

  const onIntervalPanelShowAllCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const shouldResetDefault = intervalPanelShowCardImagesIndeterminate.value;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      intervalPanelShowCardImagesAll.value = shouldResetDefault ? false : checked;
      if (shouldResetDefault && event?.target) {
        event.target.checked = false;
        event.target.indeterminate = false;
      }
    }, anchorEl);
  };

  const onIntervalFourShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      intervalFourShowCardImages.value = checked;
    }, anchorEl);
  };

  const onIntervalLimitedShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      intervalLimitedShowCardImages.value = checked;
    }, anchorEl);
  };

  const onIntervalBanShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      intervalBanShowCardImages.value = checked;
    }, anchorEl);
  };

  const charEventBuckets = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const maxEventDate = inputs.presentation.parseDateSafe(inputs.eventCatalog.eventsById.value[maxEid]?.start_date);
    const buckets = {};

    (inputs.props.allCards || []).forEach((card) => {
      const name = String(card?.Name || '').trim();
      if (!name || name === '-' || name === 'CardID') return;
      if (!inputs.metadata.CHAR_ORDER[name]) return;
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;

      const eidRaw = String(card?.EventID || '').trim();
      const gachaRaw = String(card?.GachaID || '').trim();
      const sourceKey = eidRaw || gachaRaw;
      if (!sourceKey) return;

      const isNum = inputs.eventCatalog.isNumericEventId(sourceKey);
      const eventIdOrKey = isNum ? Number(sourceKey) : sourceKey;
      const ev = isNum ? inputs.eventCatalog.eventsById.value[Number(sourceKey)] : null;
      const cardDate = inputs.presentation.parseDateSafe(card?.Date);
      if (!isNum && maxEventDate && cardDate && cardDate > maxEventDate) return;

      if (!buckets[name]) {
        buckets[name] = {
          four: new Set(),
          limited: new Set(),
          eventMeta: {}
        };
      }

      if (!buckets[name].eventMeta[sourceKey]) {
        buckets[name].eventMeta[sourceKey] = {
          id: eventIdOrKey,
          date: String(ev?.start_date || card?.Date || ''),
          title: String(ev?.event_title || '').trim() || `ID ${sourceKey}`,
          typeSeriesId: ev?.type_series_id,
          eventType: String(ev?.event_type || '').trim(),
          banner: String(ev?.banner || '').trim(),
          unit: String(ev?.unit || '').trim() || String(card?.Affiliation || '').trim(),
          sourceKey,
          isFesCard: false,
          fesType: ''
        };
      }

      if (inputs.presentation.isFesCardType(card?.Type)) {
        buckets[name].eventMeta[sourceKey].isFesCard = true;
        const fesType = String(card?.Type || '').trim().toLowerCase();
        if (fesType === 'bfes' || fesType === 'cfes') {
          const prev = String(buckets[name].eventMeta[sourceKey].fesType || '').trim().toLowerCase();
          if (!prev || (prev === 'cfes' && fesType === 'bfes')) {
            buckets[name].eventMeta[sourceKey].fesType = fesType;
          }
        }
      }

      if (String(card?.Rarity || '').trim() === '4') {
        buckets[name].four.add(sourceKey);
      }
      if (inputs.distribution.shouldIncludeCardInLimitedStats(card)) {
        buckets[name].limited.add(sourceKey);
      }
    });

    const toEvents = (set, metaMap) => [...set]
      .map((key) => metaMap[key])
      .filter(Boolean)
      .sort((a, b) => {
        const da = inputs.presentation.parseDateSafe(a.date)?.getTime() || 0;
        const db = inputs.presentation.parseDateSafe(b.date)?.getTime() || 0;
        if (da !== db) return da - db;
        return String(a.sourceKey).localeCompare(String(b.sourceKey));
      });

    const result = {};
    Object.keys(buckets).forEach((name) => {
      result[name] = {
        four: toEvents(buckets[name].four, buckets[name].eventMeta),
        limited: toEvents(buckets[name].limited, buckets[name].eventMeta)
      };
    });
    return result;
  });

  const lastFourStarRecords = computed(() => {
    return Object.keys(charEventBuckets.value)
      .map((name) => {
        const arr = charEventBuckets.value[name].four;
        if (!arr.length) return null;
        const last = arr[arr.length - 1];
        return {
          name,
          eventId: Number(last.id),
          eventLabel: inputs.presentation.getNonBanEventMark(last),
          eventRef: last,
          date: last.date,
          months: inputs.presentation.monthsSince(last.date),
          periods: inputs.eventCatalog.countPeriodsSince(last)
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const da = inputs.presentation.parseDateSafe(a.date)?.getTime() || 0;
        const db = inputs.presentation.parseDateSafe(b.date)?.getTime() || 0;
        // Older first (longer since last appearance should be on top)
        if (da !== db) return da - db;
        return inputs.presentation.compareCharOrder(a.name, b.name);
      });
  });

  const lastLimitedRecords = computed(() => {
    return Object.keys(charEventBuckets.value)
      .map((name) => {
        const arr = charEventBuckets.value[name].limited;
        if (!arr.length) return null;
        const last = arr[arr.length - 1];
        return {
          name,
          eventId: Number(last.id),
          eventLabel: inputs.presentation.getNonBanEventMark(last),
          eventRef: last,
          date: last.date,
          months: inputs.presentation.monthsSince(last.date),
          periods: inputs.eventCatalog.countPeriodsSince(last)
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const da = inputs.presentation.parseDateSafe(a.date)?.getTime() || 0;
        const db = inputs.presentation.parseDateSafe(b.date)?.getTime() || 0;
        // Older first (longer since last appearance should be on top)
        if (da !== db) return da - db;
        return inputs.presentation.compareCharOrder(a.name, b.name);
      });
  });

  const buildRelatedRecordCardInfoMap = (matcher) => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const maxEventDate = inputs.presentation.parseDateSafe(inputs.eventCatalog.eventsById.value[maxEid]?.start_date);
    const result = {};

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      if (typeof matcher === 'function' && !matcher(card)) return;

      const rawName = String(card?.Name || '').trim();
      const baseName = inputs.metadata.getCardBaseName(rawName);
      if (!baseName || !inputs.metadata.CHAR_ORDER[baseName]) return;

      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      if (!sourceKey) return;

      const isNumSource = inputs.eventCatalog.isNumericEventId(sourceKey);
      if (!isNumSource && maxEventDate) {
        const cardDate = inputs.presentation.parseDateSafe(card?.Date);
        if (cardDate && cardDate > maxEventDate) return;
      }

      const cardId = Number(card?.CardID);
      if (!Number.isFinite(cardId) || cardId <= 0) return;
      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
      const rarity = String(card?.Rarity || '').trim();

      const mapKey = `${baseName}::${sourceKey}`;
      const prev = result[mapKey];
      if (!prev || cardId > Number(prev?.cardId || 0)) {
        result[mapKey] = {
          cardId,
          attr: inputs.constants.ATTRS.includes(attr) ? attr : '',
          rarity
        };
      }
    });

    return result;
  };

  const relatedLastRecordCardInfoMap = computed(() => buildRelatedRecordCardInfoMap(() => true));

  const relatedFourStarCardInfoMap = computed(() => buildRelatedRecordCardInfoMap((card) => (
    String(card?.Rarity || '').trim() === '4'
  )));

  const relatedLimitedCardInfoMap = computed(() => buildRelatedRecordCardInfoMap((card) => {
    if (String(card?.Rarity || '').trim() !== '4') return false;
    return inputs.distribution.shouldIncludeCardInLimitedStats(card);
  }));

  const getRelatedRecordCardInfo = (name, eventRef, options = {}) => {
    const baseName = String(name || '').trim();
    if (!baseName) return { imageSrc: '', attr: '' };

    const sourceKey = String(eventRef?.sourceKey || (inputs.eventCatalog.isNumericEventId(eventRef?.id) ? eventRef.id : '') || '').trim();
    if (!sourceKey) return { imageSrc: '', attr: '' };

    const mapKey = `${baseName}::${sourceKey}`;
    const mode = String(options?.mode || '').trim().toLowerCase();
    const useFourStarOnly = options?.fourStarOnly === true;
    const useLimitedOnly = mode === 'limited';
    const useFourOnly = mode === 'four' || (useFourStarOnly && !useLimitedOnly);
    const infoMap = useLimitedOnly
      ? relatedLimitedCardInfoMap.value
      : (useFourOnly ? relatedFourStarCardInfoMap.value : relatedLastRecordCardInfoMap.value);
    const info = infoMap[mapKey] || null;
    const cardId = Number(info?.cardId || 0);
    if (!Number.isFinite(cardId) || cardId <= 0) return { imageSrc: '', attr: '' };

    return {
      imageSrc: inputs.media.buildCardImageSrc(cardId, baseName, { rarity: info?.rarity }),
      attr: inputs.constants.ATTRS.includes(String(info?.attr || '')) ? String(info.attr) : ''
    };
  };

  const getRelatedLastRecordCardInfo = (name, eventRef) => {
    return getRelatedRecordCardInfo(name, eventRef, { mode: 'all' });
  };

  const getRelatedLimitedRecordCardInfo = (name, eventRef) => {
    return getRelatedRecordCardInfo(name, eventRef, { mode: 'limited' });
  };

  const vsUnitLastFourCardInfoMap = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const maxEventDate = inputs.presentation.parseDateSafe(inputs.eventCatalog.eventsById.value[maxEid]?.start_date);
    const result = {};

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const fullName = String(card?.Name || '').trim();
      const baseName = inputs.metadata.getCardBaseName(fullName);
      if (!inputs.metadata.VS_NAMES.includes(baseName)) return;

      const unit = String(card?.Affiliation || '').trim().toLowerCase();
      if (!inputs.constants.VS_UNIT_SORT_ORDER.includes(unit)) return;

      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      if (!sourceKey) return;

      const isNumSource = inputs.eventCatalog.isNumericEventId(sourceKey);
      if (!isNumSource && maxEventDate) {
        const cardDate = inputs.presentation.parseDateSafe(card?.Date);
        if (cardDate && cardDate > maxEventDate) return;
      }

      const cardId = Number(card?.CardID);
      if (!Number.isFinite(cardId) || cardId <= 0) return;
      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);

      const mapKey = `${baseName}::${unit}::${sourceKey}`;
      const prev = result[mapKey];
      if (!prev || cardId > Number(prev?.cardId || 0)) {
        result[mapKey] = {
          cardId,
          attr: inputs.constants.ATTRS.includes(attr) ? attr : ''
        };
      }
    });

    return result;
  });

  const getVsUnitLastFourCardInfo = (row) => {
    const { baseName, unit } = inputs.vsRecords.parseVsUnitKey(row?.key);
    if (!baseName || !inputs.constants.VS_UNIT_SORT_ORDER.includes(unit)) return { imageSrc: '', attr: '' };
    const sourceKey = String(row?.eventRef?.sourceKey || '').trim();
    if (!sourceKey) return { imageSrc: '', attr: '' };

    const mapKey = `${baseName}::${unit}::${sourceKey}`;
    const info = vsUnitLastFourCardInfoMap.value[mapKey] || null;
    const cardId = Number(info?.cardId || 0);
    if (!Number.isFinite(cardId) || cardId <= 0) return { imageSrc: '', attr: '' };

    const folder = inputs.media.getCardFolderByName(baseName);
    if (!folder) return { imageSrc: '', attr: '' };
    return {
      imageSrc: inputs.media.buildCardImageSrc(cardId, baseName, { rarity: '4' }),
      attr: inputs.constants.ATTRS.includes(String(info?.attr || '')) ? String(info.attr) : ''
    };
  };

  const lastFourStarDisplayRecords = computed(() => (
    (lastFourStarRecords.value || []).map((row) => {
      const cardInfo = getRelatedLastRecordCardInfo(row.name, row.eventRef);
      return {
        ...row,
        cardImageSrc: cardInfo.imageSrc,
        cardAttr: cardInfo.attr
      };
    })
  ));

  const lastLimitedDisplayRecords = computed(() => (
    (lastLimitedRecords.value || []).map((row) => {
      const cardInfo = getRelatedLimitedRecordCardInfo(row.name, row.eventRef);
      return {
        ...row,
        cardImageSrc: cardInfo.imageSrc,
        cardAttr: cardInfo.attr
      };
    })
  ));

  const vsUnitLastFourDisplayRecords = computed(() => (
    (inputs.vsRecords.vsUnitLastFourRecordsSorted.value || []).map((row) => {
      const cardInfo = getVsUnitLastFourCardInfo(row);
      return {
        ...row,
        cardImageSrc: cardInfo.imageSrc,
        cardAttr: cardInfo.attr
      };
    })
  ));

  const fourStarLongestDisplayRecords = computed(() => (
    (fourStarLongestIntervals.value || []).map((row) => {
      const startCard = getRelatedRecordCardInfo(row.name, row?.longest?.startRef, { mode: 'four' });
      const endCard = getRelatedRecordCardInfo(row.name, row?.longest?.endRef, { mode: 'four' });
      return {
        ...row,
        longestStartCardImageSrc: startCard.imageSrc,
        longestStartCardAttr: startCard.attr,
        longestEndCardImageSrc: endCard.imageSrc,
        longestEndCardAttr: endCard.attr
      };
    })
  ));

  const fourStarShortestDisplayRecords = computed(() => (
    (fourStarShortestIntervals.value || []).map((row) => {
      const startCard = getRelatedRecordCardInfo(row.name, row?.shortest?.startRef, { mode: 'four' });
      const endCard = getRelatedRecordCardInfo(row.name, row?.shortest?.endRef, { mode: 'four' });
      return {
        ...row,
        shortestStartCardImageSrc: startCard.imageSrc,
        shortestStartCardAttr: startCard.attr,
        shortestEndCardImageSrc: endCard.imageSrc,
        shortestEndCardAttr: endCard.attr
      };
    })
  ));

  const limitedLongestDisplayRecords = computed(() => (
    (limitedLongestIntervals.value || []).map((row) => {
      const startCard = getRelatedRecordCardInfo(row.name, row?.longest?.startRef, { mode: 'limited' });
      const endCard = getRelatedRecordCardInfo(row.name, row?.longest?.endRef, { mode: 'limited' });
      return {
        ...row,
        longestStartCardImageSrc: startCard.imageSrc,
        longestStartCardAttr: startCard.attr,
        longestEndCardImageSrc: endCard.imageSrc,
        longestEndCardAttr: endCard.attr
      };
    })
  ));

  const limitedShortestDisplayRecords = computed(() => (
    (limitedShortestIntervals.value || []).map((row) => {
      const startCard = getRelatedRecordCardInfo(row.name, row?.shortest?.startRef, { mode: 'limited' });
      const endCard = getRelatedRecordCardInfo(row.name, row?.shortest?.endRef, { mode: 'limited' });
      return {
        ...row,
        shortestStartCardImageSrc: startCard.imageSrc,
        shortestStartCardAttr: startCard.attr,
        shortestEndCardImageSrc: endCard.imageSrc,
        shortestEndCardAttr: endCard.attr
      };
    })
  ));

  const banLongestDisplayRecords = computed(() => (
    (banLongestIntervals.value || []).map((row) => {
      const startCard = getRelatedRecordCardInfo(row.name, row?.longest?.startRef, { mode: 'four' });
      const endCard = getRelatedRecordCardInfo(row.name, row?.longest?.endRef, { mode: 'four' });
      return {
        ...row,
        longestStartCardImageSrc: startCard.imageSrc,
        longestStartCardAttr: startCard.attr,
        longestEndCardImageSrc: endCard.imageSrc,
        longestEndCardAttr: endCard.attr
      };
    })
  ));

  const banShortestDisplayRecords = computed(() => (
    (banShortestIntervals.value || []).map((row) => {
      const startCard = getRelatedRecordCardInfo(row.name, row?.shortest?.startRef, { mode: 'four' });
      const endCard = getRelatedRecordCardInfo(row.name, row?.shortest?.endRef, { mode: 'four' });
      return {
        ...row,
        shortestStartCardImageSrc: startCard.imageSrc,
        shortestStartCardAttr: startCard.attr,
        shortestEndCardImageSrc: endCard.imageSrc,
        shortestEndCardAttr: endCard.attr
      };
    })
  ));

  const fourStarIntervalRecords = computed(() => {
    const nowGapDate = inputs.eventCatalog.referenceDateStr.value;
    return Object.keys(charEventBuckets.value)
      .map((name) => {
        const arr = charEventBuckets.value[name].four;
        if (!arr.length) return null;
        const ranges = buildGapRanges(arr, inputs.eventCatalog.countPeriodsBetweenExclusive);
        const historicalRanges = [...ranges];
        const last = arr[arr.length - 1];
        ranges.push({
          startMark: inputs.presentation.getNonBanEventMark(last),
          endMark: '至今',
          startRef: last,
          endRef: null,
          startTypeSeriesId: last.typeSeriesId,
          endTypeSeriesId: 'NOW',
          startEventType: last.eventType,
          endEventType: '当前',
          days: inputs.presentation.daysBetween(last.date, nowGapDate),
          periods: inputs.eventCatalog.countPeriodsSince(last)
        });
        return {
          name,
          longest: pickGapByPeriods(ranges, 'max'),
          shortest: pickGap(historicalRanges, 'min')
        };
      })
      .filter(Boolean);
  });

  const limitedIntervalRecords = computed(() => {
    const nowGapDate = inputs.eventCatalog.referenceDateStr.value;
    return Object.keys(charEventBuckets.value)
      .map((name) => {
        const arr = charEventBuckets.value[name].limited;
        if (!arr.length) return null;
        const ranges = buildGapRanges(arr, inputs.eventCatalog.countPeriodsBetweenExclusive);
        const historicalRanges = [...ranges];
        const last = arr[arr.length - 1];
        ranges.push({
          startMark: inputs.presentation.getNonBanEventMark(last),
          endMark: '至今',
          startRef: last,
          endRef: null,
          startTypeSeriesId: last.typeSeriesId,
          endTypeSeriesId: 'NOW',
          startEventType: last.eventType,
          endEventType: '当前',
          days: inputs.presentation.daysBetween(last.date, nowGapDate),
          periods: inputs.eventCatalog.countPeriodsSince(last)
        });
        return {
          name,
          longest: pickGapByPeriods(ranges, 'max'),
          shortest: pickGap(historicalRanges, 'min')
        };
      })
      .filter(Boolean);
  });

  const fourStarLongestIntervals = computed(() => {
    return [...fourStarIntervalRecords.value].sort((a, b) => {
      const ap = Number(a?.longest?.periods ?? -1);
      const bp = Number(b?.longest?.periods ?? -1);
      if (bp !== ap) return bp - ap;
      const ad = Number(a?.longest?.days ?? -1);
      const bd = Number(b?.longest?.days ?? -1);
      if (bd !== ad) return bd - ad;
      return inputs.presentation.compareCharOrder(a.name, b.name);
    });
  });

  const fourStarShortestIntervals = computed(() => {
    return [...fourStarIntervalRecords.value].sort((a, b) => {
      const ap = Number(a?.shortest?.periods ?? Number.POSITIVE_INFINITY);
      const bp = Number(b?.shortest?.periods ?? Number.POSITIVE_INFINITY);
      if (ap !== bp) return ap - bp;
      const ad = Number(a?.shortest?.days ?? Number.POSITIVE_INFINITY);
      const bd = Number(b?.shortest?.days ?? Number.POSITIVE_INFINITY);
      if (ad !== bd) return ad - bd;

      return inputs.presentation.compareCharOrder(a.name, b.name);
    });
  });

  const limitedLongestIntervals = computed(() => {
    return [...limitedIntervalRecords.value].sort((a, b) => {
      const ap = Number(a?.longest?.periods ?? -1);
      const bp = Number(b?.longest?.periods ?? -1);
      if (bp !== ap) return bp - ap;
      const ad = Number(a?.longest?.days ?? -1);
      const bd = Number(b?.longest?.days ?? -1);
      if (bd !== ad) return bd - ad;
      return inputs.presentation.compareCharOrder(a.name, b.name);
    });
  });

  const limitedShortestIntervals = computed(() => {
    return [...limitedIntervalRecords.value].sort((a, b) => {
      const ap = Number(a?.shortest?.periods ?? Number.POSITIVE_INFINITY);
      const bp = Number(b?.shortest?.periods ?? Number.POSITIVE_INFINITY);
      if (ap !== bp) return ap - bp;
      const ad = Number(a?.shortest?.days ?? Number.POSITIVE_INFINITY);
      const bd = Number(b?.shortest?.days ?? Number.POSITIVE_INFINITY);
      if (ad !== bd) return ad - bd;

      return inputs.presentation.compareCharOrder(a.name, b.name);
    });
  });

  const banIntervalRecords = computed(() => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const typeFilter = inputs.distribution.banEventTypeFilter.value;
    const nowGapDate = inputs.eventCatalog.referenceDateStr.value;
    const bucket = {};

    (inputs.props.allEvents || []).forEach((ev) => {
      if (inputs.eventCatalog.shouldSkipPredictEvent(ev)) return;
      if (!inputs.eventCatalog.isNumericEventId(ev?.id)) return;
      const eid = Number(ev.id);
      if (eid > maxEid) return;
      const eventType = String(ev?.event_type || '').trim();
      if (inputs.constants.EXCLUDED_PERIOD_EVENT_TYPES.has(eventType)) return;
      if (!inputs.distribution.isEventTypeSelected(typeFilter, eventType)) return;
      const name = inputs.presentation.normalizeBannerName(ev?.banner);
      if (!inputs.metadata.CHAR_ORDER[name]) return;
      if (inputs.metadata.VS_NAMES.includes(name)) return;

      if (!bucket[name]) bucket[name] = [];
      bucket[name].push({
        id: eid,
        sourceKey: String(eid),
        date: String(ev?.start_date || ''),
        typeSeriesId: ev?.type_series_id,
        eventType
      });
    });

    const selectedTypes = inputs.distribution.normalizeEventTypeFilter(typeFilter);
    const rowNames = selectedTypes.length === 0
      ? Object.keys(inputs.metadata.CHAR_ORDER).filter((name) => !inputs.metadata.VS_NAMES.includes(name))
      : Object.keys(bucket);

    return rowNames
      .map((name) => {
        const events = (bucket[name] || []).sort((a, b) => a.id - b.id);
        if (!events.length) {
          return { name, shortest: null, longest: null };
        }
        const ranges = buildGapRanges(events, inputs.eventCatalog.countPeriodsBetweenExclusive);
        const historicalRanges = [...ranges];
        const last = events[events.length - 1];
        // Align with four/limited longest logic: include gap from latest ban to current reference date.
        ranges.push({
          startMark: `${inputs.presentation.getTypeSeriesText(last.typeSeriesId) || '?'}${inputs.presentation.getEventTypeShort(last.eventType)}`,
          endMark: '至今',
          startRef: last,
          endRef: null,
          startTypeSeriesId: last.typeSeriesId,
          endTypeSeriesId: 'NOW',
          startEventType: last.eventType,
          endEventType: '当前',
          days: inputs.presentation.daysBetween(last.date, nowGapDate),
          periods: inputs.eventCatalog.countPeriodsSince(last)
        });
        return {
          name,
          shortest: pickGap(historicalRanges, 'min'),
          longest: pickGapByPeriods(ranges, 'max')
        };
      })
      .sort((a, b) => inputs.presentation.compareCharOrder(a.name, b.name));
  });

  const banLongestIntervals = computed(() => {
    return [...banIntervalRecords.value].sort((a, b) => {
      const ap = Number(a?.longest?.periods ?? -1);
      const bp = Number(b?.longest?.periods ?? -1);
      if (bp !== ap) return bp - ap;
      const ad = Number(a?.longest?.days ?? -1);
      const bd = Number(b?.longest?.days ?? -1);
      if (bd !== ad) return bd - ad;
      return inputs.presentation.compareCharOrder(a.name, b.name);
    });
  });

  const banShortestIntervals = computed(() => {
    return [...banIntervalRecords.value].sort((a, b) => {
      const ap = Number(a?.shortest?.periods ?? Number.POSITIVE_INFINITY);
      const bp = Number(b?.shortest?.periods ?? Number.POSITIVE_INFINITY);
      if (ap !== bp) return ap - bp;
      const ad = Number(a?.shortest?.days ?? Number.POSITIVE_INFINITY);
      const bd = Number(b?.shortest?.days ?? Number.POSITIVE_INFINITY);
      if (ad !== bd) return ad - bd;
      return inputs.presentation.compareCharOrder(a.name, b.name);
    });
  });

  return {
    getRelatedRecordCardInfo,
    relatedLastRecordShowCardImages,
    onRelatedLastRecordShowCardImagesChange,
    lastFourStarDisplayRecords,
    lastLimitedDisplayRecords,
    intervalFourShowCardImages,
    onIntervalFourShowCardImagesChange,
    fourStarLongestDisplayRecords,
    fourStarShortestDisplayRecords,
    intervalLimitedShowCardImages,
    onIntervalLimitedShowCardImagesChange,
    limitedLongestDisplayRecords,
    limitedShortestDisplayRecords,
    intervalBanShowCardImages,
    onIntervalBanShowCardImagesChange,
    banLongestDisplayRecords,
    banShortestDisplayRecords,
    intervalPanelShowCardImagesAll,
    intervalPanelShowCardImagesIndeterminate,
    onIntervalPanelShowAllCardImagesChange,
    vsUnitLastFourDisplayRecords,
  };
}
