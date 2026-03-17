<template>
  <div class="main-app">
    <div class="nav-tabs">
      <button 
        :class="{ active: currentTab === 'stats' }" 
        @click="setCurrentTab('stats')"
      >📊 统计面板</button>
      <button 
        :class="{ active: currentTab === 'history' }" 
        @click="setCurrentTab('history')"
      >📅 历史活动一览</button>
      <div class="predict-info" v-if="predictiveEvents.length > 0">
        已添加 {{ predictiveEvents.length }} 条预测
      </div>
      <div class="predict-cleanup-info" v-if="cleanedPatchNoticeCount > 0">
        已自动清理 {{ cleanedPatchNoticeCount }} 条过期/冲突预测
      </div>
      <button @click="exportPredicts" class="io-btn" title="导出预测到文件">📤 导出</button>
      <div
        class="io-drop-zone"
        :class="{ 'is-drag-over': isImportDragOver }"
        @dragenter.prevent="onImportDragEnter"
        @dragover.prevent="onImportDragOver"
        @dragleave.prevent="onImportDragLeave"
        @drop.prevent="onImportDrop"
      >
        <button @click="triggerImportPredicts" class="io-btn" title="从文件导入预测">📥 导入</button>
        <span class="io-drop-hint">拖拽 JSON 到这里可直接导入</span>
      </div>
      <input
        ref="predictImportInputRef"
        type="file"
        accept="application/json,.json"
        class="predict-import-input"
        @change="handleImportPredictsFile"
      />
      <button v-if="predictiveEvents.length > 0" @click="clearPredicts" class="reset-btn"
      >🗑️ 清空所有预测</button>
    </div>

    <div
      ref="contentAreaRef"
      class="content-area"
      :class="{ 'history-mode': currentTab === 'history' }"
      @scroll.passive="handleContentScroll"
    >
      <keep-alive>
        <component 
          ref="tabComponentRef"
          :is="tabs[currentTab]" 
          :all-events="totalEventData" 
          :all-cards="totalCardsData"
          :all-base-cards="baseCards"
          :stats-preview-data="statsPreviewData"
          :preview-sync-event-id="previewSyncEventId"
          :jump-event-id="historyJumpEventId"
          :jump-event-seq="historyJumpSeq"
          @jump-to-event="handleStatsJumpToEvent"
          @stats-preview-update="handleStatsPreviewUpdate"
          @sync-preview-event-id="handlePreviewSyncEventId"
        />
      </keep-alive>
    </div>

    <button
      v-if="showBackToTopBtn"
      class="floating-top-btn"
      title="回到顶部"
      @click="scrollContentToTop"
    >
      <span class="floating-top-btn-icon">↑</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, watch, nextTick } from 'vue';
import CardStats from './components/CardStats.vue';
import EventHistory from './components/EventHistory.vue';

// --- 界面切换逻辑 (恢复原样) ---
const currentTab = ref('history');
const tabs = {
  stats: CardStats,
  history: EventHistory
};
const historyJumpEventId = ref(null);
const historyJumpSeq = ref(0);
const statsPreviewData = ref(null);
const previewSyncEventId = ref(null);
const tabComponentRef = ref(null);
const contentAreaRef = ref(null);
const statsScrollTop = ref(0);
const showBackToTopBtn = ref(false);
const predictImportInputRef = ref(null);
const isImportDragOver = ref(false);

const handleStatsPreviewUpdate = (payload) => {
  statsPreviewData.value = payload || null;
};

const handlePreviewSyncEventId = (eventId) => {
  const n = Number(eventId);
  previewSyncEventId.value = Number.isFinite(n) && n > 0 ? n : null;
};

const requestHistoryJump = (eventId, retry = 18) => {
  const instance = tabComponentRef.value;
  const jumpFn = instance && typeof instance.jumpToEventById === 'function'
    ? instance.jumpToEventById
    : null;

  if (jumpFn) {
    const ok = jumpFn(eventId, 'auto');
    if (ok) return;
  }

  if (retry > 0) {
    setTimeout(() => {
      requestHistoryJump(eventId, retry - 1);
    }, 80);
  }
};

const saveStatsScroll = () => {
  if (currentTab.value !== 'stats') return;
  if (!contentAreaRef.value) return;
  statsScrollTop.value = contentAreaRef.value.scrollTop || 0;
};

