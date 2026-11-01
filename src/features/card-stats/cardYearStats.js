import { getCardYearTypeInfo } from './cardYearCardTypes.js';

export const CARD_YEAR_RARITY_OPTIONS = [
  { value: '4', label: '四星' },
  { value: '3', label: '三星' },
  { value: '2', label: '二星' }
];

export const CARD_YEAR_DEFAULTS = Object.freeze({
  rarities: Object.freeze(['4']), cardTypes: Object.freeze(['perm', 'limited']),
  useOperatingYear: false, newYearNextYear: true
});

// Source dates name a calendar day, independent of the viewer's timezone.
export const parseCardYearDate = (value) => {
  const match = String(value || '').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:$|[ T])/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

export const buildCardYearEventIndex = (events) => {
  const bySourceKey = new Map();
  (events || []).forEach(event => {
    const key = String(event?.id ?? '').trim();
    if (!key) return;
    bySourceKey.set(key, {
      date: parseCardYearDate(event?.start_date),
      festival: String(event?.festival || '').trim(),
      id: /^\d+$/.test(key) ? Number(key) : null
    });
  });
  const opening = bySourceKey.get('0') || bySourceKey.get('ori');
  const startYear = opening?.date?.getFullYear() || 2020;
  const anniversaries = [...bySourceKey.values()]
    .filter(event => event.id !== null && event.date && (event.id === 0 || event.festival === '周年'))
    .map(event => ({ id: event.id, year: event.date.getFullYear() }))
    .sort((a, b) => a.id - b.id);
  return { bySourceKey, anniversaries, startYear };
};

const getCardYearSources = (card, index) => [card?.EventID, card?.GachaID]
  .map(key => index.bySourceKey.get(String(key ?? '').trim()))
  .filter(Boolean);

export const getCardYearSourceDate = (card, index) => parseCardYearDate(card?.Date)
  || getCardYearSources(card, index).find(source => source.date)?.date;

export const getCardStatsYear = (card, date, index, { useOperatingYear, newYearNextYear }) => {
  const sources = getCardYearSources(card, index);
  if (useOperatingYear) {
    const numericSource = sources.find(source => source.id !== null);
    if (numericSource) {
      const anniversary = index.anniversaries.findLast(event => event.id <= numericSource.id);
      if (anniversary) return anniversary.year;
    }
    // Detached collaborations belong to the cycle in which their event opens.
    const openingDate = sources.find(source => source.date)?.date || date;
    const startsNewYear = openingDate.getMonth() > 8 || (openingDate.getMonth() === 8 && openingDate.getDate() >= 30);
    return openingDate.getFullYear() - (startsNewYear ? 0 : 1);
  }
  const newYearSource = newYearNextYear && sources.find(source => source.festival === '新年');
  if (newYearSource) {
    const eventDate = newYearSource.date || date;
    return eventDate.getFullYear() + (eventDate.getMonth() === 11 ? 1 : 0);
  }
  return date.getFullYear();
};

export const getCardYearPanelLabels = (year, useOperatingYear, startYear) => {
  if (!useOperatingYear) return { title: `${year}年`, navTitle: `${year}年`, anchorId: `year-${year}` };
  const navTitle = `第${year - startYear + 1}年`;
  return { title: `${navTitle}（${year}–${year + 1}）`, navTitle, anchorId: `year-operating-${year}` };
};

/** Date attribution is cached separately from the lightweight view filters. */
export function prepareCardYearCards({ cards = [], names = [], eventIndex = buildCardYearEventIndex([]),
  isCardWithinLimit = () => true, useOperatingYear = CARD_YEAR_DEFAULTS.useOperatingYear,
  newYearNextYear = CARD_YEAR_DEFAULTS.newYearNextYear }) {
  const nameSet = new Set(names), allowed = new Set(CARD_YEAR_RARITY_OPTIONS.map(option => option.value));
  return cards.flatMap(card => {
    const name = String(card?.Name || '').trim(), rarity = String(card?.Rarity || '').trim();
    if (!nameSet.has(name) || !allowed.has(rarity) || !isCardWithinLimit(card)) return [];
    const date = getCardYearSourceDate(card, eventIndex);
    if (!date) return [];
    return [{ ...card, Name: name, Rarity: rarity, ...getCardYearTypeInfo(card),
      year: getCardStatsYear(card, date, eventIndex, { useOperatingYear, newYearNextYear }),
      dateOrder: date.getTime(), dateLabel: `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}` }];
  });
}

/** Shared count/tie ordering. Explicit years also retain zero-count panels. */
export function buildCardYearPanels({ cards = [], names = [], eventIndex = buildCardYearEventIndex([]),
  isCardWithinLimit = () => true, rarities = CARD_YEAR_DEFAULTS.rarities,
  cardTypes = CARD_YEAR_DEFAULTS.cardTypes, useOperatingYear = CARD_YEAR_DEFAULTS.useOperatingYear,
  newYearNextYear = CARD_YEAR_DEFAULTS.newYearNextYear, years, eligibleCards }) {
  const eligible = eligibleCards ?? prepareCardYearCards({ cards, names, eventIndex, isCardWithinLimit, useOperatingYear, newYearNextYear });
  if (!eligible.length && !years) return [];
  const firstYear = Math.min(...eligible.map(card => card.year)), lastYear = Math.max(...eligible.map(card => card.year));
  const selectedYears = years || Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  const panels = selectedYears.map(year => ({ year, ...getCardYearPanelLabels(year, useOperatingYear, eventIndex.startYear),
    characters: names.map(name => ({ name, cards: [] })) }));
  const panelByYear = new Map(panels.map(panel => [panel.year, panel]));
  const nameIndexes = new Map(names.map((name, index) => [name, index]));
  const selected = new Set(rarities), selectedTypes = new Set(cardTypes);
  eligible.forEach(card => {
    if (!selected.has(card.Rarity) || !selectedTypes.has(card.cardTypeGroup)) return;
    panelByYear.get(card.year)?.characters[nameIndexes.get(card.Name)].cards.push(card);
  });
  return panels.map(panel => {
    const groupsByCount = new Map(); let total = 0;
    panel.characters.forEach(character => {
      character.cards.sort((a, b) => a.dateOrder - b.dateOrder || Number(a.CardID) - Number(b.CardID));
      const count = character.cards.length; total += count;
      if (!groupsByCount.has(count)) groupsByCount.set(count, []);
      groupsByCount.get(count).push(character);
    });
    const groups = [...groupsByCount.entries()].sort(([a], [b]) => b - a).map(([count, chars]) => ({ count,
      chars: [...chars].sort((a, b) => {
        if (!count) return 0;
        const lastA = a.cards.at(-1), lastB = b.cards.at(-1);
        return lastA.dateOrder - lastB.dateOrder || Number(lastA.CardID) - Number(lastB.CardID);
      }) }));
    return { ...panel, total, groups };
  });
}
