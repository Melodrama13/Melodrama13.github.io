import { ref, watch } from "vue";
import { ALL_PAGE_CONFIG_KEY, createDefaultCoverTextBlocks, DEFAULT_CUSTOM_MONTH_COLOR, DEFAULT_CUSTOM_BACKGROUND_COLOR, createDefaultCreditTextStyle } from './specialPredictionTextDefaults.js';
import { hexToRgb, clampNumber, normalizeId } from './specialPredictionFormatters.js';

/** Owns special prediction page appearance with explicit instance dependencies. */
export function useSpecialPageAppearance(ports = {}) {
const selectedPageConfigKey = ref(ALL_PAGE_CONFIG_KEY);

const singlePageAppearance = ref(null);

const allPageAppearance = ref(null);

const pageAppearances = ref({});

let pageAppearanceApplying = false;

const capturePageAppearance = () => ports.history.cloneEditorHistoryData({
  blocks: ports.textSettings.coverTextBlocks.value,
  creditText: ports.credit.creditText.value,
  creditManuallyEdited: ports.credit.creditManuallyEdited.value,
  monthFontFamily: ports.presentation.monthFontFamily.value,
  creditTextStyle: ports.credit.creditTextStyle.value,
  monthColorName: ports.presentation.monthColorName.value,
  backgroundColorName: ports.presentation.backgroundColorName.value,
  customMonthColor: ports.presentation.customMonthColor.value,
  customBackgroundColor: ports.presentation.customBackgroundColor.value,
  coverBgAssetId: ports.background.coverBgAssetId.value,
  coverBgFileName: ports.background.coverBgFileName.value,
  coverBgOpacity: ports.background.coverBgOpacity.value
});

const normalizePageAppearance = (value, fallback = null) => {
  const source = value && typeof value === 'object' ? value : (fallback || capturePageAppearance());
  const fallbackBlocks = createDefaultCoverTextBlocks();
  const normalizedBlocks = (Array.isArray(source.blocks) ? source.blocks : fallbackBlocks)
    .map((block, index) => ports.coverText.normalizeCoverTextBlock(block, fallbackBlocks[index] || fallbackBlocks[0]))
    .filter((block) => block.id);
  return {
    blocks: normalizedBlocks.length ? normalizedBlocks : fallbackBlocks,
    creditText: String(source.creditText ?? ports.credit.defaultCreditText.value),
    creditManuallyEdited: !!source.creditManuallyEdited,
    monthFontFamily: String(source.monthFontFamily || 'inherit'),
    creditTextStyle: ports.settingsPersistence.normalizeCreditTextStyle(source.creditTextStyle),
    monthColorName: String(source.monthColorName || ports.metadata.characterColorOptions.value[0]?.name || ''),
    backgroundColorName: String(source.backgroundColorName || ports.metadata.characterColorOptions.value[1]?.name || ''),
    customMonthColor: hexToRgb(source.customMonthColor) ? source.customMonthColor : DEFAULT_CUSTOM_MONTH_COLOR,
    customBackgroundColor: hexToRgb(source.customBackgroundColor) ? source.customBackgroundColor : DEFAULT_CUSTOM_BACKGROUND_COLOR,
    coverBgAssetId: ports.background.coverBgAssetMap.has(String(source.coverBgAssetId || '')) ? String(source.coverBgAssetId) : '',
    coverBgFileName: String(source.coverBgFileName || ''),
    coverBgOpacity: Math.round(clampNumber(source.coverBgOpacity, 100, 0, 100))
  };
};

const createDefaultPageAppearance = () => normalizePageAppearance({
  blocks: createDefaultCoverTextBlocks(),
  creditText: ports.credit.defaultCreditText.value,
  creditManuallyEdited: false,
  monthFontFamily: 'inherit',
  creditTextStyle: createDefaultCreditTextStyle(),
  monthColorName: ports.metadata.characterColorOptions.value[0]?.name || '',
  backgroundColorName: ports.metadata.characterColorOptions.value[1]?.name || '',
  customMonthColor: DEFAULT_CUSTOM_MONTH_COLOR,
  customBackgroundColor: DEFAULT_CUSTOM_BACKGROUND_COLOR,
  coverBgAssetId: '',
  coverBgFileName: '',
  coverBgOpacity: 100
});

const getActivePageAppearanceView = () => ({
  blocks: ports.textSettings.coverTextBlocks.value,
  creditText: ports.credit.creditText.value,
  creditManuallyEdited: ports.credit.creditManuallyEdited.value,
  monthFontFamily: ports.presentation.monthFontFamily.value,
  creditTextStyle: ports.credit.creditTextStyle.value,
  monthColorName: ports.presentation.monthColorName.value,
  backgroundColorName: ports.presentation.backgroundColorName.value,
  customMonthColor: ports.presentation.customMonthColor.value,
  customBackgroundColor: ports.presentation.customBackgroundColor.value,
  coverBgAssetId: ports.background.coverBgAssetId.value,
  coverBgFileName: ports.background.coverBgFileName.value,
  coverBgOpacity: ports.background.coverBgOpacity.value
});

const isPlainAppearanceObject = (value) => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const applyChangedAppearanceObject = (previous, next, target) => {
  const result = ports.history.cloneEditorHistoryData(isPlainAppearanceObject(target) ? target : {});
  const previousObject = isPlainAppearanceObject(previous) ? previous : {};
  const nextObject = isPlainAppearanceObject(next) ? next : {};
  Object.keys({ ...previousObject, ...nextObject }).forEach((key) => {
    const previousValue = previousObject[key];
    const nextValue = nextObject[key];
    if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) return;
    if (isPlainAppearanceObject(previousValue) && isPlainAppearanceObject(nextValue)) {
      result[key] = applyChangedAppearanceObject(previousValue, nextValue, result[key]);
    } else if (nextValue === undefined) {
      delete result[key];
    } else {
      result[key] = ports.history.cloneEditorHistoryData(nextValue);
    }
  });
  return result;
};

