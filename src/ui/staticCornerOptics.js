import { STATIC_CORNER_OPTICS as data } from './generated/staticCornerOpticsData.js';

// These are baked normal textures, decoded once. No contours are built here.
const tables = new Map();
function tableFor(curve) {
  if (!Object.hasOwn(data.tables, curve)) throw new RangeError(`No baked corner optics for curve ${curve}`);
  if (!tables.has(curve)) {
    const binary = atob(data.tables[curve]);
    const values = new Int16Array(binary.length / 2);
    for (let i = 0; i < values.length; i++) {
      const value = binary.charCodeAt(i * 2) | binary.charCodeAt(i * 2 + 1) << 8;
      values[i] = value >= 32768 ? value - 65536 : value;
    }
    tables.set(curve, values);
  }
  return tables.get(curve);
}

export function sampleStaticCornerOptics({ width, height, radii, curve, profiles }, x, y) {
  let distance = x, normalX = -1, normalY = 0;
  if (width - x < distance) { distance = width - x; normalX = 1; }
  if (y < distance) { distance = y; normalX = 0; normalY = -1; }
  if (height - y < distance) { distance = height - y; normalX = 0; normalY = 1; }
  for (let i = 0; i < 4; i++) {
    const profile = profiles?.[i];
    const radius = profile?.radius ?? (Array.isArray(radii) ? radii[i] : radii);
    const offset = profile?.offset ?? 0, cornerCurve = profile?.curve ?? curve;
    const sx = i === 1 || i === 2 ? 1 : -1, sy = i >= 2 ? 1 : -1;
    const localX = sx > 0 ? width - x : x, localY = sy > 0 ? height - y : y;
    const extent = radius + offset;
    if (!(radius > 0) || localX >= extent || localY >= extent) continue;
    let d, nx, ny;
    if (cornerCurve === 1) {
      const qx = extent - localX, qy = extent - localY, length = Math.hypot(qx, qy) || 1;
      d = extent - length; nx = qx / length; ny = qy / length;
    } else {
      const values = tableFor(cornerCurve);
      const qx = Math.max(0, Math.min(data.grid, (1 - (localX - offset) / radius) / data.range * data.grid));
      const qy = Math.max(0, Math.min(data.grid, (1 - (localY - offset) / radius) / data.range * data.grid));
      const ix = Math.min(data.grid - 1, Math.floor(qx)), iy = Math.min(data.grid - 1, Math.floor(qy));
      const tx = qx - ix, ty = qy - iy, index = (iy * (data.grid + 1) + ix) * 3;
      const interpolate = channel => ((values[index + channel] * (1 - tx) + values[index + 3 + channel] * tx) * (1 - ty)
        + (values[index + (data.grid + 1) * 3 + channel] * (1 - tx) + values[index + (data.grid + 2) * 3 + channel] * tx) * ty);
      d = interpolate(0) / data.distanceScale * radius + offset;
      nx = interpolate(1) / data.normalScale; ny = interpolate(2) / data.normalScale;
    }
    if (d < distance) { distance = d; normalX = sx * nx; normalY = sy * ny; }
  }
  const length = Math.hypot(normalX, normalY) || 1;
  return { distance, normalX: normalX / length, normalY: normalY / length };
}
