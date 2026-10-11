import { computed, ref } from "vue";
import { FONT_DATABASE_NAME, FONT_DATABASE_STORE } from './specialPredictionTextDefaults.js';

/** Owns special prediction fonts with explicit instance dependencies. */
export function useSpecialFonts(ports = {}) {
const DEFAULT_TEXT_FONT_STACK = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Noto Sans CJK SC", "Hiragino Sans GB", "Segoe UI", sans-serif';

const COMMON_FONT_OPTIONS = Object.freeze([
  { label: '系统默认', value: 'inherit' },
  { label: '系统无衬线', value: DEFAULT_TEXT_FONT_STACK },
  { label: '系统衬线', value: 'ui-serif, "Songti SC", STSong, SimSun, "Noto Serif CJK SC", serif' }
]);

const PLATFORM_FONT_OPTIONS = Object.freeze({
  ios: [
    { label: '苹方', value: '"PingFang SC", "PingFang TC", -apple-system, sans-serif' },
    { label: '宋体', value: '"Songti SC", STSong, ui-serif, serif' },
    { label: '楷体', value: '"Kaiti SC", STKaiti, ui-serif, serif' },
    { label: '仿宋', value: '"FangSong SC", STFangsong, FangSong, ui-serif, serif' },
    { label: '圆体', value: 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", sans-serif' },
    { label: '日文无衬线', value: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif' },
    { label: '等宽', value: 'ui-monospace, "SFMono-Regular", Menlo, monospace' }
  ],
  android: [
    { label: 'Roboto', value: 'Roboto, "Noto Sans CJK SC", sans-serif' },
    { label: 'Noto 无衬线', value: '"Noto Sans CJK SC", "Noto Sans SC", sans-serif' },
    { label: 'Noto 衬线', value: '"Noto Serif CJK SC", "Noto Serif SC", serif' },
    { label: '楷体', value: 'KaiTi, "Kaiti SC", "Noto Serif CJK SC", serif' },
    { label: '仿宋', value: 'FangSong, "FangSong SC", "Noto Serif CJK SC", serif' },
    { label: '等宽', value: '"Roboto Mono", "Noto Sans Mono CJK SC", monospace' }
  ],
  mac: [
    { label: '苹方', value: '"PingFang SC", "PingFang TC", -apple-system, sans-serif' },
    { label: '宋体', value: '"Songti SC", STSong, ui-serif, serif' },
    { label: '楷体', value: '"Kaiti SC", STKaiti, ui-serif, serif' },
    { label: '仿宋', value: '"FangSong SC", STFangsong, FangSong, ui-serif, serif' },
    { label: '圆体', value: 'ui-rounded, "SF Pro Rounded", sans-serif' },
    { label: '日文无衬线', value: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif' },
    { label: '日文明朝', value: '"Hiragino Mincho ProN", "Songti SC", ui-serif, serif' },
    { label: '日文圆体', value: '"Hiragino Maru Gothic ProN", ui-rounded, sans-serif' },
    { label: 'Helvetica Neue（西文）', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
    { label: 'Arial（西文）', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman（西文）', value: '"Times New Roman", Times, serif' },
    { label: 'Georgia（西文）', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Avenir（西文）', value: 'Avenir, "Helvetica Neue", sans-serif' },
    { label: 'Baskerville（西文）', value: 'Baskerville, Georgia, serif' },
    { label: 'American Typewriter（西文）', value: '"American Typewriter", "Courier New", monospace' },
    { label: 'Courier New（打字机）', value: '"Courier New", Courier, monospace' },
    { label: 'Menlo（等宽）', value: 'ui-monospace, "SFMono-Regular", Menlo, monospace' },
    { label: 'Monaco（等宽）', value: 'Monaco, Menlo, ui-monospace, monospace' }
  ],
  desktop: [
    { label: '微软雅黑', value: '"Microsoft YaHei", "Noto Sans SC", sans-serif' },
    { label: '微软雅黑 UI', value: '"Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans SC", sans-serif' },
    { label: '等线', value: 'DengXian, "Microsoft YaHei", "Noto Sans SC", sans-serif' },
    { label: '黑体', value: 'SimHei, "Microsoft YaHei", "Noto Sans SC", sans-serif' },
    { label: '宋体', value: 'SimSun, "Songti SC", "Noto Serif CJK SC", serif' },
    { label: '新宋体', value: 'NSimSun, SimSun, "Noto Serif CJK SC", serif' },
    { label: '楷体', value: 'KaiTi, STKaiti, "Kaiti SC", serif' },
    { label: '仿宋', value: 'FangSong, STFangsong, "FangSong SC", serif' },
    { label: '微软正黑', value: '"Microsoft JhengHei", "Microsoft YaHei", sans-serif' },
    { label: '新细明体', value: 'PMingLiU, MingLiU, SimSun, serif' },
    { label: '游黑体（日文）', value: '"Yu Gothic", "Hiragino Sans", "Noto Sans JP", sans-serif' },
    { label: 'Meiryo（日文）', value: 'Meiryo, "Yu Gothic", "Noto Sans JP", sans-serif' },
    { label: 'MS Gothic（日文）', value: '"MS Gothic", "MS PGothic", Meiryo, sans-serif' },
    { label: '游明朝（日文）', value: '"Yu Mincho", "MS Mincho", "Noto Serif JP", serif' },
    { label: 'MS Mincho（日文）', value: '"MS Mincho", "MS PMincho", "Yu Mincho", serif' },
    { label: '圆体', value: '"Yu Gothic UI", "Arial Rounded MT Bold", ui-rounded, sans-serif' },
    { label: 'Segoe UI（西文）', value: '"Segoe UI", Arial, sans-serif' },
    { label: 'Arial（西文）', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman（西文）', value: '"Times New Roman", Times, serif' },
    { label: 'Calibri（西文）', value: 'Calibri, "Segoe UI", Arial, sans-serif' },
    { label: 'Cambria（西文）', value: 'Cambria, Georgia, "Times New Roman", serif' },
    { label: 'Georgia（西文）', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Verdana（西文）', value: 'Verdana, Arial, sans-serif' },
    { label: 'Tahoma（西文）', value: 'Tahoma, "Segoe UI", sans-serif' },
    { label: 'Trebuchet MS（西文）', value: '"Trebuchet MS", Arial, sans-serif' },
    { label: 'Consolas（等宽）', value: 'Consolas, "SFMono-Regular", Menlo, monospace' },
    { label: 'Courier New（打字机）', value: '"Courier New", Courier, monospace' },
    { label: 'Lucida Console（等宽）', value: '"Lucida Console", Consolas, monospace' }
  ]
});

const detectFontPlatform = () => {
  if (typeof navigator === 'undefined') return 'desktop';
  const userAgent = String(navigator.userAgent || '');
  const platform = String(navigator.platform || '');
  const isTouchMac = platform === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1;
  if (/iPhone|iPad|iPod/i.test(userAgent) || isTouchMac) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'mac';
  return 'desktop';
};

const customFontOptions = ref([]);

const localFontStatus = ref('');

const fontPlatform = detectFontPlatform();

let localFontStatusTimer = null;

let fontDatabasePromise = null;

const customFontFaceMap = new Map();

const availableFontOptions = computed(() => [
  ...COMMON_FONT_OPTIONS,
  ...(PLATFORM_FONT_OPTIONS[fontPlatform] || PLATFORM_FONT_OPTIONS.desktop),
  ...customFontOptions.value
]);

const selectedCustomFontOption = computed(() => (
  customFontOptions.value.find((option) => option.value === ports.textSettings.editorCoverTextSettings.value?.fontFamily)
  || null
));

const openFontDatabase = () => {
  if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB unavailable'));
  if (fontDatabasePromise) return fontDatabasePromise;
  fontDatabasePromise = new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(FONT_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FONT_DATABASE_STORE)) {
        database.createObjectStore(FONT_DATABASE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open font database'));
  });
  return fontDatabasePromise;
};

const readStoredFonts = async () => {
  const database = await openFontDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(FONT_DATABASE_STORE, 'readonly')
      .objectStore(FONT_DATABASE_STORE)
      .getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error || new Error('Failed to read stored fonts'));
  });
};

const writeStoredFont = async (record) => {
  const database = await openFontDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FONT_DATABASE_STORE, 'readwrite');
    transaction.objectStore(FONT_DATABASE_STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to store font'));
    transaction.onabort = () => reject(transaction.error || new Error('Font storage aborted'));
  });
};

const removeStoredFont = async (id) => {
  const database = await openFontDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FONT_DATABASE_STORE, 'readwrite');
    transaction.objectStore(FONT_DATABASE_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to delete font'));
    transaction.onabort = () => reject(transaction.error || new Error('Font deletion aborted'));
  });
};

const registerStoredFont = async (record) => {
  if (!record?.id || !record?.family || !record?.data || typeof FontFace === 'undefined' || !document?.fonts) return null;
  const source = typeof record.data.arrayBuffer === 'function'
    ? await record.data.arrayBuffer()
    : record.data;
  const fontFace = new FontFace(record.family, source);
  await fontFace.load();
  document.fonts.add(fontFace);
  customFontFaceMap.set(record.id, fontFace);
  return {
    id: record.id,
    label: String(record.label || `上传：${record.fileName || '字体'}`),
    value: `"${record.family}", ${DEFAULT_TEXT_FONT_STACK}`,
    isCustom: true
  };
};

const setLocalFontStatus = (message, autoClear = true) => {
  if (localFontStatusTimer) {
    window.clearTimeout(localFontStatusTimer);
    localFontStatusTimer = null;
  }
  localFontStatus.value = message;
  if (message && autoClear) {
    localFontStatusTimer = window.setTimeout(() => {
      localFontStatus.value = '';
      localFontStatusTimer = null;
    }, 15000);
  }
};

const loadPersistedFonts = async () => {
  try {
    const records = await readStoredFonts();
    const loaded = (await Promise.all(records.map(async (record) => {
      try {
        return await registerStoredFont(record);
      } catch (error) {
        console.warn('[special-predict] failed to restore stored font', record?.fileName || record?.id, error);
        return null;
      }
    }))).filter(Boolean);
    customFontOptions.value = loaded;
    if (loaded.length > 0) setLocalFontStatus(`已恢复 ${loaded.length} 个上传字体`);
    const validValues = new Set(availableFontOptions.value.map((option) => option.value));
    ports.textSettings.coverTextBlocks.value.forEach((block) => {
      if (!validValues.has(block.fontFamily)) block.fontFamily = 'inherit';
    });
    Object.values(ports.eventNotes.eventNotesByMode.value).forEach((notesBySource) => {
      Object.values(notesBySource).forEach((notes) => {
        Object.values(notes).forEach((note) => {
          if (!validValues.has(note.fontFamily)) note.fontFamily = 'inherit';
        });
      });
    });
    if (!validValues.has(ports.presentation.monthFontFamily.value)) ports.presentation.monthFontFamily.value = 'inherit';
    if (!validValues.has(ports.credit.creditTextStyle.value.fontFamily)) ports.credit.creditTextStyle.value.fontFamily = 'inherit';
    const normalizeAppearanceFonts = (appearance) => {
      if (!appearance) return;
      (appearance.blocks || []).forEach((block) => {
        if (!validValues.has(block.fontFamily)) block.fontFamily = 'inherit';
      });
      if (!validValues.has(appearance.monthFontFamily)) appearance.monthFontFamily = 'inherit';
      if (!validValues.has(appearance.creditTextStyle?.fontFamily)) appearance.creditTextStyle.fontFamily = 'inherit';
    };
    normalizeAppearanceFonts(ports.pageAppearance.singlePageAppearance.value);
    normalizeAppearanceFonts(ports.pageAppearance.allPageAppearance.value);
    Object.values(ports.pageAppearance.pageAppearances.value).forEach(normalizeAppearanceFonts);
  } catch (error) {
    console.warn('[special-predict] failed to load stored fonts', error);
  }
};

const onLocalFontUpload = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  setLocalFontStatus('正在载入字体...', false);
  try {
    if (typeof FontFace === 'undefined' || !document?.fonts) {
      throw new Error('FontFace API unavailable');
    }
    const id = `font-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const family = `PjskLocalFont_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const persistentData = await file.arrayBuffer();
    const data = persistentData.slice(0);
    const fontFace = new FontFace(family, data);
    await fontFace.load();
    document.fonts.add(fontFace);
    const value = `"${family}", ${DEFAULT_TEXT_FONT_STACK}`;
    const label = `上传：${file.name.replace(/\.[^.]+$/, '')}`;
    const option = { id, label, value, isCustom: true };
    customFontFaceMap.set(id, fontFace);
    customFontOptions.value.push(option);
    if (ports.textSettings.editorCoverTextSettings.value) ports.textSettings.editorCoverTextSettings.value.fontFamily = value;
    let persisted = true;
    try {
      await writeStoredFont({
        id,
        family,
        label,
        fileName: file.name,
        mimeType: file.type,
        data: persistentData
      });
      await globalThis.navigator?.storage?.persist?.();
    } catch (storageError) {
      persisted = false;
      console.warn('[special-predict] font loaded but could not be persisted', storageError);
    }
    setLocalFontStatus(persisted
      ? `已导入并保存 ${file.name}`
      : `已导入 ${file.name}，但当前浏览器无法持久保存`);
  } catch (error) {
    console.warn('[special-predict] local font load failed', error);
    setLocalFontStatus('字体载入失败，请尝试 TTF、OTF、WOFF 或 WOFF2。');
  } finally {
    event.target.value = '';
  }
};

