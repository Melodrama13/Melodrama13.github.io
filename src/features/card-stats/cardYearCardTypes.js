import { isWorldLinkCardType } from '../../domain/worldLink.js';

export const CARD_YEAR_TYPE_OPTIONS = [
  { value: 'perm', label: '常驻' },
  { value: 'limited', label: '限定' }
];

const LIMITED_LABELS = new Map([
  ['cfes', 'FES限定'], ['bfes', 'FES限定'],
  ['ue', 'WL限定'],
  ['limited', '期间限定'], ['movie', '期间限定'],
  ['collab', '联动限定'], ['collab_t', '联动限定']
]);

/** Year statistics includes every limited type, including movie and all WL cards. */
export function getCardYearTypeInfo(card) {
  const type = String(card?.Type || '').trim().toLowerCase();
  const limitedLabel = isWorldLinkCardType(type) ? 'WL限定' : LIMITED_LABELS.get(type) || '';
  return { limitedLabel, cardTypeGroup: limitedLabel ? 'limited' : 'perm' };
}
