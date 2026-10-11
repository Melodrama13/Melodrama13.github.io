import { computed, ref, watch } from 'vue';

/** Preview Selections owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, PredictionEditor, Formatting, PreviewCutoff, PreviewLayout.
 */
export function useHistoryPreviewSelections(ports) {
const PREVIEW_LIMITED_TYPES = new Set(['limited', 'cfes', 'bfes', 'collab_t']);

const FES_CARD_TYPES = new Set(['cfes', 'bfes']);

const PREVIEW_FESTIVAL_TYPES = ['新年', '婚活', '情人节', '白情', '半周年', '周年'];

const PREVIEW_BOX_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc'];

const PREVIEW_ATTRS = ['Pure', 'Cool', 'Cute', 'Happy', 'Mysterious'];

const PREVIEW_DAILY_ATTR_COLOR = {
  Pure: '#84cc16',
  Cool: '#3b82f6',
  Cute: '#f472b6',
  Happy: '#f59e0b',
  Mysterious: '#8b5cf6'
};

const PREVIEW_DAILY_CHAR_UNIT_MAP = computed(() => {
  const map = {};
  (ports.props.allCharacters || []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    const unit = String(char?.unit || '').trim().toLowerCase();
    if (!name) return;
    map[name] = unit || 'vs';
  });
  return map;
});

const CHAR_MAP = computed(() => {
  const map = {};
  (ports.props.allCharacters || []).forEach((char) => {
    const key = String(char?.zh_name || '').trim();
    const abbr = String(char?.en_abbr || '').trim();
    if (!key || !abbr) return;
    map[key] = abbr;
  });
  return map;
});

const CHARACTER_BIRTHDAY_MD_MAP = computed(() => {
  const map = {};
  (ports.props.allCharacters || []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    const month = Number(char?.birthday_month);
    const day = Number(char?.birthday_day);
    if (!name) return;
    if (!Number.isFinite(month) || !Number.isFinite(day)) return;
    if (month < 1 || month > 12 || day < 1 || day > 31) return;
    map[name] = { month: Math.trunc(month), day: Math.trunc(day) };
  });
  return map;
});

const PREVIEW_DAILY_SKILL_BASE = {
  bfes_up: 160,
  cfes: 140,
  p_score: 130,
  score_up: 120,
  accuracy: 100,
  recovery: 100,
  unit_score: 100,
  default: 120
};

const PREVIEW_PANEL_DEFS = [
  { id: 'four', title: '四星', icon: '⭐', statKey: 'fourStarCount', externalKey: 'fourStarCount' },
  { id: 'limited', title: '限定', icon: '🎀', statKey: 'limitedCount', externalKey: 'limitedCount' },
  { id: 'banner', title: 'Banner', icon: 'B', statKey: 'bannerCount', externalKey: 'bannerCount' },
  { id: 'limited-ban', title: '限Ban', icon: '🚫', statKey: 'limitedBanCount', externalKey: 'limitedBanCount' },
  { id: 'vs-last-four', title: 'V上次四星', icon: 'V', statKey: 'vsLastFour' },
  { id: 'vs-unit-four-count', title: '团V四星', icon: '4', statKey: 'vsUnitFourCount' },
  { id: 'vs-unit-score', title: '团分', icon: 'U', statKey: 'vsUnitScore' },
  { id: 'vs-original', title: '原V', icon: 'O', statKey: 'vsOriginal' },
  { id: 'pure-score', title: '分卡', icon: 'S', statKey: 'pureScoreCount' },
  { id: 'p-score', title: 'P分', icon: 'P', statKey: 'pScoreCount' },
  { id: 'score-up', title: '普分', icon: 'N', statKey: 'scoreUpCount', externalKey: 'scoreUpCount' },
  { id: 'recovery', title: '奶卡', icon: '❤', statKey: 'recoveryCount' },
  { id: 'accuracy', title: '判卡', icon: '✓', statKey: 'accuracyCount' },
  { id: 'three', title: '三星', icon: '3', statKey: 'threeStarCount' },
  { id: 'two', title: '二星', icon: '2', statKey: 'twoStarCount' },
  { id: 'reward', title: '报酬', icon: '🎁', statKey: 'rewardTotalCount' },
  { id: 'daily-lineup', title: '日挑配队', icon: '📊', statKey: 'dailyLineup' },
  { id: 'char-attr', title: '角色花色', icon: '📋', statKey: 'charAttr' },
  { id: 'attr-five', title: '花色', icon: '🧩', statKey: 'attrFive' },
  { id: 'festival', title: '节日人选', icon: '🎊', statKey: 'festival', externalKey: 'festival' }
];

