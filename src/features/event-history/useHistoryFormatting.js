import { GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY } from '../../domain/gameAttributes.js';

// Verified against external events.startAt / aggregateAt, converted to UTC+8.
// Source JSON keeps dates only; test activities follow their own 20:00 rule.
const EVENT_OPENING_TIME_EXCEPTIONS = { 120: '19:00', 145: '17:00', 172: '16:00' };

export function getHistoryEventPeriod(event = {}) {
  const isActivity = /^\d+$/.test(String(event.id)) && Number(event.id) > 0;
  const isWorldLink = /world\s*link|^wl(?:终章)?$/i.test(String(event.event_type || ''));
  const isTest = /^(测试|test)$/i.test(String(event.event_type || '').trim());
  const startTime = isActivity ? EVENT_OPENING_TIME_EXCEPTIONS[event.id] || (isTest ? '20:00' : isWorldLink ? '19:00' : '14:00') : '';
  const endTime = isActivity ? (isWorldLink ? '18:59' : '19:59') : '';
  const endpoint = (raw, time) => {
    const date = String(raw || '').trim();
    const match = date.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (!match) return { date, time: '', dateTime: undefined };
    const isoDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    return { date, time, dateTime: time ? `${isoDate}T${time}:00+08:00` : isoDate };
  };
  return { start: endpoint(event.start_date, startTime), end: endpoint(event.end_date, endTime) };
}

/** Song releaseDate is stored in JST; display an explicit Beijing time. */
export function formatHistorySongReleaseDate(raw) {
  const text = String(raw || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return text;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] || '00'}+09:00`);
  if (!Number.isFinite(date.getTime())) return text;
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

/** Formatting owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: Presentation.
 */
export function useHistoryFormatting(ports) {
const normalizeEventId = (value) => String(value ?? '').trim();

const isNumericEventId = (value) => /^\d+$/.test(normalizeEventId(value));

const normalizeCardIdText = (value) => String(value || '').trim();

const parseCardIdNumber = (value) => {
  const text = normalizeCardIdText(value);
  if (!/^\d+$/.test(text)) return null;
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const normalizeEventHistoryAttribute = (attributeValue) => {
  return GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY[String(attributeValue || '').toLowerCase()] || attributeValue;
};

const hasAttributeIcon = (attr) => {
  const raw = String(attr || '').trim();
  return raw !== '' && raw !== '-';
};

const parseDateSafe = (dateStr) => {
  const d = new Date(String(dateStr || '').replace(/\//g, '-'));
  const t = d.getTime();
  return Number.isFinite(t) ? d : null;
};

const formatEventDatePadded = (dateStr) => {
  const text = String(dateStr || '').trim();
  const match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return text;
  const [, year, month, day] = match;
  return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
};

const hexToRgba = (hex, alpha) => {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getBirthdayRowTint = (name) => hexToRgba(ports.presentation.getCharColor(name), 0.2);

const BIRTHDAY_ORDER = {
  '镜音铃': 22,
  '镜音连': 23
};


return {
  normalizeEventId,
  hasAttributeIcon,
  formatEventDatePadded,
  getBirthdayRowTint,
  normalizeEventHistoryAttribute,
  normalizeCardIdText,
  BIRTHDAY_ORDER,
  isNumericEventId,
  parseDateSafe,
  hexToRgba,
  parseCardIdNumber,
};
}
