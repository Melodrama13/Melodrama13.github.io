/** Numeric zero is an event ID; only a missing pending request uses the prop. */
export function resolveInitialHistoryTargetId(pendingTarget, propTarget) {
  return pendingTarget === null || pendingTarget === undefined || String(pendingTarget).trim() === ''
    ? propTarget
    : pendingTarget;
}

/** Bootstrap only the viewport; the first measured pass promotes its exact 900px buffer. */
export function getInitialHeavyRowBudget(viewportHeight) {
  const height = Number(viewportHeight);
  return Math.max(6, Math.ceil((Number.isFinite(height) && height > 0 ? height : 900) / 96) + 2);
}

/** Keep the initial budget near an explicit destination; missing targets retain chronological entry. */
export function selectInitialHeavyEventKeys(rows, { count, targetId = null } = {}) {
  const budget = Math.max(0, Math.floor(Number(count) || 0));
  const normalizedTarget = targetId === null || targetId === undefined ? '' : String(targetId).trim();
  const targetIndex = normalizedTarget ? rows.findIndex(row => String(row.event?.id ?? '').trim() === normalizedTarget) : -1;
  const start = targetIndex < 0 ? 0 : Math.max(0, Math.min(rows.length - budget, targetIndex - Math.floor(budget / 2)));
  return new Set(rows.slice(start, start + budget).map(row => row.key));
}
