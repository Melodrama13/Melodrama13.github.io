import { UI_BREAKPOINTS, isViewportAtMost } from '../../ui/breakpoints.js';

/** Owns card responsive layout behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardResponsiveLayout(inputs) {
  let relatedJumpChipSyncRaf = 0;

  let relatedJumpResizeObserver = null;

  let relatedJumpMutationObserver = null;

  let lineupCardLayoutSyncRaf = 0;

  let lineupCardLayoutSyncTimer = 0;

  let lineupCardLayoutResizeObserver = null;

  let lineupCardLayoutMutationObserver = null;

  const syncLineupCardModeRowLayout = () => {
    const rootEl = inputs.cardStatsRootRef.value;
    if (!(rootEl instanceof HTMLElement)) return;
    const viewportWidth = Number(window?.innerWidth || 0);
    const shouldForce = viewportWidth > 0 && isViewportAtMost(viewportWidth, UI_BREAKPOINTS.tabletMax);
    const rows = rootEl.querySelectorAll('.lineup-plan-row');
    rows.forEach((row) => {
      if (!(row instanceof HTMLElement)) return;
      if (!shouldForce) {
        row.style.removeProperty('min-height');
        row.querySelectorAll('.lineup-member-cell .lineup-slot-card').forEach((slot) => {
          if (!(slot instanceof HTMLElement)) return;
          slot.style.removeProperty('height');
        });
        return;
      }
      const slotCards = row.querySelectorAll('.lineup-member-cell.is-card-mode .lineup-slot-card');
      if (!slotCards.length) {
        row.style.removeProperty('min-height');
        return;
      }
      // Clear stale row min-height first, otherwise cells can stay stretched and never shrink.
      row.style.removeProperty('min-height');
      slotCards.forEach((slot) => {
        if (!(slot instanceof HTMLElement)) return;
        const width = Math.ceil(slot.getBoundingClientRect().width || slot.clientWidth || 0);
        if (width > 0) {
          slot.style.height = `${width}px`;
        }
      });
      const rowCells = Array.from(row.children).filter((child) => child instanceof HTMLElement);
      let maxHeight = 0;
      rowCells.forEach((cell) => {
        maxHeight = Math.max(maxHeight, Math.ceil(cell.getBoundingClientRect().height || 0));
      });
      if (maxHeight > 0) {
        row.style.minHeight = `${maxHeight}px`;
      }
    });
  };

  const scheduleLineupCardModeRowLayoutSync = () => {
    if (lineupCardLayoutSyncRaf) return;
    lineupCardLayoutSyncRaf = requestAnimationFrame(() => {
      lineupCardLayoutSyncRaf = 0;
      syncLineupCardModeRowLayout();
      inputs.navigation.viewportFocus.refresh();
    });
  };

  const queueLineupCardModeRowLayoutSync = () => {
    scheduleLineupCardModeRowLayoutSync();
  };

  const triggerLineupCardModeRowLayoutSyncBurst = () => {
    queueLineupCardModeRowLayoutSync();
    requestAnimationFrame(() => {
      queueLineupCardModeRowLayoutSync();
    });
  };

  const bindLineupCardModeLayoutObserver = () => {
    if (lineupCardLayoutResizeObserver) {
      lineupCardLayoutResizeObserver.disconnect();
      lineupCardLayoutResizeObserver = null;
    }
    if (lineupCardLayoutMutationObserver) {
      lineupCardLayoutMutationObserver.disconnect();
      lineupCardLayoutMutationObserver = null;
    }
    if (typeof ResizeObserver === 'undefined') return;
    const rootEl = inputs.cardStatsRootRef.value;
    const statsMain = rootEl instanceof HTMLElement ? rootEl.querySelector('.stats-main') : null;
    const statsLayout = rootEl instanceof HTMLElement ? rootEl.querySelector('.stats-layout') : null;
    if (!(statsMain instanceof HTMLElement) && !(statsLayout instanceof HTMLElement) && !(rootEl instanceof HTMLElement)) return;
    lineupCardLayoutResizeObserver = new ResizeObserver(() => {
      queueLineupCardModeRowLayoutSync();
    });
    if (statsMain instanceof HTMLElement) {
      lineupCardLayoutResizeObserver.observe(statsMain);
    }
    if (statsLayout instanceof HTMLElement) {
      lineupCardLayoutResizeObserver.observe(statsLayout);
    }
    if (rootEl instanceof HTMLElement) {
      lineupCardLayoutResizeObserver.observe(rootEl);
    }
    if (typeof MutationObserver !== 'undefined' && statsLayout instanceof HTMLElement) {
      lineupCardLayoutMutationObserver = new MutationObserver(() => {
        triggerLineupCardModeRowLayoutSyncBurst();
      });
      lineupCardLayoutMutationObserver.observe(statsLayout, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }
  };

  const syncRelatedJumpChipWidths = () => {
    const panels = ['panel-related', 'panel-duo', 'panel-special']
      .map((id) => document.getElementById(id))
      .filter((panel) => panel instanceof HTMLElement);

    panels.forEach((panel) => {
      const blocks = panel.querySelectorAll('.record-block');
      blocks.forEach((blockEl) => {
        if (!(blockEl instanceof HTMLElement)) return;
        const buttons = blockEl.querySelectorAll('.jump-link');
        if (!buttons.length) {
          blockEl.style.removeProperty('--record-jump-chip-width');
          return;
        }

        let maxWidth = 0;
        buttons.forEach((btnEl) => {
          if (!(btnEl instanceof HTMLButtonElement)) return;
          const prevWidth = btnEl.style.width;
          const prevMinWidth = btnEl.style.minWidth;
          const prevMaxWidth = btnEl.style.maxWidth;
          btnEl.style.width = 'auto';
          btnEl.style.minWidth = '0';
          btnEl.style.maxWidth = 'none';
          const measured = Math.ceil(btnEl.getBoundingClientRect().width);
          if (measured > maxWidth) maxWidth = measured;
          btnEl.style.width = prevWidth;
          btnEl.style.minWidth = prevMinWidth;
          btnEl.style.maxWidth = prevMaxWidth;
        });

        if (maxWidth > 0) {
          blockEl.style.setProperty('--record-jump-chip-width', `${maxWidth}px`);
        }
      });
    });
  };

  const scheduleRelatedJumpChipWidthSync = () => {
    if (relatedJumpChipSyncRaf) return;
    relatedJumpChipSyncRaf = requestAnimationFrame(() => {
      relatedJumpChipSyncRaf = 0;
      syncRelatedJumpChipWidths();
      inputs.navigation.viewportFocus.refresh();
    });
  };

  const bindRelatedJumpChipObservers = () => {
    if (relatedJumpResizeObserver) {
      relatedJumpResizeObserver.disconnect();
      relatedJumpResizeObserver = null;
    }
    if (relatedJumpMutationObserver) {
      relatedJumpMutationObserver.disconnect();
      relatedJumpMutationObserver = null;
    }

    const panels = ['panel-related', 'panel-special']
      .map((id) => document.getElementById(id))
      .filter((panel) => panel instanceof HTMLElement);
    if (!panels.length) return;

    if (typeof ResizeObserver !== 'undefined') {
      relatedJumpResizeObserver = new ResizeObserver(() => {
        scheduleRelatedJumpChipWidthSync();
      });
      panels.forEach((panel) => relatedJumpResizeObserver.observe(panel));
    }

    if (typeof MutationObserver !== 'undefined') {
      relatedJumpMutationObserver = new MutationObserver(() => {
        scheduleRelatedJumpChipWidthSync();
      });
      panels.forEach((panel) => {
        relatedJumpMutationObserver.observe(panel, {
          childList: true,
          subtree: true,
          characterData: true
        });
      });
    }

    scheduleRelatedJumpChipWidthSync();
  };

  return {
    triggerLineupCardModeRowLayoutSyncBurst,
    queueLineupCardModeRowLayoutSync,
    bindRelatedJumpChipObservers,
    bindLineupCardModeLayoutObserver,
    get relatedJumpChipSyncRaf() { return relatedJumpChipSyncRaf; },
    set relatedJumpChipSyncRaf(value) { relatedJumpChipSyncRaf = value; },
    get lineupCardLayoutSyncRaf() { return lineupCardLayoutSyncRaf; },
    set lineupCardLayoutSyncRaf(value) { lineupCardLayoutSyncRaf = value; },
    get lineupCardLayoutSyncTimer() { return lineupCardLayoutSyncTimer; },
    set lineupCardLayoutSyncTimer(value) { lineupCardLayoutSyncTimer = value; },
    get lineupCardLayoutResizeObserver() { return lineupCardLayoutResizeObserver; },
    set lineupCardLayoutResizeObserver(value) { lineupCardLayoutResizeObserver = value; },
    get lineupCardLayoutMutationObserver() { return lineupCardLayoutMutationObserver; },
    set lineupCardLayoutMutationObserver(value) { lineupCardLayoutMutationObserver = value; },
    get relatedJumpResizeObserver() { return relatedJumpResizeObserver; },
    set relatedJumpResizeObserver(value) { relatedJumpResizeObserver = value; },
    get relatedJumpMutationObserver() { return relatedJumpMutationObserver; },
    set relatedJumpMutationObserver(value) { relatedJumpMutationObserver = value; },
  };
}
