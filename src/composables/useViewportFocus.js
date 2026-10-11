import { nextTick, onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue';
import { clampScrollTop, isScrollKeyIntent, isScrollNavigationActive, SCROLL_NAVIGATION_CHANGE, SCROLL_POSITION_CHANGE } from './scrollNavigation.js';

// Keep a reading block at its existing screen height, not at a viewport
// percentage. Cache before reflow: by the time resize fires, CSS has changed.
export const useViewportFocus = ({ getHost, getRoot, getReadingCandidates = null, onRestore = () => {}, deferObservedLayout = false }) => {
  let host = null;
  let root = null;
  let observer = null;
  let cached = null;
  let request = null;
  let rememberRaf = 0;
  let rememberNativePosition = false;
  let observedRaf = 0;
  let touchSnapshot = null;
  let nativeScrollIntent = null;
  let nativeScrollTimer = 0;
  const anchoringOwners = new Set();
  let anchoringStyle = null;
  let active = false;
  let bindingSeq = 0;

  const geometry = () => {
    if (!active || !host?.isConnected || !root?.isConnected || !root.getClientRects().length) return null;
    const rect = root.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    // Include the content's layout origin, excluding actual scrolling.
    // A toolbar above root can change height without resizing root or host.
    const offsetTop = rect.top + host.scrollTop - hostRect.top - host.clientTop;
    return [rect.width, rect.height, host.clientWidth, host.clientHeight, hostRect.top, offsetTop];
  };
  const sameGeometry = (a, b) => a && b && a.every((value, index) => Math.abs(value - b[index]) < 0.5);
  const holdAnchoring = owner => {
    if (!anchoringOwners.size) anchoringStyle = {
      value: host.style.getPropertyValue('overflow-anchor'),
      priority: host.style.getPropertyPriority('overflow-anchor')
    };
    anchoringOwners.add(owner);
    host.style.setProperty('overflow-anchor', 'none');
  };
  const releaseAnchoring = owner => {
    if (!anchoringOwners.delete(owner) || anchoringOwners.size) return;
    if (anchoringStyle.value) host.style.setProperty('overflow-anchor', anchoringStyle.value, anchoringStyle.priority);
    else host.style.removeProperty('overflow-anchor');
    anchoringStyle = null;
  };
  const clearTouch = () => {
    if (touchSnapshot) releaseAnchoring(touchSnapshot);
    touchSnapshot = null;
  };
  const clearNativeScroll = () => {
    clearTimeout(nativeScrollTimer);
    nativeScrollTimer = 0;
    if (nativeScrollIntent) releaseAnchoring(nativeScrollIntent);
    nativeScrollIntent = null;
  };
  const trackNativeScroll = () => {
    if (!nativeScrollIntent) return;
    const delta = host.scrollTop - nativeScrollIntent.scrollTop;
    if (Math.abs(delta) < 0.5) return;
    nativeScrollIntent.scrollTop = host.scrollTop;
    nativeScrollIntent.hasScrolled = true;
    const saved = request?.snapshot || cached;
    // Native scrolling can precede a deferred layout notification. Move
    // the expected screen position by the user's delta before correcting
    // reflow, instead of restoring the pre-input reading position.
    if (saved) {
      saved.top -= delta;
      saved.scrollTop += delta;
      saved.atTop = host.scrollTop <= 1;
    }
    clearTimeout(nativeScrollTimer);
    nativeScrollTimer = setTimeout(() => handleScrollEnd(true), 800);
  };
  const handleScrollEnd = force => {
    // Native scrollbar dragging may emit scrollend between pointer moves.
    // Its input lease lasts until release, including the final native delta.
    if (!nativeScrollIntent || nativeScrollIntent.pendingPointer) return;
    // A compensation just before keydown can queue its own scrollend.
    // It cannot end an input whose native default has not started yet.
    if (force !== true && !nativeScrollIntent.hasScrolled) return;
    trackNativeScroll();
    handleLayout();
    clearNativeScroll();
    cancel();
    remember(true);
  };

  const pickReadingElement = () => {
    const rect = host.getBoundingClientRect();
    const top = rect.top + host.clientTop;
    const rootRect = root.getBoundingClientRect();
    const x = Math.max(rect.left + 8, Math.min(rect.right - 16, rootRect.left + Math.min(80, rootRect.width * 0.2)));
    const y = top + Math.min(100, host.clientHeight * 0.3);
    const readingEnd = top + Math.min(220, host.clientHeight * 0.45);
    // A visible section title takes priority. Pinning a huge section's top
    // while reading its middle, or its height ratio, loses the local context.
    const candidateGroups = getReadingCandidates
      ? [getReadingCandidates({ top: top + 8, bottom: readingEnd })]
      : ['h2, h3, .lineup-char-name, .song-role-name', '.event-item, .birthday-row, .preview-row'];
    for (const group of candidateGroups) {
      const candidates = typeof group === 'string' ? root.querySelectorAll(group) : group;
      let best = null;
      let bestTop = Infinity;
      for (const el of candidates) {
        const bounds = el.getBoundingClientRect();
        if (bounds.width < 1 || bounds.height < 1 || bounds.top < top + 8 || bounds.top > readingEnd || x < bounds.left || x > bounds.right) continue;
        if (bounds.top < bestTop) { best = el; bestTop = bounds.top; }
      }
      if (best) return best;
    }
    const hit = document.elementsFromPoint(x, y).find(el => root.contains(el));
    if (!(hit instanceof HTMLElement)) return null;
    const row = hit.closest('tr, li, [data-scroll-anchor], .event-item, .birthday-row, .preview-row');
    if (row && root.contains(row) && row.getBoundingClientRect().height <= host.clientHeight) return row;
    return hit.getBoundingClientRect().height <= host.clientHeight ? hit : null;
  };

  const snapshot = (element = null) => {
    const layout = geometry();
    if (!layout) return null;
    const anchor = element instanceof HTMLElement && root.contains(element) ? element : pickReadingElement();
    // An explicitly pinned activity is still the reading row. Keep it after
    // the first correction, so later editor/toolbar reflows cannot select
    // a different row above it. User scrolling establishes a new snapshot.
    const isReadingRow = anchor?.matches('.event-item, .birthday-row, .preview-row');
    return { anchor, top: anchor?.getBoundingClientRect().top, scrollTop: host.scrollTop, layout, atTop: !element && host.scrollTop <= 1, isControl: !!element && !isReadingRow };
  };
  const remember = (force = false) => {
    if (request) return;
    const layout = geometry();
    if (!layout) return;
    // Native scroll anchoring can dispatch a scroll during reflow. It must
    // not replace the cached pre-reflow coordinates with the changed layout.
    if (isScrollNavigationActive(host)) { clearTouch(); clearNativeScroll(); force = true; }
    if (!force && cached && !sameGeometry(cached.layout, layout)) return;
    if (!force && cached && Math.abs(host.scrollTop - cached.scrollTop) < 0.5 && cached.anchor?.isConnected) return;
    cached = snapshot();
  };
  const scheduleRemember = event => {
    trackNativeScroll();
    // A native reveal/find can interrupt an outstanding correction without
    // wheel, focus or page-navigation input. On unchanged layout its real
    // delta belongs to the browser, in either direction. Our own queued
    // correction event has no delta from the post-correction baseline.
    if (!nativeScrollIntent && event?.isTrusted === true && request?.nativeScrollBaseline
      && sameGeometry(request.nativeScrollBaseline.layout, geometry())
      && Math.abs(host.scrollTop - request.nativeScrollBaseline.scrollTop) > 0.5) {
      cancel(true);
      rememberNativePosition = true;
    }
    // Confirmed input and explicit setup notifications update immediately;
    // a later frame refreshes the reading object after native delivery.
    if (nativeScrollIntent || event?.isTrusted === false) remember();
    if (rememberRaf) return;
    rememberRaf = requestAnimationFrame(() => {
      rememberRaf = 0;
      // Cancellation keeps the old anchor until a queued resize has had a
      // chance to restore it. Then commit the browser's new reading object,
      // even though finish() already copied its current scrollTop.
      remember(rememberNativePosition);
      rememberNativePosition = false;
    });
  };

  const finish = (owner, keepSnapshot = false) => {
    if (request !== owner) return;
    cancelAnimationFrame(owner.raf);
    releaseAnchoring(owner);
    request = null;
    const saved = owner.snapshot;
    // Resize can move the sampling point onto a different row. Keep the
    // original reading row across successive reflows until the user scrolls.
    if (keepSnapshot === true) {
      // A native notification can precede its resize source. Retain even a
      // blank/control snapshot and its absolute scrollTop until the scroll
      // RAF commits a new baseline or an explicit layout owner restores it.
      cached = { ...saved };
    } else if (!saved.isControl && saved.anchor?.isConnected && root.contains(saved.anchor) && !isScrollNavigationActive(host)) {
      cached = { ...saved, scrollTop: host.scrollTop, layout: geometry() };
    } else remember(true);
  };
  const cancel = (keepSnapshot = false) => { if (request) finish(request, keepSnapshot); };
  const correct = (owner) => {
    if (request !== owner) return false;
    const layout = geometry();
    if (!layout || isScrollNavigationActive(host)) { finish(owner); return false; }
    const { anchor, top, scrollTop, atTop } = owner.snapshot;
    if (anchor && (!anchor.isConnected || !root.contains(anchor))) { finish(owner); return false; }
    // WebKit truncates fractional scrollTo coordinates. Round once so a
    // subpixel error cannot restart the stability window on every frame.
    const nextTop = Math.round(atTop ? 0 : anchor
      ? clampScrollTop(host, host.scrollTop + anchor.getBoundingClientRect().top - top)
      : clampScrollTop(host, scrollTop));
    if (Math.abs(host.scrollTop - nextTop) > 0.5) {
      const previousTop = host.scrollTop;
      host.scrollTo({ top: nextTop, behavior: 'instant' });
      if (nativeScrollIntent) nativeScrollIntent.scrollTop = host.scrollTop;
      // A reflow while a finger is down is our own compensation, not part
      // of the native scrolling delta to preserve on the first touchmove.
      if (touchSnapshot) touchSnapshot.scrollTop += host.scrollTop - previousTop;
      owner.stableSince = performance.now();
      onRestore();
    }
    owner.nativeScrollBaseline = { scrollTop: host.scrollTop, layout };
    return true;
  };
  const begin = (saved) => {
    cancel();
    if (!saved || !geometry() || isScrollNavigationActive(host)) return null;
    const now = performance.now();
    const owner = {
      snapshot: saved, started: now, stableSince: now, layout: saved.layout, raf: 0
    };
    request = owner;
    holdAnchoring(owner);
    const tick = () => {
      if (!correct(owner)) return;
      const layout = geometry();
      const time = performance.now();
      if (!sameGeometry(owner.layout, layout)) owner.stableSince = time;
      owner.layout = layout;
      if (time - owner.stableSince >= 220 || time - owner.started >= 5000) { finish(owner); return; }
      owner.raf = requestAnimationFrame(tick);
    };
    owner.raf = requestAnimationFrame(tick);
    return owner;
  };

  const handleLayout = (forceRestore = false) => {
    const layout = geometry();
    if (!layout) return;
    if (isScrollNavigationActive(host)) { clearTouch(); clearNativeScroll(); cancel(); remember(true); return; }
    trackNativeScroll();
    if (request) { correct(request); return; }
    if (cached && (forceRestore === true || !sameGeometry(cached.layout, layout))) {
      const owner = begin(cached);
      if (owner) correct(owner);
    } else remember();
  };
  const handleResize = () => handleLayout(true);
  const scheduleObservedLayout = () => {
    if (!active || observedRaf) return;
    observedRaf = requestAnimationFrame(() => { observedRaf = 0; handleLayout(); });
  };
  const beginNativeScrollIntent = (event, scrollTop = host.scrollTop) => {
    if (!event?.isTrusted) return;
    nativeScrollIntent = { scrollTop, hasScrolled: false };
    holdAnchoring(nativeScrollIntent);
    nativeScrollTimer = setTimeout(() => handleScrollEnd(true), 800);
  };
  const handleIntent = event => {
    clearTouch();
    // Compositor scrolling can already be visible when a trusted wheel
    // reaches the main thread. If layout is unchanged since our last
    // correction, retain that input delta before compensating again.
    const inputBaseline = request?.nativeScrollBaseline || cached;
    if (event?.isTrusted && !nativeScrollIntent && inputBaseline
      && sameGeometry(inputBaseline.layout, geometry())) {
      beginNativeScrollIntent(event, inputBaseline.scrollTop);
      trackNativeScroll();
    }
    // CSS may have reflowed before its resize/observer notification. Finish
    // that compensation before the user's default scroll starts.
    handleLayout();
    cancel();
    remember(true);
    clearNativeScroll();
    beginNativeScrollIntent(event);
  };
  const rememberInteractionPosition = event => {
    clearNativeScroll();
    clearTouch();
    cancel();
    remember(true);
    // Focus scrolls before focusin in Chromium, but can scroll afterward
    // in WebKit. Retain the latter native delta through a same-frame resize.
    if (event?.type === 'focusin') beginNativeScrollIntent(event);
  };
  const handlePointer = event => {
    // A touch pointerdown precedes touchstart. Do not overwrite the pending
    // reflow snapshot or move a control before its click is delivered.
    if (event.pointerType === 'touch') return;
    rememberInteractionPosition(event);
    beginNativeScrollIntent(event);
    if (nativeScrollIntent) nativeScrollIntent.pendingPointer = true;
  };
  const handlePointerEnd = () => {
    if (!nativeScrollIntent?.pendingPointer) return;
    trackNativeScroll();
    nativeScrollIntent.pendingPointer = false;
    clearTimeout(nativeScrollTimer);
    nativeScrollTimer = setTimeout(() => handleScrollEnd(true), 800);
  };
  const handleTouchStart = () => {
    trackNativeScroll();
    clearNativeScroll();
    clearTouch();
    const saved = request?.snapshot || cached;
    const anchor = saved?.anchor;
    // An old request's layout can differ during its stability window even
    // after its anchor is aligned. Only retain actual uncompensated drift.
    touchSnapshot = !isScrollNavigationActive(host) && !saved?.atTop
      && anchor?.isConnected && root.contains(anchor)
      && Math.abs(anchor.getBoundingClientRect().top - saved.top) > 1
      ? { snapshot: saved, scrollTop: host.scrollTop } : null;
    // Keep the native anchor from being counted as a finger scroll. The
    // touch and an overlapping reflow request share this temporary lease.
    if (touchSnapshot) holdAnchoring(touchSnapshot);
    cancel();
    remember(true);
    // A finger can be down before a new reflow starts. Keep an independent
    // scroll baseline even when there was no drift at touchstart; a tap
    // releases it without moving the target.
    nativeScrollIntent = { scrollTop: host.scrollTop, hasScrolled: false, pendingTouch: true };
    holdAnchoring(nativeScrollIntent);
  };
  const handleTouchMove = event => {
    const pending = touchSnapshot;
    if (pending) {
      // Passive touch scrolling may already have applied its first delta.
      // Compensate only reflow, preserving that delta at the new screen Y.
      const saved = { ...pending.snapshot, top: pending.snapshot.top - (host.scrollTop - pending.scrollTop) };
      const owner = begin(saved);
      if (owner) correct(owner);
      // The pending touch formula has already included this first delta.
      if (nativeScrollIntent) nativeScrollIntent.scrollTop = host.scrollTop;
    }
    clearTouch();
    handleIntent(event);
  };
  const handleTouchEnd = () => {
    clearTouch();
    if (nativeScrollIntent?.pendingTouch && !nativeScrollIntent.hasScrolled) clearNativeScroll();
  };
  const handleKey = event => { if (isScrollKeyIntent(event)) handleIntent(event); };
  const handleNavigationChange = () => {
    // Starting a jump supersedes manual input. An input that cancels a
    // jump can already own the scroll baseline before its finish event.
    if (isScrollNavigationActive(host)) {
      clearTouch();
      clearNativeScroll();
    }
    cancel();
    // Native scroll delivery can follow navigation completion. Replace the
    // pre-jump snapshot synchronously, before a late reflow can replay it.
    remember(true);
  };
  const intentListeners = {
    wheel: handleIntent, pointerdown: handlePointer, focusin: rememberInteractionPosition,
    touchstart: handleTouchStart, touchmove: handleTouchMove,
    touchend: handleTouchEnd, touchcancel: handleTouchEnd
  };
  const unbind = () => {
    bindingSeq += 1;
    cancel();
    active = false;
    observer?.disconnect();
    observer = null;
    cancelAnimationFrame(rememberRaf);
    rememberRaf = 0;
    rememberNativePosition = false;
    cancelAnimationFrame(observedRaf);
    observedRaf = 0;
    clearTouch();
    clearNativeScroll();
    host?.removeEventListener('scroll', scheduleRemember);
    host?.removeEventListener('scrollend', handleScrollEnd);
    host?.removeEventListener(SCROLL_NAVIGATION_CHANGE, handleNavigationChange);
    host?.removeEventListener(SCROLL_POSITION_CHANGE, rememberInteractionPosition);
    for (const [type, listener] of Object.entries(intentListeners)) host?.removeEventListener(type, listener);
    document.removeEventListener('keydown', handleKey);
    document.removeEventListener('pointerup', handlePointerEnd);
    document.removeEventListener('pointercancel', handlePointerEnd);
    window.removeEventListener('resize', handleResize);
    window.visualViewport?.removeEventListener('resize', handleResize);
    cached = null;
  };
  const bind = async () => {
    unbind();
    const seq = bindingSeq;
    active = true;
    await nextTick();
    if (!active || seq !== bindingSeq) return;
    host = getHost();
    root = getRoot();
    if (!(host instanceof HTMLElement) || !(root instanceof HTMLElement)) { active = false; return; }
    remember(true);
    host.addEventListener('scroll', scheduleRemember, { passive: true });
    host.addEventListener('scrollend', handleScrollEnd, { passive: true });
    host.addEventListener(SCROLL_NAVIGATION_CHANGE, handleNavigationChange);
    host.addEventListener(SCROLL_POSITION_CHANGE, rememberInteractionPosition);
    for (const [type, listener] of Object.entries(intentListeners)) host.addEventListener(type, listener, { passive: true });
    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerup', handlePointerEnd, { passive: true });
    document.addEventListener('pointercancel', handlePointerEnd, { passive: true });
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      // Scrolling content-visibility rows can itself resize the observed
      // list. Run those corrections outside the observer delivery loop.
      observer = new ResizeObserver(deferObservedLayout ? scheduleObservedLayout : handleLayout);
      observer.observe(root);
      observer.observe(host);
    }
  };

  const preserve = async (applyChange, element = null) => {
    clearNativeScroll();
    const owner = begin(snapshot(element));
    applyChange();
    await nextTick();
    if (owner) correct(owner);
  };
  onMounted(bind);
  onActivated(bind);
  onDeactivated(unbind);
  onBeforeUnmount(unbind);
  return { preserve, cancel, refresh: handleLayout, remember: () => remember(true), isPreserving: () => !!request || !!touchSnapshot || !!nativeScrollIntent };
};
