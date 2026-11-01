import {buildLiquidGlassDisplacement} from '../../src/ui/liquidGlass.js';
import {createContinuousCornerGeometry} from './continuousCornerGeometry.js';
import {encodeStaticRgbaPng} from './staticCornerShadow.js';

const cache = new Map();

// WebKit cannot consume SVG backdrop displacement. Bake only its directional
// reflection at build time; fixed 72px nine-slices preserve the 36px corners
// and 32px lens shoulder while the transparent center stretches freely.
export function createStaticCornerLensSvg(profiles) {
  const key = JSON.stringify(profiles);
  if (cache.has(key)) return cache.get(key);
  const size = 160;
  const radii = profiles.map(profile => profile.radius + profile.offset);
  const geometry = createContinuousCornerGeometry({width:size,height:size,profiles});
  const field = buildLiquidGlassDisplacement({width:size,height:size,radius:radii[0],viewportWidth:size,viewportHeight:size,
    config:{profile:'lens',lensRole:'surface',cornerCurve:profiles[0].curve,cornerRadii:radii,cornerProfiles:profiles}});
  const png = encodeStaticRgbaPng(field.mapWidth,field.mapHeight,field.reflectionRgba).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><clipPath id="shape"><path d="${geometry.path}"/></clipPath></defs><image width="160" height="160" href="data:image/png;base64,${png}" clip-path="url(#shape)"/></svg>\n`;
  cache.set(key,svg);
  return svg;
}
