/**
 * Copy nonempty custom properties from a CSS declaration to a capture element.
 * Trims values, leaves ordinary properties and the source unchanged, and retains
 * existing priority behavior. Invalid browser DOM inputs are ignored.
 * @param {unknown} sourceStyle
 * @param {unknown} targetEl
 * @returns {void}
 */
export const copyCaptureCssVariables = (sourceStyle, targetEl) => {
  if (!(sourceStyle instanceof CSSStyleDeclaration) || !(targetEl instanceof HTMLElement)) return;
  for (let i = 0; i < sourceStyle.length; i += 1) {
    const prop = sourceStyle[i];
    if (!String(prop || '').startsWith('--')) continue;
    const value = String(sourceStyle.getPropertyValue(prop) || '').trim();
    if (!value) continue;
    targetEl.style.setProperty(prop, value);
  }
};

/**
 * Copy computed CSS variables from outer ancestors through the source element.
 * The optional stop element is included when encountered; inner values win.
 * Invalid roots are ignored. This does not copy background or layout rules.
 * @param {unknown} sourceEl
 * @param {unknown} targetEl
 * @param {unknown} [stopEl=null]
 * @returns {void}
 */
export const copyCaptureCssVariablesFromAncestors = (sourceEl, targetEl, stopEl = null) => {
  if (!(sourceEl instanceof HTMLElement) || !(targetEl instanceof HTMLElement)) return;
  const chain = [];
  let cursor = sourceEl;
  while (cursor instanceof HTMLElement) {
    chain.push(cursor);
    if (stopEl instanceof HTMLElement && cursor === stopEl) break;
    cursor = cursor.parentElement;
  }
  for (let idx = chain.length - 1; idx >= 0; idx -= 1) {
    copyCaptureCssVariables(window.getComputedStyle(chain[idx]), targetEl);
  }
};

/** Retain the feature's style boundary when exporting a nested element by itself. */
export const copyCaptureFeatureBoundary = (sourceEl, cloneEl) => {
  if (!(sourceEl instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) return;
  const owner = sourceEl.closest('[data-feature-page]');
  const page = owner?.getAttribute('data-feature-page');
  if (page) cloneEl.setAttribute('data-feature-page', page);
};
