/** Prefer event metadata so new collaboration pools do not require an ID whitelist update. */
export const isDuoCollaborationEvent = event => String(event?.event_type || '').trim() === '联动'
  || /^c[1-5]$/i.test(String(event?.id || '').trim());
