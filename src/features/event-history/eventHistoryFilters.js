import { isWorldLinkCardType } from '../../domain/worldLink.js';

// Pure event history rules; the page owns criteria and reactive inputs.
export function selectEventHistoryRows({
  events, mode, hasEventFilters, hasDetailFilters, detailCriteria,
  matchEventFilters, getEventCardsForFilter, normalizeAttribute
}) {
  const data = events;

  if (mode === 'event') {
    if (!hasEventFilters) return data;
    return data.filter((event) => matchEventFilters(event));
  }

  if (!hasDetailFilters) return data;

  const matchDetailCardType = (card, typeValue) => {
    const cType = String(card?.Type || '').toLowerCase();
    if (typeValue === 'collab') return cType === 'collab' || cType === 'collab_t';
    if (typeValue === 'ue') return cType === 'ue' || isWorldLinkCardType(cType);
    return cType === String(typeValue || '').toLowerCase();
  };

  return data.filter((event) => {
    const selectedNames = detailCriteria.selectedChars || [];
    const cards = getEventCardsForFilter(event);
    return cards.some((card) => {
      const cardMainName = String(card?.Name || '').trim().split(' ')[0];
      if (!cardMainName || cardMainName === '-' || cardMainName === 'CardID') return false;

      if (selectedNames.length > 0 && !selectedNames.includes(cardMainName)) return false;

      const matchType = !detailCriteria.cardTypes.length
        || detailCriteria.cardTypes.some((t) => matchDetailCardType(card, t));

      const rarityRaw = String(card?.Rarity || '').trim();
      const cardTypeRaw = String(card?.Type || '').trim().toLowerCase();
      const matchRarity = !detailCriteria.rarities.length
        || detailCriteria.rarities.some((r) => {
          if (r === 'birthday') return cardTypeRaw === 'birthday';
          return Number(rarityRaw) === Number(r);
        });

      const attr = normalizeAttribute(card?.Attribute);
      const matchAttr = !detailCriteria.attributes.length
        || detailCriteria.attributes.includes(attr);

      const skill = String(card?.Skill || '').toLowerCase();
      const matchSkill = !detailCriteria.skills.length
        || detailCriteria.skills.includes(skill);

      const unit = String(card?.Affiliation || '').toLowerCase();
      const matchUnit = !detailCriteria.units.length
        || detailCriteria.units.includes(unit);

      return matchRarity && matchAttr && matchSkill && matchType && matchUnit;
    });
  });
}

export function matchesEventHistoryFilters(event, {
  criteria, canUseBanFilter, eventContainsCharacter, getSamePoolNameGroupsForEventFilter,
  eventBannerMatchesCharacter, matchEventTypeFilter, matchEventSpecialRule,
  normalizeAttribute, isVirtualSinger, normalizeCharacterName, matchEventGachaFilter
}) {
  const f = criteria;
  if (f.characters.length > 0) {
    const hasAllSelected = f.characters.every((name) => eventContainsCharacter(event, name));
    if (!hasAllSelected) return false;

    if (f.characters.length >= 2 && f.multiPersonRule === 'same-pool') {
      const selectedTargets = f.characters.map((name) => String(name || '').trim()).filter(Boolean);
      const hasSamePoolGroup = getSamePoolNameGroupsForEventFilter(event)
        .some((group) => selectedTargets.every((target) => group.includes(target)));
      if (!hasSamePoolGroup) return false;
    }
  }

  if (canUseBanFilter && f.isBan) {
    const targetChar = f.characters[0];
    const isBan = eventBannerMatchesCharacter(event, targetChar);
    if (f.isBan === 'yes' && !isBan) return false;
    if (f.isBan === 'no' && isBan) return false;
  }

  if (f.eventTypes.length > 0 && !f.eventTypes.some((typeValue) => matchEventTypeFilter(event, typeValue))) return false;

  if (f.specialRules.length > 0 && !f.specialRules.every((rule) => matchEventSpecialRule(event, rule))) return false;

  if (f.festivals.length > 0) {
    const festival = String(event?.festival || '').trim();
    if (!f.festivals.includes(festival)) return false;
  }

  if (f.attributes.length > 0) {
    const attr = normalizeAttribute(event?.event_attribute);
    if (!f.attributes.includes(attr)) return false;
  }

  if (f.units.length > 0) {
    const selectedUnits = f.units.map((unit) => String(unit || '').trim().toLowerCase()).filter(Boolean);
    const eventType = String(event?.event_type || '').trim();
    const eventUnit = String(event?.unit || '').trim().toLowerCase();
    const isWorldLink = eventType === 'World Link' || eventType.toLowerCase() === 'wl';
    const matchesVsUnit = selectedUnits.includes('vs')
      && ((isWorldLink && eventUnit === 'vs') || isVirtualSinger(normalizeCharacterName(event?.banner)));
    const matchesOcUnit = eventUnit !== 'vs'
      && selectedUnits.includes(eventUnit)
      && (eventType === '箱活' || isWorldLink);
    if (!matchesVsUnit && !matchesOcUnit) return false;
  }

  if (f.gachaTypes.length > 0 && !f.gachaTypes.some((g) => matchEventGachaFilter(event, g))) return false;
  return true;
}
