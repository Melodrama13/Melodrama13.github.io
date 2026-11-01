// Build-time only. CSS superellipse(K) uses exponent 2 ** K. Coordinates stay in CSS pixels:
// stretching a normalized square path would also stretch a long panel's corners.
import { buildParallelCornerPath } from './continuousCornerOffsets.js';
const geometryCache = new Map();
const offsetCache = new Map();
const curveTables = new Map();
const GRID = 96;

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function createContinuousCornerGeometry({ width, height, radii = 18, curve = 2, profiles } = {}) {
  width = positive(width);
  height = positive(height);
  curve = Number.isFinite(Number(curve)) ? Math.max(0, Math.min(4, Number(curve))) : 2;
  const values = Array.isArray(radii) ? radii : [radii, radii, radii, radii];
  radii = Array.from({ length: 4 }, (_, i) => positive(values[i] ?? values[0]));
  if (profiles) {
    profiles = Array.from({ length: 4 }, (_, index) => {
      const profile = profiles[index] || {};
      return { radius: positive(profile.radius ?? radii[index]),
        curve: Number.isFinite(profile.curve) ? Math.max(0, Math.min(4, profile.curve)) : curve,
        offset: Number.isFinite(profile.offset) ? profile.offset : 0 };
    });
    radii = profiles.map(profile => Math.max(0, profile.radius + profile.offset));
  }
  const [tl, tr, br, bl] = radii;
  const factor = Math.min(1, width / (tl + tr || 1), width / (bl + br || 1), height / (tl + bl || 1), height / (tr + br || 1));
  radii = radii.map(radius => radius * factor);
  if (profiles) profiles = profiles.map(profile => Object.freeze({ ...profile, radius: profile.radius * factor, offset: profile.offset * factor }));
  const key = [width, height, curve, ...radii, profiles ? JSON.stringify(profiles) : ''].join('|');
  if (geometryCache.has(key)) return geometryCache.get(key);
  const model = { width, height, radii: Object.freeze(radii), curve, ...(profiles ? { profiles: Object.freeze(profiles) } : {}) };
  const geometry = Object.freeze({ ...model,
    path: width && height ? profiles ? buildParallelCornerPath(model, 0) : buildPath(width, height, radii, 2 ** curve) : '',
    ...(profiles ? { cornerSamplers: Object.freeze(profiles.map(profile => offsetContinuousCornerGeometry(
      createContinuousCornerGeometry({ width: profile.radius * 2, height: profile.radius * 2, radii: profile.radius, curve: profile.curve }), profile.offset))) } : {}) });
  if (geometryCache.size >= 128) geometryCache.delete(geometryCache.keys().next().value);
  geometryCache.set(key, geometry);
  return geometry;
}

// The returned path is local to the inset box; place it at (inset, inset).
export function insetContinuousCornerGeometry(geometry, inset = 0) {
  return offsetContinuousCornerGeometry(geometry, -positive(inset));
}

/** Relative straight edges let CSS resize a fixed contour without measuring
 * the element again. Corner coordinates remain CSS px, never stretched. */
