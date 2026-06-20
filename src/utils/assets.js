const rawAssetBaseUrl = String(import.meta.env.VITE_ASSET_BASE_URL || '').trim();
const assetBaseUrl = rawAssetBaseUrl.replace(/\/+$/, '');

const ABSOLUTE_URL_RE = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

export const buildAssetUrl = (assetPath) => {
  const rawPath = String(assetPath || '').trim();
  if (!rawPath) return '';
  if (ABSOLUTE_URL_RE.test(rawPath) || rawPath.startsWith('data:') || rawPath.startsWith('blob:')) {
    return rawPath;
  }

  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  return assetBaseUrl ? `${assetBaseUrl}${normalizedPath}` : normalizedPath;
};

