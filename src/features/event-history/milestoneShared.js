export const milestoneEventKey = id => String(id ?? '').replace(/^0$/, 'ori');
export const DAY_MS = 86400000;
export const OC_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc'];
export const groupBy = (items, getKey) => {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};
export const scopesFor = catalog => [
  ['all', '全角色', catalog.characters],
  ['oc', '全OC', catalog.characters.filter(c => c.unit !== 'vs')],
  ...['vs', ...OC_UNITS].map(unit => [unit, unit.toUpperCase(), catalog.characters.filter(c => c.unit === unit)]),
].filter(([, , people]) => people.length).map(([key, label, people]) => ({ key, label, names: people.map(c => c.zh_name) }));
export const cohortOf = (catalog, name) => catalog.characterByName.get(name)?.unit === 'vs' ? 'vs' : 'oc';
export const scopeTitle = scope => ({ all: '全角色', oc: 'OC', vs: 'VS' }[scope] || scope.toUpperCase());
export function makeMilestone(type, category, entries, evidence, extra = {}) {
  const events = [...new Map(entries.map(e => [milestoneEventKey(e.source.event.id), e.source.event])).values()];
  return {
    type, category, event: events[0], events, timestamp: Math.max(...entries.map(e => e.timestamp)),
    evidence: [...new Map(evidence.filter(e => e.card).map(e => [String(e.card.CardID), e.card])).values()],
    triggerCards: entries.filter(e => e.card).map(e => e.card),
    contributors: [...new Map(entries.map(e => [`${e.name}:${e.attribute || ''}`, { name: e.name, attribute: e.attribute }])).values()],
    ...extra,
  };
}
export const bannerEntries = catalog => catalog.events.filter(source => /^\d+$/.test(String(source.event.id))
  && ['箱活', '混活'].includes(source.event.event_type)
  && catalog.characterByName.has(source.event.banner)
  && cohortOf(catalog, source.event.banner) === 'oc').map(source => ({
  source, timestamp: source.timestamp, name: source.event.banner,
  card: source.cards.find(e => e.name === source.event.banner && !['cfes', 'bfes'].includes(e.card.Type))?.card || null,
}));
