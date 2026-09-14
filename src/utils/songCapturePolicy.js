export const MAX_RENDER_TIMEOUT_MS = 40_000;

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
