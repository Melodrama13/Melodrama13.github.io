const personName = value => String(value || '').trim().split(/\s+/)[0];
const eventId = event => String(event?.id ?? '').replace(/^0$/, 'ori');

/** Keep each interval's holder, endpoints and cards together; merge shared day/period holders. */
export function buildIntervalEvidenceSections(record, eventForCard) {
  if (record.type !== 'interval') return [];
  const makeRange = (range, metrics) => ({
    key: `${range.name}:${eventId(range.startEvent)}:${eventId(range.endEvent)}`,
    name: range.name, metrics,
    endpoints: [
      { event: range.startEvent, timestamp: range.startTimestamp, events: [range.startEvent] },
      { event: range.endEvent, timestamp: range.endTimestamp, events: range.endEvents || [range.endEvent] },
    ].map(endpoint => ({ ...endpoint, cards: record.evidence.filter(card => personName(card.Name) === range.name
      && endpoint.events.some(event => eventId(event) === eventId(eventForCard(card)))) })),
  });
  const current = makeRange({ name: record.name, startEvent: record.startEvent, startTimestamp: record.startTimestamp,
    endEvent: record.events[0], endEvents: record.events, endTimestamp: record.timestamp },
  [{ unit: 'days', value: record.days }, { unit: 'periods', value: record.periods }]);
  const previous = new Map();
  for (const unit of record.recordUnits || []) for (const range of record.previousRanges[unit] || []) {
    const item = makeRange(range, [{ unit, value: record.previousValues[unit] }]);
    if (previous.has(item.key)) previous.get(item.key).metrics.push(...item.metrics);
    else previous.set(item.key, item);
  }
  return [
    { key: 'current', label: record.isPersonalAchievement && !record.globalRecord ? '本段间隔' : '本次纪录', ranges: [current] },
    ...(previous.size ? [{ key: 'previous', label: '此前纪录', ranges: [...previous.values()] }] : []),
  ];
}