const deleteSelectedCustomFont = async () => {
  const option = selectedCustomFontOption.value;
  if (!option) return;
  try {
    await removeStoredFont(option.id);
  } catch (error) {
    console.warn('[special-predict] failed to delete stored font', error);
  }
  const fontFace = customFontFaceMap.get(option.id);
  if (fontFace && document?.fonts?.delete) document.fonts.delete(fontFace);
  customFontFaceMap.delete(option.id);
  ports.textSettings.coverTextBlocks.value.forEach((block) => {
    if (block.fontFamily === option.value) block.fontFamily = 'inherit';
  });
  Object.values(ports.eventNotes.eventNotesByMode.value).forEach((notesBySource) => {
    Object.values(notesBySource).forEach((notes) => {
      Object.values(notes).forEach((note) => {
        if (note.fontFamily === option.value) note.fontFamily = 'inherit';
      });
    });
  });
  if (ports.presentation.monthFontFamily.value === option.value) ports.presentation.monthFontFamily.value = 'inherit';
  if (ports.credit.creditTextStyle.value.fontFamily === option.value) ports.credit.creditTextStyle.value.fontFamily = 'inherit';
  const clearAppearanceFont = (appearance) => {
    if (!appearance) return;
    (appearance.blocks || []).forEach((block) => {
      if (block.fontFamily === option.value) block.fontFamily = 'inherit';
    });
    if (appearance.monthFontFamily === option.value) appearance.monthFontFamily = 'inherit';
    if (appearance.creditTextStyle?.fontFamily === option.value) appearance.creditTextStyle.fontFamily = 'inherit';
  };
  clearAppearanceFont(ports.pageAppearance.singlePageAppearance.value);
  clearAppearanceFont(ports.pageAppearance.allPageAppearance.value);
  Object.values(ports.pageAppearance.pageAppearances.value).forEach(clearAppearanceFont);
  customFontOptions.value = customFontOptions.value.filter((item) => item.id !== option.id);
  setLocalFontStatus(`已删除 ${option.label.replace(/^上传：/, '')}`);
};

return { DEFAULT_TEXT_FONT_STACK,
COMMON_FONT_OPTIONS,
PLATFORM_FONT_OPTIONS,
detectFontPlatform,
customFontOptions,
localFontStatus,
fontPlatform,
get localFontStatusTimer() { return localFontStatusTimer; }, set localFontStatusTimer(value) { localFontStatusTimer = value; },
get fontDatabasePromise() { return fontDatabasePromise; }, set fontDatabasePromise(value) { fontDatabasePromise = value; },
customFontFaceMap,
availableFontOptions,
selectedCustomFontOption,
openFontDatabase,
readStoredFonts,
writeStoredFont,
removeStoredFont,
registerStoredFont,
setLocalFontStatus,
loadPersistedFonts,
onLocalFontUpload,
deleteSelectedCustomFont };
}