const handleContentScroll = () => {
  if (contentAreaRef.value) {
    showBackToTopBtn.value = contentAreaRef.value.scrollTop > 260;
  }
  saveStatsScroll();
};

const scrollContentToTop = () => {
  if (!contentAreaRef.value) return;
  contentAreaRef.value.scrollTo({ top: 0, behavior: 'smooth' });
};

const setCurrentTab = (tab) => {
  if (tab === currentTab.value) return;
  if (currentTab.value === 'stats') {
    saveStatsScroll();
  }
  currentTab.value = tab;
};

const handleStatsJumpToEvent = async (eventId) => {
  const id = String(eventId ?? '').trim();
  if (!id) return;

  saveStatsScroll();
  historyJumpEventId.value = id;
  historyJumpSeq.value += 1;
  setCurrentTab('history');
  await nextTick();
  requestHistoryJump(id);
};

watch(currentTab, async (nextTab, prevTab) => {
  if (nextTab === 'stats') {
    await nextTick();
    if (contentAreaRef.value) {
      contentAreaRef.value.scrollTop = statsScrollTop.value;
    }
  }
});

// --- 数据管理逻辑 (新增预测支持) ---
const historyData = ref([]);      // 既定的历史 JSON 数据
const baseCards = ref([]); // 新增：存储基础卡片库
const predictiveEvents = ref([]); // 用户填写的预测数据
const cleanedPatchNoticeCount = ref(0);

const hasValidEventTitle = (value) => String(value || '').trim().length > 0;

const getCurrentOfficialEventId = () => {
  const today = new Date();
  const ids = (historyData.value || [])
    .filter((ev) => {
      const idNum = Number(ev?.id);
      if (!Number.isFinite(idNum)) return false;
      if (!hasValidEventTitle(ev?.event_title)) return false;
      const d = new Date(String(ev?.date || '').replace(/\//g, '-'));
      if (Number.isNaN(d.getTime())) return false;
      return d <= today;
    })
    .map((ev) => Number(ev.id));
  return ids.length ? Math.max(...ids) : -1;
};

const getSourceEventById = (eventId) => {
  const idNum = Number(eventId);
  if (!Number.isFinite(idNum)) return null;
  return (historyData.value || []).find((ev) => Number(ev?.id) === idNum) || null;
};

const normalizeWorldLinkPatch = (patch) => {
  if (!patch || typeof patch !== 'object') return patch;
  const sourceEvent = getSourceEventById(patch.id);
  const sourceType = String(sourceEvent?.event_type || '').trim();
  const sourceSid = Number(sourceEvent?.type_series_id);
  const isNonTeamWorldLink = sourceType === 'World Link' && (!Number.isFinite(sourceSid) || sourceSid > 2 || sourceSid <= 0);
  if (!isNonTeamWorldLink) return patch;

  return {
    ...patch,
    banner: '',
    unit: ''
  };
};

const filterOutdatedPredictiveEvents = (list) => {
  const currentOfficialId = getCurrentOfficialEventId();
  if (!Number.isFinite(currentOfficialId) || currentOfficialId < 0) return [...(list || [])];
  return (list || []).filter((ev) => {
    const idNum = Number(ev?.id);
    if (!Number.isFinite(idNum)) return false;
    // 当期及以前的 patch 一律视为过期冲突并清理。
    return idNum > currentOfficialId;
  });
};

const sanitizePredictiveEvents = (list) => {
  return (list || []).map((ev) => normalizeWorldLinkPatch(ev));
};

const reconcilePredictiveEvents = (list) => {
  const normalized = sanitizePredictiveEvents(list);
  const filtered = filterOutdatedPredictiveEvents(normalized);
  return filtered;
};

const buildPredictExportPayload = (list) => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  source: 'pjsk-planner',
  predictiveEvents: Array.isArray(list) ? list : []
});

const sanitizeExportFileName = (name) => {
  const raw = String(name || '').trim();
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim();
  return cleaned || 'pjsk_predict_backup';
};

