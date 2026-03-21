<template>
  <transition name="slide">
    <div v-if="isOpen" class="predict-drawer" :class="{ 'is-mobile-sheet': isMobileViewport }" :style="drawerStyle">
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
        
        <div class="global-config-bar">
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
              <option v-for="a in ATTRS" :key="a" :value="a">{{a}}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="selected-section">
        <div class="section-title">
          <span>当前阵容 ({{ form.selectedChars.length }})</span>
          <span class="tip">{{ isWorldLinkMode ? 'World Link 人选固定' : '第一个角色默认为 Banner' }}</span>
        </div>
        
        <div class="selected-list" :key="selectedRenderKey">
          <div v-for="(char, idx) in form.selectedChars" :key="char.name" class="editor-card">
            <div class="card-left">
              <div class="order-badge">{{ idx + 1 }}</div>
              <img :src="`/chars/${charMap[char.name]}.png`" class="editor-avatar" />
            </div>
            
            <div class="card-right">
              <div class="name-row">
                <span class="char-name">{{ char.name }}</span>
                <button v-if="!isWorldLinkMode" @click="removeChar(idx)" class="remove-btn">×</button>
              </div>
              
              <div class="config-row">
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

                <select v-if="VS_NAMES.includes(char.name) && !isVSUnitLocked(char)" v-model="char.selectedUnit" class="mini-select unit-sel">
                  <option v-for="u in UNITS" :key="u" :value="u">{{u.toUpperCase()}}</option>
                </select>
                <span v-else class="unit-tag">{{ getDisplayUnit(char).toUpperCase() }}</span>

                <select v-if="isVsFesSkillMode(char)" v-model="char.skillType" class="mini-select skill-sel">
                  <option value="unit_score">团分</option>
                  <option value="bfes_up">BFES</option>
                </select>
                <select v-else v-model="char.skillType" class="mini-select skill-sel" :disabled="isSkillLocked(char)">
                  <option value="-">待定</option>
                  <option value="score_up">分卡</option>
                  <option v-if="isPScoreAvailable(char)" value="p_score">P分</option>
                  <option value="recovery">奶卡</option>
                  <option value="accuracy">判卡</option>
                  <option v-if="isUnitScoreLocked(char)" value="unit_score">团分</option>
                  <option v-if="isBfesSkillAvailable(char)" value="bfes_up">BFES</option>
                </select>
              </div>
            </div>
          </div>
          <div v-if="form.selectedChars.length === 0" class="empty-hint">请在下方选择角色...</div>
        </div>
      </div>

      <div v-if="!isWorldLinkMode" class="pool-section">
        <div class="section-title">角色人选库</div>
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
        World Link 人选已固定，当前仅可调整属性与技能。
      </div>

      <div class="drawer-footer">
        <button @click="submit" class="save-all-btn">确认并保存预测</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { reactive, inject, watch, computed, ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps(['isOpen', 'event', 'charMap', 'boxLockedUnits']);
const emit = defineEmits(['close', 'selection-change']);
const savePredictEvent = inject('savePredictEvent');

const ATTRS = ['Pure','Cool','Cute','Happy','Mysterious'];
const UNITS = ['vs','ln','mmj','vbs','ws','nc'];
const BOX_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc'];
const VS_NAMES = ["初音未来", "镜音铃", "镜音连", "巡音流歌", "MEIKO", "KAITO"];
const FES_FESTIVALS = ['周年', '半周年', '夏活', '新年'];
const CHAR_UNIT_MAP = {
  "星乃一歌": "ln", "天马咲希": "ln", "望月穗波": "ln", "日野森志步": "ln",
  "花里实乃里": "mmj", "桐谷遥": "mmj", "桃井爱莉": "mmj", "日野森雫": "mmj",
  "小豆泽心羽": "vbs", "白石杏": "vbs", "东云彰人": "vbs", "青柳冬弥": "vbs",
  "天马司": "ws", "凤笑梦": "ws", "草薙宁宁": "ws", "神代类": "ws",
  "宵崎奏": "nc", "朝比奈真冬": "nc", "东云绘名": "nc", "晓山瑞希": "nc",
};

const form = reactive({
  eventType: '混活',
  gachaType: 'perm',
  predictAttr: '',
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
const normalizedBoxLockedUnits = computed(() => {
  const list = Array.isArray(props.boxLockedUnits) ? props.boxLockedUnits : [];
  return list
    .map((u) => String(u || '').trim().toLowerCase())
    .filter((u) => BOX_UNITS.includes(u));
});

let isApplyingRules = false;

const getOCUnit = (name) => CHAR_UNIT_MAP[name] || 'vs';
const isUnitLockedInCurrentRound = (unit) => {
  if (form.eventType !== '箱活') return false;
  return normalizedBoxLockedUnits.value.includes(String(unit || '').trim().toLowerCase());
};
const isFesFestival = () => FES_FESTIVALS.includes(String(props.event?.festival || '').trim());
const isBfesSkillAvailable = (char) => isFesFestival() && String(char?.rarity) === '4';
const isPScoreAvailable = (char) => String(char?.rarity) === '4';
const isVsFesSkillMode = (char) => isBfesSkillAvailable(char) && VS_NAMES.includes(char?.name);
const getBannerUnit = () => {
  if (!form.selectedChars.length) return 'vs';
  return getOCUnit(form.selectedChars[0].name);
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
  return isWorldLinkMode.value || isBfesVsUnitLocked(char) || (form.eventType === '箱活' && VS_NAMES.includes(char.name) && form.selectedChars.length > 0);
};

const isBfesLocked = (char) => {
  return String(char?.skillType || '') === 'bfes_up' && String(char?.rarity) === '4';
};

const isForcedBfesInBox = (char) => {
  if (form.eventType !== '箱活' || !isFesFestival() || form.selectedChars.length === 0) return false;
  if (VS_NAMES.includes(char?.name)) return false;
  return getOCUnit(char?.name) !== getBannerUnit();
};

const isBfesVsUnitLocked = (char) => {
  return isBfesLocked(char) && VS_NAMES.includes(char?.name);
};

const isUnitScoreLocked = (char) => {
  return !isVsFesSkillMode(char) && !isBfesLocked(char) && form.gachaType === 'limited' && VS_NAMES.includes(char?.name) && String(char?.rarity) === '4';
};

const isSkillLocked = (char) => {
  return isForcedBfesInBox(char) || isUnitScoreLocked(char);
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

  if (!VS_NAMES.includes(name) && isUnitLockedInCurrentRound(getOCUnit(name))) {
    return '本轮箱活已出';
  }

  if (form.selectedChars.length === 0) {
    return VS_NAMES.includes(name) ? '箱活ban主禁止选v' : '';
  }

  if (isFesFestival()) return '';
  if (VS_NAMES.includes(name)) return '';

  const bannerUnit = getBannerUnit();
  return getOCUnit(name) === bannerUnit ? '' : '与箱活团队不一致';
};

const clearInvalidBoxBanner = () => {
  if (form.eventType !== '箱活') return;
  while (
    form.selectedChars.length > 0 && (
      VS_NAMES.includes(form.selectedChars[0].name)
      || isUnitLockedInCurrentRound(getOCUnit(form.selectedChars[0].name))
    )
  ) {
    form.selectedChars.splice(0, 1);
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
    if (!isBfesSkillAvailable(c) && c.skillType === 'bfes_up') {
      c.skillType = '-';
    }
    if (isBfesVsUnitLocked(c)) {
      c.selectedUnit = 'vs';
    }
  });
};

const applyAutoSkillRules = () => {
  form.selectedChars.forEach((c) => {
    if (isForcedBfesInBox(c)) {
      c.rarity = '4';
      c.skillType = 'bfes_up';
    } else if (isVsFesSkillMode(c) && !['unit_score', 'bfes_up'].includes(c.skillType)) {
      c.skillType = 'unit_score';
    } else if (isBfesLocked(c)) {
      c.skillType = 'bfes_up';
    } else if (isUnitScoreLocked(c)) {
      c.skillType = 'unit_score';
    } else if (!isVsFesSkillMode(c) && (c.skillType === 'unit_score' || c.skillType === 'bfes_up')) {
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
    applyGlobalAttrToFourStars();
    applyFesRules();
    applyAutoSkillRules();
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

    if (newVal.memberCards && (newVal.isPredict || isWorldLinkMode.value)) {
      form.selectedChars = newVal.memberCards.map(card => ({
        name: card.Name,
        attr: normalizeAttr(card.Attribute) || '-',
        rarity: card.Rarity,
        selectedUnit: card.Affiliation,
        skillType: card.Skill || '-'
      }));
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
  () => form.selectedChars[0]?.name,
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
  () => [props.isOpen, form.selectedChars.map((c) => c.name).join('|')],
  ([open]) => {
    if (!open) {
      emit('selection-change', []);
      return;
    }
    emit('selection-change', form.selectedChars.map((c) => c.name));
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
    const autoUnit = (form.eventType === '箱活' && isVS && form.selectedChars.length > 0)
      ? getBannerUnit()
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

const submit = () => {
  const processedChars = form.selectedChars.map(char => {
    let finalUnit = char.selectedUnit;
    let finalSkill = char.skillType;

    if (isVsFesSkillMode(char) && finalSkill !== 'bfes_up') {
      finalSkill = 'unit_score';
    }

    // 如果是箱活，VS 自动强制跟随第一个角色的 Unit
    if (form.eventType === '箱活' && VS_NAMES.includes(char.name)) {
      const bannerUnit = getOCUnit(form.selectedChars[0].name);
      finalUnit = bannerUnit;
    }

    if (isBfesVsUnitLocked(char)) {
      finalUnit = 'vs';
    }

    return { ...char, skillType: finalSkill, Affiliation: finalUnit };
  });

  savePredictEvent({
    eventId: props.event.id,
    eventType: form.eventType,
    gachaType: form.gachaType,
    predictAttr: form.predictAttr,
    selectedChars: processedChars,
    event_title: `[预测] ${form.eventType}`
  });
  emit('close');
};
</script>

<style scoped>
.predict-drawer {
  position: fixed; top: 0; right: 0; width: 380px; height: 100vh;
  background: white; z-index: 3000; box-shadow: -5px 0 25px rgba(0,0,0,0.15);
  display: flex; flex-direction: column; padding: 0;
}

.predict-drawer.is-mobile-sheet {
  top: auto;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 62dvh;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.18);
  transition: height 0.16s ease;
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
  background: #cbd5e1;
}

.drawer-header { padding: 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.header-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.header-main h3 { margin: 0; font-size: 1.2rem; }
.ev-id { color: #33ccbb; font-family: monospace; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; }

.global-config-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.cfg-group label { display: block; font-size: 11px; color: #64748b; margin-bottom: 4px; font-weight: bold; }
.cfg-group select { width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; }

.selected-section { flex: 1; overflow-y: auto; padding: 10px; }
.section-title { font-size: 13px; font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; }
.tip { font-weight: normal; font-size: 11px; color: #94a3b8; }

.selected-list { display: flex; flex-direction: column; gap: 10px; }
.editor-card { 
  display: flex; gap: 12px; padding: 10px; background: #fff; 
  border: 1px solid #e2e8f0; border-radius: 10px; transition: 0.2s;
}
.editor-card:first-child { border-left: 5px solid #ff7722; }

.card-left { position: relative; }
.editor-avatar { width: 50px; height: 50px; border-radius: 8px; }
.order-badge { 
  position: absolute; top: -8px; left: -8px; width: 18px; height: 18px;
  background: #33ccbb; color: white; border-radius: 50%; font-size: 10px;
  display: flex; align-items: center; justify-content: center; border: 2px solid white;
}

.card-right { flex: 1; }
.name-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
.char-name { font-weight: bold; font-size: 13px; }
.remove-btn { background: #fee2e2; color: #ef4444; border: none; border-radius: 4px; padding: 0 6px; cursor: pointer; }

.config-row { display: flex; gap: 6px; align-items: center; }
.mini-select { padding: 3px; font-size: 11px; border-radius: 4px; border: 1px solid #cbd5e1; }
.unit-tag { font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #64748b; }

.pool-section {
  height: auto;
  padding: 10px 10px 12px;
  box-sizing: border-box;
  border-top: 1px solid #eee;
  background: #fff;
}
.char-pool-grid { 
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 4px;
  overflow: visible;
  max-height: none;
  align-content: start;
}
.pool-item { position: relative; cursor: pointer; }
.pool-item img { width: 100%; display: block; border-radius: 6px; filter: grayscale(1); opacity: 0.4; }
.pool-item.is_selected img { filter: grayscale(0); opacity: 1; border: 2px solid #33ccbb; }
.pool-item.is_disabled { cursor: not-allowed; }
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
  position: absolute; bottom: 3px; right: -4px; background: #33ccbb; 
  color: white; width: 12px; height: 12px; border-radius: 50%; font-size: 9px;
  display: flex; align-items: center; justify-content: center;
}

.drawer-footer { padding: 8px; border-top: 1px solid #eee; }
.save-all-btn { 
  width: 100%; padding: 10px; background: #33ccbb; color: white; 
  border: none; border-radius: 8px; font-weight: bold; cursor: pointer;
}

/* 进场动画 */
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }

.empty-hint { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }

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
    gap: 6px;
  }

  .cfg-group label {
    font-size: 10px;
    margin-bottom: 2px;
  }

  .cfg-group select {
    font-size: 11px;
    padding: 4px;
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
    align-items: flex-start;
    gap: 6px;
    padding: 6px 24px 6px 6px;
  }

  .card-left {
    flex: 0 0 auto;
  }

  .editor-avatar {
    width: 38px;
    height: 38px;
  }

  .card-right {
    flex: 1 1 auto;
    width: auto;
  }

  .char-name {
    display: none;
  }

  .name-row {
    position: absolute;
    top: 4px;
    right: 4px;
    margin: 0;
    justify-content: flex-end;
  }

  .remove-btn {
    padding: 0 5px;
    line-height: 1.2;
  }

  .config-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
  }

  .mini-select,
  .unit-tag {
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    font-size: 10px;
    padding: 2px 3px;
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
    border-radius: 4px;
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

  .char-name {
    font-size: 11px;
  }

  .config-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 3px;
  }

  .save-all-btn {
    padding: 8px;
    font-size: 0.84rem;
  }
}
</style>