import { computed, reactive } from 'vue';

/** Owns card metadata behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardMetadata(inputs) {
  const getCharAbbr = (name) => {
    if (!name) return '';
    // 尝试按空格拆分（例如 "初音未来 ln" -> ["初音未来", "ln"]）
    const parts = name.split(' ');
    const mainName = parts[0]; // 角色本体名字
    const unitSuffix = parts.length > 1 ? parts[1].toLowerCase() : null; // 团队后缀
    if (isVirtualSinger(mainName)) {  // 利用 isVirtualSinger 判断是否为虚拟歌手
      const abbr = CHAR_MAP[mainName] || String(mainName || '').toUpperCase(); // 从映射表获取基础缩写，如 MIKU, RIN
      if (unitSuffix && unitSuffix !== 'vs') {    // 如果有团队后缀，且后缀不是 'vs'
        return `${abbr.toLowerCase()}_${unitSuffix}`;      // 返回通用格式：缩写小写_团队名（如 miku_ln）
      }
      return abbr;    // 没有后缀或属于 vs 团队，返回原始大写缩写（如 MIKU）
    }
    // 非虚拟歌手角色，直接按全名查找映射
    return CHAR_MAP[name] || name.toUpperCase() || name.toLowerCase();
  };

  const getCharColor = (name) => {
    const key = String(name || '').split(' ')[0];
    return CHAR_COLORS[key] || '#d1d5db';
  };

  const BASE_UNIT_COLORS = {
    ln: '#4455DD',
    mmj: '#88DD44',
    vbs: '#EE1166',
    ws: '#FF9900',
    nc: '#884499',
    vs: '#111827'
  };

  const unitLogoMap = {
    ln: '/elements/ln.png',
    mmj: '/elements/mmj.png',
    vbs: '/elements/vbs.png',
    ws: '/elements/ws.png',
    nc: '/elements/nc.png',
    vs: '/elements/vs.png'
  };

  const CHAR_MAP = reactive({});

  const CHAR_SINGLE_MAP = reactive({});

  const CHAR_COLORS = reactive({});

  const CHAR_UNIT_MAP = reactive({});

  const CHAR_ORDER = reactive({});

  const DEFAULT_VS_NAMES = ['初音未来', '镜音铃', '镜音连', '巡音流歌', 'MEIKO', 'KAITO'];

  const VS_NAMES = reactive([...DEFAULT_VS_NAMES]);

  const VS_ALIAS_MAP = reactive({});

  const UNIT_COLORS = reactive({ ...BASE_UNIT_COLORS });

  const replaceObject = (target, next) => {
    Object.keys(target).forEach((key) => {
      delete target[key];
    });
    Object.assign(target, next);
  };

  const replaceArray = (target, next) => {
    target.splice(0, target.length, ...next);
  };

  const applyCharacterMetaSource = (characters) => {
    if (!Array.isArray(characters) || characters.length === 0) {
      replaceObject(CHAR_MAP, {});
      replaceObject(CHAR_SINGLE_MAP, {});
      replaceObject(CHAR_COLORS, {});
      replaceObject(CHAR_UNIT_MAP, {});
      replaceObject(CHAR_ORDER, {});
      replaceObject(UNIT_COLORS, BASE_UNIT_COLORS);
      replaceObject(VS_ALIAS_MAP, {});
      replaceArray(VS_NAMES, DEFAULT_VS_NAMES);
      return;
    }

    const nextCharMap = {};
    const nextSingleMap = {};
    const nextCharColors = {};
    const nextCharUnit = {};
    const nextCharOrder = {};
    const nextVsNames = [];
    const nextVsAliasMap = {};
    const nextUnitColors = { ...BASE_UNIT_COLORS };

    const addVsAlias = (aliasRaw, canonicalRaw) => {
      const alias = String(aliasRaw || '').trim();
      const canonical = String(canonicalRaw || '').trim();
      if (!alias || !canonical) return;
      nextVsAliasMap[alias] = canonical;
      nextVsAliasMap[alias.toUpperCase()] = canonical;
    };

    const sortedChars = [...characters]
      .map((char, idx) => ({ char, idx }))
      .filter(({ char }) => !!String(char?.zh_name || '').trim())
      .sort((a, b) => {
        const ao = Number(a.char?.id);
        const bo = Number(b.char?.id);
        const av = Number.isFinite(ao) && ao > 0 ? ao : 9999 + a.idx;
        const bv = Number.isFinite(bo) && bo > 0 ? bo : 9999 + b.idx;
        return av - bv;
      });

    sortedChars.forEach(({ char }, index) => {
      const name = String(char?.zh_name || '').trim();
      const unit = String(char?.unit || '').trim().toLowerCase() || 'vs';
      const abbr = String(char?.en_abbr || '').trim() || name.toUpperCase();
      const singleMark = String(char?.single_mark || '').trim() || name.slice(0, 1);
      const color = String(char?.color || '').trim();
      const unitColor = String(char?.unit_color || '').trim();
      const orderId = Number(char?.id);

      nextCharMap[name] = abbr;
      nextSingleMap[name] = singleMark;
      if (color) nextCharColors[name] = color;
      nextCharUnit[name] = unit;
      nextCharOrder[name] = Number.isFinite(orderId) && orderId > 0 ? orderId : index + 1;

      if (unit === 'vs') {
        nextVsNames.push(name);
        addVsAlias(name, name);
        addVsAlias(char?.ja_name, name);
        addVsAlias(char?.en_abbr, name);
        addVsAlias(char?.given_name_english, name);
        addVsAlias(char?.given_name, name);
        addVsAlias(`${String(char?.first_name_english || '').trim()} ${String(char?.given_name_english || '').trim()}`.trim(), name);
        addVsAlias(`${String(char?.first_name || '').trim()}${String(char?.given_name || '').trim()}`.trim(), name);
      }
      if (unitColor) {
        nextUnitColors[unit] = unitColor;
      }
    });

    if (Object.keys(nextCharMap).length === 0) {
      replaceObject(CHAR_MAP, {});
      replaceObject(CHAR_SINGLE_MAP, {});
      replaceObject(CHAR_COLORS, {});
      replaceObject(CHAR_UNIT_MAP, {});
      replaceObject(CHAR_ORDER, {});
      replaceObject(UNIT_COLORS, BASE_UNIT_COLORS);
      replaceObject(VS_ALIAS_MAP, {});
      replaceArray(VS_NAMES, DEFAULT_VS_NAMES);
      return;
    }

    replaceObject(CHAR_MAP, nextCharMap);
    replaceObject(CHAR_SINGLE_MAP, nextSingleMap);
    replaceObject(CHAR_COLORS, nextCharColors);
    replaceObject(CHAR_UNIT_MAP, nextCharUnit);
    replaceObject(CHAR_ORDER, nextCharOrder);
    replaceObject(UNIT_COLORS, nextUnitColors);
    replaceObject(VS_ALIAS_MAP, nextVsAliasMap);
    replaceArray(VS_NAMES, nextVsNames);
  };

  const LINEUP_CHAR_NAMES = computed(() => {
    return inputs.presentation.toDisplayOrderedCharNames(Object.keys(CHAR_ORDER));
  });

  const CHAR_CARD_FOLDER_MAP = computed(() => {
    const map = {};
    (inputs.props.allCharacters || []).forEach((char) => {
      const idNum = Number(String(char?.id ?? '').trim());
      const abbr = String(char?.en_abbr || '').trim().toLowerCase();
      if (!Number.isFinite(idNum) || idNum <= 0 || !abbr) return;

      const folder = `${String(idNum).padStart(3, '0')}${abbr}`;
      const keys = [
        char?.zh_name,
        char?.ja_name,
        `${String(char?.first_name || '').trim()}${String(char?.given_name || '').trim()}`
      ];

      keys.forEach((key) => {
        const normalized = String(key || '').trim();
        if (!normalized) return;
        map[normalized] = folder;
      });
    });
    return map;
  });

  const isVirtualSinger = (name) => VS_NAMES.includes(name);

  const getUnitByChar = (name) => {
    const raw = String(name || '').trim();
    if (!raw) return 'vs';
    const [baseName, suffixRaw] = raw.split(/\s+/);
    const suffix = String(suffixRaw || '').toLowerCase();
    if (VS_NAMES.includes(baseName)) {
      if (suffix && UNIT_COLORS[suffix]) return suffix;
      return 'vs';
    }
    return CHAR_UNIT_MAP[baseName] || 'vs';
  };

  function getCardBaseName(cardName) {
    return String(cardName || '').trim().split(/\s+/)[0] || '';
  }

  const normalizeCharName = (value) => getCardBaseName(value);

  return {
    getUnitByChar,
    CHAR_ORDER,
    VS_NAMES,
    UNIT_COLORS,
    getCharAbbr,
    CHAR_MAP,
    unitLogoMap,
    getCharColor,
    getCardBaseName,
    isVirtualSinger,
    CHAR_SINGLE_MAP,
    LINEUP_CHAR_NAMES,
    normalizeCharName,
    CHAR_UNIT_MAP,
    CHAR_CARD_FOLDER_MAP,
    applyCharacterMetaSource,
  };
}
