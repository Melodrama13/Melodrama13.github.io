import { mapLegacyPredictionId, resolveLegacyPredictionScheduleIndex } from '../utils/compilationEvents.js';
import { isPredictionScheduleKey, normalizePredictionScheduleKey } from './predictionScheduleKeys.js';

// Frozen once at the transition from numbered backups to permanent keys.
// These names and IDs describe the OLD format and never follow future orders.
const LEGACY_V4_FIRST_PENDING_ID = 220;
const LEGACY_V4_PENDING_KEYS = Object.freeze([
  '26Oct2', 'Compilation001', 'Compilation002', '26Nov1', '26Nov2',
  'Compilation003', 'Compilation004', '26Dec1', '26Dec2',
  'Compilation005', 'Compilation006', '27Jan1', '27Jan2', '27Jan3',
  '27Feb1', '27Feb2', '27Feb3', '27Mar1', '27Mar2', '27Mar3',
  '27Apr1', '27Apr2', '27Apr3', '27May1', '27May2', '27May3',
  '27Jun1', '27Jun2', '27Jun3', '27Jul1', '27Jul2', '27Jul3',
  '27Aug1', '27Aug2', '27Aug3', '27Sep1', '27Sep2', '27Sep3', '27Oct1'
]);
const LEGACY_V4_EVENTS = Object.freeze(Array.from({ length: 259 }, (_, id) => id)
  .filter(id => id !== 166 && id !== 186)
  .map(id => Object.freeze({ id })));

/** null means old metadata; an empty string means an invalid explicit key. */
export function getExplicitPredictionKey(patch) {
  const fields = ['key', 'predict_schedule_key'].filter(field => Object.hasOwn(patch || {}, field));
  if (!fields.length) return null;
  if (fields.some(field => !isPredictionScheduleKey(patch[field]))) return '';
  const keys = fields.map(field => normalizePredictionScheduleKey(patch[field]));
  return keys.every(key => key === keys[0]) ? String(patch[fields[0]]).trim() : '';
}

/** Convert a pre-key backup once; keyed records never fall back to old IDs. */
export function resolveImportedPredictionKey(patch) {
  const explicitKey = getExplicitPredictionKey(patch);
  if (explicitKey !== null) return explicitKey;
  const version = Number(patch?.predict_schema_version || 0);
  if (version >= 5) return '';

  const rawIndex = patch?.predict_schedule_index;
  const index = rawIndex === null || rawIndex === '' || rawIndex === undefined ? null : Number(rawIndex);
  let id;
  if (index !== null) {
    if (!Number.isInteger(index) || index < 0) return '';
    id = version < 4
      ? resolveLegacyPredictionScheduleIndex(index, LEGACY_V4_EVENTS)
      : LEGACY_V4_EVENTS[index]?.id;
  } else {
    const rawId = patch?.id;
    if (rawId === null || rawId === '' || rawId === undefined || !Number.isInteger(Number(rawId))) return '';
    const savedShiftCount = Number(patch?.predict_shift_count || 0);
    if (!Number.isInteger(savedShiftCount) || savedShiftCount < 0) return '';
    id = version < 4 ? mapLegacyPredictionId(Number(rawId) - savedShiftCount) : Number(rawId);
  }
  return Number.isInteger(id) ? LEGACY_V4_PENDING_KEYS[id - LEGACY_V4_FIRST_PENDING_ID] || '' : '';
}
