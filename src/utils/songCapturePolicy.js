export const MAX_RENDER_TIMEOUT_MS = 40_000;
export const EXPORT_HARD_TIMEOUT_MS = 120_000;
export const MAX_TOTAL_RENDER_BUDGET_MS = 88_000;
export const MIN_EXPORT_MARGIN_MS = 10_000;
export const RENDER_RESOURCE_WAIT_BUDGET_MS = 20_400;
export const MIN_RENDER_ATTEMPT_TIMEOUT_MS = 12_000;
export const MAX_RENDER_ATTEMPT_TIMEOUT_MS = 56_000;
export const RENDER_TASK_SETTLE_GRACE_MS = 800;
export const PENDING_RENDER_BUSY_WAIT_MS = 800;

const toFiniteNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const computeRenderTimeoutMs = ({
  deviceTier,
  heavyMediaCount,
  width,
  height,
  scale
} = {}) => {
  const safeWidth = Math.max(1, toFiniteNumber(width, 1));
  const safeHeight = Math.max(1, toFiniteNumber(height, 1));
  const safeScale = Math.max(1, toFiniteNumber(scale, 1));
  const safeHeavyMediaCount = Math.max(0, toFiniteNumber(heavyMediaCount, 0));
  const totalMegaPixels = (safeWidth * safeHeight * safeScale * safeScale) / 1_000_000;
  const heavyBoost = Math.min(24_000, Math.round(safeHeavyMediaCount * 100));

  let baseTimeout;
  if (totalMegaPixels <= 4) baseTimeout = 4_200;
  else if (totalMegaPixels <= 8) baseTimeout = 5_600;
  else if (totalMegaPixels <= 14) baseTimeout = 7_200;
  else if (totalMegaPixels <= 22) baseTimeout = 9_000;
  else if (totalMegaPixels <= 32) baseTimeout = 10_800;
  else baseTimeout = deviceTier === 'phone' ? 14_000 : (deviceTier === 'tablet' ? 15_500 : 14_500);

  return Math.min(MAX_RENDER_TIMEOUT_MS, baseTimeout + heavyBoost);
};

export const buildRenderAttemptTimeouts = ({
  deviceTier,
  heavyMediaCount,
  width,
  height,
  pixelRatioPlan = [2, 1]
} = {}) => {
  const pixelRatios = Array.from(pixelRatioPlan || []).slice(0, 2);
  const rawAttempts = pixelRatios.map((pixelRatio, attemptIdx) => {
    const timeoutMs = computeRenderTimeoutMs({
      deviceTier,
      heavyMediaCount,
      width,
      height,
      scale: pixelRatio
    });
    const factor = 1.35 + (attemptIdx * 0.25);
    return {
      pixelRatio,
      timeoutMs: Math.min(
        MAX_RENDER_ATTEMPT_TIMEOUT_MS,
        Math.max(MIN_RENDER_ATTEMPT_TIMEOUT_MS, Math.round(timeoutMs * factor))
      )
    };
  });

  const total = rawAttempts.reduce((sum, attempt) => sum + attempt.timeoutMs, 0);
  if (total <= MAX_TOTAL_RENDER_BUDGET_MS || rawAttempts.length === 0) return rawAttempts;

  const scale = MAX_TOTAL_RENDER_BUDGET_MS / total;
  const scaledTimeouts = rawAttempts.map((attempt) => Math.max(
    MIN_RENDER_ATTEMPT_TIMEOUT_MS,
    Math.round(attempt.timeoutMs * scale)
  ));
  let overflow = scaledTimeouts.reduce((sum, timeoutMs) => sum + timeoutMs, 0) - MAX_TOTAL_RENDER_BUDGET_MS;
  for (let idx = scaledTimeouts.length - 1; idx >= 0 && overflow > 0; idx -= 1) {
    const reducible = Math.max(0, scaledTimeouts[idx] - MIN_RENDER_ATTEMPT_TIMEOUT_MS);
    const reduction = Math.min(reducible, overflow);
    scaledTimeouts[idx] -= reduction;
    overflow -= reduction;
  }

  return rawAttempts.map((attempt, idx) => ({
    ...attempt,
    timeoutMs: scaledTimeouts[idx]
  }));
};

export const withRenderTimeout = async (promise, timeoutMs, cancelPromise = null) => {
  let timer = 0;
  try {
    const raceTasks = [
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`render-timeout-${timeoutMs}`));
        }, timeoutMs);
      })
    ];
    if (cancelPromise) {
      raceTasks.push(Promise.resolve(cancelPromise).then(() => {
        throw new Error('export-cancelled');
      }));
    }
    return await Promise.race(raceTasks);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const createRenderTaskTracker = () => {
  let pendingTask = null;
  let startChain = Promise.resolve();

  const wait = async (maxWaitMs = 0) => {
    const pending = pendingTask;
    if (!pending) return true;

    const settled = pending.then(() => true, () => true);
    if (!(maxWaitMs > 0)) return settled;

    return Promise.race([
      settled,
      new Promise((resolve) => {
        setTimeout(() => resolve(false), maxWaitMs);
      })
    ]);
  };

  const start = (createTask) => {
    const launch = startChain.then(async () => {
      await wait();
      const task = Promise.resolve().then(() => createTask());
      const tracked = task.finally(() => {
        if (pendingTask === tracked) pendingTask = null;
      });
      pendingTask = tracked;
      return tracked;
    });
    startChain = launch.then(() => undefined, () => undefined);
    return launch;
  };

  return {
    start,
    wait,
    hasPending: () => pendingTask !== null
  };
};
