import { copyCaptureCssVariables, copyCaptureCssVariablesFromAncestors, copyCaptureFeatureBoundary } from '../../services/capture/captureStyleContext.js';
import { syncCaptureCloneFormControls } from '../../services/capture/captureElementState.js';
import { syncCardYearCaptureLayout } from './cardYearCaptureLayout.js';

/** Owns card capture clone behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardCaptureClone(inputs) {
  const syncCloneImagesWithSource = (sourceRoot, cloneRoot) => {
    if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
    const sourceImages = Array.from(sourceRoot.querySelectorAll('img'));
    const cloneImages = Array.from(cloneRoot.querySelectorAll('img'));
    const pairCount = Math.min(sourceImages.length, cloneImages.length);

    for (let idx = 0; idx < pairCount; idx += 1) {
      const sourceImg = sourceImages[idx];
      const cloneImg = cloneImages[idx];
      const sourceUrl = String(sourceImg?.currentSrc || sourceImg?.getAttribute('src') || sourceImg?.src || '').trim();

      cloneImg.setAttribute('loading', 'eager');
      cloneImg.setAttribute('decoding', 'sync');
      if ('fetchPriority' in cloneImg) {
        cloneImg.fetchPriority = 'high';
      }

      if (sourceUrl) {
        cloneImg.setAttribute('src', sourceUrl);
      }
      if (sourceImg?.dataset?.loaded === '1') {
        cloneImg.dataset.loaded = '1';
      }
      if (sourceImg?.dataset?.failed === '1') {
        cloneImg.dataset.failed = '1';
        cloneImg.style.display = 'none';
      }
    }

    for (let idx = pairCount; idx < cloneImages.length; idx += 1) {
      const cloneImg = cloneImages[idx];
      cloneImg.setAttribute('loading', 'eager');
      cloneImg.setAttribute('decoding', 'sync');
      if ('fetchPriority' in cloneImg) {
        cloneImg.fetchPriority = 'high';
      }
    }
  };

  const getTableColumnWidths = (tableEl) => {
    if (!(tableEl instanceof HTMLTableElement)) return [];
    const headRow = tableEl.querySelector('thead tr');
    const bodyRow = tableEl.querySelector('tbody tr');
    const probeRow = headRow || bodyRow;
    if (!(probeRow instanceof HTMLTableRowElement)) return [];
    const cells = Array.from(probeRow.children).filter((cell) => cell instanceof HTMLTableCellElement);
    return cells.map((cell) => Math.max(1, Math.ceil(cell.getBoundingClientRect().width)));
  };

  const applyTableColumnWidths = (tableEl, widths) => {
    if (!(tableEl instanceof HTMLTableElement) || !Array.isArray(widths) || widths.length === 0) return;
    let colgroup = tableEl.querySelector('colgroup.export-sync-colgroup');
    if (!(colgroup instanceof HTMLTableColElement) && !(colgroup instanceof HTMLElement)) {
      colgroup = document.createElement('colgroup');
      colgroup.className = 'export-sync-colgroup';
      tableEl.insertBefore(colgroup, tableEl.firstChild);
    }
    colgroup.innerHTML = '';
    widths.forEach((widthPx) => {
      const col = document.createElement('col');
      col.style.width = `${widthPx}px`;
      col.style.minWidth = `${widthPx}px`;
      colgroup.appendChild(col);
    });

    const totalWidth = widths.reduce((sum, value) => sum + value, 0);
    tableEl.style.tableLayout = 'fixed';
    tableEl.style.width = `${Math.max(1, Math.ceil(totalWidth))}px`;
    tableEl.style.minWidth = `${Math.max(1, Math.ceil(totalWidth))}px`;
    tableEl.style.maxWidth = 'none';
  };

  const parseCssPx = (value) => {
    const parsed = Number.parseFloat(String(value || '0'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getHorizontalBoxChrome = (style) => (
    parseCssPx(style?.paddingLeft)
    + parseCssPx(style?.paddingRight)
    + parseCssPx(style?.borderLeftWidth)
    + parseCssPx(style?.borderRightWidth)
  );

  const getTightFlexContentWidth = (el) => {
    if (!(el instanceof HTMLElement)) return 0;
    const style = window.getComputedStyle(el);
    const visibleChildren = Array.from(el.children).filter((child) => {
      if (!(child instanceof HTMLElement)) return false;
      const childStyle = window.getComputedStyle(child);
      return childStyle.display !== 'none' && childStyle.visibility !== 'hidden';
    });
    const gap = parseCssPx(style.columnGap || style.gap);
    const childrenWidth = visibleChildren.reduce((sum, child) => (
      sum + Math.max(child.scrollWidth, child.getBoundingClientRect().width)
    ), 0);
    const gapsWidth = Math.max(0, visibleChildren.length - 1) * gap;
    return childrenWidth + gapsWidth + getHorizontalBoxChrome(style);
  };

  const syncRecordBlockLayoutForExport = (sourceBlock, cloneBlock) => {
    if (!(sourceBlock instanceof HTMLElement) || !(cloneBlock instanceof HTMLElement)) return 0;
    let expandedWidth = Math.max(sourceBlock.clientWidth, sourceBlock.scrollWidth);
    const isSpecialLimitedBlock = cloneBlock.classList.contains('special-limited-record-block')
      || cloneBlock.querySelector('.special-limited-matrix');
    const sourceTables = sourceBlock.querySelectorAll('table');
    const cloneTables = cloneBlock.querySelectorAll('table');

    cloneTables.forEach((cloneTable, idx) => {
      const sourceTable = sourceTables[idx];
      if (!(cloneTable instanceof HTMLTableElement) || !(sourceTable instanceof HTMLTableElement)) return;
      if (sourceTable.classList.contains('duo-unit-table') || cloneTable.classList.contains('duo-unit-table')) {
        cloneTable.style.width = '100%';
        cloneTable.style.minWidth = '0';
        cloneTable.style.maxWidth = '100%';
        cloneTable.style.tableLayout = 'fixed';
        return;
      }
      if (sourceTable.classList.contains('duo-last-table') || cloneTable.classList.contains('duo-last-table')) {
        cloneTable.style.width = '100%';
        cloneTable.style.minWidth = '0';
        cloneTable.style.maxWidth = '100%';
        cloneTable.style.tableLayout = 'fixed';
        return;
      }
      const widths = getTableColumnWidths(sourceTable);
      if (widths.length > 0) {
        applyTableColumnWidths(cloneTable, widths);
      } else {
        const tableWidth = Math.max(sourceTable.clientWidth, sourceTable.scrollWidth);
        cloneTable.style.width = `${tableWidth}px`;
        cloneTable.style.minWidth = `${tableWidth}px`;
        cloneTable.style.maxWidth = 'none';
      }
      const shouldExpandForTable = !sourceTable.classList.contains('duo-unit-table');
      if (shouldExpandForTable) {
        expandedWidth = Math.max(expandedWidth, sourceTable.scrollWidth + 20);
      }
    });

    const sourceBlockHeight = Math.max(sourceBlock.clientHeight, sourceBlock.scrollHeight);
    cloneBlock.style.overflow = 'visible';
    cloneBlock.style.maxHeight = 'none';
    const expandedHeight = Math.max(sourceBlockHeight, cloneBlock.scrollHeight, cloneBlock.clientHeight);
    cloneBlock.style.height = 'auto';
    cloneBlock.style.minHeight = isSpecialLimitedBlock ? '0' : `${Math.max(1, Math.ceil(expandedHeight))}px`;
    cloneBlock.style.width = `${Math.max(1, Math.ceil(expandedWidth))}px`;
    cloneBlock.style.minWidth = `${Math.max(1, Math.ceil(expandedWidth))}px`;
    cloneBlock.style.maxWidth = 'none';
    return expandedWidth;
  };

  const syncDuoUnitRowsForExport = (sourceRoot, cloneRoot) => {
    if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return 0;
    const collectRows = (rootEl) => {
      const rows = [];
      if (rootEl.classList.contains('duo-unit-row')) rows.push(rootEl);
      rows.push(...Array.from(rootEl.querySelectorAll('.duo-unit-row')));
      return rows.filter((row) => row instanceof HTMLElement);
    };
    const sourceRows = collectRows(sourceRoot);
    const cloneRows = collectRows(cloneRoot);
    const pairCount = Math.min(sourceRows.length, cloneRows.length);
    let maxWidth = 0;

    for (let idx = 0; idx < pairCount; idx += 1) {
      const sourceRow = sourceRows[idx];
      const cloneRow = cloneRows[idx];
      const sourceGrid = sourceRow.querySelector('.duo-unit-pair-grid');
      const cloneGrid = cloneRow.querySelector('.duo-unit-pair-grid');
      if (!(sourceGrid instanceof HTMLElement) || !(cloneGrid instanceof HTMLElement)) continue;

      const sourceGridStyle = window.getComputedStyle(sourceGrid);
      const sourceColumns = String(sourceGridStyle.gridTemplateColumns || '').trim().split(/\s+/).filter(Boolean);
      const gridWidth = Math.max(sourceGrid.clientWidth, sourceGrid.getBoundingClientRect().width);
      const rowWidth = Math.max(sourceRow.clientWidth, sourceRow.getBoundingClientRect().width);
      const gap = Number.parseFloat(sourceGridStyle.columnGap || sourceGridStyle.gap || '0') || 0;
      const sourceCards = Array.from(sourceGrid.children).filter((child) => child instanceof HTMLElement);
      const cloneCards = Array.from(cloneGrid.children).filter((child) => child instanceof HTMLElement);

      maxWidth = Math.max(maxWidth, rowWidth);
      cloneRow.style.width = `${Math.max(1, Math.ceil(rowWidth))}px`;
      cloneRow.style.maxWidth = 'none';
      cloneGrid.style.width = `${Math.max(1, Math.ceil(gridWidth))}px`;
      cloneGrid.style.maxWidth = 'none';
      cloneGrid.style.columnGap = `${Math.max(0, gap)}px`;

      if (sourceColumns.length >= 2 && sourceCards.length >= 2 && cloneCards.length >= 2) {
        const firstWidth = Math.max(sourceCards[0].clientWidth, sourceCards[0].getBoundingClientRect().width);
        const secondWidth = Math.max(sourceCards[1].clientWidth, sourceCards[1].getBoundingClientRect().width);
        cloneGrid.style.gridTemplateColumns = `${Math.max(1, Math.ceil(firstWidth))}px ${Math.max(1, Math.ceil(secondWidth))}px`;
        cloneCards[0].style.width = `${Math.max(1, Math.ceil(firstWidth))}px`;
        cloneCards[1].style.width = `${Math.max(1, Math.ceil(secondWidth))}px`;
        cloneCards[0].style.maxWidth = 'none';
        cloneCards[1].style.maxWidth = 'none';
      } else {
        cloneGrid.style.gridTemplateColumns = 'minmax(0, 1fr)';
        cloneCards.forEach((card) => {
          card.style.width = '100%';
          card.style.maxWidth = '100%';
        });
      }
    }

    return maxWidth;
  };

  const syncCloneBackgroundStylesWithSource = (sourceRoot, cloneRoot) => {
    if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
    const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll('*'))];
    const cloneNodes = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll('*'))];
    const pairCount = Math.min(sourceNodes.length, cloneNodes.length);
    for (let idx = 0; idx < pairCount; idx += 1) {
      const sourceEl = sourceNodes[idx];
      const cloneEl = cloneNodes[idx];
      if (!(sourceEl instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) continue;
      const computed = window.getComputedStyle(sourceEl);
      const background = String(computed.background || '').trim();
      const bgColor = String(computed.backgroundColor || '').trim();
      const bgImage = String(computed.backgroundImage || '').trim();
      const bgRepeat = String(computed.backgroundRepeat || '').trim();
      const bgPosition = String(computed.backgroundPosition || '').trim();
      const bgSize = String(computed.backgroundSize || '').trim();
      const border = String(computed.border || '').trim();
      const borderColor = String(computed.borderColor || '').trim();
      // Avoid writing shorthand `background` here: on some cards it serializes with transparent color
      // and wipes the intended fill while keeping gradient strips.
      if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
        cloneEl.style.backgroundColor = bgColor;
      }
      if (bgImage && bgImage !== 'none') {
        cloneEl.style.backgroundImage = bgImage;
        if (bgRepeat) cloneEl.style.backgroundRepeat = bgRepeat;
        if (bgPosition) cloneEl.style.backgroundPosition = bgPosition;
        if (bgSize) cloneEl.style.backgroundSize = bgSize;
      }
      if (border && border !== '0px none rgb(0, 0, 0)') {
        cloneEl.style.border = border;
      } else if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
        cloneEl.style.borderColor = borderColor;
      }
    }
  };

  const isTransparentColor = (colorText) => {
    const value = String(colorText || '').trim().toLowerCase();
    return !value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)';
  };

  const resolveSingleCardFillFromSource = (sourceEl) => {
    if (!(sourceEl instanceof HTMLElement)) return '';
    const inlineBgColor = String(sourceEl.style?.backgroundColor || '').trim();
    if (!isTransparentColor(inlineBgColor)) return inlineBgColor;
    const computed = window.getComputedStyle(sourceEl);
    const bgColor = String(computed.backgroundColor || '').trim();
    if (!isTransparentColor(bgColor)) return bgColor;

    const resolvedLineupBg = String(computed.getPropertyValue('--lineup-row-bg') || '').trim();
    if (resolvedLineupBg) return resolvedLineupBg;

    const resolvedRecordTint = String(computed.getPropertyValue('--record-tint') || '').trim();
    if (resolvedRecordTint) return resolvedRecordTint;

    const rowLikeHost = sourceEl.closest('.lineup-plan-row, tr');
    if (rowLikeHost instanceof HTMLElement) {
      const hostComputed = window.getComputedStyle(rowLikeHost);
      const hostLineupBg = String(hostComputed.getPropertyValue('--lineup-row-bg') || '').trim();
      if (hostLineupBg) return hostLineupBg;
      const hostRecordTint = String(hostComputed.getPropertyValue('--record-tint') || '').trim();
      if (hostRecordTint) return hostRecordTint;
      const hostBgColor = String(hostComputed.backgroundColor || '').trim();
      if (!isTransparentColor(hostBgColor)) return hostBgColor;
    }

    return '';
  };

  const syncSingleCardFillStylesWithSource = (sourceRoot, cloneRoot) => {
    if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
    const collectNodesIncludingRoot = (rootEl, selector) => {
      const nodes = [];
      if (rootEl.matches(selector)) {
        nodes.push(rootEl);
      }
      nodes.push(...Array.from(rootEl.querySelectorAll(selector)));
      return nodes;
    };
    const selectors = [
      '.lineup-card',
      '.support-card',
      '.attr-summary-card',
      '.lineup-member-cell',
      '.support-member-cell',
      '.related-last-card-thumb',
      '.interval-card-thumb'
    ];
    selectors.forEach((selector) => {
      const sourceNodes = collectNodesIncludingRoot(sourceRoot, selector);
      const cloneNodes = collectNodesIncludingRoot(cloneRoot, selector);
      const pairCount = Math.min(sourceNodes.length, cloneNodes.length);
      for (let idx = 0; idx < pairCount; idx += 1) {
        const sourceEl = sourceNodes[idx];
        const cloneEl = cloneNodes[idx];
        if (!(sourceEl instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) continue;
        const computed = window.getComputedStyle(sourceEl);
        const bgImage = String(computed.backgroundImage || '').trim();
        const bgRepeat = String(computed.backgroundRepeat || '').trim();
        const bgPosition = String(computed.backgroundPosition || '').trim();
        const bgSize = String(computed.backgroundSize || '').trim();
        const resolvedFill = resolveSingleCardFillFromSource(sourceEl);

        if (resolvedFill) {
          cloneEl.style.setProperty('background-color', resolvedFill, 'important');
        }
        if (bgImage && bgImage !== 'none') {
          cloneEl.style.setProperty('background-image', bgImage, 'important');
          if (bgRepeat) cloneEl.style.setProperty('background-repeat', bgRepeat, 'important');
          if (bgPosition) cloneEl.style.setProperty('background-position', bgPosition, 'important');
          if (bgSize) cloneEl.style.setProperty('background-size', bgSize, 'important');
        }
      }
    });
  };

  const prepareExportClone = async (targetEl) => {
    if (!targetEl) return null;

    const rootEl = inputs.cardStatsRootRef.value instanceof HTMLElement
      ? inputs.cardStatsRootRef.value
      : targetEl.closest('.pjsk-stats');
    const rect = targetEl.getBoundingClientRect();
    const sourceStyle = window.getComputedStyle(targetEl);
    const rootStyle = rootEl instanceof HTMLElement ? window.getComputedStyle(rootEl) : null;
    const relatedPanelEl = targetEl.closest('.related-panel');
    const relatedPanelStyle = relatedPanelEl instanceof HTMLElement ? window.getComputedStyle(relatedPanelEl) : null;
    const sourceRadiusVar = String(sourceStyle.getPropertyValue('--stats-radius-btn') || '').trim();
    const sourceBgColor = String(sourceStyle.backgroundColor || '').trim();
    const hasVisibleBg = sourceBgColor && sourceBgColor !== 'transparent' && sourceBgColor !== 'rgba(0, 0, 0, 0)';
    const clone = targetEl.cloneNode(true);
    copyCaptureFeatureBoundary(targetEl, clone);
    clone.classList.add('export-clone-root');
    if (!targetEl.closest('.duo-panel, .duo-unit-row, .duo-unit-section')) {
      clone.classList.add('export-stable-header-layout');
    }
    clone.style.position = 'relative';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = 'auto';
    if (!hasVisibleBg) {
      clone.style.backgroundColor = '#ffffff';
    }
    clone.style.width = `${Math.max(1, Math.ceil(rect.width))}px`;
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    if (relatedPanelEl instanceof HTMLElement) {
      clone.classList.add('related-panel');
    }
    copyCaptureCssVariables(rootStyle, clone);
    copyCaptureCssVariables(sourceStyle, clone);
    copyCaptureCssVariables(relatedPanelStyle, clone);
    copyCaptureCssVariablesFromAncestors(targetEl, clone, rootEl);
    syncCloneImagesWithSource(targetEl, clone);
    syncCaptureCloneFormControls(targetEl, clone);
    syncCloneBackgroundStylesWithSource(targetEl, clone);
    syncSingleCardFillStylesWithSource(targetEl, clone);
    if (clone.classList.contains('special-limited-matrix')) {
      clone.classList.add('is-export-flat');
    }
    clone.querySelectorAll('.special-limited-matrix').forEach((matrixEl) => {
      if (matrixEl instanceof HTMLElement) {
        matrixEl.classList.add('is-export-flat');
      }
    });
    if (targetEl.classList.contains('lineup-card') || targetEl.classList.contains('support-card') || targetEl.classList.contains('attr-summary-card')) {
      const explicitFill = resolveSingleCardFillFromSource(targetEl);
      if (explicitFill) {
        clone.classList.add('export-single-card-fill-root');
        clone.style.setProperty('--export-single-card-fill', explicitFill);
        clone.style.removeProperty('background-color');
        clone.style.removeProperty('background-image');
      }
    }
    if (sourceRadiusVar) {
      clone.style.setProperty('--stats-radius-btn', sourceRadiusVar);
    }

    clone.querySelectorAll('.card-export-btn').forEach((btn) => {
      btn.style.display = 'none';
    });
    clone.querySelectorAll('.lineup-toggle-btn').forEach((btn) => {
      btn.style.display = 'none';
    });
    clone.querySelectorAll('.export-hide').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.closest('.stats-checkbox') || el.matches('.stats-checkbox')) return;
      if (el.querySelector('input[type="checkbox"]')) return;
      if (el.matches('button, .floating-menu-btn, .nav-collapse-fab, .song-mini-icon-btn')) {
        el.style.display = 'none';
      }
    });
    // html-to-image may over-render inset shadow on low-alpha CFES backgrounds,
    // causing a gray veil in the middle/corners; keep on-screen style unchanged
    // and neutralize this shadow only in export clone.
    clone.querySelectorAll('.lineup-member-cell.is-cfes').forEach((cell) => {
      cell.style.boxShadow = 'none';
    });

    const stabilizeStyle = document.createElement('style');
    stabilizeStyle.textContent = `
    .export-clone-root,
    .export-clone-root * {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .export-clone-root *::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      display: none !important;
      background: transparent !important;
    }
    .export-clone-root * {
      box-shadow: none !important;
      text-shadow: none !important;
    }
    /* html-to-image's foreignObject renderer can shrink inline-flex header
       content even though the live clone has a single row. Give non-duo
       exports an explicit flex basis before SVG serialization. */
    .export-clone-root.export-stable-header-layout :is(.section-head-left, .block-head-left, .festival-head-left) {
      display: flex !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      flex-wrap: nowrap !important;
    }
    .export-clone-root.export-stable-header-layout :is(.section-head-left, .block-head-left, .festival-head-left) > :is(h2, h3) {
      flex: 0 0 auto !important;
      white-space: nowrap !important;
    }
    .export-clone-root.export-stable-header-layout .head-inline-filters {
      flex: 0 0 auto !important;
      flex-wrap: nowrap !important;
    }
    .export-clone-root.export-single-card-fill-root {
      isolation: isolate !important;
      position: relative !important;
      overflow: hidden !important;
      background: transparent !important;
      background-image: none !important;
    }
    .export-clone-root.export-single-card-fill-root::before {
      content: "" !important;
      position: absolute !important;
      inset: 0 !important;
      border-radius: inherit !important;
      background: var(--export-single-card-fill, #ffffff) !important;
      z-index: 0 !important;
      pointer-events: none !important;
    }
    .export-clone-root.export-single-card-fill-root::after {
      content: "" !important;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      bottom: 0 !important;
      width: 3px !important;
      border-radius: inherit !important;
      background: var(--unit-card-accent-color, #94a3b8) !important;
      z-index: 0 !important;
      pointer-events: none !important;
    }
    .export-clone-root.export-single-card-fill-root > * {
      position: relative !important;
      z-index: 1 !important;
    }
    .export-clone-root input[type="checkbox"] {
      appearance: none !important;
      -webkit-appearance: none !important;
      width: 14px !important;
      height: 14px !important;
      border: 1px solid #64748b !important;
      border-radius: 3px !important;
      background: #ffffff !important;
      position: relative !important;
      margin: 0 !important;
      accent-color: #14b8a6 !important;
    }
    .export-clone-root input[type="checkbox"]:checked {
      border-color: #14b8a6 !important;
      background: #14b8a6 !important;
    }
    .export-clone-root input[type="checkbox"]:checked::after {
      content: "";
      position: absolute;
      left: 4px;
      top: 1px;
      width: 3px;
      height: 7px;
      border: solid #ffffff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  `;
    clone.insertBefore(stabilizeStyle, clone.firstChild);

    const originalMatrixWraps = targetEl.querySelectorAll('.matrix-wrap');
    const cloneMatrixWraps = clone.querySelectorAll('.matrix-wrap');
    if (originalMatrixWraps.length && cloneMatrixWraps.length) {
      let fullMatrixWidthMax = 0;
      cloneMatrixWraps.forEach((cloneMatrixWrap, idx) => {
        const originalMatrixWrap = originalMatrixWraps[idx];
        if (!originalMatrixWrap) return;
        const isDuoUnitWrap = originalMatrixWrap.classList.contains('duo-unit-wrap') || cloneMatrixWrap.classList.contains('duo-unit-wrap');
        const fullMatrixWidth = isDuoUnitWrap
          ? Math.max(originalMatrixWrap.clientWidth, originalMatrixWrap.getBoundingClientRect().width)
          : Math.max(originalMatrixWrap.scrollWidth, originalMatrixWrap.clientWidth);
        const fullMatrixHeight = Math.max(originalMatrixWrap.scrollHeight, originalMatrixWrap.clientHeight);
        if (!isDuoUnitWrap) {
          fullMatrixWidthMax = Math.max(fullMatrixWidthMax, fullMatrixWidth);
        }
        cloneMatrixWrap.style.maxHeight = 'none';
        cloneMatrixWrap.style.height = `${fullMatrixHeight}px`;
        cloneMatrixWrap.style.width = `${fullMatrixWidth}px`;
        cloneMatrixWrap.style.overflow = 'visible';
      });

      const cloneMatrixHeadCells = clone.querySelectorAll('.matrix-table thead th, .matrix-table th:first-child, .matrix-table td:first-child');
      cloneMatrixHeadCells.forEach((cell) => {
        cell.style.position = 'static';
        cell.style.left = 'auto';
        cell.style.top = 'auto';
      });

      const panelPadding = 28;
      clone.style.width = `${Math.max(Math.ceil(rect.width), fullMatrixWidthMax + panelPadding)}px`;
    }

    const originalSongLists = targetEl.querySelectorAll('.song-list');
    const cloneSongLists = clone.querySelectorAll('.song-list');
    cloneSongLists.forEach((listEl, idx) => {
      const source = originalSongLists[idx];
      const fullHeight = source ? Math.max(source.scrollHeight, source.clientHeight) : listEl.scrollHeight;
      listEl.style.maxHeight = 'none';
      listEl.style.height = `${fullHeight}px`;
      listEl.style.overflow = 'visible';
    });

    // 记录类子模块存在横向滚动和列宽变量，导出时同步布局避免列宽漂移。
    let expandedCloneWidth = Math.max(1, Math.ceil(rect.width));
    if (targetEl.classList.contains('record-block') && clone.classList.contains('record-block')) {
      expandedCloneWidth = Math.max(expandedCloneWidth, syncRecordBlockLayoutForExport(targetEl, clone));
    }
    const sourceRecordBlocks = targetEl.querySelectorAll('.record-block');
    const cloneRecordBlocks = clone.querySelectorAll('.record-block');
    cloneRecordBlocks.forEach((block, idx) => {
      const source = sourceRecordBlocks[idx];
      const nextWidth = syncRecordBlockLayoutForExport(source, block);
      expandedCloneWidth = Math.max(expandedCloneWidth, nextWidth + 20);
    });

    if (targetEl.classList.contains('duo-unit-row') || targetEl.querySelector('.duo-unit-row')) {
      const duoRowsWidth = syncDuoUnitRowsForExport(targetEl, clone);
      if (duoRowsWidth > 0) {
        expandedCloneWidth = Math.max(expandedCloneWidth, duoRowsWidth + 24);
      }
    }

    if (expandedCloneWidth > Math.ceil(rect.width)) {
      clone.style.width = `${expandedCloneWidth}px`;
    }

    const host = document.createElement('div');
    host.className = 'export-clone-host';
    host.style.position = 'fixed';
    host.style.left = '-30000px';
    host.style.top = '0';
    host.style.width = 'auto';
    host.style.height = 'auto';
    host.style.overflow = 'visible';
    host.style.pointerEvents = 'none';
    host.style.zIndex = '-1';
    host.appendChild(clone);
    document.body.appendChild(host);
    await inputs.captureExport.waitNextPaint();

    const specialLimitedExportMatrix = clone.querySelector('.special-limited-matrix.is-export-flat');
    if (specialLimitedExportMatrix instanceof HTMLElement) {
      clone.style.height = 'auto';
      clone.style.minHeight = '0';
      specialLimitedExportMatrix.style.height = 'auto';
      specialLimitedExportMatrix.style.minHeight = '0';
      const blockHead = clone.querySelector('.block-head');
      const flatMatrixWidth = Math.max(
        specialLimitedExportMatrix.scrollWidth,
        specialLimitedExportMatrix.clientWidth,
        specialLimitedExportMatrix.getBoundingClientRect().width
      );
      const blockHeadWidth = blockHead instanceof HTMLElement
        ? getTightFlexContentWidth(blockHead)
        : 0;
      const cloneBoxStyle = window.getComputedStyle(clone);
      const exportChrome = cloneBoxStyle.boxSizing === 'border-box'
        ? getHorizontalBoxChrome(cloneBoxStyle)
        : 0;
      const flatCloneWidth = Math.max(
        Math.ceil(flatMatrixWidth + exportChrome),
        Math.ceil(blockHeadWidth + exportChrome)
      );
      clone.style.width = `${Math.max(1, flatCloneWidth)}px`;
      clone.style.minWidth = `${Math.max(1, flatCloneWidth)}px`;
      clone.style.maxWidth = 'none';
      await inputs.captureExport.waitNextPaint();
      clone.style.height = 'auto';
      clone.style.minHeight = '0';
    }

    if (syncCardYearCaptureLayout(targetEl, clone)) {
      await inputs.captureExport.waitNextPaint();
    }

    const finalWidth = Math.max(clone.scrollWidth, clone.clientWidth, clone.getBoundingClientRect().width);
    const finalHeight = Math.max(clone.scrollHeight, clone.clientHeight, clone.getBoundingClientRect().height);
    clone.style.width = `${Math.max(1, Math.ceil(finalWidth))}px`;
    clone.style.minWidth = `${Math.max(1, Math.ceil(finalWidth))}px`;
    clone.style.height = `${Math.max(1, Math.ceil(finalHeight))}px`;
    clone.style.minHeight = `${Math.max(1, Math.ceil(finalHeight))}px`;
    await inputs.captureExport.waitNextPaint();
    return clone;
  };

  return {
    prepareExportClone,
  };
}
