import { GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY } from '../../domain/gameAttributes.js';
import { ref } from "vue";

/** Owns prediction draft baseline; state is per editor instance. */
export const usePredictionDraftBaseline = (dependencies = {}) => {
  const normalizePredictionAttribute = (attributeValue) => {
    const attributeKey = String(attributeValue || '').trim();
    if (!attributeKey) return '';
    if (attributeKey === '-') return '-';
    return GAME_ATTRIBUTE_NAME_BY_LOWERCASE_KEY[attributeKey.toLowerCase()] || '';
  };

  const getAttrLabel = (attr) => dependencies.ATTR_LABELS[attr] || String(attr || '');

  const initialPredictionSnapshot = ref('');

  const serializePredictionForm = () => JSON.stringify({
    eventType: String(dependencies.form.eventType || '').trim(),
    gachaType: String(dependencies.form.gachaType || '').trim(),
    predictAttr: normalizePredictionAttribute(dependencies.form.predictAttr),
    bannerName: String(dependencies.form.bannerName || '').trim(),
    selectedChars: dependencies.form.selectedChars.map((char) => ({
      name: String(char?.name || '').trim(),
      attr: normalizePredictionAttribute(char?.attr) || '-',
      rarity: String(char?.rarity || '').trim(),
      selectedUnit: String(char?.selectedUnit || '').trim().toLowerCase(),
      skillType: String(char?.skillType || '').trim().toLowerCase()
    }))
  });

  const capturePredictionBaseline = () => {
    initialPredictionSnapshot.value = serializePredictionForm();
  };

  const hasUnsavedChanges = () => Boolean(
    dependencies.props.isOpen
      && dependencies.props.event
      && initialPredictionSnapshot.value
      && serializePredictionForm() !== initialPredictionSnapshot.value
  );
  return {
    get normalizePredictionAttribute() { return normalizePredictionAttribute; },
    get getAttrLabel() { return getAttrLabel; },
    get initialPredictionSnapshot() { return initialPredictionSnapshot; },
    get serializePredictionForm() { return serializePredictionForm; },
    get capturePredictionBaseline() { return capturePredictionBaseline; },
    get hasUnsavedChanges() { return hasUnsavedChanges; }
  };
};
