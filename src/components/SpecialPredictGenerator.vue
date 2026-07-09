<template>
  <div class="special-predict-page">
    <section v-if="!isUnlocked" class="special-lock-panel" aria-label="特殊预测生成器访问验证">
      <div class="special-lock-inner">
        <h2>特殊预测生成器</h2>
        <p>请输入访问密钥。</p>
        <form class="special-lock-form" @submit.prevent="unlock">
          <input
            v-model="keyDraft"
            class="special-lock-input"
            type="password"
            autocomplete="current-password"
            placeholder="密钥"
          />
          <button class="special-action-btn" type="submit">进入</button>
        </form>
        <div v-if="lockError" class="special-lock-error">{{ lockError }}</div>
        <div v-if="usingDefaultKey" class="special-lock-note">当前使用开发默认软锁。</div>
      </div>
    </section>

    <section v-else class="special-generator-shell">
      <div class="special-toolbar">
        <div class="special-toolbar-row special-toolbar-row-main">
        <div class="special-toolbar-group special-toolbar-source">
          <label class="special-source-picker">
            <span>数据源</span>
            <select v-model="selectedSourceId">
              <option
                v-for="source in normalizedSources"
                :key="source.id"
                :value="source.id"
              >
                {{ source.name }}（{{ source.predictiveEvents.length }}）
              </option>
            </select>
          </label>
        </div>

        <div class="special-toolbar-group">
          <label class="special-range-field">
            <span>起始</span>
            <input v-model="rangeStartDraft" type="text" inputmode="numeric" :placeholder="rangeStartPlaceholder" />
          </label>
          <label class="special-range-field">
            <span>截止</span>
            <input v-model="rangeEndDraft" type="text" inputmode="numeric" :placeholder="rangeEndPlaceholder" />
          </label>
          <label class="special-toggle-field">
            <input v-model="showUnpredictedRows" type="checkbox" />
            <span>未预测</span>
          </label>
        </div>
        </div>

        <div class="special-toolbar-row special-toolbar-row-colors">
        <div class="special-toolbar-group special-toolbar-colors" aria-label="月份填充色">
          <span class="special-toolbar-label">月份色</span>
          <div class="special-color-swatches">
            <button
              v-for="item in characterColorOptions"
              :key="item.name"
              class="special-color-swatch"
              :class="{ active: selectedMonthColor === item.color }"
              type="button"
              :title="item.name"
              :style="{ backgroundColor: item.color }"
              @click="setMonthColor(item.name)"
            />
            <button
              class="special-color-swatch special-color-custom"
              :class="{ active: monthColorName === CUSTOM_COLOR_KEY }"
              type="button"
              title="自选色"
              @click="setMonthColor(CUSTOM_COLOR_KEY)"
            />
            <input
              v-if="monthColorName === CUSTOM_COLOR_KEY"
              v-model="customMonthColor"
              class="special-inline-color-input"
              type="color"
              title="自选月份色"
            />
          </div>
        </div>

        <div class="special-toolbar-group special-toolbar-colors" aria-label="背景颜色">
          <span class="special-toolbar-label">背景色</span>
          <div class="special-color-swatches">
            <button
              v-for="item in characterColorOptions"
              :key="`bg-${item.name}`"
              class="special-color-swatch is-bg"
              :class="{ active: selectedBackgroundColor === item.color }"
              type="button"
              :title="item.name"
              :style="{ backgroundColor: rgbaFromHex(item.color, 0.42) }"
              @click="setBackgroundColor(item.name)"
            />
            <button
              class="special-color-swatch special-color-custom"
              :class="{ active: backgroundColorName === CUSTOM_COLOR_KEY }"
              type="button"
              title="自选色"
              @click="setBackgroundColor(CUSTOM_COLOR_KEY)"
            />
            <input
              v-if="backgroundColorName === CUSTOM_COLOR_KEY"
              v-model="customBackgroundColor"
              class="special-inline-color-input"
              type="color"
              title="自选背景色"
            />
          </div>
        </div>
        </div>

        <div class="special-toolbar-row special-toolbar-row-text">
        <div class="special-toolbar-group special-toolbar-text" aria-label="头图文字">
          <span class="special-toolbar-label">文本框</span>
          <select v-model="selectedCoverTextId" class="special-text-select">
            <option v-for="block in coverTextBlocks" :key="block.id" :value="block.id">{{ block.name }}</option>
          </select>
          <button class="special-secondary-btn" type="button" @click="addCoverTextBlock">新增</button>
          <button class="special-secondary-btn" type="button" :disabled="coverTextBlocks.length <= 1" @click="removeSelectedCoverTextBlock">删除</button>
          <button class="special-secondary-btn" type="button" @click="restoreDefaultCoverTextBlocks">恢复默认</button>
          <template v-if="selectedCoverTextBlock">
          <input v-model="selectedCoverTextBlock.color" class="special-text-color-input" type="color" title="文字颜色" />
          <input
            class="special-text-color-input"
            type="color"
            title="立体效果颜色"
            :value="selectedCoverTextBlock.shadowColor || selectedMonthColor"
            @input="selectedCoverTextBlock.shadowColor = $event.target.value"
          />
          <button
            class="special-secondary-btn special-follow-btn"
            :class="{ active: !selectedCoverTextBlock.shadowColor }"
            type="button"
            @click="selectedCoverTextBlock.shadowColor = ''"
          >跟随</button>
          <label class="special-mini-field">
            <span>字号</span>
            <input v-model.number="selectedCoverTextBlock.fontSize" type="number" min="10" max="54" step="1" />
          </label>
          <div class="special-align-control" aria-label="文字对齐">
            <button type="button" :class="{ active: selectedCoverTextBlock.align === 'left' }" @click="selectedCoverTextBlock.align = 'left'">左</button>
            <button type="button" :class="{ active: selectedCoverTextBlock.align === 'center' }" @click="selectedCoverTextBlock.align = 'center'">中</button>
            <button type="button" :class="{ active: selectedCoverTextBlock.align === 'right' }" @click="selectedCoverTextBlock.align = 'right'">右</button>
          </div>
          <label class="special-mini-field"><span>X</span><input v-model.number="selectedCoverTextBlock.x" type="number" min="0" max="94" step="1" /></label>
          <label class="special-mini-field"><span>Y</span><input v-model.number="selectedCoverTextBlock.y" type="number" min="0" max="94" step="1" /></label>
          <label class="special-mini-field"><span>宽</span><input v-model.number="selectedCoverTextBlock.w" type="number" min="6" max="100" step="1" /></label>
          <label class="special-mini-field"><span>高</span><input v-model.number="selectedCoverTextBlock.h" type="number" min="6" max="100" step="1" /></label>
          </template>
        </div>
        </div>

        <div class="special-toolbar-row special-toolbar-row-actions">
        <div class="special-toolbar-group special-toolbar-cover">
          <label class="special-upload-btn">
            <input type="file" accept="image/*" @change="onCoverBgUpload" />
            <span>{{ coverBgFileName ? '更换图片' : '上传图片' }}</span>
          </label>
          <button v-if="coverBgUrl" class="special-secondary-btn" type="button" @click="clearCoverBg">清除图片</button>
        </div>

        <button class="special-action-btn" type="button" :disabled="isExporting || renderedRows.length === 0" @click="exportPng">
          {{ isExporting ? '导出中...' : '导出 PNG' }}
        </button>
        </div>
      </div>

      <div v-if="exportStatus" class="special-export-status">{{ exportStatus }}</div>

      <div ref="canvasWrapRef" class="special-canvas-wrap">
        <div class="special-canvas-stage" :style="canvasStageStyle">
        <div ref="canvasRef" class="special-canvas" :class="{ 'is-exporting': isExporting }" :style="canvasStyle" aria-label="特殊预测图预览">
          <div class="special-cover-panel" :style="coverStyle">
            <img v-if="coverBgUrl" :src="coverBgUrl" class="special-cover-bg" alt="" @load="updatePreviewScale" />
            <div
              v-for="block in coverTextBlocks"
              :key="block.id"
              class="special-cover-text"
              contenteditable="true"
              :style="getCoverTextBlockStyle(block)"
              :aria-label="block.name"
              spellcheck="false"
              :ref="(el) => setCoverTextElement(block, el)"
              @focus="selectedCoverTextId = block.id"
              @input="onCoverTextInput(block, $event)"
              @blur="saveCoverTextSettings"
            />
          </div>
          <template v-for="row in renderedRows" :key="row.key">
            <div v-if="row.monthLabel" class="special-month-bar">{{ row.monthLabel }}</div>
            <div
              :class="['special-event-row', row.rowClass]"
              :style="row.detailStyle"
            >
            <div class="special-date-box">
              <span class="special-date-text">{{ row.startDate || '-' }}</span>
              <span v-if="row.endDate" class="special-date-sep">~</span>
              <span v-if="row.endDate" class="special-date-text">{{ row.endDate }}</span>
              <span class="special-event-id">#{{ row.id }}</span>
            </div>

            <div class="special-detail-box" :style="row.detailStyle">
              <div class="special-detail-head" :class="row.detailKindClass">
                <template v-if="row.detailKind === 'box' && row.unitLogo">
                  <img :src="row.unitLogo" class="special-unit-logo" :alt="row.unitLabel" />
                </template>
                <template v-else-if="row.detailKind === 'mixed'">
                  <img src="/specialized/se.png" class="special-se-logo" alt="混活" />
                </template>
                <template v-else-if="row.detailKind === 'wl'">
                  <span class="special-wl-text">World Link</span>
                </template>
                <template v-else>
                  <span class="special-unknown-text">{{ row.eventType || '待定' }}</span>
                </template>
                <span v-if="row.seriesLabel" class="special-series-label">{{ row.seriesLabel }}</span>
              </div>

              <div class="special-member-grid">
                <SpecialCardCell
                  v-for="(card, idx) in row.normalCards"
                  :key="`n-${row.key}-${idx}`"
                  :card="card"
                  :is-banner="card.isBanner"
                  :char-map="charMap"
                  :vs-name-set="vsNameSet"
                />
              </div>

              <div v-if="row.bfesCards.length > 0" class="special-bfes-grid">
                <div class="special-bfes-logo-cell">
                  <img src="/elements/bfes.webp" class="special-bfes-logo" alt="BFES" />
                </div>
                <SpecialCardCell
                  v-for="(card, idx) in row.bfesCards"
                  :key="`b-${row.key}-${idx}`"
                  :card="card"
                  :is-banner="card.isBanner"
                  :char-map="charMap"
                  :vs-name-set="vsNameSet"
                />
              </div>
            </div>
            </div>
          </template>

          <div v-if="renderedRows.length === 0" class="special-empty">
            当前数据源没有可生成的预测。
          </div>
          <div
            class="special-credit-box"
            contenteditable="true"
            spellcheck="false"
            @input="onCreditInput"
            :ref="setCreditElement"
          />
        </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import html2canvas from 'html2canvas';

