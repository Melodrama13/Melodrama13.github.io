import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPORT_HARD_TIMEOUT_MS,
  MAX_TOTAL_RENDER_BUDGET_MS,
  MAX_RENDER_TIMEOUT_MS,
  MIN_EXPORT_MARGIN_MS,
  PRELOAD_PHASE_TIMEOUT_MS,
  RENDER_RESOURCE_WAIT_BUDGET_MS,
  buildRenderAttemptTimeouts,
  computeRenderTimeoutMs,
  createRenderTaskTracker,
  createExportLifecycle,
  getCaptureReadyTimeoutMs,
  getSongCaptureResourceWaitBudgetMs,
  shouldRunCaptureRecoveryPreload,
  preloadUrlsWithDeadline,
  waitForRenderTimeoutOutcome,
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

test('phone readiness and one fallback recovery phase stay below the hard test timeout', () => {
  const attempts = buildRenderAttemptTimeouts({
    ...renderShape,
    heavyMediaCount: 100_000,
    pixelRatioPlan: [2, 1]
  });
  const totalRenderBudget = attempts.reduce((sum, attempt) => sum + attempt.timeoutMs, 0);

  assert.deepEqual(attempts.map((attempt) => attempt.pixelRatio), [2, 1]);
  assert.equal(attempts.length, 2);
  assert.ok(totalRenderBudget <= MAX_TOTAL_RENDER_BUDGET_MS);
  assert.equal(getCaptureReadyTimeoutMs({ deviceTier: 'phone', phase: 'source' }), 3_600);
  assert.equal(getCaptureReadyTimeoutMs({ deviceTier: 'phone', phase: 'clone' }), 4_200);
  assert.equal(getCaptureReadyTimeoutMs({ deviceTier: 'desktop', phase: 'source' }), 3_000);
  assert.equal(getCaptureReadyTimeoutMs({ deviceTier: 'desktop', phase: 'clone' }), 3_400);
  assert.equal(getSongCaptureResourceWaitBudgetMs({ deviceTier: 'phone', includeEventRecovery: true }), 28_800);
  assert.equal(getSongCaptureResourceWaitBudgetMs({ deviceTier: 'desktop', includeEventRecovery: true }), 27_400);
  assert.equal(RENDER_RESOURCE_WAIT_BUDGET_MS, 28_800);
  assert.ok(RENDER_RESOURCE_WAIT_BUDGET_MS > 20_400);
  assert.ok(
    totalRenderBudget + RENDER_RESOURCE_WAIT_BUDGET_MS
      <= EXPORT_HARD_TIMEOUT_MS - MIN_EXPORT_MARGIN_MS
  );
});

test('event-like recovery preload is reserved only when a fallback attempt exists', () => {
  assert.equal(
    shouldRunCaptureRecoveryPreload({ eventLike: true, attemptIndex: 0, attemptCount: 2 }),
    true
  );
  assert.equal(
    shouldRunCaptureRecoveryPreload({ eventLike: true, attemptIndex: 1, attemptCount: 2 }),
    false
  );
  assert.equal(
    shouldRunCaptureRecoveryPreload({ eventLike: true, attemptIndex: 0, attemptCount: 1 }),
    false
  );
  assert.equal(
    shouldRunCaptureRecoveryPreload({ eventLike: false, attemptIndex: 0, attemptCount: 2 }),
    false
  );
});

test('cancelled export ownership blocks late timeout UI and a new click until finalization', () => {
  const lifecycle = createExportLifecycle();
  const token = lifecycle.begin();

  assert.equal(lifecycle.isLive(token), true);
  assert.equal(lifecycle.cancel(token), true);
  assert.equal(lifecycle.isLive(token), false);
  assert.equal(lifecycle.begin(), null);
  assert.equal(lifecycle.finish(token), true);

  const nextToken = lifecycle.begin();
  assert.notEqual(nextToken, token);
  assert.equal(lifecycle.isLive(nextToken), true);
  assert.equal(lifecycle.finish(nextToken), true);
});

test('cancellation during render settle grace remains cancellation instead of timeout failure', async () => {
  const lifecycle = createExportLifecycle();
  const token = lifecycle.begin();
  let finalState = 'capturing';
  const cancelTimer = setTimeout(() => lifecycle.cancel(token), 5);

  const outcome = await waitForRenderTimeoutOutcome({
    isCancelled: () => !lifecycle.isLive(token),
    maxWaitMs: 25,
    waitForSettle: (maxWaitMs) => new Promise((resolve) => {
      setTimeout(() => resolve(false), maxWaitMs);
    })
  });

  clearTimeout(cancelTimer);
  if (outcome === 'cancelled') finalState = 'closed';
  if (outcome === 'timed-out') finalState = 'failed';

  assert.equal(outcome, 'cancelled');
  assert.equal(finalState, 'closed');
  assert.equal(lifecycle.finish(token), true);
});

test('preload deadline aborts active batches and prevents later URLs from starting', async () => {
  const urls = ['a', 'b', 'c', 'd', 'e'];
  const started = [];
  const aborted = [];
  const startedAt = Date.now();

  const result = await preloadUrlsWithDeadline({
    urls,
    concurrency: 2,
    timeoutMs: 1_000,
    phaseTimeoutMs: 25,
    loadOne: (url, { signal }) => new Promise((resolve) => {
      started.push(url);
      const timer = setTimeout(() => resolve(true), 1_000);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        aborted.push(url);
        resolve(false);
      }, { once: true });
    })
  });

  assert.equal(result.expired, true);
  assert.deepEqual(started, ['a', 'b']);
  assert.deepEqual(aborted, ['a', 'b']);
  assert.ok(Date.now() - startedAt < 300);

  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.deepEqual(started, ['a', 'b']);
  assert.equal(PRELOAD_PHASE_TIMEOUT_MS, 7_000);
});

test('preload deadline bounds slow multi-batch work after the first batch completes', async () => {
  const urls = ['a', 'b', 'c', 'd', 'e', 'f'];
  const started = [];
  const aborted = [];
  const startedAt = Date.now();

  const result = await preloadUrlsWithDeadline({
    urls,
    concurrency: 2,
    timeoutMs: 1_000,
    phaseTimeoutMs: 45,
    loadOne: (url, { signal }) => new Promise((resolve) => {
      started.push(url);
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const fast = url === 'a' || url === 'b';
      const timer = setTimeout(() => finish(true), fast ? 5 : 1_000);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        if (!settled) aborted.push(url);
        finish(false);
      }, { once: true });
    })
  });

  assert.equal(result.expired, true);
  assert.deepEqual(started, ['a', 'b', 'c', 'd']);
  assert.deepEqual(aborted, ['c', 'd']);
  assert.equal(result.completed, 2);
  assert.equal(result.remaining, 2);
  assert.ok(Date.now() - startedAt < 300);
});
