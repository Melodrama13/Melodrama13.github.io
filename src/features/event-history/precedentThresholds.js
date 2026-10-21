/** A timestamp cohort is recorded together, including tied holders and source events. */
export function makeThresholdCheckpoint(threshold, entries) {
  return {
    threshold,
    timestamp: entries[0].timestamp,
    holders: [...new Map(entries.map(entry => [`${entry.name}:${entry.attribute}`, { name: entry.name, attribute: entry.attribute }])).values()],
    events: [...new Map(entries.map(entry => [String(entry.source.event.id), entry.source.event])).values()],
  };
}

export function getThresholdAdvancement(history, threshold, scope) {
  const current = history.get(threshold);
  const previous = history.get(threshold - 1);
  if (!current || !previous) return undefined;
  return {
    scope, fromThreshold: threshold - 1, toThreshold: threshold,
    days: Math.round((current.timestamp - previous.timestamp) / 86400000), previous,
  };
}