const props = defineProps({
  predictSources: { type: Array, default: () => [] },
  activePredictSourceId: { type: String, default: '' },
  allEvents: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] },
  allBaseCards: { type: Array, default: () => [] },
  predictUserName: { type: String, default: '' }
});

const DEFAULT_KEY_HASH = 'f5175cca14129a479337dfc2fd9d4a1f7f1f6b9dbc8f7d57db51685d85af60fd';
const configuredHash = String(import.meta.env.VITE_SPECIAL_PREDICT_KEY_SHA256 || '').trim().toLowerCase();
const activeKeyHash = configuredHash || DEFAULT_KEY_HASH;
const usingDefaultKey = !configuredHash;
const UNLOCK_SESSION_KEY = 'pjsk_special_predict_generator_unlocked_v1';
const COVER_TEXT_STORAGE_KEY = 'pjsk_special_predict_cover_text_blocks_v1';
const CUSTOM_COLOR_KEY = '__custom';

const createDefaultCoverTextBlocks = () => [
  {
    id: 'title',
    name: '左上标题',
    text: 'プロセカ\n活动预测',
    x: 5,
    y: 8,
    w: 40,
    h: 40,
    fontSize: 35,
    color: '#ffffff',
    shadowColor: '',
    align: 'left',
    weight: 900
  },
  {
    id: 'note',
    name: '左下说明',
    text: '情况很多',
    x: 5,
    y: 50,
    w: 55,
    h: 40,
    fontSize: 18,
    color: '#ffffff',
    shadowColor: '',
    align: 'left',
    weight: 800
  },
  {
    id: 'reference',
    name: '右侧参考',
    text: '仅供参考\n仅供参考\n仅供参考\n仅供参考\n仅供参考\n仅供参考',
    x: 66,
    y: 12,
    w: 28,
    h: 70,
    fontSize: 35,
    color: '#ffffff',
    shadowColor: '',
    align: 'right',
    weight: 900
  }
];

const keyDraft = ref('');
const lockError = ref('');
const isUnlocked = ref(false);
const selectedSourceId = ref('');
const canvasRef = ref(null);
const canvasWrapRef = ref(null);
const isExporting = ref(false);
const exportStatus = ref('');
const rangeStartDraft = ref('');
const rangeEndDraft = ref('');
const showUnpredictedRows = ref(true);
const monthColorName = ref('');
const coverBgUrl = ref('');
const coverBgFileName = ref('');
const creditText = ref('');
const creditManuallyEdited = ref(false);
const backgroundColorName = ref('');
const customMonthColor = ref('#ffcaa6');
const customBackgroundColor = ref('#c8c9e8');
const selectedCoverTextId = ref('title');
const coverTextBlocks = ref(createDefaultCoverTextBlocks());
const previewScale = ref(1);
const previewCanvasWidth = ref(0);
const previewCanvasHeight = ref(0);
let previewResizeObserver = null;
let lastCreditDefault = '';
let exportStatusTimer = null;
const coverTextElementMap = new Map();
let creditElement = null;
let coverTextSettingsReady = false;

const normalizeId = (value) => String(value ?? '').trim();
const getBaseName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
const normalizeUnit = (unit) => String(unit || '').trim().toLowerCase();
const normalizeAttr = (attr) => {
  const raw = String(attr || '').trim();
  const map = {
    pure: 'Pure',
    cool: 'Cool',
    cute: 'Cute',
    happy: 'Happy',
    mysterious: 'Mysterious'
  };
  if (!raw || raw === '-') return '';
  return map[raw.toLowerCase()] || raw;
};

const UNIT_LOGOS = {
  ln: '/elements/Leo_need.webp',
  mmj: '/elements/MORE_MORE_JUMP!.webp',
  vbs: '/elements/Vivid_BAD_SQUAD.webp',
  ws: '/elements/ワンダーランズ×ショウタイム.webp',
  nc: '/elements/25時、ナイトコードで.webp',
  vs: '/elements/virtual_singer.webp'
};

const textToBytes = (text) => {
  const value = String(text || '');
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value);
  const encoded = unescape(encodeURIComponent(value));
  const bytes = new Uint8Array(encoded.length);
  for (let index = 0; index < encoded.length; index += 1) {
    bytes[index] = encoded.charCodeAt(index);
  }
  return bytes;
};

const rotr = (value, bits) => (value >>> bits) | (value << (32 - bits));

