function normalizeQuery(value) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/^#\s+/, '#');
}

export function makePrecedentEventOptions(events, formatShortLabel) {
  return events.map(event => {
    const shortLabel = /^\d+$/.test(String(event.id)) ? String(formatShortLabel(event) || '').trim() : '';
    const title = event.event_title || event.event_type || '';
    return { value: String(event.id), shortLabel, title,
      label: [`#${event.id}`, shortLabel, title].filter(Boolean).join(' · ') };
  });
}

function searchableLabels(option) {
  return [option.shortLabel, option.label, option.title].map(normalizeQuery);
}

export function filterPrecedentEventOptions(options, query) {
  const normalized = normalizeQuery(query);
  if (!normalized) return options;
  return options.filter(option => [normalizeQuery(option.value), `#${normalizeQuery(option.value)}`, ...searchableLabels(option)]
    .some(label => label.includes(normalized)));
}

// Search results are suggestions. Only an unambiguous exact entry can be committed by text alone.
export function resolvePrecedentEventOption(options, query) {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;
  const id = normalized.replace(/^#/, '');
  const exactIds = options.filter(option => normalizeQuery(option.value) === id);
  if (exactIds.length) return exactIds.length === 1 ? exactIds[0] : null;
  const exactLabels = options.filter(option => searchableLabels(option).includes(normalized));
  return exactLabels.length === 1 ? exactLabels[0] : null;
}
