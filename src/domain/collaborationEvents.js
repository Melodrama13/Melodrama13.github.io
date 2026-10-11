import { GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY } from './gameAttributes.js';

/** Collaboration IDs identify their own slots and never enter the numeric event order. */
export function normalizeCollaborationEventId(value) {
  const id = String(value ?? '').trim().toLowerCase();
  return /^c[1-9]\d*$/.test(id) ? id : '';
}

export function isCollaborationEvent(event) {
  const type = Object.hasOwn(event || {}, 'source_event_type')
    ? event.source_event_type
    : event?.event_type;
  return Boolean(normalizeCollaborationEventId(event?.id)) && String(type || '').trim() === '联动';
}

function isKnownCollaborationAttribute(value) {
  return Object.hasOwn(GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY, String(value || '').trim().toLowerCase());
}

/** Apply only attributes/skills. Source IDs, order, roster, rarity and type stay authoritative. */
export function mergeCollaborationCardPredictions(sourceCards, predictedCards) {
  const predictions = Array.isArray(predictedCards) ? predictedCards : [];
  const used = new Set();
  const text = value => String(value ?? '').trim().toLowerCase();
  return (Array.isArray(sourceCards) ? sourceCards : []).map(source => {
    let index = predictions.findIndex((card, i) => !used.has(i) && text(source.CardID) && text(card?.CardID) === text(source.CardID));
    if (index < 0) index = predictions.findIndex((card, i) => !used.has(i) && text(card?.Name) === text(source.Name)
      && text(card?.Affiliation) === text(source.Affiliation) && String(card?.Rarity) === String(source.Rarity));
    // Older backups used synthetic IDs and did not always include rarity/affiliation.
    if (index < 0 && predictions.filter(card => text(card?.Name) === text(source.Name)).length === 1) {
      index = predictions.findIndex((card, i) => !used.has(i) && text(card?.Name) === text(source.Name));
    }
    if (index >= 0) used.add(index);
    const prediction = predictions[index];
    const attribute = text(prediction?.Attribute);
    return {
      ...source,
      Attribute: isKnownCollaborationAttribute(attribute) ? GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY[attribute]
        : (attribute === '-' ? '-' : source.Attribute || '-'),
      Skill: String(prediction?.Skill || '').trim() || source.Skill || '-'
    };
  });
}
