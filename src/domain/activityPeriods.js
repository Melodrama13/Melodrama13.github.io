const typeOf = event => String(event?.source_event_type || event?.event_type || '').trim();
export const isCountedActivityEvent = event => /^\d+$/.test(String(event?.id)) && Number(event.id) > 0
  && !/测试|test|纪念/i.test(typeOf(event));
const compilation = event => typeOf(event) === '总集篇';

/** Statistical bindings only: retain each original activity object and its distinct ID. */
export function buildActivityPeriodGroups(events = []) {
  const groups = [];
  for (const event of events.filter(isCountedActivityEvent).slice().sort((a, b) => Number(a.id) - Number(b.id))) {
    const previous = groups.at(-1);
    if (compilation(event) && previous?.events.length === 1 && compilation(previous.events[0])
      && String(previous.events[0].id) !== String(event.id)) previous.events.push(event);
    else groups.push({ key: `period:${event.id}`, events: [event] });
  }
  return groups;
}

export function buildActivityPeriodMap(events) {
  return new Map(buildActivityPeriodGroups(events).flatMap(group => group.events.map(event => [String(event.id), group])));
}

export function countActivityPeriods(events, allEvents = events, bindings = buildActivityPeriodMap(allEvents)) {
  return new Set(events.filter(isCountedActivityEvent).map(event => bindings.get(String(event.id))?.key || `period:${event.id}`)).size;
}

/** Bind before filtering; a selected second member can never pair with the next group. */
export function groupActivitySources(sources, allEvents = sources.map(source => source.event)) {
  const byId = new Map(sources.map(source => [String(source.event.id), source]));
  return buildActivityPeriodGroups(allEvents).flatMap(group => {
    const selected = group.events.map(event => byId.get(String(event.id))).filter(Boolean);
    return selected.length ? [{ ...group, sources: selected }] : [];
  });
}
