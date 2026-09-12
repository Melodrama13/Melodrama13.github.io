const ALWAYS_LIMITED_CARD_TYPES = new Set(['limited', 'cfes', 'bfes', 'collab_t']);

// 歌限卡池：后续只需在此加入 GachaID，即可统一控制所有限定统计。
export const SONG_LIMITED_GACHA_IDS = new Set(['c6']);

const normalizeText = (raw) => String(raw || '').trim().toLowerCase();

export const shouldCountCardAsLimited = (card, options = {}) => {
  const includeWl3 = options?.includeWl3 === true;
  const includeSongLimited = options?.includeSongLimited !== false;
  const cardType = normalizeText(card?.Type);
  const gachaId = normalizeText(card?.GachaID);

  if (SONG_LIMITED_GACHA_IDS.has(gachaId)) return includeSongLimited;
  if (cardType === 'wl3') return includeWl3;
  return ALWAYS_LIMITED_CARD_TYPES.has(cardType);
};
