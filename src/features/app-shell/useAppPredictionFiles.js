import { ref } from "vue";
import { getExplicitPredictionKey } from "../../domain/legacyPredictionMigration.js";
import { normalizeCollaborationEventId } from "../../domain/collaborationEvents.js";

/** Owns application prediction files with per-instance state and explicit peer interfaces. */
export function useAppPredictionFiles(ports = {}) {
const predictImportInputRef = ref(null);

const isImportDragOver = ref(false);

const sanitizeExportFileName = (name) => {
  const raw = String(name || '').trim();
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim();
  return cleaned || 'pjsk_predict_backup';
};

const exportPredicts = () => {
  try {
    const payload = ports.predictionSchedule.buildPredictExportPayload(ports.predictionSources.predictiveEvents.value);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const userName = sanitizeExportFileName(ports.predictionSources.normalizeUserName(ports.predictionSources.predictUserName.value));
    const finalBaseName = sanitizeExportFileName(`pjsk-${userName}-${y}${m}${d}`);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${finalBaseName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出预测失败', error);
    alert('导出失败，请稍后重试。');
  }
};

const triggerImportPredicts = () => {
  if (!predictImportInputRef.value) return;
  predictImportInputRef.value.value = '';
  predictImportInputRef.value.click();
};

const parseImportedPredictList = (rawText) => {
  const parsed = JSON.parse(rawText);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.predictiveEvents)) {
    return parsed.predictiveEvents.map(row => row && typeof row === 'object' && Number(parsed.version) >= 5
      ? { ...row, predict_schema_version: Math.max(Number(row.predict_schema_version) || 0, Number(parsed.version)) }
      : row);
  }
  return null;
};

const parseOwnerFromImportFileName = (fileName) => {
  const base = String(fileName || '').trim().replace(/\.[^.]+$/, '');
  const match = base.match(/^pjsk-(.+)-(\d{8})$/i);
  if (!match) return null;
  return ports.predictionSources.normalizeUserName(match[1]);
};

const validateImportedPredictList = (list) => {
  if (!Array.isArray(list)) {
    return { ok: false, message: '文件格式错误：顶层必须是数组，或包含 predictiveEvents 数组。' };
  }

  for (let i = 0; i < list.length; i += 1) {
    const row = list[i];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, message: `第 ${i + 1} 条记录不是对象。` };
    }
    const idKey = ports.predictionSchedule.getEventKey(row.id);
    const collaborationId = normalizeCollaborationEventId(idKey);
    const explicitKey = getExplicitPredictionKey(row);
    const hasScheduleKey = Boolean(explicitKey);
    if (explicitKey === '') {
      return { ok: false, message: `第 ${i + 1} 条记录的预测排期标识无效。` };
    }
    if (collaborationId && explicitKey !== null) {
      return { ok: false, message: `第 ${i + 1} 条联动记录不能同时使用数字活动的永久标识。` };
    }
    if (Number(row.predict_schema_version) >= 5 && !hasScheduleKey && !collaborationId) {
      return { ok: false, message: `第 ${i + 1} 条记录缺少预测排期标识，无法安全匹配活动。` };
    }
    if (!hasScheduleKey && !Number.isFinite(Number(row.id)) && !collaborationId) {
      return { ok: false, message: `第 ${i + 1} 条记录缺少有效 id。` };
    }
    if (row.memberCards != null && !Array.isArray(row.memberCards)) {
      return { ok: false, message: `第 ${i + 1} 条记录的 memberCards 不是数组。` };
    }
  }

  return { ok: true };
};

const applyImportedPredicts = (importedRawList, fileName = '') => {
  const normalizedImported = (importedRawList || []).map((item) => ({
    ...(item || {}),
    id: normalizeCollaborationEventId(item?.id) || Number(item?.id)
  })).filter((item) => Boolean(getExplicitPredictionKey(item)) || Number.isFinite(item.id) || normalizeCollaborationEventId(item.id));

  const canonical = ports.predictionSchedule.sanitizeCanonicalPredictiveEvents(normalizedImported);
  const cleaned = Math.max(0, normalizedImported.length - canonical.length);
  if (canonical.length === 0) {
    alert('导入结果没有有效预测（可能已被自动清理为过期/冲突，或原文件本就为空），不会创建数据源。');
    return;
  }

  const parsedOwner = parseOwnerFromImportFileName(fileName);
  const owner = ports.predictionSources.normalizeUserName(parsedOwner || ports.predictionSources.predictUserName.value);
  const source = ports.predictionSources.createPredictSource({
    kind: 'import',
    ownerName: owner,
    predictiveList: canonical,
    switchTo: true
  });
  if (!source) return;
  ports.predictionSources.setCleanedPatchNoticeCount(cleaned, 4200);
  alert(`导入完成：已创建数据源「${source.name}」，有效预测 ${canonical.length} 条，清理 ${cleaned} 条。`);
};

const importPredictsFromFile = async (file) => {
  const text = await file.text();
  const importedRawList = parseImportedPredictList(text);
  if (!importedRawList) {
    alert('导入失败：文件格式不正确。');
    return;
  }

  const validation = validateImportedPredictList(importedRawList);
  if (!validation.ok) {
    alert(`导入失败：${validation.message}`);
    return;
  }

  const ok = confirm('确认导入吗？将基于文件创建一个新的预测数据源，不会覆盖现有数据源。');
  if (!ok) return;

  applyImportedPredicts(importedRawList, file?.name || '');
};

const handleImportPredictsFile = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  try {
    await importPredictsFromFile(file);
  } catch (error) {
    console.error('导入预测失败', error);
    alert('导入失败：请确认 JSON 文件内容有效。');
  }
};

const onImportDragEnter = () => {
  isImportDragOver.value = true;
};

const onImportDragOver = () => {
  isImportDragOver.value = true;
};

const onImportDragLeave = (event) => {
  const zone = event.currentTarget;
  const nextTarget = event.relatedTarget;
  if (zone && nextTarget && zone.contains(nextTarget)) return;
  isImportDragOver.value = false;
};

const onImportDrop = async (event) => {
  isImportDragOver.value = false;
  const file = event?.dataTransfer?.files?.[0];
  if (!file) return;
  try {
    await importPredictsFromFile(file);
  } catch (error) {
    console.error('拖拽导入失败', error);
    alert('导入失败：请确认 JSON 文件内容有效。');
  }
};

return {
predictImportInputRef,
isImportDragOver,
sanitizeExportFileName,
exportPredicts,
triggerImportPredicts,
parseImportedPredictList,
parseOwnerFromImportFileName,
validateImportedPredictList,
applyImportedPredicts,
importPredictsFromFile,
handleImportPredictsFile,
onImportDragEnter,
onImportDragOver,
onImportDragLeave,
onImportDrop
};
}