const exportPredicts = () => {
  try {
    const payload = buildPredictExportPayload(predictiveEvents.value);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const defaultBaseName = `pjsk_predict_backup_${y}${m}${d}`;
    const customName = prompt('请输入导出文件名（无需 .json 后缀）', defaultBaseName);
    if (customName === null) {
      URL.revokeObjectURL(url);
      return;
    }
    const finalBaseName = sanitizeExportFileName(customName || defaultBaseName);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${finalBaseName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出预测失败', error);
    alert('导出失败，请稍后重试。');
  }
};

const triggerImportPredicts = () => {
  if (!predictImportInputRef.value) return;
  predictImportInputRef.value.value = '';
  predictImportInputRef.value.click();
};

const parseImportedPredictList = (rawText) => {
  const parsed = JSON.parse(rawText);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.predictiveEvents)) return parsed.predictiveEvents;
  return null;
};

const validateImportedPredictList = (list) => {
  if (!Array.isArray(list)) {
    return { ok: false, message: '文件格式错误：顶层必须是数组，或包含 predictiveEvents 数组。' };
  }

  for (let i = 0; i < list.length; i += 1) {
    const row = list[i];
    if (!row || typeof row !== 'object') {
      return { ok: false, message: `第 ${i + 1} 条记录不是对象。` };
    }
    const idNum = Number(row.id);
    if (!Number.isFinite(idNum)) {
      return { ok: false, message: `第 ${i + 1} 条记录缺少有效 id。` };
    }
    if (row.memberCards != null && !Array.isArray(row.memberCards)) {
      return { ok: false, message: `第 ${i + 1} 条记录的 memberCards 不是数组。` };
    }
  }

  return { ok: true };
};

const applyImportedPredicts = (importedRawList) => {
  const normalizedImported = (importedRawList || []).map((item) => ({
    ...(item || {}),
    id: Number(item?.id)
  })).filter((item) => Number.isFinite(item.id));

  const reconciled = reconcilePredictiveEvents(normalizedImported);
  const cleaned = Math.max(0, normalizedImported.length - reconciled.length);
  predictiveEvents.value = reconciled;
  cleanedPatchNoticeCount.value = cleaned;
  alert(`导入完成：已覆盖本地预测 ${reconciled.length} 条，清理 ${cleaned} 条。`);
};

const importPredictsFromFile = async (file) => {
  const text = await file.text();
  const importedRawList = parseImportedPredictList(text);
  if (!importedRawList) {
    alert('导入失败：文件格式不正确。');
    return;
  }

  const validation = validateImportedPredictList(importedRawList);
  if (!validation.ok) {
    alert(`导入失败：${validation.message}`);
    return;
  }

  const ok = confirm('您确定要导入吗？这会覆盖掉您本地的预测，请务必备份好本地预测。');
  if (!ok) return;

  applyImportedPredicts(importedRawList);
};

const handleImportPredictsFile = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  try {
    await importPredictsFromFile(file);
  } catch (error) {
    console.error('导入预测失败', error);
    alert('导入失败：请确认 JSON 文件内容有效。');
  }
};

const onImportDragEnter = () => {
  isImportDragOver.value = true;
};

const onImportDragOver = () => {
  isImportDragOver.value = true;
};

const onImportDragLeave = (event) => {
  const zone = event.currentTarget;
  const nextTarget = event.relatedTarget;
  if (zone && nextTarget && zone.contains(nextTarget)) return;
  isImportDragOver.value = false;
};

const onImportDrop = async (event) => {
  isImportDragOver.value = false;
  const file = event?.dataTransfer?.files?.[0];
  if (!file) return;
  try {
    await importPredictsFromFile(file);
  } catch (error) {
    console.error('拖拽导入失败', error);
    alert('导入失败：请确认 JSON 文件内容有效。');
  }
};

const effectivePredictiveEvents = computed(() => reconcilePredictiveEvents(predictiveEvents.value));

const clearPredicts = () => {
  if (confirm("确定要删除所有本地预测记录吗？这不会影响你的 JSON 文件。")) {
    predictiveEvents.value = [];
    localStorage.removeItem('pjsk_predict_data');
  }
};

