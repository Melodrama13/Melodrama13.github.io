import { ref } from "vue";
import { clampNumber } from './specialPredictionFormatters.js';

/** Owns special prediction background with explicit instance dependencies. */
export function useSpecialBackground(ports = {}) {
const coverBgUrl = ref('');

const coverBgFileName = ref('');

const coverBgAssetId = ref('');

const coverBgOpacity = ref(100);

const coverBgAssetMap = new Map();

const coverBgUrlMap = new Map();

const applyCoverBgAsset = (assetId, fileName = '') => {
  const file = assetId ? coverBgAssetMap.get(assetId) : null;
  coverBgAssetId.value = file ? assetId : '';
  if (file && !coverBgUrlMap.has(assetId)) coverBgUrlMap.set(assetId, URL.createObjectURL(file));
  coverBgUrl.value = file ? (coverBgUrlMap.get(assetId) || '') : '';
  coverBgFileName.value = file ? (fileName || file.name || '') : '';
};

const clearCoverBg = () => {
  applyCoverBgAsset('');
  coverBgOpacity.value = 100;
};

const normalizeCoverBgOpacity = () => {
  coverBgOpacity.value = Math.round(clampNumber(coverBgOpacity.value, 100, 0, 100));
};

const onCoverBgUpload = (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const assetId = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  coverBgAssetMap.set(assetId, file);
  coverBgUrlMap.set(assetId, URL.createObjectURL(file));
  applyCoverBgAsset(assetId, file.name);
  coverBgOpacity.value = 100;
  event.target.value = '';
};

return { coverBgUrl,
coverBgFileName,
coverBgAssetId,
coverBgOpacity,
coverBgAssetMap,
coverBgUrlMap,
applyCoverBgAsset,
clearCoverBg,
normalizeCoverBgOpacity,
onCoverBgUpload };
}
