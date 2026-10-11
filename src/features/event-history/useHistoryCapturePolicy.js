import { isViewportAtMost, UI_BREAKPOINTS } from '../../ui/breakpoints.js';

/** Capture Policy owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: none.
 */
export function useHistoryCapturePolicy(ports = {}) {
const getHistoryCaptureDeviceTier = () => {
  const width = Number(window?.innerWidth || 0);
  const height = Number(window?.innerHeight || 0);
  const minSide = Math.min(width || Number.MAX_SAFE_INTEGER, height || Number.MAX_SAFE_INTEGER);
  if (isViewportAtMost(width, UI_BREAKPOINTS.compactMax)) {
    if (minSide >= 680) return 'tablet';
    return 'phone';
  }
  return 'desktop';
};

const withCaptureTimeout = async (promise, timeoutMs, cancelPromise = null) => {
  let timer = 0;
  try {
    const raceTasks = [
      promise,
      new Promise((_, reject) => {
        timer = window.setTimeout(() => {
          reject(new Error(`capture-timeout-${timeoutMs}`));
        }, timeoutMs);
      })
    ];
    if (cancelPromise) {
      raceTasks.push(cancelPromise.then(() => {
        throw new Error('export-cancelled');
      }));
    }
    return await Promise.race(raceTasks);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const computeHistoryCaptureTimeoutMs = ({ deviceTier, width, height, scale }) => {
  const totalMegaPixels = (Math.max(1, width) * Math.max(1, height) * Math.max(1, scale) * Math.max(1, scale)) / 1000000;
  let timeoutMs = 15000;
  if (totalMegaPixels <= 4) timeoutMs = 4500;
  else if (totalMegaPixels <= 8) timeoutMs = 6200;
  else if (totalMegaPixels <= 14) timeoutMs = 8000;
  else if (totalMegaPixels <= 22) timeoutMs = 9800;
  else if (totalMegaPixels <= 32) timeoutMs = 11800;
  else if (deviceTier === 'phone') timeoutMs = 14500;
  else if (deviceTier === 'tablet') timeoutMs = 16000;

  if (deviceTier === 'phone') return Math.max(timeoutMs + 2500, 9000);
  if (deviceTier === 'tablet') return Math.max(timeoutMs + 1800, 8500);
  return Math.max(timeoutMs + 1800, 9000);
};

const buildHistoryScaleCandidates = ({ bounds, deviceTier, deviceScale, useExperimentalHQ }) => {
  void deviceScale;
  const width = Math.max(1, Number(bounds?.width || 1));
  const height = Math.max(1, Number(bounds?.height || 1));
  const baseMegaPixels = (width * height) / 1000000;
  let ladder;
  if (deviceTier === 'phone') {
    if (baseMegaPixels > 12) {
      ladder = [2.0, 1.05, 1];
    } else if (baseMegaPixels > 8) {
      ladder = [2.0, 1.15, 1];
    } else if (baseMegaPixels > 5) {
      ladder = [2.0, 1.3, 1.12, 1];
    } else if (baseMegaPixels > 3) {
      ladder = [2.0, 1.5, 1.3, 1.12, 1];
    } else {
      ladder = [2.0, 1.75, 1.5, 1.25, 1];
    }
  } else if (deviceTier === 'tablet') {
    if (baseMegaPixels > 14) {
      ladder = [1.15, 1];
    } else if (baseMegaPixels > 8) {
      ladder = [1.35, 1.15, 1];
    } else if (baseMegaPixels > 5) {
      ladder = [1.6, 1.35, 1.15, 1];
    } else {
      ladder = [1.85, 1.6, 1.35, 1.1];
    }
  } else {
    const baseScale = useExperimentalHQ ? 2.2 : 2.0;
    ladder = useExperimentalHQ
      ? [baseScale, 2.0, 1.75, 1.5, 1.25, 1]
      : [baseScale, 1.75, 1.5, 1.25, 1];
  }
  const seen = new Set();
  return ladder
    .map((value) => Math.max(1, Number(value.toFixed(2))))
    .filter((value) => {
      const key = String(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};


return {
  getHistoryCaptureDeviceTier,
  buildHistoryScaleCandidates,
  computeHistoryCaptureTimeoutMs,
  withCaptureTimeout,
};
}
