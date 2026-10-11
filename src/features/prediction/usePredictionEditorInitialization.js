import { watch } from "vue";
import { isCollaborationEvent } from "../../domain/collaborationEvents.js";

/** Owns prediction editor initialization; state is per editor instance. */
export const usePredictionEditorInitialization = (dependencies = {}) => {
  // 监听打开并初始化数据
  watch([() => dependencies.props.event, () => dependencies.props.isOpen], ([newVal, isOpen]) => {
    if (newVal && isOpen) {
      const sourceType = isCollaborationEvent(newVal) ? '联动' : String(newVal.source_event_type || '').trim();
      const sourceIsTeamWorldLink = sourceType === 'World Link' && dependencies.isWorldLinkTeamSeries({
        source_event_type: sourceType,
        type_series_id: newVal.type_series_id
      });
      const hasFixedType = sourceType.length > 0
        ? (sourceIsTeamWorldLink || isCollaborationEvent(newVal))
        : (!newVal.isPredict && !!String(newVal.event_type || '').trim());

      const hasValidType = !!(newVal.event_type && newVal.event_type.trim().length > 0);
      const rawType = hasValidType ? String(newVal.event_type).trim() : '混活';
      const defaultType = (rawType === 'World Link' && !dependencies.isWorldLinkTeamSeries(newVal)) ? '混活' : rawType;
      dependencies.form.eventType = hasFixedType ? sourceType : defaultType;
      dependencies.form.isTypeLocked = hasFixedType;

      const sourceGacha = isCollaborationEvent(newVal) ? '联动' : String(newVal.source_gacha_type || '').trim();
      const hasFixedGacha = sourceGacha.length > 0 || (!newVal.isPredict && !!String(newVal.gacha_type || '').trim());
      const currentGacha = hasFixedGacha ? sourceGacha : (newVal.gacha_type || '常驻');
      dependencies.form.gachaType = currentGacha === '联动'
        ? 'collab'
        : currentGacha === '普通限定'
        ? 'limited'
        : (currentGacha === 'UE限定' ? 'ue' : 'perm');
      dependencies.form.isGachaLocked = hasFixedGacha;

      dependencies.form.predictAttr = dependencies.normalizePredictionAttribute(newVal.event_attribute);
      dependencies.form.bannerName = '';

      if (newVal.memberCards && (newVal.isPredict || dependencies.isFixedRosterMode.value)) {
        dependencies.form.selectedChars = newVal.memberCards.map(card => ({
          cardId: card.CardID,
          name: card.Name,
          attr: dependencies.normalizePredictionAttribute(card.Attribute) || '-',
          rarity: card.Rarity,
          selectedUnit: card.Affiliation,
          skillType: card.Skill || '-'
        }));
        dependencies.form.bannerName = String(newVal.banner || '').trim();
      } else {
        dependencies.form.selectedChars = [];
      }

      if (!dependencies.form.predictAttr) {
        dependencies.form.selectedChars.forEach((c) => {
          if (!c.attr) c.attr = '-';
        });
      }

      dependencies.applyAllRules();
      dependencies.capturePredictionBaseline();
    }
  }, { immediate: true });
  return {

  };
};
