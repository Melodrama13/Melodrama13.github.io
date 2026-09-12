import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SONG_LIMITED_GACHA_IDS,
  shouldCountCardAsLimited
} from './cardLimitedRules.js';

test('C1 collab_t cards always count as limited', () => {
  const card = { Type: 'collab_t', GachaID: 'c1' };

  assert.equal(shouldCountCardAsLimited(card), true);
  assert.equal(shouldCountCardAsLimited(card, { includeSongLimited: false }), true);
});

test('C6 cards follow the song-limited toggle and default to included', () => {
  const card = { Type: 'collab_t', GachaID: 'c6' };

  assert.equal(shouldCountCardAsLimited(card), true);
  assert.equal(shouldCountCardAsLimited(card, { includeSongLimited: true }), true);
  assert.equal(shouldCountCardAsLimited(card, { includeSongLimited: false }), false);
});

test('WL3 cards follow the WL3 toggle and default to excluded', () => {
  const card = { Type: 'wl3', GachaID: '1234' };

  assert.equal(shouldCountCardAsLimited(card), false);
  assert.equal(shouldCountCardAsLimited(card, { includeWl3: true }), true);
});

test('existing limited types keep their current behavior', () => {
  assert.equal(shouldCountCardAsLimited({ Type: 'limited', GachaID: '1' }), true);
  assert.equal(shouldCountCardAsLimited({ Type: 'cfes', GachaID: '2' }), true);
  assert.equal(shouldCountCardAsLimited({ Type: 'bfes', GachaID: '3' }), true);
  assert.equal(shouldCountCardAsLimited({ Type: 'perm', GachaID: '4' }), false);
});

test('adding one gacha ID makes a future pool follow the shared song-limited toggle', () => {
  const futureGachaId = 'future-song-limited';
  SONG_LIMITED_GACHA_IDS.add(futureGachaId);
  try {
    const card = { Type: 'collab_t', GachaID: futureGachaId };
    assert.equal(shouldCountCardAsLimited(card, { includeSongLimited: true }), true);
    assert.equal(shouldCountCardAsLimited(card, { includeSongLimited: false }), false);
  } finally {
    SONG_LIMITED_GACHA_IDS.delete(futureGachaId);
  }
});
