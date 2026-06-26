<template>
  <Teleport to="body">
    <transition name="slide">
      <div
        v-if="isOpen"
        class="predict-drawer"
        :class="{ 'is-mobile-sheet': isMobileViewport }"
        :style="drawerStyle"
      >
      <div class="drawer-header">
        <div
          v-if="isMobileViewport"
          class="drawer-grab-handle"
          @mousedown.prevent="startSheetDragMouse"
          @touchstart.prevent="startSheetDrag"
        ></div>
        <div class="header-main">
          <h3>预测编辑器 <span class="ev-id">#{{ event.id }}</span></h3>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
        
        <div class="global-config-bar" :class="{ 'has-banner': !isWorldLinkMode }">
          <div class="cfg-group">
            <label>活动类型</label>
            <select v-model="form.eventType" :disabled="form.isTypeLocked">
              <option value="箱活">箱活</option>
              <option value="混活">混活</option>
              <option v-if="form.isTypeLocked && form.eventType === 'World Link'" value="World Link">World Link</option>
            </select>
          </div>
          <div class="cfg-group">
            <label>卡池性质</label>
            <select v-model="form.gachaType" :disabled="form.isGachaLocked">
              <option value="perm">常驻</option>
              <option value="limited">普通限定</option>
              <option value="ue">UE限定</option>
            </select>
          </div>
          <div class="cfg-group">
            <label>活动属性</label>
            <select v-model="form.predictAttr" @change="applyGlobalAttr">
              <option value="">手动分配</option>
              <option v-for="a in ATTRS" :key="a" :value="a">{{ getAttrLabel(a) }}</option>
            </select>
          </div>
          <div v-if="!isWorldLinkMode" class="cfg-group">
            <label>Ban主</label>
            <select v-model="form.bannerName" :disabled="bannerCandidates.length === 0">
              <option v-if="bannerCandidates.length === 0" value="">无可用</option>
              <option v-else value="" disabled>选择 Ban主</option>
              <option v-for="char in bannerCandidates" :key="`ban-${char.name}`" :value="char.name">{{ char.name }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="selected-section">
        <div class="section-title">
          <span>当前阵容 ({{ form.selectedChars.length }})</span>
          <span class="tip">{{ isWorldLinkMode ? 'World Link 人选固定，无需 Ban主' : '第一个角色默认为 Ban主' }}</span>
        </div>
        
        <div class="selected-list" :key="selectedRenderKey">
          <div
            v-for="(char, idx) in form.selectedChars"
            :key="char.name"
            class="editor-card"
            :class="{ 'is-banner-card': shouldMarkBannerCard(char) }"
          >
            <div class="card-left">
              <img :src="`/chars/${charMap[char.name]}.png`" class="editor-avatar" />
            </div>
            
            <div class="card-right">
              <div class="name-row">
                <span class="char-name">{{ char.name }}</span>
              </div>
              
              <div class="config-row">
                <select v-if="VS_NAMES.includes(char.name) && !isVSUnitLocked(char)" v-model="char.selectedUnit" class="mini-select unit-sel">
                  <option v-for="u in UNITS" :key="u" :value="u">{{u.toUpperCase()}}</option>
                </select>
                <span v-else class="unit-tag">{{ getDisplayUnit(char).toUpperCase() }}</span>

                <select v-model="char.rarity" class="mini-select rarity-sel" :disabled="isRarityLocked(char)">
                  <option value="4">4★</option>
                  <option value="3">3★</option>
                  <option value="2">2★</option>
                </select>

                <select v-model="char.attr" class="mini-select attr-sel" :disabled="isAttrLocked(char)">
                  <option value="-">待定</option>
                  <option value="Pure">绿草</option>
                  <option value="Mysterious">紫月</option>
                  <option value="Cute">粉花</option>
                  <option value="Cool">蓝星</option>
                  <option value="Happy">橙心</option>
                </select>

                <select v-if="isVsFesSkillMode(char)" v-model="char.skillType" class="mini-select skill-sel">
                  <option value="unit_score">团分</option>
                  <option :value="ACTIVE_FES_SKILL_KEY">{{ ACTIVE_FES_SKILL_LABEL }}</option>
                </select>
                <select v-else v-model="char.skillType" class="mini-select skill-sel" :disabled="isSkillLocked(char)">
                  <option value="-">待定</option>
                  <option value="score_up">普分</option>
                  <option v-if="isPScoreAvailable(char)" value="p_score">P分</option>
                  <option value="recovery">奶卡</option>
                  <option value="accuracy">判卡</option>
                  <option v-if="isUnitScoreLocked(char)" value="unit_score">团分</option>
                  <option v-if="isBfesSkillAvailable(char)" :value="ACTIVE_FES_SKILL_KEY">{{ ACTIVE_FES_SKILL_LABEL }}</option>
                </select>
              </div>
            </div>
          </div>
          <div v-if="form.selectedChars.length === 0" class="empty-hint">请在下方选择角色</div>
        </div>
      </div>

      <div v-if="!isWorldLinkMode" class="pool-section">
        <div class="char-pool-grid">
          <div v-for="(abbr, name) in charMap" :key="name" 
               class="pool-item" 
               :class="{ is_selected: isCharInList(name), is_disabled: !!getCharDisableReason(name) && !isCharInList(name) }"
               :title="''"
               @mouseenter="handlePoolItemMouseEnter(name)"
               @mouseleave="handlePoolItemMouseLeave(name)"
               @click="handlePoolItemClick(name)">
            <img :src="`/chars/${abbr}.png`" />
            <div v-if="isCharInList(name)" class="check-mark">✓</div>
            <div v-if="shouldShowDisableReasonPopover(name)" class="pool-disable-popover">{{ getCharDisableReason(name) }}</div>
          </div>
        </div>
      </div>
      <div v-else class="pool-section wl-lock-note">
        World Link 人选已固定，当前仅可调整属性。
      </div>

      <div class="drawer-footer">
        <button @click="submit" class="save-all-btn">确认并保存预测</button>
      </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { reactive, inject, watch, computed, ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  event: { type: Object, default: null },
  charMap: { type: Object, default: () => ({}) },
  boxLockedUnits: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] }
});
const emit = defineEmits(['close', 'selection-change']);
const savePredictEvent = inject('savePredictEvent');
const updateDraftPredictEvent = inject('updateDraftPredictEvent', null);

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
  () => props.allCharacters,
  (characters) => {
    applyCharacterMetaSource(characters);
  },
  { immediate: true }
);

