import { normalizeCategoryKey, asArray, normalizeSongId } from './songFormatters.js';
import { computed } from 'vue';

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongAprilFoolStats({
  songsForStats,
  getAprilFoolCharacterIcon
}) {
const parseAprilFoolYear = (typeRaw) => {
  const match = normalizeCategoryKey(typeRaw).match(/^april_fool_(\d{4})$/);
  return match ? match[1] : '';
};

const aprilFoolSongStatsByYear = computed(() => {
  const yearMap = new Map();

  songsForStats.value.forEach((song) => {
    song.vocals.forEach((vocal) => {
      const year = parseAprilFoolYear(vocal?.type);
      if (!year) return;
      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }

      const songKey = `${song.id}-${song.title || ''}`;
      const songMap = yearMap.get(year);
      if (!songMap.has(songKey)) {
        songMap.set(songKey, {
          id: song.id,
          title: song.title || '-',
          jacketUrl: song.jacketUrl || '',
          vocalIcons: new Map()
        });
      }

      const row = songMap.get(songKey);
      asArray(vocal?.characters).forEach((rawName) => {
        const icon = getAprilFoolCharacterIcon(rawName);
        if (!icon.icon) return;
        if (!row.vocalIcons.has(icon.name)) {
          row.vocalIcons.set(icon.name, icon);
        }
      });
    });
  });

  return Array.from(yearMap.entries())
    .sort(([yearA], [yearB]) => Number(yearA) - Number(yearB))
    .map(([year, songMap]) => {
      const songs = Array.from(songMap.values())
        .map((song) => ({
          ...song,
          vocalIcons: Array.from(song.vocalIcons.values())
        }))
        .sort((a, b) => normalizeSongId(a.id) - normalizeSongId(b.id));
      return { year, songs };
    });
});

return { parseAprilFoolYear, aprilFoolSongStatsByYear };
}
