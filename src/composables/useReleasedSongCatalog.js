import { computed } from 'vue';

/**
 * Normalize source songs when their data changes, then apply the existing
 * release policy when the page clock changes. Each call owns its computed
 * catalog; unchanged membership keeps its identity for downstream statistics.
 *
 * @template SongRow, NormalizedSong
 * @param {{
 *   getSongs: () => SongRow[],
 *   normalizeSong: (song: SongRow) => NormalizedSong,
 *   isSongReleased: (song: NormalizedSong, now: Date) => boolean,
 *   now: import('vue').Ref<Date>,
 *   compareSongs: (left: NormalizedSong, right: NormalizedSong) => number
 * }} options
 * @returns {import('vue').ComputedRef<NormalizedSong[]>}
 */
export function useReleasedSongCatalog({ getSongs, normalizeSong, isSongReleased, now, compareSongs }) {
  const normalizedSongs = computed(() => {
    const sourceSongs = getSongs();
    return (Array.isArray(sourceSongs) ? sourceSongs : []).map(normalizeSong);
  });

  return computed((previousSongs) => {
    const currentTime = now.value;
    const releasedSongs = normalizedSongs.value
      .filter((song) => isSongReleased(song, currentTime))
      .sort(compareSongs);

    if (previousSongs?.length === releasedSongs.length
      && releasedSongs.every((song, index) => song === previousSongs[index])) {
      return previousSongs;
    }
    return releasedSongs;
  });
}