const PREVIEW_CHAR_ORDER = computed(() => {
  const map = {};
  (ports.props.allCharacters || []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    const order = Number(char?.id);
    if (!name || !Number.isFinite(order)) return;
    map[name] = order;
  });
  return map;
});

const getPreviewCharOrder = (name) => Number(PREVIEW_CHAR_ORDER.value[String(name || '').trim()] || 999);

const PREVIEW_FESTIVAL_VS_UNIT_ORDER = { ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5, vs: 6 };

const selectedPreviewPanelIds = ref([]);

const selectedPreviewAttrChars = ref([]);

const selectedPreviewDailyLineupChars = ref([]);

const selectedPreviewCharAttrChars = ref([]);

const currentEditingSelectionNames = ref([]);

const currentEditingSelectionCards = ref([]);

const previewIncludeCollabReward = ref(false);

const previewThreeUseRewardCount = ref(true);

const previewTwoUseRewardCount = ref(true);

const previewIncludeUnitScoreInPureScore = ref(false);

const previewLimitedBanEventTypeFilter = ref('all');

const previewBannerEventTypeFilter = ref('all');

const previewFestivalMergeHigherRanks = ref(false);

const selectedPreviewFestival = ref(PREVIEW_FESTIVAL_TYPES[0]);

const previewFestivalFesToggles = ref({
  '半周年': false,
  '周年': false
});

const previewSelectableChars = computed(() => {
  return Object.keys(CHAR_MAP.value).sort((a, b) => getPreviewCharOrder(a) - getPreviewCharOrder(b));
});

const togglePreviewAttrChar = (name) => {
  const current = [...selectedPreviewAttrChars.value];
  const idx = current.indexOf(name);
  if (idx >= 0) {
    current.splice(idx, 1);
    selectedPreviewAttrChars.value = current;
    return;
  }
  if (current.length >= 8) return;
  current.push(name);
  selectedPreviewAttrChars.value = current;
};

const clearPreviewAttrChars = () => {
  selectedPreviewAttrChars.value = [];
};

const togglePreviewDailyLineupChar = (name) => {
  const current = [...selectedPreviewDailyLineupChars.value];
  const idx = current.indexOf(name);
  if (idx >= 0) {
    current.splice(idx, 1);
    selectedPreviewDailyLineupChars.value = current;
    return;
  }
  if (current.length >= 6) return;
  current.push(name);
  selectedPreviewDailyLineupChars.value = current;
};

const clearPreviewDailyLineupChars = () => {
  selectedPreviewDailyLineupChars.value = [];
};

const togglePreviewCharAttrChar = (name) => {
  const current = [...selectedPreviewCharAttrChars.value];
  const idx = current.indexOf(name);
  if (idx >= 0) {
    current.splice(idx, 1);
    selectedPreviewCharAttrChars.value = current;
    return;
  }
  if (current.length >= 6) return;
  current.push(name);
  selectedPreviewCharAttrChars.value = current;
};

const clearPreviewCharAttrChars = () => {
  selectedPreviewCharAttrChars.value = [];
};

const normalizeCharName = (value) => String(value || '').trim().split(/\s+/)[0] || '';

const getCurrentLineupCharNames = () => {
  const names = [];
  const seen = new Set();

  const pushName = (raw) => {
    const name = normalizeCharName(raw);
    if (!name || !CHAR_MAP.value[name] || seen.has(name)) return;
    seen.add(name);
    names.push(name);
  };

  (currentEditingSelectionNames.value || []).forEach((name) => pushName(name));
  if (names.length > 0) return names;

  const cards = Array.isArray(ports.predictionEditor.currentEditingEvent.value?.memberCards)
    ? ports.predictionEditor.currentEditingEvent.value.memberCards
    : [];
  cards.forEach((card) => pushName(card?.Name));
  return names;
};

const getCurrentLineupFourStarCharNames = () => {
  const names = [];
  const seen = new Set();
  const liveCards = Array.isArray(currentEditingSelectionCards.value)
    ? currentEditingSelectionCards.value
    : [];
  if (liveCards.length > 0) {
    liveCards.forEach((card) => {
      if (String(card?.rarity || '').trim() !== '4') return;
      const name = normalizeCharName(card?.name);
      if (!name || !CHAR_MAP.value[name] || seen.has(name)) return;
      seen.add(name);
      names.push(name);
    });
    return names;
  }

  const cards = Array.isArray(ports.predictionEditor.currentEditingEvent.value?.memberCards)
    ? ports.predictionEditor.currentEditingEvent.value.memberCards
    : [];

  cards.forEach((card) => {
    if (String(card?.Rarity || '').trim() !== '4') return;
    const name = normalizeCharName(card?.Name);
    if (!name || !CHAR_MAP.value[name] || seen.has(name)) return;
    seen.add(name);
    names.push(name);
  });

  return names;
};

