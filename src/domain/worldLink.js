/** WL rounds are data, rather than a fixed list of supported years. */
export function getWorldLinkCardSeries(type) {
  const match = String(type || '').trim().match(/^wl([1-9]\d*)$/i);
  const series = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(series) && series > 0 ? series : null;
}

export const isWorldLinkCardType = type => getWorldLinkCardSeries(type) !== null;

// Prediction defaults are shared by every WL round; official card data stays authoritative.
export const WORLD_LINK_PREDICTION_SKILL = 'score_up';

// Naming transitions apply equally to activity and finale tags.
const WORLD_LINK_TYPE_NAMES = Object.freeze([
  { firstSeries: 1, name: 'World Link' },
  { firstSeries: 4, name: 'World Crown' }
]);

export function getWorldLinkEventTypeLabel(event, scheduleOrder = null) {
  const type = String(event?.event_type || '').trim();
  const isFinal = type === 'World Link终章';
  if (type !== 'World Link' && !isFinal) return type;

  const declaredSeries = Number(event?.type_series_id);
  const key = scheduleOrder?.keys?.[event?.id] || event?.key || '';
  const keySeries = String(key).match(/^\d{2}WL([1-9]\d*)/i)?.[1];
  const series = Number.isSafeInteger(declaredSeries) && declaredSeries > 0 ? declaredSeries : Number(keySeries);
  if (!Number.isSafeInteger(series) || series <= 0) return type;

  const name = WORLD_LINK_TYPE_NAMES.findLast(rule => series >= rule.firstSeries)?.name;
  return name ? `${name}${isFinal ? '终章' : ''}` : type;
}

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
