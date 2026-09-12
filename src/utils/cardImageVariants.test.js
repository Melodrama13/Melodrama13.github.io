import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AFTER_TRAINING_ONLY_CARD_IDS,
  NORMAL_ONLY_CARD_IDS,
  getCardImageVariantForMode,
  getCardImageVariants
} from './cardImageVariants.js';

const C6_AFTER_TRAINING_ONLY_CARD_IDS = [1458, 1459, 1460, 1461, 1462, 1463];

test('1167 and the six C6 cards expose only the after-training image', () => {
  for (const cardId of [1167, ...C6_AFTER_TRAINING_ONLY_CARD_IDS]) {
    assert.equal(AFTER_TRAINING_ONLY_CARD_IDS.has(cardId), true);
    assert.deepEqual(getCardImageVariants(cardId, '4', 'collab_t'), ['after_training']);
    assert.equal(getCardImageVariantForMode(cardId, 'before', '4', 'collab_t'), 'after_training');
    assert.equal(getCardImageVariantForMode(cardId, 'after', '4', 'collab_t'), 'after_training');
  }
});

test('ordinary trainable cards keep distinct before and after-training images', () => {
  assert.deepEqual(getCardImageVariants(1464, '4', 'collab'), ['normal', 'after_training']);
  assert.equal(getCardImageVariantForMode(1464, 'before', '4', 'collab'), 'normal');
  assert.equal(getCardImageVariantForMode(1464, 'after', '4', 'collab'), 'after_training');
});

test('low-rarity and birthday cards expose only the normal image', () => {
  assert.deepEqual(getCardImageVariants(100, '2', 'normal'), ['normal']);
  assert.deepEqual(getCardImageVariants(101, '4', 'birthday'), ['normal']);
  assert.equal(getCardImageVariantForMode(100, 'after', '2', 'normal'), 'normal');
});

test('normal-only exceptions can be managed by adding one card ID', () => {
  const exampleCardId = 999999;
  NORMAL_ONLY_CARD_IDS.add(exampleCardId);
  try {
    assert.deepEqual(getCardImageVariants(exampleCardId, '4', 'normal'), ['normal']);
    assert.equal(getCardImageVariantForMode(exampleCardId, 'after', '4', 'normal'), 'normal');
  } finally {
    NORMAL_ONLY_CARD_IDS.delete(exampleCardId);
  }
});
