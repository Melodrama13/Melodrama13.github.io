const rawAssetBaseUrl = String(import.meta.env.VITE_ASSET_BASE_URL || '').trim();
const assetBaseUrl = rawAssetBaseUrl.replace(/\/+$/, '');
const ASSET_CORS_CACHE_VERSION = '3';

const ABSOLUTE_URL_RE = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

export const buildAssetUrl = (assetPath) => {
  const rawPath = String(assetPath || '').trim();
  if (!rawPath) return '';
  if (ABSOLUTE_URL_RE.test(rawPath) || rawPath.startsWith('data:') || rawPath.startsWith('blob:')) {
    return rawPath;
  }

  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  if (!assetBaseUrl) return normalizedPath;

  // Event details previously cached these images without CORS. Use a fresh,
  // stable URL so those opaque entries cannot break tooltips or canvas export,
  // while all current consumers continue sharing the same cache.
  const url = new URL(`${assetBaseUrl}${normalizedPath}`);
  url.searchParams.set('_cors', ASSET_CORS_CACHE_VERSION);
  return url.toString();
};