const sha256Fallback = (inputBytes) => {
  const bytes = Array.from(inputBytes || []);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  for (let shift = 56; shift >= 0; shift -= 8) {
    bytes.push(Math.floor(bitLength / (2 ** shift)) & 0xff);
  }

  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Array(64).fill(0);
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      w[index] = ((bytes[start] << 24) | (bytes[start + 1] << 16) | (bytes[start + 2] << 8) | bytes[start + 3]) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = (rotr(w[index - 15], 7) ^ rotr(w[index - 15], 18) ^ (w[index - 15] >>> 3)) >>> 0;
      const s1 = (rotr(w[index - 2], 17) ^ rotr(w[index - 2], 19) ^ (w[index - 2] >>> 10)) >>> 0;
      w[index] = (w[index - 16] + s0 + w[index - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let index = 0; index < 64; index += 1) {
      const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (hh + s1 + ch + k[index] + w[index]) >>> 0;
      const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (s0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }

  return h.map((value) => value.toString(16).padStart(8, '0')).join('');
};

const hashText = async (text) => {
  const bytes = textToBytes(text);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return sha256Fallback(bytes);
  try {
    const digest = await subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.warn('[special-predict] Web Crypto SHA-256 failed, using JS fallback.', error);
    return sha256Fallback(bytes);
  }
};

const unlock = async () => {
  lockError.value = '';
  try {
    const digest = await hashText(keyDraft.value);
    if (digest === activeKeyHash) {
      isUnlocked.value = true;
      sessionStorage.setItem(UNLOCK_SESSION_KEY, '1');
      keyDraft.value = '';
      return;
    }
    lockError.value = '密钥不正确。';
  } catch (error) {
    console.error('[special-predict] key check failed', error);
    lockError.value = '当前浏览器不支持密钥校验。';
  }
};

const normalizedSources = computed(() => (Array.isArray(props.predictSources) ? props.predictSources : [])
  .map((source, index) => ({
    id: normalizeId(source?.id) || `source-${index}`,
    name: String(source?.name || `数据源 ${index + 1}`).trim() || `数据源 ${index + 1}`,
    predictiveEvents: Array.isArray(source?.predictiveEvents) ? source.predictiveEvents : []
  })));

const selectedSource = computed(() => normalizedSources.value.find((source) => source.id === selectedSourceId.value) || normalizedSources.value[0] || null);

const selectedSourceName = computed(() => String(selectedSource.value?.name || '').trim() || '未知用户');

const creditUserName = computed(() => String(props.predictUserName || '').trim() || selectedSourceName.value);

const defaultCreditText = computed(() => `预测：${creditUserName.value}`);

const baseCardsByEventId = computed(() => {
  const map = new Map();
  (Array.isArray(props.allBaseCards) ? props.allBaseCards : []).forEach((card) => {
    const key = normalizeId(card?.EventID);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(card);
  });
  return map;
});

const charMap = computed(() => {
  const map = {};
  (Array.isArray(props.allCharacters) ? props.allCharacters : []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    if (!name) return;
    map[name] = {
      abbr: String(char?.en_abbr || '').trim(),
      unit: normalizeUnit(char?.unit),
      color: String(char?.color || '').trim()
    };
  });
  return map;
});

const vsNameSet = computed(() => new Set(
  Object.entries(charMap.value)
    .filter(([, meta]) => meta.unit === 'vs')
    .map(([name]) => name)
));

const characterColorOptions = computed(() => (Array.isArray(props.allCharacters) ? props.allCharacters : [])
  .map((char) => ({
    name: String(char?.zh_name || '').trim(),
    color: String(char?.color || '').trim()
  }))
  .filter((item) => item.name && !!hexToRgb(item.color))
  .slice(0, 26));

const selectedMonthColor = computed(() => {
  if (monthColorName.value === CUSTOM_COLOR_KEY) return customMonthColor.value || '#ffcaa6';
  const matched = characterColorOptions.value.find((item) => item.name === monthColorName.value);
  return matched?.color || characterColorOptions.value[0]?.color || '#ffcaa6';
});

const selectedBackgroundColor = computed(() => {
  if (backgroundColorName.value === CUSTOM_COLOR_KEY) return customBackgroundColor.value || '#c8c9e8';
  const matched = characterColorOptions.value.find((item) => item.name === backgroundColorName.value);
  return matched?.color || characterColorOptions.value[1]?.color || '#c8c9e8';
});

const canvasStyle = computed(() => ({
  '--special-month-fill': selectedMonthColor.value,
  '--special-canvas-bg': mixHexWithWhite(selectedBackgroundColor.value, 0.32),
  '--special-preview-scale': previewScale.value
}));

const canvasStageStyle = computed(() => ({
  width: previewCanvasWidth.value ? `${Math.ceil(previewCanvasWidth.value * previewScale.value)}px` : undefined,
  height: previewCanvasHeight.value ? `${Math.ceil(previewCanvasHeight.value * previewScale.value)}px` : undefined
}));

const selectedCoverTextBlock = computed(() => (
  coverTextBlocks.value.find((block) => block.id === selectedCoverTextId.value)
  || coverTextBlocks.value[0]
  || null
));

const clampPercent = (value, fallback, min = 0, max = 100) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const getCoverTextBlockStyle = (block) => {
  const shadowColor = block.shadowColor || selectedMonthColor.value;
  return {
    left: `${clampPercent(block.x, 0)}%`,
    top: `${clampPercent(block.y, 0)}%`,
    width: `${clampPercent(block.w, 30, 6, 100)}%`,
    height: `${clampPercent(block.h, 20, 6, 100)}%`,
    color: block.color || '#ffffff',
    fontSize: `${Math.min(54, Math.max(10, Number(block.fontSize) || 24))}px`,
    textAlign: ['left', 'center', 'right'].includes(block.align) ? block.align : 'left',
    fontWeight: Number(block.weight) || 900,
    textShadow: `0 2px 0 ${rgbaFromHex(shadowColor, 0.92)}, 0 0 6px ${rgbaFromHex(shadowColor, 0.9)}, 0 0 12px rgba(255, 255, 255, 0.58)`
  };
};

const coverStyle = computed(() => {
  const base = 'linear-gradient(90deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.2))';
  return { backgroundImage: `${base}, linear-gradient(135deg, #fbc2d7, #b9f3e9 48%, #fff2c6)` };
});

const setMonthColor = (name) => {
  monthColorName.value = name;
};

const setBackgroundColor = (name) => {
  backgroundColorName.value = name;
};

const addCoverTextBlock = () => {
  const id = `text-${Date.now()}`;
  coverTextBlocks.value.push({
    id,
    name: `文本${coverTextBlocks.value.length + 1}`,
    text: '新文本',
    x: 12,
    y: 18,
    w: 34,
    h: 18,
    fontSize: 22,
    color: '#ffffff',
    shadowColor: '',
    align: 'left',
    weight: 900
  });
  selectedCoverTextId.value = id;
};

const removeSelectedCoverTextBlock = () => {
  if (coverTextBlocks.value.length <= 1) return;
  const index = coverTextBlocks.value.findIndex((block) => block.id === selectedCoverTextId.value);
  if (index < 0) return;
  coverTextBlocks.value.splice(index, 1);
  selectedCoverTextId.value = coverTextBlocks.value[Math.max(0, index - 1)]?.id || coverTextBlocks.value[0]?.id || '';
};

const normalizeCoverTextBlock = (block, fallback) => ({
  ...fallback,
  ...(block || {}),
  id: String(block?.id || fallback.id || `text-${Date.now()}`),
  name: String(block?.name || fallback.name || '文本'),
  text: String(block?.text ?? fallback.text ?? ''),
  x: clampPercent(block?.x, fallback.x ?? 0),
  y: clampPercent(block?.y, fallback.y ?? 0),
  w: clampPercent(block?.w, fallback.w ?? 30, 6, 100),
  h: clampPercent(block?.h, fallback.h ?? 20, 6, 100),
  fontSize: Math.min(54, Math.max(10, Number(block?.fontSize || fallback.fontSize || 24))),
  color: String(block?.color || fallback.color || '#ffffff'),
  shadowColor: String(block?.shadowColor || ''),
  align: ['left', 'center', 'right'].includes(block?.align) ? block.align : (fallback.align || 'left'),
  weight: Number(block?.weight || fallback.weight || 900)
});

const restoreDefaultCoverTextBlocks = () => {
  coverTextBlocks.value = createDefaultCoverTextBlocks();
  selectedCoverTextId.value = 'title';
  syncCoverTextElements();
};

const loadCoverTextSettings = () => {
  try {
    const raw = localStorage.getItem(COVER_TEXT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const defaults = createDefaultCoverTextBlocks();
    const loadedBlocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
    const normalized = loadedBlocks
      .map((block, index) => normalizeCoverTextBlock(block, defaults[index] || defaults[0]))
      .filter((block) => block.id);
    if (normalized.length > 0) {
      coverTextBlocks.value = normalized;
      selectedCoverTextId.value = normalized.some((block) => block.id === parsed?.selectedId)
        ? parsed.selectedId
        : normalized[0].id;
      syncCoverTextElements();
    }
    if (typeof parsed?.creditText === 'string') {
      creditText.value = parsed.creditText;
      creditManuallyEdited.value = typeof parsed?.creditManuallyEdited === 'boolean'
        ? parsed.creditManuallyEdited
        : !isDefaultCreditText(parsed.creditText);
      syncCreditDefault();
      syncCreditElement();
    }
  } catch (error) {
    console.warn('[special-predict] failed to load cover text settings', error);
  } finally {
    coverTextSettingsReady = true;
  }
};

const saveCoverTextSettings = () => {
  if (!coverTextSettingsReady) return;
  try {
    localStorage.setItem(COVER_TEXT_STORAGE_KEY, JSON.stringify({
      selectedId: selectedCoverTextId.value,
      blocks: coverTextBlocks.value,
      creditText: creditText.value,
      creditManuallyEdited: creditManuallyEdited.value
    }));
  } catch (error) {
    console.warn('[special-predict] failed to save cover text settings', error);
  }
};

const clearCoverBg = () => {
  if (coverBgUrl.value) URL.revokeObjectURL(coverBgUrl.value);
  coverBgUrl.value = '';
  coverBgFileName.value = '';
};

const onCoverBgUpload = (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  clearCoverBg();
  coverBgUrl.value = URL.createObjectURL(file);
  coverBgFileName.value = file.name;
  event.target.value = '';
};

const onCoverTextInput = (block, event) => {
  block.text = event?.currentTarget?.innerText ?? '';
  saveCoverTextSettings();
};

const setCoverTextElement = (block, element) => {
  const id = String(block?.id || '');
  if (!id) return;
  if (!element) {
    coverTextElementMap.delete(id);
    return;
  }
  coverTextElementMap.set(id, element);
  const text = String(block?.text ?? '');
  if (element.innerText !== text) element.innerText = text;
};

const syncCoverTextElements = async () => {
  await nextTick();
  coverTextBlocks.value.forEach((block) => {
    const element = coverTextElementMap.get(block.id);
    if (!element) return;
    const text = String(block.text ?? '');
    if (element.innerText !== text) element.innerText = text;
  });
};

const setCreditElement = (element) => {
  creditElement = element || null;
  if (!creditElement) return;
  const text = String(creditText.value ?? '');
  if (creditElement.innerText !== text) creditElement.innerText = text;
};

const syncCreditElement = async () => {
  await nextTick();
  if (!creditElement) return;
  const text = String(creditText.value ?? '');
  if (creditElement.innerText !== text) creditElement.innerText = text;
};

const isDefaultCreditText = (value) => /^预测：\S+$/u.test(String(value || '').trim());

const onCreditInput = (event) => {
  creditManuallyEdited.value = true;
  creditText.value = event?.currentTarget?.innerText ?? '';
  saveCoverTextSettings();
};

const syncCreditDefault = () => {
  const nextDefault = defaultCreditText.value;
  if (!creditManuallyEdited.value && (!creditText.value || creditText.value === lastCreditDefault || isDefaultCreditText(creditText.value))) {
    creditText.value = nextDefault;
    syncCreditElement();
  }
  lastCreditDefault = nextDefault;
};

const updatePreviewScale = async () => {
  await nextTick();
  const target = canvasRef.value;
  const wrap = canvasWrapRef.value;
  if (!target || !wrap) return;
  const originalWidth = Math.ceil(target.offsetWidth || target.scrollWidth || target.getBoundingClientRect().width);
  const originalHeight = Math.ceil(target.offsetHeight || target.scrollHeight || target.getBoundingClientRect().height);
  if (!originalWidth || !originalHeight) return;
  const availableWidth = Math.max(1, Math.floor(wrap.clientWidth));
  previewCanvasWidth.value = originalWidth;
  previewCanvasHeight.value = originalHeight;
  previewScale.value = Math.min(1, availableWidth / originalWidth);
};

const isBfesCard = (card) => {
  const type = String(card?.Type || '').trim().toLowerCase();
  const skill = String(card?.Skill || '').trim().toLowerCase();
  return type === 'bfes' || skill === 'bfes_up';
};

const isFesCard = (card) => {
  const type = String(card?.Type || '').trim().toLowerCase();
  return type === 'bfes' || type === 'cfes';
};

const parseYmd = (value) => {
  const match = String(value || '').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
};

const formatDate = (value) => {
  const parsed = parseYmd(value);
  if (!parsed) return String(value || '').trim();
  return `${parsed.year}/${parsed.month}/${parsed.day}`;
};

const getMonthInfoFromDate = (value) => {
  const parsed = parseYmd(value);
  if (!parsed) return null;
  return {
    key: `${parsed.year}-${String(parsed.month).padStart(2, '0')}`,
    label: `${parsed.month}月`
  };
};

const getEventType = (event) => String(event?.event_type || event?.source_event_type || '').trim();
const getEventUnit = (event) => normalizeUnit(event?.unit || event?.source_unit);
const hasValidEventTitle = (value) => String(value || '').trim().length > 0;
const isOfficialRevealedEvent = (event) => !!event && hasValidEventTitle(event.event_title);
const getSourceEventTypeText = (event) => (
  Object.prototype.hasOwnProperty.call(event || {}, 'source_event_type')
    ? String(event?.source_event_type || '').trim()
    : String(event?.event_type || '').trim()
);
const isTestEvent = (event) => {
  const type = getSourceEventTypeText(event).toLowerCase();
  return type === '测试' || type === 'test' || type.includes('测试');
};
const isWorldLinkFinalEvent = (event) => {
  const type = getSourceEventTypeText(event).toLowerCase().replace(/\s+/g, '');
  return type.includes('终章') && (type.includes('wl') || type.includes('worldlink'));
};
const isPredictDisabledEvent = (event) => isTestEvent(event) || isWorldLinkFinalEvent(event);
const isPredictableBaseEvent = (event) => (
  Number.isFinite(Number(event?.id))
  && !isPredictDisabledEvent(event)
  && !isOfficialRevealedEvent(event)
);

const resolveUnitFromCards = (cards) => {
  const normalCards = (Array.isArray(cards) ? cards : []).filter((card) => !isFesCard(card));
  const firstOc = normalCards.find((card) => {
    const base = getBaseName(card?.Name);
    return base && !vsNameSet.value.has(base);
  });
  return normalizeUnit(firstOc?.Affiliation || normalCards[0]?.Affiliation);
};

const buildSeriesLabel = (event) => {
  const sid = String(event?.type_series_id || '').trim();
  const eventType = getEventType(event);
  if (!sid) return eventType === 'World Link' ? getWlPartLabel(event) : '';
  const banner = getBaseName(event?.banner);
  const bannerLabel = banner || '';
  if (eventType === '箱活') return `${bannerLabel}${sid}箱`;
  if (eventType === '混活') return `${bannerLabel}${sid}混`;
  if (eventType === 'World Link') return `WL${sid}${getWlPartLabel(event)}`;
  return sid;
};

const getWlPartLabel = (event) => {
  const currentId = Number(event?.id);
  if (!Number.isFinite(currentId)) return '';
  const eventType = getEventType(event);
  if (eventType !== 'World Link') return '';
  const sid = Number(String(event?.type_series_id || '').trim());
  if (!Number.isFinite(sid) || sid !== 3) return '';
  const ids = numericEvents.value
    .filter(({ event: item }) => {
      if (getEventType(item) !== 'World Link') return false;
      const itemSid = Number(String(item?.type_series_id || '').trim());
      return Number.isFinite(itemSid) && itemSid === 3;
    })
    .map(({ idNum }) => idNum);
  const index = ids.indexOf(currentId);
  return index >= 0 ? `P${index + 1}` : '';
};

const getLimitedRibbonLabel = (card) => {
  const type = String(card?.Type || '').trim().toLowerCase();
  if (['wl1', 'wl2', 'wl3', 'ue'].includes(type)) return 'WL限定';
  if (type === 'bfes' || type === 'cfes') return 'FES限定';
  if (type === 'limited') return '期间限定';
  if (type === 'collab' || type === 'collab_t') return '联动限定';
  return '';
};

const hasCardType = (cards, types) => {
  const set = new Set(types);
  return (Array.isArray(cards) ? cards : []).some((card) => set.has(String(card?.Type || '').trim().toLowerCase()));
};

const getRowLimitClass = (event, cards) => {
  const eventType = getEventType(event);
  const gachaType = String(event?.gacha_type || '').trim();
  if (eventType === 'World Link' || gachaType === 'UE限定' || hasCardType(cards, ['ue', 'wl1', 'wl2', 'wl3'])) {
    return 'is-ue-event';
  }
  if (gachaType === '普通限定' || hasCardType(cards, ['limited', 'collab_t'])) {
    return 'is-limited-event';
  }
  return '';
};

const hexToRgb = (hex) => {
  const raw = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16)
  };
};

