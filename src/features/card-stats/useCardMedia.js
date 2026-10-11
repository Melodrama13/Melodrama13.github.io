import { computed } from 'vue';
import { isCardImageReleased } from '../../utils/spoilerGuard.js';
import { getCardImageVariantForMode } from '../../utils/cardImageVariants.js';
import { buildAssetUrl } from '../../utils/assets.js';

/** Owns card media behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardMedia(inputs) {
  const cardByIdMap = computed(() => {
    const result = {};
    (inputs.props.allCards || []).forEach((card) => {
      const cardId = Number(card?.CardID);
      if (!Number.isFinite(cardId) || cardId <= 0) return;
      result[Math.trunc(cardId)] = card;
    });
    return result;
  });

  function getCardFolderByName(name) {
    const key = String(name || '').trim();
    if (!key) return '';
    return inputs.metadata.CHAR_CARD_FOLDER_MAP.value[key] || '';
  }

  function buildCardImageSrc(cardId, baseName, options = {}) {
    const idNum = Number(cardId);
    if (!Number.isFinite(idNum) || idNum <= 0) return '';
    const sourceCard = options?.card || cardByIdMap.value[Math.trunc(idNum)] || null;
    if (sourceCard && !isCardImageReleased(sourceCard, inputs.cutoff.spoilerNow.value)) return '';

    const folder = getCardFolderByName(baseName);
    if (!folder) return '';

    const variant = getCardImageVariantForMode(
      idNum,
      inputs.presentation.navCardImageMode.value,
      options?.rarity || sourceCard?.Rarity,
      sourceCard?.Type
    );
    const suffix = variant === 'after_training' ? '_t' : '';
    return buildAssetUrl(`/cards/${folder}/card${idNum}${suffix}.webp`);
  }

  const buildFesCardImageSrc = (cardId, baseName, fesType) => {
    void fesType;
    return buildCardImageSrc(cardId, baseName, { rarity: '4' });
  };

  const getLineupSlotCardImageSrc = (slot) => {
    const baseName = inputs.metadata.getCardBaseName(slot?.name);
    if (!baseName) return '';
    const idNum = Number(slot?.cardId);
    if (!Number.isFinite(idNum) || idNum <= 0) return '';
    return buildCardImageSrc(idNum, baseName, { rarity: '4' });
  };

  const markMediaImageSettled = (event) => {
    const target = event?.target;
    if (!(target instanceof HTMLImageElement)) return;
    target.dataset.loaded = '1';
  };

  const onMediaImageLoad = (event) => {
    markMediaImageSettled(event);
    const target = event?.target;
    if (!(target instanceof HTMLImageElement)) return;
    target.style.visibility = '';
  };

  const onMediaImageError = (event) => {
    markMediaImageSettled(event);
    const target = event?.target;
    if (!(target instanceof HTMLImageElement)) return;
    target.style.visibility = 'hidden';
  };

  return {
    buildCardImageSrc,
    getCardFolderByName,
    buildFesCardImageSrc,
    onMediaImageLoad,
    onMediaImageError,
    getLineupSlotCardImageSrc,
  };
}
