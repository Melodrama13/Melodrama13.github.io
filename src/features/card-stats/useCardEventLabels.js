

/** Owns card event labels behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardEventLabels(inputs) {
  const buildLineupEventRef = (card) => {
    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    const cardType = String(card?.Type || '').trim().toLowerCase();
    const skillKind = String(card?.Skill || '').trim().toLowerCase();
    const fesType = cardType === 'bfes' || cardType === 'cfes'
      ? cardType
      : (skillKind === 'bfes_up' ? 'bfes' : (skillKind.startsWith('cfes') ? 'cfes' : ''));
    const isFesCard = inputs.presentation.isFesCardType(cardType) || !!fesType;

    const attachFesMeta = (eventRef) => ({
      ...eventRef,
      isFesCard,
      fesType
    });

    if (!sourceKey) {
      return { eventRef: null, eventLabel: '-' };
    }
    if (!inputs.eventCatalog.isNumericEventId(sourceKey)) {
      const label = inputs.constants.SPECIAL_EVENT_KEY_LABELS[sourceKey] || sourceKey;
      return {
        eventRef: attachFesMeta({
          id: sourceKey,
          sourceKey,
          date: String(card?.Date || '').trim()
        }),
        eventLabel: label
      };
    }
    const ev = inputs.eventCatalog.eventsById.value[Number(sourceKey)];
    if (!ev) {
      if (Number(sourceKey) === 0) {
        return {
          eventRef: attachFesMeta({ id: 0, sourceKey: '0', date: String(card?.Date || '').trim() }),
          eventLabel: '开服'
        };
      }
      return {
        eventRef: attachFesMeta({ id: Number(sourceKey), sourceKey, date: String(card?.Date || '').trim() }),
        eventLabel: `ID ${sourceKey}`
      };
    }
    const eventRef = {
      id: Number(ev.id),
      date: ev.start_date,
      typeSeriesId: ev.type_series_id,
      eventType: String(ev.event_type || '').trim(),
      banner: String(ev.banner || '').trim(),
      unit: String(ev.unit || '').trim(),
      sourceKey: String(ev.id)
    };
    return { eventRef: attachFesMeta(eventRef), eventLabel: inputs.presentation.getNonBanEventMark(eventRef) };
  };

  const getLineupEventMark = (eventRef, useSingleMark = false) => {
    if (!eventRef) return '-';
    const sourceKey = String(eventRef.sourceKey || eventRef.id || '').trim();
    if (!sourceKey) return '-';
    if (sourceKey === '0') return '开服';
    if (!inputs.eventCatalog.isNumericEventId(sourceKey)) {
      return inputs.constants.SPECIAL_EVENT_KEY_LABELS[sourceKey] || sourceKey;
    }

    const typeSeries = inputs.presentation.getTypeSeriesText(eventRef.typeSeriesId);
    const eventType = String(eventRef.eventType || '').trim();
    const shortType = inputs.presentation.getEventTypeShort(eventType);

    if (useSingleMark && (eventType === 'World Link' || eventType === 'World Link终章')) {
      if (eventType === 'World Link' && Number(typeSeries) === 3) {
        return eventRef.isFesCard ? 'wl3(fes)' : 'wl3';
      }
      const base = typeSeries ? `wl${typeSeries}` : 'wl';
      return eventRef.isFesCard ? `${base}(fes)` : base;
    }

    const bannerName = inputs.presentation.normalizeBannerName(eventRef.banner);
    const bannerMark = bannerName
      ? (useSingleMark ? inputs.presentation.getCharSingleMark(bannerName) : inputs.metadata.getCharAbbr(bannerName).toLowerCase())
      : '';
    const unitMark = String(eventRef.unit || '').trim().toLowerCase();

    if (eventType === 'World Link' || eventType === 'World Link终章') {
      if (eventType === 'World Link' && Number(typeSeries) === 3) {
        const base = `wl3${inputs.presentation.getWl3PartSuffix(eventRef)}`;
        return eventRef.isFesCard ? `${base}(fes)` : base;
      }
      const wlHead = bannerMark || unitMark || 'vs';
      const base = typeSeries ? `${wlHead} wl${typeSeries}` : `${wlHead} wl`;
      return eventRef.isFesCard ? `${base}(fes)` : base;
    }

    let base = '?';
    if (bannerMark && typeSeries) base = `${bannerMark}${typeSeries}${shortType}`;
    else if (bannerMark) base = `${bannerMark}${shortType}`;
    else if (unitMark && typeSeries) base = `${unitMark}${typeSeries}${shortType}`;
    else if (typeSeries) base = `${typeSeries}${shortType}`;
    else base = sourceKey;

    return eventRef.isFesCard ? `${base}(fes)` : base;
  };

  const getFesJumpLabel = (eventRef) => {
    const fesType = String(eventRef?.fesType || '').trim().toLowerCase();
    if (fesType === 'cfes') return 'CFES';
    if (fesType === 'bfes') return 'BFES';
    return 'FES';
  };

  const normalizeJumpLinkLabel = (label) => {
    const raw = String(label || '').trim();
    if (!raw) return '';
    return raw.replace(/\bwl(\d*)\b/gi, (_, part) => `WL${part || ''}`);
  };

  const getJumpLinkLabel = (eventRef, fallback = '-') => {
    if (!eventRef) return normalizeJumpLinkLabel(fallback) || '-';
    if (eventRef?.isFesCard) return getFesJumpLabel(eventRef);
    const mark = getLineupEventMark(eventRef, inputs.presentation.useSingleNameMark.value);
    return normalizeJumpLinkLabel(mark || fallback) || '-';
  };

  return {
    buildLineupEventRef,
    getJumpLinkLabel,
  };
}