const rgbaFromHex = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(20, 184, 166, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const mixHexWithWhite = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgb(245, 253, 252)';
  const mix = (channel) => Math.round(255 * (1 - alpha) + channel * alpha);
  return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
};

const buildMemberGradient = (cards, fallbackColor) => {
  const colors = (Array.isArray(cards) ? cards : [])
    .map((card) => charMap.value[getBaseName(card?.Name)]?.color)
    .filter((color) => !!hexToRgb(color));
  const unique = [...new Set(colors)];
  if (unique.length === 0) {
    return `linear-gradient(135deg, ${rgbaFromHex(fallbackColor, 0.7)}, rgba(255, 255, 255, 0.72) 56%, ${rgbaFromHex(fallbackColor, 0.2)})`;
  }
  if (unique.length === 1) {
    return `linear-gradient(135deg, ${rgbaFromHex(unique[0], 0.72)}, rgba(255, 255, 255, 0.7) 56%, ${rgbaFromHex(unique[0], 0.22)})`;
  }
  const step = 100 / Math.max(1, unique.length - 1);
  const stops = unique.map((color, index) => `${rgbaFromHex(color, 0.68)} ${Math.round(index * step)}%`).join(', ');
  return `linear-gradient(135deg, ${stops})`;
};

const annotateCards = (cards, bannerName) => {
  const bannerBase = getBaseName(bannerName);
  return (Array.isArray(cards) ? cards : []).map((card) => ({
    ...card,
    isBanner: !!bannerBase && getBaseName(card?.Name) === bannerBase,
    ribbonLabel: getLimitedRibbonLabel(card)
  }));
};

