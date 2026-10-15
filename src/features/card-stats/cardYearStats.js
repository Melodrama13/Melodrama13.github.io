export const CARD_YEAR_RARITY_OPTIONS = [
  { value: '4', label: '四星' },
  { value: '3', label: '三星' },
  { value: '2', label: '二星' }
];

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
