import { expect } from 'playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const VISUAL_CLOCK_ISO = '2026-09-13T04:00:00.000Z';

export const VISUAL_SOURCE = Object.freeze({
  id: 'visual-source',
  name: '视觉回归基线',
  kind: 'local',
  ownerName: 'visual',
  predictiveEvents: [{ id: 226, predict_schema_version: 3 }],
  createdAt: VISUAL_CLOCK_ISO,
  updatedAt: VISUAL_CLOCK_ISO
});

export const UI_STORAGE_KEYS = Object.freeze({
  currentTab: 'pjsk_planner_current_tab_v1',
  predictSources: 'pjsk_predict_sources_v1',
  predictActive: 'pjsk_predict_active_source_v1',
  predictUser: 'pjsk_predict_user_name_v1',
  specialUnlocked: 'pjsk_special_predict_generator_unlocked_v1'
});

const TAB_ROOT_SELECTORS = Object.freeze({
  history: '.event-history',
  stats: '.pjsk-stats',
  songs: '.pjsk-song-stats',
  specialPredict: '.special-predict-page'
});

const HELLO_IMAGE_PATH = fileURLToPath(new URL('../../public/hello.jpg', import.meta.url));
export const LAYOUT_STYLE_KEYS = Object.freeze([
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'padding',
  'gap',
  'margin',
  'borderRadius'
]);

export const MATERIAL_STYLE_KEYS = Object.freeze([
  'backgroundImage',
  'boxShadow'
]);

const STYLE_KEYS = Object.freeze([
  ...LAYOUT_STYLE_KEYS,
  ...MATERIAL_STYLE_KEYS
]);

const waitForFrames = async (page, count = 2) => {
  await page.evaluate(async (frameCount) => {
    for (let i = 0; i < frameCount; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }
  }, count);
};

const installVisualDate = async (page) => {
  await page.addInitScript(({ iso }) => {
    const RealDate = Date;
    const frozenTime = RealDate.parse(iso);

    class FrozenDate extends RealDate {
      constructor(...args) {
        super(...(args.length > 0 ? args : [iso]));
      }

      static now() {
        return frozenTime;
      }
    }

    window.Date = FrozenDate;
  }, { iso: VISUAL_CLOCK_ISO });
};

const installMediaRoutes = async (page) => {
  await page.unroute('**/cards/**');
  await page.unroute('**/songs/**');
  await page.route('**/cards/**', (route) => route.fulfill({ path: HELLO_IMAGE_PATH }));
  await page.route('**/songs/**', (route) => route.fulfill({ path: HELLO_IMAGE_PATH }));
};

const waitForAppState = async (page, tab) => {
  await page.locator('.main-app').waitFor({ state: 'visible', timeout: 120_000 });
  await expect(page.locator('.app-data-loading')).toHaveCount(0, { timeout: 120_000 });
  await expect(page.locator('.app-tab-loading')).toHaveCount(0, { timeout: 120_000 });
  await page.locator(TAB_ROOT_SELECTORS[tab]).waitFor({ state: 'visible', timeout: 120_000 });
  await page.evaluate(() => document.fonts.ready);
  await waitForFrames(page, 2);
};

export async function gotoUiState(page, options = {}) {
  const {
    tab = 'history',
    width = 1440,
    height = 1000,
    fullHistory = false,
    unlockSpecialPredict = false
  } = options;

  if (!Object.prototype.hasOwnProperty.call(TAB_ROOT_SELECTORS, tab)) {
    throw new Error(`Unknown visual tab: ${tab}`);
  }

  await page.setViewportSize({ width, height });
  await installVisualDate(page);
  await installMediaRoutes(page);

  await page.addInitScript(({ keys, source, tabName, unlock }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(keys.currentTab, tabName);
    localStorage.setItem(keys.predictSources, JSON.stringify([source]));
    localStorage.setItem(keys.predictActive, source.id);
    localStorage.setItem(keys.predictUser, source.ownerName);
    if (unlock) sessionStorage.setItem(keys.specialUnlocked, '1');
  }, {
    keys: UI_STORAGE_KEYS,
    source: VISUAL_SOURCE,
    tabName: tab,
    unlock: unlockSpecialPredict
  });

  const query = fullHistory ? '?eventFullRender=1' : '';
  await page.goto(`/${query}`, { waitUntil: 'domcontentloaded' });
  await waitForAppState(page, tab);
}

export async function settleUi(page) {
  await page.evaluate(async () => {
    const waitForImage = (image, timeoutMs) => new Promise((resolve) => {
      if (image.complete) {
        resolve();
        return;
      }

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        image.removeEventListener('load', settle);
        image.removeEventListener('error', settle);
        resolve();
      };

      image.addEventListener('load', settle, { once: true });
      image.addEventListener('error', settle, { once: true });
      window.setTimeout(settle, timeoutMs);
    });

    const images = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      return rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.left < window.innerWidth
        && rect.bottom > 0
        && rect.top < window.innerHeight
        && style.display !== 'none'
        && style.visibility !== 'hidden';
    });

    await Promise.all(images.map((image) => waitForImage(image, 4_000)));
    await Promise.all(images.map(async (image) => {
      if (typeof image.decode !== 'function') return;
      try {
        await Promise.race([
          image.decode(),
          new Promise((resolve) => window.setTimeout(resolve, 2_000))
        ]);
      } catch {
        // A failed image is application-visible; this helper only prevents a
        // browser decode rejection from making settling itself unbounded.
      }
    }));
  });
  await waitForFrames(page, 2);
}

