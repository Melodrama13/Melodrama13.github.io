import { ref } from 'vue';
import { toFiniteSongId, getScrollContainer, buildSongDifficultyToastItems, formatSongToastDate } from './songFormatters.js';

/** Per-instance state owned by SongMedia. */
export function createSongMediaState() {
const songImageTitleToast = ref(null);

const songImageTitleToastTimer = ref(0);
return { songImageTitleToast, songImageTitleToastTimer };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongMedia({
  songImageTitleToast,
  songImageTitleToastTimer,
  songsById,
  songStatsRootRef
}) {
const onSongJacketError = (event) => {
  const img = event?.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.failed === '1') return;
  img.dataset.loaded = '1';
  img.dataset.failed = '1';
  img.style.visibility = 'hidden';
  const holder = img.closest('.song-jacket-media');
  if (holder instanceof HTMLElement) {
    holder.classList.add('is-failed');
  }
};

const onSongJacketLoad = (event) => {
  const img = event?.target;
  if (!(img instanceof HTMLImageElement)) return;
  img.dataset.loaded = '1';
  delete img.dataset.failed;
  img.style.visibility = '';
  img.style.display = '';
  const holder = img.closest('.song-jacket-media');
  if (holder instanceof HTMLElement) {
    holder.classList.remove('is-failed');
  }
};

const closeSongImageTitleToast = () => {
  songImageTitleToast.value = null;
  if (songImageTitleToastTimer.value) {
    clearTimeout(songImageTitleToastTimer.value);
    songImageTitleToastTimer.value = 0;
  }
};

const clearSongImageTitleToast = (event = null) => {
  if (event?.type === 'mouseleave' && songImageTitleToast.value?.pinned) return;
  closeSongImageTitleToast();
};

const handleDocumentPointerDownForSongToast = (event) => {
  if (!songImageTitleToast.value) return;
  const target = event?.target;
  if (target instanceof Element && target.closest('.song-jacket-media, .song-image-jacket-tile')) return;
  closeSongImageTitleToast();
};

const handleDocumentKeydownForSongToast = (event) => {
  if (event.defaultPrevented || event.key !== 'Escape' || !songImageTitleToast.value) return;
  closeSongImageTitleToast();
  event.preventDefault();
};

const showSongImageTitle = (event, rawTitle, options = {}) => {
  const songId = toFiniteSongId(options?.songId);
  const song = songId === null ? null : songsById.value.get(songId);
  const nextTitle = String(song?.title || rawTitle || '').trim() || '-';
  const idText = songId === null ? String(song?.id || '-').trim() || '-' : String(songId);
  const compact = options?.compact === true;
  const isHoverOpen = event?.type === 'mouseenter';
  const isClickOpen = event?.type === 'click';
  const toastKey = `${compact ? 'compact' : 'full'}::${songId === null ? '' : songId}::${nextTitle}`;
  if (isHoverOpen && songImageTitleToast.value?.pinned) return;
  if (isClickOpen && songImageTitleToast.value?.pinned && songImageTitleToast.value?.key === toastKey) {
    closeSongImageTitleToast();
    return;
  }
  const targetEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  const statsMain = songStatsRootRef.value instanceof HTMLElement
    ? songStatsRootRef.value.querySelector('.stats-main')
    : null;
  const statsRect = statsMain instanceof HTMLElement ? statsMain.getBoundingClientRect() : null;
  const host = typeof document !== 'undefined' ? getScrollContainer() : null;
  const hostRect = host instanceof HTMLElement ? host.getBoundingClientRect() : null;
  const viewportWidth = hostRect?.width || (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const viewportHeight = hostRect?.height || (typeof window !== 'undefined' ? window.innerHeight : 720);
  const estimatedWidth = compact
    ? Math.min(360, Math.max(180, Math.ceil(nextTitle.length * 12) + 58))
    : Math.min(360, Math.max(260, Math.ceil(nextTitle.length * 9) + 72));
  const estimatedHeight = compact ? 34 : 230;

  let left = Math.max(8, Math.floor((viewportWidth - estimatedWidth) / 2));
  let top = Math.max(8, viewportHeight - estimatedHeight - 20);

  if (targetEl && statsRect) {
    const rect = targetEl.getBoundingClientRect();
    const visibleLeft = Math.max(8, (hostRect ? hostRect.left : 0) - statsRect.left + 8);
    const visibleRight = Math.min(statsRect.width - 8, visibleLeft + viewportWidth - 16);
    const visibleTop = Math.max((hostRect ? hostRect.top : 0) - statsRect.top + 8, 58 - statsRect.top);
    const visibleBottom = visibleTop + viewportHeight - 16;
    const targetLeft = rect.left - statsRect.left;
    const targetRight = rect.right - statsRect.left;
    const targetTop = rect.top - statsRect.top;
    const targetBottom = rect.bottom - statsRect.top;
    const preferRightLeft = targetRight + 10;
    const preferLeftLeft = targetLeft - estimatedWidth - 10;
    left = preferRightLeft + estimatedWidth <= visibleRight
      ? preferRightLeft
      : Math.max(visibleLeft, preferLeftLeft);
    top = targetTop + rect.height / 2 - estimatedHeight / 2;
    if (top < visibleTop) top = targetBottom + 10;
    if (top + estimatedHeight > visibleBottom && targetTop - estimatedHeight - 10 >= visibleTop) {
      top = targetTop - estimatedHeight - 10;
    }
    left = Math.max(visibleLeft, Math.min(visibleRight - estimatedWidth, left));
    top = Math.max(visibleTop, Math.min(visibleBottom - estimatedHeight, top));
  } else {
    left = Math.max(8, Math.min(viewportWidth - estimatedWidth - 8, left));
    top = Math.max(8, Math.min(viewportHeight - estimatedHeight - 8, top));
  }

  songImageTitleToast.value = {
    key: toastKey,
    pinned: isClickOpen,
    compact,
    idText,
    title: nextTitle,
    difficulties: song ? buildSongDifficultyToastItems(song) : [],
    mvTags: Array.isArray(song?.mvTags) ? song.mvTags : [],
    groupTags: Array.isArray(song?.groupTags) ? song.groupTags : [],
    releaseDate: formatSongToastDate(options?.releaseDate ?? song?.releaseDate),
    composer: String(song?.composer || '').trim(),
    lyricist: String(song?.lyricist || '').trim(),
    arranger: String(song?.arranger || '').trim(),
    left: Math.round(left),
    top: Math.round(top)
  };
  if (songImageTitleToastTimer.value) {
    clearTimeout(songImageTitleToastTimer.value);
    songImageTitleToastTimer.value = 0;
  }
  if (!isHoverOpen && !isClickOpen) {
    songImageTitleToastTimer.value = setTimeout(() => {
      songImageTitleToast.value = null;
      songImageTitleToastTimer.value = 0;
    }, compact ? 1600 : 2800);
  }
};

return { onSongJacketError, onSongJacketLoad, closeSongImageTitleToast, clearSongImageTitleToast, handleDocumentPointerDownForSongToast, handleDocumentKeydownForSongToast, showSongImageTitle };
}
