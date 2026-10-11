import { computed } from 'vue';
import { isSongReleased } from '../../utils/spoilerGuard.js';
import { buildAssetUrl } from '../../utils/assets.js';

/** Song Media owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Clock.
 */
export function useHistorySongMedia(ports) {
const toFiniteSongId = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? n : null;
};

const songsById = computed(() => {
  const now = ports.clock.spoilerNow.value;
  const map = new Map();
  (ports.props.allSongs || []).forEach((song) => {
    if (!isSongReleased(song, now)) return;
    const id = toFiniteSongId(song?.id);
    if (id === null) return;
    map.set(id, song);
  });
  return map;
});

const getSongByEvent = (event) => {
  const id = toFiniteSongId(event?.song_id);
  if (id === null) return null;
  return songsById.value.get(id) || null;
};

const getSongCategories = (song) => {
  if (!Array.isArray(song?.categories)) return [];
  return song.categories.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean);
};

const hasSong3DMV = (event) => {
  const song = getSongByEvent(event);
  if (!song) return false;
  const categories = getSongCategories(song);
  return categories.includes('3DMV');
};

const hasSong2DMV = (event) => {
  const song = getSongByEvent(event);
  if (!song) return false;
  const categories = getSongCategories(song);
  return categories.includes('2DMV');
};

const getSongIdText = (event) => {
  const id = toFiniteSongId(event?.song_id);
  return id === null ? '' : String(id);
};

const getSongTooltipImageSrc = (event) => {
  const id = toFiniteSongId(event?.song_id);
  if (id === null) return '';
  return buildAssetUrl(`/songs/song_${String(id).padStart(3, '0')}.webp`);
};

const markMediaImageSettled = (event) => {
  const img = event?.target;
  if (!(img instanceof HTMLImageElement)) return null;
  img.dataset.loaded = '1';
  return img;
};

const onCardTooltipImageLoad = (event) => {
  const img = markMediaImageSettled(event);
  if (!img) return;
  const holder = img.closest('.card-tooltip-jacket-item');
  if (holder instanceof HTMLElement) {
    holder.classList.remove('is-failed');
  }
};

const onSongTooltipImageError = (event) => {
  const img = markMediaImageSettled(event);
  if (!img) return;
  const holder = img.closest('.song-tooltip-jacket-wrap');
  if (holder instanceof HTMLElement) {
    holder.classList.add('is-failed');
  }
};

const onSongTooltipImageLoad = (event) => {
  const img = markMediaImageSettled(event);
  if (!img) return;
  const holder = img.closest('.song-tooltip-jacket-wrap');
  if (holder instanceof HTMLElement) {
    holder.classList.remove('is-failed');
  }
};

const getSongTitleText = (event) => {
  return String(getSongByEvent(event)?.title || '').trim();
};

const normalizeSongCreditText = (value) => {
  const text = String(value || '').trim();
  return text || '-';
};

const getSongComposerText = (event) => {
  return normalizeSongCreditText(getSongByEvent(event)?.composer);
};

const getSongLyricistText = (event) => {
  return normalizeSongCreditText(getSongByEvent(event)?.lyricist);
};

const getSongArrangerText = (event) => {
  return normalizeSongCreditText(getSongByEvent(event)?.arranger);
};

const hasSongTooltip = (event) => {
  return !!getSongByEvent(event);
};


return {
  hasSong3DMV,
  hasSong2DMV,
  getSongIdText,
  getSongTooltipImageSrc,
  onCardTooltipImageLoad,
  onSongTooltipImageError,
  onSongTooltipImageLoad,
  getSongTitleText,
  getSongComposerText,
  getSongLyricistText,
  getSongArrangerText,
  hasSongTooltip,
  markMediaImageSettled,
};
}
