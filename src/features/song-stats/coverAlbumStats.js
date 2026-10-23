import { OC_UNIT_OPTIONS } from './songDisplayConstants.js';
import { OFFICIAL_COVER_ALBUMS, COVER_ALBUM_EXCEPTIONS } from './coverAlbumCatalog.js';

const TRACKS_PER_ALBUM = 12;
const GAME_LAUNCH = Date.UTC(2020, 8, 30);
const OC_UNITS = new Set(OC_UNIT_OPTIONS.map((row) => row.key));
// These launch songs share an upstream placeholder, rather than a game release date.
const LAUNCH_SONG_IDS = new Set([1, 2, 3, 6, 10, 13, 19, 26, 28, 38, 41, 43, 47, 49, 50, 51, 54, 57, 60, 63, 66, 67, 69, 71, 76, 77, 78, 82]);
const gameReleaseDate = (song) => LAUNCH_SONG_IDS.has(Number(song?.id)) && song?.releaseDate === '2019-06-10 15:27:11'
  ? '2020/9/30' : song?.releaseDate || '';

// Parse source JST wall time consistently across browsers; reject placeholders/invalid dates.
function releaseOrder(value) {
  const match = String(value || '').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part || 0));
  const valueMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(valueMs);
  if (valueMs < GAME_LAUNCH || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute
    || date.getUTCSeconds() !== second) return null;
  return valueMs;
}

/** Build from the page's released catalog, including deleted songs for fixed historical albums. */
export function buildCoverAlbumStats({ songs = [], characters = [], catalog = OFFICIAL_COVER_ALBUMS, exceptions = COVER_ALBUM_EXCEPTIONS } = {}) {
  const songsById = new Map(songs.map((song) => [Number(song.id), song]));
  const charactersByName = new Map();
  characters.forEach((character) => {
    for (const name of [character.zh_name, character.ja_name, `${character.first_name || ''}${character.given_name || ''}`]) {
      if (name) charactersByName.set(name, character);
    }
  });
  const matchingVocals = (song, unit) => (song?.vocals || [])
    .filter((vocal) => {
      if (vocal.type !== 'sekai') return false;
      const units = new Set((vocal.characters || []).map((name) => charactersByName.get(name)?.unit).filter((key) => OC_UNITS.has(key)));
      return units.size === 1 && units.has(unit);
    })
    .map((vocal) => ({ vocal, members: [...new Set((vocal.characters || []).map((name) => charactersByName.get(name)).filter(Boolean))] }))
    .sort((a, b) => b.members.filter((c) => c.unit === unit).length - a.members.filter((c) => c.unit === unit).length
      || b.members.length - a.members.length || Number(a.vocal.vocal_id || 0) - Number(b.vocal.vocal_id || 0));
  const eligibleByUnit = new Map(OC_UNIT_OPTIONS.map(({ key }) => [key, []]));
  for (const song of songsById.values()) {
    if (song.isNewlyWrittenMusic !== false) continue;
    const matchedUnits = new Set();
    for (const vocal of song.vocals || []) {
      if (vocal.type !== 'sekai') continue;
      const units = new Set((vocal.characters || []).map((name) => charactersByName.get(name)?.unit).filter((unit) => OC_UNITS.has(unit)));
      if (units.size === 1) matchedUnits.add([...units][0]);
    }
    for (const unit of matchedUnits) eligibleByUnit.get(unit).push(song);
  }
  const makeTrack = (id, index, unit) => {
    const song = songsById.get(Number(id));
    return {
      id: Number(id), position: index + 1, title: song?.title || `歌曲 ${id}（暂缺数据）`,
      releaseDate: releaseOrder(gameReleaseDate(song)) === null ? '' : gameReleaseDate(song), jacketUrl: song?.jacketUrl || '',
      vsNames: (matchingVocals(song, unit)[0]?.members || []).filter((character) => character.unit === 'vs')
        .sort((a, b) => Number(a.id) - Number(b.id)).map((character) => character.zh_name),
      missing: !song
    };
  };
  return OC_UNIT_OPTIONS.map(({ key: unit, label }) => {
    const official = catalog.filter((row) => row.unit === unit).sort((a, b) => a.volume - b.volume);
    const officialIds = new Set(official.flatMap((album) => album.songIds));
    const exceptionIds = new Set(exceptions.filter((row) => row.unit === unit).map((row) => Number(row.songId)));
    const albums = official.map((album) => ({
      volume: album.volume, status: 'official', sourceUrl: album.sourceUrl,
      tracks: album.songIds.map((id, index) => makeTrack(id, index, unit)), remainingCount: 0
    }));
    const excludedSongs = [], undatedSongs = [], pending = [];
    for (const song of eligibleByUnit.get(unit)) {
      if (officialIds.has(Number(song.id))) continue;
      if (exceptionIds.has(Number(song.id))) {
        excludedSongs.push(makeTrack(song.id, excludedSongs.length, unit));
        continue;
      }
      const order = releaseOrder(gameReleaseDate(song));
      if (order === null) undatedSongs.push(makeTrack(song.id, undatedSongs.length, unit));
      else pending.push({ song, order });
    }
    pending.sort((a, b) => a.order - b.order || Number(a.song.id) - Number(b.song.id));
    const nextVolume = Math.max(0, ...official.map((album) => album.volume)) + 1;
    for (let start = 0; start < pending.length; start += TRACKS_PER_ALBUM) {
      const batch = pending.slice(start, start + TRACKS_PER_ALBUM);
      albums.push({
        volume: nextVolume + start / TRACKS_PER_ALBUM,
        status: batch.length === TRACKS_PER_ALBUM ? 'predicted' : 'candidate', sourceUrl: '',
        tracks: batch.map(({ song }, index) => makeTrack(song.id, index, unit)),
        remainingCount: TRACKS_PER_ALBUM - batch.length
      });
    }
    return {
      unit, label, albums, officialAlbumCount: official.length, officialSongCount: officialIds.size,
      pendingSongCount: pending.length, excludedSongs, undatedSongs
    };
  });
}
