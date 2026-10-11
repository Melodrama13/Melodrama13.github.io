import { ref, computed } from 'vue';
import { normalizeCategoryKey, normalizeSongId, formatSongShortDate, mixHexWithWhite, hasSong3DMVCategory, hasSong2DMVCategory } from './songFormatters.js';
import { OC_UNIT_KEYS, OC_UNIT_OPTIONS, BASE_UNIT_COLOR_MAP } from './songDisplayConstants.js';

/** Per-instance state owned by SongMvStats. */
export function createSongMvStatsState() {
const threeDmvImageMode = ref(false);

const twoDmvImageMode = ref(false);

const threeDmvCoverOnly = ref(false);

const twoDmvCoverOnly = ref(false);
return { threeDmvImageMode, twoDmvImageMode, threeDmvCoverOnly, twoDmvCoverOnly };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongMvStats({
  threeDmvImageMode,
  twoDmvImageMode,
  threeDmvCoverOnly,
  twoDmvCoverOnly,
  withInteractionPinnedPosition,
  getKnownCharacters,
  buildVsIconsFromNames,
  songsForStats,
  isCoreUniqueSongForUnit,
  VS_NAMES,
  getCharacterAvatarSrc,
  getCharacterColor,
  unitColorMap,
  makeThreeDmvUnitNavAnchorId,
  makeTwoDmvUnitNavAnchorId
}) {
const onThreeDmvImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    threeDmvImageMode.value = checked;
    twoDmvImageMode.value = checked;
  }, anchorEl);
};

const onTwoDmvImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    twoDmvImageMode.value = checked;
    threeDmvImageMode.value = checked;
  }, anchorEl);
};

const onThreeDmvCoverOnlyChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    threeDmvCoverOnly.value = checked;
    twoDmvCoverOnly.value = checked;
  }, anchorEl);
};

const onTwoDmvCoverOnlyChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    twoDmvCoverOnly.value = checked;
    threeDmvCoverOnly.value = checked;
  }, anchorEl);
};

const buildThreeDmvVocalMatch = (song, unitKey) => {
  const candidates = [];
  song.vocals.forEach((vocal) => {
    if (normalizeCategoryKey(vocal?.type) !== 'sekai') return;
    const vocalChars = getKnownCharacters(vocal?.characters);
    const ocChars = vocalChars
      .filter((char) => OC_UNIT_KEYS.includes(char.unit))
      .sort((a, b) => a.order - b.order);
    if (ocChars.length === 0) return;
    if (!ocChars.every((char) => char.unit === unitKey)) return;

    const vsChars = vocalChars
      .filter((char) => char.unit === 'vs')
      .sort((a, b) => a.order - b.order);
    const vocalSortId = normalizeSongId(vocal?.vocal_id);
    const totalVocalCount = ocChars.length + vsChars.length;
    candidates.push({
      vocalSortId,
      totalVocalCount,
      vocalIcons: buildVsIconsFromNames([...ocChars, ...vsChars].map((char) => char.name)),
      vsIcons: buildVsIconsFromNames(vsChars.map((char) => char.name))
    });
  });

  candidates.sort((a, b) => {
    const aFull = a.totalVocalCount >= 5 ? 1 : 0;
    const bFull = b.totalVocalCount >= 5 ? 1 : 0;
    if (aFull !== bFull) return bFull - aFull;
    if (a.totalVocalCount !== b.totalVocalCount) return b.totalVocalCount - a.totalVocalCount;
    if (a.vsIcons.length !== b.vsIcons.length) return b.vsIcons.length - a.vsIcons.length;
    return a.vocalSortId - b.vocalSortId;
  });

  return candidates[0] || null;
};

const buildDetailMvStatsByUnit = ({ hasMv, makeAnchorId, forceFullUnit = '', coverOnly = false }) => {
  return OC_UNIT_OPTIONS.map((unitOption) => {
    const unitKey = unitOption.key;
    const songs = songsForStats.value
      .filter((song) => isCoreUniqueSongForUnit(song, unitKey) && hasMv(song) && (!coverOnly || song.isNewlyWrittenMusic === false))
      .map((song) => {
        const vocalMatch = buildThreeDmvVocalMatch(song, unitKey);
        if (!vocalMatch) return null;
        return {
          id: song.id,
          title: song.title || '-',
          jacketUrl: song.jacketUrl || '',
          releaseDateText: song.releaseDateText || formatSongShortDate(song.releaseDate),
          vocalCount: vocalMatch.totalVocalCount,
          vocalIcons: vocalMatch.vocalIcons,
          vsIcons: vocalMatch.vsIcons,
          groupKind: forceFullUnit === unitKey || vocalMatch.totalVocalCount >= 5 ? 'full' : 'small'
        };
      })
      .filter(Boolean)
      .sort((a, b) => normalizeSongId(a.id) - normalizeSongId(b.id));

    const smallSongs = songs.filter((song) => song.groupKind !== 'full');
    const fullSongs = songs.filter((song) => song.groupKind === 'full');
    smallSongs.sort((a, b) => {
      if (a.vocalCount !== b.vocalCount) return a.vocalCount - b.vocalCount;
      return normalizeSongId(a.id) - normalizeSongId(b.id);
    });
    fullSongs.sort((a, b) => normalizeSongId(a.id) - normalizeSongId(b.id));

    const vsCounts = new Map(VS_NAMES.value.map((name) => [name, 0]));
    songs.forEach((song) => {
      const seen = new Set();
      (song.vsIcons || []).forEach((icon) => {
        const name = String(icon?.name || '').trim();
        if (!name || seen.has(name) || !vsCounts.has(name)) return;
        seen.add(name);
        vsCounts.set(name, (vsCounts.get(name) || 0) + 1);
      });
    });
    const vsStats = VS_NAMES.value.map((name) => ({
      name,
      icon: getCharacterAvatarSrc(name),
      color: getCharacterColor(name),
      count: vsCounts.get(name) || 0
    }));

    return {
      unit: unitKey,
      label: unitOption.label,
      anchorId: makeAnchorId(unitKey),
      tint: mixHexWithWhite(unitColorMap.value[unitKey] || BASE_UNIT_COLOR_MAP[unitKey] || '#cbd5e1', 0.17),
      smallSongs,
      fullSongs,
      vsStats,
      total: songs.length
    };
  }).filter((unitCard) => unitCard.total > 0);
};

const threeDmvStatsByUnit = computed(() => buildDetailMvStatsByUnit({
  hasMv: hasSong3DMVCategory,
  makeAnchorId: makeThreeDmvUnitNavAnchorId,
  forceFullUnit: 'ln',
  coverOnly: threeDmvCoverOnly.value
}));

const twoDmvStatsByUnit = computed(() => buildDetailMvStatsByUnit({
  hasMv: hasSong2DMVCategory,
  makeAnchorId: makeTwoDmvUnitNavAnchorId,
  coverOnly: twoDmvCoverOnly.value
}));

return { onThreeDmvImageModeChange, onTwoDmvImageModeChange, onThreeDmvCoverOnlyChange, onTwoDmvCoverOnlyChange, buildThreeDmvVocalMatch, buildDetailMvStatsByUnit, threeDmvStatsByUnit, twoDmvStatsByUnit };
}
