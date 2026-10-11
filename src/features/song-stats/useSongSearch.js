import { ref, computed, watch, nextTick } from 'vue';
import { normalizeSearchText, normalizeSearchHiragana, normalizeSearchRomaji, isSongDifficultyMissing, normalizeSongId } from './songFormatters.js';

/** Per-instance state owned by SongSearch. */
export function createSongSearchState() {
const keyword = ref('');

const mvFilter = ref('all');

const groupFilter = ref('all');

const difficultySortKey = ref('');

const difficultySortMode = ref('none');

const currentSongPage = ref(1);

const songPageSize = ref(10);

const songListWrapRef = ref(null);

const isSongTableOverflowing = ref(false);

const songTableResizeObserver = ref(null);
return { keyword, mvFilter, groupFilter, difficultySortKey, difficultySortMode, currentSongPage, songPageSize, songListWrapRef, isSongTableOverflowing, songTableResizeObserver };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongSearch({
  keyword,
  mvFilter,
  groupFilter,
  difficultySortKey,
  difficultySortMode,
  currentSongPage,
  songPageSize,
  songListWrapRef,
  isSongTableOverflowing,
  songTableResizeObserver,
  withInteractionPinnedPosition,
  songs
}) {
const difficultySortModeIconSrc = computed(() => {
  if (difficultySortMode.value === 'desc') return '/data/icon/circle_arrow_down.png';
  if (difficultySortMode.value === 'asc') return '/data/icon/circle_arrow_up.png';
  return '/data/icon/circle_arrow_up_down.png';
});

const difficultySortModeTitle = computed(() => {
  if (!difficultySortKey.value) {
    if (difficultySortMode.value === 'desc') return '当前：ID高到低（点击切到ID低到高）';
    if (difficultySortMode.value === 'asc') return '当前：ID低到高（点击切到默认）';
    return '当前：ID排序（点击切到ID高到低）';
  }
  if (difficultySortMode.value === 'desc') return '当前：高到低（点击切到低到高）';
  if (difficultySortMode.value === 'asc') return '当前：低到高（点击切到ID排序）';
  return '当前：ID排序（点击切到高到低）';
});

const cycleDifficultySortMode = (event) => {
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  void withInteractionPinnedPosition(() => {
    if (difficultySortMode.value === 'none') {
      difficultySortMode.value = 'desc';
      return;
    }
    if (difficultySortMode.value === 'desc') {
      difficultySortMode.value = 'asc';
      return;
    }
    difficultySortMode.value = 'none';
  }, anchorEl);
};

const backToSongHome = (event = null) => {
  if (currentSongPage.value <= 1) return;
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  void withInteractionPinnedPosition(() => {
    currentSongPage.value = 1;
  }, anchorEl);
};

const recalcSongTableOverflow = () => {
  const wrap = songListWrapRef.value;
  if (!(wrap instanceof HTMLElement)) {
    isSongTableOverflowing.value = false;
    return;
  }
  isSongTableOverflowing.value = wrap.scrollWidth - wrap.clientWidth > 1;
};

const filteredSongs = computed(() => {
  const rawKeyword = String(keyword.value || '').trim();
  const key = normalizeSearchText(rawKeyword);
  const keyHiragana = normalizeSearchHiragana(rawKeyword);
  const keyRomaji = normalizeSearchRomaji(rawKeyword);
  const isIdSearch = key.startsWith('#');
  const idQuery = isIdSearch ? key.slice(1).trim() : '';
  const mv = mvFilter.value;
  const group = groupFilter.value;
  const sortKey = difficultySortKey.value;
  const sortMode = difficultySortMode.value;

  const filtered = songs.value.filter((song) => {
    let textHit = false;
    if (!key) {
      textHit = true;
    } else if (isIdSearch) {
      textHit = idQuery ? String(song.id).toLowerCase().includes(idQuery) : true;
    } else {
      textHit = song.searchTitle.includes(key)
        || song.searchComposer.includes(key)
        || song.searchLyricist.includes(key)
        || song.searchArranger.includes(key)
        || (keyHiragana && song.pronunciationHiragana.includes(keyHiragana))
        || (keyRomaji && song.pronunciationRomaji.includes(keyRomaji));
    }
    if (!textHit) return false;

    if (mv === '3d' && !song.categoryKeys.includes('3dmv')) return false;
    if (mv === '2d' && !song.categoryKeys.includes('2dmv') && !song.categoryKeys.includes('vs_2dmv')) return false;
    if (mv === 'vs2d' && !song.categoryKeys.includes('vs_2dmv')) return false;
    if (mv === 'original' && !song.categoryKeys.includes('original')) return false;

    if (sortKey === 'append' && isSongDifficultyMissing(song, 'append')) return false;

    if (group !== 'all' && !song.groupKeys.includes(group)) return false;
    return true;
  });

  if (!sortKey) {
    if (sortMode === 'desc') {
      return [...filtered].sort((a, b) => normalizeSongId(b.id) - normalizeSongId(a.id));
    }
    return [...filtered].sort((a, b) => normalizeSongId(a.id) - normalizeSongId(b.id));
  }

  if (sortMode === 'none') {
    return [...filtered].sort((a, b) => normalizeSongId(a.id) - normalizeSongId(b.id));
  }

  return [...filtered].sort((a, b) => {
    const rawA = a?.difficulties?.[sortKey];
    const rawB = b?.difficulties?.[sortKey];
    const diffA = rawA === null || rawA === undefined || rawA === '' ? null : Number(rawA);
    const diffB = rawB === null || rawB === undefined || rawB === '' ? null : Number(rawB);
    const hasA = Number.isFinite(diffA);
    const hasB = Number.isFinite(diffB);

    if (!hasA && !hasB) {
      return normalizeSongId(a.id) - normalizeSongId(b.id);
    }
    if (!hasA) return 1;
    if (!hasB) return -1;

    if (diffA !== diffB) {
      return sortMode === 'asc' ? diffA - diffB : diffB - diffA;
    }

    return normalizeSongId(a.id) - normalizeSongId(b.id);
  });
});

const totalSongPages = computed(() => {
  return Math.max(1, Math.ceil(filteredSongs.value.length / songPageSize.value));
});

const pagedSongs = computed(() => {
  const page = Math.min(Math.max(1, currentSongPage.value), totalSongPages.value);
  const start = (page - 1) * songPageSize.value;
  return filteredSongs.value.slice(start, start + songPageSize.value);
});

const emptyPagedRowCount = computed(() => {
  if (filteredSongs.value.length === 0) return 0;
  return Math.max(0, songPageSize.value - pagedSongs.value.length);
});

const changeSongPage = (delta, event = null) => {
  const next = currentSongPage.value + delta;
  if (next < 1 || next > totalSongPages.value) return;
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  void withInteractionPinnedPosition(() => {
    currentSongPage.value = next;
  }, anchorEl);
};

const connectSongSearchEffects = () => {
watch([keyword, mvFilter, groupFilter, difficultySortKey, difficultySortMode], () => {
  currentSongPage.value = 1;
});

watch(difficultySortKey, (nextKey) => {
  if (!nextKey) {
    difficultySortMode.value = 'none';
  }
});

watch(songPageSize, () => {
  currentSongPage.value = 1;
});

watch([songPageSize, filteredSongs], async () => {
  await nextTick();
  recalcSongTableOverflow();
}, { deep: false });

watch(totalSongPages, (nextTotal) => {
  if (currentSongPage.value > nextTotal) {
    currentSongPage.value = nextTotal;
  }
});
};

return { difficultySortModeIconSrc, difficultySortModeTitle, cycleDifficultySortMode, backToSongHome, recalcSongTableOverflow, filteredSongs, totalSongPages, pagedSongs, emptyPagedRowCount, changeSongPage, connectSongSearchEffects };
}