const applyChangedCoverTextBlocks = (previousBlocks, nextBlocks, targetBlocks) => {
  const previous = Array.isArray(previousBlocks) ? previousBlocks : [];
  const next = Array.isArray(nextBlocks) ? nextBlocks : [];
  const target = Array.isArray(targetBlocks) ? ports.history.cloneEditorHistoryData(targetBlocks) : [];
  const previousById = new Map(previous.map((block) => [normalizeId(block?.id), block]));
  const nextById = new Map(next.map((block) => [normalizeId(block?.id), block]));
  const targetById = new Map(target.map((block) => [normalizeId(block?.id), block]));

  previousById.forEach((_block, id) => {
    if (!nextById.has(id)) targetById.delete(id);
  });
  nextById.forEach((block, id) => {
    if (!id) return;
    if (!previousById.has(id)) {
      targetById.set(id, ports.history.cloneEditorHistoryData(block));
      return;
    }
    targetById.set(id, applyChangedAppearanceObject(
      previousById.get(id),
      block,
      targetById.get(id) || previousById.get(id)
    ));
  });

  const orderedIds = [
    ...target.map((block) => normalizeId(block?.id)).filter((id) => targetById.has(id)),
    ...next.map((block) => normalizeId(block?.id)).filter((id) => targetById.has(id))
  ];
  return [...new Set(orderedIds)].map((id) => targetById.get(id));
};

const applyPageAppearanceDelta = (previous, next, target) => {
  const previousAppearance = isPlainAppearanceObject(previous) ? previous : {};
  const nextAppearance = isPlainAppearanceObject(next) ? next : {};
  const result = ports.history.cloneEditorHistoryData(isPlainAppearanceObject(target) ? target : previousAppearance);
  Object.keys({ ...previousAppearance, ...nextAppearance }).forEach((property) => {
    const previousValue = previousAppearance[property];
    const nextValue = nextAppearance[property];
    if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) return;
    if (property === 'blocks') {
      result.blocks = applyChangedCoverTextBlocks(previousValue, nextValue, result.blocks);
    } else if (isPlainAppearanceObject(previousValue) && isPlainAppearanceObject(nextValue)) {
      result[property] = applyChangedAppearanceObject(previousValue, nextValue, result[property]);
    } else if (nextValue === undefined) {
      delete result[property];
    } else {
      result[property] = ports.history.cloneEditorHistoryData(nextValue);
    }
  });
  return result;
};

const commitCurrentPageAppearance = () => {
  if (pageAppearanceApplying) return;
  const snapshot = capturePageAppearance();
  if (!ports.sourceSelection.isMultiCaseMode.value) {
    singlePageAppearance.value = snapshot;
    return;
  }
  const key = selectedPageConfigKey.value;
  if (key === ALL_PAGE_CONFIG_KEY) {
    const previous = allPageAppearance.value || snapshot;
    allPageAppearance.value = snapshot;
    const next = { ...pageAppearances.value };
    ports.caseRows.monthlyMultiPages.value.forEach((page) => {
      next[page.key] = applyPageAppearanceDelta(
        previous,
        snapshot,
        next[page.key] || previous
      );
    });
    pageAppearances.value = next;
  } else if (key) {
    pageAppearances.value = { ...pageAppearances.value, [key]: snapshot };
  }
};

