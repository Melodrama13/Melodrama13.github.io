import { isHairstyleWorldLinkCard } from '../domain/worldLink.js';

const ALWAYS_LIMITED_CARD_TYPES = new Set(['limited', 'cfes', 'bfes', 'collab_t']);

// 歌限卡池：后续只需在此加入 GachaID，即可统一控制所有限定统计。
export const SONG_LIMITED_GACHA_IDS = new Set(['c6']);

const normalizeText = (raw) => String(raw || '').trim().toLowerCase();

export const shouldCountCardAsLimited = (card, options = {}) => {
  // Keep includeWl3 compatible with saved rule configurations and older callers.
  const includeHairstyleWl = (options?.includeHairstyleWl ?? options?.includeWl3) === true;
  const includeSongLimited = options?.includeSongLimited !== false;
  const cardType = normalizeText(card?.Type);
  const gachaId = normalizeText(card?.GachaID);

  if (SONG_LIMITED_GACHA_IDS.has(gachaId)) return includeSongLimited;
  if (isHairstyleWorldLinkCard(card)) return includeHairstyleWl;
  return ALWAYS_LIMITED_CARD_TYPES.has(cardType);
};
