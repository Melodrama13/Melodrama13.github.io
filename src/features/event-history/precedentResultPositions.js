export const precedentAttainmentTime = record => record.attainment?.timestamp ?? record.period?.startTimestamp ?? record.timestamp;

/** Mark boundaries before pagination or first/latest filtering, retaining all simultaneous holders. */
export function markPrecedentPositions(records) {
  if (!records.length) return records;
  const times = records.map(precedentAttainmentTime), first = Math.min(...times), latest = Math.max(...times);
  return records.map((record, index) => ({ ...record, queryPositions: [
    ...(times[index] === first ? ['first'] : []), ...(times[index] === latest ? ['latest'] : []),
  ] }));
}

/** Boundary records lead the all-results view; a record carrying both badges appears once. */
export function prioritizePrecedentResults(result, order) {
  if (order !== 'all') return result;
  const rank = record => record.queryPositions?.includes('first') ? 0 : record.queryPositions?.includes('latest') ? 1 : 2;
  const sort = records => [...records].sort((a, b) => rank(a) - rank(b)
    || precedentAttainmentTime(b) - precedentAttainmentTime(a) || b.timestamp - a.timestamp || a.key.localeCompare(b.key));
  return { ...result, records: sort(result.records), ...(result.completion ? { completion: { ...result.completion, records: sort(result.completion.records) } } : {}) };
}
