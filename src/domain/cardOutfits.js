const MALE_OUTFIT_CHARACTERS = new Set(['LEN', 'KAITO', 'AKT', 'TOYA', 'TKS', 'RUI']);
const FIRST_ALWAYS_OUTFITTED_EVENT = 45;
const NO_OUTFIT_COLLAB_CARDS = new Set(['1167']);

export const isMaleOutfitCharacter = character => MALE_OUTFIT_CHARACTERS.has(character?.en_abbr);

/** Compare cardCostume3ds links against costume3ds entries with partType "body". */
export function hasCardOutfit(card, event) {
  if (String(card.Rarity) !== '4' || NO_OUTFIT_COLLAB_CARDS.has(String(card.CardID))) return false;
  const eventId = Number(event?.id);
  const earlyNormalEvent = ['箱活', '混活'].includes(event?.event_type) && eventId >= 1 && eventId < FIRST_ALWAYS_OUTFITTED_EVENT;
  return !earlyNormalEvent || card.Skill !== 'p_score';
}