const form = reactive({
  eventType: '混活',
  gachaType: 'perm',
  predictAttr: '',
  bannerName: '',
  selectedChars: [],
  isGachaLocked: false,
  isTypeLocked: false
});

const isWorldLinkTeamSeries = (eventLike) => {
  const type = String(eventLike?.event_type || eventLike?.source_event_type || '').trim();
  if (type !== 'World Link') return false;
  const sid = Number(eventLike?.type_series_id);
  return Number.isFinite(sid) && sid > 0 && sid <= 3;
};

const MOBILE_BREAKPOINT = 900;
const SHEET_MIN_VH = 26;
const SHEET_MID_VH = 62;
const SHEET_MAX_VH = 92;
const isMobileViewport = ref(false);
const sheetHeightVh = ref(SHEET_MID_VH);
const sheetDragState = ref({ dragging: false, startY: 0, startVh: SHEET_MID_VH });

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const setSheetDragStart = (clientY) => {
  sheetDragState.value = {
    dragging: true,
    startY: clientY,
    startVh: sheetHeightVh.value
  };
};

const applySheetDragMove = (clientY) => {
  const dy = sheetDragState.value.startY - clientY;
  const deltaVh = (dy / Math.max(1, window.innerHeight)) * 100;
  sheetHeightVh.value = clamp(sheetDragState.value.startVh + deltaVh, SHEET_MIN_VH, SHEET_MAX_VH);
};

function moveSheetDragMouse(event) {
  if (!isMobileViewport.value || !sheetDragState.value.dragging) return;
  applySheetDragMove(event.clientY);
}

function endSheetDragMouse() {
  endSheetDrag();
  detachSheetPointerListeners();
}

function moveSheetDragTouch(event) {
  if (!isMobileViewport.value || !sheetDragState.value.dragging) return;
  const t = event.touches?.[0];
  if (!t) return;
  event.preventDefault();
  applySheetDragMove(t.clientY);
}

function endSheetDragTouch() {
  endSheetDrag();
  detachSheetPointerListeners();
}

const detachSheetPointerListeners = () => {
  window.removeEventListener('mousemove', moveSheetDragMouse);
  window.removeEventListener('mouseup', endSheetDragMouse);
  window.removeEventListener('touchmove', moveSheetDragTouch);
  window.removeEventListener('touchend', endSheetDragTouch);
  window.removeEventListener('touchcancel', endSheetDragTouch);
};

const attachSheetTouchListeners = () => {
  window.addEventListener('touchmove', moveSheetDragTouch, { passive: false });
  window.addEventListener('touchend', endSheetDragTouch);
  window.addEventListener('touchcancel', endSheetDragTouch);
};

const updateMobileViewport = () => {
  isMobileViewport.value = window.innerWidth <= MOBILE_BREAKPOINT;
  if (!isMobileViewport.value) {
    sheetHeightVh.value = SHEET_MAX_VH;
    sheetDragState.value = { dragging: false, startY: 0, startVh: SHEET_MAX_VH };
    detachSheetPointerListeners();
  } else {
    sheetHeightVh.value = clamp(sheetHeightVh.value || SHEET_MID_VH, SHEET_MIN_VH, SHEET_MAX_VH);
  }
};

const drawerStyle = computed(() => {
  if (!isMobileViewport.value) return {};
  return {
    height: `${sheetHeightVh.value}dvh`
  };
});

const endSheetDrag = () => {
  if (!isMobileViewport.value || !sheetDragState.value.dragging) return;
  const snaps = [SHEET_MIN_VH, SHEET_MID_VH, SHEET_MAX_VH];
  const closest = snaps.reduce((prev, cur) => (
    Math.abs(cur - sheetHeightVh.value) < Math.abs(prev - sheetHeightVh.value) ? cur : prev
  ), SHEET_MID_VH);
  sheetHeightVh.value = closest;
  sheetDragState.value = { dragging: false, startY: 0, startVh: sheetHeightVh.value };
};

function startSheetDragMouse(event) {
  if (!isMobileViewport.value) return;
  setSheetDragStart(event.clientY);
  window.addEventListener('mousemove', moveSheetDragMouse);
  window.addEventListener('mouseup', endSheetDragMouse);
}

function startSheetDrag(event) {
  if (!isMobileViewport.value) return;
  const t = event.touches?.[0];
  if (!t) return;
  setSheetDragStart(t.clientY);
  attachSheetTouchListeners();
}

const renderTick = ref(0);
const bumpRender = () => {
  renderTick.value += 1;
};

const selectedRenderKey = computed(() => form.selectedChars
  .map(c => `${c.name}|${c.rarity}|${c.skillType}|${c.selectedUnit}|${c.attr}`)
  .join('||') + `::${renderTick.value}`);

const disableReasonPopoverName = ref('');
const disableReasonPopoverPinned = ref(false);
let disableReasonHoverTimer = 0;
let disableReasonAutoHideTimer = 0;

const clearDisableReasonTimers = () => {
  if (disableReasonHoverTimer) {
    clearTimeout(disableReasonHoverTimer);
    disableReasonHoverTimer = 0;
  }
  if (disableReasonAutoHideTimer) {
    clearTimeout(disableReasonAutoHideTimer);
    disableReasonAutoHideTimer = 0;
  }
};

const hideDisableReasonPopover = (force = false) => {
  clearDisableReasonTimers();
  if (!force && disableReasonPopoverPinned.value) return;
  disableReasonPopoverName.value = '';
  disableReasonPopoverPinned.value = false;
};

const showDisableReasonPopover = (name, options = {}) => {
  const reason = getCharDisableReason(name);
  if (!reason) {
    hideDisableReasonPopover(true);
    return;
  }
  const { pinned = false, autoHideMs = 0 } = options;
  disableReasonPopoverName.value = name;
  disableReasonPopoverPinned.value = !!pinned;
  if (autoHideMs > 0) {
    disableReasonAutoHideTimer = setTimeout(() => {
      disableReasonPopoverName.value = '';
      disableReasonPopoverPinned.value = false;
      disableReasonAutoHideTimer = 0;
    }, autoHideMs);
  }
};

