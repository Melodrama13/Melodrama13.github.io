// Declared paint only: no computed styles, dimensions, geometry or observers.
export function splitCssWords(value){
  const result=[];let start=0,depth=0,quote='';
  for(let i=0;i<value.length;i++){const c=value[i];if(quote){if(c===quote&&value[i-1]!=='\\')quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='(')depth++;else if(c===')')depth--;else if(/\s/.test(c)&&!depth){if(i>start)result.push(value.slice(start,i));start=i+1;}}
  if(start<value.length)result.push(value.slice(start));return result;
}
const sides=['top','right','bottom','left'];
const cssList = value => {
  const result=[];let depth=0,start=0;
  for(let i=0;i<value.length;i++){if(value[i]==='(')depth++;else if(value[i]===')')depth--;else if(value[i]===','&&!depth){result.push(value.slice(start,i).trim());start=i+1;}}
  result.push(value.slice(start).trim());return result;
};
// Shadow shape is baked. CSS only decides whether the authored recipe has an
// exterior shadow; inset highlights never become a rectangular shadow plane.
export function staticShadowPresence(value){
  const aliases=[];
  for(const part of cssList(value)){
    if(!part||part==='none'||splitCssWords(part).includes('inset'))continue;
    const variable=part.match(/^var\((--[\w-]*shadow[\w-]*)(?:,([\s\S]*))?\)$/);
    if(variable){aliases.push(`var(--ui-static-shadow-${variable[1].slice(2)},${staticShadowPresence(variable[2]||'none')})`);continue;}
    return'1';
  }
  return aliases.length>1?`max(${aliases.join(',')})`:aliases[0]||'0';
}
const maskWidth=value=>Number.parseFloat(value)||0;
export function staticBorderPaint(property,value){
  const result={};if(!property.startsWith('border')||property==='border-radius'||property.startsWith('border-image'))return result;
  const side=sides.find(name=>property.startsWith(`border-${name}`));
  const suffix=side?property.slice(`border-${side}`.length):property.slice(6);
  // A unitless CSS zero is legal for border-width but not for length
  // subtraction in the skin's calc() insets.
  const assignWidth=(name,width)=>{result[`--ui-static-${name}-width`]=/^0(?:\.0+)?$/.test(width.trim())?'0px':width;result[`--ui-static-${name}-opacity`]=maskWidth(width)?'1':'0';result[`--ui-static-${name}-mask`]=`var(--ui-static-mask-${name}-${maskWidth(width)})`;};
  const uniformWidth=width=>{for(const name of sides)assignWidth(name,width);result['--ui-static-stroke-opacity']=maskWidth(width)?'1':'0';result['--ui-static-stroke-mask']=`var(--ui-static-mask-stroke-${maskWidth(width)})`;};
  const assignColor=(name,color)=>{result[name?`--ui-static-${name}-color`:'--ui-static-stroke-color']=color;if(!name)for(const s of sides)result[`--ui-static-${s}-color`]=color;};
  const display=(name,style)=>{result[name?`--ui-static-${name}-display`:'--ui-static-stroke-display']=style==='none'?'none':'block';};
  if(!suffix){const words=splitCssWords(value),width=words.find(word=>/^(?:\d*\.?\d+)(?:px|rem|em)?$/.test(word))||(value==='none'?'0px':'1px');
    const style=words.find(word=>/^(none|solid|dashed|dotted|double|groove|ridge|inset|outset|hidden)$/.test(word))||'none';
    const color=words.filter(word=>word!==width&&word!==style).join(' ')||'currentColor';
    if(side){assignWidth(side,width);assignColor(side,color);display(side,style);result['--ui-static-side-mask']=`var(--ui-static-${side}-mask)`;result['--ui-static-side-color']=`var(--ui-static-${side}-color)`;result['--ui-static-side-display']=`var(--ui-static-${side}-display)`;result['--ui-static-side-opacity']=`var(--ui-static-${side}-opacity)`;}
    else{uniformWidth(width);assignColor(null,color);display(null,style);result['--ui-static-side-display']='none';if(style==='dashed')result['--ui-static-stroke-mask']=`var(--ui-static-mask-stroke-dashed-${maskWidth(width)})`;result['--ui-static-stroke-repeat']=style==='dashed'?'round':'stretch';}
  }else if(suffix==='-color'){assignColor(side,value);if(side){result['--ui-static-side-mask']=`var(--ui-static-${side}-mask)`;result['--ui-static-side-color']=`var(--ui-static-${side}-color)`;result['--ui-static-side-display']=`var(--ui-static-${side}-display)`;result['--ui-static-side-opacity']=`var(--ui-static-${side}-opacity)`;}}
  else if(suffix==='-width'){if(side)assignWidth(side,value);else uniformWidth(value);}
  else if(suffix==='-style'){display(side,value);if(side){result['--ui-static-side-mask']=`var(--ui-static-${side}-mask)`;result['--ui-static-side-color']=`var(--ui-static-${side}-color)`;result['--ui-static-side-display']=`var(--ui-static-${side}-display)`;result['--ui-static-side-opacity']=`var(--ui-static-${side}-opacity)`;}}
  return result;
}
