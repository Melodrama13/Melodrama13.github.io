const CURVE_STEPS = 60;
const CORNER_CONTROL = 0.55228475;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (from, to, progress) => from + (to - from) * progress;

/** One damped response keeps the sheet moving through expansion and rebound. */
function springProgress(progress) {
  const response = time => 1 - Math.exp(-7.7 * time) * (Math.cos(9 * time) + 7.7 / 9 * Math.sin(9 * time));
  return response(progress) / response(1);
}

function readSurfaceTransform(value) {
  const numbers = value?.match(/\((.*)\)/)?.[1].split(/[,\s]+/).filter(Boolean).map(Number);
  if (numbers?.length === 16) return { scale: Math.hypot(numbers[0], numbers[1]), x: numbers[12], y: numbers[13] };
  if (numbers?.length === 6) return { scale: Math.hypot(numbers[0], numbers[1]), x: numbers[4], y: numbers[5] };
  return null;
}

/** Eight cubic segments keep the blob and resting rounded rectangle compatible. */
function outline(width, height, radius, roundness, bend = 0) {
  const rx = Math.max(0, Math.min(width / 2, mix(radius, width / 2, roundness)));
  const ry = Math.max(0, Math.min(height / 2, mix(radius, height / 2, roundness)));
  const k = CORNER_CONTROL;
  const insetX = width * bend;
  const insetY = height * bend * .3;
  return [
    rx, 0,
    rx + (width - 2 * rx) / 3, insetY, width - rx - (width - 2 * rx) / 3, insetY, width - rx, 0,
    width - rx * (1 - k), 0, width, ry * (1 - k), width, ry,
    width - insetX, ry + (height - 2 * ry) / 3, width - insetX, height - ry - (height - 2 * ry) / 3, width, height - ry,
    width, height - ry * (1 - k), width - rx * (1 - k), height, width - rx, height,
    width - rx - (width - 2 * rx) / 3, height - insetY, rx + (width - 2 * rx) / 3, height - insetY, rx, height,
    rx * (1 - k), height, 0, height - ry * (1 - k), 0, height - ry,
    insetX * .45, height - ry - (height - 2 * ry) / 3, insetX * .45, ry + (height - 2 * ry) / 3, 0, ry,
    0, ry * (1 - k), rx * (1 - k), 0, rx, 0,
  ];
}

function pathData(points) {
  const values = points.map(value => Math.round(value * 1000) / 1000);
  let path = `M ${values[0]} ${values[1]}`;
  for (let i = 2; i < values.length; i += 6) path += ` C ${values.slice(i, i + 6).join(' ')}`;
  return `${path} Z`;
}
const clipPath = points => `path("${pathData(points)}")`;