const shouldShowDisableReasonPopover = (name) => {
  return disableReasonPopoverName.value === name && !!getCharDisableReason(name) && !isCharInList(name);
};

const handlePoolItemMouseEnter = (name) => {
  if (isCharInList(name)) return;
  const reason = getCharDisableReason(name);
  if (!reason) return;
  clearDisableReasonTimers();
  disableReasonHoverTimer = setTimeout(() => {
    showDisableReasonPopover(name, { pinned: false });
    disableReasonHoverTimer = 0;
  }, 1000);
};

const handlePoolItemMouseLeave = (name) => {
  const reason = getCharDisableReason(name);
  if (!reason) return;
  if (disableReasonHoverTimer) {
    clearTimeout(disableReasonHoverTimer);
    disableReasonHoverTimer = 0;
  }
  if (!disableReasonPopoverPinned.value && disableReasonPopoverName.value === name) {
    disableReasonPopoverName.value = '';
  }
};

const handlePoolItemClick = (name) => {
  const reason = getCharDisableReason(name);
  if (reason && !isCharInList(name)) {
    clearDisableReasonTimers();
    showDisableReasonPopover(name, { pinned: true, autoHideMs: 2200 });
    return;
  }
  hideDisableReasonPopover(true);
  toggleChar(name);
};

const isWorldLinkMode = computed(() => form.eventType === 'World Link' && isWorldLinkTeamSeries(props.event));
const isWorldLinkFinalChapter = computed(() => {
  const sid = Number(props.event?.type_series_id);
  return String(form.eventType || '').trim() === 'World Link' && sid === 3;
});
const normalizedBoxLockedUnits = computed(() => {
  const list = Array.isArray(props.boxLockedUnits) ? props.boxLockedUnits : [];
  return list
    .map((u) => String(u || '').trim().toLowerCase())
    .filter((u) => BOX_UNITS.includes(u));
});

let isApplyingRules = false;

const getOCUnit = (name) => CHAR_UNIT_MAP[name] || 'vs';
const isUnitLockedInCurrentRound = (unit, options = {}) => {
  const ignoreFesBypass = options.ignoreFesBypass === true;
  if (form.eventType !== '箱活') return false;
  if (!ignoreFesBypass && FES_FESTIVALS.includes(String(props.event?.festival || '').trim())) return false;
  return normalizedBoxLockedUnits.value.includes(String(unit || '').trim().toLowerCase());
};
const isFesFestival = () => FES_FESTIVALS.includes(String(props.event?.festival || '').trim());
const isBfesSkillAvailable = (char) => !!ACTIVE_FES_SKILL_KEY && isFesFestival() && String(char?.rarity) === '4';
const isPScoreAvailable = (char) => String(char?.rarity) === '4';
const isVsFesSkillMode = (char) => isBfesSkillAvailable(char) && VS_NAMES.includes(char?.name);
const isActiveFesSkill = (skillType) => String(skillType || '').trim() === ACTIVE_FES_SKILL_KEY;

const isFesSkillTag = (skillType) => {
  const raw = String(skillType || '').trim().toLowerCase();
  return raw.includes('fes') || isActiveFesSkill(raw);
};

const isBannerEligibleChar = (char) => {
  if (!char) return false;
  if (String(char?.rarity || '') !== '4') return false;
  if (isFesSkillTag(char?.skillType)) return false;
  if (form.eventType === '箱活') {
    if (VS_NAMES.includes(char?.name)) return false;
    if (isUnitLockedInCurrentRound(getOCUnit(char?.name), { ignoreFesBypass: true })) return false;
  }
  return true;
};

const bannerCandidates = computed(() => form.selectedChars.filter((char) => isBannerEligibleChar(char)));

const activeBannerName = computed(() => {
  if (isWorldLinkMode.value) return '';
  const names = bannerCandidates.value.map((char) => String(char?.name || '').trim()).filter(Boolean);
  if (!names.length) return '';
  if (names.includes(form.bannerName)) return form.bannerName;
  return names[0];
});

const syncBannerName = () => {
  if (isWorldLinkMode.value) {
    form.bannerName = '';
    return;
  }
  const next = activeBannerName.value;
  if (form.bannerName !== next) {
    form.bannerName = next;
  }
};

const shouldMarkBannerCard = (char) => {
  if (isWorldLinkMode.value) return false;
  return String(char?.name || '').trim() === String(activeBannerName.value || '').trim();
};

const getBannerUnit = () => {
  const banner = form.selectedChars.find((char) => String(char?.name || '').trim() === String(activeBannerName.value || '').trim());
  if (banner && banner.name) return getOCUnit(banner.name);
  const fallback = form.selectedChars.find((char) => !VS_NAMES.includes(char?.name));
  if (fallback?.name) return getOCUnit(fallback.name);
  if (form.selectedChars[0]?.name) return getOCUnit(form.selectedChars[0].name);
  return '';
};

const getDisplayUnit = (char) => {
  if (isBfesVsUnitLocked(char)) {
    return 'vs';
  }
  if (VS_NAMES.includes(char?.name) && isVSUnitLocked(char)) {
    return getBannerUnit();
  }
  if (VS_NAMES.includes(char?.name)) {
    return char?.selectedUnit || 'vs';
  }
  return getOCUnit(char?.name);
};

const isVSUnitLocked = (char) => {
  return isWorldLinkMode.value
    || isBfesVsUnitLocked(char)
    || (form.eventType === '箱活' && VS_NAMES.includes(char.name) && !!getBannerUnit());
};

const isBfesLocked = (char) => {
  return isActiveFesSkill(char?.skillType) && String(char?.rarity) === '4';
};

const isForcedBfesInBox = (char) => {
  if (form.eventType !== '箱活' || !isFesFestival() || form.selectedChars.length === 0) return false;
  if (VS_NAMES.includes(char?.name)) return false;
  const bannerUnit = getBannerUnit();
  if (!bannerUnit) return false;
  return getOCUnit(char?.name) !== bannerUnit;
};