const numericEvents = computed(() => (Array.isArray(props.allEvents) ? props.allEvents : [])
  .filter((event) => Number.isFinite(Number(event?.id)))
  .map((event, index) => ({
    event,
    index,
    idNum: Number(event.id),
    scheduleIndex: Number.isFinite(Number(event?.predict_schedule_index))
      ? Number(event.predict_schedule_index)
      : Number(event.id)
  }))
  .sort((a, b) => a.scheduleIndex - b.scheduleIndex || a.idNum - b.idNum || a.index - b.index));

const predictableEventIds = computed(() => numericEvents.value
  .filter(({ event }) => isPredictableBaseEvent(event))
  .map(({ idNum }) => idNum)
  .sort((a, b) => a - b));

const predictPatchById = computed(() => {
  const source = selectedSource.value;
  const patches = Array.isArray(source?.predictiveEvents) ? source.predictiveEvents : [];
  const map = new Map();
  patches.forEach((patch) => {
    const key = normalizeId(patch?.id);
    if (key) map.set(key, patch);
  });
  return map;
});

const effectiveRange = computed(() => {
  const allRows = numericEvents.value;
  void allRows;
  const minPredictableId = predictableEventIds.value[0] ?? null;
  const predictedIds = [...predictPatchById.value.keys()]
    .map((key) => Number(key))
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b);
  const maxPredictedId = predictedIds[predictedIds.length - 1] ?? null;

  const parseRangeDraft = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return NaN;
    return Number(raw);
  };
  const rawStart = parseRangeDraft(rangeStartDraft.value);
  const rawEnd = parseRangeDraft(rangeEndDraft.value);
  const minAllowed = minPredictableId ?? predictedIds[0] ?? null;
  const maxAllowed = maxPredictedId ?? minAllowed;
  const unclampedStart = Number.isFinite(rawStart)
    ? rawStart
    : (predictedIds[0] ?? minAllowed);
  const unclampedEnd = Number.isFinite(rawEnd)
    ? rawEnd
    : maxAllowed;

  if (!Number.isFinite(unclampedStart) || !Number.isFinite(unclampedEnd) || !Number.isFinite(minAllowed) || !Number.isFinite(maxAllowed)) {
    return { start: null, end: null };
  }
  const start = Math.min(Math.max(unclampedStart, minAllowed), maxAllowed);
  const end = Math.min(Math.max(unclampedEnd, minAllowed), maxAllowed);
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
    minAllowed,
    maxAllowed
  };
});

const rangeStartPlaceholder = computed(() => {
  const value = effectiveRange.value.start;
  return Number.isFinite(value) ? String(value) : '起始ID';
});

const rangeEndPlaceholder = computed(() => {
  const value = effectiveRange.value.end;
  return Number.isFinite(value) ? String(value) : '截止ID';
});

const renderedRows = computed(() => {
  const range = effectiveRange.value;
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end)) return [];

  return numericEvents.value
    .filter(({ idNum }) => idNum >= range.start && idNum <= range.end)
    .map(({ event: base, index }) => {
      const idKey = normalizeId(base.id);
      const patch = predictPatchById.value.get(idKey) || null;
      if (!patch && !showUnpredictedRows.value) return null;
      const event = { ...base, ...patch };
      const cards = Array.isArray(patch?.memberCards)
        ? patch.memberCards
        : (baseCardsByEventId.value.get(idKey) || []);
      const bannerBase = getBaseName(event.banner);
      const bfesCards = annotateCards(cards.filter(isBfesCard), bannerBase);
      const normalCards = annotateCards(cards.filter((card) => !isBfesCard(card)), bannerBase);
      const eventType = getEventType(event);
      const resolvedUnit = getEventUnit(event) || resolveUnitFromCards(cards);
      const colorName = bannerBase
        || getBaseName(normalCards.find((card) => !vsNameSet.value.has(getBaseName(card?.Name)))?.Name)
        || getBaseName(normalCards[0]?.Name);
      const mainColor = charMap.value[colorName]?.color || '#14b8a6';
      const detailKind = eventType === 'World Link'
        ? 'wl'
        : (eventType === '箱活' ? 'box' : (eventType === '混活' ? 'mixed' : 'unknown'));
      const rowGradient = detailKind === 'wl'
        ? buildMemberGradient(normalCards, mainColor)
        : `linear-gradient(115deg, ${rgbaFromHex(mainColor, 0.7)}, rgba(255, 255, 255, 0.74) 42%, ${rgbaFromHex(mainColor, 0.18)}), linear-gradient(90deg, ${rgbaFromHex(mainColor, 0.34)}, rgba(255, 255, 255, 0.65))`;

      return {
        key: `${idKey || 'unknown'}-${index}`,
        id: idKey || '-',
        sortKey: Number.isFinite(Number(base.id)) ? Number(base.id) : 999999 + index,
        rowClass: getRowLimitClass(event, cards),
        startDate: formatDate(base.start_date || base.date || patch?.start_date || patch?.date),
        endDate: formatDate(base.end_date || patch?.end_date),
        eventType,
        detailKind,
        detailKindClass: `is-${detailKind}`,
        unitLabel: resolvedUnit.toUpperCase(),
        unitLogo: UNIT_LOGOS[resolvedUnit] || '',
        seriesLabel: buildSeriesLabel(event),
        detailStyle: {
          '--special-row-gradient': rowGradient,
          '--special-row-color-soft': rgbaFromHex(mainColor, 0.7),
          '--special-row-color-pale': rgbaFromHex(mainColor, 0.18),
          '--special-row-color-light': rgbaFromHex(mainColor, 0.34)
        },
        normalCards: normalCards.slice(0, 6),
        bfesCards: bfesCards.slice(0, 4)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((row, index, rows) => {
      const monthInfo = getMonthInfoFromDate(row.endDate || row.startDate);
      const prevMonthInfo = index > 0 ? getMonthInfoFromDate(rows[index - 1]?.endDate || rows[index - 1]?.startDate) : null;
      return {
        ...row,
        monthLabel: monthInfo && monthInfo.key !== prevMonthInfo?.key ? monthInfo.label : ''
      };
    });
});

const sanitizeFileName = (value) => {
  const cleaned = String(value || '').trim().replace(/[\\/:*?"<>|]/g, '_').replace(/[.\s]+$/g, '');
  return cleaned || 'pjsk-special-predict';
};

const exportPng = async () => {
  const target = canvasRef.value;
  if (!target || renderedRows.value.length === 0 || isExporting.value) return;

  isExporting.value = true;
  exportStatus.value = '正在生成 PNG...';
  const savedPreviewScale = previewScale.value;
  const clearExportStatusLater = () => {
    if (exportStatusTimer) window.clearTimeout(exportStatusTimer);
    exportStatusTimer = window.setTimeout(() => {
      exportStatus.value = '';
      exportStatusTimer = null;
    }, 10000);
  };
  try {
    previewScale.value = 1;
    await nextTick();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const exportWidth = Math.ceil(target.scrollWidth || target.getBoundingClientRect().width);
    const exportHeight = Math.ceil(target.scrollHeight || target.getBoundingClientRect().height);
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      imageTimeout: 12000,
      width: exportWidth,
      height: exportHeight,
      windowWidth: Math.max(document.documentElement.clientWidth, exportWidth),
      windowHeight: Math.max(document.documentElement.clientHeight, exportHeight)
    });
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('toBlob failed'));
      }, 'image/png');
    });
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const sourceName = sanitizeFileName(selectedSource.value?.name || 'source');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sourceName}-special-predict-${stamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    exportStatus.value = 'PNG 已导出。';
    clearExportStatusLater();
  } catch (error) {
    console.error('[special-predict] export failed', error);
    exportStatus.value = '导出失败，请稍后重试。';
    clearExportStatusLater();
  } finally {
    previewScale.value = savedPreviewScale;
    updatePreviewScale();
    isExporting.value = false;
  }
};

