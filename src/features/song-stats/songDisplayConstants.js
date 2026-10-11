

export const DELETED_SONG_ID_SET = new Set([241, 290]);

export const SONG_DIFFICULTY_ORDER = Object.freeze([
  { key: 'easy', label: 'EASY' },
  { key: 'normal', label: 'NORMAL' },
  { key: 'hard', label: 'HARD' },
  { key: 'expert', label: 'EXPERT' },
  { key: 'master', label: 'MASTER' },
  { key: 'append', label: 'APPEND' }
]);

export const SONG_STAT_CARD_TINT_ALPHA = 0.2;

export const DIFFICULTY_SORT_OPTIONS = Object.freeze([
  { value: 'easy', label: 'EASY' },
  { value: 'normal', label: 'NORMAL' },
  { value: 'hard', label: 'HARD' },
  { value: 'expert', label: 'EXPERT' },
  { value: 'master', label: 'MASTER' },
  { value: 'append', label: 'APPEND' }
]);

export const SONG_PAGE_SIZE_OPTIONS = Object.freeze([10, 20, 30, 50, 100]);

export const MV_TAG_MAP = Object.freeze({
  '3dmv': { label: '3D', tone: 'is-3d' },
  '2dmv': { label: '2D', tone: 'is-2d' },
  'vs_2dmv': { label: '2D(VS)', tone: 'is-vs2d' },
  original: { label: '原画', tone: 'is-original' },
  image: null
});

export const UNIT_TAG_ICON_MAP = Object.freeze({
  ln: '/elements/ln.png',
  mmj: '/elements/mmj.png',
  vbs: '/elements/vbs.png',
  ws: '/elements/ws.png',
  nc: '/elements/nc.png',
  vs: '/elements/vs.png'
});

export const LOCAL_SONG_JACKET_BASE_PATH = '/songs';

export const PROJECT_GITHUB_ISSUES_URL = 'https://github.com/Melodrama13/Melodrama13.github.io/issues';

export const UNIT_TITLE_LOGO_MAP = Object.freeze({
  ln: '/elements/Leo_need.png',
  mmj: '/elements/MORE_MORE_JUMP!.png',
  vbs: '/elements/Vivid_BAD_SQUAD.png',
  ws: '/elements/ワンダーランズ×ショウタイム.png',
  nc: '/elements/25時、ナイトコードで.png',
  vs: '/elements/virtual_singer.png'
});

export const BASE_UNIT_COLOR_MAP = Object.freeze({
  ln: '#4455dd',
  mmj: '#88dd44',
  vbs: '#ee1166',
  ws: '#ff9900',
  nc: '#884499',
  vs: '#33aaee'
});

export const GROUP_FILTER_OPTIONS = Object.freeze([
  { value: 'all', label: '团体' },
  { value: 'vs', label: 'VS' },
  { value: 'ln', label: 'LN' },
  { value: 'mmj', label: 'MMJ' },
  { value: 'vbs', label: 'VBS' },
  { value: 'ws', label: 'WS' },
  { value: 'nc', label: 'NC' },
  { value: 'other', label: '其他' }
]);

export const UNIT_NAV_LABEL_MAP = Object.freeze({
  ln: 'LN',
  mmj: 'MMJ',
  vbs: 'VBS',
  ws: 'WS',
  nc: 'NC'
});

export const UNIT_TAG_ABBR_MAP = Object.freeze({
  ln: 'ln',
  mmj: 'mmj',
  vbs: 'vbs',
  ws: 'ws',
  nc: 'nc',
  vs: 'vs'
});

export const OC_UNIT_OPTIONS = Object.freeze([
  { key: 'ln', label: 'Leo/need' },
  { key: 'mmj', label: 'MORE MORE JUMP!' },
  { key: 'vbs', label: 'Vivid BAD SQUAD' },
  { key: 'ws', label: 'ワンダーランズ×ショウタイム' },
  { key: 'nc', label: '25時、ナイトコードで。' }
]);

export const OC_UNIT_KEYS = Object.freeze(OC_UNIT_OPTIONS.map((item) => item.key));

export const CORE_UNIT_KEYS = Object.freeze(['vs', ...OC_UNIT_KEYS]);

export const VS_UNIT_ORDER = Object.freeze(['ln', 'mmj', 'vbs', 'ws', 'nc']);

export const VS_UNIT_ORDER_MAP = Object.freeze({ ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5 });

export const BOOK_ROUND_POSITION_KEYS = Object.freeze([1, 2, 3, 4, 5]);

export const SONG_SECTION_TITLE_MAP = Object.freeze({
  'panel-song-stats': '乐曲统计',
  'panel-oc-stats': '各团歌曲统计',
  'panel-vs-song-stats': 'VS书下统计',
  'panel-oc-book-stats': 'OC书下统计',
  'panel-book-round-stats': '书下轮次统计',
  'panel-another-vocal': 'Anvo统计',
  'panel-duo-stats': '双人歌曲统计',
  'panel-3dmv-stats': '3DMV统计',
  'panel-2dmv-stats': '2DMV统计',
  'panel-april-fool-stats': '愚人节歌曲统计',
  'panel-song-search': '乐曲检索'
});

export const getSongSectionTitle = (id) => SONG_SECTION_TITLE_MAP[id] || String(id || '');

export const VS_NAV_ABBR_WHITELIST = Object.freeze(['miku', 'rin', 'len', 'luka', 'meiko', 'kaito']);

export const ANVO_UNIT_FIRST_MEMBER_ANCHORS = Object.freeze([
  { unit: 'ln', abbr: 'ick', title: 'LN Anvo' },
  { unit: 'mmj', abbr: 'mnr', title: 'MMJ Anvo' },
  { unit: 'vbs', abbr: 'khn', title: 'VBS Anvo' },
  { unit: 'ws', abbr: 'tks', title: 'WS Anvo' },
  { unit: 'nc', abbr: 'knd', title: 'NC Anvo' },
  { unit: 'vs', abbr: 'miku', title: 'VS Anvo' }
]);
