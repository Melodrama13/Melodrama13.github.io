import { ref, computed, watch, nextTick } from 'vue';
import { isViewportAbove, UI_BREAKPOINTS } from '../../ui/breakpoints.js';
import { hasSong3DMVCategory, hasSong2DMVCategory, normalizeCategoryKey, normalizeSongId, parseSlashDateOrder, formatSongShortDate, hexToRgba } from './songFormatters.js';
import { SONG_STAT_CARD_TINT_ALPHA } from './songDisplayConstants.js';

/** Per-instance state owned by SongAnotherVocal. */
export function createSongAnotherVocalState() {
const anotherCardModeMap = ref({});

const anotherImageMode = ref(false);

const anvoFillDisplay = ref(false);

const anvoCoverOnly = ref(false);

const anvoThreeDOnly = ref(false);

const anvoTwoDOnly = ref(false);

const anvoFillContentWidth = ref(0);
return { anotherCardModeMap, anotherImageMode, anvoFillDisplay, anvoCoverOnly, anvoThreeDOnly, anvoTwoDOnly, anvoFillContentWidth };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongAnotherVocal({
  anotherCardModeMap,
  anotherImageMode,
  anvoFillDisplay,
  anvoCoverOnly,
  anvoThreeDOnly,
  anvoTwoDOnly,
  anvoFillContentWidth,
  withInteractionPinnedPosition,
  viewportWidth,
  navCollapsed,
  songsForStats,
  getKnownCharacters,
  getCharacterAvatarSrc,
  getAnotherCharacterSortOrder,
  scheduleRecalcDuoPairGridColumns,
  scheduleRecalcDuoNameCompact,
  viewportHeight
}) {
const onAnotherImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    anotherImageMode.value = checked;
    if (!checked) {
      anvoFillDisplay.value = false;
    }
  }, anchorEl);
};

const canShowAnvoFillToggle = computed(() => (
  anotherImageMode.value && isViewportAbove(viewportWidth.value, UI_BREAKPOINTS.tabletMax)
));

const isAnvoFillModeActive = computed(() => anvoFillDisplay.value && canShowAnvoFillToggle.value);

const anvoMaxSongCount = computed(() => {
  return anotherVocalCards.value.reduce((max, row) => Math.max(max, Array.isArray(row?.songs) ? row.songs.length : 0), 0);
});

const getAnvoFillMetricsForWidth = (width) => {
  const maxSongCount = Math.max(1, anvoMaxSongCount.value);
  const columnCount = Math.max(1, anotherVocalCards.value.length);
  const fitWidth = Math.max(320, Number(width) || 0);
  const columnGap = columnCount >= 24 ? 1 : 2;
  const gapTotal = columnGap * Math.max(0, columnCount - 1);
  const columnWidth = Math.max(1, (fitWidth - gapTotal) / columnCount);
  const columnPadding = columnCount >= 24 ? 2 : 3;
  const rowGap = maxSongCount >= 30 ? 0 : 1;
  const size = Math.max(10, Math.min(82, columnWidth - columnPadding * 2));
  const dateHeight = Math.max(7, Math.min(10, size * 0.22));
  return { size, gap: rowGap, columnGap, columnPadding, dateHeight, columnWidth, columnCount };
};

const getAnvoFillExportWidth = () => {
  const columnCount = Math.max(1, anotherVocalCards.value.length);
  return Math.max(1280, Math.min(1920, Math.ceil(columnCount * 56)));
};

const updateAnvoFillContentWidth = () => {
  if (typeof document === 'undefined') return;
  if (!isAnvoFillModeActive.value) {
    anvoFillContentWidth.value = 0;
    return;
  }
  const grid = document.querySelector('#panel-another-vocal .song-role-card-grid');
  if (!(grid instanceof HTMLElement)) {
    anvoFillContentWidth.value = 0;
    return;
  }
  const width = Math.floor(grid.clientWidth || grid.getBoundingClientRect().width || 0);
  anvoFillContentWidth.value = width > 0 ? Math.max(180, width - 2) : 0;
};

