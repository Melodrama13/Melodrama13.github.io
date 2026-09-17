export const isExplicitStyleContractUpdate = (updateSnapshots) => updateSnapshots === 'all';

export const pickStyleContractEntries = (baseline, collected) => {
  const source = baseline && typeof baseline === 'object' ? baseline : {};
  const keys = collected && typeof collected === 'object' ? Object.keys(collected) : [];
  return Object.fromEntries(keys.sort().map((key) => [key, source[key]]));
};

const MATERIAL_STYLE_FIELDS = new Set(['backgroundImage', 'boxShadow']);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const areEqual = (left, right) => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => areEqual(value, right[index]));
  }
  if (!isRecord(left) || !isRecord(right)) return false;

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => hasOwn(right, key) && areEqual(left[key], right[key]));
};

const formatValue = (value) => {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? String(value) : serialized;
};

const rejectInvariantUpdate = (path, baseline, collected) => {
  throw new Error(
    `Style-contract update rejected for invariant ${path}: `
    + `baseline=${formatValue(baseline)}, collected=${formatValue(collected)}. `
    + 'Only backgroundImage and boxShadow may change in --update-snapshots=all.'
  );
};

const mergeContractValue = (baseline, collected, path) => {
  if (!isRecord(baseline) || !isRecord(collected)) {
    if (!areEqual(baseline, collected)) rejectInvariantUpdate(path, baseline, collected);
    return baseline;
  }

  const merged = { ...baseline };
  for (const key of Object.keys(collected)) {
    const nextPath = path ? `${path}.${key}` : key;
    const collectedValue = collected[key];

    if (MATERIAL_STYLE_FIELDS.has(key)) {
      merged[key] = collectedValue;
      continue;
    }

    if (!hasOwn(baseline, key)) {
      merged[key] = collectedValue;
      continue;
    }

    const baselineValue = baseline[key];
    if (isRecord(baselineValue) && isRecord(collectedValue)) {
      merged[key] = mergeContractValue(baselineValue, collectedValue, nextPath);
    } else if (!areEqual(baselineValue, collectedValue)) {
      rejectInvariantUpdate(nextPath, baselineValue, collectedValue);
    }
  }

  return merged;
};

export const mergeStyleContract = (baseline, collected) => {
  if (!isRecord(baseline)) return collected;
  if (!isRecord(collected)) return baseline;
  return mergeContractValue(baseline, collected, '');
};
