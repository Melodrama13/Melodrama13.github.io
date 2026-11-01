import { ref, computed, nextTick } from 'vue';
import { buildCharacterLineupRows, compareLineupSolvedHit } from './cardLineup.js';

/** Owns card lineup behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardLineup(inputs) {
  const lineupShowCardImages = ref(false);

  const compareSolvedHit = (nextHit, bestHit) => compareLineupSolvedHit(nextHit, bestHit, inputs.lineupRules);
  const characterLineupRows = computed(() => buildCharacterLineupRows({
    cards: inputs.props.allCards || [],
    names: [...inputs.metadata.LINEUP_CHAR_NAMES.value],
    attrs: inputs.constants.ATTRS,
    isCardWithinLimit: (card) => inputs.eventCatalog.isCardWithinLimit(card, inputs.eventCatalog.safeMaxEventId.value),
    getCardBaseName: inputs.metadata.getCardBaseName,
    isKnownName: (name) => !!inputs.metadata.CHAR_ORDER[name],
    normalizeAttribute: inputs.eventCatalog.normalizeCardStatsAttribute,
    lineupRules: inputs.lineupRules,
    buildEventRef: inputs.eventLabels.buildLineupEventRef,
    isFesSkillType: inputs.presentation.isFesSkillType,
    getFesKindBySkillKind: inputs.presentation.getFesKindBySkillKind,
  }));

  const lineupExpandedMap = ref({});

  const isLineupExpanded = (name) => {
    const key = String(name || '');
    return !!key && lineupExpandedMap.value[key] !== false;
  };

  const lineupRowsWithOthers = computed(() => characterLineupRows.value.filter((row) => (row.otherPlans || []).length > 0));

  const isLineupAllExpanded = computed(() => {
    if (!lineupRowsWithOthers.value.length) return false;
    return lineupRowsWithOthers.value.every((row) => isLineupExpanded(row.name));
  });

  const getLineupToggleLabel = (name, count = 0) => {
    const expanded = isLineupExpanded(name);
    if (inputs.navigation.isMobileNav.value) return expanded ? '收起' : '展开';
    return expanded ? '收起其余属性' : '展开其余属性';
  };

  const getLineupGlobalToggleLabel = () => {
    if (inputs.navigation.isMobileNav.value) return isLineupAllExpanded.value ? '收起全部' : '展开全部';
    return isLineupAllExpanded.value ? '收起全部其余属性' : '展开全部其余属性';
  };

  const onLineupShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      lineupShowCardImages.value = checked;
      void nextTick(() => {
        inputs.responsiveLayout.queueLineupCardModeRowLayoutSync();
      });
    }, anchorEl);
  };

  const toggleLineupExpanded = (name, event = null) => {
    const key = String(name || '');
    if (!key) return;
    const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      lineupExpandedMap.value = {
        ...lineupExpandedMap.value,
        [key]: !isLineupExpanded(key)
      };
    }, anchorEl);
  };

  const toggleLineupExpandedAll = (event = null) => {
    const target = !isLineupAllExpanded.value;
    const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      const next = { ...lineupExpandedMap.value };
      lineupRowsWithOthers.value.forEach((row) => {
        next[row.name] = target;
      });
      lineupExpandedMap.value = next;
    }, anchorEl);
  };

  return {
    characterLineupRows,
    compareLineupSolvedHit: compareSolvedHit,
    lineupShowCardImages,
    onLineupShowCardImagesChange,
    toggleLineupExpandedAll,
    getLineupGlobalToggleLabel,
    toggleLineupExpanded,
    getLineupToggleLabel,
    isLineupExpanded,
  };
}
