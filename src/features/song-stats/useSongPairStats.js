import { ref, computed, watch, nextTick } from 'vue';
import { buildSongPairVocalIndex } from '../../domain/songPairVocalIndex.js';
import { OC_UNIT_KEYS, OC_UNIT_OPTIONS } from './songDisplayConstants.js';
import { formatSongShortDate, hasSong2DMVCategory, hasSong3DMVCategory, normalizeSongId, hexToRgba } from './songFormatters.js';

/** Per-instance state owned by SongPairStats. */
export function createSongPairStatsState() {
const duoCardExpandedMap = ref({});

const duoImageMode = ref(false);
return { duoCardExpandedMap, duoImageMode };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongPairStats({
  duoCardExpandedMap,
  duoImageMode,
  withInteractionPinnedPosition,
  songsForStats,
  getKnownCharacters,
  charactersByUnit,
  buildVsIconsFromNames,
  getCharacterColor,
  unitColorMap,
  duoPairGridColumnMap,
  scheduleRecalcDuoPairGridColumns,
  scheduleRecalcDuoNameCompact
}) {
const onDuoImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    duoImageMode.value = checked;
  }, anchorEl);
};

const songPairVocalsByMemberKey = computed(() => buildSongPairVocalIndex(songsForStats.value, OC_UNIT_KEYS, getKnownCharacters));

const sameUnitPairUnitCardsRaw = computed(() => {
  return OC_UNIT_OPTIONS.map((unitOption) => {
    const unitKey = unitOption.key;
    const pairs = [];
    const members = (charactersByUnit.value[unitKey] || []).slice().sort((a, b) => a.order - b.order);

    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const memberA = members[i];
        const memberB = members[j];
        const pairNames = [memberA.name, memberB.name].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
        const songMap = new Map();

        const pairVocals = songPairVocalsByMemberKey.value.get(JSON.stringify([unitKey, ...pairNames]));
        pairVocals?.forEach(({ song, vsNames }) => {
          songMap.set(`${song.id}-${song.title}`, {
            id: song.id,
            title: song.title || '-',
            jacketUrl: song.jacketUrl || '',
            releaseDateText: song.releaseDateText || formatSongShortDate(song.releaseDate),
            vsIcons: buildVsIconsFromNames(vsNames),
            has2d: hasSong2DMVCategory(song),
            has3d: hasSong3DMVCategory(song)
          });
        });

        if (songMap.size === 0) continue;

        pairs.push({
          key: `${unitKey}-${memberA.name}-${memberB.name}`,
          memberA,
          memberB,
          count: songMap.size,
          songs: Array.from(songMap.values()).sort((a, b) => normalizeSongId(a.id) - normalizeSongId(b.id)),
          gradientBg: `linear-gradient(90deg, ${hexToRgba(getCharacterColor(memberA.name), 0.26)} 0%, ${hexToRgba(getCharacterColor(memberB.name), 0.26)} 100%)`
        });
      }
    }

    pairs.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const aFirst = Math.min(a.memberA.order, a.memberB.order);
      const bFirst = Math.min(b.memberA.order, b.memberB.order);
      if (aFirst !== bFirst) return aFirst - bFirst;
      const aSecond = Math.max(a.memberA.order, a.memberB.order);
      const bSecond = Math.max(b.memberA.order, b.memberB.order);
      return aSecond - bSecond;
    });

    return {
      unit: unitKey,
      tint: hexToRgba(unitColorMap.value[unitKey] || '#94a3b8', 0.14),
      pairs
    };
  });
});

const sameUnitPairUnitCards = computed(() => {
  return sameUnitPairUnitCardsRaw.value
    .filter((unitCard) => unitCard.pairs.length > 0)
    .map((unitCard) => {
      const unit = unitCard.unit;
      const gridColumns = duoPairGridColumnMap.value[unit] || 0;
      return {
        ...unitCard,
        anchorId: `panel-duo-unit-${unit}`,
        isWsSplit: unit === 'ws' && unitCard.pairs.length === 6 && gridColumns >= 4
      };
    });
});

const isDuoCardExpanded = (key) => duoCardExpandedMap.value[key] !== false;

const duoGlobalToggleLabel = computed(() => {
  const keys = sameUnitPairUnitCards.value.flatMap((unitCard) => unitCard.pairs.map((pair) => pair.key));
  if (keys.length === 0) return '展开全部';
  const allCollapsed = keys.every((key) => !isDuoCardExpanded(key));
  return allCollapsed ? '展开全部' : '收起全部';
});

const toggleAllDuoExpandCollapse = () => {
  const keys = sameUnitPairUnitCards.value.flatMap((unitCard) => unitCard.pairs.map((pair) => pair.key));
  if (keys.length === 0) return;
  void withInteractionPinnedPosition(() => {
    const shouldExpandAll = keys.every((key) => !isDuoCardExpanded(key));
    const next = {};
    keys.forEach((key) => {
      next[key] = shouldExpandAll;
    });
    duoCardExpandedMap.value = next;
  });
};

const toggleDuoCardExpandCollapse = (key) => {
  void withInteractionPinnedPosition(() => {
    duoCardExpandedMap.value = {
      ...duoCardExpandedMap.value,
      [key]: !isDuoCardExpanded(key)
    };
  });
};

const snapshotDuoExpandedMap = () => ({ ...duoCardExpandedMap.value });

const expandAllDuoCardsForExport = () => {
  const next = { ...duoCardExpandedMap.value };
  sameUnitPairUnitCards.value.forEach((unitCard) => {
    unitCard.pairs.forEach((pair) => {
      next[pair.key] = true;
    });
  });
  duoCardExpandedMap.value = next;
};

const connectSongPairStatsEffects = () => {
watch(sameUnitPairUnitCards, (unitCards) => {
  const next = {};
  unitCards.forEach((unitCard) => {
    unitCard.pairs.forEach((pair) => {
      next[pair.key] = duoCardExpandedMap.value[pair.key] !== false;
    });
  });
  duoCardExpandedMap.value = next;
  nextTick(() => {
    scheduleRecalcDuoPairGridColumns();
    scheduleRecalcDuoNameCompact();
  });
}, { immediate: true });
};

return { onDuoImageModeChange, songPairVocalsByMemberKey, sameUnitPairUnitCardsRaw, sameUnitPairUnitCards, isDuoCardExpanded, duoGlobalToggleLabel, toggleAllDuoExpandCollapse, toggleDuoCardExpandCollapse, snapshotDuoExpandedMap, expandAllDuoCardsForExport, connectSongPairStatsEffects };
}
