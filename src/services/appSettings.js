import { hasInjectionContext, inject, reactive, toRefs, watch } from 'vue';
import { DEFAULT_CARD_ARTWORK_VERSION } from '../config/cardArtwork.js';

export const APP_SETTINGS_KEY = Symbol('app-settings');
export const APP_SETTINGS_OPEN_KEY = Symbol('open-app-settings');
export const APP_SETTINGS_STORAGE_KEY = 'pjsk_planner_settings_v1';

export function useAppSettings() {
  return hasInjectionContext() ? inject(APP_SETTINGS_KEY, null) : null;
}

function normalizeSettings(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    cardArtworkVersion: ['v1', 'v2'].includes(source.cardArtworkVersion) ? source.cardArtworkVersion : DEFAULT_CARD_ARTWORK_VERSION,
    singleCardFace: ['before', 'after'].includes(source.singleCardFace) ? source.singleCardFace : 'after',
    nameFormat: ['single', 'abbr'].includes(source.nameFormat) ? source.nameFormat : 'single',
    appearance: ['light', 'dark', 'system'].includes(source.appearance) ? source.appearance : 'system',
    allowSpoilers: source.allowSpoilers === true,
  };
}

/** App-owned display and visibility preferences, separate from prediction data. */
export function createAppSettings(options = {}) {
  let storage;
  let saved;
  try {
    storage = options.storage ?? globalThis.localStorage;
    saved = JSON.parse(storage?.getItem(APP_SETTINGS_STORAGE_KEY) || 'null');
  } catch { /* Storage is optional in private or restricted browsers. */ }
  const state = reactive(normalizeSettings(saved));
  watch(state, () => {
    try { storage?.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(state))); }
    catch { /* Live preferences remain usable when persistence is unavailable. */ }
  }, { flush: 'sync' });
  return toRefs(state);
}
