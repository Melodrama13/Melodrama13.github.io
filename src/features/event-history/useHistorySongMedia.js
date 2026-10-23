import { computed } from 'vue';
import { isSongReleased } from '../../utils/spoilerGuard.js';
import { buildAssetUrl } from '../../utils/assets.js';
import { SONG_LIMITED_GACHA_IDS } from '../../utils/cardLimitedRules.js';

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
const knownSingerNames = computed(() => new Set((ports.props.allCharacters || []).map(character => character.zh_name)));
const isKnownSongSinger = name => knownSingerNames.value.has(String(name || '').trim().split(/\s+/)[0]);

const getSongByEvent = (event) => {
  const id = toFiniteSongId(event?.song_id);
  if (id === null) return null;
  return songsById.value.get(id) || null;
};

const songsByTitle = computed(() => {
  const map = new Map();
  for (const song of songsById.value.values()) {
    const title = String(song.title || '').trim();
    if (title) map.set(title, map.has(title) ? null : song);
  }
  return map;
});

const getCardSong = card => {
  if (![card?.EventID, card?.GachaID].some(id => SONG_LIMITED_GACHA_IDS.has(String(id || '').trim().toLowerCase()))) return null;
  return songsByTitle.value.get(String(card?.CardName || '').trim()) || null;
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

const getReleasedSongVocals = (event) => {
  const now = ports.clock.spoilerNow.value.getTime();
  return (getSongByEvent(event)?.vocals || []).filter(vocal => {
    const match = String(vocal.released_at || '').match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (!match) return true;
    const gate = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) - 8 * 60 * 60 * 1000;
    return gate <= now;
  });
};

return {
  getCardSong,
  getSongByEvent,
  getReleasedSongVocals,
  isKnownSongSinger,
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
