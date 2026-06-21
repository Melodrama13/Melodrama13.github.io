const DATE_ONLY_RE = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;
const DATE_TIME_RE = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?$/;

const parseDateParts = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  const matched = text.match(DATE_TIME_RE);
  if (!matched) return null;

  const [, year, month, day, hour = '0', minute = '0', second = '0'] = matched;
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second)
  };

  if (!Object.values(parts).every(Number.isFinite)) return null;
  if (parts.month < 1 || parts.month > 12) return null;
  if (parts.day < 1 || parts.day > 31) return null;
  if (parts.hour < 0 || parts.hour > 23) return null;
  if (parts.minute < 0 || parts.minute > 59) return null;
  if (parts.second < 0 || parts.second > 59) return null;
  return parts;
};

const makeLocalDate = (parts) => {
  if (!parts) return null;
  const date = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0
  );
  return Number.isFinite(date.getTime()) ? date : null;
};

export const getSongReleaseGate = (releaseDate) => {
  const date = makeLocalDate(parseDateParts(releaseDate));
  if (!date) return null;
  // Source releaseDate is JST. In China/local display time this opens one hour earlier.
  return new Date(date.getTime() - 60 * 60 * 1000);
};

export const isSongReleased = (song, now = new Date()) => {
  const gate = getSongReleaseGate(song?.releaseDate);
  if (!gate) return true;
  return now.getTime() >= gate.getTime();
};

export const getCardImageReleaseGate = (dateText) => {
  const text = String(dateText || '').trim();
  const matched = text.match(DATE_ONLY_RE);
  if (!matched) return null;
  const [, year, month, day] = matched;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 14, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? date : null;
};

export const getBirthdayCardImageReleaseGate = (dateText) => {
  const text = String(dateText || '').trim();
  const matched = text.match(DATE_ONLY_RE);
  if (!matched) return null;
  const [, year, month, day] = matched;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? date : null;
};

const isBirthdayCard = (card) => String(card?.Type || card?.type || '').trim().toLowerCase() === 'birthday';

export const isCardImageReleased = (card, now = new Date()) => {
  const gate = isBirthdayCard(card)
    ? getBirthdayCardImageReleaseGate(card?.Date || card?.date)
    : getCardImageReleaseGate(card?.Date || card?.date);
  if (!gate) return true;
  return now.getTime() >= gate.getTime();
};

export const isNumericEventId = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return false;
  return /^\d+$/.test(raw);
};

export const getEventStartGate = (event) => {
  if (!isNumericEventId(event?.id)) return null;
  const parts = parseDateParts(event?.start_date);
  if (!parts) return null;

  const eventType = String(event?.event_type || event?.source_event_type || '').trim();
  const normalizedType = eventType.toLowerCase().replace(/\s+/g, '');
  const opensAt19 = eventType === 'World Link'
    || eventType === 'World Link终章'
    || eventType === 'WL'
    || eventType === 'WL终章'
    || normalizedType.includes('worldlink')
    || normalizedType.includes('wl')
    || eventType === '测试'
    || normalizedType === 'test'
    || normalizedType.includes('测试');
  const hour = opensAt19 ? 19 : 14;

  const date = new Date(parts.year, parts.month - 1, parts.day, hour, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? date : null;
};

export const isEventStarted = (event, now = new Date()) => {
  const gate = getEventStartGate(event);
  if (!gate) return false;
  return now.getTime() >= gate.getTime();
};