const isBfesVsUnitLocked = (char) => {
  return isBfesLocked(char) && VS_NAMES.includes(char?.name);
};

const isUnitScoreLocked = (char) => {
  return !isVsFesSkillMode(char) && !isBfesLocked(char) && form.gachaType === 'limited' && VS_NAMES.includes(char?.name) && String(char?.rarity) === '4';
};

const isConfirmedSkillLocked = () => isWorldLinkFinalChapter.value;

const isSkillLocked = (char) => {
  return isConfirmedSkillLocked() || isForcedBfesInBox(char) || isUnitScoreLocked(char);
};

const isRarityLocked = (char) => {
  return isWorldLinkMode.value || isForcedBfesInBox(char);
};

const isAttrLocked = (char) => {
  return !!form.predictAttr && String(char?.rarity) === '4' && !isBfesLocked(char);
};

const isCharSelectable = (name) => {
  return getCharDisableReason(name) === '';
};

const getCharDisableReason = (name) => {
  if (isWorldLinkMode.value) return '';
  if (form.eventType !== '箱活') return '';

  const isFirstPick = form.selectedChars.length === 0;
  if (!VS_NAMES.includes(name) && isUnitLockedInCurrentRound(getOCUnit(name), { ignoreFesBypass: isFirstPick })) {
    return '本轮箱活已出';
  }

  if (isFirstPick) {
    return VS_NAMES.includes(name) ? '箱活Ban主禁止选v' : '';
  }

  if (isFesFestival()) return '';
  if (VS_NAMES.includes(name)) return '';

  const bannerUnit = getBannerUnit();
  return getOCUnit(name) === bannerUnit ? '' : '与箱活团队不一致';
};

const clearInvalidBoxBanner = () => {
  if (form.eventType !== '箱活') return;
  const bannerIdx = form.selectedChars.findIndex((char) => String(char?.name || '').trim() === String(form.bannerName || '').trim());
  if (bannerIdx < 0) return;
  const bannerChar = form.selectedChars[bannerIdx];
  if (!bannerChar) return;
  if (
    VS_NAMES.includes(bannerChar.name)
    || isUnitLockedInCurrentRound(getOCUnit(bannerChar.name), { ignoreFesBypass: true })
  ) {
    form.selectedChars.splice(bannerIdx, 1);
  }
};

const applyBoxPoolRestriction = () => {
  if (form.eventType !== '箱活' || form.selectedChars.length === 0) return;
  for (let i = form.selectedChars.length - 1; i >= 1; i -= 1) {
    const c = form.selectedChars[i];
    if (!isCharSelectable(c.name)) {
      form.selectedChars.splice(i, 1);
    }
  }
};

const applyGlobalAttrToFourStars = () => {
  if (!form.predictAttr) return;
  form.selectedChars.forEach((c) => {
    if (String(c.rarity) === '4' && !isBfesLocked(c)) {
      c.attr = form.predictAttr;
    }
  });
};

const applyFesRules = () => {
  form.selectedChars.forEach((c) => {
    if (!isBfesSkillAvailable(c) && isActiveFesSkill(c.skillType)) {
      c.skillType = '-';
    }
    if (isBfesVsUnitLocked(c)) {
      c.selectedUnit = 'vs';
    }
  });
};

const applyAutoSkillRules = () => {
  form.selectedChars.forEach((c) => {
    if (isConfirmedSkillLocked()) {
      c.skillType = 'score_up';
      return;
    }

    if (isForcedBfesInBox(c)) {
      c.rarity = '4';
      c.skillType = ACTIVE_FES_SKILL_KEY;
    } else if (isVsFesSkillMode(c) && !['unit_score', ACTIVE_FES_SKILL_KEY].includes(c.skillType)) {
      c.skillType = 'unit_score';
    } else if (isBfesLocked(c)) {
      c.skillType = ACTIVE_FES_SKILL_KEY;
    } else if (isUnitScoreLocked(c)) {
      c.skillType = 'unit_score';
    } else if (!isVsFesSkillMode(c) && (c.skillType === 'unit_score' || isActiveFesSkill(c.skillType))) {
      c.skillType = '-';
    }

    if (!isPScoreAvailable(c) && c.skillType === 'p_score') {
      c.skillType = '-';
    }
  });
};

const lockVSUnitToBanner = () => {
  if (form.eventType !== '箱活' || form.selectedChars.length === 0) return;
  const bannerUnit = getBannerUnit();
  if (!bannerUnit) return;
  form.selectedChars.forEach((c) => {
    if (isBfesVsUnitLocked(c)) {
      c.selectedUnit = 'vs';
    } else if (VS_NAMES.includes(c.name)) {
      c.selectedUnit = bannerUnit;
    }
  });
};

const applyAllRules = () => {
  if (isApplyingRules) return;
  isApplyingRules = true;
  try {
    clearInvalidBoxBanner();
    applyBoxPoolRestriction();
    syncBannerName();
    applyGlobalAttrToFourStars();
    applyFesRules();
    applyAutoSkillRules();
    syncBannerName();
    lockVSUnitToBanner();
  } finally {
    isApplyingRules = false;
    bumpRender();
  }
};

const normalizeAttr = (attr) => {
  const map = {
    pure: 'Pure',
    cool: 'Cool',
    cute: 'Cute',
    happy: 'Happy',
    mysterious: 'Mysterious'
  };
  const raw = String(attr || '').trim();
  if (!raw) return '';
  if (raw === '-') return '-';
  return map[raw.toLowerCase()] || '';
};

const getAttrLabel = (attr) => ATTR_LABELS[attr] || String(attr || '');