onMounted(async () => {
  try {
    const cache = localStorage.getItem('pjsk_predict_data');
    if (cache) {
      predictiveEvents.value = JSON.parse(cache);
    }

    // 同时请求活动和卡片数据
    const [resEvents, resCards] = await Promise.all([
      fetch('/data/pjsk_events.json'),
      fetch('/data/pjsk_cards.json')
    ]);
    
    historyData.value = await resEvents.json();
    baseCards.value = await resCards.json();
    const beforeCount = predictiveEvents.value.length;
    const reconciled = reconcilePredictiveEvents(predictiveEvents.value);
    predictiveEvents.value = reconciled;
    cleanedPatchNoticeCount.value = Math.max(0, beforeCount - reconciled.length);
    
    console.log("数据加载成功:", historyData.value.length, "条活动,", baseCards.value.length, "张卡片");
  } catch (e) {
    console.error("加载失败:", e);
  }
});

const normalizeText = (v) => String(v || '').trim().toLowerCase();

const getWorldLinkCardKey = (card) => {
  return `${normalizeText(card?.Name)}|${normalizeText(card?.Affiliation)}|${String(card?.Rarity || '')}`;
};

const mergeWorldLinkCards = (baseCardsForEvent, predictCardsForEvent) => {
  if (!Array.isArray(baseCardsForEvent) || baseCardsForEvent.length === 0) return [];
  if (!Array.isArray(predictCardsForEvent) || predictCardsForEvent.length === 0) {
    return [...baseCardsForEvent].sort((a, b) => b.Rarity - a.Rarity);
  }

  const usedPredictIndexes = new Set();

  const findPredictForBase = (baseCard) => {
    const baseKey = getWorldLinkCardKey(baseCard);
    let idx = predictCardsForEvent.findIndex((c, i) => !usedPredictIndexes.has(i) && getWorldLinkCardKey(c) === baseKey);
    if (idx === -1) {
      const baseName = normalizeText(baseCard?.Name);
      idx = predictCardsForEvent.findIndex((c, i) => !usedPredictIndexes.has(i) && normalizeText(c?.Name) === baseName);
    }
    if (idx === -1) return null;
    usedPredictIndexes.add(idx);
    return predictCardsForEvent[idx];
  };

  const merged = baseCardsForEvent.map((baseCard) => {
    const patchCard = findPredictForBase(baseCard);
    if (!patchCard) return { ...baseCard };

    return {
      ...baseCard,
      Attribute: normalizeAttr(patchCard.Attribute) || baseCard.Attribute,
      Skill: patchCard.Skill || baseCard.Skill
    };
  });

  return merged.sort((a, b) => b.Rarity - a.Rarity);
};

const totalEventData = computed(() => {
  // 1. 遍历所有的历史活动（包括你填好的 218 以前的坑）
  return historyData.value.map(jsonEvent => {
    // 2. 看看预测数组里有没有对这个 ID 的“填坑记录”
    const patch = effectivePredictiveEvents.value.find(p => Number(p.id) === Number(jsonEvent.id));
    
    // 3. 如果有补丁，合并它；如果没有，用原件
    const event = patch ? { ...jsonEvent, ...patch, isPredict: true } : jsonEvent;
    
    // 4. 关联卡片逻辑：
    // 既搜 JSON 里的基础卡，也加上预测补丁里的卡
    const baseCardsForThisEvent = baseCards.value.filter(c => String(c.EventID) === String(event.id));
    const predictCardsForThisEvent = patch ? (patch.memberCards || []) : [];
    
    const isWorldLinkEvent = String(event?.event_type || '').trim() === 'World Link';
    const combinedRawCards = [...baseCardsForThisEvent, ...predictCardsForThisEvent];
    const combinedCards = (patch && predictCardsForThisEvent.length > 0)
      ? (isWorldLinkEvent
        ? mergeWorldLinkCards(baseCardsForThisEvent, predictCardsForThisEvent)
        : sortPredictedCardsForDisplay(combinedRawCards, event.banner))
      : combinedRawCards.sort((a, b) => b.Rarity - a.Rarity);

    return {
      ...event,
      memberCards: combinedCards,
      source_event_type: jsonEvent.event_type || '',
      source_gacha_type: jsonEvent.gacha_type || ''
    };
  });
});

