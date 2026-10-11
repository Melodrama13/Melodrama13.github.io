// Retain card references, source order and repeated cards within each event.
export function buildEventCardIndex(cards, normalizeEventId) {
  const cardsByEventId = new Map();
  (cards || []).forEach((card) => {
    const eventId = normalizeEventId(card?.EventID);
    if (!eventId) return;
    if (!cardsByEventId.has(eventId)) cardsByEventId.set(eventId, []);
    cardsByEventId.get(eventId).push(card);
  });
  return cardsByEventId;
}