const anvoFillMetrics = computed(() => {
  const measuredContentWidth = Number(anvoFillContentWidth.value || 0);
  const available = Math.max(320, viewportWidth.value - 218);
  const fitWidth = measuredContentWidth > 0 ? measuredContentWidth : available;
  return getAnvoFillMetricsForWidth(fitWidth);
});

const songStatsRootStyle = computed(() => {
  if (!isAnvoFillModeActive.value) return {};
  return {
    '--song-anvo-fill-jacket-size': `${anvoFillMetrics.value.size.toFixed(2)}px`,
    '--song-anvo-fill-gap': `${anvoFillMetrics.value.gap.toFixed(2)}px`,
    '--song-anvo-fill-column-gap': `${anvoFillMetrics.value.columnGap.toFixed(2)}px`,
    '--song-anvo-fill-column-padding': `${anvoFillMetrics.value.columnPadding.toFixed(2)}px`,
    '--song-anvo-fill-date-height': `${anvoFillMetrics.value.dateHeight.toFixed(2)}px`,
    '--song-anvo-fill-column-width': `${anvoFillMetrics.value.columnWidth.toFixed(2)}px`,
    '--song-anvo-fill-column-count': `${anvoFillMetrics.value.columnCount}`
  };
});

const onAnvoFillDisplayChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    anvoFillDisplay.value = checked;
    if (checked) {
      navCollapsed.value = true;
    }
  }, anchorEl);
};

