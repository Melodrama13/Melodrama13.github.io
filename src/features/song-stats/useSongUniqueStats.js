import { CORE_UNIT_KEYS, OC_UNIT_OPTIONS } from './songDisplayConstants.js';
import { computed } from 'vue';
import { hasSongAppendDifficulty } from './songFormatters.js';

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongUniqueStats({
  songsForStats
}) {
const isCoreUniqueSongForUnit = (song, unitKey) => {
  if (!song.unitKeys.includes(unitKey)) return false;
  return !CORE_UNIT_KEYS.some((coreKey) => coreKey !== unitKey && song.unitKeys.includes(coreKey));
};

const ocUniqueStats = computed(() => {
  const rows = [
    {
      unit: 'vs',
      isUniqueSong: (song) => isCoreUniqueSongForUnit(song, 'vs'),
      has2d: (song) => song.categoryKeys.includes('2dmv') || song.categoryKeys.includes('vs_2dmv')
    },
    ...OC_UNIT_OPTIONS.map((item) => ({
      unit: item.key,
      isUniqueSong: (song) => isCoreUniqueSongForUnit(song, item.key),
      has2d: (song) => song.categoryKeys.includes('2dmv')
    }))
  ];

  return rows.map((row) => {
    const uniqueSongs = songsForStats.value.filter((song) => row.isUniqueSong(song));
    const with2dCount = uniqueSongs.filter((song) => row.has2d(song)).length;
    const with3dCount = uniqueSongs.filter((song) => song.categoryKeys.includes('3dmv')).length;
    const withApdCount = uniqueSongs.filter((song) => hasSongAppendDifficulty(song)).length;

    return {
      unit: row.unit,
      uniqueCount: uniqueSongs.length,
      with2dCount,
      with3dCount,
      withApdCount
    };
  });
});

return { isCoreUniqueSongForUnit, ocUniqueStats };
}