// 统计面板统一使用“历史+预测合并后的活动卡面”，确保 WL 预测属性/技能也参与统计。
const totalCardsData = computed(() => {
  const eventCards = totalEventData.value.flatMap((ev) => ev.memberCards || []);
  const usedCardIds = new Set(
    eventCards
      .map((c) => String(c?.CardID || '').trim())
      .filter((id) => id)
  );

  // movie 等非活动绑定卡不会出现在 totalEventData.memberCards，需要补入统计源。
  const detachedBaseCards = (baseCards.value || []).filter((card) => {
    const cardId = String(card?.CardID || '').trim();
    return cardId && !usedCardIds.has(cardId);
  });

  return [...eventCards, ...detachedBaseCards];
});

// 辅助方法：获取下一个 SeriesID
const getNextSeriesId = () => {
  const allIds = totalCardsData.value
    .map(c => parseInt(c.SeriesID))
    .filter(id => !isNaN(id));
  return allIds.length > 0 ? Math.max(...allIds) + 1 : 1;
};

const getBaseBannerName = (name) => String(name || '').trim().split(' ')[0] || '';

const getNextTypeSeriesId = ({ eventId, eventType, bannerName }) => {
  const baseBanner = getBaseBannerName(bannerName);
  if (!eventType || !baseBanner || eventType === 'World Link') return null;

  const currentId = Number(eventId);
  const prevMax = totalEventData.value.reduce((max, ev) => {
    const evId = Number(ev?.id);
    if (!Number.isFinite(evId) || evId >= currentId) return max;
    if (String(ev?.event_type || '').trim() !== eventType) return max;

    const evBanner = getBaseBannerName(ev?.banner);
    if (!evBanner || evBanner !== baseBanner) return max;

    const sid = parseInt(ev?.type_series_id, 10);
    if (Number.isNaN(sid)) return max;
    return Math.max(max, sid);
  }, 0);

  return prevMax + 1;
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

const CHAR_ORDER = {
  "星乃一歌": 1, "天马咲希": 2, "望月穗波": 3, "日野森志步": 4,
  "花里实乃里": 5, "桐谷遥": 6, "桃井爱莉": 7, "日野森雫": 8,
  "小豆泽心羽": 9, "白石杏": 10, "东云彰人": 11, "青柳冬弥": 12,
  "天马司": 13, "凤笑梦": 14, "草薙宁宁": 15, "神代类": 16,
  "宵崎奏": 17, "朝比奈真冬": 18, "东云绘名": 19, "晓山瑞希": 20,
  "初音未来": 21, "镜音铃": 22, "镜音连": 23, "巡音流歌": 24, "MEIKO": 25, "KAITO": 26
};

const getCharOrder = (name) => {
  const baseName = String(name || '').split(' ')[0];
  return CHAR_ORDER[baseName] || 0;
};

function sortPredictedCardsForDisplay(cards, bannerName) {
  if (!Array.isArray(cards) || cards.length === 0) return [];

  const baseBanner = String(bannerName || '').split(' ')[0];
  const bannerIndex = cards.findIndex((c) => String(c.Name || '').split(' ')[0] === baseBanner);
  const fixedBannerIndex = bannerIndex > -1 ? bannerIndex : 0;
  const bannerCard = cards[fixedBannerIndex];

  const rest = cards.filter((_, idx) => idx !== fixedBannerIndex);
  const sortedFourStars = [];
  const unsortedBfesFourStars = [];
  const unsortedLowStars = [];

  rest.forEach((c) => {
    const isFourStar = Number(c.Rarity) === 4;
    const isBfes = String(c.Type || '').toLowerCase() === 'bfes';
    if (isFourStar && isBfes) {
      unsortedBfesFourStars.push(c);
    } else if (isFourStar) {
      sortedFourStars.push(c);
    } else {
      unsortedLowStars.push(c);
    }
  });

  sortedFourStars.sort((a, b) => getCharOrder(a.Name) - getCharOrder(b.Name));
  return [bannerCard, ...sortedFourStars, ...unsortedBfesFourStars, ...unsortedLowStars];
}

const isTeamWorldLink = (eventType, typeSeriesId) => {
  if (String(eventType || '').trim() !== 'World Link') return false;
  const sid = Number(typeSeriesId);
  return Number.isFinite(sid) && sid > 0 && sid <= 2;
};

// App.vue 约第 135 行 savePredictEvent 替换为：
provide('savePredictEvent', (payload) => {
  const { eventId, eventType, gachaType, predictAttr, selectedChars, event_title } = payload;
  const currentOfficialId = getCurrentOfficialEventId();
  if (Number(eventId) <= currentOfficialId) {
    console.warn(`[predict] ignore save for event ${eventId}, current official id is ${currentOfficialId}`);
    return;
  }
  
  const nextSid = getNextSeriesId();
  const bannerName = selectedChars[0]?.name || '';
  const sourceEvent = historyData.value.find(e => Number(e.id) === Number(eventId));
  const nextTypeSeriesId = eventType === 'World Link'
    ? (sourceEvent?.type_series_id ?? null)
    : getNextTypeSeriesId({ eventId, eventType, bannerName });
  const teamWorldLink = isTeamWorldLink(eventType, nextTypeSeriesId ?? sourceEvent?.type_series_id);

  // 1. 内部卡片生成逻辑
  const generatedCardsRaw = selectedChars.map((char, index) => {
    const rarity = char.rarity || "4";
    const isBfes = char.skillType === 'bfes_up' && rarity === '4';
    const isVsName = ["初音未来", "镜音铃", "镜音连", "巡音流歌", "MEIKO", "KAITO"].includes(char.name);

    let cardType = 'perm';
    if (isBfes) {
      cardType = 'bfes';
    } else if (gachaType === 'limited' && rarity === '4') {
      cardType = 'limited';
    } else if (gachaType === 'ue' && rarity === '4') {
      cardType = 'ue';
    }

    return {
      CardID: `PRED-${eventId}-${index}`,
      Name: char.name,
      Rarity: rarity,
      EventID: eventId,
      Attribute: normalizeAttr(char.attr) || '-',
      Skill: isBfes ? 'bfes_up' : (char.skillType || "-"),
      Type: cardType,
      // 重点：使用 PredictEditor 传过来的 Affiliation (已包含 VS 的单位逻辑)
      Affiliation: (isBfes && isVsName) ? 'vs' : (char.Affiliation || ""),
      // 第一个四星作为 Banner
      SeriesID: eventType === 'World Link' ? null : (index === 0 ? nextSid : null)
    };
  });

  const generatedCards = eventType === 'World Link'
    ? generatedCardsRaw
    : sortPredictedCardsForDisplay(generatedCardsRaw, bannerName);

  const predictedUnit = String(generatedCards?.[0]?.Affiliation || '').trim().toLowerCase();
  const sourceUnit = String(sourceEvent?.unit || '').trim().toLowerCase();
  const finalUnit = predictedUnit || sourceUnit;
  const worldLinkUnit = teamWorldLink ? finalUnit : '';
  const finalBanner = eventType === 'World Link'
    ? ''
    : bannerName;

  const newPredictEvent = {
    id: Number(eventId),
    event_title: event_title,
    event_type: eventType,
    gacha_type: gachaType === 'limited' ? '普通限定' : (gachaType === 'ue' ? 'UE限定' : '常驻'),
    type_series_id: nextTypeSeriesId,
    event_attribute: normalizeAttr(predictAttr),
    memberCards: generatedCards,
    banner: finalBanner,
    unit: eventType === 'World Link' ? worldLinkUnit : finalUnit,
    isPredict: true // 必须标记，用于 PredictEditor 判断是否回显
  };

  // 更新逻辑
  const index = predictiveEvents.value.findIndex(e => e.id === newPredictEvent.id);
  const updatedList = [...predictiveEvents.value]; 
  
  if (index > -1) {
    updatedList[index] = newPredictEvent;
  } else {
    updatedList.push(newPredictEvent);
  }
  
  const beforeCount = updatedList.length;
  const reconciled = reconcilePredictiveEvents(updatedList);
  predictiveEvents.value = reconciled;
  cleanedPatchNoticeCount.value = Math.max(0, beforeCount - reconciled.length);
});

// 删除预测活动
provide('deletePredictEvent', (id) => {
  predictiveEvents.value = predictiveEvents.value.filter(e => e.id !== id);
});

// 监听预测变化并持久化到本地
watch(predictiveEvents, (newVal) => {
  localStorage.setItem('pjsk_predict_data', JSON.stringify(newVal));
}, { deep: true });
</script>

<style scoped>
/* 3. 恢复并优化你原本的样式 */
/* App.vue 样式部分 */
:global(#app) {
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  text-align: left !important;
}

.main-app {
  display: flex;
  flex-direction: column;
  height: 100vh;     /* 强制占满一屏高度 */
  width: 100%;
  max-width: 100%;
  overflow: hidden;  /* 锁定外层，防止整个网页滚动 */
}

.nav-tabs {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 15px;
  padding: 15px 25px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  z-index: 2000;
  /* 移除 sticky，因为外层已经是 flex 布局，它自然就在最顶部 */
}

/* 修改并替换 App.vue 中的 .content-area 相关样式 */
.content-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto; /* 默认允许滚动，拯救你的统计面板 */
  overflow-x: hidden;
}

