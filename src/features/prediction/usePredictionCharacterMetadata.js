import { watch } from "vue";

/** Owns prediction character metadata; state is per editor instance. */
export const usePredictionCharacterMetadata = (dependencies = {}) => {
  const ATTRS = ['Pure','Cool','Cute','Happy','Mysterious'];
  const ATTR_LABELS = {
    Pure: '绿草',
    Cool: '蓝星',
    Cute: '粉花',
    Happy: '橙心',
    Mysterious: '紫月'
  };
  const UNITS = ['vs','ln','mmj','vbs','ws','nc'];
  const BOX_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc'];
  const FES_FESTIVALS = ['周年', '半周年', '夏活', '新年'];
  const FES_SKILL_CONFIG = Object.freeze([
    // 将来新增 FES 时，仅需在这里替换 active 或扩展候选。
    { key: 'bfes_up', label: 'BFES', active: true }
  ]);
  const ACTIVE_FES_SKILL = Object.freeze(
    FES_SKILL_CONFIG.find((item) => item.active) || FES_SKILL_CONFIG[0] || { key: 'bfes_up', label: 'FES' }
  );
  const ACTIVE_FES_SKILL_KEY = ACTIVE_FES_SKILL.key;
  const ACTIVE_FES_SKILL_LABEL = ACTIVE_FES_SKILL.label;
  const VS_NAMES = [];
  const CHAR_UNIT_MAP = {};

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
      replaceObject(CHAR_UNIT_MAP, {});
      replaceArray(VS_NAMES, []);
      return;
    }

    const nextCharUnit = {};
    const nextVsNames = [];

    characters.forEach((char) => {
      const name = String(char?.zh_name || '').trim();
      if (!name) return;
      const unit = String(char?.unit || '').trim().toLowerCase() || 'vs';
      nextCharUnit[name] = unit;
      if (unit === 'vs') nextVsNames.push(name);
    });

    if (Object.keys(nextCharUnit).length === 0) {
      replaceObject(CHAR_UNIT_MAP, {});
      replaceArray(VS_NAMES, []);
      return;
    }

    replaceObject(CHAR_UNIT_MAP, nextCharUnit);
    replaceArray(VS_NAMES, nextVsNames);
  };

  watch(
    () => dependencies.props.allCharacters,
    (characters) => {
      applyCharacterMetaSource(characters);
    },
    { immediate: true }
  );
  return {
    get ATTRS() { return ATTRS; },
    get ATTR_LABELS() { return ATTR_LABELS; },
    get UNITS() { return UNITS; },
    get BOX_UNITS() { return BOX_UNITS; },
    get FES_FESTIVALS() { return FES_FESTIVALS; },
    get FES_SKILL_CONFIG() { return FES_SKILL_CONFIG; },
    get ACTIVE_FES_SKILL() { return ACTIVE_FES_SKILL; },
    get ACTIVE_FES_SKILL_KEY() { return ACTIVE_FES_SKILL_KEY; },
    get ACTIVE_FES_SKILL_LABEL() { return ACTIVE_FES_SKILL_LABEL; },
    get VS_NAMES() { return VS_NAMES; },
    get CHAR_UNIT_MAP() { return CHAR_UNIT_MAP; },
    get replaceObject() { return replaceObject; },
    get replaceArray() { return replaceArray; },
    get applyCharacterMetaSource() { return applyCharacterMetaSource; }
  };
};
