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
    const patch = predictiveEvents.value.find(p => p.id === jsonEvent.id);
    
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

// App.vue 约第 135 行 savePredictEvent 替换为：
provide('savePredictEvent', (payload) => {
  const { eventId, eventType, gachaType, predictAttr, selectedChars, event_title } = payload;
  
  const nextSid = getNextSeriesId();
  const bannerName = selectedChars[0]?.name || '';
  const sourceEvent = historyData.value.find(e => Number(e.id) === Number(eventId));
  const nextTypeSeriesId = eventType === 'World Link'
    ? (sourceEvent?.type_series_id ?? null)
    : getNextTypeSeriesId({ eventId, eventType, bannerName });

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

  const newPredictEvent = {
    id: Number(eventId),
    event_title: event_title,
    event_type: eventType,
    gacha_type: gachaType === 'limited' ? '普通限定' : (gachaType === 'ue' ? 'UE限定' : '常驻'),
    type_series_id: nextTypeSeriesId,
    event_attribute: normalizeAttr(predictAttr),
    memberCards: generatedCards,
    banner: eventType === 'World Link' ? '' : bannerName,
    unit: finalUnit,
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
  
  predictiveEvents.value = updatedList;
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
  width: 100vw;
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

  .content-area {
    padding: 10px;
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
}
</style>