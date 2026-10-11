import { getDefaultScrollContainer } from '../../composables/useStatsNavigation.js';
import { toHiragana, toRomaji } from 'wanakana';
import { UNIT_TAG_ICON_MAP, MV_TAG_MAP, LOCAL_SONG_JACKET_BASE_PATH, SONG_DIFFICULTY_ORDER } from './songDisplayConstants.js';
import { buildAssetUrl } from '../../utils/assets.js';

export const getScrollContainer = getDefaultScrollContainer;

export const normalizeSongId = (idRaw) => {
  const n = Number(idRaw);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

export const parseSlashDateOrder = (raw) => {
  const text = String(raw || '').trim();
  const match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return Number.MAX_SAFE_INTEGER;
  if (month < 1 || month > 12 || day < 1 || day > 31) return Number.MAX_SAFE_INTEGER;
  return year * 10000 + month * 100 + day;
};

export const formatSongShortDate = (raw) => {
  const text = String(raw || '').trim();
  const match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${String(year).slice(-2)}/${month}/${day}`;
};

export const normalizeHexColor = (raw) => {
  const color = String(raw || '').trim();
  if (!/^#([\da-fA-F]{3}|[\da-fA-F]{6})$/.test(color)) return '';
  if (color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
  }
  return color.toLowerCase();
};

export const hexToRgba = (hex, alpha = 1) => {
  const safe = normalizeHexColor(hex);
  const a = Math.max(0, Math.min(1, Number(alpha)));
  if (!safe) return `rgba(148, 163, 184, ${a})`;
  const num = Number.parseInt(safe.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export const mixHexWithWhite = (hex, strength = 0.2) => {
  const safe = normalizeHexColor(hex);
  const s = Math.max(0, Math.min(1, Number(strength)));
  if (!safe) return 'rgb(226, 232, 240)';
  const num = Number.parseInt(safe.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const blendedR = Math.round(255 * (1 - s) + r * s);
  const blendedG = Math.round(255 * (1 - s) + g * s);
  const blendedB = Math.round(255 * (1 - s) + b * s);
  return `rgb(${blendedR}, ${blendedG}, ${blendedB})`;
};

export const normalizeCategoryKey = (value) => String(value || '').trim().toLowerCase();

export const normalizeSearchText = (value) => String(value || '').trim().toLowerCase();

export const normalizeSearchHiragana = (value) => toHiragana(String(value || '').trim()).toLowerCase();

export const normalizeSearchRomaji = (value) => toRomaji(toHiragana(String(value || '').trim()))
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

export const normalizeGroupKey = (value) => {
  const key = normalizeCategoryKey(value);
  return key;
};

export const buildOrderedGroupKeys = (keysRaw) => {
  const seen = new Set();
  const keys = [];

  (Array.isArray(keysRaw) ? keysRaw : []).forEach((raw) => {
    const key = normalizeGroupKey(raw);
    if (!key || key === 'all' || seen.has(key)) return;
    seen.add(key);
    keys.push(key);
  });

  return keys;
};

export const buildGroupTags = (groupKeysRaw) => {
  return buildOrderedGroupKeys(groupKeysRaw)
    .map((key) => {
      if (key === 'vs') {
        return { key, kind: 'logo', label: 'VS', icon: UNIT_TAG_ICON_MAP.vs };
      }

      if (key === 'vocaloid') {
        return null;
      }

      if (Object.prototype.hasOwnProperty.call(UNIT_TAG_ICON_MAP, key)) {
        return { key, kind: 'logo', label: key.toUpperCase(), icon: UNIT_TAG_ICON_MAP[key] };
      }

      if (key === 'other') {
        return { key, kind: 'other', label: '其他' };
      }

      return { key, kind: 'text', label: key.toUpperCase() };
    })
    .filter(Boolean);
};

export const buildMvTags = (categories) => {
  const tags = [];
  const seenLabels = new Set();

  categories.forEach((raw) => {
    const key = normalizeCategoryKey(raw);
    if (!key) return;

    const mapped = Object.prototype.hasOwnProperty.call(MV_TAG_MAP, key)
      ? MV_TAG_MAP[key]
      : { label: String(raw || '').trim(), tone: 'is-other' };

    if (!mapped) return;
    if (seenLabels.has(mapped.label)) return;

    seenLabels.add(mapped.label);
    tags.push({ key, label: mapped.label, tone: mapped.tone });
  });

  return tags;
};

export const buildSongJacketIdText = (songIdRaw) => {
  const id = Number(songIdRaw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return String(Math.trunc(id)).padStart(3, '0');
};

export const buildLocalSongJacketUrl = (songIdRaw) => {
  const idText = buildSongJacketIdText(songIdRaw);
  if (!idText) return '';
  const fileName = `song_${idText}.webp`;
  return buildAssetUrl(`${LOCAL_SONG_JACKET_BASE_PATH}/${fileName}`);
};

export const asArray = (value) => (Array.isArray(value) ? value : []);

export const toFiniteSongId = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? n : null;
};

export const hasSong2DMVCategory = (song) => {
  if (!Array.isArray(song?.categoryKeys)) return false;
  return song.categoryKeys.includes('2dmv');
};

export const hasSong3DMVCategory = (song) => {
  if (!Array.isArray(song?.categoryKeys)) return false;
  return song.categoryKeys.includes('3dmv');
};

export const hasSongAppendDifficulty = (song) => !isSongDifficultyMissing(song, 'append');

export const normalizeAsciiAbbr = (raw) => String(raw || '').trim().replace(/[^a-zA-Z]/g, '').toLowerCase();

export const getSongDifficultyText = (song, key) => {
  const raw = song?.difficulties?.[key];
  if (raw === null || raw === undefined || raw === '') return '-';
  const n = Number(raw);
  return Number.isFinite(n) ? String(n) : String(raw);
};

export const isSongDifficultyMissing = (song, key) => {
  const raw = song?.difficulties?.[key];
  return raw === null || raw === undefined || raw === '';
};

export const buildSongDifficultyToastItems = (song) => {
  return SONG_DIFFICULTY_ORDER.map((diff) => ({
    key: diff.key,
    text: getSongDifficultyText(song, diff.key),
    empty: diff.key === 'append' && isSongDifficultyMissing(song, diff.key)
  }));
};

export const formatSongToastDate = (raw) => {
  const text = String(raw || '').trim();
  if (!text) return '';
  const dateMatch = text.match(/^\d{2,4}[/-]\d{1,2}[/-]\d{1,2}/);
  if (dateMatch) return dateMatch[0];
  return text.split(/[T\s]+/)[0] || text;
};

export const waitNextPaint = () => new Promise((resolve) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  });
});