const canAppendCurrentLineupToPreviewAttr = computed(() => {
  const source = getCurrentLineupCharNames();
  if (source.length === 0) return false;
  if (selectedPreviewAttrChars.value.length >= 8) return false;
  return source.some((name) => !selectedPreviewAttrChars.value.includes(name));
});

const appendPreviewAttrCharsFromCurrentLineup = () => {
  const source = getCurrentLineupCharNames();
  if (source.length === 0) return;

  const next = [...selectedPreviewAttrChars.value];
  source.forEach((name) => {
    if (next.length >= 8) return;
    if (next.includes(name)) return;
    next.push(name);
  });
  selectedPreviewAttrChars.value = next;
};

const canAppendCurrentLineupToPreviewDailyLineup = computed(() => {
  const source = getCurrentLineupFourStarCharNames();
  if (source.length === 0) return false;
  if (selectedPreviewDailyLineupChars.value.length >= 6) return false;
  return source.some((name) => !selectedPreviewDailyLineupChars.value.includes(name));
});

const appendPreviewDailyLineupCharsFromCurrentLineup = () => {
  const source = getCurrentLineupFourStarCharNames();
  if (source.length === 0) return;

  const next = [...selectedPreviewDailyLineupChars.value];
  source.forEach((name) => {
    if (next.length >= 6) return;
    if (next.includes(name)) return;
    next.push(name);
  });
  selectedPreviewDailyLineupChars.value = next;
};

const canAppendCurrentLineupToPreviewCharAttr = computed(() => {
  const source = getCurrentLineupCharNames();
  if (source.length === 0) return false;
  if (selectedPreviewCharAttrChars.value.length >= 6) return false;
  return source.some((name) => !selectedPreviewCharAttrChars.value.includes(name));
});

const appendPreviewCharAttrCharsFromCurrentLineup = () => {
  const source = getCurrentLineupCharNames();
  if (source.length === 0) return;

  const next = [...selectedPreviewCharAttrChars.value];
  source.forEach((name) => {
    if (next.length >= 6) return;
    if (next.includes(name)) return;
    next.push(name);
  });
  selectedPreviewCharAttrChars.value = next;
};

const handlePredictSelectionChange = (items) => {
  const rawList = Array.isArray(items) ? items : [];
  const cards = rawList
    .map((item) => {
      const rawName = typeof item === 'object' && item !== null ? item.name : item;
      return {
        name: normalizeCharName(rawName),
        rarity: typeof item === 'object' && item !== null ? String(item?.rarity || '').trim() : '',
        attr: typeof item === 'object' && item !== null ? ports.formatting.normalizeEventHistoryAttribute(item?.attr) : '',
        skillType: typeof item === 'object' && item !== null ? String(item?.skillType || '').trim().toLowerCase() : '',
        selectedUnit: typeof item === 'object' && item !== null
          ? String(item?.selectedUnit || item?.Affiliation || '').trim().toLowerCase()
          : ''
      };
    })
    .filter((card) => card.name && !!CHAR_MAP.value[card.name]);
  const list = cards.length
    ? cards.map((card) => card.name)
    : [];
  currentEditingSelectionNames.value = [...new Set(list)];
  currentEditingSelectionCards.value = cards;
};

const setSelectedPreviewFestival = (festival) => {
  if (!PREVIEW_FESTIVAL_TYPES.includes(festival)) return;
  selectedPreviewFestival.value = festival;
};

const cyclePreviewLimitedBanEventTypeFilter = () => {
  const current = previewLimitedBanEventTypeFilter.value;
  if (current === 'all') {
    previewLimitedBanEventTypeFilter.value = '箱活';
    return;
  }
  if (current === '箱活') {
    previewLimitedBanEventTypeFilter.value = '混活';
    return;
  }
  previewLimitedBanEventTypeFilter.value = 'all';
};

const cyclePreviewBannerEventTypeFilter = () => {
  const current = previewBannerEventTypeFilter.value;
  if (current === 'all') {
    previewBannerEventTypeFilter.value = '箱活';
    return;
  }
  if (current === '箱活') {
    previewBannerEventTypeFilter.value = '混活';
    return;
  }
  previewBannerEventTypeFilter.value = 'all';
};

const previewLimitedBanFilterButtonText = computed(() => {
  const current = previewLimitedBanEventTypeFilter.value;
  if (current === '箱活') return '仅箱';
  if (current === '混活') return '仅混';
  return '箱混';
});

const previewLimitedBanFilterButtonTitle = computed(() => {
  const current = previewLimitedBanEventTypeFilter.value;
  if (current === '箱活') return '当前仅统计箱活，点击切换到混活';
  if (current === '混活') return '当前仅统计混活，点击切换到全体';
  return '当前统计全体，点击切换到箱活';
});