/* 当切换到历史页面时，去掉 padding 并锁定外层滚动 */
.content-area.history-mode {
  padding: 0;
  overflow: hidden; 
}

button {
  padding: 10px 20px;
  border: none;
  background: #f0f0f0;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: 0.3s;
}

button.active {
  background: #33ccbb; /* 初音绿高亮 */
  color: white;
}

.predict-info {
  margin-left: auto;
  font-size: 0.85rem;
  color: #eb2f96;
  background: #fff0f6;
  padding: 5px 12px;
  border-radius: 15px;
  border: 1px solid #ffadd2;
}

.predict-cleanup-info {
  font-size: 0.8rem;
  color: #065f46;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 4px 10px;
  border-radius: 999px;
}

.io-btn {
  padding: 6px 10px;
  font-size: 0.8rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
}

.io-drop-zone {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 3px 6px;
}

.io-drop-zone.is-drag-over {
  border-color: #14b8a6;
  background: #ecfeff;
}

.io-drop-hint {
  font-size: 0.72rem;
  color: #64748b;
  user-select: none;
}

.predict-import-input {
  display: none;
}

.content-area {
  padding: 20px;
}

.floating-top-btn {
  position: fixed;
  right: 14px;
  bottom: 18px;
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: #14b8a6;
  color: #fff;
  box-shadow: 0 6px 18px rgba(20, 184, 166, 0.35);
  z-index: 2600;
  cursor: pointer;
}

