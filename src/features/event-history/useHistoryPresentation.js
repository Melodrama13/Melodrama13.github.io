import { computed } from 'vue';

/** Presentation owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, Formatting, PreviewSelections.
 */
export function useHistoryPresentation(ports) {
const FALLBACK_UNIT_COLORS = {
  ln: '#4455DD',
  mmj: '#88DD44',
  vbs: '#EE1166',
  ws: '#FF9900',
  nc: '#884499',
  vs: '#000000'
};

const CHAR_SINGLE_MAP = computed(() => {
  const map = {};
  (ports.props.allCharacters || []).forEach((char) => {
    const key = String(char?.zh_name || '').trim();
    const mark = String(char?.single_mark || '').trim();
    if (!key || !mark) return;
    map[key] = mark;
  });
  return map;
});

const CHAR_COLORS = computed(() => {
  const map = {};
  (ports.props.allCharacters || []).forEach((char) => {
    const key = String(char?.zh_name || '').trim();
    const color = String(char?.color || '').trim();
    if (!key || !color) return;
    map[key] = color;
  });
  return map;
});

const UNIT_COLORS = computed(() => {
  const map = { ...FALLBACK_UNIT_COLORS };
  (ports.props.allCharacters || []).forEach((char) => {
    const unit = String(char?.unit || '').trim().toLowerCase();
    const color = String(char?.unit_color || '').trim();
    if (!unit || !color) return;
    map[unit] = color;
  });
  return map;
});

const VS_NAMES = computed(() => {
  return (ports.props.allCharacters || [])
    .filter((char) => String(char?.unit || '').trim().toLowerCase() === 'vs')
    .map((char) => String(char?.zh_name || '').trim())
    .filter(Boolean);
});

const translateType = (t) => {
  const map = { perm: '常驻', limited: '普通限定', collab: '联动限定', collab_t: '联动限定', cfes: 'CFES', bfes: 'BFES', movie: '剧场版限定', wl1: 'WL1', wl2: 'WL2', wl3: 'WL3' };
  return map[t?.toLowerCase()] || t;
};

const translateSkill = (s) => {
  const map = { score_up: '普分', accuracy: '判卡', recovery: '奶卡', p_score: 'P分', unit_score: '团分', cfes_l: 'CFES血分', cfes_j: 'CFES判分', bfes_up: 'BFES' };
  return map[s?.toLowerCase()] || s;
};

const translateAttr = (a) => {
  const map = { Happy: '橙心', Mysterious: '紫月', Cute: '粉花', Cool: '蓝星', Pure: '绿草' };
  const normalized = ports.formatting.normalizeEventHistoryAttribute(a);
  return map[normalized] || a;
};

const getCharAbbr = (name) => {
  if (!name) return '';
  // 尝试按空格拆分（例如 "初音未来 ln" -> ["初音未来", "ln"]）
  const parts = name.split(' ');
  const mainName = parts[0]; // 角色本体名字
  const unitSuffix = parts.length > 1 ? parts[1].toLowerCase() : null; // 团队后缀
  if (isVirtualSinger(mainName)) {  // 利用 isVirtualSinger 判断是否为虚拟歌手
    const abbr = ports.previewSelections.CHAR_MAP.value[mainName]; // 从映射表获取基础缩写，如 MIKU, RIN
    if (!abbr) return mainName.toUpperCase();
    if (unitSuffix && unitSuffix !== 'vs') {    // 如果有团队后缀，且后缀不是 'vs'
      return `${abbr.toLowerCase()}_${unitSuffix}`;      // 返回通用格式：缩写小写_团队名（如 miku_ln）
    }
    return abbr;    // 没有后缀或属于 vs 团队，返回原始大写缩写（如 MIKU）
  }
  // 非虚拟歌手角色，直接按全名查找映射
  return ports.previewSelections.CHAR_MAP.value[name] || name.toUpperCase() || name.toLowerCase();
};

const getUnitColor = (unit) => {
  if (!unit) return 'transparent'; // 如果 unit 为空，返回透明或默认背景色
  return UNIT_COLORS.value[String(unit).toLowerCase()] || '#999999';
};

const getCharColor = (name) => {
  if (!name) return '#999999';
  // 提取真正的角色名：取空格前的部分（例如从 "初音未来 LN" 中提取 "初音未来"）
  const realName = name.split(' ')[0];
  return CHAR_COLORS.value[realName] || CHAR_COLORS.value[name] || '#999999';
};

const isVirtualSinger = (name) => VS_NAMES.value.includes(String(name || '').trim());

const isUnitRelated = (ev) => {
  const isTypeMatch = ['箱活', 'WL', 'World Link', '总集篇'].includes(ev.event_type);
  return isTypeMatch && !!ev.unit; // !!ev.unit 确保 unit 不为空字符串或 null
};

const isSpecialFestival = (fest) => ['新年', '半周年', '情人节', '白情', '周年', '婚活'].includes(fest);

const getNormalCards = (cards) => {
  const source = Array.isArray(cards) ? cards : [];
  const rank = (card) => {
    const rarity = Number(String(card?.Rarity || '').trim());
    if (rarity === 4) return 0;
    if (rarity === 3) return 1;
    if (rarity === 2) return 2;
    return 9;
  };

  return source
    .filter(c => !ports.previewSelections.isFesCardType(c?.Type))
    .map((card, idx) => ({ card, idx }))
    .sort((a, b) => {
      const ar = rank(a.card);
      const br = rank(b.card);
      if (ar !== br) return ar - br;
      return a.idx - b.idx;
    })
    .map((item) => item.card);
};

const getFesCards = (cards) => cards.filter(c => ports.previewSelections.isFesCardType(c?.Type));

const getFesType = (cards) => cards.find(c => ports.previewSelections.isFesCardType(c?.Type))?.Type?.toLowerCase() || 'cfes';

const getMemberRibbonLabel = (card) => {
  const type = String(card?.Type || '').trim().toLowerCase();
  if (type === 'limited') return '期间限定';
  if (type === 'collab' || type === 'collab_t') return '联动限定';
  if (ports.previewSelections.isFesCardType(type)) return 'FES限定';
  if (['wl1', 'wl2', 'wl3'].includes(type)) return 'WL限定';
  return '';
};

const getTypeTagStyle = (ev) => {
  if (isUnitRelated(ev)) return { backgroundColor: getUnitColor(ev.unit) };
  return { background: 'linear-gradient(45deg, #FD7CC1 0%, #87C0FF 50%, #F8FF87 100%)', color: '#FFFFFF', fontWeight: 'bold' };
};

const formatSeries = (ev) => {
  if (!ev.type_series_id) return '';
  if (ev.event_type === '箱活') return `${ev.banner.split(' ')[0]} ${ev.type_series_id}箱`;
  if (ev.event_type === '混活') return `${ev.banner.split(' ')[0]} ${ev.type_series_id}混`;
  if (ev.event_type === 'World Link') return `${ev.unit} WL${ev.type_series_id}${getWl3PartSuffix(ev)}`;
  return ev.type_series_id;
};

const getSingleCharLabel = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const main = raw.split(' ')[0] || raw;
  return CHAR_SINGLE_MAP.value[main] || main.slice(0, 1);
};

