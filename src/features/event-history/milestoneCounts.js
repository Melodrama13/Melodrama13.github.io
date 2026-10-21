import { makeThresholdCheckpoint, getThresholdAdvancement } from './precedentThresholds.js';
import { scopesFor, groupBy, bannerEntries, makeMilestone } from './milestoneShared.js';
import { getEntryMetrics, isFesCard } from './milestoneRules.js';

export function getCountContributions(catalog, rules) {
  const festivalIds = new Set(catalog.events.filter(s => /^\d+$/.test(String(s.event.id)) && s.event.gacha_type === '普通限定'
    && (s.allCards || s.cards).some(e => isFesCard(e.card))).map(s => String(s.event.id)));
  const contributions = (catalog.allSteps || catalog.steps).flatMap(s => s.entries.flatMap(e => getEntryMetrics(e, rules, festivalIds).map(metric => ({ ...e, metric }))));
  for (const entry of bannerEntries(catalog)) {
    const box = entry.source.event.event_type === '箱活';
    const metrics = ['banner', box ? 'boxBanner' : 'mixedBanner'];
    if (entry.source.event.gacha_type === '普通限定') metrics.push('limitedBanner', box ? 'boxLimitedBanner' : 'mixedLimitedBanner');
    if (festivalIds.has(String(entry.source.event.id))) metrics.push('fesLimitedBanner', box ? 'boxFesLimitedBanner' : 'mixedFesLimitedBanner');
    contributions.push(...metrics.map(metric => ({ ...entry, metric })));
  }
  return contributions;
}

export function collectCountCeilings(catalog, emit, rules) {
  const scopes = scopesFor(catalog).filter(s => s.key === 'all');
  for (const [metric, metricEntries] of groupBy(getCountContributions(catalog, rules), e => e.metric)) {
    const applicableScopes = scopes;
    const states = new Map(catalog.characters.map(c => [c.zh_name, []]));
    const firsts = new Map(applicableScopes.map(s => [s.key, new Map()]));
    for (const [, entries] of [...groupBy(metricEntries, e => e.timestamp)].sort(([a], [b]) => a - b)) {
      const before = new Map([...states].map(([name, list]) => [name, list.length]));
      entries.forEach(e => states.get(e.name).push(e));
      const pending = new Map();
      for (const scope of applicableScopes) {
        const reached = firsts.get(scope.key);
        const ceiling = Math.max(...scope.names.map(name => states.get(name).length));
        for (let threshold = reached.size + 1; threshold <= ceiling; threshold += 1) {
          const triggers = entries.filter(e => scope.names.includes(e.name) && states.get(e.name).length >= threshold);
          reached.set(threshold, makeThresholdCheckpoint(threshold, triggers));
          for (const [name, selected] of groupBy(triggers, e => e.name)) {
            const key = `count:${name}:${metric}:${threshold}`;
            if (!pending.has(key)) pending.set(key, makeMilestone('count', 'count', selected, states.get(name), {
              key, name, subject: { kind: 'person', name }, metric, threshold, before: before.get(name), after: states.get(name).length,
              scopeFirsts: [], cohort: 'all', rules, priority: 3,
              ...(metric === 'reward' ? { breakdown: { two: states.get(name).filter(e => String(e.card.Rarity) === '2').length,
                three: states.get(name).filter(e => String(e.card.Rarity) === '3').length } } : {}),
            }));
            pending.get(key).scopeFirsts.push(scope.key);
          }
        }
      }
      for (const record of pending.values()) {
        const scope = record.scopeFirsts[0];
        record.advancementsByScope = Object.fromEntries(record.scopeFirsts.map(key => [key, getThresholdAdvancement(firsts.get(key), record.threshold, key)]));
        record.advancement = record.advancementsByScope[scope];
        emit(record);
      }
    }
  }
}
