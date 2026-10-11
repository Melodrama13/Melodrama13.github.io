import { GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY } from '../../domain/gameAttributes.js';

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