.floating-top-btn-icon {
  display: block;
  line-height: 1;
  font-size: 1.05rem;
  font-weight: 700;
  transform: translateY(-1px);
}

.floating-top-btn:hover {
  background: #0d9488;
}

@media (max-width: 900px) {
  .main-app {
    width: 100%;
    height: 100dvh;
  }

  .nav-tabs {
    gap: 6px;
    padding: 8px 10px;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .nav-tabs button,
  .reset-btn {
    flex: 0 0 auto;
    padding: 7px 10px;
    font-size: 0.82rem;
    white-space: nowrap;
  }

  .predict-info {
    margin-left: auto;
    order: 0;
    width: auto;
    min-width: fit-content;
    border-radius: 999px;
    font-size: 0.7rem;
    padding: 4px 8px;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .predict-cleanup-info {
    order: 1;
    font-size: 0.66rem;
    padding: 3px 7px;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .io-btn {
    order: 2;
    font-size: 0.68rem;
    padding: 4px 8px;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .io-drop-zone {
    order: 2;
    gap: 4px;
    padding: 2px 4px;
    border-style: solid;
  }

  .io-drop-hint {
    display: none;
  }

  .content-area {
    padding: 10px;
    overflow-x: hidden;
  }

  .content-area.history-mode {
    padding: 0;
  }

  .floating-top-btn {
    right: 10px;
    bottom: 14px;
    width: 36px;
    height: 36px;
  }

  .floating-top-btn-icon {
    font-size: 0.95rem;
  }
}

@media (max-width: 520px) {
  .nav-tabs {
    gap: 5px;
    padding: 6px 8px;
  }

  .nav-tabs button,
  .reset-btn {
    padding: 6px 8px;
    font-size: 0.76rem;
  }

  .predict-info {
    font-size: 0.65rem;
    padding: 3px 6px;
  }

  .predict-cleanup-info {
    font-size: 0.6rem;
    padding: 2px 6px;
  }

  .io-btn {
    font-size: 0.62rem;
    padding: 3px 6px;
  }

  .io-drop-zone {
    padding: 2px;
    border: none;
    background: transparent;
  }
}
</style>