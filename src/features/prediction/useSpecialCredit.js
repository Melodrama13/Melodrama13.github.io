import { computed, nextTick, ref, watch } from "vue";
import { createDefaultCreditTextStyle } from './specialPredictionTextDefaults.js';
import { rgbaFromHex, normalizeId } from './specialPredictionFormatters.js';

/** Owns special prediction credit with explicit instance dependencies. */
export function useSpecialCredit(ports = {}) {
const creditText = ref('');

const creditManuallyEdited = ref(false);

const creditTextStyle = ref(createDefaultCreditTextStyle());

let lastCreditDefault = '';

const creditElementMap = new Map();

const creditUserName = computed(() => String(ports.props.predictUserName || '').trim() || ports.sourceSelection.selectedSourceName.value);

const defaultCreditText = computed(() => `预测：${creditUserName.value}`);

const buildCreditTextRenderStyle = (styleValue, monthColor) => {
  const style = ports.settingsPersistence.normalizeCreditTextStyle(styleValue);
  const shadowColor = style.shadowColor || monthColor;
  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    textAlign: style.align,
    fontWeight: style.weight,
    fontStyle: style.italic ? 'oblique 12deg' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing}px`,
    opacity: style.opacity / 100,
    textShadow: style.shadowEnabled
      ? `0 2px 0 ${rgbaFromHex(shadowColor, 0.92)}, 0 0 6px ${rgbaFromHex(shadowColor, 0.9)}, 0 0 12px rgba(255, 255, 255, 0.58)`
      : 'none'
  };
};

const creditTextRenderStyle = computed(() => (
  buildCreditTextRenderStyle(creditTextStyle.value, ports.presentation.selectedMonthColor.value)
));

const getPageCreditTextRenderStyle = (pageKey) => {
  const appearance = ports.pageAppearance.resolvePageAppearance(pageKey);
  return buildCreditTextRenderStyle(
    appearance?.creditTextStyle,
    ports.presentation.getAppearanceMonthColor(appearance)
  );
};

const setCreditElement = (element, pageKey = 'single') => {
  const key = normalizeId(pageKey) || 'single';
  if (!element) {
    creditElementMap.delete(key);
    return;
  }
  creditElementMap.set(key, element);
  const appearance = key === 'single' ? ports.pageAppearance.getActivePageAppearanceView() : ports.pageAppearance.resolvePageAppearance(key);
  const text = String(appearance?.creditText ?? '');
  if (element.innerText !== text) element.innerText = text;
};

const syncCreditElement = async () => {
  await nextTick();
  creditElementMap.forEach((element, key) => {
    const appearance = key === 'single' ? ports.pageAppearance.getActivePageAppearanceView() : ports.pageAppearance.resolvePageAppearance(key);
    const text = String(appearance?.creditText ?? '');
    if (element.innerText !== text) element.innerText = text;
  });
};

const isDefaultCreditText = (value) => /^预测：\S+$/u.test(String(value || '').trim());

const onCreditInput = (event) => {
  creditManuallyEdited.value = true;
  creditText.value = event?.currentTarget?.innerText ?? '';
  ports.settingsPersistence.saveCoverTextSettings();
};

const syncCreditDefault = () => {
  const nextDefault = defaultCreditText.value;
  if (!creditManuallyEdited.value && (!creditText.value || creditText.value === lastCreditDefault || isDefaultCreditText(creditText.value))) {
    creditText.value = nextDefault;
    syncCreditElement();
  }
  lastCreditDefault = nextDefault;
};
const connectSpecialCreditDefault = () => {
watch(
  defaultCreditText,
  syncCreditDefault,
  { immediate: true }
);
};
return { creditText,
creditManuallyEdited,
creditTextStyle,
get lastCreditDefault() { return lastCreditDefault; }, set lastCreditDefault(value) { lastCreditDefault = value; },
creditElementMap,
creditUserName,
defaultCreditText,
buildCreditTextRenderStyle,
creditTextRenderStyle,
getPageCreditTextRenderStyle,
setCreditElement,
syncCreditElement,
isDefaultCreditText,
onCreditInput,
syncCreditDefault,
connectSpecialCreditDefault };
}
