const REPLACED_OLD_IDS = new Set([221, 224, 227]);
const COMPILATION_IDS = new Set([221, 222, 225, 226, 229, 230]);

export const isCompilationEvent = (event) => (
  String(event?.event_type || event?.source_event_type || '').trim() === '总集篇'
);

export const mapLegacyPredictionId = (oldId) => {
  const id = Number(oldId);
  if (!Number.isInteger(id)) return null;
  if (REPLACED_OLD_IDS.has(id)) return null;
  if (id < 222) return id;
  if (id < 225) return id + 1;
  if (id < 228) return id + 2;
  return id + 3;
};

const currentIdToLegacyId = (id) => {
  if (COMPILATION_IDS.has(id)) return null;
  if (id < 223) return id;
  if (id < 225) return id - 1;
  if (id < 229) return id - 2;
  return id - 3;
};

export const resolveLegacyPredictionScheduleIndex = (index, currentEvents) => {
  if (!Number.isInteger(index) || index < 0) return null;
  const oldScheduleIds = (currentEvents || [])
    .filter((event) => Number.isInteger(event?.id) && String(event?.event_type || '').trim() !== '测试')
    .map((event) => currentIdToLegacyId(event.id))
    .filter((id) => id !== null);
  oldScheduleIds.push(...REPLACED_OLD_IDS);
  oldScheduleIds.sort((a, b) => a - b);
  const oldId = oldScheduleIds[index];
  return oldId === undefined ? null : mapLegacyPredictionId(oldId);
};