const anotherVocalCards = computed(() => {
  const rowMap = new Map();

  songsForStats.value.filter((song) => [
    [anvoCoverOnly.value, song.isNewlyWrittenMusic === false],
    [anvoThreeDOnly.value, hasSong3DMVCategory(song)],
    [anvoTwoDOnly.value, hasSong2DMVCategory(song)]
  ].every(([selected, matched]) => !selected || matched)).forEach((song) => {
    song.vocals.forEach((vocal) => {
      if (normalizeCategoryKey(vocal?.type) !== 'another_vocal') return;
      const vocalId = normalizeSongId(vocal?.vocal_id);
      const releasedAt = String(vocal?.released_at || '').trim();
      const releasedAtOrder = parseSlashDateOrder(releasedAt);

      getKnownCharacters(vocal?.characters).forEach((charMeta) => {
        if (!rowMap.has(charMeta.name)) {
          rowMap.set(charMeta.name, { meta: charMeta, songs: new Map() });
        }

        const row = rowMap.get(charMeta.name);
        const songKey = `${song.id}-${song.title}`;
        const prev = row.songs.get(songKey);
        if (!prev || releasedAtOrder < prev.releasedAtOrder || (releasedAtOrder === prev.releasedAtOrder && vocalId < prev.vocalId)) {
          row.songs.set(songKey, {
            id: song.id,
            title: song.title || '-',
            jacketUrl: String(song.jacketUrl || '').trim(),
            vocalId,
            releasedAt,
            releasedAtText: formatSongShortDate(releasedAt),
            releasedAtOrder,
            isDeletedSong: song.isDeletedSong
          });
        }
      });
    });
  });

  return Array.from(rowMap.values())
    .map((row) => {
      const songsList = Array.from(row.songs.values()).sort((a, b) => {
        if (a.releasedAtOrder !== b.releasedAtOrder) return a.releasedAtOrder - b.releasedAtOrder;
        if (a.vocalId !== b.vocalId) return a.vocalId - b.vocalId;
        return normalizeSongId(a.id) - normalizeSongId(b.id);
      });
      return {
        name: row.meta.name,
        unit: row.meta.unit,
        order: row.meta.order,
        avatar: getCharacterAvatarSrc(row.meta.name),
        tint: hexToRgba(row.meta.color, SONG_STAT_CARD_TINT_ALPHA),
        count: songsList.length,
        songs: songsList
      };
    })
    .sort((a, b) => {
      const aOrder = getAnotherCharacterSortOrder(a);
      const bOrder = getAnotherCharacterSortOrder(b);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
});

const getAnotherCardMode = (name) => anotherCardModeMap.value[name] || 'fixed';

const anotherGlobalToggleLabel = computed(() => {
  const cards = anotherVocalCards.value;
  if (cards.length === 0) return '展开全部';
  const allCollapsedOrFixed = cards.every((card) => {
    const mode = getAnotherCardMode(card.name);
    return mode === 'collapsed' || mode === 'fixed';
  });
  return allCollapsedOrFixed ? '展开全部' : '收起全部';
});

const anotherAllFixed = computed(() => {
  const cards = anotherVocalCards.value;
  if (cards.length === 0) return false;
  return cards.every((card) => getAnotherCardMode(card.name) === 'fixed');
});

const toggleAllAnotherExpandCollapse = () => {
  const cards = anotherVocalCards.value;
  if (cards.length === 0) return;
  void withInteractionPinnedPosition(() => {
    const shouldExpandAll = cards.every((card) => {
      const mode = getAnotherCardMode(card.name);
      return mode === 'collapsed' || mode === 'fixed';
    });
    const nextMode = shouldExpandAll ? 'expanded' : 'collapsed';
    const next = {};
    cards.forEach((card) => {
      next[card.name] = nextMode;
    });
    anotherCardModeMap.value = next;
  });
};

const setAllAnotherFixedMode = () => {
  const cards = anotherVocalCards.value;
  if (cards.length === 0) return;
  void withInteractionPinnedPosition(() => {
    const next = {};
    cards.forEach((card) => {
      next[card.name] = 'fixed';
    });
    anotherCardModeMap.value = next;
  });
};

const toggleAnotherCardExpandCollapse = (name) => {
  void withInteractionPinnedPosition(() => {
    const current = getAnotherCardMode(name);
    const nextMode = current === 'collapsed' ? 'expanded' : (current === 'fixed' ? 'expanded' : 'collapsed');
    anotherCardModeMap.value = {
      ...anotherCardModeMap.value,
      [name]: nextMode
    };
  });
};

const getAnotherCardStyle = (row) => {
  return {
    backgroundColor: row?.tint || '#ffffff'
  };
};

const snapshotAnotherCardModes = () => ({ ...anotherCardModeMap.value });

const expandAnotherCardsForExport = (targetName = '') => {
  const next = { ...anotherCardModeMap.value };
  anotherVocalCards.value.forEach((card) => {
    if (!targetName || card.name === targetName) {
      next[card.name] = 'expanded';
    }
  });
  anotherCardModeMap.value = next;
};

const connectSongAnotherVocalEffects = () => {
watch(anotherVocalCards, (cards) => {
  const next = {};
  cards.forEach((card) => {
    next[card.name] = anotherCardModeMap.value[card.name] || 'fixed';
  });
  anotherCardModeMap.value = next;
}, { immediate: true });

watch(navCollapsed, () => {
  if (!navCollapsed.value) {
    anvoFillDisplay.value = false;
  }
  nextTick(() => {
    scheduleRecalcDuoPairGridColumns();
    scheduleRecalcDuoNameCompact();
  });
});

watch(canShowAnvoFillToggle, (canShow) => {
  if (!canShow) {
    anvoFillDisplay.value = false;
  }
});

watch(isAnvoFillModeActive, async (active) => {
  if (!active) {
    anvoFillContentWidth.value = 0;
    return;
  }
  await nextTick();
  updateAnvoFillContentWidth();
  await nextTick();
  updateAnvoFillContentWidth();
});

watch([anotherVocalCards, viewportWidth, viewportHeight], () => {
  nextTick(() => {
    updateAnvoFillContentWidth();
  });
}, { deep: true });
};

return { onAnotherImageModeChange, canShowAnvoFillToggle, isAnvoFillModeActive, anvoMaxSongCount, getAnvoFillMetricsForWidth, getAnvoFillExportWidth, updateAnvoFillContentWidth, anvoFillMetrics, songStatsRootStyle, onAnvoFillDisplayChange, anotherVocalCards, getAnotherCardMode, anotherGlobalToggleLabel, anotherAllFixed, toggleAllAnotherExpandCollapse, setAllAnotherFixedMode, toggleAnotherCardExpandCollapse, getAnotherCardStyle, snapshotAnotherCardModes, expandAnotherCardsForExport, connectSongAnotherVocalEffects };
}
