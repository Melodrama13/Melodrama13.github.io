/**
 * Copy descendant form-control state from a source tree to its capture clone.
 * Controls are paired by DOM order up to the shorter list. Source state is read
 * without mutation; checked/selected/value attributes retain XML export state.
 * Non-HTMLElement roots are ignored.
 * @param {unknown} sourceRoot
 * @param {unknown} cloneRoot
 * @returns {void}
 */
export const syncCaptureCloneFormControls = (sourceRoot, cloneRoot) => {
  if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
  const sourceInputs = Array.from(sourceRoot.querySelectorAll('input, select, textarea'));
  const cloneInputs = Array.from(cloneRoot.querySelectorAll('input, select, textarea'));
  const pairCount = Math.min(sourceInputs.length, cloneInputs.length);
  for (let idx = 0; idx < pairCount; idx += 1) {
    const source = sourceInputs[idx];
    const clone = cloneInputs[idx];
    if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
      clone.checked = source.checked;
      clone.indeterminate = source.indeterminate;
      clone.value = source.value;
      if (source.checked) {
        clone.setAttribute('checked', 'checked');
      } else {
        clone.removeAttribute('checked');
      }
      if (source.value !== undefined && source.value !== null) {
        clone.setAttribute('value', String(source.value));
      }
      continue;
    }
    if (source instanceof HTMLSelectElement && clone instanceof HTMLSelectElement) {
      clone.selectedIndex = source.selectedIndex;
      clone.value = source.value;
      Array.from(clone.options).forEach((opt, optIdx) => {
        if (!(opt instanceof HTMLOptionElement)) return;
        const selected = optIdx === source.selectedIndex;
        opt.selected = selected;
        if (selected) {
          opt.setAttribute('selected', 'selected');
        } else {
          opt.removeAttribute('selected');
        }
      });
      continue;
    }
    if (source instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) {
      clone.value = source.value;
    }
  }
};

/**
 * Freeze nonempty computed CSS variables on one capture element, then return a
 * function restoring its previous inline values. Retains existing restoration
 * and priority semantics; non-HTMLElement inputs produce an empty restore.
 * @param {unknown} targetEl
 * @returns {() => void}
 */
export const freezeCaptureCssVariables = (targetEl) => {
  if (!(targetEl instanceof HTMLElement)) {
    return () => {};
  }
  const prevValues = new Map();
  const computed = window.getComputedStyle(targetEl);
  for (let idx = 0; idx < computed.length; idx += 1) {
    const prop = computed[idx];
    if (!String(prop || '').startsWith('--')) continue;
    const value = String(computed.getPropertyValue(prop) || '').trim();
    if (!value) continue;
    prevValues.set(prop, targetEl.style.getPropertyValue(prop));
    targetEl.style.setProperty(prop, value);
  }
  return () => {
    prevValues.forEach((prev, prop) => {
      if (prev) {
        targetEl.style.setProperty(prop, prev);
      } else {
        targetEl.style.removeProperty(prop);
      }
    });
  };
};

/**
 * Hide descendant images that are still loading or have no decoded width.
 * Marks each affected image with data-failed="1" and returns the count, including
 * already-hidden failures. The root itself is excluded; invalid roots return 0.
 * @param {unknown} rootEl
 * @returns {number}
 */
export const hideUnreadyCaptureImages = (rootEl) => {
  if (!(rootEl instanceof HTMLElement)) return 0;
  let hidden = 0;
  rootEl.querySelectorAll('img').forEach((imgEl) => {
    if (!(imgEl instanceof HTMLImageElement)) return;
    if (imgEl.complete && imgEl.naturalWidth > 0) return;
    imgEl.style.display = 'none';
    imgEl.dataset.failed = '1';
    hidden += 1;
  });
  return hidden;
};
