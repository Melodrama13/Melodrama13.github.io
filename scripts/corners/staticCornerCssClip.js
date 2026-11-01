// Build-time only. Native clips avoid image-mask tile invalidation during
// WebKit scrolling; coordinates come from the existing continuous contours.
import { insetContinuousCornerGeometry } from './continuousCornerGeometry.js';
const rounded = value => Math.round(value * 1000) / 1000;
const pointDistance = (point, a, b) => {
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(point[0]-a[0]-dx*t,point[1]-a[1]-dy*t);
};
function simplifyOpen(points,tolerance) {
  if(points.length<=2)return points;
  let farthest=0,index=0;
  for(let i=1;i<points.length-1;i++){
    const distance=pointDistance(points[i],points[0],points.at(-1));
    if(distance>farthest){farthest=distance;index=i;}
  }
  if(farthest<=tolerance)return[points[0],points.at(-1)];
  return [...simplifyOpen(points.slice(0,index+1),tolerance).slice(0,-1),...simplifyOpen(points.slice(index),tolerance)];
}
function contour(path,offset) {
  if(/[CQAS]/i.test(path))throw new TypeError('CSS clips require the baked polygon contour');
  const points=[...path.matchAll(/[ML]\s*([-\d.]+)[ ,]+([-\d.]+)/g)].map(match=>[Number(match[1])+offset,Number(match[2])+offset]);
  if(points.length<3)throw new TypeError('CSS clip requires a closed contour');
  let split=1;
  for(let i=2;i<points.length;i++)if(Math.hypot(points[i][0]-points[0][0],points[i][1]-points[0][1])>Math.hypot(points[split][0]-points[0][0],points[split][1]-points[0][1]))split=i;
  return [...simplifyOpen(points.slice(0,split+1),.025).slice(0,-1),...simplifyOpen([...points.slice(split),points[0]],.025)];
}
export function createStaticCornerCssClipDeclarations(geometry,{shadowPadding=0}={}) {
  const coordinate=(value,size)=>value>size/2?`calc(100% - ${rounded(size-value)}px)`:`${rounded(value)}px`;
  const coordinates=(source,offset,box=geometry)=>contour(source.path,offset).map(([x,y])=>`${coordinate(x,box.width)} ${coordinate(y,box.height)}`).join(',');
  const declarations={
    '--ui-static-clip-outer':coordinates(geometry,0),
    '--ui-static-clip-fill':'polygon(var(--ui-static-clip-outer))'
  };
  for(const width of[1,2]) {
    declarations[`--ui-static-clip-inner-${width}`]=coordinates(insetContinuousCornerGeometry(geometry,width),width);
    declarations[`--ui-static-clip-stroke-${width}`]=`polygon(evenodd,var(--ui-static-clip-outer),var(--ui-static-clip-inner-${width}))`;
  }
  if(shadowPadding>0) {
    const box={width:geometry.width+shadowPadding*2,height:geometry.height+shadowPadding*2};
    const right=coordinate(box.width,box.width),bottom=coordinate(box.height,box.height);
    declarations['--ui-static-clip-shadow-outside']=`polygon(evenodd,0px 0px,${right} 0px,${right} ${bottom},0px ${bottom},0px 0px,${coordinates(geometry,shadowPadding,box)})`;
  }
  return declarations;
}
