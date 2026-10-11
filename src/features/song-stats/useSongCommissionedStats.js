import { normalizeAsciiAbbr, parseSlashDateOrder, asArray, toFiniteSongId, mixHexWithWhite, hasSong3DMVCategory, hasSong2DMVCategory } from './songFormatters.js';
import { UNIT_TAG_ABBR_MAP, VS_UNIT_ORDER, BASE_UNIT_COLOR_MAP, OC_UNIT_OPTIONS, SONG_STAT_CARD_TINT_ALPHA, VS_UNIT_ORDER_MAP } from './songDisplayConstants.js';
import { computed } from 'vue';
import { buildOcCommissionedSongStats } from './ocCommissionedSongStats.js';
import { buildVsCommissionedSongImageGroups, buildVsCommissionedSongStats } from './vsCommissionedSongStats.js';

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongCommissionedStats({
  getCharacterSingleMark,
  getCharacterAbbr,
  getUnitByChar,
  unitColorMap,
  getCharacterColor,
  props,
  songsById,
  normalizeCharacterName,
  parseVS,
  getCharacterAvatarSrc,
  buildBookRoundVsIcons,
  VS_NAMES,
  charactersByUnit,
  buildVsIconsFromNames
}) {
const makeSongTagSingle = (ev) => {
  const sid = String(ev?.type_series_id || '').trim();
  const bannerName = String(ev?.banner || '').trim();
  const unit = String(ev?.unit || '').trim().toLowerCase();
  if (bannerName) return `${getCharacterSingleMark(bannerName)}${sid}`;
  if (unit) return `${String(unit).slice(0, 1)}${sid}`;
  return sid ? `曲${sid}` : '未知';
};

const makeSongTagAbbr = (ev) => {
  const sid = String(ev?.type_series_id || '').trim();
  const bannerName = String(ev?.banner || '').trim();
  const unit = String(ev?.unit || '').trim().toLowerCase();
  if (bannerName) {
    const abbr = normalizeAsciiAbbr(getCharacterAbbr(bannerName));
    return `${abbr || 'char'}${sid}`;
  }
  if (unit) {
    const unitAbbr = UNIT_TAG_ABBR_MAP[unit] || normalizeAsciiAbbr(unit) || 'song';
    return `${unitAbbr}${sid}`;
  }
  return sid ? `song${sid}` : 'unknown';
};

const makeSongTagNumber = (ev) => {
  const sid = String(ev?.type_series_id || '').trim();
  if (sid) return sid;
  const matched = String(makeSongTagSingle(ev)).match(/(\d+)$/);
  return matched ? matched[1] : '-';
};

const getSongTagColor = (ev) => {
  const bannerName = String(ev?.banner || '').trim();
  const unit = bannerName ? getUnitByChar(bannerName) : String(ev?.unit || '').trim().toLowerCase();
  return unitColorMap.value[unit] || '#111827';
};

const getSongTagImageColor = (ev) => {
  const bannerName = String(ev?.banner || '').trim();
  const byCharacter = bannerName ? getCharacterColor(bannerName) : '';
  if (byCharacter) return byCharacter;
  return getSongTagColor(ev);
};

const parseSeriesOrder = (ev) => {
  const rawSeries = Number(ev?.type_series_id);
  if (Number.isFinite(rawSeries) && rawSeries > 0) return Math.trunc(rawSeries);

  const tag = makeSongTagNumber(ev);
  const matched = String(tag).match(/(\d+)$/);
  if (matched) return Number(matched[1]);
  return Number.MAX_SAFE_INTEGER;
};

const getBookRoundEventIdText = (event) => String(event?.id ?? '').trim();

const isBookRoundNumericEventId = (event) => /^-?\d+$/.test(getBookRoundEventIdText(event));

const compareBookRoundEventOrder = (a, b) => {
  const da = parseSlashDateOrder(a?.start_date);
  const db = parseSlashDateOrder(b?.start_date);
  if (da !== db) return da - db;

  const aNumeric = isBookRoundNumericEventId(a);
  const bNumeric = isBookRoundNumericEventId(b);
  if (aNumeric !== bNumeric) return aNumeric ? 1 : -1;
  if (aNumeric && bNumeric) return Number(a.id) - Number(b.id);
  return getBookRoundEventIdText(a).localeCompare(getBookRoundEventIdText(b), 'zh-Hans-CN');
};

const bookRoundStats = computed(() => {
  const rows = [];
  let currentRow = null;
  let usedUnits = new Set();

  asArray(props.allEvents)
    .filter((ev) => !ev?.isPredict && isBookRoundNumericEventId(ev))
    .sort(compareBookRoundEventOrder)
    .forEach((ev) => {
      if (ev?.event_type !== '箱活') return;
      const unitKey = String(ev?.unit || '').trim().toLowerCase();
      if (!VS_UNIT_ORDER.includes(unitKey)) return;

      const songId = toFiniteSongId(ev?.song_id);
      if (songId === null) return;
      const song = songsById.value.get(songId);
      const songName = String(song?.title || '').trim();
      if (!songName) return;

      if (!currentRow || usedUnits.size >= VS_UNIT_ORDER.length || usedUnits.has(unitKey)) {
        currentRow = {
          round: rows.length + 1,
          cells: Array.from({ length: VS_UNIT_ORDER.length }, () => null),
          seenVs: new Set()
        };
        rows.push(currentRow);
        usedUnits = new Set();
      }

      const position = usedUnits.size;
      usedUnits.add(unitKey);

      const bannerName = String(ev?.banner || '').trim();
      const normalizedName = normalizeCharacterName(bannerName);
      const ocName = normalizedName || bannerName;
      const vsNames = parseVS(ev?.virtual_singer);
      vsNames.forEach((name) => currentRow.seenVs.add(name));

      currentRow.cells[position] = {
        eventId: Number(ev.id),
        unit: unitKey,
        songId,
        songName,
        ocName,
        ocTitle: `${ocName || '-'} / ${songName}`,
        ocIcon: getCharacterAvatarSrc(ocName),
        ocFill: mixHexWithWhite(unitColorMap.value[unitKey] || BASE_UNIT_COLOR_MAP[unitKey] || '#cbd5e1', 0.22),
        vsIcons: buildBookRoundVsIcons(vsNames, unitKey),
        has3d: hasSong3DMVCategory(song)
      };
    });

  return rows.map((row) => {
    const isCompleteRound = row.cells.filter(Boolean).length >= VS_UNIT_ORDER.length;
    return {
      round: row.round,
      cells: row.cells,
      missingVsIcons: row.round === 1 || !isCompleteRound
        ? []
        : VS_NAMES.value
          .filter((name) => !row.seenVs.has(name))
          .map((name) => ({ name, icon: getCharacterAvatarSrc(name) }))
          .filter((item) => item.icon)
    };
  });
});

const ocBookStatsByUnit = computed(() => buildOcCommissionedSongStats({
  events: props.allEvents,
  songsById: songsById.value,
  unitOptions: OC_UNIT_OPTIONS,
  charactersByUnit: charactersByUnit.value,
  unitColorByKey: unitColorMap.value,
  baseUnitColorByKey: BASE_UNIT_COLOR_MAP,
  cardTintAlpha: SONG_STAT_CARD_TINT_ALPHA,
  toFiniteSongId,
  getUnitByChar,
  normalizeCharacterName,
  getCharacterAvatarSrc,
  getCharacterColor,
  mixHexWithWhite,
  makeSongTagSingle,
  makeSongTagNumber,
  parseSeriesOrder,
  parseVS,
  buildVsIconsFromNames,
  hasSong2DMVCategory,
  hasSong3DMVCategory,
}));

const vsSongImageGroupOptions = computed(() => ({
  unitOrder: VS_UNIT_ORDER,
  unitColorByKey: unitColorMap.value,
  baseUnitColorByKey: BASE_UNIT_COLOR_MAP,
  mixHexWithWhite,
}));

const vsSongImageGroupsByRow = computed(() => {
  const options = vsSongImageGroupOptions.value;
  return new Map(virtualSingerSongStats.value.map((row) => [row, buildVsCommissionedSongImageGroups(row, options)]));
});

const getVsSongImageGroups = (row) => vsSongImageGroupsByRow.value.get(row)
  || buildVsCommissionedSongImageGroups(row, vsSongImageGroupOptions.value);

const virtualSingerSongStats = computed(() => buildVsCommissionedSongStats({
  events: props.allEvents,
  songsById: songsById.value,
  singerNames: VS_NAMES.value,
  unitOrderByKey: VS_UNIT_ORDER_MAP,
  cardTintAlpha: SONG_STAT_CARD_TINT_ALPHA,
  toFiniteSongId,
  getUnitByChar,
  getCharacterAvatarSrc,
  getCharacterColor,
  mixHexWithWhite,
  makeSongTagSingle,
  makeSongTagAbbr,
  makeSongTagNumber,
  getSongTagColor,
  getSongTagImageColor,
  parseVS,
  hasSong2DMVCategory,
  hasSong3DMVCategory,
}));

return { makeSongTagSingle, makeSongTagAbbr, makeSongTagNumber, getSongTagColor, getSongTagImageColor, parseSeriesOrder, getBookRoundEventIdText, isBookRoundNumericEventId, compareBookRoundEventOrder, bookRoundStats, ocBookStatsByUnit, vsSongImageGroupOptions, vsSongImageGroupsByRow, getVsSongImageGroups, virtualSingerSongStats };
}
