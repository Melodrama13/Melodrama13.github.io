import { ref, computed } from 'vue';
import { buildEventCardIndex } from '../../features/event-history/eventCardIndex.js';
import { isCompilationEvent } from '../../utils/compilationEvents.js';
import { matchesEventHistoryFilters } from '../../features/event-history/eventHistoryFilters.js';

/** Filtering owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: props, EventOrdering, Rows, Formatting, Presentation, PreviewSelections.
 */
export function useHistoryFiltering(ports) {
const hideCollabPools = ref(true);

const hideBirthdayRows = ref(false);

const hidePreviewRows = ref(false);

const sortDesc = ref(false);

const showFilter = ref(false);

const filterMode = ref('event');

const EVENT_TYPE_FILTER_OPTIONS = [
  { value: 'box', label: '箱活' },
  { value: 'mix', label: '混活' },
  { value: 'wl', label: 'World Link' },
  { value: 'compilation', label: '总集篇' },
  { value: 'collab', label: '联动' }
];

const EVENT_SPECIAL_RULE_OPTIONS = [
  { value: 'two-vs', label: '2VS' },
  { value: 'three-oc', label: '3OC' },
  { value: 'four-no-vs', label: '4花后' }
];

const EVENT_FESTIVAL_ORDER = ['新年', '情人节', '白情', '半周年', '五月', '婚活', '六月', '夏活', '八月', '九月', '周年', '十一月', '十二月'];

const EVENT_FESTIVAL_EXCLUDE = new Set(['开服', '二月', '三月']);

const EVENT_GACHA_FILTER_OPTIONS = [
  { value: 'perm', label: '常驻' },
  { value: 'limited', label: '普通限定' },
  { value: 'limited160', label: '百六' },
  { value: 'ue', label: 'UE限定' },
  { value: 'cfes', label: 'CFES' },
  { value: 'bfes', label: 'BFES' },
  { value: 'collab', label: '联动' }
];

const filterCriteria = ref({
  selectedChars: [], // 选中的角色名数组
  rarities: [],      // [1, 2, 3, 4, 'birthday']
  attributes: [],    // ['Happy', 'Mysterious', 'Cute', 'Cool', 'Pure']
  skills: [],        // ['score_up', 'accuracy', ...]
  cardTypes: [],     // ['perm', 'limited', ...]
  units: []          // ['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs']
});

const eventFilterCriteria = ref({
  characters: [],
  multiPersonRule: 'same-event', // 'same-event' | 'same-pool'
  isBan: null, // 'yes' | 'no' | null
  eventTypes: [],
  specialRules: [],
  festivals: [],
  attributes: [],
  units: [],
  gachaTypes: []
});

const canUseEventBanFilter = computed(() => eventFilterCriteria.value.characters.length === 1);

const canUseMultiPersonRule = computed(() => eventFilterCriteria.value.characters.length >= 2);

const canUseFourNoVsRule = computed(() => {
  const selectedTypes = eventFilterCriteria.value.eventTypes || [];
  return selectedTypes.length === 1 && selectedTypes[0] === 'box';
});

const sortedEvents = computed(() => {
  return [...(ports.props.allEvents || [])].sort((a, b) => (
    sortDesc.value ? ports.eventOrdering.compareEventOrderAsc(b, a) : ports.eventOrdering.compareEventOrderAsc(a, b)
  ));
});

const normalLimitedEventsAsc = computed(() => {
  return [...(ports.props.allEvents || [])]
    .filter((event) => String(event?.gacha_type || '').trim() === '普通限定')
    .sort(ports.eventOrdering.compareEventOrderAsc);
});

const hasDetailFilters = computed(() => {
  const f = filterCriteria.value || {};
  return Boolean(
    (f.selectedChars && f.selectedChars.length > 0) ||
    (f.rarities && f.rarities.length > 0) ||
    (f.attributes && f.attributes.length > 0) ||
    (f.skills && f.skills.length > 0) ||
    (f.cardTypes && f.cardTypes.length > 0) ||
    (f.units && f.units.length > 0)
  );
});

const hasEventFilters = computed(() => {
  const f = eventFilterCriteria.value || {};
  return Boolean(
    (f.characters && f.characters.length > 0) ||
    f.isBan ||
    (f.eventTypes && f.eventTypes.length > 0) ||
    (f.specialRules && f.specialRules.length > 0) ||
    (f.festivals && f.festivals.length > 0) ||
    (f.attributes && f.attributes.length > 0) ||
    (f.units && f.units.length > 0) ||
    (f.gachaTypes && f.gachaTypes.length > 0)
  );
});

const hasActiveFilters = computed(() => {
  if (filterMode.value === 'event') return hasEventFilters.value;
  return hasDetailFilters.value;
});

const isEventUnitFilterDisabledByMix = computed(() => {
  return eventFilterCriteria.value.eventTypes.includes('mix');
});

const eventFestivalOptions = computed(() => {
  const set = new Set();
  ports.rows.baseEvents.value.forEach((event) => {
    const fest = String(event?.festival || '').trim();
    if (!fest || EVENT_FESTIVAL_EXCLUDE.has(fest)) return;
    set.add(fest);
  });
  const ordered = EVENT_FESTIVAL_ORDER.filter((fest) => set.has(fest));
  const extra = [...set].filter((fest) => !EVENT_FESTIVAL_ORDER.includes(fest));
  return [...ordered, ...extra];
});

const isJumpFilterActive = () => {
  return hasActiveFilters.value;
};

const isEventVisibleInRows = (eventId) => {
  const idKey = ports.formatting.normalizeEventId(eventId);
  if (!idKey) return false;
  return ports.rows.displayRows.value.some((row) => row.kind === 'event' && ports.formatting.normalizeEventId(row.event?.id) === idKey);
};

const relaxFiltersForJump = (eventId) => {
  const idKey = ports.formatting.normalizeEventId(eventId);
  if (!idKey) return;
  if (isEventVisibleInRows(idKey)) return;

  const event = (ports.props.allEvents || []).find(event => ports.formatting.normalizeEventId(event?.id) === idKey);
  if (hideCollabPools.value && ports.eventOrdering.isCollabPoolEvent(event)) hideCollabPools.value = false;

  if (isJumpFilterActive()) {
    resetFilters();
    showFilter.value = false;
  }
};

const toggleChar = (name) => {
  if (filterMode.value === 'event') return;
  const current = [...(filterCriteria.value.selectedChars || [])];
  const idx = current.indexOf(name);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(name);
  filterCriteria.value.selectedChars = current;
};

const toggleEventFilterCharacter = (name) => {
  const current = [...eventFilterCriteria.value.characters];
  const idx = current.indexOf(name);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(name);
  eventFilterCriteria.value.characters = current;
  if (!canUseEventBanFilter.value) {
    eventFilterCriteria.value.isBan = null;
  }
  if (!canUseMultiPersonRule.value) {
    eventFilterCriteria.value.multiPersonRule = 'same-event';
  }
};

const setEventMultiPersonRule = (rule) => {
  if (!canUseMultiPersonRule.value) return;
  if (!['same-event', 'same-pool'].includes(rule)) return;
  eventFilterCriteria.value.multiPersonRule = rule;
};

const toggleDetailFilterArray = (key, value) => {
  const current = [...(filterCriteria.value[key] || [])];
  const idx = current.indexOf(value);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(value);
  filterCriteria.value[key] = current;
};

const setEventBanFilter = (value) => {
  if (!canUseEventBanFilter.value) {
    eventFilterCriteria.value.isBan = null;
    return;
  }
  eventFilterCriteria.value.isBan = eventFilterCriteria.value.isBan === value ? null : value;
};

const toggleEventFilterArray = (key, value) => {
  if (key === 'units' && isEventUnitFilterDisabledByMix.value) return;
  const current = [...(eventFilterCriteria.value[key] || [])];
  const idx = current.indexOf(value);
  if (idx >= 0) current.splice(idx, 1);
  else {
    current.push(value);
    if ((key === 'eventTypes' || key === 'gachaTypes') && value === 'collab') {
      hideCollabPools.value = false;
    }
  }
  eventFilterCriteria.value[key] = current;
  if (key === 'eventTypes' && eventFilterCriteria.value.eventTypes.includes('mix')) {
    eventFilterCriteria.value.units = [];
  }
  if (key === 'eventTypes' && !canUseFourNoVsRule.value) {
    eventFilterCriteria.value.specialRules = (eventFilterCriteria.value.specialRules || []).filter((rule) => rule !== 'four-no-vs');
  }
};

const toggleEventSpecialRule = (ruleValue) => {
  if (!EVENT_SPECIAL_RULE_OPTIONS.some((item) => item.value === ruleValue)) return;
  if (ruleValue === 'four-no-vs' && !canUseFourNoVsRule.value) return;
  const current = [...(eventFilterCriteria.value.specialRules || [])];
  const idx = current.indexOf(ruleValue);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(ruleValue);
  eventFilterCriteria.value.specialRules = current;
};

const getCardBaseName = (card) => String(card?.Name || '').trim().split(' ')[0] || '';

const isFesCard = (card) => {
  const t = String(card?.Type || '').trim().toLowerCase();
  const skillKind = String(card?.Skill || '').trim().toLowerCase();
  return t === 'cfes' || t === 'bfes' || skillKind === 'bfes_up' || skillKind.startsWith('cfes');
};

const EARLY_SPLIT_FES_EVENT_IDS = new Set(['18', '27']);

const isEarlySplitFesEvent = (event) => EARLY_SPLIT_FES_EVENT_IDS.has(ports.formatting.normalizeEventId(event?.id));

const isVsEventCard = (card) => {
  const baseName = getCardBaseName(card);
  return ports.presentation.isVirtualSinger(baseName);
};

const eventCardsByEventId = computed(() => buildEventCardIndex(ports.props.allCards, ports.formatting.normalizeEventId));

const getEventCardsForFilter = (event) => {
  const cardsInEvent = Array.isArray(event?.memberCards) ? event.memberCards.filter(Boolean) : [];
  if (cardsInEvent.length > 0) return cardsInEvent;
  const eid = ports.formatting.normalizeEventId(event?.id);
  if (!eid) return [];
  return eventCardsByEventId.value.get(eid) || [];
};

const getEventNonFesCards = (event) => getEventCardsForFilter(event).filter((card) => !isFesCard(card));

const matchEventSpecialRule = (event, rule) => {
  const cards = getEventNonFesCards(event);

  if (rule === 'three-oc') {
    const fourStars = cards.filter((card) => String(card?.Rarity || '').trim() === '4');
    if (fourStars.length !== 3) return false;
    return fourStars.every((card) => !isVsEventCard(card));
  }

  if (rule === 'two-vs') {
    const vsCount = cards.filter((card) => isVsEventCard(card)).length;
    return vsCount >= 2;
  }

  if (rule === 'four-no-vs') {
    const highRarity = cards.filter((card) => {
      const rarity = String(card?.Rarity || '').trim();
      return rarity === '4' || rarity === '3';
    });
    if (!highRarity.length) return false;
    return highRarity.every((card) => !isVsEventCard(card));
  }

  return true;
};

const getEventCardNames = (event) => {
  const names = new Set();
  const fromEvent = getEventCardsForFilter(event);
  fromEvent.forEach((card) => {
    const n = String(card?.Name || '').trim().split(' ')[0];
    if (n && n !== '-' && n !== 'CardID') names.add(n);
  });

  return [...names];
};

const getSamePoolNameGroupsForEventFilter = (event) => {
  const fourStarCards = getEventCardsForFilter(event)
    .filter((card) => String(card?.Rarity || '').trim() === '4');
  const toNames = (cards) => {
    const names = new Set();
    cards.forEach((card) => {
      const n = getCardBaseName(card);
      if (n && n !== '-' && n !== 'CardID') names.add(n);
    });
    return [...names];
  };

  if (!isEarlySplitFesEvent(event)) return [toNames(fourStarCards)].filter((group) => group.length);

  const normalNames = toNames(fourStarCards.filter((card) => !isFesCard(card)));
  const fesNames = toNames(fourStarCards.filter((card) => isFesCard(card)));
  return [normalNames, fesNames].filter((group) => group.length);
};

const eventBannerMatchesCharacter = (event, name) => {
  const target = ports.previewSelections.normalizeCharName(name);
  if (!target) return true;
  return ports.previewSelections.normalizeCharName(event?.banner) === target;
};

const eventContainsCharacter = (event, name) => {
  const target = ports.previewSelections.normalizeCharName(name);
  if (!target) return true;
  if (eventBannerMatchesCharacter(event, target)) return true;
  return getEventCardNames(event).includes(target);
};

const matchEventTypeFilter = (event, typeValue) => {
  const eventType = String(event?.event_type || '').trim();
  const gachaType = String(event?.gacha_type || '').trim();
  const idRaw = String(event?.id || '').trim().toLowerCase();
  if (typeValue === 'box') return eventType === '箱活';
  if (typeValue === 'mix') return eventType === '混活';
  if (typeValue === 'wl') return ['wl', 'world link', 'world link终章'].includes(eventType.toLowerCase());
  if (typeValue === 'compilation') return isCompilationEvent(event);
  if (typeValue === 'collab') {
    return eventType.includes('联动') || gachaType.includes('联动') || /^c\d+$/.test(idRaw);
  }
  return false;
};

const matchEventGachaFilter = (event, gachaValue) => {
  const gachaType = String(event?.gacha_type || '').trim();

  const typeSet = new Set();
  const eventCards = getEventCardsForFilter(event);
  eventCards.forEach((card) => {
    const t = String(card?.Type || '').trim().toLowerCase();
    if (t) typeSet.add(t);
  });

  if (gachaValue === 'perm') return gachaType === '常驻';
  if (gachaValue === 'limited') return gachaType === '普通限定';
  if (gachaValue === 'limited160') {
    return gachaType === '普通限定' && (typeSet.has('cfes') || typeSet.has('bfes'));
  }
  if (gachaValue === 'ue') return gachaType === 'UE限定';
  if (gachaValue === 'cfes') return typeSet.has('cfes');
  if (gachaValue === 'bfes') return typeSet.has('bfes');
  if (gachaValue === 'collab') return gachaType.includes('联动');
  return false;
};

const eventHistoryFilterOptions = computed(() => ({
  criteria: eventFilterCriteria.value,
  canUseBanFilter: canUseEventBanFilter.value,
  eventContainsCharacter,
  getSamePoolNameGroupsForEventFilter,
  eventBannerMatchesCharacter,
  matchEventTypeFilter,
  matchEventSpecialRule,
  normalizeAttribute: ports.formatting.normalizeEventHistoryAttribute,
  isVirtualSinger: (name) => ports.presentation.isVirtualSinger(name),
  normalizeCharacterName: ports.previewSelections.normalizeCharName,
  matchEventGachaFilter
}));

const matchEventFilters = (event) => matchesEventHistoryFilters(event, eventHistoryFilterOptions.value);

const switchFilterMode = (nextMode) => {
  if (filterMode.value === nextMode) return;
  filterMode.value = nextMode;
  resetFilters();
};

const resetFilters = () => {
  filterCriteria.value = { selectedChars: [], rarities: [], attributes: [], skills: [], cardTypes: [], units: [] };
  eventFilterCriteria.value = {
    characters: [],
    multiPersonRule: 'same-event',
    isBan: null,
    eventTypes: [],
    specialRules: [],
    festivals: [],
    attributes: [],
    units: [],
    gachaTypes: []
  };
};


return {
  hideCollabPools,
  hideBirthdayRows,
  hidePreviewRows,
  sortDesc,
  showFilter,
  filterMode,
  EVENT_TYPE_FILTER_OPTIONS,
  EVENT_SPECIAL_RULE_OPTIONS,
  EVENT_GACHA_FILTER_OPTIONS,
  filterCriteria,
  eventFilterCriteria,
  canUseEventBanFilter,
  canUseMultiPersonRule,
  canUseFourNoVsRule,
  hasActiveFilters,
  isEventUnitFilterDisabledByMix,
  eventFestivalOptions,
  toggleChar,
  toggleEventFilterCharacter,
  setEventMultiPersonRule,
  toggleDetailFilterArray,
  setEventBanFilter,
  toggleEventFilterArray,
  toggleEventSpecialRule,
  switchFilterMode,
  resetFilters,
  sortedEvents,
  hasEventFilters,
  hasDetailFilters,
  matchEventFilters,
  getEventCardsForFilter,
  normalLimitedEventsAsc,
  relaxFiltersForJump,
};
}