watch(
  () => [props.activePredictSourceId, normalizedSources.value.map((source) => source.id).join('|')],
  () => {
    const activeId = normalizeId(props.activePredictSourceId);
    const exists = normalizedSources.value.some((source) => source.id === selectedSourceId.value);
    if (!exists) {
      selectedSourceId.value = normalizedSources.value.some((source) => source.id === activeId)
        ? activeId
        : (normalizedSources.value[0]?.id || '');
    }
  },
  { immediate: true }
);

watch(
  characterColorOptions,
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

watch(
  [coverTextBlocks, selectedCoverTextId, creditText, creditManuallyEdited],
  saveCoverTextSettings,
  { deep: true }
);

watch(
  () => [
    isUnlocked.value,
    coverTextBlocks.value.map((block) => `${block.id}:${block.text}`).join('\u0001')
  ],
  () => {
    syncCoverTextElements();
    syncCreditElement();
  },
  { flush: 'post' }
);

watch(
  defaultCreditText,
  syncCreditDefault,
  { immediate: true }
);

watch(
  () => [
    isUnlocked.value,
    renderedRows.value.length,
    selectedSourceId.value,
    showUnpredictedRows.value,
    coverBgUrl.value
  ],
  () => {
    updatePreviewScale();
  },
  { flush: 'post' }
);

onMounted(() => {
  loadCoverTextSettings();
  isUnlocked.value = sessionStorage.getItem(UNLOCK_SESSION_KEY) === '1';
  if (usingDefaultKey) {
    console.warn('[special-predict] VITE_SPECIAL_PREDICT_KEY_SHA256 is not configured. Using the development soft-lock key.');
  }
  updatePreviewScale();
  if (typeof ResizeObserver !== 'undefined') {
    previewResizeObserver = new ResizeObserver(() => updatePreviewScale());
    if (canvasWrapRef.value) previewResizeObserver.observe(canvasWrapRef.value);
    if (canvasRef.value) previewResizeObserver.observe(canvasRef.value);
  }
  window.addEventListener('resize', updatePreviewScale);
});

onBeforeUnmount(() => {
  if (exportStatusTimer) {
    window.clearTimeout(exportStatusTimer);
    exportStatusTimer = null;
  }
  if (previewResizeObserver) {
    previewResizeObserver.disconnect();
    previewResizeObserver = null;
  }
  window.removeEventListener('resize', updatePreviewScale);
  clearCoverBg();
});

const SpecialCardCell = defineComponent({
  name: 'SpecialCardCell',
  props: {
    card: { type: Object, default: null },
    isBanner: { type: Boolean, default: false },
    charMap: { type: Object, default: () => ({}) },
    vsNameSet: { type: Object, default: () => new Set() }
  },
  setup(cellProps) {
    const getCardImageSrc = (card) => {
      if (!card) return '';
      const base = getBaseName(card.Name);
      const meta = cellProps.charMap[base] || {};
      const abbr = String(meta.abbr || '').trim();
      if (!abbr) return '';
      if (cellProps.vsNameSet.has(base)) {
        const unit = normalizeUnit(card.Affiliation);
        if (unit && unit !== 'vs') return `/chibi_s/${abbr.toLowerCase()}_${unit}.webp`;
      }
      return `/chibi_s/${abbr}.webp`;
    };

    const buildLayers = () => {
      const card = cellProps.card;
      const rarity = String(card.Rarity || '').trim();
      const attr = normalizeAttr(card.Attribute);
      const unit = normalizeUnit(card.Affiliation);
      const charSrc = getCardImageSrc(card);
      const children = [
        h('img', { class: 'special-card-bg', src: `/specialized/bg${rarity || 4}.png`, alt: '' })
      ];

      if (cellProps.isBanner) {
        children.push(h('span', { class: 'special-card-glow', 'aria-hidden': 'true' }));
      }
      if (charSrc) {
        children.push(h('img', { class: 'special-card-chibi', src: charSrc, alt: getBaseName(card.Name) || '角色' }));
      }
      if (rarity) {
        children.push(h('img', { class: 'special-card-star', src: `/specialized/star${rarity}.png`, alt: `${rarity}星` }));
      }
      if (attr) {
        children.push(h('img', { class: 'special-card-attr', src: `/specialized/attr-${attr.toLowerCase()}.png`, alt: attr }));
      }
      if (cellProps.vsNameSet.has(getBaseName(card.Name)) && unit && unit !== 'vs') {
        children.push(h('img', { class: 'special-card-unit', src: `/specialized/unit-${unit}.png`, alt: unit }));
      }
      if (card.ribbonLabel) {
        children.push(h('span', { class: 'special-card-ribbon' }, [
          h('span', { class: 'special-card-ribbon-text' }, card.ribbonLabel)
        ]));
      }

      return h('div', {
        class: ['special-card-cell', { 'is-banner': cellProps.isBanner }],
        title: `${getBaseName(card.Name)} ${rarity || ''}`.trim()
      }, children);
    };

    return buildLayers;
  }
});
</script>

<style scoped>
.special-predict-page {
  width: 100%;
  min-width: 0;
  min-height: 100%;
  color: #17313a;
  overflow-x: hidden;
}

.special-lock-panel {
  min-height: calc(100dvh - 110px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.special-lock-inner {
  width: min(420px, 100%);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  padding: 22px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.14);
}

.special-lock-inner h2 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}

.special-lock-inner p {
  margin: 0 0 16px;
  color: #64748b;
  font-size: 0.88rem;
}

.special-lock-form {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.special-lock-input {
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.9rem;
  outline: none;
}

.special-lock-input:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.14);
}

.special-lock-error {
  margin-top: 10px;
  color: #dc2626;
  font-size: 0.82rem;
}

.special-lock-note {
  margin-top: 8px;
  color: #64748b;
  font-size: 0.76rem;
}

.special-generator-shell {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.special-toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 7px;
  align-self: center;
  width: min(980px, 100%);
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.48)),
    linear-gradient(135deg, rgba(186, 230, 253, 0.42), rgba(251, 207, 232, 0.28));
  padding: 8px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 12px 28px rgba(80, 85, 132, 0.14);
  backdrop-filter: blur(16px) saturate(150%);
}

.special-toolbar-row {
  display: grid;
  width: 100%;
  gap: 7px;
  align-items: stretch;
}

.special-toolbar-row-main,
.special-toolbar-row-colors {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.special-toolbar-row-text {
  grid-template-columns: minmax(0, 1fr);
}

.special-toolbar-row-actions {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
}

.special-toolbar-group {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.46);
  padding: 6px 9px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.76),
    0 6px 14px rgba(80, 85, 132, 0.08);
  backdrop-filter: blur(12px) saturate(145%);
}

.special-toolbar-break {
  display: none;
}

.special-toolbar-source {
  flex: 1 1 auto;
}