// 监听打开并初始化数据
watch([() => props.event, () => props.isOpen], ([newVal, isOpen]) => {
  if (newVal && isOpen) {
    const sourceType = String(newVal.source_event_type || '').trim();
    const sourceIsTeamWorldLink = sourceType === 'World Link' && isWorldLinkTeamSeries({
      source_event_type: sourceType,
      type_series_id: newVal.type_series_id
    });
    const hasFixedType = sourceType.length > 0
      ? sourceIsTeamWorldLink
      : (!newVal.isPredict && !!String(newVal.event_type || '').trim());

    const hasValidType = !!(newVal.event_type && newVal.event_type.trim().length > 0);
    const rawType = hasValidType ? String(newVal.event_type).trim() : '混活';
    const defaultType = (rawType === 'World Link' && !isWorldLinkTeamSeries(newVal)) ? '混活' : rawType;
    form.eventType = hasFixedType ? sourceType : defaultType;
    form.isTypeLocked = hasFixedType;

    const sourceGacha = String(newVal.source_gacha_type || '').trim();
    const hasFixedGacha = sourceGacha.length > 0 || (!newVal.isPredict && !!String(newVal.gacha_type || '').trim());
    const currentGacha = hasFixedGacha ? sourceGacha : (newVal.gacha_type || '常驻');
    form.gachaType = currentGacha === '普通限定'
      ? 'limited'
      : (currentGacha === 'UE限定' ? 'ue' : 'perm');
    form.isGachaLocked = hasFixedGacha;

    form.predictAttr = normalizeAttr(newVal.event_attribute);
    form.bannerName = '';

    if (newVal.memberCards && (newVal.isPredict || isWorldLinkMode.value)) {
      form.selectedChars = newVal.memberCards.map(card => ({
        name: card.Name,
        attr: normalizeAttr(card.Attribute) || '-',
        rarity: card.Rarity,
        selectedUnit: card.Affiliation,
        skillType: card.Skill || '-'
      }));
      form.bannerName = String(newVal.banner || '').trim();
    } else {
      form.selectedChars = [];
    }

    if (!form.predictAttr) {
      form.selectedChars.forEach((c) => {
        if (!c.attr) c.attr = '-';
      });
    }

    applyAllRules();
  }
}, { immediate: true });

watch(() => props.isOpen, (open) => {
  if (!open || !isMobileViewport.value) return;
  sheetHeightVh.value = SHEET_MID_VH;
});

onMounted(() => {
  updateMobileViewport();
  window.addEventListener('resize', updateMobileViewport);
});

onBeforeUnmount(() => {
  clearDisableReasonTimers();
  detachSheetPointerListeners();
  window.removeEventListener('resize', updateMobileViewport);
});

watch(
  () => form.eventType,
  () => {
    applyAllRules();
  }
);

watch(
  () => [form.bannerName, form.selectedChars.map((c) => c.name).join('|')],
  () => {
    applyAllRules();
  }
);

watch(
  () => [form.predictAttr, form.selectedChars.map(c => c.rarity).join('|')],
  () => {
    applyAllRules();
  }
);

watch(
  () => form.gachaType,
  () => {
    applyAllRules();
  }
);

watch(
  () => normalizedBoxLockedUnits.value.join('|'),
  () => {
    applyAllRules();
  }
);

watch(
  () => form.selectedChars.map(c => c.skillType).join('|'),
  () => {
    applyAllRules();
  }
);

watch(
  () => form.selectedChars.map(c => `${c.name}:${c.rarity}:${c.skillType}`).join('|'),
  () => {
    syncBannerName();
  }
);

watch(
  () => [
    props.isOpen,
    form.selectedChars.map((c) => [
      c.name,
      c.attr,
      c.rarity,
      c.selectedUnit,
      c.skillType
    ].join(':')).join('|')
  ],
  ([open]) => {
    if (!open) {
      emit('selection-change', []);
      return;
    }
    emit('selection-change', form.selectedChars.map((c) => ({ ...c })));
  },
  { immediate: true }
);

const isCharInList = (name) => form.selectedChars.some(c => c.name === name);

const toggleChar = (name) => {
  if (isWorldLinkMode.value) return;
  if (!isCharSelectable(name) && !isCharInList(name)) {
    return;
  }

  const idx = form.selectedChars.findIndex(c => c.name === name);
  if (idx > -1) {
    form.selectedChars.splice(idx, 1);
  } else {
    // 新增角色时，尝试根据位置预设星级（前3个四星，第4个三星...）
    const count = form.selectedChars.length;
    let autoRarity = count < 3 ? "4" : (count === 3 ? "3" : "2");
    const isVS = VS_NAMES.includes(name);
    const bannerUnit = getBannerUnit();
    const autoUnit = (form.eventType === '箱活' && isVS && !!bannerUnit)
      ? bannerUnit
      : getOCUnit(name);
    const autoAttr = (form.predictAttr && autoRarity === '4') ? form.predictAttr : '-';
    const autoSkill = (form.gachaType === 'limited' && isVS && autoRarity === '4') ? 'unit_score' : '-';
    form.selectedChars.push({ 
      name, 
      attr: autoAttr,
      rarity: autoRarity,
      selectedUnit: autoUnit,
      skillType: autoSkill
    });

    applyAllRules();
  }
};

const removeChar = (idx) => {
  if (isWorldLinkMode.value) return;
  form.selectedChars.splice(idx, 1);
  applyAllRules();
};

const applyGlobalAttr = () => {
  applyAllRules();
};

const buildDraftPredictPayload = () => {
  if (!props.isOpen || !props.event) return null;
  const finalBannerName = String(activeBannerName.value || '').trim();
  if (!isWorldLinkMode.value && !finalBannerName) return null;

  const processedChars = form.selectedChars.map(char => {
    let finalUnit = char.selectedUnit;
    let finalSkill = char.skillType;

    if (isVsFesSkillMode(char) && finalSkill !== ACTIVE_FES_SKILL_KEY) {
      finalSkill = 'unit_score';
    }

    if (form.eventType === '绠辨椿' && VS_NAMES.includes(char.name)) {
      const bannerUnit = getBannerUnit();
      if (bannerUnit) {
        finalUnit = bannerUnit;
      }
    }

    if (isBfesVsUnitLocked(char)) {
      finalUnit = 'vs';
    }

    return { ...char, skillType: finalSkill, Affiliation: finalUnit };
  });

  return {
    eventId: props.event.id,
    eventType: form.eventType,
    gachaType: form.gachaType,
    predictAttr: form.predictAttr,
    bannerName: finalBannerName,
    selectedChars: processedChars,
    event_title: `[棰勬祴] ${form.eventType}`
  };
};

