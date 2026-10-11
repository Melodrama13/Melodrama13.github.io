

/** Capture Range owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: Navigation.
 */
export function useHistoryCaptureRange(ports) {
const sanitizeExportBaseName = (name) => {
  const raw = String(name || '').trim();
  const cleaned = raw.replace(/[\\/:*?"<>|]/g, '_').replace(/[.\s]+$/g, '').trim();
  return cleaned || 'pjsk-predict-snapshot';
};

const parseEventIdFromDomId = (domId) => {
  const raw = String(domId || '').trim();
  if (!raw.startsWith('event-')) return '';
  return raw.slice(6);
};

const normalizeRangeEventId = (value) => {
  const n = Number(String(value || '').trim());
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.trunc(n));
};

const getExportRowsInRange = (includeBirthdayRows = true, options = {}) => {
  const listEl = ports.navigation.listRef.value;
  if (!listEl) return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '历史列表尚未渲染完成。' };

  const rows = Array.from(listEl.querySelectorAll(':scope > .event-item, :scope > .birthday-row, :scope > .preview-row'));
  if (rows.length === 0) return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '当前历史列表为空。' };

  const predicted = rows.filter((node) => node.classList.contains('event-item') && node.dataset.predictState === 'predicted');
  if (predicted.length === 0) return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '当前数据源没有可导出的预测活动。' };

  const defaultFirstPred = predicted[0];
  const defaultLastPred = predicted[predicted.length - 1];

  let firstPred = defaultFirstPred;
  let lastPred = defaultLastPred;

  const requestedStart = normalizeRangeEventId(options?.rangeStartId);
  const requestedEnd = normalizeRangeEventId(options?.rangeEndId);

  if (requestedStart || requestedEnd) {
    if (!requestedStart || !requestedEnd) {
      return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '自选范围需要同时填写起始和结束活动ID。' };
    }

    const startNum = Number(requestedStart);
    const endNum = Number(requestedEnd);
    const normalizedFrom = String(Math.min(startNum, endNum));
    const normalizedTo = String(Math.max(startNum, endNum));

    const findEventNodeById = (eventId) => rows.find((node) => node.classList.contains('event-item') && parseEventIdFromDomId(node.id) === eventId);

    const startNode = findEventNodeById(normalizedFrom);
    const endNode = findEventNodeById(normalizedTo);

    if (!startNode || !endNode) {
      return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '自选范围中的活动ID不在当前列表中，请检查筛选条件或ID。' };
    }

    firstPred = startNode;
    lastPred = endNode;
  }

  const firstIndex = rows.indexOf(firstPred);
  const lastIndex = rows.indexOf(lastPred);
  if (firstIndex < 0 || lastIndex < 0 || lastIndex < firstIndex) {
    return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '预测区间定位失败，请重试。' };
  }

  const rowsAllInRange = rows.slice(firstIndex, lastIndex + 1);

  const exportRows = rowsAllInRange.filter((node) => {
    if (node.classList.contains('preview-row')) return false;
    if (!includeBirthdayRows && node.classList.contains('birthday-row')) return false;
    return true;
  });

  if (exportRows.length === 0) {
    return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '导出区间没有可导出的行。' };
  }

  return {
    rows: exportRows,
    rowsAllInRange,
    firstEventId: parseEventIdFromDomId(firstPred.id),
    lastEventId: parseEventIdFromDomId(lastPred.id),
    error: ''
  };
};

const getPredictedExportRangeInfo = (includeBirthdayRows = true) => {
  const { firstEventId, lastEventId, error } = getExportRowsInRange(includeBirthdayRows);
  if (error) return { ok: false, firstEventId: '', lastEventId: '', message: error };
  return { ok: true, firstEventId, lastEventId, message: '' };
};


return {
  getPredictedExportRangeInfo,
  parseEventIdFromDomId,
  getExportRowsInRange,
  sanitizeExportBaseName,
};
}