const isWl3Event = (ev) => {
  const t = String(ev?.event_type || '').trim();
  if (t !== 'World Link') return false;
  const cards = Array.isArray(ev?.memberCards) ? ev.memberCards : [];
  return cards.some((card) => String(card?.Type || '').trim().toLowerCase() === 'wl3');
};

const getWl3PartSuffix = (ev) => {
  if (!isWl3Event(ev)) return '';
  const currentId = Number(ev?.id);
  if (!Number.isFinite(currentId)) return '';

  const wl3Ids = (ports.props.allEvents || [])
    .filter((item) => {
      if (!ports.formatting.isNumericEventId(item?.id)) return false;
      if (String(item?.event_type || '').trim() !== 'World Link') return false;
      const ts = Number(String(item?.type_series_id || '').trim());
      return Number.isFinite(ts) && ts === 3;
    })
    .map((item) => Number(item.id))
    .sort((a, b) => a - b);

  const idx = wl3Ids.indexOf(currentId);
  if (idx < 0) return '';
  return ` P${idx + 1}`;
};

const formatSeriesCompact = (ev) => {
  if (!ev?.type_series_id) return '';
  const sid = String(ev.type_series_id).trim();
  if (!sid) return '';
  if (ev.event_type === '箱活') return `${getSingleCharLabel(ev.banner)}${sid}箱`;
  if (ev.event_type === '混活') return `${getSingleCharLabel(ev.banner)}${sid}混`;
  if (ev.event_type === 'World Link') return `${String(ev.unit || '').toUpperCase()} WL${sid}${getWl3PartSuffix(ev)}`;
  return sid;
};

const getEditorSeriesStyle = (ev) => {
  if (!ev) return {};
  const eventType = String(ev.event_type || '').trim();
  if (eventType === '混活' || isWl3Event(ev)) {
    return {
      background: 'linear-gradient(45deg, #FD7CC1 0%, #87C0FF 50%, #F8FF87 100%)',
      borderColor: 'transparent',
      color: '#ffffff',
      fontWeight: '700'
    };
  }

  if (eventType === '箱活' || (eventType === 'World Link' && !isWl3Event(ev))) {
    const base = getUnitColor(ev.unit);
    return {
      backgroundColor: base,
      borderColor: base,
      color: '#ffffff',
      fontWeight: '700'
    };
  }

  return {};
};

const parseVS = (vsStr) => {
  if (!vsStr) return [];
  return vsStr.split(/[,，/、\s]+/).filter(s => s);
};

const getFestivalPreviewUnitLogo = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const parts = raw.split(' ');
  const baseName = parts[0] || raw;
  if (!isVirtualSinger(baseName)) return '';
  const unit = String(parts[1] || '').trim().toLowerCase();
  if (!unit || unit === 'vs') return '';
  return `/elements/${unit}.png`;
};


return {
  UNIT_COLORS,
  translateType,
  translateSkill,
  translateAttr,
  getCharAbbr,
  getUnitColor,
  getCharColor,
  isVirtualSinger,
  isUnitRelated,
  isSpecialFestival,
  getNormalCards,
  getFesCards,
  getFesType,
  getMemberRibbonLabel,
  getTypeTagStyle,
  formatSeries,
  formatSeriesCompact,
  getEditorSeriesStyle,
  parseVS,
  getFestivalPreviewUnitLogo,
};
}