const emitDraftPredictEvent = () => {
  const payload = buildDraftPredictPayload();
  if (typeof updateDraftPredictEvent === 'function') {
    updateDraftPredictEvent(payload);
  }
};

watch(
  () => [
    props.isOpen,
    props.event?.id,
    form.eventType,
    form.gachaType,
    form.predictAttr,
    form.bannerName,
    form.selectedChars.map((c) => [
      c.name,
      c.attr,
      c.rarity,
      c.selectedUnit,
      c.skillType
    ].join(':')).join('|')
  ],
  () => {
    emitDraftPredictEvent();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (typeof updateDraftPredictEvent === 'function') updateDraftPredictEvent(null);
});

const submit = () => {
  const finalBannerName = String(activeBannerName.value || '').trim();
  if (!isWorldLinkMode.value && !finalBannerName) {
    alert('请先选择一个 Ban主。');
    return;
  }

  const processedChars = form.selectedChars.map(char => {
    let finalUnit = char.selectedUnit;
    let finalSkill = char.skillType;

    if (isVsFesSkillMode(char) && finalSkill !== ACTIVE_FES_SKILL_KEY) {
      finalSkill = 'unit_score';
    }

    // 如果是箱活，VS 自动强制跟随第一个角色的 Unit
    if (form.eventType === '箱活' && VS_NAMES.includes(char.name)) {
      const bannerUnit = getBannerUnit();
      if (bannerUnit) {
        finalUnit = bannerUnit;
      }
    }

    if (isBfesVsUnitLocked(char)) {
      finalUnit = 'vs';
    }

    return { ...char, skillType: finalSkill, Affiliation: finalUnit };
  });

  if (typeof updateDraftPredictEvent === 'function') updateDraftPredictEvent(null);
  savePredictEvent({
    eventId: props.event.id,
    eventType: form.eventType,
    gachaType: form.gachaType,
    predictAttr: form.predictAttr,
    bannerName: finalBannerName,
    selectedChars: processedChars,
    event_title: `[预测] ${form.eventType}`
  });
  emit('close');
};
</script>

<style scoped>
.predict-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: clamp(320px, 30vw, 380px);
  height: 100vh;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  padding: 0;
  color: #102033;
  overflow: hidden;
  background:
    linear-gradient(138deg, rgba(204, 251, 241, 0.28) 0%, rgba(186, 230, 253, 0.16) 38%, rgba(255, 255, 255, 0.12) 64%, rgba(240, 253, 250, 0.20) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(236, 254, 255, 0.10));
  border-left: 1px solid rgba(255, 255, 255, 0.66);
  box-shadow:
    -22px 0 42px rgba(15, 23, 42, 0.20),
    inset 1px 0 0 rgba(255, 255, 255, 0.95),
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    inset 0 -1px 0 rgba(148, 163, 184, 0.12);
  backdrop-filter: saturate(190%) blur(30px);
  -webkit-backdrop-filter: saturate(190%) blur(30px);
  --pe-radius-card: 999px;
  --pe-radius-btn: 999px;
  --pe-glass-bg: linear-gradient(145deg, rgba(204, 251, 241, 0.34), rgba(186, 230, 253, 0.16) 50%, rgba(255, 255, 255, 0.12));
  --pe-glass-bg-hover: linear-gradient(145deg, rgba(204, 251, 241, 0.48), rgba(125, 211, 252, 0.22) 54%, rgba(255, 255, 255, 0.18));
  --pe-glass-bg-strong: linear-gradient(145deg, rgba(204, 251, 241, 0.30), rgba(186, 230, 253, 0.14) 54%, rgba(255, 255, 255, 0.12));
  --pe-glass-border: rgba(255, 255, 255, 0.56);
  --pe-glass-shadow: 0 12px 30px rgba(15, 23, 42, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.92), inset 0 -1px 0 rgba(148, 163, 184, 0.12);
  --pe-glass-shadow-soft: 0 6px 18px rgba(15, 23, 42, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.88), inset 0 -1px 0 rgba(148, 163, 184, 0.10);
  --pe-accent: #22b8ad;
  --pe-accent-strong: #0f9f96;
  --pe-danger: #ef4444;
}

.predict-drawer::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(104deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.18) 23%, transparent 48%),
    linear-gradient(270deg, rgba(255, 255, 255, 0.58), transparent 18%);
  mix-blend-mode: screen;
  opacity: 0.82;
}

.predict-drawer > * {
  position: relative;
  z-index: 1;
}

.predict-drawer.is-mobile-sheet {
  top: auto;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 62dvh;
  border-radius: 24px 24px 0 0;
  border-left: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.88);
  background:
    linear-gradient(136deg, rgba(204, 251, 241, 0.46) 0%, rgba(186, 230, 253, 0.30) 42%, rgba(255, 255, 255, 0.28) 64%, rgba(240, 253, 250, 0.38) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(236, 254, 255, 0.24));
  box-shadow:
    0 -20px 42px rgba(15, 23, 42, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 -1px 0 rgba(148, 163, 184, 0.12);
  transition: height 0.16s ease;
  --pe-glass-bg: linear-gradient(145deg, rgba(204, 251, 241, 0.48), rgba(186, 230, 253, 0.24) 50%, rgba(255, 255, 255, 0.22));
  --pe-glass-bg-hover: linear-gradient(145deg, rgba(204, 251, 241, 0.62), rgba(125, 211, 252, 0.30) 54%, rgba(255, 255, 255, 0.28));
  --pe-glass-bg-strong: linear-gradient(145deg, rgba(204, 251, 241, 0.42), rgba(186, 230, 253, 0.22) 54%, rgba(255, 255, 255, 0.22));
  --pe-glass-border: rgba(255, 255, 255, 0.72);
}

.drawer-grab-handle {
  width: 100%;
  height: 22px;
  margin: 0 0 6px;
  position: relative;
  touch-action: none;
  cursor: ns-resize;
}

