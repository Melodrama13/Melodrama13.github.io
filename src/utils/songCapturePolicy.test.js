import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_RENDER_TIMEOUT_MS,
  computeRenderTimeoutMs,
  createRenderTaskTracker
} from './songCapturePolicy.js';

const renderShape = Object.freeze({
  deviceTier: 'desktop',
  width: 1088,
  height: 5158,
  scale: 2
});

test('render timeout budget grows meaningfully with heavy media count', () => {
  const light = computeRenderTimeoutMs({ ...renderShape, heavyMediaCount: 0 });
  const medium = computeRenderTimeoutMs({ ...renderShape, heavyMediaCount: 40 });
  const imageHeavy = computeRenderTimeoutMs({ ...renderShape, heavyMediaCount: 460 });

  assert.ok(medium >= light + 3_000);
  assert.ok(imageHeavy >= medium + 10_000);
  assert.ok(imageHeavy <= MAX_RENDER_TIMEOUT_MS);
});

test('render timeout budget remains bounded for pathological media counts', () => {
  assert.ok(
    computeRenderTimeoutMs({ ...renderShape, heavyMediaCount: 100_000 }) <= MAX_RENDER_TIMEOUT_MS
  );
});

test('a timed-out render stays tracked until its non-cancellable task settles', async () => {
  const tracker = createRenderTaskTracker();
  let releaseFirst;
  let firstActive = false;
  let secondStarted = false;

  const first = tracker.start(() => new Promise((resolve) => {
    firstActive = true;
    releaseFirst = () => {
      firstActive = false;
      resolve('first');
    };
  }));

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(tracker.hasPending(), true);

  const second = tracker.start(() => {
    secondStarted = true;
    assert.equal(firstActive, false);
    return 'second';
  });

  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(secondStarted, false);

  releaseFirst();
  assert.equal(await first, 'first');
  assert.equal(await second, 'second');
  assert.equal(tracker.hasPending(), false);
});
