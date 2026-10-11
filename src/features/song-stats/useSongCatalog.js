import { ref, computed } from 'vue';
import { normalizeCategoryKey, buildOrderedGroupKeys, buildLocalSongJacketUrl, normalizeSearchHiragana, normalizeSearchRomaji, formatSongShortDate, normalizeSearchText, buildMvTags, buildGroupTags, normalizeSongId, toFiniteSongId } from './songFormatters.js';
import { DELETED_SONG_ID_SET } from './songDisplayConstants.js';
import { useReleasedSongCatalog } from '../../composables/useReleasedSongCatalog.js';
import { isSongReleased } from '../../utils/spoilerGuard.js';

/** Per-instance state owned by SongCatalog. */
export function createSongCatalogState() {
const spoilerNow = ref(new Date());

const spoilerClockTimer = ref(0);

const includeDeletedSongsInStats = ref(true);
return { spoilerNow, spoilerClockTimer, includeDeletedSongsInStats };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongCatalog({
  spoilerNow,
  spoilerClockTimer,
  includeDeletedSongsInStats,
  props
}) {
const SPOILER_CLOCK_INTERVAL_MS = 60 * 1000;

const refreshSpoilerClock = () => {
  spoilerNow.value = new Date();
};

const normalizeSongRow = (row) => {
  const idNum = Number(row?.id);
  const title = String(row?.title || '').trim();
  const composer = String(row?.composer || '').trim();
  const lyricist = String(row?.lyricist || '').trim();
  const arranger = String(row?.arranger || '').trim();
  const pronunciation = String(row?.pronunciation || '').trim();
  const releaseDate = String(row?.releaseDate || '').trim();
  const categories = Array.isArray(row?.categories)
    ? row.categories.map((c) => String(c || '').trim()).filter(Boolean)
    : [];
  const unitsRaw = Array.isArray(row?.units) ? row.units : [];
  const unitKeys = unitsRaw.map((tag) => normalizeCategoryKey(tag)).filter(Boolean);
  const groupKeys = buildOrderedGroupKeys(unitsRaw);
  const localJacketUrl = buildLocalSongJacketUrl(row?.id);

  return {
    id: row?.id ?? '-',
    songIdNum: Number.isFinite(idNum) ? idNum : null,
    isDeletedSong: Number.isFinite(idNum) && DELETED_SONG_ID_SET.has(idNum),
    title,
    pronunciation,
    pronunciationHiragana: normalizeSearchHiragana(pronunciation),
    pronunciationRomaji: normalizeSearchRomaji(pronunciation),
    composer,
    lyricist,
    arranger,
    releaseDate,
    releaseDateText: formatSongShortDate(releaseDate),
    isNewlyWrittenMusic: row?.isNewlyWrittenMusic === true,
    searchTitle: normalizeSearchText(title),
    searchComposer: normalizeSearchText(composer),
    searchLyricist: normalizeSearchText(lyricist),
    searchArranger: normalizeSearchText(arranger),
    difficulties: row?.difficulties && typeof row.difficulties === 'object' ? row.difficulties : {},
    unitKeys,
    categoryKeys: categories.map((c) => normalizeCategoryKey(c)).filter(Boolean),
    groupKeys,
    vocals: Array.isArray(row?.vocals) ? row.vocals : [],
    mvTags: buildMvTags(categories),
    groupTags: buildGroupTags(groupKeys),
    jacketUrl: localJacketUrl
  };
};

const songs = useReleasedSongCatalog({
  getSongs: () => props.allSongs,
  normalizeSong: normalizeSongRow,
  isSongReleased,
  now: spoilerNow,
  compareSongs: (a, b) => normalizeSongId(a.id) - normalizeSongId(b.id)
});

const songsForStats = computed(() => {
  if (includeDeletedSongsInStats.value) return songs.value;
  return songs.value.filter((song) => !song.isDeletedSong);
});

const songsById = computed(() => {
  const map = new Map();
  songs.value.forEach((song) => {
    const id = toFiniteSongId(song?.id);
    if (id === null) return;
    map.set(id, song);
  });
  return map;
});

return { SPOILER_CLOCK_INTERVAL_MS, refreshSpoilerClock, normalizeSongRow, songs, songsForStats, songsById };
}