.drawer-grab-handle::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 8px;
  transform: translateX(-50%);
  width: 44px;
  height: 5px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.34);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.drawer-header {
  padding: 16px 16px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.70);
  background: linear-gradient(180deg, rgba(236, 254, 255, 0.30), rgba(204, 251, 241, 0.08));
  box-shadow: inset 0 -1px 0 rgba(148, 163, 184, 0.08);
}
.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.header-main h3 {
  margin: 0;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 1.08rem;
  font-weight: 800;
  letter-spacing: 0;
}
.ev-id {
  min-height: 24px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  color: #0f766e;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.82rem;
  background: linear-gradient(145deg, rgba(236, 254, 255, 0.76), rgba(204, 251, 241, 0.36));
  border: 1px solid rgba(20, 184, 166, 0.34);
  box-shadow: var(--pe-glass-shadow-soft);
}
.close-btn {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  cursor: pointer;
  color: #64748b;
  font-size: 22px;
  line-height: 1;
  background: var(--pe-glass-bg);
  box-shadow: var(--pe-glass-shadow-soft);
  backdrop-filter: saturate(160%) blur(14px);
  -webkit-backdrop-filter: saturate(160%) blur(14px);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, filter 0.16s ease, transform 0.16s ease;
}
.close-btn:hover {
  color: #0f172a;
  border-color: rgba(148, 163, 184, 0.34);
  background: var(--pe-glass-bg-hover);
}

.global-config-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin: 0 -6px;
  padding: 7px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  background:
    linear-gradient(145deg, rgba(20, 184, 166, 0.04), rgba(14, 165, 233, 0.025) 52%, rgba(255, 255, 255, 0.14)),
    rgba(255, 255, 255, 0.12);
  box-shadow:
    0 8px 22px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.70),
    inset 0 -1px 0 rgba(14, 165, 233, 0.10);
  backdrop-filter: saturate(180%) blur(18px);
  -webkit-backdrop-filter: saturate(180%) blur(18px);
}
.global-config-bar.has-banner { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.cfg-group {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.cfg-group label {
  display: block;
  font-size: 10px;
  color: #526579;
  margin-bottom: 3px;
  font-weight: 800;
  text-align: center;
}
.cfg-group select {
  width: 100%;
  min-height: 30px;
  padding: 5px 24px 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: rgba(240, 253, 250, 0.38);
  background-image:
    linear-gradient(45deg, transparent 50%, #64748b 50%),
    linear-gradient(135deg, #64748b 50%, transparent 50%);
  background-position:
    calc(100% - 13px) 50%,
    calc(100% - 8px) 50%;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  box-shadow: var(--pe-glass-shadow-soft);
  backdrop-filter: saturate(150%) blur(10px);
  -webkit-backdrop-filter: saturate(150%) blur(10px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}
.cfg-group select:focus,
.mini-select:focus {
  outline: none;
  border-color: rgba(20, 184, 166, 0.56);
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.selected-section {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 10px 8px;
  scrollbar-width: thin;
}
.section-title {
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 7px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.tip { font-weight: 600; font-size: 10.5px; color: #64748b; text-align: right; }

.selected-list { display: flex; flex-direction: column; gap: 8px; }
.editor-card { 
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 7px 12px 7px 7px;
  background: var(--pe-glass-bg-strong);
  border: 1px solid var(--pe-glass-border);
  border-radius: var(--pe-radius-card);
  box-shadow: var(--pe-glass-shadow-soft);
  backdrop-filter: saturate(150%) blur(14px);
  -webkit-backdrop-filter: saturate(150%) blur(14px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.16s ease;
}
.editor-card::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: var(--pe-radius-card);
  pointer-events: none;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.64), transparent 42%);
  opacity: 0.72;
}
.editor-card > * {
  position: relative;
  z-index: 1;
}
.editor-card:hover {
  border-color: rgba(45, 212, 191, 0.36);
  background: var(--pe-glass-bg-hover);
  box-shadow: var(--pe-glass-shadow);
}
.editor-card.is-banner-card {
  border-color: rgba(251, 146, 60, 0.36);
  background:
    linear-gradient(145deg, rgba(254, 215, 170, 0.26), rgba(255, 247, 237, 0.16) 54%, rgba(204, 251, 241, 0.14)),
    var(--pe-glass-bg-strong);
  box-shadow:
    0 8px 18px rgba(251, 146, 60, 0.08),
    0 0 0 1px rgba(251, 146, 60, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.84),
    inset 0 -1px 0 rgba(251, 146, 60, 0.10);
}

.card-left {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.editor-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
  flex: 0 0 auto;
  border: 0;
  outline: 0;
  background: transparent;
  box-shadow: none;
  clip-path: circle(47% at 50% 50%);
}
.card-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 15px;
}
.char-name { font-weight: 800; font-size: 13px; color: #102033; }

.config-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  align-items: center;
}
.mini-select {
  width: 100%;
  min-width: 0;
  min-height: 25px;
  padding: 3px 21px 3px 9px;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: rgba(255, 255, 255, 0.58);
  background-image:
    linear-gradient(45deg, transparent 50%, #64748b 50%),
    linear-gradient(135deg, #64748b 50%, transparent 50%);
  background-position:
    calc(100% - 12px) 50%,
    calc(100% - 7px) 50%;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  box-shadow: var(--pe-glass-shadow-soft);
  backdrop-filter: saturate(150%) blur(10px);
  -webkit-backdrop-filter: saturate(150%) blur(10px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}
.cfg-group select:disabled,
.mini-select:disabled {
  background-color: rgba(226, 232, 240, 0.56);
  color: #94a3b8;
  cursor: not-allowed;
}
.unit-tag {
  width: 100%;
  min-width: 0;
  min-height: 23px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  background: linear-gradient(145deg, rgba(226, 232, 240, 0.66), rgba(241, 245, 249, 0.34) 58%, rgba(203, 213, 225, 0.18));
  padding: 2px 8px;
  border-radius: 999px;
  color: #64748b;
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(150%) blur(10px);
  -webkit-backdrop-filter: saturate(150%) blur(10px);
  box-sizing: border-box;
}

.pool-section {
  height: auto;
  padding: 7px 10px 10px;
  box-sizing: border-box;
  border-top: 1px solid rgba(255, 255, 255, 0.70);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.42));
}
.char-pool-grid { 
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 4px;
  overflow: visible;
  max-height: none;
  align-content: start;
}
.pool-item {
  position: relative;
  cursor: pointer;
  border-radius: 12px;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  transition: transform 0.16s ease, filter 0.2s ease;
}
.pool-item:hover {
  transform: translateY(-1px);
  filter: saturate(1.08);
}
.pool-item img {
  width: 100%;
  display: block;
  border-radius: 9px;
  filter: grayscale(1);
  opacity: 0.42;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
}
.pool-item.is_selected {
  background: transparent;
  box-shadow: none;
}
.pool-item.is_selected img {
  filter: grayscale(0);
  opacity: 1;
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.78), 0 7px 14px rgba(20, 184, 166, 0.18);
}
.pool-item.is_disabled { cursor: not-allowed; }
.pool-item.is_disabled:hover {
  transform: none;
  filter: none;
}
.pool-item.is_disabled img { filter: grayscale(1); opacity: 0.2; }
.pool-disable-popover {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
  min-width: 86px;
  max-width: 120px;
  padding: 3px 5px;
  border-radius: 6px;
  font-size: 9px;
  line-height: 1.25;
  text-align: center;
  color: #fff;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.26);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.24);
  pointer-events: none;
  z-index: 5;
}

.pool-disable-popover::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(15, 23, 42, 0.94);
}
.check-mark { 
  position: absolute;
  bottom: 1px;
  right: -3px;
  background: linear-gradient(145deg, rgba(20, 184, 166, 0.98), rgba(14, 165, 233, 0.78));
  color: white;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.86);
  box-shadow: 0 4px 8px rgba(20, 184, 166, 0.24);
}

.drawer-footer {
  padding: 9px 10px 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.72);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.54));
}
.save-all-btn { 
  width: 100%;
  min-height: 42px;
  padding: 10px;
  background: linear-gradient(145deg, rgba(20, 184, 166, 0.96), rgba(14, 165, 233, 0.78));
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 999px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(20, 184, 166, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.48);
  transition: filter 0.16s ease, transform 0.16s ease, box-shadow 0.2s ease;
}
.save-all-btn:hover {
  filter: saturate(1.04) brightness(1.02);
}
.close-btn:not(:disabled):active,
.pool-item:not(.is_disabled):active,
.save-all-btn:not(:disabled):active {
  filter: brightness(0.94);
  transform: translateY(1px);
}

