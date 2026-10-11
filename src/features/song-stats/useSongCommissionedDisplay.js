import { ref, computed, watch } from 'vue';

/** Per-instance state owned by SongCommissionedDisplay. */
export function createSongCommissionedDisplayState() {
const vsSongCardModeMap = ref({});

const vsSongImageMode = ref(false);

const ocBookImageMode = ref(false);

const ocBookUnitExpandedMap = ref({});

const vsSongCardRefMap = new Map();

const ocBookUnitCardRefMap = new Map();
return { vsSongCardModeMap, vsSongImageMode, ocBookImageMode, ocBookUnitExpandedMap, vsSongCardRefMap, ocBookUnitCardRefMap };
}

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongCommissionedDisplay({
  vsSongCardModeMap,
  vsSongImageMode,
  ocBookImageMode,
  ocBookUnitExpandedMap,
  vsSongCardRefMap,
  ocBookUnitCardRefMap,
  withInteractionPinnedPosition,
  virtualSingerSongStats,
  ocBookStatsByUnit
}) {
const onVsSongImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    vsSongImageMode.value = checked;
  }, anchorEl);
};

const onOcBookImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    ocBookImageMode.value = checked;
  }, anchorEl);
};

const getVsSongCardMode = (name) => vsSongCardModeMap.value[String(name || '')] || 'expanded';

const isOcBookUnitExpanded = (unit) => ocBookUnitExpandedMap.value[String(unit || '')] !== false;

const isVsSongCardCollapsed = (name) => getVsSongCardMode(name) === 'collapsed';

const vsSongGlobalToggleLabel = computed(() => {
  const cards = virtualSingerSongStats.value;
  if (!cards.length) return '展开全部';
  const allCollapsed = cards.every((card) => getVsSongCardMode(card.name) === 'collapsed');
  return allCollapsed ? '展开全部' : '收起全部';
});

const ocBookGlobalToggleLabel = computed(() => {
  const groups = ocBookStatsByUnit.value;
  if (!groups.length) return '收起全部';
  const allCollapsed = groups.every((group) => !isOcBookUnitExpanded(group.unit));
  return allCollapsed ? '展开全部' : '收起全部';
});

const toggleAllVsSongExpandCollapse = () => {
  const cards = virtualSingerSongStats.value;
  if (!cards.length) return;
  void withInteractionPinnedPosition(() => {
    const shouldExpandAll = cards.every((card) => getVsSongCardMode(card.name) === 'collapsed');
    const nextMode = shouldExpandAll ? 'expanded' : 'collapsed';
    const next = {};
    cards.forEach((card) => {
      next[card.name] = nextMode;
    });
    vsSongCardModeMap.value = next;
  });
};

const toggleAllOcBookExpandCollapse = () => {
  const groups = ocBookStatsByUnit.value;
  if (!groups.length) return;
  void withInteractionPinnedPosition(() => {
    const shouldExpandAll = groups.every((group) => !isOcBookUnitExpanded(group.unit));
    const next = {};
    groups.forEach((group) => {
      next[group.unit] = shouldExpandAll;
    });
    ocBookUnitExpandedMap.value = next;
  });
};

const toggleOcBookUnitExpandCollapse = (unit) => {
  const key = String(unit || '');
  if (!key) return;
  void withInteractionPinnedPosition(() => {
    ocBookUnitExpandedMap.value = {
      ...ocBookUnitExpandedMap.value,
      [key]: !isOcBookUnitExpanded(key)
    };
  });
};

const toggleVsSongCardExpandCollapse = (name) => {
  const key = String(name || '');
  if (!key) return;
  void withInteractionPinnedPosition(() => {
    const current = getVsSongCardMode(key);
    const nextMode = current === 'collapsed' ? 'expanded' : 'collapsed';
    vsSongCardModeMap.value = {
      ...vsSongCardModeMap.value,
      [key]: nextMode
    };
  });
};

const setVsSongCardRef = (name, el) => {
  if (el && el instanceof HTMLElement) {
    vsSongCardRefMap.set(name, el);
  } else {
    vsSongCardRefMap.delete(name);
  }
};

const setOcBookUnitCardRef = (unit, el) => {
  const key = String(unit || '');
  if (!key) return;
  if (el && el instanceof HTMLElement) {
    ocBookUnitCardRefMap.set(key, el);
  } else {
    ocBookUnitCardRefMap.delete(key);
  }
};

const snapshotVsSongCardModes = () => ({ ...vsSongCardModeMap.value });

const snapshotOcBookExpandedMap = () => ({ ...ocBookUnitExpandedMap.value });

const expandVsSongCardsForExport = (targetName = '') => {
  const next = { ...vsSongCardModeMap.value };
  virtualSingerSongStats.value.forEach((card) => {
    if (!targetName || card.name === targetName) {
      next[card.name] = 'expanded';
    }
  });
  vsSongCardModeMap.value = next;
};

const expandOcBookUnitsForExport = (targetUnit = '') => {
  const next = { ...ocBookUnitExpandedMap.value };
  ocBookStatsByUnit.value.forEach((group) => {
    if (!targetUnit || group.unit === targetUnit) {
      next[group.unit] = true;
    }
  });
  ocBookUnitExpandedMap.value = next;
};

const connectSongCommissionedDisplayEffects = () => {
watch(vsSongImageMode, (enabled) => {
  if (!enabled) return;
  expandVsSongCardsForExport();
});

watch(ocBookImageMode, (enabled) => {
  if (!enabled) return;
  expandOcBookUnitsForExport();
});

watch(virtualSingerSongStats, (cards) => {
  const next = {};
  cards.forEach((card) => {
    next[card.name] = vsSongCardModeMap.value[card.name] || 'expanded';
  });
  vsSongCardModeMap.value = next;
}, { immediate: true });

watch(ocBookStatsByUnit, (groups) => {
  const next = {};
  groups.forEach((group) => {
    next[group.unit] = ocBookUnitExpandedMap.value[group.unit] !== false;
  });
  ocBookUnitExpandedMap.value = next;
}, { immediate: true });
};

return { onVsSongImageModeChange, onOcBookImageModeChange, getVsSongCardMode, isOcBookUnitExpanded, isVsSongCardCollapsed, vsSongGlobalToggleLabel, ocBookGlobalToggleLabel, toggleAllVsSongExpandCollapse, toggleAllOcBookExpandCollapse, toggleOcBookUnitExpandCollapse, toggleVsSongCardExpandCollapse, setVsSongCardRef, setOcBookUnitCardRef, snapshotVsSongCardModes, snapshotOcBookExpandedMap, expandVsSongCardsForExport, expandOcBookUnitsForExport, connectSongCommissionedDisplayEffects };
}
