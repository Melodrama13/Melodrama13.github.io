import { computed, ref, watch } from "vue";
import { DEFAULT_CUSTOM_MONTH_COLOR, DEFAULT_CUSTOM_BACKGROUND_COLOR, CUSTOM_COLOR_KEY, CASE_LABEL_DARK_TEXT_LUMINANCE } from './specialPredictionTextDefaults.js';
import { mixHexWithWhite, clampNumber, hexToRgb } from './specialPredictionFormatters.js';

/** Owns special prediction presentation with explicit instance dependencies. */
export function useSpecialPresentation(ports = {}) {
const monthColorName = ref('');

const backgroundColorName = ref('');

const customMonthColor = ref(DEFAULT_CUSTOM_MONTH_COLOR);

const customBackgroundColor = ref(DEFAULT_CUSTOM_BACKGROUND_COLOR);

const monthFontFamily = ref('inherit');

const selectedMonthColor = computed(() => {
  if (monthColorName.value === CUSTOM_COLOR_KEY) return customMonthColor.value || '#ffcaa6';
  const matched = ports.metadata.characterColorOptions.value.find((item) => item.name === monthColorName.value);
  return matched?.color || ports.metadata.characterColorOptions.value[0]?.color || '#ffcaa6';
});

const selectedBackgroundColor = computed(() => {
  if (backgroundColorName.value === CUSTOM_COLOR_KEY) return customBackgroundColor.value || '#c8c9e8';
  const matched = ports.metadata.characterColorOptions.value.find((item) => item.name === backgroundColorName.value);
  return matched?.color || ports.metadata.characterColorOptions.value[1]?.color || '#c8c9e8';
});

const canvasStyle = computed(() => ({
  '--special-month-fill': selectedMonthColor.value,
  '--special-canvas-bg': mixHexWithWhite(selectedBackgroundColor.value, 0.32),
  '--special-preview-scale': ports.preview.previewScale.value
}));

const getAppearanceMonthColor = (appearance) => {
  if (appearance?.monthColorName === CUSTOM_COLOR_KEY) return appearance.customMonthColor || DEFAULT_CUSTOM_MONTH_COLOR;
  return ports.metadata.characterColorOptions.value.find((item) => item.name === appearance?.monthColorName)?.color
    || ports.metadata.characterColorOptions.value[0]?.color
    || DEFAULT_CUSTOM_MONTH_COLOR;
};

const getAppearanceBackgroundColor = (appearance) => {
  if (appearance?.backgroundColorName === CUSTOM_COLOR_KEY) return appearance.customBackgroundColor || DEFAULT_CUSTOM_BACKGROUND_COLOR;
  return ports.metadata.characterColorOptions.value.find((item) => item.name === appearance?.backgroundColorName)?.color
    || ports.metadata.characterColorOptions.value[1]?.color
    || DEFAULT_CUSTOM_BACKGROUND_COLOR;
};

const getPageCanvasStyle = (pageKey) => {
  const appearance = ports.pageAppearance.resolvePageAppearance(pageKey);
  return {
    '--special-month-fill': getAppearanceMonthColor(appearance),
    '--special-canvas-bg': mixHexWithWhite(getAppearanceBackgroundColor(appearance), 0.32),
    '--special-preview-scale': ports.preview.previewScale.value
  };
};

const getPageCoverTextBlocks = (pageKey) => (
  ports.pageAppearance.resolvePageAppearance(pageKey)?.blocks || []
);

const getPageCoverBgUrl = (pageKey) => {
  const assetId = String(ports.pageAppearance.resolvePageAppearance(pageKey)?.coverBgAssetId || '');
  return assetId ? (ports.background.coverBgUrlMap.get(assetId) || '') : '';
};

const getPageCoverImageStyle = (pageKey) => {
  const appearance = ports.pageAppearance.resolvePageAppearance(pageKey);
  const url = getPageCoverBgUrl(pageKey);
  return {
    backgroundImage: url ? `url(${JSON.stringify(url)})` : 'none',
    opacity: clampNumber(appearance?.coverBgOpacity, 100, 0, 100) / 100
  };
};

const getPageMonthTextStyle = (pageKey) => ({
  fontFamily: String(ports.pageAppearance.resolvePageAppearance(pageKey)?.monthFontFamily || 'inherit')
});

const getPageEventMetaTextStyle = (pageKey) => ({
  fontFamily: String(ports.pageAppearance.resolvePageAppearance(pageKey)?.monthFontFamily || 'inherit')
});

const getReadableBlackOrWhite = (backgroundColor) => {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#ffffff';
  const toLinear = (channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * toLinear(rgb.r)
    + 0.7152 * toLinear(rgb.g)
    + 0.0722 * toLinear(rgb.b);
  return luminance >= CASE_LABEL_DARK_TEXT_LUMINANCE ? '#000000' : '#ffffff';
};

const getPageCaseLabelStyle = (pageKey) => {
  const backgroundColor = getAppearanceMonthColor(ports.pageAppearance.resolvePageAppearance(pageKey));
  return {
    backgroundColor,
    color: getReadableBlackOrWhite(backgroundColor)
  };
};

const monthTextStyle = computed(() => ({
  fontFamily: String(monthFontFamily.value || 'inherit')
}));

const eventMetaTextStyle = computed(() => ({
  fontFamily: String(monthFontFamily.value || 'inherit')
}));

const coverStyle = computed(() => {
  const base = 'linear-gradient(90deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.2))';
  const fallback = 'linear-gradient(135deg, #fbc2d7, #b9f3e9 48%, #fff2c6)';
  return { backgroundImage: `${base}, ${fallback}` };
});

const coverImageStyle = computed(() => ({
  backgroundImage: ports.background.coverBgUrl.value ? `url(${JSON.stringify(ports.background.coverBgUrl.value)})` : 'none',
  opacity: clampNumber(ports.background.coverBgOpacity.value, 100, 0, 100) / 100
}));

const setMonthColor = (name) => {
  monthColorName.value = name;
};

const setBackgroundColor = (name) => {
  backgroundColorName.value = name;
};
const connectSpecialDefaultColors = () => {
watch(
  ports.metadata.characterColorOptions,
  (options) => {
    if (!monthColorName.value && options.length > 0) {
      monthColorName.value = options[0].name;
    }
    if (!backgroundColorName.value && options.length > 1) {
      backgroundColorName.value = options[1].name;
    }
  },
  { immediate: true }
);
};
return { monthColorName,
backgroundColorName,
customMonthColor,
customBackgroundColor,
monthFontFamily,
selectedMonthColor,
selectedBackgroundColor,
canvasStyle,
getAppearanceMonthColor,
getAppearanceBackgroundColor,
getPageCanvasStyle,
getPageCoverTextBlocks,
getPageCoverBgUrl,
getPageCoverImageStyle,
getPageMonthTextStyle,
getPageEventMetaTextStyle,
getReadableBlackOrWhite,
getPageCaseLabelStyle,
monthTextStyle,
eventMetaTextStyle,
coverStyle,
coverImageStyle,
setMonthColor,
setBackgroundColor,
connectSpecialDefaultColors };
}
