// Convex parallel contours are intersections of shifted support planes.
// Sampling the normal adaptively bounds the path error in CSS pixels and also
// removes the folded loops that a direct negative normal offset can produce.
const planeCache = new Map();
const TOLERANCE = 0.003;

function quarterPlanes(radius, power, distance) {
  const key = `${radius}|${power}|${distance}`;
  if (planeCache.has(key)) return planeCache.get(key);
  const plane = angle => {
    const x = angle === Math.PI / 2 ? 0 : Math.cos(angle);
    const y = angle === 0 ? 0 : Math.sin(angle);
    const support = power === 1 ? radius * Math.max(x, y)
      : radius * (x ** (power / (power - 1)) + y ** (power / (power - 1))) ** ((power - 1) / power);
    return { x, y, support, h: support + distance };
  };
  const first = plane(0), last = plane(Math.PI / 2), result = [first];
  const subdivide = (start, end, a, b, depth) => {
    const mid = (start + end) / 2, m = plane(mid);
    const determinant = a.x * b.y - a.y * b.x;
    const x = (a.h * b.y - a.y * b.h) / determinant;
    const y = (a.x * b.h - a.h * b.x) / determinant;
    if (m.x * x + m.y * y - m.h > TOLERANCE && depth < 22) {
      subdivide(start, mid, a, m, depth + 1);
      subdivide(mid, end, m, b, depth + 1);
    } else result.push(b);
  };
  subdivide(0, Math.PI / 2, first, last, 0);
  if (planeCache.size >= 128) planeCache.delete(planeCache.keys().next().value);
  planeCache.set(key, result);
  return result;
}

function clipPolygon(points, nx, ny, support) {
  const result = [];
  for (let index = 0; index < points.length; index++) {
    const a = points[index], b = points[(index + 1) % points.length];
    const da = nx * a[0] + ny * a[1] - support, db = nx * b[0] + ny * b[1] - support;
    const insideA = da <= 1e-9, insideB = db <= 1e-9;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = da / (da - db);
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return result;
}

export function buildParallelCornerPath(source, distance) {
  const width = source.width + distance * 2, height = source.height + distance * 2;
  if (width <= 0 || height <= 0) return '';
  let points = [[0, 0], [width, 0], [width, height], [0, height]];
  const signs = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
  const indices = [1, 2, 3, 0];
  for (let corner = 0; corner < 4 && points.length; corner++) {
    const index = indices[corner], profile = source.profiles?.[index];
    const radius = profile?.radius ?? source.radii[index], curve = profile?.curve ?? source.curve;
    const parallel = profile?.offset || 0, extent = radius + parallel, [sx, sy] = signs[corner];
    const cx = sx > 0 ? source.width - extent : extent;
    const cy = sy > 0 ? source.height - extent : extent;
    for (const plane of quarterPlanes(radius, 2 ** curve, Math.abs(distance + parallel))) {
      const nx = sx * plane.x, ny = sy * plane.y;
      const support = nx * cx + ny * cy + plane.support + parallel + distance * (1 + nx + ny);
      points = clipPolygon(points, nx, ny, support);
      if (!points.length) break;
    }
  }
  const compact = points.filter((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    return Math.hypot(point[0] - previous[0], point[1] - previous[1]) > 1e-7;
  });
  if (compact.length < 3) return '';
  const f = value => String(Math.round(value * 10000) / 10000);
  return compact.map(([x, y], index) => `${index ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ') + ' Z';
}
// Build-time only: sampled parallel contours are baked into the preset assets.