.special-toolbar-cover {
  flex: 0 1 auto;
}

.special-toolbar-colors {
  flex: 1 1 auto;
  border-radius: 22px;
}

.special-toolbar-text {
  flex: 1 1 auto;
  border-radius: 22px;
}

.special-toolbar-label {
  flex: 0 0 auto;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 800;
}

.special-source-picker {
  width: 100%;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
}

.special-source-picker select {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  padding: 6px 30px 6px 10px;
  font-size: 0.82rem;
  color: #0f172a;
}

.special-source-count {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 0.78rem;
}

.special-range-field,
.special-toggle-field {
  flex: 1 1 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.special-range-field input {
  flex: 1 1 auto;
  width: 0;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  padding: 5px 8px;
  font-size: 0.78rem;
  color: #0f172a;
}

.special-toggle-field input {
  margin: 0;
}

.special-action-btn {
  flex: 0 0 auto;
  border: 1px solid rgba(13, 148, 136, 0.42);
  border-radius: 999px;
  background: linear-gradient(135deg, #14b8a6, #22c7b8);
  color: #ffffff;
  padding: 0 16px;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
  min-height: 38px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 8px 16px rgba(20, 184, 166, 0.24);
}

.special-action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.special-action-btn,
.special-secondary-btn,
.special-upload-btn,
.special-align-control button,
.special-color-swatch {
  transition: transform 0.14s ease, filter 0.14s ease, background-color 0.14s ease, box-shadow 0.14s ease;
}

.special-action-btn:not(:disabled):hover,
.special-secondary-btn:not(:disabled):hover,
.special-upload-btn:hover,
.special-align-control button:hover,
.special-color-swatch:hover {
  background: rgba(226, 232, 240, 0.86);
  color: #334155;
  filter: grayscale(0.2) brightness(0.96);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.68),
    0 4px 10px rgba(80, 85, 132, 0.12);
}

.special-action-btn:not(:disabled):active,
.special-secondary-btn:not(:disabled):active,
.special-upload-btn:active,
.special-align-control button:active,
.special-color-swatch:active {
  transform: translateY(1px) scale(0.97);
  filter: grayscale(0.28) brightness(0.92);
  box-shadow:
    inset 0 3px 8px rgba(15, 23, 42, 0.16),
    0 2px 6px rgba(80, 85, 132, 0.1);
}

.special-color-swatches {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 1 auto;
  flex-wrap: wrap;
  max-width: none;
  overflow: visible;
  padding: 2px;
}

.special-inline-color-input {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.56);
  padding: 2px;
  cursor: pointer;
}

.special-color-custom {
  background:
    conic-gradient(from 0deg, #ff4d4f, #f59e0b, #22c55e, #06b6d4, #6366f1, #f472b6, #ff4d4f);
}

.special-color-swatch {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(100, 116, 139, 0.25);
  cursor: pointer;
}

.special-color-swatch.active {
  box-shadow:
    0 0 0 2px #ffffff,
    0 0 0 4px #14b8a6;
}

.special-color-swatch.is-bg {
  background-image:
    linear-gradient(45deg, rgba(255, 255, 255, 0.72) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.72) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.72) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.72) 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
}

.special-upload-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  border: 1px solid rgba(249, 168, 212, 0.72);
  border-radius: 999px;
  background: rgba(253, 242, 248, 0.68);
  color: #be185d;
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 900;
  cursor: pointer;
}

.special-upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.special-secondary-btn {
  border: 1px solid rgba(203, 213, 225, 0.78);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #475569;
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.special-secondary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.special-text-select {
  min-width: 92px;
  max-width: 132px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: #0f172a;
  padding: 5px 26px 5px 9px;
  font-size: 0.76rem;
  font-weight: 800;
}

.special-text-color-input {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.56);
  padding: 2px;
  cursor: pointer;
}

.special-mini-field {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 800;
}

.special-mini-field input {
  width: 52px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: #0f172a;
  padding: 4px 7px;
  font-size: 0.76rem;
  font-weight: 800;
}

.special-align-control {
  display: inline-flex;
  padding: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.7);
}

.special-align-control button {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #475569;
  padding: 4px 7px;
  font-size: 0.74rem;
  font-weight: 900;
  cursor: pointer;
}

.special-align-control button.active {
  background: rgba(20, 184, 166, 0.9);
  color: #ffffff;
}

.special-follow-btn.active {
  border-color: rgba(20, 184, 166, 0.52);
  background: rgba(204, 251, 241, 0.76);
  color: #0f766e;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.74),
    0 0 0 2px rgba(20, 184, 166, 0.14);
}

.special-export-status {
  align-self: center;
  width: min(980px, 100%);
  box-sizing: border-box;
  color: #0f766e;
  background: #ecfeff;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.8rem;
}

.special-canvas-wrap {
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
  padding-bottom: 8px;
  display: flex;
  justify-content: center;
}

.special-canvas-stage {
  position: relative;
  flex: 0 0 auto;
}

.special-canvas {
  --special-card-size: 86px;
  --special-card-gap: 8px;
  --special-date-width: 118px;
  --special-row-gap: 10px;
  --special-detail-pad-x: 12px;
  --special-canvas-pad: 14px;
  --special-grid-width: calc((var(--special-card-size) * 6) + (var(--special-card-gap) * 5));
  --special-detail-width: calc(var(--special-grid-width) + (var(--special-detail-pad-x) * 2));
  --special-row-width: calc(var(--special-date-width) + var(--special-row-gap) + var(--special-detail-width));
  --special-cover-width: calc(var(--special-row-width) + 20px);
  width: var(--special-cover-width);
  min-height: 280px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border: 0;
  outline: 4px solid rgba(255, 202, 166, 0.92);
  outline-offset: -4px;
  border-radius: 10px;
  background: var(--special-canvas-bg, rgba(200, 201, 232, 0.72));
  padding: 0 0 var(--special-canvas-pad);
  box-shadow: 0 14px 36px rgba(80, 85, 132, 0.18);
  transform: scale(var(--special-preview-scale, 1));
  transform-origin: top left;
}

.special-cover-panel {
  position: relative;
  width: var(--special-cover-width);
  aspect-ratio: 2520 / 1440;
  box-sizing: border-box;
  border-radius: 6px;
  overflow: hidden;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.special-cover-panel + .special-month-bar {
  margin-top: -10px;
}

.special-cover-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06));
  pointer-events: none;
}

.special-cover-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.special-cover-text {
  position: absolute;
  z-index: 2;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 6px;
  outline: none;
  background: transparent;
  color: #ffffff;
  padding: 2px 4px;
  font-family: inherit;
  font-size: 1.75rem;
  font-weight: 900;
  line-height: 1.28;
  letter-spacing: 0;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}

.special-cover-text:focus {
  border-color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
}

.special-canvas.is-exporting .special-cover-text {
  border-color: transparent;
  background: transparent;
}

.special-month-bar {
  width: var(--special-cover-width);
  height: 36px;
  box-sizing: border-box;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--special-month-fill, #ffcaa6);
  color: #ffffff;
  font-size: 1.55rem;
  font-weight: 900;
  text-shadow: 0 1px 5px rgba(15, 23, 42, 0.16);
}

.special-event-row {
  display: grid;
  grid-template-columns: var(--special-date-width) var(--special-detail-width);
  gap: var(--special-row-gap);
  align-items: stretch;
  width: var(--special-row-width);
  box-sizing: border-box;
  border-radius: 18px;
}

.special-date-box,
.special-detail-box {
  box-sizing: border-box;
  border-radius: 16px;
  border: 1px solid rgba(23, 49, 58, 0.12);
  background: #ffffff;
  box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08);
}

.special-event-row.is-limited-event .special-date-box,
.special-event-row.is-limited-event .special-detail-box {
  border: 3px solid #ff4d4f;
}

.special-event-row.is-ue-event .special-date-box,
.special-event-row.is-ue-event .special-detail-box {
  border: 3px solid #f59e0b;
}

.special-date-box {
  min-height: 132px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  text-align: center;
  background: var(--special-row-gradient);
}

.special-date-text {
  font-size: 0.94rem;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.1;
}

.special-date-sep {
  color: #64748b;
  font-size: 0.94rem;
  font-weight: 900;
  line-height: 1;
}