const applyPageAppearance = (appearance) => {
  const modeFallback = ports.sourceSelection.isMultiCaseMode.value
    ? allPageAppearance.value
    : singlePageAppearance.value;
  const normalized = normalizePageAppearance(
    appearance || modeFallback || createDefaultPageAppearance(),
    modeFallback || undefined
  );
  pageAppearanceApplying = true;
  ports.textSettings.coverTextBlocks.value = ports.history.cloneEditorHistoryData(normalized.blocks);
  ports.credit.creditText.value = normalized.creditText;
  ports.credit.creditManuallyEdited.value = normalized.creditManuallyEdited;
  ports.presentation.monthFontFamily.value = normalized.monthFontFamily;
  ports.credit.creditTextStyle.value = ports.settingsPersistence.normalizeCreditTextStyle(normalized.creditTextStyle);
  ports.presentation.monthColorName.value = normalized.monthColorName;
  ports.presentation.backgroundColorName.value = normalized.backgroundColorName;
  ports.presentation.customMonthColor.value = normalized.customMonthColor;
  ports.presentation.customBackgroundColor.value = normalized.customBackgroundColor;
  ports.background.coverBgOpacity.value = normalized.coverBgOpacity;
  ports.background.applyCoverBgAsset(normalized.coverBgAssetId, normalized.coverBgFileName);
  pageAppearanceApplying = false;
};

const resolvePageAppearance = (pageKey) => {
  const key = normalizeId(pageKey);
  if (selectedPageConfigKey.value === key) {
    return getActivePageAppearanceView();
  }
  return pageAppearances.value[key] || allPageAppearance.value || getActivePageAppearanceView();
};

const selectPageConfig = async (pageKey) => {
  const nextKey = normalizeId(pageKey) || ALL_PAGE_CONFIG_KEY;
  if (nextKey === selectedPageConfigKey.value) return;
  ports.history.commitPendingEditorHistory();
  commitCurrentPageAppearance();
  ports.history.editorHistoryApplying = true;
  selectedPageConfigKey.value = nextKey;
  applyPageAppearance(nextKey === ALL_PAGE_CONFIG_KEY
    ? allPageAppearance.value
    : (pageAppearances.value[nextKey] || allPageAppearance.value));
  await Promise.all([ports.coverText.syncCoverTextElements(), ports.credit.syncCreditElement()]);
  await ports.preview.updatePreviewScale();
  ports.history.lastEditorHistoryState = ports.history.captureEditorHistoryState();
  ports.history.editorHistoryApplying = false;
  ports.settingsPersistence.saveCoverTextSettings();
};

const isPageAppearanceActive = (pageKey) => (
  selectedPageConfigKey.value === ALL_PAGE_CONFIG_KEY
  || selectedPageConfigKey.value === normalizeId(pageKey)
);

const selectPageCoverTextBlock = (pageKey, block) => {
  if (!isPageAppearanceActive(pageKey)) {
    void selectPageConfig(pageKey).then(() => {
      const activeBlock = ports.textSettings.coverTextBlocks.value.find((item) => item.id === block?.id);
      if (activeBlock) ports.textTransform.selectCoverTextBlock(activeBlock);
    });
    return;
  }
  ports.textTransform.selectCoverTextBlock(block);
};

const selectPagePredictor = (pageKey) => {
  if (!isPageAppearanceActive(pageKey)) {
    void selectPageConfig(pageKey).then(ports.textTransform.selectPredictorText);
    return;
  }
  ports.textTransform.selectPredictorText();
};
const connectSpecialPageAppearance = () => {
watch(
  () => ports.caseRows.monthlyMultiPages.value.map((page) => page.key).join('|'),
  () => {
    const validKeys = new Set(ports.caseRows.monthlyMultiPages.value.map((page) => page.key));
    const base = allPageAppearance.value || capturePageAppearance();
    const next = { ...pageAppearances.value };
    ports.caseRows.monthlyMultiPages.value.forEach((page) => {
      if (!next[page.key]) next[page.key] = ports.history.cloneEditorHistoryData(base);
    });
    pageAppearances.value = next;
    if (
      selectedPageConfigKey.value !== ALL_PAGE_CONFIG_KEY
      && !validKeys.has(selectedPageConfigKey.value)
    ) {
      void selectPageConfig(ALL_PAGE_CONFIG_KEY);
    }
    ports.preview.updatePreviewScale();
  },
  { immediate: true, flush: 'post' }
);
};
return { selectedPageConfigKey,
singlePageAppearance,
allPageAppearance,
pageAppearances,
get pageAppearanceApplying() { return pageAppearanceApplying; }, set pageAppearanceApplying(value) { pageAppearanceApplying = value; },
capturePageAppearance,
normalizePageAppearance,
createDefaultPageAppearance,
getActivePageAppearanceView,
isPlainAppearanceObject,
applyChangedAppearanceObject,
applyChangedCoverTextBlocks,
applyPageAppearanceDelta,
commitCurrentPageAppearance,
applyPageAppearance,
resolvePageAppearance,
selectPageConfig,
isPageAppearanceActive,
selectPageCoverTextBlock,
selectPagePredictor,
connectSpecialPageAppearance };
}
