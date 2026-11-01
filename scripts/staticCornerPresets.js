// Container catalog is consumed only by the Vue/CSS build transforms.
const CONTINUOUS_CORNER_ROLES = {
  panel: ['card-panel','preview-config-panel','preview-panel','filter-panel','precedent-panel','card-detail-tooltip','tooltip-content','birthday-info-popover',
    'source-menu','app-update-modal','app-screenshot-modal','source-export-confirm','screenshot-export-modal','song-screenshot-modal','predict-switch-dialog-card','predict-drawer','special-toolbar','special-lock-inner'],
  group: ['stats-subsection','support-card','lineup-card','festival-card','duo-unit-row','duo-matrix-wrap','attr-summary-card','record-block','special-limited-unit-segment',
    'preview-char-select','preview-daily-card','preview-char-attr-card','event-item','birthday-row','birthday-info-card','event-detail-overview','event-detail-card','editor-card',
    'configuration-card','precedent-record','source-list','io-drop-zone','special-toolbar-group','special-toolbar-actions','special-toolbar-colors','special-toolbar-text',
    'song-stat-card','song-role-card','song-anvo-card','song-duo-unit-card','song-oc-event-unit-card','song-vs-event-unit-card','song-3dmv-unit-card','song-2dmv-unit-card',
    'song-cover-album-group','song-cover-album-card','song-cover-album-extra','song-book-round-table-card','song-april-year-card'],
  compact: ['count-table','matrix-wrap','attr-summary-table','festival-card-table','score-attr-wrap','year-stats-wrap','song-list-wrap','song-insight-scroll','song-vs-event-image-group',
    'song-disclaimer','source-item-row','settings-help-popover','history-record-picker-menu','history-record-picker-option','pool-disable-popover'],
};

const corner=(radius,offset=0,curve=1.5)=>({radius,offset,curve});
const uniform=(radius,curve=1.5)=>Array.from({length:4},()=>corner(radius,0,curve));
const parallel=(radius,gap,curve=1.5)=>Array.from({length:4},()=>corner(radius,gap,curve));
// Layout and contours share this build-time contract. Feature CSS consumes the
// emitted tokens and their matching contours switch together in CSS only.
export const STATIC_SURFACE_LAYOUT=Object.freeze({panelPadding:14,groupPadding:8,headerInset:10,groupHeaderInset:6,controlPadding:7,border:1,tableRadius:21,groupRadius:26,panelRadius:36,compactRadius:18,controlRadius:15,summaryPadding:6,summaryChipHeight:26});
function surfaceTokens(layout){return {
  '--ui-surface-panel-padding':`${layout.panelPadding}px`,
  '--ui-surface-group-padding':`${layout.groupPadding}px`,
  '--ui-surface-header-inset':`${layout.headerInset}px`,
  '--ui-surface-group-header-inset':`${layout.groupHeaderInset}px`,
  '--ui-surface-control-padding':`${layout.controlPadding}px`,
  '--ui-surface-summary-padding':`${layout.summaryPadding}px`,
  '--ui-surface-summary-chip-height':`${layout.summaryChipHeight}px`
};}
export const STATIC_SURFACE_TOKENS=Object.freeze(surfaceTokens(STATIC_SURFACE_LAYOUT));
export const STATIC_SURFACE_GROUP_CLASSES=new Set(['stats-subsection','support-card','lineup-card','attr-summary-card','record-block','duo-unit-row','configuration-card','precedent-record','event-detail-overview','event-detail-card',
  'song-role-card','song-stat-card','song-anvo-card','song-duo-unit-card','song-oc-event-unit-card','song-vs-event-unit-card','song-3dmv-unit-card','song-2dmv-unit-card','song-cover-album-group','song-april-year-card',
  'preview-char-select','preview-daily-card','preview-char-attr-card','special-toolbar-group','special-toolbar-text','special-toolbar-colors']);
