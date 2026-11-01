import {parse as parseSfc} from '@vue/compiler-sfc';
import {parse as parseTemplate} from '@vue/compiler-dom';
import {parseExpression} from '@babel/parser';
import {presetForClasses,needsStaticCornerMask,STATIC_CORNER_PAINT_CLASSES} from './staticCornerPresets.js';
import {staticBorderPaint,staticShadowPresence} from '../src/ui/staticCornerPaint.js';

export function transformStaticCornerTemplate(source,filename='component.vue'){
  const descriptor=parseSfc(source,{filename}).descriptor,template=descriptor.template;if(!template)return source;
  const edits=[];const ast=parseTemplate(template.content);
  const visit=node=>{if(node.type===1&&node.tagType===0){const classes=(node.props.find(p=>p.type===6&&p.name==='class')?.value?.content||'').split(/\s+/);
    for(const prop of node.props)if(prop.type===7&&prop.name==='bind'&&prop.arg?.content==='class'&&prop.exp){
      const fixed=node=>{if(node.type==='StringLiteral')return node.value.split(/\s+/);if(node.type==='TemplateLiteral'&&!node.expressions.length)return node.quasis[0].value.cooked.split(/\s+/);if(node.type==='ArrayExpression')return node.elements.filter(Boolean).flatMap(fixed);if(node.type==='ConditionalExpression'){const alternate=fixed(node.alternate);return fixed(node.consequent).filter(name=>alternate.includes(name));}return[];};
      try{classes.push(...fixed(parseExpression(prop.exp.content)));}catch{/* A dynamic expression contributes no guaranteed classes. */}
    }
    const preset=presetForClasses(classes);
    if(preset&&!node.props.some(p=>p.type===6&&p.name==='data-ui-static-corner'))edits.push({at:template.loc.start.offset+node.loc.start.offset+1+node.tag.length,text:` data-ui-static-corner="${preset}"${needsStaticCornerMask(classes,preset)?' data-ui-static-paint':''} v-static-corners`});
  }for(const child of node.children||[])visit(child);};visit(ast);
  for(const edit of edits.sort((a,b)=>b.at-a.at))source=source.slice(0,edit.at)+edit.text+source.slice(edit.at);return source;
}
function splitSelectors(value){const result=[];let start=0,depth=0,quote='';for(let i=0;i<value.length;i++){const c=value[i];if(quote){if(c===quote&&value[i-1]!=='\\')quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(c===','&&!depth){result.push(value.slice(start,i).trim());start=i+1;}}result.push(value.slice(start).trim());return result;}
function lastCompound(selector){let start=0,depth=0;for(let i=0;i<selector.length;i++){const c=selector[i];if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(!depth&&(/[>+~]/.test(c)||/\s/.test(c)))start=i+1;}return selector.slice(start);}
export function staticCornerPaintPlugin(){return{postcssPlugin:'static-corner-paint',Once(root){
  const tokens=[];root.walkDecls(declaration=>{if(declaration.prop.startsWith('--')&&!declaration.prop.startsWith('--ui-static-')&&declaration.prop.includes('shadow'))tokens.push(declaration);});
  for(const declaration of tokens)declaration.cloneAfter({prop:`--ui-static-shadow-${declaration.prop.slice(2)}`,value:staticShadowPresence(declaration.value)});
  const rules=[];root.walkRules(rule=>rules.push(rule));for(const rule of rules){if(rule.selector?.includes('ui-static-')||rule.selector?.includes('data-ui-static-'))continue;
    const selectors=splitSelectors(rule.selector||'').filter(selector=>{if(selector.includes('::'))return false;const last=lastCompound(selector);return[...STATIC_CORNER_PAINT_CLASSES].some(name=>new RegExp(`\\.${name}(?![\\w-])`).test(last));});
    if(!selectors.length)continue;const paint=[];
    for(const declaration of [...rule.nodes||[]])if(declaration.type==='decl'){
      if(/^(background(?:-(?:color|image|position|size|repeat|origin|clip|attachment|blend-mode))?|-webkit-backdrop-filter|backdrop-filter)$/.test(declaration.prop))paint.push(declaration.clone());
      // Preserve the stylesheet origin for Vite's subsequent asset URL pass.
      for(const[prop,value]of Object.entries(staticBorderPaint(declaration.prop,declaration.value)))rule.append(declaration.clone({prop,value}));
      if(declaration.prop==='box-shadow')rule.append(declaration.clone({prop:'--ui-static-shadow-enabled',value:staticShadowPresence(declaration.value)}));
    }
    if(paint.length){const mirrored=rule.clone({selector:selectors.map(selector=>`${selector} > .ui-static-corner-skin`).join(', '),nodes:[]});mirrored.append(paint);rule.after(mirrored);}
  }
}};}
export function staticCornersTemplatePlugin(){return{name:'static-corner-templates',enforce:'pre',transform(source,id){if(!id.endsWith('.vue'))return;const code=transformStaticCornerTemplate(source,id);if(code!==source)return{code,map:null};}};}
