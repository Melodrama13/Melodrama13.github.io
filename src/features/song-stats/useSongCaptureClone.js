import { copyCaptureCssVariables, copyCaptureCssVariablesFromAncestors, copyCaptureFeatureBoundary } from '../../services/capture/captureStyleContext.js';
import { syncCloneImagesWithSource, syncCloneBackgroundStylesWithSource, sanitizeSongCloneForExport } from './songCaptureClone.js';
import { syncCaptureCloneFormControls } from '../../services/capture/captureElementState.js';
import { waitNextPaint } from './songFormatters.js';

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongCaptureClone({
  songStatsRootRef
}) {
const prepareSongExportClone = async (targetEl) => {
  if (!targetEl) return null;

  const rootEl = songStatsRootRef.value instanceof HTMLElement
    ? songStatsRootRef.value
    : targetEl.closest('.pjsk-song-stats');
  const rect = targetEl.getBoundingClientRect();
  const sourceStyle = window.getComputedStyle(targetEl);
  const rootStyle = rootEl instanceof HTMLElement ? window.getComputedStyle(rootEl) : null;
  const sourceRadiusVar = String(sourceStyle.getPropertyValue('--stats-radius-btn') || '').trim();
  const sourceBgColor = String(sourceStyle.backgroundColor || '').trim();
  const hasVisibleBg = sourceBgColor && sourceBgColor !== 'transparent' && sourceBgColor !== 'rgba(0, 0, 0, 0)';

  const clone = targetEl.cloneNode(true);
  copyCaptureFeatureBoundary(targetEl, clone);
  clone.classList.add('song-export-clone-root');
  if (targetEl.id === 'panel-another-vocal' && rootEl instanceof HTMLElement && rootEl.classList.contains('is-anvo-fill-mode')) {
    clone.classList.add('is-anvo-fill-export');
  }
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = 'auto';
  clone.style.background = hasVisibleBg ? sourceBgColor : '#ffffff';
  clone.style.width = `${Math.max(1, Math.ceil(rect.width))}px`;
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';

  // SongStats 大量尺寸依赖根节点 CSS 变量，克隆到 body 后需要显式继承，
  // 否则会出现截图字号/卡片网格与屏幕不一致。
  copyCaptureCssVariables(rootStyle, clone);
  copyCaptureCssVariables(sourceStyle, clone);
  copyCaptureCssVariablesFromAncestors(targetEl, clone, rootEl);
  syncCloneImagesWithSource(targetEl, clone);
  syncCaptureCloneFormControls(targetEl, clone);
  if (targetEl.id === 'panel-cover-album-stats') {
    // Keep the selected controls readable in the PNG while the live UI is locked.
    // WebKit's native disabled controls may use colors html2canvas cannot parse.
    clone.querySelectorAll('.song-cover-album-prediction-toggle input, .song-cover-album-mode-select').forEach((control) => {
      control.disabled = false;
    });
  }
  syncCloneBackgroundStylesWithSource(targetEl, clone);
  sanitizeSongCloneForExport(clone);

  if (targetEl.id === 'panel-cover-album-stats') {
    const sourceMode = targetEl.querySelector('.song-cover-album-mode-select');
    const cloneMode = clone.querySelector('.song-cover-album-mode-select');
    if (sourceMode instanceof HTMLSelectElement && cloneMode instanceof HTMLSelectElement) {
      // The canvas renderer positions native select text from font metrics.
      // Freeze its selected label in the same box so the PNG matches the UI.
      const modeStyle = window.getComputedStyle(sourceMode);
      const modeRect = sourceMode.getBoundingClientRect();
      const label = document.createElement('span');
      label.className = `${cloneMode.className} song-cover-album-export-mode`;
      for (const attribute of cloneMode.attributes) {
        if (attribute.name.startsWith('data-v-')) label.setAttribute(attribute.name, attribute.value);
      }
      label.dataset.value = sourceMode.value;
      label.textContent = sourceMode.selectedOptions[0]?.textContent || '';
      label.style.cssText = cloneMode.style.cssText;
      Object.assign(label.style, {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxSizing: 'border-box', width: `${modeRect.width}px`, height: `${modeRect.height}px`,
        minHeight: '0', padding: '0', whiteSpace: 'nowrap',
        fontFamily: modeStyle.fontFamily, fontSize: modeStyle.fontSize,
        fontWeight: modeStyle.fontWeight, letterSpacing: modeStyle.letterSpacing,
        lineHeight: '1', textAlign: 'center', verticalAlign: 'middle',
        color: modeStyle.color, border: modeStyle.border, borderRadius: modeStyle.borderRadius,
        backgroundColor: modeStyle.backgroundColor, backgroundImage: 'none'
      });
      cloneMode.replaceWith(label);
    }
  }

  if (sourceRadiusVar) {
    clone.style.setProperty('--stats-radius-btn', sourceRadiusVar);
  }

  clone.querySelectorAll('.song-export-btn, .song-role-card-tools, .song-oc-event-unit-tools, .anvo-mode-switch').forEach((el) => {
    el.style.display = 'none';
  });
  clone.querySelectorAll('#panel-duo-stats .song-mini-icon-btn').forEach((el) => {
    el.style.display = 'none';
  });

  const stabilizeStyle = document.createElement('style');
  stabilizeStyle.textContent = `
    .song-export-clone-root,
    .song-export-clone-root * {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .song-export-clone-root *::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      display: none !important;
      background: transparent !important;
    }
    .song-export-clone-root * {
      box-shadow: none !important;
      text-shadow: none !important;
    }
    .song-export-clone-root input[type="checkbox"] {
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
    .song-export-clone-root input[type="checkbox"]:checked {
      border-color: #14b8a6 !important;
      background: #14b8a6 !important;
    }
    .song-export-clone-root input[type="checkbox"]:checked::after {
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
    /* html2canvas draws the native check itself. Edge returns empty computed
       styles for its synthetic pseudo-element inside the void input node. */
    .song-export-clone-root#panel-cover-album-stats input[type="checkbox"]::before,
    .song-export-clone-root#panel-cover-album-stats input[type="checkbox"]::after {
      content: none !important;
    }
    .song-export-clone-root .song-export-no-pseudo-label {
      font-size: 0.7rem !important;
      line-height: 1 !important;
    }
    .song-export-clone-root .song-export-no-pseudo-label::before,
    .song-export-clone-root .song-export-no-pseudo-label::after {
      content: none !important;
      display: none !important;
    }
  `;
  clone.insertBefore(stabilizeStyle, clone.firstChild);

  const scrollSelectors = [
    '.song-insight-scroll',
    '.song-role-list',
    '.song-vs-event-image-groups',
    '.song-duo-song-pair-grid',
    '.song-oc-event-members-grid'
  ].join(', ');
  const originalScrollBlocks = targetEl.querySelectorAll(scrollSelectors);
  const cloneScrollBlocks = clone.querySelectorAll(scrollSelectors);
  cloneScrollBlocks.forEach((block, idx) => {
    const source = originalScrollBlocks[idx];
    const fullHeight = source ? Math.max(source.scrollHeight, source.clientHeight) : Math.max(block.scrollHeight, block.clientHeight);
    block.style.maxHeight = 'none';
    block.style.height = `${Math.max(1, fullHeight)}px`;
    block.style.overflow = 'visible';
  });

  const host = document.createElement('div');
  host.className = 'song-export-clone-host';
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
  await waitNextPaint();
  return clone;
};

return { prepareSongExportClone };
}