function surfacePresets(layout){
const {panelRadius,groupRadius,compactRadius}=layout;
const panelInset=layout.panelPadding+layout.border,groupInset=layout.groupPadding+layout.border;
return {
  panel:uniform(panelRadius),group:uniform(groupRadius),compact:uniform(compactRadius),small:uniform(14),zero:uniform(0),
  table:uniform(layout.tableRadius),
  sheet:[corner(36),corner(36),corner(0),corner(0)],
  config:uniform(layout.controlRadius+layout.border+layout.controlPadding),
  float:parallel(groupRadius,groupInset),
  album:parallel(groupRadius,groupInset),groupStackPanel:parallel(groupRadius,groupInset+panelInset),
  tableCard:parallel(layout.tableRadius,panelInset),tableSection:parallel(layout.tableRadius,panelInset*2),
  compactGroup:parallel(layout.tableRadius,groupInset),compactGroupPanel:parallel(layout.tableRadius,groupInset+panelInset),
  groupStack:parallel(groupRadius,groupInset),groupPanel:parallel(groupRadius,panelInset),groupSection:parallel(groupRadius,panelInset*2)
};}
export const STATIC_CORNER_PRESETS=surfacePresets(STATIC_SURFACE_LAYOUT);
// Build-time alternatives; viewport changes select existing SVGs, never derive
// geometry. Unchanged table/group/control shapes keep sharing the same assets.
export const STATIC_SURFACE_MODES=[
  {name:'compact',media:'(max-width: 900px)',panelPadding:10,groupPadding:6,headerInset:8,groupHeaderInset:8,panelRadius:32},
  {name:'phone',media:'(max-width: 520px)',panelPadding:6,groupPadding:4,headerInset:8,groupHeaderInset:8,panelRadius:28}
].map(({name,media,...values})=>{
  const layout={...STATIC_SURFACE_LAYOUT,...values},presets={};
  for(const [preset,profiles]of Object.entries(surfacePresets(layout))){
    if(JSON.stringify(profiles)===JSON.stringify(STATIC_CORNER_PRESETS[preset]))continue;
    const variant=`${preset}-${name}`;
    STATIC_CORNER_PRESETS[variant]=profiles;
    presets[preset]=variant;
  }
  return {name,media,layout,tokens:surfaceTokens(layout),presets};
});
export const STATIC_CORNER_CLASS_ROLES=new Map(Object.entries(CONTINUOUS_CORNER_ROLES).flatMap(([role,classes])=>classes.map(name=>[name,role])));
// Exact parallel offsets use baked masks even in engines with native corners.
export function needsStaticCornerMask(classes,preset){
  return STATIC_CORNER_PRESETS[preset]?.some(profile=>profile.offset!==0)
    ||classes.includes('preview-config-panel')||classes.includes('section-main')||classes.includes('record-block');
}
STATIC_CORNER_CLASS_ROLES.set('global-config-bar','config');
// These are deliberately capsules, artwork or tiny inline labels, not frames.
export const STATIC_CORNER_EXCLUDED_CLASSES=new Set(['pool-item','preview-step','special-multi-source-option','duo-unit-wrap']);
export function presetForClasses(classes){
  if(classes.some(name=>STATIC_CORNER_EXCLUDED_CLASSES.has(name)))return null;
  if(classes.includes('global-config-bar'))return'config';
  if(classes.includes('predict-drawer'))return'zero';
  if(classes.some(name=>['preview-config-panel','preview-panel','special-toolbar'].includes(name)))return'float';
  if(classes.includes('birthday-row')||classes.includes('source-item-row')||classes.includes('tooltip-content'))return'compact';
  if(classes.includes('special-toolbar-range')||classes.includes('special-toolbar-colors'))return'compact';
  if(classes.includes('song-cover-album-group'))return'album';
  if(classes.includes('song-cover-album-panel'))return'groupStackPanel';
  if(classes.includes('attr-summary-card'))return'compactGroup';
  if(classes.includes('attr-summary-panel')||classes.includes('duo-panel'))return'compactGroupPanel';
  if(classes.includes('festival-panel'))return'tableSection';
  if(classes.includes('lineup-panel')||classes.includes('support-panel')||classes.includes('related-panel'))return'groupPanel';
  if(classes.some(name=>['duo-unit-section','special-limited-record-block','song-oc-event-unit-card','song-duo-unit-card'].includes(name)))return'groupStack';
  if(classes.includes('duo-record-block'))return'compactGroup';
  if(classes.some(name=>['count-table','matrix-wrap','year-stats-wrap','attr-summary-table','festival-card-table','song-list-wrap','song-insight-scroll','song-book-round-table-card'].includes(name)))return'table';
  if(classes.includes('card-panel')&&!classes.includes('stats-nav'))return'tableCard';
  for(const[role,names]of Object.entries(CONTINUOUS_CORNER_ROLES))if(classes.some(name=>names.includes(name)))return role;
  return null;
}

// State selection is CSS-only. Spacing comes from authored layout, not DOM reads.
export const STATIC_CORNER_VARIANTS=[
  {selector:'.preview-char-select.is-collapsed',preset:'compact'},
  {selector:'.predict-drawer.is-mobile-sheet',preset:'sheet'},
  {selector:'.editor-card',preset:'compact',media:'(max-width: 900px)'},
  {selector:'.card-panel:has(> .card-panel, > .stats-grid > .card-panel)',preset:'tableSection'},
  {selector:':is(#panel-another-vocal,#panel-3dmv-stats,#panel-2dmv-stats,#panel-april-fool-stats,#panel-vs-song-stats)',preset:'groupPanel'},
  {selector:':is(#panel-duo-stats,#panel-oc-book-stats,#panel-special)',preset:'groupStackPanel'},
];
export const STATIC_CORNER_PILL_SELECTOR='.preview-config-panel.is-collapsed,.preview-panel.is-collapsed,.special-toolbar-actions:not(.has-cover)';
export const STATIC_CORNER_CLIP_SELECTOR='.song-cover-album-card,.song-cover-album-extra,.special-limited-unit-segment,.score-attr-wrap,.attr-summary-table,table.count-table,table.festival-card-table';
// Every declaration mirrored by the compiler is still owned by its original UI.
export const STATIC_CORNER_PAINT_CLASSES=new Set([...STATIC_CORNER_CLASS_ROLES.keys(),
 'ui-liquid-glass','ui-liquid-glass--prominent','ui-liquid-glass--regular','ui-liquid-glass--modal','ui-glass-optical-detail','ui-liquid-glass--chip',
 'stats-section','section-main','stats-nav','matrix-panel','related-panel','duo-record-block','source-drop-zone','precedent-surface','event-detail-surface']);
