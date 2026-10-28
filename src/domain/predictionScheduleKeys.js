/** Developer-maintained numeric-event order, including historical positions. */
const KEY_PATTERN = /^(?:\d{2}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:[1-9]\d*|Test(?:[2-9]|[1-9]\d+)?|Final(?:[2-9]|[1-9]\d+)?|Extra[1-9]\d*|Release)|Compilation\d{3,})$/i;
const WORLD_LINK_KEY_PATTERN = /^(\d{2})WL([1-9]\d*)(LN|MMJ|VBS|WS|NC|VS|P[1-9]\d*|Final)$/i;
const parseWorldLinkKey = value => {
  const match = String(value ?? '').trim().match(WORLD_LINK_KEY_PATTERN);
  if (!match || !Number.isSafeInteger(Number(match[2]))) return null;
  const subject = match[3].toUpperCase();
  if (subject.startsWith('P') && !Number.isSafeInteger(Number(subject.slice(1)))) return null;
  return { series: Number(match[2]), subject };
};
export const normalizePredictionScheduleKey = value => String(value ?? '').trim().toLowerCase();
export const isPredictionScheduleKey = value => typeof value === 'string' && (KEY_PATTERN.test(value.trim()) || parseWorldLinkKey(value) !== null);
const hasNumericId = event => /^\d+$/.test(String(event?.id ?? ''));

/** Array position is the current numeric ID; dates never determine identity. */
export function getPredictionScheduleOrderEntries(order) {
  if (!order || order.version !== 2 || !Array.isArray(order.keys) || order.keys.length === 0) throw new Error('缺少有效的开发者预测顺序表。');
  const used = new Set();
  return order.keys.map((key, eventId) => {
    const normalized = normalizePredictionScheduleKey(key);
    if (!isPredictionScheduleKey(key) || used.has(normalized)) throw new Error('预测顺序表标识无效或重复：' + key);
    used.add(normalized);
    return { key: key.trim(), eventId };
  });
}

const eventKind = event => {
  if (hasNumericId(event) && Number(event.id) === 0) return 'release';
  const type = String(event?.event_type || '').trim();
  if (/测试|test/i.test(type)) return 'test';
  if (/终章/.test(type) && /World\s*Link|WL/i.test(type)) return 'final';
  if (type === 'World Link') return 'worldLink';
  return type === '总集篇' ? 'compilation' : 'normal';
};
const assertOrderEntryKind = (entry, event) => {
  const key = normalizePredictionScheduleKey(entry.key);
  const worldLink = parseWorldLinkKey(entry.key);
  const expected = worldLink ? (worldLink.subject === 'FINAL' ? 'final' : 'worldLink')
    : key.startsWith('compilation') ? 'compilation' : /test\d*$/.test(key) ? 'test' : /final\d*$/.test(key) ? 'final' : /release$/.test(key) ? 'release' : 'normal';
  const kind = eventKind(event);
  if (kind !== expected || (kind === 'final' && !worldLink)) throw new Error('顺序表 ' + entry.key + ' 与活动 ' + entry.eventId + ' 的特殊类型不一致，请更新顺序表和活动数据。');
  if (!worldLink) return;
  const isFinal = worldLink.subject === 'FINAL';
  const sourceSeries = event.type_series_id;
  if ((!isFinal || sourceSeries !== null && sourceSeries !== '' && sourceSeries !== undefined)
    && Number(sourceSeries) !== worldLink.series) throw new Error('顺序表 ' + entry.key + ' 与活动 ' + entry.eventId + ' 的 WL 轮次不一致。');
  const unit = String(event.unit || '').trim().toUpperCase();
  if (isFinal || worldLink.subject.startsWith('P')) {
    if (unit) throw new Error('顺序表 ' + entry.key + ' 的终章或跨团篇章不应绑定单个团体。');
  } else if (unit !== worldLink.subject) throw new Error('顺序表 ' + entry.key + ' 与活动 ' + entry.eventId + ' 的 WL 团体不一致。');
};

/** Validate the full resource snapshot before any stored prediction is cleaned. */
export function validatePredictionScheduleOrderEvents(events, order) {
  const entries = getPredictionScheduleOrderEntries(order);
  if (!Array.isArray(events)) throw new Error('活动资源格式无效，已保留本地预测。');
  const byId = new Map();
  for (const event of events.filter(hasNumericId)) {
    const id = Number(event.id);
    if (!entries[id]) throw new Error('顺序表未包含数字活动 ' + id + '，请同步活动数据或补齐位置。');
    if (byId.has(id)) throw new Error('活动资源包含重复数字活动 ' + id + '，请同步活动数据。');
    byId.set(id, event);
  }
  for (const entry of entries) {
    const event = byId.get(entry.eventId);
    if (!event) throw new Error('预测顺序表 ' + entry.key + ' 对应活动 ' + entry.eventId + ' 缺少，请同步活动数据。');
    assertOrderEntryKind(entry, event);
  }
  return entries;
}
