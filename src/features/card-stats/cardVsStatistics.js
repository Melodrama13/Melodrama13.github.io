import { isWorldLinkCardType } from '../../domain/worldLink.js';

export function getVsOriginalStatType(card, sourceKey) {
  const normalizedSourceKey = String(sourceKey || '').trim().toLowerCase();
  if (normalizedSourceKey === 'c1') return '大罪';

  const cardType = String(card?.Type || '').trim().toLowerCase();
  if (cardType === 'cfes') return 'CFES';
  if (cardType === 'bfes') return 'BFES';
  if (isWorldLinkCardType(cardType)) return cardType.toUpperCase();
  return '其他';
}

/** Pure full-page VS rules reused by floating panels; presentation callbacks retain page metadata. */
export function calculateCardVsStatistics({
  cards = [], maxEventId, eventsById, sourceEventsById = {}, cutoffDate, vsNames, unitOrder, statTypes, attributes,
  isCardWithinLimit, isNumericEventId = value => /^\d+$/.test(String(value)),
  parseDateSafe, normalizeAttribute, getCardProgressOrderId,
  buildCardImageSrc = () => '', getVsUnitRecordLabel = key => key,
  getNonBanEventMark = () => '', referenceDate, countPeriodsSince = () => 0,
}) {
  const getSourceDate = (card, sourceKey, event) => String(
    event?.start_date || card?.Date || sourceEventsById[sourceKey]?.start_date || ''
  ).trim();
  const daysBetween = (dateA, dateB) => {
    const a = parseDateSafe(dateA);
    const b = parseDateSafe(dateB);
    return a && b ? Math.round(Math.abs(+b - +a) / 86400000) : 0;
  };
  const buildVsUnitKey = (name, unit) => `${name} ${unit}`;
  const parseVsUnitKey = key => {
    const [baseName, unitRaw] = String(key || '').trim().split(/\s+/);
    return { baseName, unit: String(unitRaw || '').toLowerCase() };
  };
  const rowKeys = vsNames.flatMap(name => unitOrder.map(unit => buildVsUnitKey(name, unit)));
  const lastFourRecords = (() => {
    const maxEid = maxEventId;
    const maxEventDate = parseDateSafe(cutoffDate ?? eventsById[maxEid]?.start_date);
    const latestByKey = {};

    (cards || []).forEach((card) => {
      if (!isCardWithinLimit(card, maxEid)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const fullName = String(card?.Name || '').trim();
      const baseName = fullName.split(/\s+/)[0] || fullName;
      if (!vsNames.includes(baseName)) return;

      const unit = String(card?.Affiliation || '').trim().toLowerCase();
      if (!unitOrder.includes(unit)) return;

      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      if (!sourceKey) return;

      const isNum = isNumericEventId(sourceKey);
      const ev = isNum ? eventsById[Number(sourceKey)] : null;
      const eventDateStr = getSourceDate(card, sourceKey, ev);
      const eventDate = parseDateSafe(eventDateStr);
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
          ? getNonBanEventMark({
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
        days: daysBetween(eventDateStr, referenceDate),
        periods: ev ? countPeriodsSince({ id: Number(ev.id), date: ev.start_date }) : 0
      };

      if (!prev || nextRecord.dateValue > prev.dateValue) {
        latestByKey[recordKey] = nextRecord;
      }
    });

    return rowKeys.map((key) => {
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
  })();

  const scoreRows = (() => {
    const maxEid = maxEventId;
    const maxEventDate = parseDateSafe(cutoffDate ?? eventsById[maxEid]?.start_date);
    const rowMap = Object.fromEntries(
      unitOrder.map((unit) => [
        unit,
        {
          unit,
          attrsByVs: Object.fromEntries(vsNames.map((name) => [name, []])),
          cardsByVs: Object.fromEntries(vsNames.map((name) => [name, []]))
        }
      ])
    );

    (cards || []).forEach((card) => {
      if (!isCardWithinLimit(card, maxEid)) return;
      const skill = String(card?.Skill || '').trim().toLowerCase();
      if (skill !== 'unit_score') return;

      const fullName = String(card?.Name || '').trim();
      const baseName = fullName.split(/\s+/)[0] || fullName;
      if (!vsNames.includes(baseName)) return;

      const unit = String(card?.Affiliation || '').trim().toLowerCase();
      if (!unitOrder.includes(unit)) return;

      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      if (!sourceKey) return;
      const isNum = isNumericEventId(sourceKey);
      const ev = isNum ? eventsById[Number(sourceKey)] : null;
      const eventDate = parseDateSafe(getSourceDate(card, sourceKey, ev));
      if (!eventDate) return;
      if (!isNum && maxEventDate && eventDate > maxEventDate) return;

      const attr = normalizeAttribute(card?.Attribute);
      const cardId = getCardProgressOrderId(card);
      rowMap[unit].cardsByVs[baseName].push({
        cardId,
        attr,
        name: baseName,
        imageSrc: buildCardImageSrc(card?.CardID, baseName, { rarity: String(card?.Rarity || '4') })
      });
    });

    return unitOrder.map((unit) => {
      const row = rowMap[unit];
      vsNames.forEach((name) => {
        row.cardsByVs[name].sort((a, b) => {
          const aid = Number(a?.cardId || 0);
          const bid = Number(b?.cardId || 0);
          if (aid !== bid) return aid - bid;
          return attributes.indexOf(a?.attr) - attributes.indexOf(b?.attr);
        });
        row.attrsByVs[name] = row.cardsByVs[name]
          .map((item) => item?.attr)
          .filter((attr) => attributes.includes(attr));
      });
      return row;
    });
  })();

  const fourCountRecords = (() => {
    const maxEid = maxEventId;
    const maxEventDate = parseDateSafe(cutoffDate ?? eventsById[maxEid]?.start_date);
    const rowMap = Object.fromEntries(
      rowKeys.map((key) => {
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

    (cards || []).forEach((card) => {
      if (!isCardWithinLimit(card, maxEid)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const fullName = String(card?.Name || '').trim();
      const baseName = fullName.split(/\s+/)[0] || fullName;
      if (!vsNames.includes(baseName)) return;

      const unit = String(card?.Affiliation || '').trim().toLowerCase();
      if (!unitOrder.includes(unit)) return;

      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      if (!sourceKey) return;
      const isNum = isNumericEventId(sourceKey);
      const ev = isNum ? eventsById[Number(sourceKey)] : null;
      const eventDate = parseDateSafe(getSourceDate(card, sourceKey, ev));
      if (!eventDate) return;
      if (!isNum && maxEventDate && eventDate > maxEventDate) return;

      const key = buildVsUnitKey(baseName, unit);
      const row = rowMap[key];
      if (!row) return;

      const attr = normalizeAttribute(card?.Attribute);
      row.cards.push({
        cardId: getCardProgressOrderId(card),
        attr,
        name: baseName,
        imageSrc: buildCardImageSrc(card?.CardID, baseName, { rarity: String(card?.Rarity || '4') })
      });
    });

    return rowKeys.map((key) => {
      const row = rowMap[key];
      row.cards.sort((a, b) => {
        const aid = Number(a?.cardId || 0);
        const bid = Number(b?.cardId || 0);
        if (aid !== bid) return aid - bid;
        return attributes.indexOf(a?.attr) - attributes.indexOf(b?.attr);
      });
      row.attrs = row.cards
        .map((item) => item?.attr)
        .filter((attr) => attributes.includes(attr));
      row.count = row.cards.length;
      return row;
    });
  })();

  const originalRows = (() => {
    const maxEid = maxEventId;
    const maxEventDate = parseDateSafe(cutoffDate ?? eventsById[maxEid]?.start_date);
    const rowMap = Object.fromEntries(
      statTypes.map((type) => [
        type,
        {
          type,
          attrsByVs: Object.fromEntries(vsNames.map((name) => [name, []])),
          cardsByVs: Object.fromEntries(vsNames.map((name) => [name, []]))
        }
      ])
    );

    (cards || []).forEach((card) => {
      if (!isCardWithinLimit(card, maxEid)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const fullName = String(card?.Name || '').trim();
      const baseName = fullName.split(/\s+/)[0] || fullName;
      if (!vsNames.includes(baseName)) return;

      const unit = String(card?.Affiliation || '').trim().toLowerCase();
      if (unit !== 'vs') return;

      const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
      if (!sourceKey) return;
      const isNum = isNumericEventId(sourceKey);
      const ev = isNum ? eventsById[Number(sourceKey)] : null;
      const eventDate = parseDateSafe(getSourceDate(card, sourceKey, ev));
      if (!eventDate) return;
      if (!isNum && maxEventDate && eventDate > maxEventDate) return;

      const attr = normalizeAttribute(card?.Attribute);
      const statType = getVsOriginalStatType(card, sourceKey);
      if (!rowMap[statType]) return;
      rowMap[statType].cardsByVs[baseName].push({
        cardId: getCardProgressOrderId(card),
        attr,
        name: baseName,
        imageSrc: buildCardImageSrc(card?.CardID, baseName, { rarity: String(card?.Rarity || '4') })
      });
    });

    return statTypes.map((type) => {
      const row = rowMap[type];
      vsNames.forEach((name) => {
        row.cardsByVs[name].sort((a, b) => {
          const aid = Number(a?.cardId || 0);
          const bid = Number(b?.cardId || 0);
          if (aid !== bid) return aid - bid;
          return attributes.indexOf(a?.attr) - attributes.indexOf(b?.attr);
        });
        row.attrsByVs[name] = row.cardsByVs[name]
          .map((item) => item?.attr)
          .filter((attr) => attributes.includes(attr));
      });
      return row;
    });
  })();
  return { lastFourRecords, scoreRows, fourCountRecords, originalRows };
}