function readOutline(value, count) {
  if (!value?.startsWith('path(')) return null;
  const path = value.match(/["'](.*)["']/)?.[1];
  const points = path?.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number);
  return points?.length === count && points.every(Number.isFinite) ? points : null;
}

/** Precompute a continuous curve for native clip-path animation. */
function samplePoses(poses, progress) {
  let index = poses.findIndex(pose => pose.offset >= progress);
  if (index <= 0) return poses[0].values;
  const from = poses[index - 1], to = poses[index];
  const previous = poses[Math.max(0, index - 2)], next = poses[Math.min(poses.length - 1, index + 1)];
  const span = to.offset - from.offset, t = (progress - from.offset) / span;
  return from.values.map((value, coordinate) => {
    const fromSlope = index === 1 ? 0 : (to.values[coordinate] - previous.values[coordinate]) / (to.offset - previous.offset);
    const toSlope = index === poses.length - 1 ? 0 : (next.values[coordinate] - value) / (next.offset - from.offset);
    return (2 * t ** 3 - 3 * t ** 2 + 1) * value + (t ** 3 - 2 * t ** 2 + t) * span * fromSlope
      + (-2 * t ** 3 + 3 * t ** 2) * to.values[coordinate] + (t ** 3 - t ** 2) * span * toSlope;
  });
}

export function createNavigationUnfoldFrames({ width, height, radius, foldedSize, origin = { x: 0, y: 0 }, opening, opacity, previous }) {
  const size = Math.min(foldedSize, width, height);
  const foldedScale = size / Math.min(width, height);
  const localFoldedSize = size / foldedScale;
  const poses = [
    [0, 1, .06], [.12, .95, .09], [.32, .6, .055],
    [.52, .22, .015], [.7, -.12, -.006], [.84, .025, .002], [1, 0, 0],
  ].map(([offset, rounding, bend]) => {
    const growth = smooth(offset / .45);
    return { offset, values: [...outline(mix(localFoldedSize, width, growth), mix(localFoldedSize, height, growth), radius, rounding, bend), growth] };
  });
  const folded = poses[0].values.slice(0, -1), expanded = poses.at(-1).values.slice(0, -1);
  const canonicalStart = opening ? folded : expanded, target = opening ? expanded : folded;
  const start = readOutline(previous?.clipPath, folded.length) || canonicalStart;
  const distance = (a, b) => a.reduce((total, value, i) => total + Math.abs(value - b[i]), 0);
  const remaining = clamp(distance(start, target) / Math.max(1, distance(canonicalStart, target)));
  const foldedTransform = { scale: foldedScale, x: origin.x, y: origin.y };
  const expandedTransform = { scale: 1, x: 0, y: 0 };
  const initialTransform = readSurfaceTransform(previous?.transform) || (opening ? foldedTransform : expandedTransform);
  const targetTransform = opening ? expandedTransform : foldedTransform;
  const startOpacity = Number(previous?.opacity ?? (opening ? 0 : opacity));
  return Array.from({ length: CURVE_STEPS + 1 }, (_, index) => {
    const offset = index / CURVE_STEPS;
    const pose = samplePoses(poses, opening ? offset : 1 - offset);
    const progress = opening ? pose.at(-1) : 1 - pose.at(-1);
    const points = start.map((value, i) => mix(value, target[i], progress)
      + (pose[i] - mix(canonicalStart[i], target[i], progress)) * remaining);
    const fade = opening ? smooth(offset / .08) : smooth((offset - .78) / .22);
    const movement = opening ? springProgress(offset) : smooth(offset);
    const transform = `translate3d(${mix(initialTransform.x, targetTransform.x, movement)}px, ${mix(initialTransform.y, targetTransform.y, movement)}px, 0px) scale(${mix(initialTransform.scale, targetTransform.scale, movement)})`;
    return { offset, clipPath: index === 0 && previous?.clipPath?.startsWith('path(') ? previous.clipPath : clipPath(points),
      transform: index === 0 && previous?.transform && previous.transform !== 'none' ? previous.transform : transform,
      opacity: mix(startOpacity, opening ? Number(opacity) : 0, fade) };
  });
}

/** Contents travel with the sheet; a short fade makes the compact pose readable. */
export function createNavigationContentFrames({ opening, opacity, previous }) {
  const start = Number(previous?.opacity ?? (opening ? 0 : opacity));
  return Array.from({ length: CURVE_STEPS + 1 }, (_, index) => {
    const offset = index / CURVE_STEPS;
    const progress = opening ? smooth((offset - .04) / .38) : smooth((offset - .08) / .5);
    return { offset, opacity: mix(start, opening ? Number(opacity) : 0, progress) };
  });
}

/** Follow the native clock with a thin contour; no style or layout reads in RAF. */
export function createNavigationUnfoldOutline(element, bounds, frames, animation, style) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = element.ownerDocument.createElementNS(namespace, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('data-ui-navigation-outline', '');
  Object.assign(svg.style, { position: 'absolute', left: `${-style.borderLeft}px`, top: `${-style.borderTop}px`,
    width: `${bounds.width}px`, height: `${bounds.height}px`, overflow: 'visible', pointerEvents: 'none', zIndex: '1' });
  const paths = [[style.contourColor, 2], [style.borderColor, 1]].map(([color, width]) => {
    const path = element.ownerDocument.createElementNS(namespace, 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', String(width));
    svg.append(path);
    return path;
  });
  const outlines = frames.map(frame => readOutline(frame.clipPath, 50));
  const duration = animation.effect.getTiming().duration;
  let frame = 0, stopped = false, lastTime = -1;
  const draw = () => {
    if (stopped) return;
    const time = Number(animation.currentTime) || 0;
    if (time !== lastTime) {
      lastTime = time;
      const position = clamp(time / duration) * (outlines.length - 1);
      const index = Math.floor(position), next = Math.min(outlines.length - 1, index + 1);
      const data = pathData(outlines[index].map((value, coordinate) => mix(value, outlines[next][coordinate], position - index)));
      for (const path of paths) path.setAttribute('d', data);
    }
    frame = requestAnimationFrame(draw);
  };
  for (const path of paths) path.setAttribute('d', pathData(outlines[0]));
  element.append(svg);
  return {
    play: () => { if (!stopped && !frame) frame = requestAnimationFrame(draw); },
    cancel: () => { stopped = true; cancelAnimationFrame(frame); svg.remove(); },
  };
}