export function createContinuousCornerCssShape(geometry, { cutout, inset = 0 } = {}) {
  const coordinate = (value, size) => value > size / 2
    ? `calc(100% - ${Math.round((size-value)*10000)/10000}px)` : `${Math.round(value*10000)/10000}px`;
  const commands = [];
  for(const [index,part] of [{path:geometry.path,offset:0},...(cutout?[{path:cutout.path,offset:inset}]:[])].entries()){
    for(const match of part.path.matchAll(/([MLCZ])([^MLCZ]*)/g)){
      const values=(match[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number);
      const point = i => `${coordinate(values[i]+part.offset,geometry.width)} ${coordinate(values[i+1]+part.offset,geometry.height)}`;
      if(match[1]==='M')commands.push(`${index?'move to':'from'} ${point(0)}`);
      else if(match[1]==='L')commands.push(`line to ${point(0)}`);
      else if(match[1]==='C')commands.push(`curve to ${point(4)} with ${point(0)} / ${point(2)}`);
      else commands.push('close');
    }
  }
  return `shape(${cutout?'evenodd ':''}${commands.join(', ')})`;
}

/** Positive offsets expand; negative offsets erode. The path is local to the
 * new box. Place an inset at (inset,inset), or an outset at (-outset,-outset).
 * Radius metadata describes tangent extents, not a replacement superellipse.
 */
export function offsetContinuousCornerGeometry(geometry, offset = 0) {
  offset = Number.isFinite(Number(offset)) ? Number(offset) : 0;
  const base = geometry.baseGeometry || geometry;
  const distance = (geometry.parallelOffset || 0) + offset;
  if (distance === 0) return base;
  const key = [base.width, base.height, base.curve, ...base.radii, base.profiles ? JSON.stringify(base.profiles) : '', distance].join('|');
  if (offsetCache.has(key)) return offsetCache.get(key);
  const result = Object.freeze({
    width: Math.max(0, base.width + distance * 2), height: Math.max(0, base.height + distance * 2),
    curve: base.curve, radii: Object.freeze(base.radii.map(radius => Math.max(0, radius + distance))),
    path: buildParallelCornerPath(base, distance), baseGeometry: base, parallelOffset: distance,
  });
  if (offsetCache.size >= 128) offsetCache.delete(offsetCache.keys().next().value);
  offsetCache.set(key, result);
  return result;
}

function buildPath(width, height, radii, power) {
  const f = number => String(Math.round(number * 10000) / 10000);
  const path = [`M${f(radii[0])} 0`, `L${f(width - radii[1])} 0`];
  const transforms = [
    (x,y,r) => [width-r+r*x, r-r*y],
    (x,y,r) => [width-r+r*y, height-r+r*x],
    (x,y,r) => [r-r*x, height-r+r*y],
    (x,y,r) => [r-r*y, r-r*x]
  ];
  const corners = [radii[1],radii[2],radii[3],radii[0]];
  for (let i = 0; i < 4; i++) {
    const radius = corners[i];
    if (radius) {
      const halves = fitHalf(power, radius);
      const segments = [...halves, ...halves.toReversed().map(segment =>
        [segment[3], segment[2], segment[1], segment[0]].map(([x,y]) => [y,x]))];
      for (const segment of segments) {
        path.push(`C${segment.slice(1).map(([x,y]) => transforms[i](x,y,radius).map(f).join(' ')).join(' ')}`);
      }
    }
    if (i === 0) path.push(`L${f(width)} ${f(height-radii[2])}`);
    if (i === 1) path.push(`L${f(radii[3])} ${f(height)}`);
    if (i === 2) path.push(`L0 ${f(radii[0])}`);
  }
  return `${path.join(' ')} Z`;
}

function fitHalf(power, radius) {
  const segments = [];
  const y = x => Math.pow(Math.max(0,1-x ** power), 1/power);
  const slope = x => -Math.pow(x, power-1) * Math.pow(Math.max(1e-12,1-x ** power), 1/power-1);
  const fit = (a,b,depth) => {
    const dx = (b-a)/3;
    const segment = [[a,y(a)],[a+dx,y(a)+dx*slope(a)],[b-dx,y(b)-dx*slope(b)],[b,y(b)]];
    let error = 0;
    for (const t of [0.25,0.5,0.75]) {
      const u = 1-t;
      const value = u**3*segment[0][1]+3*u*u*t*segment[1][1]+3*u*t*t*segment[2][1]+t**3*segment[3][1];
      error = Math.max(error,Math.abs(value-y(a+(b-a)*t))*radius);
    }
    if (error > 0.002 && depth < 10) { const mid = (a+b)/2; fit(a,mid,depth+1); fit(mid,b,depth+1); }
    else segments.push(segment);
  };
  fit(0,Math.pow(0.5,1/power),0);
  return segments;
}

// A small curve-specific distance/normal table removes iterative closest-point
// searches from the displacement-map pixel loop. Straight regions skip it.
function getCurveTable(curve) {
  if (curveTables.has(curve)) return curveTables.get(curve);
  const power = 2 ** curve;
  const diagonal = Math.pow(0.5,1/power);
  const points = [];
  for (let i=0;i<=128;i++) {
    const x = diagonal*i/128;
    points.push([x,Math.pow(Math.max(0,1-x**power),1/power)]);
  }
  points.push(...points.slice(0,-1).toReversed().map(([x,y])=>[y,x]));
  const distance = new Float32Array((GRID+1)**2);
  const nx = new Float32Array(distance.length);
  const ny = new Float32Array(distance.length);
  for (let y=0;y<=GRID;y++) for(let x=0;x<=GRID;x++) {
    const qx=x/GRID,qy=y/GRID;
    let best=Infinity,bx=0,by=1;
    for(let i=1;i<points.length;i++) {
      const [ax,ay]=points[i-1], [ex,ey]=points[i];
      const dx=ex-ax,dy=ey-ay;
      const t=Math.max(0,Math.min(1,((qx-ax)*dx+(qy-ay)*dy)/(dx*dx+dy*dy)));
      const cx=ax+t*dx,cy=ay+t*dy, squared=(cx-qx)**2+(cy-qy)**2;
      if(squared<best){best=squared;bx=cx;by=cy;}
    }
    const index=y*(GRID+1)+x;
    distance[index]=Math.sqrt(best)*(qx**power+qy**power<=1 ? 1 : -1);
    const gx=bx**(power-1),gy=by**(power-1),length=Math.hypot(gx,gy)||1;
    nx[index]=gx/length;ny[index]=gy/length;
  }
  const table={distance,nx,ny};
  if(curveTables.size>=8)curveTables.delete(curveTables.keys().next().value);
  curveTables.set(curve,table);
  return table;
}

export function sampleContinuousCorner(geometry, x, y) {
  if (geometry.baseGeometry) {
    const distance = geometry.parallelOffset;
    const base = geometry.baseGeometry, sourceX = x - distance, sourceY = y - distance;
    const outside = sourceX < 0 || sourceY < 0 || sourceX > base.width || sourceY > base.height;
    const sample = outside && !base.profiles ? sampleOutsideCorner(base, sourceX, sourceY) : sampleContinuousCorner(base, sourceX, sourceY);
    return { ...sample, distance: sample.distance + distance };
  }
  const {width,height,radii,curve}=geometry;
  let distance=x,normalX=-1,normalY=0;
  if(width-x<distance){distance=width-x;normalX=1;}
  if(y<distance){distance=y;normalX=0;normalY=-1;}
  if(height-y<distance){distance=height-y;normalX=0;normalY=1;}
  for(let i=0;i<4;i++) {
    const r=radii[i],sx=i===1||i===2?1:-1,sy=i>=2?1:-1;
    const localX=sx===1?width-x:x,localY=sy===1?height-y:y;
    if(!r||localX>=r||localY>=r)continue;
    if (geometry.cornerSamplers) {
      const sample = sampleContinuousCorner(geometry.cornerSamplers[i], localX, localY);
      if (sample.distance < distance) { distance = sample.distance; normalX = -sx * sample.normalX; normalY = -sy * sample.normalY; }
      continue;
    }
    const table=getCurveTable(curve);
    const qx=Math.min(GRID,Math.max(0,(1-localX/r)*GRID));
    const qy=Math.min(GRID,Math.max(0,(1-localY/r)*GRID));
    const ix=Math.min(GRID-1,Math.floor(qx)),iy=Math.min(GRID-1,Math.floor(qy));
    const tx=qx-ix,ty=qy-iy,index=iy*(GRID+1)+ix;
    const interpolate = values => (values[index]*(1-tx)+values[index+1]*tx)*(1-ty)
      +(values[index+GRID+1]*(1-tx)+values[index+GRID+2]*tx)*ty;
    const d=interpolate(table.distance)*r;
    if(d<distance){distance=d;normalX=sx*interpolate(table.nx);normalY=sy*interpolate(table.ny);}
  }
  const length=Math.hypot(normalX,normalY)||1;
  return {distance,normalX:normalX/length,normalY:normalY/length};
}

// Outsets can sample beyond the original box. The legacy inside-box LUT stays
// byte-identical; only that new region needs a closest-point projection.
function sampleOutsideCorner(geometry, x, y) {
  for (let index = 0; index < 4; index++) {
    const radius = geometry.radii[index], sx = index === 1 || index === 2 ? 1 : -1, sy = index >= 2 ? 1 : -1;
    const localX = sx > 0 ? geometry.width - x : x, localY = sy > 0 ? geometry.height - y : y;
    if (localX >= radius || localY >= radius) continue;
    if (!radius) {
      const dx = x - (sx > 0 ? geometry.width : 0), dy = y - (sy > 0 ? geometry.height : 0), length = Math.hypot(dx, dy);
      return { distance: -length, normalX: dx / length, normalY: dy / length };
    }
    const qx = 1 - localX / radius, qy = 1 - localY / radius, power = 2 / (2 ** geometry.curve);
    const point = angle => angle === 0 ? [1, 0] : angle === Math.PI / 2 ? [0, 1]
      : [Math.cos(angle) ** power, Math.sin(angle) ** power];
    const squared = angle => { const [px, py] = point(angle); return (px - qx) ** 2 + (py - qy) ** 2; };
    let a = 0, b = Math.PI / 2;
    const ratio = (Math.sqrt(5) - 1) / 2;
    let c = b - ratio * (b - a), d = a + ratio * (b - a), fc = squared(c), fd = squared(d);
    for (let step = 0; step < 36; step++) {
      if (fc < fd) { b = d; d = c; fd = fc; c = b - ratio * (b - a); fc = squared(c); }
      else { a = c; c = d; fc = fd; d = a + ratio * (b - a); fd = squared(d); }
    }
    const best = [0, (a + b) / 2, Math.PI / 2].reduce((best, angle) => squared(angle) < squared(best) ? angle : best, 0);
    const [px, py] = point(best), dx = qx - px, dy = qy - py, length = Math.hypot(dx, dy);
    return { distance: -length * radius, normalX: sx * dx / length, normalY: sy * dy / length };
  }
  return sampleContinuousCorner(geometry, x, y);
}
