import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPORT_HARD_TIMEOUT_MS,
  MAX_TOTAL_RENDER_BUDGET_MS,
  MAX_RENDER_TIMEOUT_MS,
  MIN_EXPORT_MARGIN_MS,
  RENDER_RESOURCE_WAIT_BUDGET_MS,
  buildRenderAttemptTimeouts,
  computeRenderTimeoutMs,
  createRenderTaskTracker,
  withRenderTimeout
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

test('timeout and cancel return promptly without resolving the underlying render', async () => {
  let releaseRender;
  const renderTask = new Promise((resolve) => {
    releaseRender = resolve;
  });

  await assert.rejects(
    withRenderTimeout(renderTask, 5),
    /render-timeout-5/
  );

  let resolveCancel;
  const cancelPromise = new Promise((resolve) => {
    resolveCancel = resolve;
  });
  const cancelledRender = withRenderTimeout(renderTask, 10_000, cancelPromise);
  resolveCancel(true);
  await assert.rejects(cancelledRender, /export-cancelled/);

  releaseRender('eventually-settled');
  assert.equal(await renderTask, 'eventually-settled');
});

test('a later render request gets a bounded busy result while pending work remains tracked', async () => {
  const tracker = createRenderTaskTracker();
  let releaseRender;
  const first = tracker.start(() => new Promise((resolve) => {
    releaseRender = resolve;
  }));

  await new Promise((resolve) => setTimeout(resolve, 0));
  const busy = await tracker.wait(5);
  assert.equal(busy, false);
  assert.equal(tracker.hasPending(), true);

  releaseRender('settled');
  assert.equal(await first, 'settled');
  assert.equal(tracker.hasPending(), false);
});

test('two quality-ordered render budgets plus resource waits stay below the hard test timeout', () => {
  const attempts = buildRenderAttemptTimeouts({
    ...renderShape,
    heavyMediaCount: 100_000,
    pixelRatioPlan: [2, 1]
  });
  const totalRenderBudget = attempts.reduce((sum, attempt) => sum + attempt.timeoutMs, 0);

  assert.deepEqual(attempts.map((attempt) => attempt.pixelRatio), [2, 1]);
  assert.equal(attempts.length, 2);
  assert.ok(totalRenderBudget <= MAX_TOTAL_RENDER_BUDGET_MS);
  assert.ok(
    totalRenderBudget + RENDER_RESOURCE_WAIT_BUDGET_MS
      <= EXPORT_HARD_TIMEOUT_MS - MIN_EXPORT_MARGIN_MS
  );
});
