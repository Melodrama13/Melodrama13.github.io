import { watch, onBeforeUnmount } from "vue";

/** Owns prediction editor actions; state is per editor instance. */
export const usePredictionEditorActions = (dependencies = {}) => {
  const isCharInList = (name) => dependencies.form.selectedChars.some(c => c.name === name);

  const toggleChar = (name) => {
    if (dependencies.isFixedRosterMode.value) return;
    if (!dependencies.isCharSelectable(name) && !isCharInList(name)) {
      return;
    }

    const idx = dependencies.form.selectedChars.findIndex(c => c.name === name);
    if (idx > -1) {
      dependencies.form.selectedChars.splice(idx, 1);
    } else {
      // 新增角色时，尝试根据位置预设星级（前3个四星，第4个三星...）
      const count = dependencies.form.selectedChars.length;
      let autoRarity = count < 3 ? "4" : (count === 3 ? "3" : "2");
      const isVS = dependencies.VS_NAMES.includes(name);
      const bannerUnit = dependencies.getBannerUnit();
      const autoUnit = (dependencies.form.eventType === '箱活' && isVS && !!bannerUnit)
        ? bannerUnit
        : dependencies.getOCUnit(name);
      const autoAttr = (dependencies.form.predictAttr && autoRarity === '4') ? dependencies.form.predictAttr : '-';
      const autoSkill = (dependencies.form.gachaType === 'limited' && isVS && autoRarity === '4') ? 'unit_score' : '-';
      dependencies.form.selectedChars.push({
        name,
        attr: autoAttr,
        rarity: autoRarity,
        selectedUnit: autoUnit,
        skillType: autoSkill
      });

      dependencies.applyAllRules();
    }
  };



  const applyGlobalAttr = () => {
    dependencies.applyAllRules();
  };

  const buildProcessedChars = () => dependencies.form.selectedChars.map(char => {
    let finalUnit = char.selectedUnit;
    let finalSkill = char.skillType;

    if (dependencies.isVsFesSkillMode(char) && finalSkill !== dependencies.ACTIVE_FES_SKILL_KEY) {
      finalSkill = 'unit_score';
    }

    if (dependencies.form.eventType === '箱活' && dependencies.VS_NAMES.includes(char.name)) {
      const bannerUnit = dependencies.getBannerUnit();
      if (bannerUnit) {
        finalUnit = bannerUnit;
      }
    }

    if (dependencies.isBfesVsUnitLocked(char)) {
      finalUnit = 'vs';
    }

    return { ...char, skillType: finalSkill, Affiliation: finalUnit };
  });

  const buildPredictPayload = () => ({
    eventId: dependencies.props.event.id,
    eventType: dependencies.form.eventType,
    gachaType: dependencies.form.gachaType,
    predictAttr: dependencies.form.predictAttr,
    bannerName: String(dependencies.activeBannerName.value || '').trim(),
    selectedChars: buildProcessedChars(),
    event_title: `[预测] ${dependencies.form.eventType}`
  });

  const buildDraftPredictPayload = () => {
    if (!dependencies.props.isOpen || !dependencies.props.event) return null;
    const payload = buildPredictPayload();
    if (!dependencies.isFixedRosterMode.value && !payload.bannerName) return null;

    return payload;
  };

  const emitDraftPredictEvent = () => {
    const payload = buildDraftPredictPayload();
    if (typeof dependencies.updateDraftPredictEvent === 'function') {
      dependencies.updateDraftPredictEvent(payload);
    }
  };

  watch(
    () => [
      dependencies.props.isOpen,
      dependencies.props.event?.id,
      dependencies.form.eventType,
      dependencies.form.gachaType,
      dependencies.form.predictAttr,
      dependencies.form.bannerName,
      dependencies.form.selectedChars.map((c) => [
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
    if (typeof dependencies.updateDraftPredictEvent === 'function') dependencies.updateDraftPredictEvent(null);
  });

  const saveCurrentPrediction = ({ closeEditor = false } = {}) => {
    const payload = buildPredictPayload();
    if (!dependencies.isFixedRosterMode.value && !payload.bannerName) {
      alert('请先选择一个 Ban主。');
      return false;
    }

    if (typeof dependencies.updateDraftPredictEvent === 'function') dependencies.updateDraftPredictEvent(null);
    dependencies.savePredictEvent(payload);
    dependencies.capturePredictionBaseline();
    if (closeEditor) dependencies.emit('close');
    return true;
  };

  const submit = () => saveCurrentPrediction({ closeEditor: true });

  const saveForEventSwitch = () => saveCurrentPrediction({ closeEditor: false });

  const discardDraftForEventSwitch = () => {
    if (typeof dependencies.updateDraftPredictEvent === 'function') dependencies.updateDraftPredictEvent(null);
  };
  return {
    get isCharInList() { return isCharInList; },
    get toggleChar() { return toggleChar; },
    get applyGlobalAttr() { return applyGlobalAttr; },
    get buildProcessedChars() { return buildProcessedChars; },
    get buildPredictPayload() { return buildPredictPayload; },
    get buildDraftPredictPayload() { return buildDraftPredictPayload; },
    get emitDraftPredictEvent() { return emitDraftPredictEvent; },
    get saveCurrentPrediction() { return saveCurrentPrediction; },
    get submit() { return submit; },
    get saveForEventSwitch() { return saveForEventSwitch; },
    get discardDraftForEventSwitch() { return discardDraftForEventSwitch; }
  };
};
