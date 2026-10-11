import { computed } from "vue";
import { normalizeId, normalizeUnit, hexToRgb } from './specialPredictionFormatters.js';

/** Owns special prediction metadata with explicit instance dependencies. */
export function useSpecialMetadata(ports = {}) {
const baseCardsByEventId = computed(() => {
  const map = new Map();
  (Array.isArray(ports.props.allBaseCards) ? ports.props.allBaseCards : []).forEach((card) => {
    const key = normalizeId(card?.EventID);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(card);
  });
  return map;
});

const charMap = computed(() => {
  const map = {};
  (Array.isArray(ports.props.allCharacters) ? ports.props.allCharacters : []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    if (!name) return;
    map[name] = {
      abbr: String(char?.en_abbr || '').trim(),
      unit: normalizeUnit(char?.unit),
      color: String(char?.color || '').trim(),
      zhName: name,
      jaName: String(char?.ja_name || '').trim(),
      singleMark: String(char?.single_mark || '').trim()
    };
  });
  return map;
});

const characterCommandMap = computed(() => {
  const map = new Map();
  Object.values(charMap.value).forEach((meta) => {
    const aliases = [meta.zhName, meta.jaName, meta.singleMark, meta.abbr];
    aliases.forEach((alias) => {
      const key = String(alias || '').trim().toLowerCase();
      if (key && !map.has(key)) map.set(key, meta);
    });
  });
  return map;
});

const vsNameSet = computed(() => new Set(
  Object.entries(charMap.value)
    .filter(([, meta]) => meta.unit === 'vs')
    .map(([name]) => name)
));

const characterColorOptions = computed(() => (Array.isArray(ports.props.allCharacters) ? ports.props.allCharacters : [])
  .map((char) => ({
    name: String(char?.zh_name || '').trim(),
    color: String(char?.color || '').trim()
  }))
  .filter((item) => item.name && !!hexToRgb(item.color))
  .slice(0, 26));

return { baseCardsByEventId,
charMap,
characterCommandMap,
vsNameSet,
characterColorOptions };
}
