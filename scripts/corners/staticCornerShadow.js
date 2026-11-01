import { deflateSync } from 'node:zlib';

// Build-time rasterization avoids WebKit clipping SVG filter output when an
// image is split into border-image tiles. The 2x bitmap stays in a fixed-size
// SVG wrapper, so existing CSS slice coordinates and corner sizes are unchanged.
const SCALE = 2, SIZE = 176, PADDING = 24, OFFSET_Y = 4, SIGMA = 4;

function flatten(path) {
  const points = [];
  let previous;
  for (const match of path.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const values = (match[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
    if (match[1] === 'M' || match[1] === 'L') points.push(previous = values);
    else if (match[1] === 'C') {
      const [x,y] = previous, [ax,ay,bx,by,ex,ey] = values;
      for (let step = 1; step <= 16; step++) {
        const t = step / 16, u = 1 - t;
        points.push([u**3*x + 3*u*u*t*ax + 3*u*t*t*bx + t**3*ex,
          u**3*y + 3*u*u*t*ay + 3*u*t*t*by + t**3*ey]);
      }
      previous = [ex,ey];
    }
  }
  return points;
}

function coverage(points, size) {
  const pixels = new Float32Array(size * size);
  // Integrate horizontal pixel coverage; two vertical samples give four
  // samples per CSS pixel along each axis at the output's 2x resolution.
  for (let y = 0; y < size; y++) for (let sample = 0; sample < 2; sample++) {
    const line = (y + (sample + .5) / 2) / SCALE - PADDING;
    const intersections = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax,ay] = points[j], [bx,by] = points[i];
      if ((ay > line) !== (by > line)) intersections.push((ax + (line-ay) * (bx-ax) / (by-ay) + PADDING) * SCALE);
    }
    intersections.sort((a,b) => a-b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const start = intersections[i], end = intersections[i+1];
      for (let x = Math.max(0,Math.floor(start)); x < Math.min(size,Math.ceil(end)); x++) {
        pixels[y*size+x] += Math.max(0,Math.min(x+1,end)-Math.max(x,start)) / 2;
      }
    }
  }
  return pixels;
}

function blur(source, size) {
  const sigma = SIGMA * SCALE, radius = Math.ceil(sigma * 3);
  const weights = Array.from({ length: radius*2+1 }, (_,i) => Math.exp(-((i-radius)**2)/(2*sigma*sigma)));
  const total = weights.reduce((sum,value) => sum+value,0);
  const horizontal = new Float32Array(source.length), output = new Float32Array(source.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let value = 0;
    for (let k = -radius; k <= radius; k++) if (x+k >= 0 && x+k < size) value += source[y*size+x+k] * weights[k+radius];
    horizontal[y*size+x] = value / total;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let value = 0;
    for (let k = -radius; k <= radius; k++) if (y+k >= 0 && y+k < size) value += horizontal[(y+k)*size+x] * weights[k+radius];
    output[y*size+x] = value / total;
  }
  return output;
}

const crcTable = Array.from({length:256}, (_,index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function chunk(type, data) {
  const bytes = Buffer.concat([Buffer.from(type),data]);
  let crc = 0xffffffff;
  for (const value of bytes) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length); bytes.copy(output,4); output.writeUInt32BE((crc ^ 0xffffffff) >>> 0,output.length-4);
  return output;
}
function png(size, alpha, color, opacity) {
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size,4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc((size*4+1)*size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const offset = y*(size*4+1)+1+x*4, value = Math.round(255*opacity*alpha[y*size+x]);
    if (value) { rows[offset] = color[0]; rows[offset+1] = color[1]; rows[offset+2] = color[2]; rows[offset+3] = value; }
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}

export function createStaticCornerShadowImages(geometry) {
  const size = SIZE * SCALE, mask = coverage(flatten(geometry.path),size);
  const shifted = new Float32Array(mask.length), shift = OFFSET_Y * SCALE;
  shifted.set(mask.subarray(0,size*(size-shift)),size*shift);
  const alpha = blur(shifted,size);
  for (let i = 0; i < alpha.length; i++) alpha[i] *= 1-mask[i];
  return Object.fromEntries([
    ['light',[15,23,42],.16], ['dark',[0,0,0],.30]
  ].map(([name,color,opacity]) => [name, `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"><image width="${SIZE}" height="${SIZE}" href="data:image/png;base64,${png(size,alpha,color,opacity).toString('base64')}"/></svg>`]));
}
