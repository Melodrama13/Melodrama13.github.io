import { computed } from 'vue';
import { isCardImageReleased } from '../../utils/spoilerGuard.js';
import { buildAssetUrl } from '../../utils/assets.js';
import { getCardImageVariants, getCardImageVariantForMode } from '../../utils/cardImageVariants.js';
import { useAppSettings } from '../../services/appSettings.js';

/** Card Media owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Clock, Formatting, Tooltips, SongMedia.
 */
export function useHistoryCardMedia(ports) {
const settings = ports.settings ?? useAppSettings();
const getBirthdayCardImageSrc = (row) => {
  if (!isCardImageReleased({ Date: row?.cardDate || row?.date, Type: 'birthday' }, ports.clock.spoilerNow.value, settings?.allowSpoilers?.value === true)) return '';
  const cardId = ports.formatting.parseCardIdNumber(row?.cardId);
  if (cardId === null) return '';
  const folder = CHAR_CARD_FOLDER_MAP.value[String(row?.name || '').trim()];
  if (!folder) return '';
  return buildAssetUrl(`/cards/${folder}/card${cardId}.webp`);
};

const onBirthdayCardImageError = event => {
  ports.songMedia.markMediaImageSettled(event);
};

const onBirthdayCardImageLoad = event => {
  ports.songMedia.markMediaImageSettled(event);
};

const CHAR_CARD_FOLDER_MAP = computed(() => {
  const map = {};
  (ports.props.allCharacters || []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    const idRaw = Number(char?.id);
    const abbr = String(char?.en_abbr || '').trim().toLowerCase();
    if (!name || !Number.isFinite(idRaw) || idRaw <= 0 || !abbr) return;
    map[name] = `${String(Math.trunc(idRaw)).padStart(3, '0')}${abbr}`;
  });
  return map;
});

const getCardTooltipBaseName = (nameRaw) => String(nameRaw || '').trim().split(/\s+/)[0] || '';

const CARD_TOOLTIP_RESERVED_TYPE_RE = /(pred|reserve|placeholder)/i;

const isCardTooltipImageEligible = (card) => {
  const cardIdRaw = ports.formatting.normalizeCardIdText(card?.CardID);
  if (!cardIdRaw || cardIdRaw === '-' || /^pred-/i.test(cardIdRaw)) return false;
  if (!/^\d+$/.test(cardIdRaw)) return false;

  const baseName = getCardTooltipBaseName(card?.Name);
  if (!baseName || baseName === '-' || /^pred-/i.test(baseName)) return false;

  const typeRaw = String(card?.Type || '').trim();
  if (CARD_TOOLTIP_RESERVED_TYPE_RE.test(typeRaw)) return false;

  return true;
};

const getCardTooltipImageList = (card) => {
  if (!isCardTooltipImageEligible(card)) return [];
  if (!isCardImageReleased(card, ports.clock.spoilerNow.value, settings?.allowSpoilers?.value === true)) return [];

  const cardId = ports.formatting.parseCardIdNumber(card?.CardID);
  if (cardId === null) return [];

  const baseName = getCardTooltipBaseName(card?.Name);
  const folder = CHAR_CARD_FOLDER_MAP.value[baseName];
  if (!folder) return [];

  const base = `/cards/${folder}/card${Math.trunc(cardId)}`;
  return getCardImageVariants(cardId, card?.Rarity, card?.Type).map((variant) => (
    buildAssetUrl(`${base}${variant === 'after_training' ? '_t' : ''}.webp`)
  ));
};

// Failed nodes stay mounted so the shared recovery queue can restore them.
const getVisibleCardTooltipImageList = getCardTooltipImageList;
const getSingleCardImageSrc = (card) => {
  const variants = getCardImageVariants(card?.CardID, card?.Rarity, card?.Type);
  const preferred = getCardImageVariantForMode(card?.CardID, settings?.singleCardFace?.value || 'after', card?.Rarity, card?.Type);
  return getCardTooltipImageList(card)[variants.indexOf(preferred)] || '';
};
const onCardTooltipImageError = event => {
  const img = ports.songMedia.markMediaImageSettled(event);
  if (!img) return;
  img.closest('.card-tooltip-jacket-item')?.classList.add('is-failed');
};


return {
  getBirthdayCardImageSrc,
  onBirthdayCardImageError,
  onBirthdayCardImageLoad,
  getCardTooltipImageList,
  getVisibleCardTooltipImageList,
  getSingleCardImageSrc,
  onCardTooltipImageError,
};
}
