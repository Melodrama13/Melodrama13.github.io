import { computed } from 'vue';
import { normalizeHexColor, asArray } from './songFormatters.js';
import { OC_UNIT_KEYS, BASE_UNIT_COLOR_MAP, VS_UNIT_ORDER } from './songDisplayConstants.js';

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongCharacters({
  props
}) {
const getNavAbbrFromName = (name) => {
  return String(getCharacterAbbr(name) || '')
    .trim()
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
};

const getVsSingerBookSubtitle = (name) => {
  const abbr = getNavAbbrFromName(name);
  if (!abbr) return `${String(name || '').trim()} 书下`;
  return `${abbr.toUpperCase()} 书下`;
};

const characters = computed(() => {
  return (Array.isArray(props.allCharacters) ? props.allCharacters : [])
    .map((char, idx) => {
      const name = String(char?.zh_name || '').trim();
      if (!name) return null;
      const order = Number(char?.id);
      return {
        name,
        unit: String(char?.unit || '').trim().toLowerCase() || 'vs',
        abbr: String(char?.en_abbr || '').trim() || name,
        singleMark: String(char?.single_mark || '').trim() || String(name).slice(0, 1),
        order: Number.isFinite(order) && order > 0 ? order : 900 + idx,
        color: normalizeHexColor(char?.color) || '#cbd5e1',
        unitColor: normalizeHexColor(char?.unit_color)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'zh-Hans-CN'));
});

const characterByName = computed(() => {
  return new Map(characters.value.map((char) => [char.name, char]));
});

const charactersByUnit = computed(() => {
  const grouped = Object.fromEntries(OC_UNIT_KEYS.map((key) => [key, []]));
  characters.value.forEach((char) => {
    if (!Object.prototype.hasOwnProperty.call(grouped, char.unit)) return;
    grouped[char.unit].push(char);
  });
  return grouped;
});

const unitColorMap = computed(() => {
  const next = { ...BASE_UNIT_COLOR_MAP };
  characters.value.forEach((char) => {
    if (char.unitColor) next[char.unit] = char.unitColor;
  });
  return next;
});

const getAnotherCharacterSortOrder = (charMeta) => {
  if (!charMeta) return Number.MAX_SAFE_INTEGER;
  if (charMeta.name !== '巡音流歌') return charMeta.order;
  const mikuOrder = characterByName.value.get('初音未来')?.order;
  if (!Number.isFinite(mikuOrder)) return charMeta.order;
  return mikuOrder + 0.01;
};

const normalizeCharacterName = (rawName) => {
  const full = String(rawName || '').trim();
  if (!full) return '';
  if (characterByName.value.has(full)) return full;

  const affiliationMatch = full.match(/^(.+?)[\s_-]+(ln|mmj|vbs|ws|nc|vs)$/i);
  if (affiliationMatch) {
    const baseWithSuffix = affiliationMatch[1].trim();
    if (baseWithSuffix && characterByName.value.has(baseWithSuffix)) return baseWithSuffix;
  }

  const base = full.split(/\s+/)[0] || '';
  if (base && characterByName.value.has(base)) return base;
  return '';
};

const getCharacterAvatarSrc = (rawName) => {
  const normalized = normalizeCharacterName(rawName);
  const meta = characterByName.value.get(normalized);
  const key = String(meta?.abbr || '').trim();
  return key ? `/chibi_s/${key}.webp` : '';
};

const getAprilFoolCharacterIcon = (rawName) => {
  const full = String(rawName || '').trim();
  const affiliationMatch = full.match(/^(.+?)[\s_-]+(ln|mmj|vbs|ws|nc)$/i);
  if (affiliationMatch) {
    const baseName = affiliationMatch[1].trim();
    const unit = affiliationMatch[2].trim().toLowerCase();
    const normalized = normalizeCharacterName(baseName);
    const meta = characterByName.value.get(normalized);
    if (meta?.unit === 'vs') {
      const key = String(meta?.abbr || '').trim().toLowerCase();
      if (key) {
        return {
          name: full,
          icon: `/chibi_s/${key}_${unit}.webp`,
          borderColor: unitColorMap.value[unit] || BASE_UNIT_COLOR_MAP[unit] || '#cbd5e1'
        };
      }
    }
  }

  const normalized = normalizeCharacterName(full);
  const meta = characterByName.value.get(normalized);
  const unit = meta?.unit || 'vs';
  return {
    name: full,
    icon: getCharacterAvatarSrc(full),
    borderColor: unitColorMap.value[unit] || BASE_UNIT_COLOR_MAP[unit] || '#cbd5e1'
  };
};

const getCharacterColor = (rawName) => {
  const normalized = normalizeCharacterName(rawName);
  return characterByName.value.get(normalized)?.color || '#cbd5e1';
};

const getCharacterSingleMark = (rawName) => {
  const normalized = normalizeCharacterName(rawName);
  const mark = String(characterByName.value.get(normalized)?.singleMark || '').trim();
  if (mark) return mark;
  return String(normalized || rawName || '').slice(0, 1);
};

const getCharacterAbbr = (rawName) => {
  const normalized = normalizeCharacterName(rawName);
  return String(characterByName.value.get(normalized)?.abbr || normalized || rawName || '').trim();
};

const VS_ALIAS_MAP = computed(() => {
  const map = new Map();
  characters.value
    .filter((char) => char.unit === 'vs')
    .forEach((char) => {
      const aliases = [
        char.name,
        char.name.split(/\s+/)[0],
        String(char.abbr || '').trim(),
        String(char.abbr || '').trim().toUpperCase(),
        String(char.abbr || '').trim().toLowerCase(),
        String(char.singleMark || '').trim()
      ].filter(Boolean);

      aliases.forEach((alias) => {
        map.set(String(alias), char.name);
      });
    });
  return map;
});

const VS_NAMES = computed(() => {
  return characters.value.filter((char) => char.unit === 'vs').map((char) => char.name);
});

const parseVS = (vsStr) => {
  if (!vsStr) return [];
  return String(vsStr)
    .split(/[,，/、\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      return VS_ALIAS_MAP.value.get(token)
        || VS_ALIAS_MAP.value.get(token.toUpperCase())
        || VS_ALIAS_MAP.value.get(token.toLowerCase())
        || '';
    })
    .filter((name) => VS_NAMES.value.includes(name));
};

const getUnitByChar = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return 'vs';
  const [baseName, suffixRaw] = raw.split(/\s+/);
  const suffix = String(suffixRaw || '').toLowerCase();
  const baseUnit = characterByName.value.get(normalizeCharacterName(baseName))?.unit || 'vs';
  if (baseUnit === 'vs') {
    if (suffix && Object.prototype.hasOwnProperty.call(unitColorMap.value, suffix)) return suffix;
    return 'vs';
  }
  return baseUnit;
};

const buildVsIconsFromNames = (vsNames) => {
  return asArray(vsNames)
    .map((name) => {
      const icon = getCharacterAvatarSrc(name);
      if (!icon) return null;
      return { name, icon };
    })
    .filter(Boolean);
};

const getUnitVsAvatarSrc = (rawName, unitKey) => {
  const normalized = normalizeCharacterName(rawName);
  const meta = characterByName.value.get(normalized);
  const abbr = String(meta?.abbr || '').trim().replace(/[^a-zA-Z]/g, '').toLowerCase();
  const unit = String(unitKey || '').trim().toLowerCase();
  if (abbr && VS_UNIT_ORDER.includes(unit)) return `/chibi_s/${abbr}_${unit}.webp`;
  return getCharacterAvatarSrc(rawName);
};

const buildBookRoundVsIcons = (vsNames, unitKey) => {
  return asArray(vsNames)
    .map((name) => {
      const icon = getUnitVsAvatarSrc(name, unitKey);
      if (!icon) return null;
      return { name, icon };
    })
    .filter(Boolean);
};

const getKnownCharacters = (rawList) => {
  const uniq = new Map();
  (Array.isArray(rawList) ? rawList : []).forEach((rawName) => {
    const normalized = normalizeCharacterName(rawName);
    if (!normalized) return;
    const meta = characterByName.value.get(normalized);
    if (!meta) return;
    uniq.set(meta.name, meta);
  });
  return Array.from(uniq.values());
};

return { getNavAbbrFromName, getVsSingerBookSubtitle, characters, characterByName, charactersByUnit, unitColorMap, getAnotherCharacterSortOrder, normalizeCharacterName, getCharacterAvatarSrc, getAprilFoolCharacterIcon, getCharacterColor, getCharacterSingleMark, getCharacterAbbr, VS_ALIAS_MAP, VS_NAMES, parseVS, getUnitByChar, buildVsIconsFromNames, getUnitVsAvatarSrc, buildBookRoundVsIcons, getKnownCharacters };
}
