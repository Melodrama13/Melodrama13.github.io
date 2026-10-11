import { GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY } from "../../domain/gameAttributes.js";

const normalizeId = (value) => String(value ?? '').trim();

const getBaseName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

const normalizeUnit = (unit) => String(unit || '').trim().toLowerCase();

const normalizeGeneratedCardAttribute = (attributeValue) => {
  const attributeKey = String(attributeValue || '').trim();
  if (!attributeKey || attributeKey === '-') return '';
  return GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY[attributeKey.toLowerCase()] || attributeKey;
};

const clampPercent = (value, fallback, min = 0, max = 100) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const clampNumber = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const hexToRgb = (hex) => {
  const raw = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16)
  };
};

const rgbaFromHex = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(20, 184, 166, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const mixHexWithWhite = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgb(245, 253, 252)';
  const mix = (channel) => Math.round(255 * (1 - alpha) + channel * alpha);
  return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
};
export { normalizeId, getBaseName, normalizeUnit, normalizeGeneratedCardAttribute, clampPercent, clampNumber, hexToRgb, rgbaFromHex, mixHexWithWhite };