/* 进场动画 */
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to {
  transform: translate3d(100%, 0, 0);
  -webkit-transform: translate3d(100%, 0, 0);
}

.empty-hint {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  margin: 0;
  padding: 7px 12px;
  border-radius: var(--pe-radius-card);
  background: var(--pe-glass-bg-strong);
  border: 1px solid var(--pe-glass-border);
  box-shadow: var(--pe-glass-shadow-soft);
  backdrop-filter: saturate(160%) blur(12px);
  -webkit-backdrop-filter: saturate(160%) blur(12px);
}
.wl-lock-note {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.6;
}

@media (min-width: 901px) and (max-width: 1200px) {
  .drawer-header {
    padding: 14px;
  }

  .header-main {
    margin-bottom: 10px;
  }

  .header-main h3 {
    font-size: 1.06rem;
  }

  .global-config-bar,
  .global-config-bar.has-banner {
    gap: 6px;
    padding: 6px;
  }

  .cfg-group label {
    font-size: 10px;
  }

  .cfg-group select {
    font-size: 11px;
    padding: 5px 24px 5px 9px;
  }

  .selected-section {
    padding: 8px;
  }

  .editor-card {
    gap: 8px;
    min-height: 58px;
    padding: 7px;
  }

  .editor-avatar {
    width: 44px;
    height: 44px;
  }
}

@media (max-width: 900px) {
  .predict-drawer {
    width: 100vw;
    height: 62dvh;
  }

  .drawer-header {
    padding: 10px;
  }

  .global-config-bar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
    margin: 0 -4px;
    padding: 6px;
  }

  .global-config-bar.has-banner {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .cfg-group label {
    font-size: 10px;
    margin-bottom: 2px;
  }

  .cfg-group select {
    font-size: 11px;
    padding: 4px 22px 4px 8px;
  }

  .selected-section {
    padding: 6px;
    flex: 1 1 auto;
    overflow-y: auto;
  }

  .selected-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .editor-card {
    position: relative;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    min-height: 54px;
    padding: 6px;
  }

  .card-left {
    flex: 0 0 auto;
    align-self: center;
  }

  .editor-avatar {
    width: 38px;
    height: 38px;
  }

  .card-right {
    flex: 1 1 auto;
    width: auto;
    justify-content: center;
    gap: 0;
  }

  .char-name {
    display: none;
  }

  .name-row {
    display: none;
  }

  .config-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 0;
    row-gap: 4px;
  }

  .mini-select,
  .unit-tag {
    width: 94%;
    box-sizing: border-box;
    text-align: center;
    font-size: 10px;
    justify-self: center;
  }

  .config-row > :nth-child(odd) {
    justify-self: end;
    margin-right: 1px;
  }

  .config-row > :nth-child(even) {
    justify-self: start;
    margin-left: 1px;
  }

  .mini-select {
    padding: 2px 10px 2px 8px;
  }

  .unit-tag {
    padding: 2px 8px;
    min-height: 24px;
  }

  .empty-hint {
    min-height: 54px;
    padding: 6px;
  }

  .pool-section {
    height: auto;
    padding: 6px;
  }

  .char-pool-grid {
    grid-template-columns: repeat(auto-fill, minmax(26px, 1fr));
    max-height: none;
    gap: 3px;
    overflow-y: visible;
  }

  .pool-item img {
    border-radius: 8px;
  }

  .check-mark {
    width: 10px;
    height: 10px;
    font-size: 8px;
    right: -2px;
    bottom: 1px;
  }
}

@media (max-width: 520px) {
  .header-main h3 {
    font-size: 1rem;
  }

  .cfg-group label {
    font-size: 10px;
  }

  .cfg-group select {
    font-size: 10px;
  }

  .global-config-bar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .global-config-bar.has-banner {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .char-name {
    font-size: 11px;
  }

  .config-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 0;
    row-gap: 3px;
  }

  .save-all-btn {
    padding: 8px;
    font-size: 0.84rem;
  }
}
</style>