const roundGeometry = (value) => Number(Number(value || 0).toFixed(3));

const readElementContract = async (locator) => locator.evaluate((element, styleKeys) => {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const result = {};
  for (const key of styleKeys) result[key] = style[key];
  result.boundingBox = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  };
  return result;
}, [...STYLE_KEYS]).then((value) => ({
  ...value,
  boundingBox: Object.fromEntries(
    Object.entries(value.boundingBox).map(([key, number]) => [key, roundGeometry(number)])
  )
}));

export async function readStyleContract(page, selectors) {
  const entries = Object.entries(selectors || {}).sort(([left], [right]) => left.localeCompare(right));
  const contract = {};
  for (const [name, selector] of entries) {
    const locator = typeof selector === 'string' ? page.locator(selector).first() : selector.first();
    await expect(locator).toBeAttached();
    contract[name] = await readElementContract(locator);
  }
  return contract;
}

export async function assertNoViewportOverflow(page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const main = document.querySelector('.main-app');
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const visibleNavButtons = [...document.querySelectorAll('.nav-tabs > button')]
      .filter((button) => {
        const style = getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity) !== 0
          && rect.width > 0
          && rect.height > 0;
      })
      .map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          text: button.textContent?.trim() || '',
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          intersects: rect.right > 0
            && rect.left < viewport.width
            && rect.bottom > 0
            && rect.top < viewport.height
        };
      });
    const mainRect = main?.getBoundingClientRect();
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      mainRect: mainRect ? {
        width: mainRect.width,
        height: mainRect.height
      } : null,
      visibleNavButtons
    };
  });

  expect(result.scrollWidth, 'document must not have horizontal viewport overflow').toBeLessThanOrEqual(result.clientWidth);
  expect(result.mainRect, 'main app must have a non-zero rectangle').not.toBeNull();
  expect(result.mainRect.width).toBeGreaterThan(0);
  expect(result.mainRect.height).toBeGreaterThan(0);
  for (const button of result.visibleNavButtons) {
    expect(button.intersects, `top-level tab button is outside the viewport: ${button.text}`).toBe(true);
  }
}

const readDownloadBytes = async (download) => {
  const stream = await download.createReadStream();
  if (stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  }
  const path = await download.path();
  if (!path) throw new Error('Download did not expose a readable path');
  return readFile(path);
};

const createDecodedCrop = async (page, dataUrl) => page.evaluate(({ imageUrl }) => new Promise((resolve, reject) => {
  const existing = document.querySelector('#visual-export-decode-crop');
  existing?.remove();
  const image = new Image();
  image.onload = () => {
    const maxWidth = 480;
    const maxHeight = 360;
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.id = 'visual-export-decode-crop';
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.zIndex = '2147483647';
    canvas.style.pointerEvents = 'none';
    canvas.style.background = '#fff';
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    document.body.append(canvas);
    resolve({ width: image.naturalWidth, height: image.naturalHeight });
  };
  image.onerror = () => reject(new Error('Decoded PNG could not be loaded in the browser'));
  image.src = imageUrl;
}), { imageUrl: dataUrl });

export async function expectValidPng({ page, download, sourceRect, snapshotName }) {
  expect(await download.failure()).toBeNull();
  const bytes = await readDownloadBytes(download);
  expect(bytes.length).toBeGreaterThan(24);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
  if (sourceRect) {
    expect(sourceRect.width).toBeGreaterThan(0);
    expect(sourceRect.height).toBeGreaterThan(0);
    expect(Math.abs(width / height - sourceRect.width / sourceRect.height)).toBeLessThanOrEqual(0.08);
  }

  const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
  const sample = await page.evaluate(({ imageUrl }) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1024 / image.naturalWidth, 1024 / image.naturalHeight);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const distinct = new Set();
      let nonWhite = false;
      const columns = Math.min(32, canvas.width);
      const rows = Math.min(32, canvas.height);
      for (let y = 0; y < rows; y += 1) {
        const sampleY = Math.min(canvas.height - 1, Math.floor((y + 0.5) * canvas.height / rows));
        for (let x = 0; x < columns; x += 1) {
          const sampleX = Math.min(canvas.width - 1, Math.floor((x + 0.5) * canvas.width / columns));
          const rgba = context.getImageData(sampleX, sampleY, 1, 1).data;
          const key = [...rgba].join(',');
          distinct.add(key);
          if (rgba[3] > 0 && (rgba[0] < 248 || rgba[1] < 248 || rgba[2] < 248)) nonWhite = true;
        }
      }
      resolve({ width: image.naturalWidth, height: image.naturalHeight, nonWhite, distinct: distinct.size });
    };
    image.onerror = () => reject(new Error('PNG decode failed'));
    image.src = imageUrl;
  }), { imageUrl: dataUrl });

  expect(sample.width).toBe(width);
  expect(sample.height).toBe(height);
  expect(sample.nonWhite, 'exported PNG must contain a non-white pixel').toBe(true);
  expect(sample.distinct, 'exported PNG must contain at least two sampled RGBA values').toBeGreaterThanOrEqual(2);

  await createDecodedCrop(page, dataUrl);
  await expect(page.locator('#visual-export-decode-crop')).toHaveScreenshot(snapshotName, {
    animations: 'disabled',
    caret: 'hide'
  });
}
