const getHorizontalChrome = (element) => {
  const style = window.getComputedStyle(element);
  return ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
    .reduce((total, key) => total + (Number.parseFloat(style[key]) || 0), 0);
};

/** Expands year exports through every enclosing border while retaining the source card sizes. */
export const syncCardYearCaptureLayout = (sourceRoot, cloneRoot) => {
  if (!sourceRoot.matches('.year-stats-panel, .year-stats-card')) return false;
  const sourceCards = sourceRoot.matches('.year-stats-card') ? [sourceRoot] : [...sourceRoot.querySelectorAll('.year-stats-card')];
  const cloneCards = cloneRoot.matches('.year-stats-card') ? [cloneRoot] : [...cloneRoot.querySelectorAll('.year-stats-card')];
  let rootWidth = sourceRoot.getBoundingClientRect().width;
  let hasCardTables = false;

  sourceCards.forEach((sourceCard, index) => {
    const sourceWrap = sourceCard.querySelector('.year-stats-wrap');
    const sourceTable = sourceWrap?.querySelector('.year-stats-table');
    const cloneCard = cloneCards[index];
    const cloneWrap = cloneCard?.querySelector('.year-stats-wrap');
    const cloneTable = cloneWrap?.querySelector('.year-stats-table');
    if (!sourceTable || !cloneTable) return;
    hasCardTables = true;

    const tableWidth = Math.ceil(sourceTable.getBoundingClientRect().width);
    const wrapWidth = tableWidth + getHorizontalChrome(sourceWrap);
    const cardWidth = wrapWidth + getHorizontalChrome(sourceCard);
    cloneTable.style.width = `${tableWidth}px`;
    cloneTable.style.minWidth = `${tableWidth}px`;
    cloneTable.style.maxWidth = 'none';

    [[cloneWrap, wrapWidth], [cloneCard, cardWidth]].forEach(([element, width]) => {
      element.style.boxSizing = 'border-box';
      element.style.width = `${width}px`;
      element.style.minWidth = `${width}px`;
      element.style.maxWidth = 'none';
      element.style.height = 'auto';
      element.style.minHeight = '0';
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';
    });

    let ancestor = sourceCard;
    let enclosingWidth = cardWidth;
    while (ancestor !== sourceRoot && ancestor.parentElement) {
      ancestor = ancestor.parentElement;
      enclosingWidth += getHorizontalChrome(ancestor);
    }
    rootWidth = Math.max(rootWidth, enclosingWidth);
  });

  if (!hasCardTables) return false;
  cloneRoot.style.boxSizing = 'border-box';
  cloneRoot.style.width = `${Math.ceil(rootWidth)}px`;
  cloneRoot.style.minWidth = `${Math.ceil(rootWidth)}px`;
  cloneRoot.style.maxWidth = 'none';
  cloneRoot.style.height = 'auto';
  cloneRoot.style.minHeight = '0';
  return true;
};