const previewBannerFilterButtonText = computed(() => {
  const current = previewBannerEventTypeFilter.value;
  if (current === '箱活') return '仅箱';
  if (current === '混活') return '仅混';
  return '箱混';
});

const previewBannerFilterButtonTitle = computed(() => {
  const current = previewBannerEventTypeFilter.value;
  if (current === '箱活') return '当前仅统计箱活Banner，点击切换到混活';
  if (current === '混活') return '当前仅统计混活Banner，点击切换到全体';
  return '当前统计全体Banner，点击切换到箱活';
});

const isFesCardType = (typeValue) => FES_CARD_TYPES.has(String(typeValue || '').trim().toLowerCase());

const previewPanelOptions = computed(() => PREVIEW_PANEL_DEFS.map((def) => {
  const selected = selectedPreviewPanelIds.value.includes(def.id);
  const isFestival = def.id === 'festival';
  const isLimitedBan = def.id === 'limited-ban';
  const dynamicTitle = isFestival && ports.previewCutoff.activePreviewFestivalName.value
    ? `节日人选·${ports.previewCutoff.activePreviewFestivalName.value}`
    : (isLimitedBan && previewLimitedBanEventTypeFilter.value !== 'all'
      ? `限Ban·${previewLimitedBanEventTypeFilter.value === '箱活' ? '箱' : '混'}`
      : (def.id === 'banner' && previewBannerEventTypeFilter.value !== 'all'
        ? `Banner·${previewBannerEventTypeFilter.value === '箱活' ? '箱' : '混'}`
        : def.title));
  return {
    ...def,
    title: dynamicTitle,
    selected,
    disabled: false,
    tip: ''
  };
}));

const togglePreviewPanelType = (panelId) => {
  const current = [...selectedPreviewPanelIds.value];
  const idx = current.indexOf(panelId);
  if (idx >= 0) {
    current.splice(idx, 1);
    selectedPreviewPanelIds.value = current;
    return;
  }
  if (current.length >= 6) return;
  current.push(panelId);
  selectedPreviewPanelIds.value = current;
};

function watchSelectedPanels() {
watch(selectedPreviewPanelIds, (ids) => {
  ports.previewLayout.syncPreviewCharSelectExpandedState(ids);
});
}
return {
  PREVIEW_FESTIVAL_TYPES,
  CHAR_MAP,
  selectedPreviewPanelIds,
  selectedPreviewAttrChars,
  selectedPreviewDailyLineupChars,
  selectedPreviewCharAttrChars,
  previewIncludeCollabReward,
  previewThreeUseRewardCount,
  previewTwoUseRewardCount,
  previewIncludeUnitScoreInPureScore,
  previewFestivalMergeHigherRanks,
  selectedPreviewFestival,
  previewFestivalFesToggles,
  previewSelectableChars,
  togglePreviewAttrChar,
  clearPreviewAttrChars,
  togglePreviewDailyLineupChar,
  clearPreviewDailyLineupChars,
  togglePreviewCharAttrChar,
  clearPreviewCharAttrChars,
  canAppendCurrentLineupToPreviewAttr,
  appendPreviewAttrCharsFromCurrentLineup,
  canAppendCurrentLineupToPreviewDailyLineup,
  appendPreviewDailyLineupCharsFromCurrentLineup,
  canAppendCurrentLineupToPreviewCharAttr,
  appendPreviewCharAttrCharsFromCurrentLineup,
  handlePredictSelectionChange,
  setSelectedPreviewFestival,
  cyclePreviewLimitedBanEventTypeFilter,
  cyclePreviewBannerEventTypeFilter,
  previewLimitedBanFilterButtonText,
  previewLimitedBanFilterButtonTitle,
  previewBannerFilterButtonText,
  previewBannerFilterButtonTitle,
  previewPanelOptions,
  togglePreviewPanelType,
  normalizeCharName,
  CHARACTER_BIRTHDAY_MD_MAP,
  currentEditingSelectionNames,
  currentEditingSelectionCards,
  getPreviewCharOrder,
  PREVIEW_FESTIVAL_VS_UNIT_ORDER,
  isFesCardType,
  PREVIEW_BOX_UNITS,
  PREVIEW_LIMITED_TYPES,
  previewLimitedBanEventTypeFilter,
  previewBannerEventTypeFilter,
  PREVIEW_ATTRS,
  PREVIEW_CHAR_ORDER,
  PREVIEW_PANEL_DEFS,
  PREVIEW_DAILY_SKILL_BASE,
  PREVIEW_DAILY_CHAR_UNIT_MAP,
  PREVIEW_DAILY_ATTR_COLOR,
  watchSelectedPanels,
};
}
