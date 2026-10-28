/** WL rounds are data, rather than a fixed list of supported years. */
export function getWorldLinkCardSeries(type) {
  const match = String(type || '').trim().match(/^wl([1-9]\d*)$/i);
  const series = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(series) && series > 0 ? series : null;
}

export const isWorldLinkCardType = type => getWorldLinkCardSeries(type) !== null;

export function hasFixedWorldLinkRoster(event) {
  const type = String(event?.event_type || event?.source_event_type || '').trim();
  const series = Number(event?.type_series_id);
  return type === 'World Link' && Number.isSafeInteger(series) && series > 0;
}

export function isTeamWorldLinkEvent(event) {
  if (!hasFixedWorldLinkRoster(event)) return false;
  const series = Number(event.type_series_id);
  if (series === 3) return false;
  return series <= 2 || Boolean(String(event.unit || event.source_unit || '').trim());
}

export function isHairstyleWorldLinkCard(card) {
  const series = getWorldLinkCardSeries(card?.Type);
  // Hairstyle availability is shared by the entire WL round.
  return series === 3 || series === 4;
}

export function getWorldLinkStatTypes(cards = [], events = []) {
  const rounds = new Set([1, 2, 3]);
  for (const card of cards) {
    const series = getWorldLinkCardSeries(card?.Type);
    if (series !== null) rounds.add(series);
  }
  for (const event of events) {
    if (hasFixedWorldLinkRoster(event)) rounds.add(Number(event.type_series_id));
  }
  return [...rounds].sort((a, b) => a - b).map(series => ({ key: `wl${series}`, label: `WL${series}` }));
}