.special-event-id {
  color: #0f766e;
  background: transparent;
  border-radius: 999px;
  padding: 2px 0;
  font-size: 0.76rem;
  font-weight: 800;
}

.special-credit-box {
  width: var(--special-row-width);
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.94);
  padding: 3px 8px 0;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
  text-shadow:
    0 2px 0 var(--special-month-fill, #ffcaa6),
    0 0 6px var(--special-month-fill, #ffcaa6),
    0 0 12px rgba(255, 255, 255, 0.58);
  white-space: pre-wrap;
}

.special-credit-box:focus {
  border-color: rgba(255, 255, 255, 0.58);
  background: rgba(255, 255, 255, 0.08);
}

.special-canvas.is-exporting .special-credit-box {
  border-color: transparent;
  background: transparent;
}

.special-detail-box {
  min-width: 0;
  width: var(--special-detail-width);
  padding: 10px var(--special-detail-pad-x);
  background: var(--special-row-gradient);
}

.special-detail-head {
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  border-radius: 12px;
  margin-bottom: 8px;
  background: transparent;
  overflow: hidden;
}

.special-detail-head.is-mixed {
  background: transparent;
}

.special-detail-head.is-wl {
  background: transparent;
  color: #ffffff;
  text-shadow: 0 1px 6px rgba(15, 23, 42, 0.52);
}

.special-unit-logo {
  max-width: 210px;
  max-height: 28px;
  object-fit: contain;
}

.special-se-logo {
  width: 62px;
  height: 28px;
  object-fit: contain;
}

.special-wl-text,
.special-unknown-text {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0;
}

.special-series-label {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.18);
  color: #0f172a;
  font-size: 0.74rem;
  font-weight: 900;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.4);
}

.special-detail-head.is-wl .special-series-label {
  color: #ffffff;
  text-shadow: 0 1px 5px rgba(15, 23, 42, 0.42);
}

.special-member-grid,
.special-bfes-grid {
  display: grid;
  width: var(--special-grid-width);
  grid-template-columns: repeat(6, var(--special-card-size));
  gap: var(--special-card-gap);
  justify-content: start;
}

.special-bfes-grid {
  margin-top: 8px;
}

:deep(.special-card-cell) {
  position: relative;
  width: var(--special-card-size);
  aspect-ratio: 1 / 1;
  min-width: 0;
  overflow: visible;
  border-radius: 0;
  background: transparent;
}

:deep(.special-card-glow) {
  position: absolute;
  inset: -4%;
  z-index: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle,
      transparent 57%,
      rgba(255, 255, 255, 0.34) 60%,
      rgba(255, 255, 255, 0.98) 63%,
      #ffffff 66%,
      rgba(255, 255, 255, 0.74) 70%,
      rgba(255, 255, 255, 0.18) 76%,
      transparent 83%
    ),
    radial-gradient(circle,
      transparent 47%,
      rgba(255, 255, 255, 0.18) 57%,
      rgba(255, 255, 255, 0.36) 69%,
      rgba(255, 255, 255, 0.16) 82%,
      transparent 92%
    );
  pointer-events: none;
}

:deep(.special-card-bg),
:deep(.special-card-chibi),
:deep(.special-card-star),
:deep(.special-card-attr),
:deep(.special-card-unit),
:deep(.special-card-ribbon) {
  position: absolute;
  display: block;
  pointer-events: none;
}

:deep(.special-card-bg),
:deep(.special-card-chibi),
:deep(.special-card-star),
:deep(.special-card-attr),
:deep(.special-card-unit) {
  object-fit: contain;
}

:deep(.special-card-bg),
:deep(.special-card-chibi) {
  width: 100%;
  height: 100%;
}

:deep(.special-card-bg) {
  inset: 0;
  z-index: 1;
  object-fit: contain;
}

:deep(.special-card-chibi) {
  inset: 3%;
  width: 94%;
  height: 94%;
  z-index: 3;
}

:deep(.special-card-star) {
  z-index: 6;
  inset: 0;
  width: 100%;
  height: 100%;
}

:deep(.special-card-attr) {
  z-index: 6;
  inset: 0;
  width: 100%;
  height: 100%;
}

:deep(.special-card-unit) {
  z-index: 6;
  inset: 0;
  width: 100%;
  height: 100%;
}

:deep(.special-card-ribbon) {
  z-index: 5;
  inset: 3%;
  width: 94%;
  height: 94%;
  border-radius: 50%;
  overflow: hidden;
}

:deep(.special-card-ribbon)::before {
  content: '';
  position: absolute;
  top: 20%;
  right: -28%;
  width: 100%;
  height: 12%;
  transform: rotate(43deg);
  transform-origin: center;
  background: linear-gradient(90deg, #ff94ca 0%, #ff67b0 58%, #f74399 100%);
  box-shadow: 0 1px 4px rgba(143, 21, 76, 0.22);
}

:deep(.special-card-ribbon-text) {
  position: absolute;
  top: 19%;
  right: -26%;
  width: 100%;
  transform: rotate(43deg);
  transform-origin: center;
  display: block;
  color: #ffffff;
  font-size: 7px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(143, 21, 76, 0.42);
}

.special-bfes-logo-cell {
  grid-column: span 2;
  border-radius: 10px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 2 / 1;
  min-width: 0;
  overflow: hidden;
}

.special-bfes-logo {
  max-width: 82%;
  max-height: 72%;
  object-fit: contain;
}

.special-empty {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
}

@media (max-width: 768px) {
  .special-lock-panel {
    min-height: calc(100dvh - 84px);
    padding: 14px;
  }

  .special-lock-inner {
    width: min(460px, 100%);
    padding: 18px;
  }

  .special-lock-form {
    flex-direction: column;
    gap: 10px;
  }

  .special-lock-input {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 13px;
    font-size: 16px;
  }

  .special-lock-form .special-action-btn {
    align-self: flex-end;
    width: auto;
    min-height: 38px;
    padding: 0 18px;
  }

  .special-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 5px;
    padding: 6px;
    border-radius: 18px;
  }

  .special-toolbar-row,
  .special-toolbar-row-main,
  .special-toolbar-row-colors,
  .special-toolbar-row-text {
    grid-template-columns: minmax(0, 1fr);
    gap: 5px;
  }

  .special-toolbar-row-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 5px;
  }

  .special-toolbar-group {
    width: 100%;
    box-sizing: border-box;
    align-items: center;
    flex-direction: row;
    gap: 5px;
    padding: 4px 7px;
    border-radius: 18px;
    min-height: 0;
  }

  .special-toolbar-label,
  .special-range-field,
  .special-toggle-field,
  .special-mini-field {
    font-size: 0.72rem;
  }

  .special-source-picker {
    width: 100%;
    align-items: center;
    flex-direction: row;
    gap: 5px;
  }

  .special-source-picker select {
    min-width: 0;
    font-size: 14px;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .special-range-field {
    flex: 1 1 92px;
  }

  .special-range-field input {
    flex: 1 1 auto;
    width: 100%;
    box-sizing: border-box;
    font-size: 14px;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .special-toggle-field {
    flex: 0 0 auto;
  }

  .special-action-btn {
    width: 100%;
    min-height: 34px;
  }

  .special-color-swatches {
    max-width: 100%;
    flex: 1 1 210px;
    flex-wrap: wrap;
    overflow: visible;
    gap: 3px;
    padding: 0;
  }

  .special-color-swatch {
    width: 18px;
    height: 18px;
    border-width: 1px;
  }

  .special-inline-color-input,
  .special-text-color-input {
    width: 24px;
    height: 24px;
  }

  .special-upload-btn,
  .special-secondary-btn {
    flex: 1 1 96px;
    box-sizing: border-box;
    min-height: 26px;
    padding: 4px 8px;
    font-size: 0.72rem;
  }

  .special-text-select {
    min-width: 88px;
    max-width: 112px;
    padding-top: 4px;
    padding-bottom: 4px;
    font-size: 0.72rem;
  }

  .special-mini-field input {
    width: 42px;
    padding: 3px 6px;
    font-size: 0.72rem;
  }

  .special-align-control button {
    padding: 3px 6px;
    font-size: 0.7rem;
  }

  .special-cover-text {
    padding: 16px 18px;
    font-size: 1.35rem;
  }
}
</style>
