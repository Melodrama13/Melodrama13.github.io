import { computed } from 'vue';
import { useAppSettings } from '../services/appSettings.js';

/**
 * Normalize source songs when their data changes, then apply the existing
 * release policy when the page clock or spoiler preference changes. Each call
 * owns its computed catalog; unchanged membership keeps its identity downstream.
 *
 * @template SongRow, NormalizedSong
 * @param {{
 *   getSongs: () => SongRow[],
 *   normalizeSong: (song: SongRow) => NormalizedSong,
 *   isSongReleased: (song: NormalizedSong, now: Date, allowSpoilers: boolean) => boolean,
 *   settings?: { allowSpoilers: import('vue').Ref<boolean> },
 *   now: import('vue').Ref<Date>,
 *   compareSongs: (left: NormalizedSong, right: NormalizedSong) => number
 * }} options
 * @returns {import('vue').ComputedRef<NormalizedSong[]>}
 */
export function useReleasedSongCatalog({ getSongs, normalizeSong, isSongReleased, now, compareSongs, settings: providedSettings }) {
  const settings = providedSettings ?? useAppSettings();
  const normalizedSongs = computed(() => {
    const sourceSongs = getSongs();
    return (Array.isArray(sourceSongs) ? sourceSongs : []).map(normalizeSong);
  });

  return computed((previousSongs) => {
    const currentTime = now.value;
    const allowSpoilers = settings?.allowSpoilers?.value === true;
    const releasedSongs = normalizedSongs.value
      .filter((song) => isSongReleased(song, currentTime, allowSpoilers))
      .sort(compareSongs);

    if (previousSongs?.length === releasedSongs.length
      && releasedSongs.every((song, index) => song === previousSongs[index])) {
      return previousSongs;
    }
    return releasedSongs;
  });
}
