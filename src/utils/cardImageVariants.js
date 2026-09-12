// 没有花前、仅有花后的卡：后续只需在此加入 CardID。
export const AFTER_TRAINING_ONLY_CARD_IDS = new Set([
  1167,
  1458,
  1459,
  1460,
  1461,
  1462,
  1463
]);

// 没有花后的例外卡：低星与生日卡已由通用规则处理，其余只需在此加入 CardID。
export const NORMAL_ONLY_CARD_IDS = new Set([]);

const normalizeCardId = (raw) => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.trunc(value);
};

const normalizeText = (raw) => String(raw || '').trim().toLowerCase();

export const getCardImageVariants = (cardIdRaw, rarityRaw, typeRaw = '') => {
  const cardId = normalizeCardId(cardIdRaw);
  if (cardId !== null && AFTER_TRAINING_ONLY_CARD_IDS.has(cardId)) {
    return ['after_training'];
  }
  if (cardId !== null && NORMAL_ONLY_CARD_IDS.has(cardId)) {
    return ['normal'];
  }

  const type = normalizeText(typeRaw);
  const rarity = normalizeText(rarityRaw);
  if (type === 'birthday') return ['normal'];
  if (rarity === '3' || rarity === '4' || rarity === 'rarity_3' || rarity === 'rarity_4') {
    return ['normal', 'after_training'];
  }
  return ['normal'];
};

export const getCardImageVariantForMode = (cardId, mode, rarity, type = '') => {
  const variants = getCardImageVariants(cardId, rarity, type);
  const preferred = mode === 'after' ? 'after_training' : 'normal';
  return variants.includes(preferred) ? preferred : variants[0];
};
