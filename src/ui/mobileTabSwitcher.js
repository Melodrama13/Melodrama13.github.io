const DEFAULT_DRAG_THRESHOLD_RATIO = 0.32;

export function resolveTabDragTarget({
  startIndex,
  deltaX,
  trackWidth,
  tabCount,
  thresholdRatio = DEFAULT_DRAG_THRESHOLD_RATIO
}) {
  const count = Math.max(1, Math.trunc(Number(tabCount) || 0));
  const initialIndex = Math.min(Math.max(Math.trunc(Number(startIndex) || 0), 0), count - 1);
  const segmentWidth = Math.max(1, Number(trackWidth) || 0) / count;
  const threshold = segmentWidth * Math.max(0, Number(thresholdRatio) || 0);
  const distance = Number(deltaX) || 0;

  if (Math.abs(distance) < threshold) return initialIndex;
  const direction = distance > 0 ? 1 : -1;
  const steps = 1 + Math.floor((Math.abs(distance) - threshold) / segmentWidth);
  return Math.min(Math.max(initialIndex + direction * steps, 0), count - 1);
}
